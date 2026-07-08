let APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx5WHrh9Q6J6tIny31A32K0aE45I1I9kcczGUgVSDmwAJSC-uxWryjRpeRGNKNtvrxC/exec';
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
    const resp = await fetch(url, { ...opts, signal: controller.signal });
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
  const maxRetries = retries || 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = path ? APPS_SCRIPT_URL + path : APPS_SCRIPT_URL;
      const resp = await fetchWithTimeout(url, params, API_FETCH_TIMEOUT);
      // Treat HTTP errors (4xx, 5xx) as retryable — throw so the catch below retries
      if (!resp.ok) {
        // 404 suggests a stale URL — clear cache so next load re-discovers
        if (resp.status === 404) {
          try {
            localStorage.removeItem(BACKEND_DISCOVERED_KEY);
            localStorage.removeItem(RESOLVED_URL_KEY);
          } catch (e) { }
          console.warn('[Backend] 404 — cache cleared, will re-discover on next load');
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
window.appsScriptFetch = appsScriptFetch;
window.API_FETCH_TIMEOUT = API_FETCH_TIMEOUT;
window.waitForUrlReady = waitForUrlReady;

async function initBackendUrl() {
  try {
    const cached = localStorage.getItem(BACKEND_DISCOVERED_KEY);
    if (cached) {
      APPS_SCRIPT_URL = cached;
      _onUrlReady();
      return cached;
    }
    const resp = await fetchWithTimeout(APPS_SCRIPT_URL + '?action=getBackendUrl', { redirect: 'follow', cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data && data.url && data.url.includes('macros/s/')) {
      if (data.url !== APPS_SCRIPT_URL) {
        console.log('[Backend] initBackendUrl discovered new URL:', data.url);
        APPS_SCRIPT_URL = data.url;
      }
      localStorage.setItem(BACKEND_DISCOVERED_KEY, data.url);
    }
    _onUrlReady();
    return APPS_SCRIPT_URL;
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
    const resp = await fetchWithTimeout(APPS_SCRIPT_URL + '?action=getBackendUrl', {
      redirect: 'follow', cache: 'no-store'
    }, 15000);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data && data.url && data.url.includes('/macros/s/')) {
      APPS_SCRIPT_URL = data.url;
      localStorage.setItem(BACKEND_DISCOVERED_KEY, data.url);
      _connectionStatus = 'connected';
    }
    _onUrlReady();
    return APPS_SCRIPT_URL;
  } catch (e) {
    console.warn('[Backend] resolveBackendUrl failed:', e.message);
    _connectionStatus = 'disconnected';
    _onUrlReady();
    return APPS_SCRIPT_URL;
  }
}

async function testConnection() {
  try {
    const resp = await fetchWithTimeout(APPS_SCRIPT_URL + '?action=testConnection', {
      method: 'GET', redirect: 'follow', cache: 'no-store', credentials: 'omit'
    }, 15000);
    if (!resp.ok) {
      _connectionStatus = 'disconnected';
      return { connected: false, status: resp.status, message: 'HTTP ' + resp.status };
    }
    const data = await resp.json();
    if (data && data.status === 'ok') {
      _connectionStatus = 'connected';
      return { connected: true, message: data.message || 'Connected', detail: data };
    }
    _connectionStatus = 'disconnected';
    return { connected: false, message: data.message || 'Unexpected response' };
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
    fetchWithTimeout(APPS_SCRIPT_URL + '?action=getBackendUrl', { redirect: 'follow', cache: 'no-store' }, 15000)
      .then(r => r.json())
      .then(data => {
        if (data && data.url && data.url.includes('/macros/s/')) {
          if (data.url !== APPS_SCRIPT_URL) {
            console.log('[Backend] Bootstrap discovered updated URL:', data.url);
            APPS_SCRIPT_URL = data.url;
          }
          try { localStorage.setItem(BACKEND_DISCOVERED_KEY, data.url); } catch (e) { }
          _connectionStatus = 'connected';
        }
      })
      .catch(() => { /* silent — cached URL is fine */ })
      .finally(() => _onUrlReady());
    return;
  }
  // No cached URL — do a full discovery with timeout
  console.log('[Backend] No cached URL, discovering...');
  fetchWithTimeout(APPS_SCRIPT_URL + '?action=getBackendUrl', { redirect: 'follow', cache: 'no-store' }, 15000)
    .then(r => r.json())
    .then(data => {
      if (data && data.url && data.url.includes('/macros/s/')) {
        if (data.url !== APPS_SCRIPT_URL) {
          console.log('[Backend] Bootstrap discovered new URL:', data.url);
          APPS_SCRIPT_URL = data.url;
        }
        try { localStorage.setItem(BACKEND_DISCOVERED_KEY, data.url); } catch (e) { }
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
