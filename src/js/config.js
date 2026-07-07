let APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVVzUw6CuAN971W3cVjLeZLBB_RAvXwC_04WccDMPqrok4nHOvxatqvyl6ijMizfyA/exec';
const QUOTA = 20;
const BACKEND_DISCOVERED_KEY = 'gas_discovered_url';
const RESOLVED_URL_KEY = 'cc_resolved_url';

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

async function initBackendUrl() {
  try {
    const cached = localStorage.getItem(BACKEND_DISCOVERED_KEY);
    if (cached) {
      APPS_SCRIPT_URL = cached;
      _onUrlReady();
      return cached;
    }
    const resp = await fetch(APPS_SCRIPT_URL + '?action=getBackendUrl', { redirect: 'follow', cache: 'no-store' });
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

async function resolveBackendUrl() {
  const stored = localStorage.getItem(RESOLVED_URL_KEY);
  if (stored) {
    APPS_SCRIPT_URL = stored;
    _onUrlReady();
    return stored;
  }
  try {
    const resp = await fetch(APPS_SCRIPT_URL + '?action=testConnection', {
      redirect: 'follow', cache: 'no-store', credentials: 'omit'
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const resolved = resp.url;
    if (resolved && resolved.includes('macros/s/')) {
      if (resolved !== APPS_SCRIPT_URL) {
        console.log('[Backend] resolveBackendUrl captured resolved URL:', resolved);
        APPS_SCRIPT_URL = resolved;
      }
      localStorage.setItem(RESOLVED_URL_KEY, resolved);
    }
    _connectionStatus = 'connected';
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
  } catch (e) {}
  _connectionStatus = 'unknown';
  return true;
}

function clearBackendCache() {
  try {
    localStorage.removeItem(BACKEND_DISCOVERED_KEY);
    localStorage.removeItem(RESOLVED_URL_KEY);
  } catch (e) {}
  _connectionStatus = 'unknown';
  console.log('[Backend] Cache cleared. Reload the page.');
}
window.clearBackendCache = clearBackendCache;

async function fetchWithTimeout(url, opts, timeoutMs) {
  const ms = timeoutMs || 20000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const resp = await fetch(url, { ...opts, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

async function appsScriptFetch(path, params, retries) {
  const maxRetries = retries || 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = path ? APPS_SCRIPT_URL + path : APPS_SCRIPT_URL;
      const resp = await fetchWithTimeout(url, params, 20000);
      return resp;
    } catch (e) {
      if (attempt === maxRetries) throw e;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

(function bootstrap() {
  const cached = (() => { try { return localStorage.getItem(BACKEND_DISCOVERED_KEY); } catch (e) {} })();
  if (cached) {
    APPS_SCRIPT_URL = cached;
    console.log('[Backend] Using cached URL:', cached);
  }
  const resolved = (() => { try { return localStorage.getItem(RESOLVED_URL_KEY); } catch (e) {} })();
  if (resolved && resolved !== APPS_SCRIPT_URL) {
    APPS_SCRIPT_URL = resolved;
    console.log('[Backend] Using resolved URL:', resolved);
  }
  fetch(APPS_SCRIPT_URL + '?action=getBackendUrl', { redirect: 'follow', cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      if (data && data.url && data.url.includes('macros/s/')) {
        if (data.url !== APPS_SCRIPT_URL) {
          console.log('[Backend] Bootstrap discovered new URL:', data.url);
          APPS_SCRIPT_URL = data.url;
        }
        try { localStorage.setItem(BACKEND_DISCOVERED_KEY, data.url); } catch (e) {}
      }
    })
    .catch(() => {
      fetch(APPS_SCRIPT_URL + '?action=testConnection', { redirect: 'follow', cache: 'no-store', credentials: 'omit' })
        .then(r => {
          if (r.ok && r.url && r.url.includes('macros/s/') && r.url !== APPS_SCRIPT_URL) {
            console.log('[Backend] Bootstrap captured resolved URL:', r.url);
            APPS_SCRIPT_URL = r.url;
            try { localStorage.setItem(RESOLVED_URL_KEY, r.url); } catch (e) {}
            _connectionStatus = 'connected';
          }
        })
        .catch(() => { console.warn('[Backend] Bootstrap discovery & resolution both failed'); });
    });
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
