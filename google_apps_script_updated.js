// ══════════════════════════════════════════════════════════════════
// SECTION 1 — CONFIG & CONSTANTS
// ══════════════════════════════════════════════════════════════════
const SHEET_NAME = 'การจอง';
const EVENTLOG_SHEET = 'EventLog';
const PRISONER_SHEET = 'ผู้ต้องขัง';
const USERS_SHEET = 'Users';
const NOTES_SHEET = 'Notes';
const SETTINGS_SHEET = 'Settings';
const ARCHIVE_SHEET = 'การจอง_Archive';
const ARCHIVE_MONTHS = 3;
const BACKUP_RETENTION_DAYS = 30;

const AVAILABLE_PERMISSIONS = [
  'approve', 'reject', 'approve_discipline', 'reject_discipline', 'approve_participant', 'cancel', 'confirm_payment',
  'export', 'manage_users', 'manage_settings', 'print', 'reject_payment', 'view_detail',
  'view_eventlog', 'view_slip', 'visitor_approval'
];

const PERMISSIONS = {
  Superadmin: ['approve', 'reject', 'approve_discipline', 'reject_discipline', 'approve_participant', 'confirm_payment', 'reject_payment', 'cancel', 'visitor_approval', 'view_slip', 'view_detail', 'export', 'print', 'manage_users', 'manage_settings', 'view_eventlog'],
  Admin: ['approve', 'reject', 'approve_discipline', 'reject_discipline', 'approve_participant', 'confirm_payment', 'reject_payment', 'cancel', 'visitor_approval', 'view_slip', 'view_detail', 'export', 'print', 'view_eventlog'],
  Finance: ['confirm_payment', 'reject_payment', 'cancel', 'view_slip', 'view_detail'],
  Vinai: ['approve_discipline', 'reject_discipline', 'view_slip', 'view_detail'],
  Tadtel: ['approve_participant', 'visitor_approval', 'view_slip', 'view_detail'],
  User: ['print']
};

const CACHE_TTL = 60;
const PUBLIC_CACHE_TTL = 120;
const LOGIN_RATE_LIMIT_TTL = 300;
const MAX_LOGIN_ATTEMPTS = 5;
const CACHE_VERSION = 'v2';
const PASSWORD_SALT = 'cc-cafe-reservation-v1';

const VALID_STATUSES = ['รอตรวจสอบผู้เข้าร่วม', 'รอตรวจสอบวินัย', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น', 'ไม่อนุมัติ', 'ยกเลิก'];

const SAVE_RESERVATION_FIELDS = ['ref', 'timestamp', 'visitorName', 'visitorId', 'visitorPhone', 'relation', 'religion',
  'allergy', 'extraVisitorReligions', 'extraVisitorAllergies', 'extraVisitorNames',
  'prisonerName', 'prisonerId', 'wing', 'visitDate', 'visitDateISO',
  'visitorCount', 'totalPersons', 'total', 'adultCount', 'child5to8Count', 'childUnder5Count',
  'status', 'slipImage'];
const SAVE_NUMERIC_FIELDS = ['visitorCount', 'totalPersons', 'total', 'adultCount', 'child5to8Count', 'childUnder5Count'];
const SAVE_STRING_CAPS = {
  visitorPhone: 32, visitorId: 64, prisonerId: 64, wing: 64, ref: 64, timestamp: 100,
  visitDate: 200, visitDateISO: 10, relation: 100, religion: 100, allergy: 1000,
  extraVisitorReligions: 5000, extraVisitorAllergies: 5000, extraVisitorNames: 5000,
  visitorName: 200, prisonerName: 200, status: 50, slipImage: 2000
};

const UPDATE_BOOKING_FIELDS = ['visitorName', 'visitorPhone', 'visitorId', 'relation', 'religion', 'allergy',
  'prisonerName', 'prisonerId', 'wing', 'visitDate', 'visitDateISO',
  'visitorCount', 'total', 'status',
  'extraVisitorNames', 'extraVisitorReligions', 'extraVisitorAllergies', 'extraVisitorApproved'];
const UPDATE_BOOKING_NUMERIC = ['visitorCount', 'total'];
const UPDATE_BOOKING_CAPS = {
  visitorName: 200, visitorPhone: 32, visitorId: 64, relation: 100, religion: 100, allergy: 1000,
  prisonerName: 200, prisonerId: 64, wing: 64, visitDate: 200, visitDateISO: 10,
  extraVisitorNames: 5000, extraVisitorReligions: 5000, extraVisitorAllergies: 5000, extraVisitorApproved: 5000
};

const STANDARD_HEADERS = ['ref', 'timestamp', 'visitorName', 'visitorId', 'visitorPhone', 'relation',
  'religion', 'allergy', 'extraVisitorReligions', 'extraVisitorAllergies',
  'extraVisitorNames', 'visitorApproved', 'extraVisitorApproved',
  'prisonerName', 'prisonerId', 'wing', 'visitDate', 'visitDateISO',
  'visitorCount', 'totalPersons', 'total', 'adultCount', 'child5to8Count', 'childUnder5Count', 'status', 'slipImage', 'cancelReason'];

// ══════════════════════════════════════════════════════════════════
// SECTION 2 — UTILITIES
// ══════════════════════════════════════════════════════════════════
function jsonResp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function formatDateISO(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function sanitizeStr(value, maxLen) {
  if (value === undefined || value === null) return '';
  const s = String(value).trim();
  const max = (maxLen === undefined || maxLen === null) ? 1000 : maxLen;
  return s.length > max ? s.substring(0, max) : s;
}

function sanitizeInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = parseInt(String(value), 10);
  if (isNaN(n)) return fallback;
  return n < 0 ? 0 : n;
}

function isValidISODate(str) {
  const s = String(str);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d.getTime()) && String(d.getFullYear()) === s.slice(0, 4);
}

let _requestMeta = { ip: '', userAgent: '' };

