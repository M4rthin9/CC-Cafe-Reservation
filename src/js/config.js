const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwpedif2K-S1UZaJRT61tv1GCDYku1EhNgwCfMtopE6l7faGoE9d_bwBv6I6IP3Ex_PaA/exec';
let APPS_SCRIPT_URL = DEFAULT_APPS_SCRIPT_URL;
const QUOTA = 20;
const BACKEND_DISCOVERED_KEY = 'gas_discovered_url';
const RESOLVED_URL_KEY = 'cc_resolved_url';

const API_FETCH_TIMEOUT = 30000;

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

let _discoveryInFlight = null;

// Deduplicated background discovery. Reuses an in-flight discovery so the
// bootstrap, initBackendUrl(), and 404-recovery never fire parallel
// cold-start requests. Resolves to the discovered URL (or null on failure).
function _ensureDiscovery(timeoutMs) {
  if (!_discoveryInFlight) {
    _discoveryInFlight = _discoverBackendUrl(timeoutMs || 15000).finally(() => {
      _discoveryInFlight = null;
    });
  }
  return _discoveryInFlight;
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

async function appsScriptFetch(path, params, retries, timeoutMs) {
  const maxRetries = (retries !== undefined && retries !== null) ? retries : 1;
  const ttl = timeoutMs || API_FETCH_TIMEOUT;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = path ? APPS_SCRIPT_URL + path : APPS_SCRIPT_URL;
      const resp = await fetchWithTimeout(url, { ...params, mode: 'cors' }, ttl);
      if (!resp.ok) {
        // 404 usually means a stale URL — re-discover once and retry the fresh URL
        if (resp.status === 404) {
          const recovered = await _tryRecover404(path, params);
          if (recovered) return recovered;
        }
        // 302/301 redirect loops or stale redirects — also re-discover
        if ([301, 302].includes(resp.status)) {
          const recovered = await _tryRecover404(path, params);
          if (recovered) return recovered;
        }
        throw new Error('HTTP ' + resp.status);
      }
      return resp;
    } catch (e) {
      if (attempt === maxRetries) throw e;
      // Jittered exponential backoff. First retry fires at ~300ms (not 1s) so
      // it absorbs a GAS cold start / transient blip without feeling sluggish;
      // it then doubles per attempt, capped at 4s so a dead endpoint doesn't
      // stall for minutes. Jitter de-synchronizes parallel requests.
      const delay = Math.min(300 * Math.pow(2, attempt), 4000);
      await new Promise(r => setTimeout(r, delay + Math.floor(Math.random() * 150)));
    }
  }
}

async function _tryRecover404(path, params) {
  console.warn('[Backend] 404/redirect — re-discovering backend URL...');
  // Reuse an in-flight discovery if the bootstrap already started one. Keep
  // the original ~8s recovery bound so a hung discovery can't stall retries.
  const fresh = await Promise.race([
    _ensureDiscovery(15000),
    new Promise(r => setTimeout(() => r(null), 16000))
  ]);
  if (!fresh) return null;
  // Only rotate the cached URL once a working replacement is confirmed —
  // never wipe both keys on a transient network error, timeout, or abort.
  try {
    localStorage.setItem(BACKEND_DISCOVERED_KEY, fresh);
    localStorage.removeItem(RESOLVED_URL_KEY);
  } catch (e) { }
  console.log('[Backend] Re-discovered URL, retrying:', fresh);
  const url = path ? fresh + path : fresh;
  const resp = await fetchWithTimeout(url, params, API_FETCH_TIMEOUT);
  return resp.ok ? resp : null;
}
window.appsScriptFetch = appsScriptFetch;
window.API_FETCH_TIMEOUT = API_FETCH_TIMEOUT;
window.waitForUrlReady = waitForUrlReady;

// ── Shared perf helpers (used by booking.js / admin.js) ──
// Trailing-edge debounce: the callback only fires ms after the last call,
// so keystroke-driven filters run once per pause instead of once per key.
function debounce(fn, ms) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn.apply(this, args); }, ms);
  };
}

