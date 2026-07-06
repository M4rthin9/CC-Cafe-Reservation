let APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1LqitEvBXItH6EAjW2_NaSQyMfDsliPxL-Cubvz2gGDgCrga77iKmn_tZDKaAXY_8Mw/exec';
const QUOTA = 20;
const BACKEND_DISCOVERED_KEY = 'gas_discovered_url';

async function initBackendUrl() {
  try {
    const cached = localStorage.getItem(BACKEND_DISCOVERED_KEY);
    if (cached) {
      APPS_SCRIPT_URL = cached;
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
    return APPS_SCRIPT_URL;
  } catch (e) {
    console.warn('[Backend] initBackendUrl failed:', e.message);
    return APPS_SCRIPT_URL;
  }
}

(function bootstrapBackendUrl() {
  try {
    const cached = localStorage.getItem(BACKEND_DISCOVERED_KEY);
    if (cached) {
      APPS_SCRIPT_URL = cached;
      console.log('[Backend] Using cached URL:', cached);
    }
  } catch(e) {}
  fetch(APPS_SCRIPT_URL + '?action=getBackendUrl', { redirect: 'follow' })
    .then(r => r.json())
    .then(data => {
      if (data && data.url && data.url.includes('macros/s/')) {
        if (data.url !== APPS_SCRIPT_URL) {
          console.log('[Backend] Discovered new URL:', data.url);
          APPS_SCRIPT_URL = data.url;
        }
        try { localStorage.setItem(BACKEND_DISCOVERED_KEY, data.url); } catch(e) {}
      } else {
        console.warn('[Backend] Discovery returned invalid response:', data);
      }
    })
    .catch(() => { console.warn('[Backend] Discovery fetch failed (old URL may be dead)'); });
})();

function clearBackendCache() {
  try { localStorage.removeItem(BACKEND_DISCOVERED_KEY); } catch(e) {}
  console.log('[Backend] Cache cleared. Reload the page.');
}
window.clearBackendCache = clearBackendCache;