function logEvent(username, action, targetRef, details, result, ip, userAgent) {
  try {
    const sheet = getEventLogSheet();
    const ts = new Date();
    const detailsStr = (details && typeof details === 'object') ? JSON.stringify(details) : (details || '');
    const ipVal = sanitizeStr(ip !== undefined && ip !== null ? ip : (_requestMeta && _requestMeta.ip), 64);
    const uaVal = sanitizeStr(userAgent !== undefined && userAgent !== null ? userAgent : (_requestMeta && _requestMeta.userAgent), 500);
    appendRows(sheet, [[
      Utilities.formatDate(ts, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      username || 'system', action, targetRef || '', detailsStr, result || 'success', ipVal, uaVal
    ]]);
  } catch (e) {
    Logger.log('logEvent failed: ' + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// SECTION 3 — CACHE SERVICE
// ══════════════════════════════════════════════════════════════════
function invalidateReservationsCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(CACHE_VERSION + ':allReservations');
  } catch (e) {
    Logger.log('invalidateReservationsCache failed: ' + e.toString());
  }
  bumpDataVersion();
}

function getDataVersion() {
  try {
    return parseInt(PropertiesService.getScriptProperties().getProperty('DATA_VERSION') || '0', 10) || 0;
  } catch (e) { return 0; }
}

function bumpDataVersion() {
  try {
    PropertiesService.getScriptProperties().setProperty('DATA_VERSION', String(getDataVersion() + 1));
  } catch (e) { Logger.log('bumpDataVersion failed: ' + e.toString()); }
}

function invalidateUserCache(username) {
  try { CacheService.getScriptCache().remove('user_' + String(username || '').toLowerCase()); } catch (e) { }
}

function invalidatePrisonersCache() {
  try { CacheService.getScriptCache().remove('prisoners'); } catch (e) { }
}

function checkRateLimit(key, maxAttempts, ttlSeconds) {
  try {
    const cache = CacheService.getScriptCache();
    const attempts = parseInt(cache.get(key) || '0', 10);
    if (attempts >= maxAttempts) return false;
    cache.put(key, String(attempts + 1), ttlSeconds);
    return true;
  } catch (e) { return true; }
}

// ══════════════════════════════════════════════════════════════════
// SECTION 4 — DATA ACCESS LAYER
// ══════════════════════════════════════════════════════════════════
const _execCache = { ss: null, sheets: {} };

function getSpreadsheet() {
  if (_execCache.ss) return _execCache.ss;
  try {
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    _execCache.ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    _execCache.ss = null;
    throw new Error('Cannot open spreadsheet: ' + e.toString());
  }
  return _execCache.ss;
}

function getCachedSheet(name) {
  if (!_execCache.sheets[name]) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    _execCache.sheets[name] = sheet;
  }
  return _execCache.sheets[name];
}

function readSheetTable(sheet) {
  const data = sheet.getDataRange().getValues();
  if (!data || data.length === 0) return { headers: [], rows: [] };
  return { headers: data[0], rows: data.slice(1) };
}

function findRowByRef(table, ref) {
  const idx = table.headers.indexOf('ref');
  if (idx === -1) return -1;
  const target = String(ref || '').trim();
  for (let i = 0; i < table.rows.length; i++) {
    if (String(table.rows[i][idx]).trim() === target) return i + 2;
  }
  return -1;
}

function findRowsByRef(table, ref) {
  const idx = table.headers.indexOf('ref');
  if (idx === -1) return [];
  const target = String(ref || '').trim();
  const matches = [];
  for (let i = 0; i < table.rows.length; i++) {
    if (String(table.rows[i][idx]).trim() === target) matches.push(i + 2);
  }
  return matches;
}

function generateUniqueRefServer(existingRefs) {
  const existing = {};
  (existingRefs || []).forEach(r => { existing[String(r).trim()] = true; });
  let ref, attempts = 0;
  do {
    ref = 'VIS-' + Math.floor(10000 + Math.random() * 90000);
    attempts++;
  } while (existing[ref] && attempts < 100);
  return ref;
}

function isActiveReservationStatus(status) {
  return ['รอตรวจสอบผู้เข้าร่วม', 'รอตรวจสอบวินัย', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น'].includes(String(status || '').trim());
}

function normalizeVisitDateISO(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return formatDateISO(value);
  const s = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  return !isNaN(parsed.getTime()) ? formatDateISO(parsed) : s;
}

function findRowByKey(table, keyCol, value, caseInsensitive) {
  const idx = table.headers.indexOf(keyCol);
  if (idx === -1) return -1;
  const target = String(value || '').trim();
  for (let i = 0; i < table.rows.length; i++) {
    let cell = String(table.rows[i][idx]).trim();
    if (caseInsensitive) {
      cell = cell.toLowerCase();
      if (cell === target.toLowerCase()) return i + 2;
    } else if (cell === target) {
      return i + 2;
    }
  }
  return -1;
}

function appendRows(sheet, rows) {
  if (!rows || rows.length === 0) return;
  const width = rows[0].length;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, width).setValues(rows);
}

function writeColumnsToRows(sheet, updates) {
  if (!updates || updates.length === 0) return;
  const groups = {};
  const addGroup = (key, row, vals) => {
    if (!groups[key]) groups[key] = [];
    groups[key].push({ row: row, vals: vals });
  };

  updates.forEach(u => {
    const cols = (u.cols || [])
      .filter(c => c && typeof c[0] === 'number' && c[0] >= 0)
      .sort((a, b) => a[0] - b[0]);
    if (cols.length === 0) return;
    let segStart = cols[0][0];
    let segEnd = cols[0][0];
    let segVals = [cols[0][1]];
    for (let i = 1; i < cols.length; i++) {
      if (cols[i][0] === segEnd + 1) {
        segEnd = cols[i][0];
        segVals.push(cols[i][1]);
      } else {
        addGroup(segStart + ':' + segEnd, u.row, segVals);
        segStart = cols[i][0];
        segEnd = cols[i][0];
        segVals = [cols[i][1]];
      }
    }
    addGroup(segStart + ':' + segEnd, u.row, segVals);
  });

  Object.keys(groups).forEach(key => {
    const parts = key.split(':');
    const colStart = parseInt(parts[0], 10);
    const colEnd = parseInt(parts[1], 10);
    const width = colEnd - colStart + 1;
    const items = groups[key].sort((a, b) => a.row - b.row);

    let runStart = null;
    let runCount = 0;
    let runVals = [];
    const flushRun = () => {
      if (runCount === 0) return;
      sheet.getRange(runStart, colStart + 1, runCount, width).setValues(runVals);
      runCount = 0;
      runVals = [];
    };
    items.forEach(it => {
      if (runStart !== null && it.row === runStart + runCount) {
        runCount++;
        runVals.push(it.vals);
      } else {
        flushRun();
        runStart = it.row;
        runCount = 1;
        runVals = [it.vals];
      }
    });
    flushRun();
  });
}

function getMainSheet() {
  const sheet = getCachedSheet(SHEET_NAME);
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    appendRows(sheet, [STANDARD_HEADERS]);
    const range = sheet.getRange(1, 1, 1, STANDARD_HEADERS.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    const slipCol = STANDARD_HEADERS.indexOf('slipImage') + 1;
    if (slipCol > 0) sheet.hideColumns(slipCol);
    return;
  }
  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existingSet = {};
  existingHeaders.forEach(h => { existingSet[h] = true; });
  const added = STANDARD_HEADERS.filter(h => !existingSet[h]);
  if (added.length > 0) {
    const startCol = existingHeaders.length + 1;
    sheet.getRange(1, startCol, 1, added.length).setValues([added]);
    sheet.getRange(1, startCol, 1, added.length).setFontWeight('bold').setBackground('#185FA5').setFontColor('#ffffff');
    const slipPos = added.indexOf('slipImage');
    if (slipPos >= 0) sheet.hideColumns(startCol + slipPos);
    sheet.setFrozenRows(1);
  }
}

function getUsersSheet() {
  const sheet = getCachedSheet(USERS_SHEET);
  ensureUserHeadersAndUsers(sheet);
  return sheet;
}

function ensureUserHeadersAndUsers(sheet) {
  const headers = ['username', 'password', 'role', 'displayName', 'createdAt'];
  if (sheet.getLastRow() === 0) {
    appendRows(sheet, [headers]);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    const scriptProps = PropertiesService.getScriptProperties();
    if (scriptProps.getProperty('DISABLE_SEED_USERS') !== 'true') {
      seedDefaultUsers(sheet, headers);
    }
  }
}

function seedDefaultUsers(sheet, headers) {
  const scriptProps = PropertiesService.getScriptProperties();
  const seedJson = scriptProps.getProperty('SEED_USERS_JSON');
  if (!seedJson) {
    Logger.log('seedDefaultUsers skipped: SEED_USERS_JSON not set in Script Properties');
    return;
  }
  let seedUsers;
  try {
    seedUsers = JSON.parse(seedJson);
  } catch (e) {
    Logger.log('seedDefaultUsers failed: invalid SEED_USERS_JSON');
    return;
  }
  if (!Array.isArray(seedUsers)) return;

  const now = new Date().toISOString();
  const rows = [];
  const defaultHashes = {};
  seedUsers.forEach(u => {
    if (!Array.isArray(u) || u.length < 2) return;
    const username = String(u[0]).trim();
    const password = String(u[1]);
    const role = String(u[2] || 'User').trim();
    const displayName = String(u[3] || username).trim();
    if (!username || !password) return;
    const hashed = hashPassword(username, password);
    rows.push([username, hashed, role, displayName, now]);
    defaultHashes[username.toLowerCase()] = hashed;
  });
  if (rows.length === 0) return;

  appendRows(sheet, rows);
  try {
    scriptProps.setProperty('DEFAULT_ACCOUNTS_JSON', JSON.stringify(defaultHashes));
  } catch (e) { Logger.log('seedDefaultUsers: failed to store default account hashes'); }
}

function getDefaultAccountHashes() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('DEFAULT_ACCOUNTS_JSON');
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function clearDefaultAccountFlag(username) {
  try {
    const props = PropertiesService.getScriptProperties();
    const map = getDefaultAccountHashes();
    const key = String(username || '').toLowerCase();
    if (map[key]) {
      delete map[key];
      props.setProperty('DEFAULT_ACCOUNTS_JSON', JSON.stringify(map));
    }
  } catch (e) { }
}

function getRolesSheet() {
  const sheet = getCachedSheet('Roles');
  ensureRolesHeaders(sheet);
  return sheet;
}

function ensureRolesHeaders(sheet) {
  const headers = ['roleName', ...AVAILABLE_PERMISSIONS];
  if (sheet.getLastRow() === 0) {
    appendRows(sheet, [headers]);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  const table = readSheetTable(sheet);
  if (table.rows.length === 0) {
    const rows = Object.keys(PERMISSIONS).map(roleName => {
      const rowValues = [roleName];
      AVAILABLE_PERMISSIONS.forEach(perm => {
        rowValues.push(PERMISSIONS[roleName].includes(perm) ? true : false);
      });
      return rowValues;
    });
    appendRows(sheet, rows);
  }
}

function getEventLogSheet() {
  const sheet = getCachedSheet(EVENTLOG_SHEET);
  if (sheet.getLastRow() === 0) {
    const headers = ['timestamp', 'username', 'action', 'targetRef', 'details', 'result', 'ip', 'userAgent'];
    appendRows(sheet, [headers]);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getPrisonerSheet() {
  const sheet = getCachedSheet(PRISONER_SHEET);
  if (sheet.getLastRow() === 0) {
    const headers = ['prisonerId', 'prisonerName', 'wing', 'status', 'vinaiDate', 'note'];
    appendRows(sheet, [headers]);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getPrisonerById(prisonerId) {
  const target = String(prisonerId || '').trim();
  if (!target) return null;
  const sheet = getPrisonerSheet();
  const table = readSheetTable(sheet);
  const idIdx = table.headers.indexOf('prisonerId');
  if (idIdx === -1) return null;
  for (let i = 0; i < table.rows.length; i++) {
    if (String(table.rows[i][idIdx] || '').trim() === target) {
      const p = {};
      table.headers.forEach((h, j) => p[h] = table.rows[i][j]);
      return p;
    }
  }
  return null;
}

function isDisciplineActive(p) {
  if (!p) return false;
  if (String(p.status || '').trim() !== 'ติดวินัย งดเยี่ยม') return false;
  const vd = p.vinaiDate;
  if (vd === undefined || vd === null || String(vd).trim() === '') return true;
  let vdDate = null;
  if (vd instanceof Date) {
    vdDate = vd;
  } else {
    const parsed = new Date(String(vd).trim());
    if (!isNaN(parsed.getTime())) vdDate = parsed;
  }
  if (!vdDate) return true;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return vdDate > oneYearAgo;
}

function ensureNotesHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;
  const headers = ['ref', 'text', 'user', 'timestamp', 'createdAt'];
  appendRows(sheet, [headers]);
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setFontWeight('bold');
  range.setBackground('#185FA5');
  range.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

function getUserByUsername(username) {
  const uname = String(username || '').trim();
  if (!uname) return null;
  const cache = CacheService.getScriptCache();
  const cacheKey = 'user_' + uname.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      try { cache.remove(cacheKey); } catch (e2) { }
    }
  }
  const sheet = getUsersSheet();
  const table = readSheetTable(sheet);
  const rowNum = findRowByKey(table, 'username', uname, true);
  if (rowNum === -1) return null;
  const user = {};
  table.headers.forEach((h, idx) => user[h] = table.rows[rowNum - 2][idx]);
  try { cache.put(cacheKey, JSON.stringify(user), 300); } catch (e) { }
  return user;
}

function getAllUsers() {
  const sheet = getUsersSheet();
  const table = readSheetTable(sheet);
  return table.rows.map(r => {
    const obj = {};
    table.headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function getRolesList() {
  const rolesSheet = getRolesSheet();
  const table = readSheetTable(rolesSheet);
  if (table.rows.length === 0) return [];
  const headers = table.headers;
  const rolesList = [];
  for (let i = 0; i < table.rows.length; i++) {
    const permissions = [];
    for (let j = 1; j < headers.length; j++) {
      if (table.rows[i][j] === true) permissions.push(headers[j]);
    }
    rolesList.push({ roleName: table.rows[i][0], permissions: permissions });
  }
  return rolesList;
}

function getValidRoleNames() {
  const names = Object.keys(PERMISSIONS);
  try {
    const rolesSheet = getRolesSheet();
    const data = rolesSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && !names.includes(String(data[i][0]))) names.push(String(data[i][0]));
    }
  } catch (e) { }
  return names;
}

function isValidRoleName(role) {
  return getValidRoleNames().some(r => r.toLowerCase() === String(role).toLowerCase());
}

function getEventLogs(params) {
  const sheet = getEventLogSheet();
  const table = readSheetTable(sheet);
  if (table.rows.length === 0) return [];
  const headers = table.headers;
  let rows = table.rows.map(r => { const obj = {}; headers.forEach((h, i) => obj[h] = r[i]); return obj; }).reverse();

  if (params.fromDate) rows = rows.filter(r => r.timestamp >= params.fromDate);
  if (params.toDate) rows = rows.filter(r => r.timestamp <= params.toDate + ' 23:59:59');
  if (params.username) rows = rows.filter(r => String(r.username).toLowerCase().includes(String(params.username).toLowerCase()));
  if (params.action) rows = rows.filter(r => String(r.action).toLowerCase().includes(String(params.action).toLowerCase()));
  if (params.search) {
    const s = String(params.search).toLowerCase();
    rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(s));
  }
  return rows.slice(0, 500);
}

function saveSlipToDrive(ref, base64Data, mimeTypeOverride, fileNameOverride) {
  const matches = base64Data.match(/^data:([a-zA-Z0-9+\/]+\/[a-zA-Z0-9+\/]+);base64,(.+)$/);
  let mimeType, rawBase64;
  if (matches) {
    mimeType = mimeTypeOverride || matches[1];
    rawBase64 = matches[2];
  } else if (mimeTypeOverride) {
    mimeType = mimeTypeOverride;
    rawBase64 = base64Data;
  } else {
    throw new Error('Invalid base64 format');
  }

  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
  const fileName = fileNameOverride || ('slip_' + ref + '_' + new Date().getTime() + '.' + ext);
  const blob = Utilities.newBlob(Utilities.base64Decode(rawBase64), mimeType, fileName);

  const folderName = 'VisitorSlips';
  const folderIter = DriveApp.getFoldersByName(folderName);
  const folder = folderIter.hasNext() ? folderIter.next() : DriveApp.createFolder(folderName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
}

// ══════════════════════════════════════════════════════════════════
// SECTION 5 — AUTH & SECURITY
// ══════════════════════════════════════════════════════════════════
function sha256Hex(input) {
  const value = (input === undefined || input === null) ? '' : String(input);
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function hashPassword(username, password) {
  return 'sha256$' + sha256Hex(PASSWORD_SALT + '|' + String(username).toLowerCase() + '|' + String(password));
}

function verifyPassword(username, password, stored) {
  const s = String(stored || '');
  if (s.indexOf('sha256$') === 0) {
    return hashPassword(username, password) === s;
  }
  return String(password) === s;
}

function authenticate(username, pass) {
  const uname = String(username || '').trim();
  if (!uname || pass === undefined || pass === null) return null;
  const user = getUserByUsername(uname);
  if (!user) return null;
  if (!verifyPassword(uname, String(pass), user.password)) return null;
  if (String(user.password || '').indexOf('sha256$') !== 0) {
    try { updatePassword(uname, String(pass)); } catch (e) { Logger.log('password upgrade failed: ' + e); }
  }
  return user;
}

function isAuthorized(username, pass) {
  return !!authenticate(username, pass);
}

function hasPermission(username, perm) {
  const user = getUserByUsername(username);
  return !!(user && PERMISSIONS[user.role] && PERMISSIONS[user.role].includes(perm));
}

function updatePassword(username, newPassword) {
  const uname = sanitizeStr(username, 100);
  if (!uname || !newPassword) return false;
  const sheet = getUsersSheet();
  const table = readSheetTable(sheet);
  const passwordIdx = table.headers.indexOf('password');
  const rowNum = findRowByKey(table, 'username', uname, true);
  if (rowNum === -1 || passwordIdx === -1) return false;
  writeColumnsToRows(sheet, [{ row: rowNum, cols: [[passwordIdx, hashPassword(uname, newPassword)]] }]);
  invalidateUserCache(uname);
  clearDefaultAccountFlag(uname);
  return true;
}

function handleLogin(body) {
  const rawUsername = String(body.username || '').trim();
  const username = rawUsername.toLowerCase();
  if (!checkRateLimit('login_' + username, MAX_LOGIN_ATTEMPTS, LOGIN_RATE_LIMIT_TTL)) {
    logEvent(rawUsername, 'login_failed', '', { reason: 'rate_limited' }, 'error');
    return jsonResp({ status: 'error', message: 'การพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 5 นาที' });
  }
  const user = getUserByUsername(rawUsername);
  if (!user || !verifyPassword(rawUsername, String(body.password || ''), user.password)) {
    logEvent(rawUsername, 'login_failed', '', { reason: 'bad_credentials' }, 'error');
    return jsonResp({ status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
  if (String(user.password || '').indexOf('sha256$') !== 0) {
    try { updatePassword(rawUsername, String(body.password)); } catch (e) { }
  }
  try { CacheService.getScriptCache().remove('login_' + username); } catch (e) { }
  const defaultHashes = getDefaultAccountHashes();
  const mustChangePassword = defaultHashes[username] === user.password;
  if (mustChangePassword) {
    logEvent(username, 'login_default_password', '', { action: 'force_password_change' }, 'warning');
  }
  logEvent(username, 'login', '', { action: 'login_success' }, 'success');
  return jsonResp({
    status: 'ok',
    user: { username: user.username, role: user.role, displayName: user.displayName || user.username },
    mustChangePassword: mustChangePassword || false
  });
}

function handleChangePassword(body) {
  const newPassword = String(body.newPassword || '');
  const confirmPassword = String(body.confirmPassword || '');
  if (!newPassword || newPassword.length < 6) return jsonResp({ status: 'error', message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  if (newPassword !== confirmPassword) return jsonResp({ status: 'error', message: 'รหัสผ่านไม่ตรงกัน' });

  const success = updatePassword(body.username, newPassword);
  if (success) {
    logEvent(body.username, 'password_changed', '', { method: 'first_time_login' }, 'success');
    return jsonResp({ status: 'ok', message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าระบบใหม่' });
  }
  return jsonResp({ status: 'error', message: 'ไม่สามารถเปลี่ยนรหัสผ่านได้' });
}

// ══════════════════════════════════════════════════════════════════
// SECTION 6 — BUSINESS HANDLERS
// ══════════════════════════════════════════════════════════════════
function getActiveRows() {
  const cache = CacheService.getScriptCache();
  const CACHE_KEY = CACHE_VERSION + ':allReservations';

  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const refIdx = headers.indexOf('ref');
  if (refIdx === -1) {
    throw new Error('Sheet is missing the required "ref" column header — please check sheet structure');
  }

  const headersHash = headers.join('||');
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.headersHash === headersHash && parsed.lastRow === lastRow && Array.isArray(parsed.rows)) {
        return parsed.rows;
      }
    } catch (e) {
      try { cache.remove(CACHE_KEY); } catch (e2) { }
    }
  }

  const colCount = headers.length;
  const data = sheet.getRange(2, 1, lastRow - 1, colCount).getValues();

  const rows = data
    .filter(row => row[refIdx] && String(row[refIdx]).trim() !== '')
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        obj[h] = val instanceof Date ? (h === 'visitDateISO' ? formatDateISO(val) : Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')) : val;
      });
      if (!obj.visitDateISO && obj.visitDate) {
        const d = obj.visitDate instanceof Date ? obj.visitDate : new Date(obj.visitDate);
        if (!isNaN(d)) obj.visitDateISO = formatDateISO(d);
      }
      return obj;
    });

  const reversed = rows.reverse();
  try { cache.put(CACHE_KEY, JSON.stringify({ headersHash: headersHash, lastRow: lastRow, rows: reversed }), PUBLIC_CACHE_TTL); } catch (e) { }
  return reversed;
}

function getAllReservations_() {
  try {
    return jsonResp({ status: 'ok', rows: getActiveRows() });
  } catch (e) {
    return jsonResp({ status: 'error', message: e.message || e.toString() });
  }
}

function getAllReservationsWithArchive_() {
  try {
    const active = getActiveRows();
    const archived = getArchivedRows();
    const activeRefs = new Set(active.map(r => String(r.ref || '').trim().toUpperCase()));
    const merged = active.slice();
    archived.forEach(r => {
      const ref = String(r.ref || '').trim();
      if (ref && !activeRefs.has(ref.toUpperCase())) {
        merged.push(Object.assign({}, r, { _archived: true }));
      }
    });
    return jsonResp({ status: 'ok', rows: merged });
  } catch (e) {
    return jsonResp({ status: 'error', message: e.message || e.toString() });
  }
}

function getArchiveSheet() {
  const sheet = getCachedSheet(ARCHIVE_SHEET);
  ensureArchiveHeaders(sheet);
  return sheet;
}

function ensureArchiveHeaders(sheet) {
  const existingHeaders = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  if (existingHeaders.length === 0) {
    const headers = STANDARD_HEADERS.concat('archivedAt');
    appendRows(sheet, [headers]);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    const slipCol = headers.indexOf('slipImage') + 1;
    if (slipCol > 0) sheet.hideColumns(slipCol);
    return;
  }
  if (!existingHeaders.includes('archivedAt')) {
    const startCol = existingHeaders.length + 1;
    sheet.getRange(1, startCol, 1, 1).setValue('archivedAt');
  }
}

function getArchivedRows() {
  const sheet = getArchiveSheet();
  const table = readSheetTable(sheet);
  if (table.rows.length === 0) return [];
  const refIdx = table.headers.indexOf('ref');
  if (refIdx === -1) return [];
  const rows = table.rows
    .filter(row => row[refIdx] && String(row[refIdx]).trim() !== '')
    .map(row => {
      const obj = {};
      table.headers.forEach((h, i) => {
        let val = row[i];
        obj[h] = val instanceof Date ? (h === 'visitDateISO' ? formatDateISO(val) : Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')) : val;
      });
      if (!obj.visitDateISO && obj.visitDate) {
        const d = obj.visitDate instanceof Date ? obj.visitDate : new Date(obj.visitDate);
        if (!isNaN(d)) obj.visitDateISO = formatDateISO(d);
      }
      return obj;
    });
  return rows.reverse();
}

function getCountsByDate() {
  try {
    const rows = getActiveRows();
    const counts = {};
    const activeStatuses = ['รอตรวจสอบวินัย', 'รอตรวจสอบผู้เข้าร่วม', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น'];
    rows.forEach(r => {
      if (!r.visitDateISO) return;
      const vdi = String(r.visitDateISO).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(vdi)) return;
      if (!activeStatuses.includes(String(r.status || ''))) return;
      counts[vdi] = (counts[vdi] || 0) + 1;
    });
    return jsonResp({ status: 'ok', counts: counts });
  } catch (e) {
    return jsonResp({ status: 'error', message: e.message || e.toString() });
  }
}

const PUBLIC_LOOKUP_FIELDS = ['ref', 'timestamp', 'status', 'visitDate', 'visitDateISO', 'prisonerName', 'prisonerId', 'wing', 'visitorName', 'visitorApproved', 'extraVisitorNames', 'extraVisitorApproved', 'visitorCount', 'totalPersons', 'total', 'cancelReason', 'archivedAt'];

function maskRowForPublic(row) {
  const out = {};
  PUBLIC_LOOKUP_FIELDS.forEach(k => {
    if (row[k] === undefined || row[k] === null || String(row[k]) === '') return;
    if (k === 'extraVisitorNames') {
      out[k] = String(row[k]).split(';;').map(part => {
        const p = part.split('|');
        return (p[0] || '').trim();
      }).filter(n => n).join(';;');
    } else {
      out[k] = row[k];
    }
  });
  return out;
}

function lookupByRef(params) {
  try {
    const ref = sanitizeStr(params.ref, 64);
    const prisonerId = sanitizeStr(params.prisonerId, 64);
    if (!ref && !prisonerId) return jsonResp({ status: 'error', message: 'Missing ref or prisonerId' });

    let matches = [];
    const active = getActiveRows();
    if (ref) matches = active.filter(r => String(r.ref).toUpperCase() === ref.toUpperCase());
    else matches = active.filter(r => String(r.prisonerId).trim() === prisonerId);

    if (matches.length === 0) {
      const archived = getArchivedRows();
      if (ref) matches = archived.filter(r => String(r.ref).toUpperCase() === ref.toUpperCase());
      else matches = archived.filter(r => String(r.prisonerId).trim() === prisonerId);
    }

    return jsonResp({ status: 'ok', rows: matches.map(maskRowForPublic) });
  } catch (e) {
    return jsonResp({ status: 'error', message: e.message || e.toString() });
  }
}

function getArchivedReservations(params) {
  try {
    let rows = getArchivedRows();
    const from = sanitizeStr(params.from, 10);
    const to = sanitizeStr(params.to, 10);
    if (from || to) {
      rows = rows.filter(r => {
        const vdi = String(r.visitDateISO || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(vdi)) return false;
        if (from && vdi < from) return false;
        if (to && vdi > to) return false;
        return true;
      });
    }
    return jsonResp({ status: 'ok', rows: rows });
  } catch (e) {
    return jsonResp({ status: 'error', message: e.message || e.toString() });
  }
}

function handleSaveReservation(body) {
  const validation = validateSaveReservation(body);
  if (!validation.ok) return jsonResp({ status: 'error', message: validation.message });

  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(20000)) {
      return jsonResp({ status: 'error', message: '⚠️ ระบบกำลังรับคำขอจำนวนมาก กรุณารอสักครู่แล้วลองใหม่อีกครั้ง' });
    }

    const sheet = getMainSheet();
    const table = readSheetTable(sheet);
    const headers = table.headers;
    const refIdx = headers.indexOf('ref');
    const prisonerIdIdx = headers.indexOf('prisonerId');
    const dateIdx = headers.indexOf('visitDateISO');
    const statusIdx = headers.indexOf('status');

    // ── Guard: reject duplicate booking for the same prisoner on the same day ──
    const newPrisonerId = String(validation.data.prisonerId || '').trim();
    const newDate = normalizeVisitDateISO(validation.data.visitDateISO);
    if (prisonerIdIdx >= 0 && dateIdx >= 0 && newPrisonerId && newDate) {
      for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        if (String(row[prisonerIdIdx] || '').trim() === newPrisonerId &&
            normalizeVisitDateISO(row[dateIdx]) === newDate &&
            isActiveReservationStatus(row[statusIdx])) {
          const dupRef = String(row[refIdx] || '').trim();
          return jsonResp({ status: 'error', message: '⚠️ ไม่สามารถจองได้ — มีการจองผู้ต้องขังหมายเลข "' + newPrisonerId + '" ในวันนี้อยู่แล้ว' + (dupRef ? ' (Ref: ' + dupRef + ')' : '') });
        }
      }
    }

    // ── Guard: block booking when the prisoner has active discipline ──
    if (newPrisonerId && isDisciplineActive(getPrisonerById(newPrisonerId))) {
      return jsonResp({ status: 'error', message: '⚠️ ไม่สามารถจองได้ — ผู้ต้องขังหมายเลข "' + newPrisonerId + '" อยู่ในระหว่าง "ติดวินัย งดเยี่ยม" (งดเยี่ยม)' });
    }

    // ── Guard: ensure ref is unique against the LIVE sheet (not cache) ──
    const existingRefs = [];
    if (refIdx >= 0) {
      for (let i = 0; i < table.rows.length; i++) {
        const r = String(table.rows[i][refIdx] || '').trim();
        if (r) existingRefs.push(r);
      }
    }
    let ref = String(validation.data.ref || '').trim();
    if (!ref || existingRefs.indexOf(ref) !== -1) {
      ref = generateUniqueRefServer(existingRefs);
    }

    const data = Object.assign({}, validation.data, { ref: ref });
    const newRow = headers.map(h => data[h] !== undefined ? data[h] : '');
    const rowNum = sheet.getLastRow() + 1;
    sheet.getRange(rowNum, 1, 1, headers.length).setValues([newRow]);

    const phoneIdx = headers.indexOf('visitorPhone');
    if (phoneIdx >= 0) {
      sheet.getRange(rowNum, phoneIdx + 1).setNumberFormat('@');
    }

    invalidateReservationsCache();
    logEvent('public', 'booking_submitted', ref, { visitorName: data.visitorName, prisonerName: data.prisonerName, visitDate: data.visitDate }, 'success');
    return jsonResp({ status: 'ok', ref: ref });
  } catch (err) {
    Logger.log('handleSaveReservation failed: ' + err.toString());
    return jsonResp({ status: 'error', message: 'เกิดข้อผิดพลาดในการบันทึกการจอง — ' + err.toString() });
  } finally {
    try { lock.releaseLock(); } catch (e) { }
  }
}

function handleDedupeReservations(body, username) {
  if (!hasPermission(username, 'manage_users') && !hasPermission(username, 'approve')) {
    return jsonResp({ status: 'error', message: 'ไม่มีสิทธิ์ดำเนินการนี้' });
  }

  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(20000)) {
      return jsonResp({ status: 'error', message: '⚠️ ระบบกำลังไม่ว่าง กรุณาลองใหม่อีกครั้ง' });
    }

    const sheet = getMainSheet();
    const table = readSheetTable(sheet);
    const refIdx = table.headers.indexOf('ref');
    if (refIdx === -1) return jsonResp({ status: 'error', message: 'ไม่พบคอลัมน์ "ref" ในชีต' });

    const seen = {};
    const rowsToDelete = [];
    for (let i = 0; i < table.rows.length; i++) {
      const ref = String(table.rows[i][refIdx] || '').trim();
      if (!ref) continue;
      if (seen[ref]) {
        rowsToDelete.push(i + 2);
      } else {
        seen[ref] = true;
      }
    }

    if (rowsToDelete.length === 0) {
      return jsonResp({ status: 'ok', removed: 0, message: 'ไม่พบเลขอ้างอิงซ้ำในชีต' });
    }

    rowsToDelete.sort((a, b) => b - a);
    rowsToDelete.forEach(rowNum => {
      sheet.deleteRow(rowNum);
    });

    invalidateReservationsCache();
    logEvent(username, 'dedupe_reservations', '', { removed: rowsToDelete.length }, 'success');
    return jsonResp({ status: 'ok', removed: rowsToDelete.length, message: 'ลบการจองซ้ำ ' + rowsToDelete.length + ' แถว' });
  } catch (err) {
    Logger.log('handleDedupeReservations failed: ' + err.toString());
    return jsonResp({ status: 'error', message: err.message || err.toString() });
  } finally {
    try { lock.releaseLock(); } catch (e) { }
  }
}

function validateSaveReservation(body) {
  if (!body || typeof body !== 'object') return { ok: false, message: 'Invalid request body' };
  const ref = sanitizeStr(body.ref, 64);
  if (!ref) return { ok: false, message: 'กรุณากรอกเลขอ้างอิง' };
  const vdi = body.visitDateISO !== undefined && body.visitDateISO !== '' ? String(body.visitDateISO).trim() : '';
  if (vdi && !isValidISODate(vdi)) return { ok: false, message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)' };

  const data = {};
  SAVE_RESERVATION_FIELDS.forEach(field => {
    if (body[field] === undefined) return;
    if (SAVE_NUMERIC_FIELDS.includes(field)) {
      data[field] = sanitizeInt(body[field], 0);
    } else if (field === 'status') {
      const s = sanitizeStr(body[field], 50);
      data[field] = (s === 'รอตรวจสอบผู้เข้าร่วม' || s === '') ? s : 'รอตรวจสอบผู้เข้าร่วม';
    } else {
      const cap = SAVE_STRING_CAPS[field] || 1000;
      data[field] = sanitizeStr(body[field], cap);
    }
  });
  data.ref = ref;
  return { ok: true, data };
}

function handleCancelBooking(body, username) {
  const sheet = getMainSheet();
  const table = readSheetTable(sheet);
  const statusIdx = table.headers.indexOf('status');
  const cancelReasonIdx = table.headers.indexOf('cancelReason');
  const rowNums = findRowsByRef(table, body.ref);
  if (rowNums.length === 0) return jsonResp({ status: 'error', message: 'Ref not found' });

  const prevStatus = statusIdx >= 0 ? table.rows[rowNums[0] - 2][statusIdx] : '';
  const updates = rowNums.map(rowNum => {
    const cols = [];
    if (statusIdx >= 0) cols.push([statusIdx, 'ยกเลิก']);
    if (body.reason && cancelReasonIdx >= 0) cols.push([cancelReasonIdx, sanitizeStr(body.reason, 2000)]);
    return { row: rowNum, cols: cols };
  });
  writeColumnsToRows(sheet, updates);

  logEvent(username, 'booking_cancelled', body.ref, { previousStatus: prevStatus, affectedRows: rowNums.length }, 'success');
  invalidateReservationsCache();
  return jsonResp({ status: 'ok' });
}

function handlePublicCancelBooking(body) {
  const sheet = getMainSheet();
  const table = readSheetTable(sheet);
  const statusIdx = table.headers.indexOf('status');
  const rowNums = findRowsByRef(table, body.ref);
  if (rowNums.length === 0) return jsonResp({ status: 'error', message: 'Ref not found' });

  const prevStatus = statusIdx >= 0 ? table.rows[rowNums[0] - 2][statusIdx] : '';
  const updates = rowNums.map(rowNum => {
    const cols = [];
    if (statusIdx >= 0) cols.push([statusIdx, 'ยกเลิก']);
    return { row: rowNum, cols: cols };
  });
  if (statusIdx >= 0) writeColumnsToRows(sheet, updates);

  logEvent('public', 'booking_cancelled', body.ref, { previousStatus: prevStatus, affectedRows: rowNums.length }, 'success');
  invalidateReservationsCache();
  return jsonResp({ status: 'ok' });
}

function handleUpdateStatus(body, username) {
  const ref = sanitizeStr(body.ref, 64);
  const status = sanitizeStr(body.status, 50);
  if (!ref || !status) return jsonResp({ status: 'error', message: 'Missing ref or status' });

  if (!VALID_STATUSES.includes(status)) return jsonResp({ status: 'error', message: 'Invalid status: ' + status });

  const allowedTransitions = {
    'รอตรวจสอบผู้เข้าร่วม': ['รอตรวจสอบวินัย', 'ไม่อนุมัติ', 'ยกเลิก'],
    'รอตรวจสอบวินัย': ['รอชำระเงิน', 'ไม่อนุมัติ', 'ยกเลิก'],
    'รอชำระเงิน': ['ชำระแล้ว', 'ยกเลิก'],
    'ชำระแล้ว': ['เสร็จสิ้น', 'ยกเลิก'],
    'เสร็จสิ้น': [],
    'ไม่อนุมัติ': [],
    'ยกเลิก': []
  };

  const roleAllowedStatuses = {
    'Superadmin': null,
    'Admin': null,
    'Tadtel': ['รอตรวจสอบวินัย', 'ไม่อนุมัติ'],
    'Vinai': ['รอชำระเงิน', 'ไม่อนุมัติ', 'ยกเลิก'],
    'Finance': ['ชำระแล้ว', 'เสร็จสิ้น', 'ไม่อนุมัติ']
  };

  const caller = getUserByUsername(username);
  const callerRole = caller ? caller.role : null;
  const roleAllowed = roleAllowedStatuses[callerRole];
  const canFreeRejectCancel = ['Superadmin', 'Admin', 'Vinai'].includes(callerRole);

  if (roleAllowed !== null && roleAllowed !== undefined && !roleAllowed.includes(status)) {
    logEvent(username, 'status_change_rejected', ref, { newStatus: status, reason: 'role_not_allowed', role: callerRole }, 'denied');
    return jsonResp({ status: 'error', message: 'Role "' + callerRole + '" is not allowed to set status "' + status + '"' });
  }

  const sheet = getMainSheet();
  const table = readSheetTable(sheet);
  const statusIdx = table.headers.indexOf('status');
  const cancelReasonIdx = table.headers.indexOf('cancelReason');
  const rowNums = findRowsByRef(table, ref);
  if (rowNums.length === 0) return jsonResp({ status: 'error', message: 'Ref not found' });

  let rejected = null;
  rowNums.forEach(rowNum => {
    const oldStatus = statusIdx >= 0 ? String(table.rows[rowNum - 2][statusIdx] || '').trim() : '';
    let allowed = allowedTransitions[oldStatus];
    if (canFreeRejectCancel && (status === 'ไม่อนุมัติ' || status === 'ยกเลิก')) {
      allowed = ['ไม่อนุมัติ', 'ยกเลิก'];
    }
    if (allowed && !allowed.includes(status) && !rejected) {
      rejected = { oldStatus: oldStatus, newStatus: status };
    }
  });
  if (rejected) {
    logEvent(username, 'status_change_rejected', ref, { oldStatus: rejected.oldStatus, newStatus: rejected.newStatus, reason: 'invalid_transition' }, 'denied');
    return jsonResp({ status: 'error', message: 'Cannot change from "' + rejected.oldStatus + '" to "' + status + '"' });
  }

  // ── Guard: block approval when the prisoner has active discipline ──
  if (status === 'รอชำระเงิน') {
    const pidIdx = table.headers.indexOf('prisonerId');
    let disciplineBlocked = false;
    rowNums.forEach(rowNum => {
      const pid = pidIdx >= 0 ? String(table.rows[rowNum - 2][pidIdx] || '').trim() : '';
      if (pid && isDisciplineActive(getPrisonerById(pid))) disciplineBlocked = true;
    });
    if (disciplineBlocked) {
      logEvent(username, 'status_change_rejected', ref, { newStatus: status, reason: 'discipline_active' }, 'denied');
      return jsonResp({ status: 'error', message: '⚠️ ไม่สามารถอนุมัติได้ — ผู้ต้องขังอยู่ในระหว่าง "ติดวินัย งดเยี่ยม" (งดเยี่ยม)' });
    }
  }

  const updates = rowNums.map(rowNum => {
    const cols = [];
    if (statusIdx >= 0) cols.push([statusIdx, status]);
    if (body.reason && (status === 'ไม่อนุมัติ' || status === 'ยกเลิก') && cancelReasonIdx >= 0) {
      cols.push([cancelReasonIdx, sanitizeStr(body.reason, 2000)]);
    }
    return { row: rowNum, cols: cols };
  });
  writeColumnsToRows(sheet, updates);

  logEvent(username, 'status_changed', ref, { newStatus: status, affectedRows: rowNums.length }, 'success');
  invalidateReservationsCache();
  return jsonResp({ status: 'ok' });
}

function handleUpdateVisitorApproval(body, username) {
  if (!body.ref) return jsonResp({ status: 'error', message: 'Missing ref' });

  const sheet = getMainSheet();
  let table = readSheetTable(sheet);
  let headers = table.headers;
  let vaIdx = headers.indexOf('visitorApproved');
  let evaIdx = headers.indexOf('extraVisitorApproved');

  if (vaIdx === -1 || evaIdx === -1) {
    const missing = [];
    if (vaIdx === -1) missing.push('visitorApproved');
    if (evaIdx === -1) missing.push('extraVisitorApproved');
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    table = readSheetTable(sheet);
    headers = table.headers;
    vaIdx = headers.indexOf('visitorApproved');
    evaIdx = headers.indexOf('extraVisitorApproved');
  }

  const rowNums = findRowsByRef(table, body.ref);
  if (rowNums.length === 0) return jsonResp({ status: 'error', message: 'Ref not found' });
  const rowIndex = rowNums[0] - 2;

  const mainApproved = (body.visitorApproved || '').toString().trim().toLowerCase() === 'yes' ? 1 : 0;
  let correctTotal = 2000;
  let extraYesCount = 0;

  if (body.extraVisitorApproved) {
    const allApprovals = String(body.extraVisitorApproved).split(';;');
    extraYesCount = allApprovals.filter(v => (v || '').trim().toLowerCase() === 'yes').length;
    const evnIdx = headers.indexOf('extraVisitorNames');
    if (evnIdx > -1 && table.rows[rowIndex][evnIdx]) {
      const raw = String(table.rows[rowIndex][evnIdx]);
      if (raw.includes(';;')) {
        const extras = raw.split(';;').map(e => {
          const p = e.split('|');
          return { name: (p[0] || '').trim(), id: (p[1] || '').trim(), relation: (p[2] || '').trim(), age: (p[3] || '').trim() };
        }).filter(e => e.name);
        let extraFeeSum = 0;
        extras.forEach((v, idx) => {
          if ((allApprovals[idx] || '').trim().toLowerCase() === 'yes') {
            let fee = 1000;
            if (v.relation === 'บุตร / ธิดา') {
              const a = parseInt(v.age, 10);
              if (!isNaN(a) && a < 5) fee = 0;
              else if (!isNaN(a) && a <= 8) fee = 500;
            }
            extraFeeSum += fee;
          }
        });
        correctTotal += extraFeeSum;
      } else {
        correctTotal += extraYesCount * 1000;
      }
    } else {
      correctTotal += extraYesCount * 1000;
    }
  }

  const correctVisitorCount = mainApproved + extraYesCount;
  const vcIdx = headers.indexOf('visitorCount');
  const tIdx = headers.indexOf('total');

  const cols = [];
  if (body.visitorApproved !== undefined) cols.push([vaIdx, sanitizeStr(body.visitorApproved, 8)]);
  if (body.extraVisitorApproved !== undefined) cols.push([evaIdx, sanitizeStr(body.extraVisitorApproved, 5000)]);
  if (vcIdx > -1) cols.push([vcIdx, correctVisitorCount]);
  if (tIdx > -1) cols.push([tIdx, correctTotal]);
  const updates = rowNums.map(rowNum => ({ row: rowNum, cols: cols.slice() }));
  writeColumnsToRows(sheet, updates);

  logEvent(username, 'visitor_approval_updated', body.ref, { visitorApproved: body.visitorApproved, extraVisitorApproved: body.extraVisitorApproved, visitorCount: correctVisitorCount, total: correctTotal, affectedRows: rowNums.length }, 'success');
  invalidateReservationsCache();
  return jsonResp({ status: 'ok', visitorCount: correctVisitorCount, total: correctTotal });
}

function handleUploadSlip(body) {
  const ref = sanitizeStr(body.ref, 64);
  if (!body.base64Data) return jsonResp({ status: 'error', message: 'Missing base64Data' });
  if (!ref) return jsonResp({ status: 'error', message: 'Missing ref' });
  if (String(body.base64Data).length > 20 * 1024 * 1024) return jsonResp({ status: 'error', message: 'ไฟล์มีขนาดใหญ่เกินไป' });
  try {
    const url = saveSlipToDrive(ref, body.base64Data, String(body.mimeType || ''), String(body.fileName || ''));
    logEvent(body.username || 'public', 'slip_uploaded', ref, {}, 'success');
    return jsonResp({ status: 'ok', url: url });
  } catch (e) {
    logEvent(body.username || 'public', 'slip_upload_failed', ref, { error: e.toString() }, 'error');
    return jsonResp({ status: 'error', message: e.toString() });
  }
}

function handleUpdateSlipAndStatus(body, username) {
  const sheet = getMainSheet();
  const table = readSheetTable(sheet);
  const statusIdx = table.headers.indexOf('status');
  const slipIdx = table.headers.indexOf('slipImage');
  const rowNums = findRowsByRef(table, body.ref);
  if (rowNums.length === 0) return jsonResp({ status: 'error', message: 'Ref not found' });

  const cols = [];
  if (statusIdx >= 0) cols.push([statusIdx, sanitizeStr(body.status, 50) || 'ชำระแล้ว']);
  if (slipIdx >= 0 && body.slipImage) {
    let slipVal = String(body.slipImage);
    if (slipVal.indexOf('data:image') === 0) {
      try { slipVal = saveSlipToDrive(body.ref, slipVal); } catch (e) { slipVal = 'SLIP_UPLOADED:' + new Date().toISOString(); }
    }
    cols.push([slipIdx, slipVal]);
  }
  const updates = rowNums.map(rowNum => ({ row: rowNum, cols: cols.slice() }));
  writeColumnsToRows(sheet, updates);

  logEvent(username, 'slip_and_status_updated', body.ref, { status: body.status }, 'success');
  invalidateReservationsCache();
  return jsonResp({ status: 'ok' });
}

function handleCreateUser(body) {
  const adminUser = body.adminUser || body.username;
  if (String(adminUser).toLowerCase() !== 'superadmin' && !hasPermission(adminUser, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'เฉพาะผู้ดูแลสูงสุดเท่านั้นที่สามารถสร้างผู้ใช้ได้' });
  }

  const newUsername = sanitizeStr(body.username, 100);
  const newPassword = String(body.password || '');
  const newRole = sanitizeStr(body.role, 100);
  const newDisplayName = sanitizeStr(body.displayName, 200) || newUsername;

  if (!newUsername || !newPassword || !newRole) {
    return jsonResp({ status: 'error', message: 'กรุณากรอกข้อมูลให้ครบ (username, password, role)' });
  }
  if (newPassword.length < 6) {
    return jsonResp({ status: 'error', message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }
  if (!isValidRoleName(newRole)) {
    return jsonResp({ status: 'error', message: 'บทบาทไม่ถูกต้อง: ' + newRole });
  }

  const sheet = getUsersSheet();
  const table = readSheetTable(sheet);
  if (findRowByKey(table, 'username', newUsername, true) !== -1) {
    return jsonResp({ status: 'error', message: 'ชื่อผู้ใช้นั้นมีอยู่แล้ว' });
  }

  appendRows(sheet, [[newUsername, hashPassword(newUsername, newPassword), newRole, newDisplayName, new Date().toISOString()]]);
  invalidateUserCache(adminUser);
  invalidateUserCache(newUsername);
  logEvent(adminUser, 'create_user', newUsername, { role: newRole }, 'success');
  return jsonResp({ status: 'ok', message: 'ผู้ใช้ถูกสร้างสำเร็จ', user: { username: newUsername, role: newRole } });
}

function handleCreateRole(body, username) {
  if (!hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'เฉพาะผู้ดูแลสูงสุดเท่านั้นที่สามารถสร้างบทบาทใหม่ได้' });
  }

  const roleName = sanitizeStr(body.roleName, 100);
  const permissionsInput = Array.isArray(body.permissions) ? body.permissions.map(p => String(p)) : [];

  if (!roleName) return jsonResp({ status: 'error', message: 'กรุณากรอกชื่อบทบาท' });
  if (permissionsInput.length === 0) {
    return jsonResp({ status: 'error', message: 'กรุณาเลือกอย่างน้อยหนึ่งสิทธิ์สำหรับบทบาท' });
  }

  const invalidPermissions = permissionsInput.filter(p => !AVAILABLE_PERMISSIONS.includes(p));
  if (invalidPermissions.length > 0) {
    return jsonResp({ status: 'error', message: 'สิทธิ์ต่อไปนี้ไม่ถูกต้อง: ' + invalidPermissions.join(', ') });
  }

  const rolesSheet = getRolesSheet();
  const table = readSheetTable(rolesSheet);
  if (findRowByKey(table, 'roleName', roleName, true) !== -1) {
    return jsonResp({ status: 'error', message: 'ชื่อบทบาทนี้มีอยู่แล้วในระบบ' });
  }

  const rowValues = [roleName];
  AVAILABLE_PERMISSIONS.forEach(perm => rowValues.push(permissionsInput.includes(perm) ? true : false));
  appendRows(rolesSheet, [rowValues]);
  logEvent(username, 'create_role', roleName, { permissions: permissionsInput }, 'success');
  return jsonResp({ status: 'ok', message: 'สร้างบทบาทสำเร็จ', role: { roleName: roleName, permissions: permissionsInput } });
}

function handleUpdateUser(body, username) {
  if (!hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'เฉพาะผู้ดูแลสูงสุดเท่านั้นที่สามารถแก้ไขผู้ใช้ได้' });
  }

  const targetUser = sanitizeStr(body.targetUser, 100);
  if (!targetUser) return jsonResp({ status: 'error', message: 'กรุณาระบุผู้ใช้ที่ต้องการแก้ไข' });

  const sheet = getUsersSheet();
  const table = readSheetTable(sheet);
  const roleIdx = table.headers.indexOf('role');
  const displayIdx = table.headers.indexOf('displayName');
  const passIdx = table.headers.indexOf('password');
  const rowNum = findRowByKey(table, 'username', targetUser, true);
  if (rowNum === -1) return jsonResp({ status: 'error', message: 'ไม่พบผู้ใช้ที่ระบุ' });

  const cols = [];
  if (body.role !== undefined) {
    const role = sanitizeStr(body.role, 100);
    if (!isValidRoleName(role)) return jsonResp({ status: 'error', message: 'บทบาทไม่ถูกต้อง: ' + role });
    if (roleIdx >= 0) cols.push([roleIdx, role]);
  }
  if (body.displayName !== undefined) {
    if (displayIdx >= 0) cols.push([displayIdx, sanitizeStr(body.displayName, 200)]);
  }
  if (body.newPassword) {
    const np = String(body.newPassword);
    if (np.length < 6) return jsonResp({ status: 'error', message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
    if (passIdx >= 0) cols.push([passIdx, hashPassword(targetUser, np)]);
    clearDefaultAccountFlag(targetUser);
  }
  if (cols.length > 0) writeColumnsToRows(sheet, [{ row: rowNum, cols: cols }]);
  invalidateUserCache(targetUser);
  logEvent(username, 'update_user', targetUser, { role: body.role, displayName: body.displayName }, 'success');
  return jsonResp({ status: 'ok', message: 'อัปเดตผู้ใช้สำเร็จ' });
}

function handleDeleteUser(body, username) {
  if (!hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'เฉพาะผู้ดูแลสูงสุดเท่านั้นที่สามารถลบผู้ใช้ได้' });
  }

  const targetUser = sanitizeStr(body.targetUser, 100);
  if (!targetUser) return jsonResp({ status: 'error', message: 'กรุณาระบุผู้ใช้ที่ต้องการลบ' });
  if (String(targetUser).toLowerCase() === String(username).toLowerCase()) {
    return jsonResp({ status: 'error', message: 'ไม่สามารถลบตัวเองได้' });
  }

  const sheet = getUsersSheet();
  const table = readSheetTable(sheet);
  const rowNum = findRowByKey(table, 'username', targetUser, true);
  if (rowNum === -1) return jsonResp({ status: 'error', message: 'ไม่พบผู้ใช้ที่ระบุ' });
  sheet.deleteRow(rowNum);
  invalidateUserCache(targetUser);
  logEvent(username, 'delete_user', targetUser, {}, 'success');
  return jsonResp({ status: 'ok', message: 'ลบผู้ใช้สำเร็จ' });
}