// Rebuilds the minified getPrisoners payload (array of arrays) back into the
// {prisonerName, prisonerId, wing, status, vinaiDate} objects the UI expects.
// Legacy payloads (array of objects) pass through unchanged, and the same
// function is used for localStorage cache reads so both formats are safe.
function rebuildPrisonerObjects(rows) {
  if (!Array.isArray(rows)) return [];
  if (rows.length > 0 && typeof rows[0] === 'object' && !Array.isArray(rows[0])) return rows;
  const out = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    out[i] = {
      prisonerName: String(r[0] || ''),
      prisonerId: String(r[1] || ''),
      wing: String(r[2] || ''),
      status: String(r[3] || ''),
      vinaiDate: String(r[4] || '')
    };
  }
  return out;
}
window.debounce = debounce;
window.rebuildPrisonerObjects = rebuildPrisonerObjects;

// Re-discover the current Apps Script /exec URL via the lightweight
// `getBackendUrl` action. Falls back to the hardcoded default URL.
async function _discoverBackendUrl(timeoutMs) {
  const ms = timeoutMs || 8000;
  try {
    const url = APPS_SCRIPT_URL.includes('/macros/s/') ? APPS_SCRIPT_URL : DEFAULT_APPS_SCRIPT_URL;
    const resp = await fetchWithTimeout(url + '?action=getBackendUrl', {
      redirect: 'follow', cache: 'no-store', credentials: 'omit', mode: 'cors'
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
  // The bootstrap already set APPS_SCRIPT_URL to a usable value (cached or
  // hardcoded default), so return it immediately — the first real data
  // request must never block on discovery finishing (double cold-start
  // round trip). Discovery runs in the background and only rotates the URL
  // for subsequent calls.
  try {
    const cached = localStorage.getItem(BACKEND_DISCOVERED_KEY);
    if (cached && cached.includes('/macros/s/')) {
      APPS_SCRIPT_URL = cached;
    }
  } catch (e) { }
  _onUrlReady();
  // If the bootstrap's discovery is still in flight, reuse it. If it already
  // settled successfully we're connected — don't fire a duplicate. Only a
  // failed/settled discovery gets a fresh attempt here.
  if (!_discoveryInFlight && _connectionStatus !== 'connected') {
    _ensureDiscovery(15000);
  }
  return APPS_SCRIPT_URL;
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
  // Stale/echo URL — clear only the invalid echo key and re-discover.
  // Leave BACKEND_DISCOVERED_KEY untouched: it may still be valid.
  try { localStorage.removeItem(RESOLVED_URL_KEY); } catch (e) { }

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

  if (resolved && isValidExecUrl(resolved)) {
    APPS_SCRIPT_URL = resolved;
    console.log('[Backend] Using resolved URL:', resolved);
    _connectionStatus = 'connected';
  } else if (cached && cached.includes('/macros/s/')) {
    APPS_SCRIPT_URL = cached;
    console.log('[Backend] Using cached URL:', cached);
  } else {
    console.log('[Backend] No cached URL — using default until background discovery resolves.');
  }

  // The URL is usable right now (cached or default). Resolve all waiters
  // immediately so the first real request (getPrisoners, lookupByRef,
  // login…) fires without waiting for discovery to finish.
  _onUrlReady();

  // Background discovery — runs in parallel, only rotates APPS_SCRIPT_URL
  // for subsequent calls if it finds a different URL. If it finds nothing,
  // the cached/default URL keeps being used (and _tryRecover404 handles a
  // confirmed 404/redirect-loop reactively).
  _ensureDiscovery(15000)
    .then(fresh => {
      if (fresh) {
        console.log('[Backend] Bootstrap discovered URL:', fresh);
        _connectionStatus = 'connected';
      }
    })
    .catch(() => { /* silent — cached/default URL will be used */ });
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
