const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzfcRrdnmysqWl4wnu5ZSwIkNGUDpjZTNH4_ftda-XZ7mb2CW2D0cXwuMsXyiHkOlOW1g/exec';
let APPS_SCRIPT_URL = DEFAULT_APPS_SCRIPT_URL;
const QUOTA = 20;
const BACKEND_DISCOVERED_KEY = 'gas_discovered_url';
const RESOLVED_URL_KEY = 'cc_resolved_url';

const API_FETCH_TIMEOUT = 25000;

let _connectionStatus = 'unknown';
let _urlReady = false;
const _urlReadyWaiters = [];

function _onUrlReady() {
  _urlReady = true;
  _urlReadyWaiters.forEach(fn => fn());
  _urlReadyWaiters.length = 0;
}

function waitForUrlReady() {
  if (_urlReady) return Promise.resolve();
  return new Promise(resolve => _urlReadyWaiters.push(resolve));
}

async function fetchWithTimeout(url, opts, timeoutMs) {
  const ms = timeoutMs || API_FETCH_TIMEOUT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const resp = await fetch(url, { cache: 'no-store', ...opts, signal: controller.signal });
    return resp;
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(`เซิร์ฟเวอร์ไม่ตอบกลับภายใน ${Math.round(ms / 1000)} วินาที — กรุณาลองใหม่อีกครั้ง`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function appsScriptFetch(path, params, retries) {
  const maxRetries = (retries !== undefined && retries !== null) ? retries : 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = path ? APPS_SCRIPT_URL + path : APPS_SCRIPT_URL;
      const resp = await fetchWithTimeout(url, params, API_FETCH_TIMEOUT);
      if (!resp.ok) {
        // 404 usually means a stale URL — re-discover once and retry the fresh URL
        if (resp.status === 404) {
          const recovered = await _tryRecover404(path, params);
          if (recovered) return recovered;
        }
        throw new Error('HTTP ' + resp.status);
      }
      return resp;
    } catch (e) {
      if (attempt === maxRetries) throw e;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

async function _tryRecover404(path, params) {
  try {
    localStorage.removeItem(BACKEND_DISCOVERED_KEY);
    localStorage.removeItem(RESOLVED_URL_KEY);
  } catch (e) { }
  console.warn('[Backend] 404 — re-discovering backend URL...');
  const fresh = await _discoverBackendUrl(8000);
  if (!fresh) return null;
  console.log('[Backend] Re-discovered URL, retrying:', fresh);
  const url = path ? fresh + path : fresh;
  const resp = await fetchWithTimeout(url, params, API_FETCH_TIMEOUT);
  return resp.ok ? resp : null;
}
window.appsScriptFetch = appsScriptFetch;
window.API_FETCH_TIMEOUT = API_FETCH_TIMEOUT;
window.waitForUrlReady = waitForUrlReady;

// Re-discover the current Apps Script /exec URL via the lightweight
// `getBackendUrl` action. Falls back to the hardcoded default URL.
async function _discoverBackendUrl(timeoutMs) {
  const ms = timeoutMs || 8000;
  try {
    const url = APPS_SCRIPT_URL.includes('/macros/s/') ? APPS_SCRIPT_URL : DEFAULT_APPS_SCRIPT_URL;
    const resp = await fetchWithTimeout(url + '?action=getBackendUrl', {
      redirect: 'follow', cache: 'no-store', credentials: 'omit'
    }, ms);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && data.url && data.url.includes('/macros/s/')) {
      APPS_SCRIPT_URL = data.url;
      try {
        localStorage.setItem(BACKEND_DISCOVERED_KEY, data.url);
        localStorage.removeItem(RESOLVED_URL_KEY);
      } catch (e) { }
      _connectionStatus = 'connected';
      _onUrlReady();
      return data.url;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function initBackendUrl() {
  // The bootstrap already kicks off discovery on script load. Give it a
  // short window to finish so we don't fire a duplicate discovery request
  // (each one cold-starts Apps Script and can be very slow).
  await Promise.race([waitForUrlReady(), new Promise(r => setTimeout(r, 800))]);
  try {
    const cached = localStorage.getItem(BACKEND_DISCOVERED_KEY);
    if (cached) {
      APPS_SCRIPT_URL = cached;
      _onUrlReady();
      return cached;
    }
    const fresh = await _discoverBackendUrl(15000);
    _onUrlReady();
    return fresh || APPS_SCRIPT_URL;
  } catch (e) {
    console.warn('[Backend] initBackendUrl failed:', e.message);
    _onUrlReady();
    return APPS_SCRIPT_URL;
  }
}

function isValidExecUrl(url) {
  return url && url.includes('/macros/s/') && !url.includes('user_content_key');
}

async function resolveBackendUrl() {
  const stored = localStorage.getItem(RESOLVED_URL_KEY);
  if (stored && isValidExecUrl(stored)) {
    APPS_SCRIPT_URL = stored;
    _connectionStatus = 'connected';
    _onUrlReady();
    return stored;
  }
  // Stale/echo URL — clear and re-discover
  try { localStorage.removeItem(RESOLVED_URL_KEY); } catch (e) { }
  try { localStorage.removeItem(BACKEND_DISCOVERED_KEY); } catch (e) { }

  try {
    const fresh = await _discoverBackendUrl(15000);
    if (!fresh) throw new Error('Backend URL discovery failed');
    _connectionStatus = 'connected';
    return fresh;
  } catch (e) {
    console.warn('[Backend] resolveBackendUrl failed:', e.message);
    _connectionStatus = 'disconnected';
    _onUrlReady();
    return APPS_SCRIPT_URL;
  }
}

// Lightweight connectivity probe. Uses the ultra-fast `ping` action (no
// spreadsheet access) and retries once to absorb Google Apps Script cold
// starts, which can otherwise exceed the client timeout on the first call.
async function pingConnection(retries) {
  const max = (retries !== undefined && retries !== null) ? retries : 1;
  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      const resp = await fetchWithTimeout(APPS_SCRIPT_URL + '?action=ping', {
        method: 'GET', redirect: 'follow', cache: 'no-store', credentials: 'omit'
      }, 15000);
      if (!resp.ok) return { connected: false, status: resp.status, message: 'HTTP ' + resp.status };
      const data = await resp.json();
      if (data && data.status === 'ok' && data.pong) return { connected: true, message: 'Connected', detail: data };
      return { connected: false, message: data.message || 'Unexpected response' };
    } catch (e) {
      if (attempt === max) return { connected: false, message: e.message || 'Network error' };
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  return { connected: false, message: 'Network error' };
}

// Full connection test: verifies the endpoint (ping) and, if reachable, also
// reports whether the bound spreadsheet is accessible.
async function testConnection() {
  try {
    const ping = await pingConnection(1);
    if (!ping.connected) {
      _connectionStatus = 'disconnected';
      return ping;
    }
    // Endpoint is reachable — try to enrich with spreadsheet details.
    try {
      const resp = await fetchWithTimeout(APPS_SCRIPT_URL + '?action=testConnection', {
        method: 'GET', redirect: 'follow', cache: 'no-store', credentials: 'omit'
      }, 15000);
      if (resp.ok) {
        const data = await resp.json();
        _connectionStatus = 'connected';
        return {
          connected: true,
          message: data.spreadsheetError ? data.message : (data.message || 'Connected'),
          detail: data,
          spreadsheetError: data.spreadsheetError || null
        };
      }
    } catch (e) {
      // ping already proved connectivity; treat spreadsheet detail as optional
      Logger && Logger.warn('testConnection detail failed: ' + e.message);
    }
    _connectionStatus = 'connected';
    return { connected: true, message: 'Connected', detail: ping.detail };
  } catch (e) {
    _connectionStatus = 'disconnected';
    return { connected: false, message: e.message || 'Network error' };
  }
}

function getConnectionStatus() { return _connectionStatus; }

function setBackendUrl(url) {
  if (!url || !url.includes('macros/s/')) return false;
  APPS_SCRIPT_URL = url;
  try {
    localStorage.setItem(BACKEND_DISCOVERED_KEY, url);
    localStorage.removeItem(RESOLVED_URL_KEY);
  } catch (e) { }
  _connectionStatus = 'unknown';
  return true;
}

function clearBackendCache() {
  try {
    localStorage.removeItem(BACKEND_DISCOVERED_KEY);
    localStorage.removeItem(RESOLVED_URL_KEY);
  } catch (e) { }
  _connectionStatus = 'unknown';
  console.log('[Backend] Cache cleared. Reload the page.');
}
window.clearBackendCache = clearBackendCache;

// ── Bootstrap: load cached URL on script start ──
(function bootstrap() {
  // Remove stale echo URLs from cache
  try {
    const stale = localStorage.getItem(RESOLVED_URL_KEY);
    if (stale && !isValidExecUrl(stale)) {
      console.warn('[Backend] Removing stale echo URL from cache:', stale);
      localStorage.removeItem(RESOLVED_URL_KEY);
    }
  } catch (e) { }

  const cached = (() => { try { return localStorage.getItem(BACKEND_DISCOVERED_KEY); } catch (e) { } })();
  const resolved = (() => { try { return localStorage.getItem(RESOLVED_URL_KEY); } catch (e) { } })();

  if (resolved) {
    APPS_SCRIPT_URL = resolved;
    console.log('[Backend] Using resolved URL:', resolved);
    _connectionStatus = 'connected';
    _onUrlReady();
    return;
  }
  if (cached) {
    APPS_SCRIPT_URL = cached;
    console.log('[Backend] Using cached URL:', cached);
    // Background check: discover the proper exec URL (not echo URL)
    _discoverBackendUrl(15000)
      .then(fresh => {
        if (fresh && fresh !== cached) console.log('[Backend] Bootstrap discovered updated URL:', fresh);
        _connectionStatus = 'connected';
      })
      .catch(() => { /* silent — cached URL is fine */ })
      .finally(() => _onUrlReady());
    return;
  }
  // No cached URL — do a full discovery with timeout
  console.log('[Backend] No cached URL, discovering...');
  _discoverBackendUrl(15000)
    .then(fresh => {
      if (fresh) {
        console.log('[Backend] Bootstrap discovered new URL:', fresh);
        _connectionStatus = 'connected';
      }
    })
    .catch(() => { /* silent — default URL will be used */ })
    .finally(() => _onUrlReady());
})();

async function window$checkConnection() {
  const result = await testConnection();
  console.log('[Connection Test]', result.connected ? 'CONNECTED' : 'FAILED', result.message);
  return result;
}

async function window$resetConnection() {
  clearBackendCache();
  _connectionStatus = 'unknown';
  console.log('[Backend] Cache cleared. Attempting re-discovery...');
  await resolveBackendUrl();
  const result = await testConnection();
  console.log('[Connection Test]', result.connected ? 'CONNECTED' : 'FAILED', result.message);
  return result;
}

window.checkConnection = window$checkConnection;
window.resetConnection = window$resetConnection;