function handleUpdateBooking(body, username) {
  const caller = getUserByUsername(username);
  if (!caller || caller.role !== 'Superadmin') {
    return jsonResp({ status: 'error', message: 'เฉพาะ Superadmin เท่านั้นที่สามารถแก้ไขการจองได้' });
  }
  const ref = sanitizeStr(body.ref, 64);
  if (!ref) return jsonResp({ status: 'error', message: 'กรุณาระบุเลขอ้างอิง' });

  const sheet = getMainSheet();
  const table = readSheetTable(sheet);
  const headers = table.headers;
  const rowNums = findRowsByRef(table, ref);
  if (rowNums.length === 0) return jsonResp({ status: 'error', message: 'ไม่พบการจองที่ระบุ' });

  const phoneIdx = headers.indexOf('visitorPhone');
  const cols = [];
  const changes = {};
  const errors = [];
  UPDATE_BOOKING_FIELDS.forEach(field => {
    if (body[field] === undefined) return;
    const colIdx = headers.indexOf(field);
    if (colIdx < 0) return;
    let value;
    if (UPDATE_BOOKING_NUMERIC.includes(field)) {
      value = sanitizeInt(body[field], 0);
    } else if (field === 'visitDateISO') {
      const s = sanitizeStr(body[field], 10);
      if (s && !isValidISODate(s)) { errors.push('รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)'); return; }
      value = s;
    } else if (field === 'status') {
      const s = sanitizeStr(body[field], 50);
      if (!VALID_STATUSES.includes(s)) { errors.push('สถานะไม่ถูกต้อง: ' + s); return; }
      value = s;
    } else {
      value = sanitizeStr(body[field], UPDATE_BOOKING_CAPS[field] || 1000);
    }
    cols.push([colIdx, value]);
    changes[field] = value;
  });
  if (errors.length > 0) return jsonResp({ status: 'error', message: errors.join('; ') });

  if (cols.length > 0) {
    const updates = rowNums.map(rowNum => ({ row: rowNum, cols: cols.slice() }));
    writeColumnsToRows(sheet, updates);
    if (phoneIdx >= 0 && changes.visitorPhone !== undefined) {
      rowNums.forEach(rowNum => {
        sheet.getRange(rowNum, phoneIdx + 1).setNumberFormat('@');
      });
    }
  }
  logEvent(username, 'update_booking', ref, changes, 'success');
  invalidateReservationsCache();
  return jsonResp({ status: 'ok', message: 'แก้ไขการจองสำเร็จ' });
}

