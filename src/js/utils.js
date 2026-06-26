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

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
