const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQ_XGiFbgjdvUK1DhzNjdWPGZ2hNI0BWyj6g1Bv0dZqGAohQLZkV0wjUXCT6cvtvMoig/exec';
let APPS_SCRIPT_URL = DEFAULT_APPS_SCRIPT_URL;
const TURNSTILE_SITEKEY = '0x4AAAAAAEIsdWWK1_eTnbKj';
const QUOTA = 20;

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
  // Probe the hardcoded default URL. Bound the recovery so a hung discovery
  // can't stall the request.
  const fresh = await Promise.race([
    _discoverBackendUrl(8000),
    new Promise(r => setTimeout(() => r(null), 10000))
  ]);
  if (!fresh) return null;
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

// Re-discover the Apps Script /exec URL by probing the hardcoded default
// deployment via the lightweight `getBackendUrl` action. Used only as a
// 404 self-heal: normal requests always go straight to DEFAULT_APPS_SCRIPT_URL.
async function _discoverBackendUrl(timeoutMs) {
  const ms = timeoutMs || 8000;
  try {
    const url = DEFAULT_APPS_SCRIPT_URL;
    const resp = await fetchWithTimeout(url + '?action=getBackendUrl', {
      redirect: 'follow', cache: 'no-store', credentials: 'omit', mode: 'cors'
    }, ms);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && data.url && data.url.includes('/macros/s/')) {
      APPS_SCRIPT_URL = data.url;
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
  // Hardcoded by design — the first real request must never wait on any
  // discovery/cache round trip. 404 self-heal handles a changed deployment.
  _onUrlReady();
  return APPS_SCRIPT_URL;
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

// ── Bootstrap: the URL is hardcoded and usable right away. No cache reads,
//    no background discovery round trip — the first request (e.g. login)
//    fires immediately against DEFAULT_APPS_SCRIPT_URL. ──
(function bootstrap() {
  _onUrlReady();
})();

async function window$checkConnection() {
  const result = await testConnection();
  console.log('[Connection Test]', result.connected ? 'CONNECTED' : 'FAILED', result.message);
  return result;
}

async function window$resetConnection() {
  _connectionStatus = 'unknown';
  console.log('[Backend] Attempting re-discovery...');
  await _discoverBackendUrl(8000);
  const result = await testConnection();
  console.log('[Connection Test]', result.connected ? 'CONNECTED' : 'FAILED', result.message);
  return result;
}

window.checkConnection = window$checkConnection;
window.resetConnection = window$resetConnection;