function handleSaveSettings(body, username) {
  if (!hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'ไม่มีสิทธิ์บันทึกตั้งค่า' });
  }

  const scriptProps = PropertiesService.getScriptProperties();
  const settings = (body.settings && typeof body.settings === 'object') ? body.settings : {};
  settings._savedBy = username;
  settings._savedAt = new Date().toISOString();
  scriptProps.setProperty('admin_settings', JSON.stringify(settings));
  logEvent(username, 'save_settings', '', settings, 'success');
  return jsonResp({ status: 'ok', message: 'บันทึกตั้งค่าสำเร็จ' });
}

function handleAddNote(body, username) {
  if (!body.ref || !body.note) {
    return jsonResp({ status: 'error', message: 'กรุณาระบุเลขอ้างอิงและหมายเหตุ' });
  }
  const ref = sanitizeStr(body.ref, 64);
  const noteObj = (body.note && typeof body.note === 'object') ? body.note : {};
  const text = sanitizeStr(noteObj.text, 2000);
  const noteUser = sanitizeStr(noteObj.user || username, 100);
  const timestamp = sanitizeStr(noteObj.timestamp, 100) || new Date().toLocaleString('th-TH');
  if (!text) return jsonResp({ status: 'error', message: 'กรุณากรอกข้อความหมายเหตุ' });

  const sheet = getCachedSheet(NOTES_SHEET);
  ensureNotesHeaders(sheet);
  appendRows(sheet, [[ref, text, noteUser, timestamp, new Date().toISOString()]]);
  logEvent(username, 'add_note', ref, { text: text }, 'success');
  return jsonResp({ status: 'ok', message: 'เพิ่มหมายเหตุสำเร็จ' });
}

