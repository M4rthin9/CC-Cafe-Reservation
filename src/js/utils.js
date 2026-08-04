function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function maskPrisonerName(name) {
  if (!name || name === '—') return name;
  const trimmed = name.trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace > 0) {
    const firstName = trimmed.substring(0, lastSpace + 1);
    const lastName = trimmed.substring(lastSpace + 1);
    const maskedLast = lastName.slice(0, 4);
    return firstName + maskedLast;
  }
  return trimmed.length > 3 ? trimmed.slice(0, 3) : trimmed;
}

function generateUniqueRef(existingRefs) {
  const existing = new Set(existingRefs);
  let ref, attempts = 0;
  do {
    ref = 'VIS-' + Math.floor(10000 + Math.random() * 90000);
    attempts++;
  } while (existing.has(ref) && attempts < 100);
  return ref;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== CLIENT IP / USER-AGENT (login audit) =====
const clientMeta = (() => {
  let cache = null;

  async function fetchPublicIp() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) return '';
      const text = await resp.text();
      const line = String(text).split('\n').find(l => l.indexOf('ip=') === 0);
      return line ? line.slice(3).trim() : '';
    } catch (e) {
      return '';
    }
  }

  return {
    async load() {
      if (cache) return cache;
      cache = { ip: await fetchPublicIp(), userAgent: navigator.userAgent || '' };
      return cache;
    }
  };
})();

async function waitClientMeta() {
  try { return await clientMeta.load(); }
  catch (e) { return { ip: '', userAgent: navigator.userAgent || '' }; }
}