function handleGetNotes(body) {
  const ref = sanitizeStr(body.ref, 64);
  if (!ref) return jsonResp({ status: 'error', message: 'Missing ref' });

  const sheet = getCachedSheet(NOTES_SHEET);
  if (sheet.getLastRow() <= 1) return jsonResp({ status: 'ok', notes: [] });

  const table = readSheetTable(sheet);
  const refIdx = table.headers.indexOf('ref');
  if (refIdx === -1) return jsonResp({ status: 'error', message: 'Notes sheet missing ref column' });

  const notes = [];
  for (let i = 0; i < table.rows.length; i++) {
    if (String(table.rows[i][refIdx]).trim() === String(ref).trim()) {
      const note = {};
      table.headers.forEach((h, j) => { note[h] = table.rows[i][j]; });
      notes.push(note);
    }
  }
  return jsonResp({ status: 'ok', notes: notes });
}

function handleImportPrisoners(body, username) {
  if (!hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'ไม่มีสิทธิ์นำเข้าข้อมูลผู้ต้องขัง' });
  }

  const prisoners = Array.isArray(body.prisoners) ? body.prisoners : null;
  if (!prisoners || prisoners.length === 0) {
    return jsonResp({ status: 'error', message: 'กรุณาส่งข้อมูลผู้ต้องขังอย่างน้อย 1 รายการ' });
  }
  if (prisoners.length > 5000) {
    return jsonResp({ status: 'error', message: 'ข้อมูลผู้ต้องขังมากเกินไป (สูงสุด 5000 รายการต่อครั้ง)' });
  }

  const sheet = getPrisonerSheet();
  const table = readSheetTable(sheet);
  const headers = table.headers;
  const idIdx = headers.indexOf('prisonerId');
  const nameIdx = headers.indexOf('prisonerName');
  const wingIdx = headers.indexOf('wing');
  const statusIdx = headers.indexOf('status');
  const vinaiDateIdx = headers.indexOf('vinaiDate');
  const noteIdx = headers.indexOf('note');

  const idIndex = {};
  for (let r = 0; r < table.rows.length; r++) {
    const pid = String(table.rows[r][idIdx] || '').trim();
    if (pid && idIndex[pid] === undefined) idIndex[pid] = r + 2;
  }

  let added = 0;
  let updated = 0;
  const errors = [];
  const newRows = [];
  const updateRows = [];

  prisoners.forEach((p, i) => {
    const prisonerId = sanitizeStr(p.prisonerId, 64);
    const name = sanitizeStr(p.prisonerName, 200);
    if (!prisonerId || !name) {
      errors.push('แถวที่ ' + (i + 1) + ': ขาดเลขผู้ต้องขังหรือชื่อ');
      return;
    }
    const wing = sanitizeStr(p.wing, 64);
    const status = sanitizeStr(p.status, 100);
    const vinaiDate = sanitizeStr(p.vinaiDate, 40);
    const note = sanitizeStr(p.note, 2000);

    const existingRow = idIndex[prisonerId];
    if (existingRow !== undefined) {
      const cols = [];
      if (nameIdx >= 0) cols.push([nameIdx, name]);
      if (wingIdx >= 0) cols.push([wingIdx, wing]);
      if (statusIdx >= 0) cols.push([statusIdx, status]);
      if (vinaiDateIdx >= 0) cols.push([vinaiDateIdx, vinaiDate]);
      if (noteIdx >= 0) cols.push([noteIdx, note]);
      updateRows.push({ row: existingRow, cols: cols });
      updated++;
    } else {
      const newRow = new Array(headers.length).fill('');
      if (idIdx >= 0) newRow[idIdx] = prisonerId;
      if (nameIdx >= 0) newRow[nameIdx] = name;
      if (wingIdx >= 0) newRow[wingIdx] = wing;
      if (statusIdx >= 0) newRow[statusIdx] = status;
      if (vinaiDateIdx >= 0) newRow[vinaiDateIdx] = vinaiDate;
      if (noteIdx >= 0) newRow[noteIdx] = note;
      newRows.push(newRow);
      added++;
    }
  });

  if (newRows.length > 0) appendRows(sheet, newRows);
  if (updateRows.length > 0) writeColumnsToRows(sheet, updateRows);

  invalidatePrisonersCache();
  logEvent(username, 'import_prisoners', '', { added: added, updated: updated, errors: errors.length }, 'success');
  return jsonResp({ status: 'ok', message: 'นำเข้าสำเร็จ: เพิ่ม ' + added + ' รายการ, อัปเดต ' + updated + ' รายการ', added: added, updated: updated, errors: errors });
}

function handleSyncPrisonerWings(body, username, pass) {
  if (!isAuthorized(username, pass) && !hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'Unauthorized' });
  }

  const prisonerSheet = getPrisonerSheet();
  const prisonerData = prisonerSheet.getDataRange().getValues();
  if (prisonerData.length <= 1) {
    return jsonResp({ status: 'error', message: 'ไม่มีข้อมูลผู้ต้องขังในระบบ' });
  }

  const pHeaders = prisonerData[0];
  const pIdIdx = pHeaders.indexOf('prisonerId');
  const pWingIdx = pHeaders.indexOf('wing');
  if (pIdIdx === -1 || pWingIdx === -1) {
    return jsonResp({ status: 'error', message: 'ข้อมูลผู้ต้องขังไม่ครบถ้วน (ขาด prisonerId หรือ wing)' });
  }

  const wingMap = {};
  for (let i = 1; i < prisonerData.length; i++) {
    const id = String(prisonerData[i][pIdIdx] || '').trim();
    const wing = String(prisonerData[i][pWingIdx] || '').trim();
    if (id) wingMap[id] = wing;
  }

  const sheet = getMainSheet();
  const table = readSheetTable(sheet);
  if (table.rows.length === 0) {
    return jsonResp({ status: 'error', message: 'ไม่มีข้อมูลการจองในระบบ' });
  }

  const wingBookingIdx = table.headers.indexOf('wing');
  const pIdBookingIdx = table.headers.indexOf('prisonerId');
  if (pIdBookingIdx === -1 || wingBookingIdx === -1) {
    return jsonResp({ status: 'error', message: 'ข้อมูลการจองไม่ครบถ้วน' });
  }

  const updateRows = [];
  for (let i = 0; i < table.rows.length; i++) {
    const prisonerId = String(table.rows[i][pIdBookingIdx] || '').trim();
    if (!prisonerId || !wingMap[prisonerId]) continue;
    const currentWing = String(table.rows[i][wingBookingIdx] || '').trim();
    if (currentWing !== wingMap[prisonerId]) {
      updateRows.push({ row: i + 2, cols: [[wingBookingIdx, wingMap[prisonerId]]] });
    }
  }

  if (updateRows.length > 0) writeColumnsToRows(sheet, updateRows);

  invalidatePrisonersCache();
  invalidateReservationsCache();
  logEvent(username, 'sync_prisoner_wings', '', { updated: updateRows.length }, 'success');
  return jsonResp({ status: 'ok', message: 'อัปเดตแดนผู้ต้องขังเสร็จสิ้น: ' + updateRows.length + ' รายการ', updated: updateRows.length });
}

function handleGetPrisoners(params) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('prisoners');
  if (cached) return jsonResp({ status: 'ok', prisoners: JSON.parse(cached) });

  const sheet = getPrisonerSheet();
  let data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResp({ status: 'ok', prisoners: [] });

  let headers = data[0];
  const nameIdx = headers.indexOf('prisonerName');
  const idIdx = headers.indexOf('prisonerId');
  const wingIdx = headers.indexOf('wing');
  const statusIdx = headers.indexOf('status');
  const vinaiDateIdx = headers.indexOf('vinaiDate');

  if (nameIdx === -1 || idIdx === -1 || wingIdx === -1) {
    return jsonResp({ status: 'error', message: 'Invalid prisoner sheet headers' });
  }

  if (statusIdx >= 0 && vinaiDateIdx >= 0) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const clears = [];
    for (let i = 1; i < data.length; i++) {
      const sStatus = String(data[i][statusIdx] || '').trim();
      const sVinaiDate = data[i][vinaiDateIdx];
      if (sStatus === 'ติดวินัย งดเยี่ยม' && sVinaiDate) {
        let vdDate = null;
        if (sVinaiDate instanceof Date) {
          vdDate = sVinaiDate;
        } else {
          const parsed = new Date(String(sVinaiDate).trim());
          if (!isNaN(parsed.getTime())) vdDate = parsed;
        }
        if (vdDate && vdDate <= oneYearAgo) {
          clears.push({ row: i + 1, cols: [[statusIdx, ''], [vinaiDateIdx, '']] });
        }
      }
    }
    if (clears.length > 0) {
      writeColumnsToRows(sheet, clears);
      console.log('[AutoCleanup] Cleared discipline for ' + clears.length + ' prisoners');
      invalidatePrisonersCache();
      data = sheet.getDataRange().getValues();
      headers = data[0];
    }
  }

  const prisoners = [];
  const seen = new Set();
  for (let i = 1; i < data.length; i++) {
    const name = String(data[i][nameIdx] || '').trim();
    const id = String(data[i][idIdx] || '').trim();
    const wing = String(data[i][wingIdx] || '').trim();
    if (!name || !id) continue;
    const key = id + '|' + name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      const statusVal = statusIdx >= 0 ? String(data[i][statusIdx] || '').trim() : '';
      const vinaiDateVal = vinaiDateIdx >= 0 ? data[i][vinaiDateIdx] : '';
      prisoners.push({ prisonerName: name, prisonerId: id, wing: wing, status: statusVal, vinaiDate: vinaiDateVal });
    }
  }
  prisoners.sort((a, b) => a.prisonerName.localeCompare(b.prisonerName, 'th'));

  try { cache.put('prisoners', JSON.stringify(prisoners), PUBLIC_CACHE_TTL); } catch (e) { }
  return jsonResp({ status: 'ok', prisoners: prisoners });
}

function cleanupExpiredDiscipline() {
  const sheet = getPrisonerSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const headers = data[0];
  const statusIdx = headers.indexOf('status');
  const vinaiDateIdx = headers.indexOf('vinaiDate');
  if (statusIdx < 0 || vinaiDateIdx < 0) return;

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const clears = [];

  for (let i = 1; i < data.length; i++) {
    const sStatus = String(data[i][statusIdx] || '').trim();
    const sVinaiDate = data[i][vinaiDateIdx];
    if (sStatus === 'ติดวินัย งดเยี่ยม' && sVinaiDate) {
      let vdDate = null;
      if (sVinaiDate instanceof Date) {
        vdDate = sVinaiDate;
      } else {
        const parsed = new Date(String(sVinaiDate).trim());
        if (!isNaN(parsed.getTime())) vdDate = parsed;
      }
      if (vdDate && vdDate <= oneYearAgo) {
        clears.push({ row: i + 1, cols: [[statusIdx, ''], [vinaiDateIdx, '']] });
      }
    }
  }

  if (clears.length > 0) {
    writeColumnsToRows(sheet, clears);
    console.log('[DailyCleanup] Cleared discipline for ' + clears.length + ' prisoners');
    invalidatePrisonersCache();
  }
}

function archiveOldReservations() {
  const mainSheet = getMainSheet();
  const archiveSheet = getArchiveSheet();
  const table = readSheetTable(mainSheet);
  if (table.rows.length === 0) return { status: 'ok', archived: 0 };

  const headers = table.headers;
  const refIdx = headers.indexOf('ref');
  const vdiIdx = headers.indexOf('visitDateISO');
  if (refIdx === -1 || vdiIdx === -1) {
    logEvent('system', 'reservations_archive_failed', '', { reason: 'missing_columns' }, 'error');
    return { status: 'error', message: 'Main sheet is missing required columns' };
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - ARCHIVE_MONTHS);
  const cutoffStr = formatDateISO(cutoff);

  const archiveHeaders = archiveSheet.getLastRow() > 0 ? archiveSheet.getRange(1, 1, 1, archiveSheet.getLastColumn()).getValues()[0] : [];
  const archivedAtIdx = archiveHeaders.indexOf('archivedAt');
  const archiveWidth = Math.max(archiveHeaders.length, headers.length + 1);
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const toArchive = [];
  const remaining = [];
  let archivedCount = 0;

  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    const rawVdi = row[vdiIdx];
    let vdi = '';
    if (rawVdi instanceof Date) vdi = formatDateISO(rawVdi);
    else if (rawVdi) vdi = String(rawVdi).trim();

    if (vdi && /^\d{4}-\d{2}-\d{2}$/.test(vdi) && vdi < cutoffStr) {
      const archRow = new Array(archiveWidth).fill('');
      headers.forEach((h, j) => {
        const aIdx = archiveHeaders.indexOf(h);
        if (aIdx >= 0) archRow[aIdx] = row[j];
      });
      if (archivedAtIdx >= 0) archRow[archivedAtIdx] = nowStr;
      toArchive.push(archRow);
      archivedCount++;
    } else {
      remaining.push(row);
    }
  }

  if (archivedCount === 0) return { status: 'ok', archived: 0 };

  appendRows(archiveSheet, toArchive);

  const oldRowCount = table.rows.length;
  const lastCol = Math.max(headers.length, 1);
  mainSheet.getRange(2, 1, oldRowCount, lastCol).clearContents();

  if (remaining.length > 0) {
    const newData = remaining.map(row => {
      const out = new Array(headers.length).fill('');
      headers.forEach((h, j) => { out[j] = row[j]; });
      return out;
    });
    mainSheet.getRange(2, 1, newData.length, headers.length).setValues(newData);
    const phoneIdx = headers.indexOf('visitorPhone');
    if (phoneIdx >= 0) {
      mainSheet.getRange(2, phoneIdx + 1, newData.length, 1).setNumberFormat('@');
    }
  }

  invalidateReservationsCache();
  logEvent('system', 'reservations_archived', '', { archived: archivedCount, cutoff: cutoffStr }, 'success');
  console.log('[Archive] Archived ' + archivedCount + ' reservations older than ' + cutoffStr);
  return { status: 'ok', archived: archivedCount };
}

function backupSpreadsheet() {
  try {
    const ss = getSpreadsheet();
    const folderName = 'Backup';
    const folderIter = DriveApp.getFoldersByName(folderName);
    const folder = folderIter.hasNext() ? folderIter.next() : DriveApp.createFolder(folderName);

    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmm');
    const name = ss.getName() + '_' + stamp;
    const backup = ss.copy(name);
    const file = DriveApp.getFileById(backup.getId());
    folder.addFile(file);
    const parents = file.getParents();
    while (parents.hasNext()) {
      const p = parents.next();
      if (p.getId() !== folder.getId()) p.removeFile(file);
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - BACKUP_RETENTION_DAYS);
    const files = folder.getFiles();
    let pruned = 0;
    while (files.hasNext()) {
      const f = files.next();
      try {
        const created = f.getDateCreated();
        if (created && created < cutoff) {
          DriveApp.getFileById(f.getId()).setTrashed(true);
          pruned++;
        }
      } catch (e) { }
    }

    logEvent('system', 'spreadsheet_backup', '', { name: name, pruned: pruned }, 'success');
    return { status: 'ok', name: name, pruned: pruned };
  } catch (e) {
    logEvent('system', 'spreadsheet_backup_failed', '', { error: e.toString() }, 'error');
    return { status: 'error', message: e.toString() };
  }
}

function setupDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  const hasHandler = (fn) => triggers.some(t =>
    t.getHandlerFunction() === fn &&
    t.getEventType() === ScriptApp.TriggerSource.CLOCK
  );

  if (!hasHandler('cleanupExpiredDiscipline')) {
    ScriptApp.newTrigger('cleanupExpiredDiscipline')
      .timeBased()
      .everyDays(1)
      .atHour(0)
      .nearMinute(0)
      .inTimezone('Asia/Bangkok')
      .create();
  }

  if (!hasHandler('backupSpreadsheet')) {
    ScriptApp.newTrigger('backupSpreadsheet')
      .timeBased()
      .everyDays(1)
      .atHour(0)
      .nearMinute(5)
      .inTimezone('Asia/Bangkok')
      .create();
  }

  if (!hasHandler('archiveOldReservations')) {
    ScriptApp.newTrigger('archiveOldReservations')
      .timeBased()
      .everyDays(1)
      .atHour(0)
      .nearMinute(15)
      .inTimezone('Asia/Bangkok')
      .create();
  }

  return 'Daily triggers created — cleanup at 00:00, backup at 00:05, archive at 00:15 Bangkok time';
}

function listAllSheets() {
  return getSpreadsheet().getSheets().map(s => ({ name: s.getName(), rows: s.getLastRow(), cols: s.getLastColumn() }));
}

// ══════════════════════════════════════════════════════════════════
// SECTION 7 — ROUTER
// ══════════════════════════════════════════════════════════════════
function handleGetEventLogs(params, username) {
  if (!hasPermission(username, 'view_eventlog')) {
    return jsonResp({ status: 'error', message: 'ไม่มีสิทธิ์ดูบันทึกการทำงาน' });
  }
  return jsonResp({ status: 'ok', logs: getEventLogs(params || {}) });
}

function handleRecheckPrisoner(body, username) {
  const pid = sanitizeStr(body.prisonerId, 64);
  if (!pid) return jsonResp({ status: 'error', message: 'Missing prisonerId' });
  const p = getPrisonerById(pid);
  const restricted = isDisciplineActive(p);
  return jsonResp({
    status: 'ok',
    prisonerId: pid,
    restricted: restricted,
    prisoner: p ? {
      prisonerName: String(p.prisonerName || ''),
      status: String(p.status || ''),
      vinaiDate: p.vinaiDate instanceof Date ? formatDateISO(p.vinaiDate) : String(p.vinaiDate || '')
    } : null
  });
}
const GET_ROUTES = {
  getBackendUrl: { run: () => jsonResp({ url: ScriptApp.getService().getUrl() }) },
  resolveUrl: { run: () => jsonResp({ status: 'ok', url: ScriptApp.getService().getUrl(), resolvedUrl: ScriptApp.getService().getUrl(), message: 'resolveUrl endpoint reached successfully' }) },
  getAll: { auth: true, run: () => getAllReservations_() },
  getAllWithArchive: { auth: true, run: () => getAllReservationsWithArchive_() },
  getCountsByDate: { run: () => getCountsByDate() },
  lookupByRef: { run: (params) => lookupByRef(params) },
  getArchivedReservations: { auth: true, run: (params) => getArchivedReservations(params) },
  getDataVersion: { auth: true, run: () => jsonResp({ status: 'ok', version: getDataVersion() }) },
  getEventLogs: { auth: true, run: (params) => handleGetEventLogs(params, params.username) },
  getPrisoners: { run: (params) => handleGetPrisoners(params) },
  getRoles: { auth: true, run: () => jsonResp({ status: 'ok', roles: getRolesList() }) },
  getUsers: { auth: true, run: () => jsonResp({ status: 'ok', users: getAllUsers().map(u => ({ username: u.username, role: u.role, displayName: u.displayName || u.username, createdAt: u.createdAt })) }) },
  ping: { run: () => jsonResp({ status: 'ok', pong: true, timestamp: new Date().toISOString() }) },
  testConnection: { run: handleTestConnection },
  getSheetInfo: { auth: true, run: handleGetSheetInfo }
};

const POST_ROUTES = {
  ping: { auth: false, run: () => jsonResp({ status: 'ok', pong: true, timestamp: new Date().toISOString() }) },
  login: { auth: false, run: handleLogin },
  changePassword: { auth: false, run: handleChangePassword },
  saveReservation: { auth: false, run: handleSaveReservation },
  dedupeReservations: { auth: true, run: handleDedupeReservations },
  getAll: { auth: true, run: () => getAllReservations_() },
  getAllWithArchive: { auth: true, run: () => getAllReservationsWithArchive_() },
  getCountsByDate: { auth: false, run: () => getCountsByDate() },
  lookupByRef: { auth: false, run: (body) => lookupByRef(body) },
  getArchivedReservations: { auth: true, run: (body) => getArchivedReservations(body) },
  getDataVersion: { auth: true, run: () => jsonResp({ status: 'ok', version: getDataVersion() }) },
  publicCancelBooking: { auth: false, run: handlePublicCancelBooking },
  uploadSlip: { auth: false, run: handleUploadSlip },
  updateSlipAndStatus: { auth: false, run: handleUpdateSlipAndStatus },
  getNotes: { auth: false, run: handleGetNotes },
  cancelBooking: { auth: true, run: handleCancelBooking },
  updateStatus: { auth: true, run: handleUpdateStatus },
  updateVisitorApproval: { auth: true, run: handleUpdateVisitorApproval },
  createUser: { auth: true, run: handleCreateUser },
  createRole: { auth: true, run: handleCreateRole },
  updateUser: { auth: true, run: handleUpdateUser },
  deleteUser: { auth: true, run: handleDeleteUser },
  updateBooking: { auth: true, run: handleUpdateBooking },
  saveSettings: { auth: true, run: handleSaveSettings },
  addNote: { auth: true, run: handleAddNote },
  importPrisoners: { auth: true, run: handleImportPrisoners },
  syncPrisonerWings: { auth: true, run: handleSyncPrisonerWings },
  getUsers: { auth: true, run: () => jsonResp({ status: 'ok', users: getAllUsers().map(u => ({ username: u.username, role: u.role, displayName: u.displayName || u.username, createdAt: u.createdAt })) }) },
  getRoles: { auth: true, run: () => jsonResp({ status: 'ok', roles: getRolesList() }) },
  getEventLogs: { auth: true, run: (body, username) => handleGetEventLogs(body, username) },
  recheckPrisoner: { auth: true, run: handleRecheckPrisoner },
  logClientEvent: {
    auth: true, run: (body, username) => {
      logEvent(username || 'client', body.clientAction || 'client_action', body.targetRef || '', body.details || {}, 'success');
      return jsonResp({ status: 'ok' });
    }
  }
};

function doGetHandler(e) {
  const params = e.parameter || {};
  const action = String(params.action || '');
  const route = GET_ROUTES[action];
  if (!route) return jsonResp({ status: 'error', message: 'Unknown action' });
  if (route.auth && !isAuthorized(params.username || '', params.pass || '')) {
    return jsonResp({ status: 'error', message: 'Unauthorized' });
  }
  return route.run(params);
}

function doPostHandler(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return jsonResp({ status: 'error', message: 'Invalid JSON' }); }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResp({ status: 'error', message: 'Invalid request body' });
  }

  _requestMeta = {
    ip: sanitizeStr(body.ip, 64),
    userAgent: sanitizeStr(body.userAgent, 500)
  };

  const action = body.action || 'saveReservation';
  const username = body.username || body.user || 'public';
  const pass = body.pass || body.password || '';

  const route = POST_ROUTES[action];
  if (!route) return jsonResp({ status: 'error', message: 'Unknown action' });

  if (route.auth && !isAuthorized(username, pass)) {
    logEvent(username || 'unknown', action, body.ref || '', { reason: 'unauthorized' }, 'denied');
    return jsonResp({ status: 'error', message: 'Unauthorized' });
  }

  return route.run(body, username, pass);
}

function handleTestConnection() {
  const result = { status: 'ok', message: 'Connected', timestamp: new Date().toISOString() };
  try {
    const ss = getSpreadsheet();
    result.spreadsheetName = ss.getName();
    result.spreadsheetId = ss.getId();
  } catch (e) {
    result.spreadsheetError = e.toString();
    result.message = 'Connected to script, but spreadsheet unavailable';
  }
  return jsonResp(result);
}

function handleGetSheetInfo() {
  try {
    const ss = getSpreadsheet();
    const sheet = getCachedSheet(SHEET_NAME);
    const headers = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    const sampleData = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    return jsonResp({ status: 'ok', spreadsheetName: ss.getName(), spreadsheetId: ss.getId(), allSheets: listAllSheets(), mainSheet: { name: sheet.getName(), totalRows: sheet.getLastRow(), totalCols: sheet.getLastColumn(), headers: headers, sampleRow: sampleData } });
  } catch (e) {
    return jsonResp({ status: 'error', message: 'Failed to get sheet info: ' + e.toString() });
  }
}

// ══════════════════════════════════════════════════════════════════
// SECTION 8 — ENTRY POINTS
// ══════════════════════════════════════════════════════════════════
function doGet(e) {
  try { return doGetHandler(e); }
  catch (err) { return jsonResp({ status: 'error', message: 'Server error: ' + err.toString() }); }
}

function doPost(e) {
  try { return doPostHandler(e); }
  catch (err) { return jsonResp({ status: 'error', message: 'Server error: ' + err.toString() }); }
}
