const SHEET_NAME = 'การจอง';
const EVENTLOG_SHEET = 'EventLog';
const PRISONER_SHEET = 'ผู้ต้องขัง';
const USERS_SHEET = 'Users';
const NOTES_SHEET = 'Notes';
const SETTINGS_SHEET = 'Settings';

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

const _execCache = { ss: null, sheets: {} };

function getSpreadsheet() {
  if (_execCache.ss) return _execCache.ss;
  // Prefer a stored Spreadsheet ID (set via Script Properties) so the script
  // works even when it is not bound to a spreadsheet. Fall back to the active
  // spreadsheet for bound deployments.
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

function jsonResp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try { return doGetHandler(e); }
  catch (err) { return jsonResp({ status: 'error', message: 'Server error: ' + err.toString() }); }
}

function doPost(e) {
  try { return doPostHandler(e); }
  catch (err) { return jsonResp({ status: 'error', message: 'Server error: ' + err.toString() }); }
}

function doGetHandler(e) {
  const params = e.parameter;
  const action = params.action || '';
  const username = params.username || '';
  const pass = params.pass || '';

  if (action === 'getBackendUrl') {
    return jsonResp({ url: ScriptApp.getService().getUrl() });
  }

  if (action === 'resolveUrl') {
    return jsonResp({ status: 'ok', url: ScriptApp.getService().getUrl(), resolvedUrl: ScriptApp.getService().getUrl(), message: 'resolveUrl endpoint reached successfully' });
  }

  if (action === 'getAll') {
    return getAllReservations_();
  }

  if (action === 'getEventLogs') {
    if (!isAuthorized(username, pass)) return jsonResp({ status: 'error', message: 'Unauthorized' });
    return jsonResp({ status: 'ok', logs: getEventLogs(params) });
  }

  if (action === 'getPrisoners') {
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
      let cleaned = 0;
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
            sheet.getRange(i + 1, statusIdx + 1).clearContent();
            sheet.getRange(i + 1, vinaiDateIdx + 1).clearContent();
            cleaned++;
          }
        }
      }
      if (cleaned > 0) {
        console.log('[AutoCleanup] Cleared discipline for ' + cleaned + ' prisoners');
        try { CacheService.getScriptCache().remove('prisoners'); } catch (e) {}
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

    try { cache.put('prisoners', JSON.stringify(prisoners), PUBLIC_CACHE_TTL); } catch (e) {}
    return jsonResp({ status: 'ok', prisoners: prisoners });
  }

  if (action === 'getRoles') {
    if (!isAuthorized(username, pass)) return jsonResp({ status: 'error', message: 'Unauthorized' });
    return jsonResp({ status: 'ok', roles: getRolesList() });
  }

  if (action === 'getUsers') {
    if (!isAuthorized(username, pass)) return jsonResp({ status: 'error', message: 'Unauthorized' });
    return jsonResp({ status: 'ok', users: getAllUsers().map(u => ({ username: u.username, role: u.role, displayName: u.displayName || u.username, createdAt: u.createdAt })) });
  }

  // Lightweight connectivity check — does NOT touch the spreadsheet, so it
  // always reports whether the script endpoint itself is reachable.
  if (action === 'ping') {
    return jsonResp({ status: 'ok', pong: true, timestamp: new Date().toISOString() });
  }

  if (action === 'testConnection') {
    const result = { status: 'ok', message: 'Connected', timestamp: new Date().toISOString() };
    try {
      const ss = getSpreadsheet();
      result.spreadsheetName = ss.getName();
      result.spreadsheetId = ss.getId();
    } catch (e) {
      // The script endpoint is reachable but the spreadsheet could not be
      // opened (e.g. not bound / missing SPREADSHEET_ID). Report connectivity
      // as OK but flag the sheet problem so the UI can surface a warning.
      result.spreadsheetError = e.toString();
      result.message = 'Connected to script, but spreadsheet unavailable';
    }
    return jsonResp(result);
  }

  if (action === 'getSheetInfo') {
    if (!isAuthorized(username, pass)) return jsonResp({ status: 'error', message: 'Unauthorized' });
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

  return jsonResp({ status: 'error', message: 'Unknown action' });
}

function doPostHandler(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return jsonResp({ status: 'error', message: 'Invalid JSON' }); }

  if (!body || typeof body !== 'object') {
    return jsonResp({ status: 'error', message: 'Invalid request body' });
  }

  const action = body.action || 'saveReservation';
  const username = body.username || body.user || 'public';
  const pass = body.pass || body.password || '';
  const publicActions = ['uploadSlip', 'updateSlipAndStatus', 'publicCancelBooking'];

  if (action === 'ping') {
    return jsonResp({ status: 'ok', pong: true, timestamp: new Date().toISOString() });
  }

  if (action === 'login') {
    return handleLogin(body);
  }

  if (action === 'changePassword') {
    return handleChangePassword(body);
  }

  if (action === 'saveReservation' || !action) {
    return handleSaveReservation(body);
  }

  if (!publicActions.includes(action) && !isAuthorized(username, pass)) {
    logEvent(username || 'unknown', action, body.ref || '', { reason: 'unauthorized' }, 'denied');
    return jsonResp({ status: 'error', message: 'Unauthorized' });
  }

  // Note: getAll for calendar counts is public - no auth needed
  switch (action) {
    case 'getAll': return getAllReservations_();
    case 'cancelBooking': return handleCancelBooking(body, username);
    case 'publicCancelBooking': return handlePublicCancelBooking(body);
    case 'updateStatus': return handleUpdateStatus(body, username);
    case 'updateVisitorApproval': return handleUpdateVisitorApproval(body, username);
    case 'uploadSlip': return handleUploadSlip(body);
    case 'updateSlipAndStatus': return handleUpdateSlipAndStatus(body, username);
    case 'createUser': return handleCreateUser(body);
    case 'createRole': return handleCreateRole(body, username);
    case 'updateUser': return handleUpdateUser(body, username);
    case 'deleteUser': return handleDeleteUser(body, username);
    case 'updateBooking': return handleUpdateBooking(body, username);
    case 'saveSettings': return handleSaveSettings(body, username);
    case 'addNote': return handleAddNote(body, username);
    case 'getNotes': return handleGetNotes(body);
    case 'importPrisoners': return handleImportPrisoners(body, username);
    case 'syncPrisonerWings': return handleSyncPrisonerWings(body, username, pass);
    case 'getUsers': return jsonResp({ status: 'ok', users: getAllUsers().map(u => ({ username: u.username, role: u.role, displayName: u.displayName || u.username, createdAt: u.createdAt })) });
    case 'getRoles': return jsonResp({ status: 'ok', roles: getRolesList() });
    case 'logClientEvent':
      logEvent(username || 'client', body.clientAction || 'client_action', body.targetRef || '', body.details || {}, 'success');
      return jsonResp({ status: 'ok' });
    default:
      return jsonResp({ status: 'error', message: 'Unknown action' });
  }
}

const CACHE_TTL = 60;
const PUBLIC_CACHE_TTL = 120;
const LOGIN_RATE_LIMIT_TTL = 300;
const MAX_LOGIN_ATTEMPTS = 5;
const CACHE_VERSION = 'v2';

function getAllReservations_() {
  const cache = CacheService.getScriptCache();
  const CACHE_KEY = CACHE_VERSION + ':allReservations';

  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResp({ status: 'ok', rows: [] });

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const refIdx = headers.indexOf('ref');
  if (refIdx === -1) {
    return jsonResp({ status: 'error', message: 'Sheet is missing the required "ref" column header — please check sheet structure' });
  }

  // Check cache — store header hash with data so schema changes invalidate cache
  const headersHash = headers.join('||');
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.headersHash === headersHash && Array.isArray(parsed.rows)) {
        return jsonResp({ status: 'ok', rows: parsed.rows });
      }
    } catch (e) {
      cache.remove(CACHE_KEY);
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
  try { cache.put(CACHE_KEY, JSON.stringify({ headersHash: headersHash, rows: reversed }), PUBLIC_CACHE_TTL); } catch (e) {}
  return jsonResp({ status: 'ok', rows: reversed });
}

function formatDateISO(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
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

function handleLogin(body) {
  const username = (body.username || '').toString().trim().toLowerCase();
  if (!checkRateLimit('login_' + username, MAX_LOGIN_ATTEMPTS, LOGIN_RATE_LIMIT_TTL)) {
    return jsonResp({ status: 'error', message: 'การพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 5 นาที' });
  }
  const user = getUserByUsername(body.username);
  if (!user || String(user.password) !== String(body.password)) {
    return jsonResp({ status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
  const cache = CacheService.getScriptCache();
  try { cache.remove('login_' + username); } catch (e) {}
  return jsonResp({ status: 'ok', user: { username: user.username, role: user.role, displayName: user.displayName || user.username } });
}

function handleChangePassword(body) {
  const newPassword = body.newPassword || '';
  const confirmPassword = body.confirmPassword || '';
  if (!newPassword || newPassword.length < 6) return jsonResp({ status: 'error', message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  if (newPassword !== confirmPassword) return jsonResp({ status: 'error', message: 'รหัสผ่านไม่ตรงกัน' });

  const success = updatePassword(body.username, newPassword);
  if (success) {
    logEvent(body.username, 'password_changed', '', { method: 'first_time_login' }, 'success');
    return jsonResp({ status: 'ok', message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าระบบใหม่' });
  }
  return jsonResp({ status: 'error', message: 'ไม่สามารถเปลี่ยนรหัสผ่านได้' });
}

function getMainSheet() {
  const sheet = getCachedSheet(SHEET_NAME);
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const STANDARD_HEADERS = ['ref','timestamp','visitorName','visitorId','visitorPhone','relation',
    'religion','allergy','extraVisitorReligions','extraVisitorAllergies',
    'extraVisitorNames','visitorApproved','extraVisitorApproved',
    'prisonerName','prisonerId','wing','visitDate','visitDateISO',
    'visitorCount','totalPersons','total','adultCount','child5to8Count','childUnder5Count','status','slipImage','cancelReason'];

  // If sheet is empty, write headers and set up formatting
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(STANDARD_HEADERS);
    const range = sheet.getRange(1, 1, 1, STANDARD_HEADERS.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    const slipCol = STANDARD_HEADERS.indexOf('slipImage') + 1;
    if (slipCol > 0) sheet.hideColumns(slipCol);
    return;
  }

  // Sheet has data — check for missing standard columns and add them
  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existingSet = {};
  existingHeaders.forEach((h, i) => { existingSet[h] = i; });

  let nextCol = sheet.getLastColumn() + 1;
  let addedAny = false;
  STANDARD_HEADERS.forEach(h => {
    if (existingSet[h] === undefined) {
      sheet.getRange(1, nextCol).setValue(h);
      const range = sheet.getRange(1, nextCol);
      range.setFontWeight('bold');
      range.setBackground('#185FA5');
      range.setFontColor('#ffffff');
      if (h === 'slipImage') sheet.hideColumns(nextCol);
      existingSet[h] = nextCol - 1;
      nextCol++;
      addedAny = true;
    }
  });

  if (addedAny) {
    sheet.setFrozenRows(1);
  }
}

function handleSaveReservation(body) {
   const sheet = getMainSheet();
   const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
   const newRow = headers.map(h => body[h] !== undefined ? body[h] : '');
   const rowNum = sheet.getLastRow() + 1;
   sheet.getRange(rowNum, 1, 1, headers.length).setValues([newRow]);

   const phoneIdx = headers.indexOf('visitorPhone');
   if (phoneIdx >= 0) {
     sheet.getRange(rowNum, phoneIdx + 1).setNumberFormat('@');
   }

   invalidateReservationsCache();
   logEvent('public', 'booking_submitted', body.ref || '', { visitorName: body.visitorName, prisonerName: body.prisonerName, visitDate: body.visitDate }, 'success');
   return jsonResp({ status: 'ok', ref: body.ref });
 }

function handleCancelBooking(body, username) {
  const sheet = getMainSheet();
  const data = sheet.getDataRange().getValues();
  const refIdx = data[0].indexOf('ref');
  const statusIdx = data[0].indexOf('status');
  const cancelReasonIdx = data[0].indexOf('cancelReason');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][refIdx]).trim() === String(body.ref).trim()) {
      sheet.getRange(i + 1, statusIdx + 1).setValue('ยกเลิก');
      if (body.reason && cancelReasonIdx >= 0) {
        sheet.getRange(i + 1, cancelReasonIdx + 1).setValue(body.reason);
      }
      logEvent(username, 'booking_cancelled', body.ref, { previousStatus: data[i][statusIdx] }, 'success');
      invalidateReservationsCache();
      return jsonResp({ status: 'ok' });
    }
  }
  return jsonResp({ status: 'error', message: 'Ref not found' });
}

function handlePublicCancelBooking(body) {
  const sheet = getMainSheet();
  const data = sheet.getDataRange().getValues();
  const refIdx = data[0].indexOf('ref');
  const statusIdx = data[0].indexOf('status');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][refIdx]).trim() === String(body.ref).trim()) {
      sheet.getRange(i + 1, statusIdx + 1).setValue('ยกเลิก');
      logEvent('public', 'booking_cancelled', body.ref, { previousStatus: data[i][statusIdx] }, 'success');
      invalidateReservationsCache();
      return jsonResp({ status: 'ok' });
    }
  }
  return jsonResp({ status: 'error', message: 'Ref not found' });
}

function handleUpdateStatus(body, username) {
  if (!body.ref || !body.status) return jsonResp({ status: 'error', message: 'Missing ref or status' });

  const validStatuses = ['รอตรวจสอบผู้เข้าร่วม', 'รอตรวจสอบวินัย', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น', 'ไม่อนุมัติ', 'ยกเลิก'];
  if (!validStatuses.includes(body.status)) return jsonResp({ status: 'error', message: 'Invalid status: ' + body.status });

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
    'Vinai': ['รอชำระเงิน', 'ไม่อนุมัติ'],
    'Finance': ['ชำระแล้ว', 'เสร็จสิ้น', 'ไม่อนุมัติ']
  };

  const caller = getUserByUsername(username);
  const callerRole = caller ? caller.role : null;
  const roleAllowed = roleAllowedStatuses[callerRole];

  if (roleAllowed !== null && roleAllowed !== undefined && !roleAllowed.includes(body.status)) {
    logEvent(username, 'status_change_rejected', body.ref, { newStatus: body.status, reason: 'role_not_allowed', role: callerRole }, 'denied');
    return jsonResp({ status: 'error', message: 'Role "' + callerRole + '" is not allowed to set status "' + body.status + '"' });
  }

  const sheet = getMainSheet();
  const data = sheet.getDataRange().getValues();
  const refIdx = data[0].indexOf('ref');
  const statusIdx = data[0].indexOf('status');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][refIdx]).trim() === String(body.ref).trim()) {
      const oldStatus = String(data[i][statusIdx] || '').trim();

      const allowed = allowedTransitions[oldStatus];
      if (allowed && !allowed.includes(body.status)) {
        logEvent(username, 'status_change_rejected', body.ref, { oldStatus, newStatus: body.status, reason: 'invalid_transition' }, 'denied');
        return jsonResp({ status: 'error', message: 'Cannot change from "' + oldStatus + '" to "' + body.status + '"' });
      }

      sheet.getRange(i + 1, statusIdx + 1).setValue(body.status);
      if (body.reason && (body.status === 'ไม่อนุมัติ' || body.status === 'ยกเลิก')) {
        const cancelReasonIdx = data[0].indexOf('cancelReason');
        if (cancelReasonIdx >= 0) {
          sheet.getRange(i + 1, cancelReasonIdx + 1).setValue(body.reason);
        }
      }
      logEvent(username, 'status_changed', body.ref, { oldStatus, newStatus: body.status }, 'success');
      invalidateReservationsCache();
      return jsonResp({ status: 'ok' });
    }
  }
  return jsonResp({ status: 'error', message: 'Ref not found' });
}

function handleUpdateVisitorApproval(body, username) {
  if (!body.ref) return jsonResp({ status: 'error', message: 'Missing ref' });

  const sheet = getMainSheet();
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  const refIdx = headers.indexOf('ref');

  let vaIdx = headers.indexOf('visitorApproved');
  let evaIdx = headers.indexOf('extraVisitorApproved');
  if (vaIdx === -1 || evaIdx === -1) {
    let nextCol = headers.length + 1;
    if (vaIdx === -1) { sheet.getRange(1, nextCol).setValue('visitorApproved'); vaIdx = nextCol - 1; nextCol++; }
    if (evaIdx === -1) { sheet.getRange(1, nextCol).setValue('extraVisitorApproved'); evaIdx = nextCol - 1; }
    data = sheet.getDataRange().getValues();
    headers = data[0];
    vaIdx = headers.indexOf('visitorApproved');
    evaIdx = headers.indexOf('extraVisitorApproved');
  }

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][refIdx]).trim() === String(body.ref).trim()) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex === -1) return jsonResp({ status: 'error', message: 'Ref not found' });

  const row = rowIndex + 1;
  if (body.visitorApproved !== undefined) sheet.getRange(row, vaIdx + 1).setValue(body.visitorApproved);
  if (body.extraVisitorApproved !== undefined) sheet.getRange(row, evaIdx + 1).setValue(body.extraVisitorApproved);

  const mainApproved = (body.visitorApproved || '').toString().trim().toLowerCase() === 'yes' ? 1 : 0;
  let correctTotal = 2000;
  let extraYesCount = 0;

  if (body.extraVisitorApproved) {
    const allApprovals = String(body.extraVisitorApproved).split(';;');
    extraYesCount = allApprovals.filter(v => (v || '').trim().toLowerCase() === 'yes').length;
    const evnIdx = headers.indexOf('extraVisitorNames');
    if (evnIdx > -1 && data[rowIndex][evnIdx]) {
      const raw = String(data[rowIndex][evnIdx]);
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
  if (vcIdx > -1) sheet.getRange(row, vcIdx + 1).setValue(correctVisitorCount);
  if (tIdx > -1) sheet.getRange(row, tIdx + 1).setValue(correctTotal);

  logEvent(username, 'visitor_approval_updated', body.ref, { visitorApproved: body.visitorApproved, extraVisitorApproved: body.extraVisitorApproved, visitorCount: correctVisitorCount, total: correctTotal }, 'success');
  invalidateReservationsCache();
  return jsonResp({ status: 'ok', visitorCount: correctVisitorCount, total: correctTotal });
}

function handleUploadSlip(body) {
  if (!body.base64Data) return jsonResp({ status: 'error', message: 'Missing base64Data' });
  if (!body.ref) return jsonResp({ status: 'error', message: 'Missing ref' });
  try {
    const url = saveSlipToDrive(body.ref, body.base64Data, body.mimeType || '', body.fileName || '');
    logEvent(body.username || 'public', 'slip_uploaded', body.ref, {}, 'success');
    return jsonResp({ status: 'ok', url: url });
  } catch (e) {
    logEvent(body.username || 'public', 'slip_upload_failed', body.ref, { error: e.toString() }, 'error');
    return jsonResp({ status: 'error', message: e.toString() });
  }
}

function handleUpdateSlipAndStatus(body, username) {
  const sheet = getMainSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const refIdx = headers.indexOf('ref');
  const statusIdx = headers.indexOf('status');
  const slipIdx = headers.indexOf('slipImage');
  for (let i = 1; i < data.length; i++) {
    if (data[i][refIdx] === body.ref) {
      sheet.getRange(i + 1, statusIdx + 1).setValue(body.status || 'ชำระแล้ว');
      if (slipIdx >= 0 && body.slipImage) {
        let slipVal = body.slipImage;
        if (slipVal.startsWith('data:image')) {
          try { slipVal = saveSlipToDrive(body.ref, slipVal); } catch (e) { slipVal = 'SLIP_UPLOADED:' + new Date().toISOString(); }
        }
        sheet.getRange(i + 1, slipIdx + 1).setValue(slipVal);
      }
      logEvent(username, 'slip_and_status_updated', body.ref, { status: body.status }, 'success');
      invalidateReservationsCache();
      return jsonResp({ status: 'ok' });
    }
  }
  return jsonResp({ status: 'error', message: 'Ref not found' });
}

function getUsersSheet() {
  const sheet = getCachedSheet(USERS_SHEET);
  ensureUserHeadersAndUsers(sheet);
  return sheet;
}

function ensureUserHeadersAndUsers(sheet) {
  const headers = ['username', 'password', 'role', 'displayName', 'createdAt'];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
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
  const now = new Date().toISOString();
  const defaultUsers = [
    ['superadmin', 'SuperAdmin@10900', 'Superadmin', 'ผู้ดูแลระบบ', now],
    ['finance', 'Finance@10900', 'Finance', 'การเงิน', now],
    ['vinai', 'Vinai@10900', 'Vinai', 'ตรวจสอบวินัย', now],
    ['cida', 'Cida@10900', 'Tadtel', 'ฝ่ายทัณฑ์', now],
    ['vinai001', 'Vinai@123', 'Vinai', 'พี่เหน่ง', now],
    ['vinai002', 'Vinai@123', 'Vinai', 'พี่แมน', now],
    ['admin', 'Admin@123', 'Admin', 'นายเสกสรรค์ ประจำสุข', now],
    ['cida001', 'Cida@123', 'Tadtel', 'พี่ก่ำ', now],
    ['cida002', 'Cida@123', 'Admin', 'พี่ฟ้า', now]
  ];
  sheet.getRange(2, 1, defaultUsers.length, headers.length).setValues(defaultUsers);
}

function getUserByUsername(username) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'user_' + username.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;
  const headers = data[0];
  const usernameIdx = headers.indexOf('username');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][usernameIdx]).toLowerCase() === String(username).toLowerCase()) {
      const user = {};
      headers.forEach((h, idx) => user[h] = data[i][idx]);
      try { cache.put(cacheKey, JSON.stringify(user), 300); } catch (e) {}
      return user;
    }
  }
  return null;
}

function getAllUsers() {
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function getRolesSheet() {
  const sheet = getCachedSheet('Roles');
  ensureRolesHeaders(sheet);
  return sheet;
}

function ensureRolesHeaders(sheet) {
  const headers = ['roleName', ...AVAILABLE_PERMISSIONS];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    const rows = Object.keys(PERMISSIONS).map(roleName => {
      const rowValues = [roleName];
      AVAILABLE_PERMISSIONS.forEach(perm => {
        rowValues.push(PERMISSIONS[roleName].includes(perm) ? true : false);
      });
      return rowValues;
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function getRolesList() {
  const rolesSheet = getRolesSheet();
  const data = rolesSheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rolesList = [];
  for (let i = 1; i < data.length; i++) {
    const permissions = [];
    for (let j = 1; j < headers.length; j++) {
      if (data[i][j] === true) permissions.push(headers[j]);
    }
    rolesList.push({ roleName: data[i][0], permissions: permissions });
  }
  return rolesList;
}

function hasPermission(username, perm) {
  const user = getUserByUsername(username);
  return !!(user && PERMISSIONS[user.role] && PERMISSIONS[user.role].includes(perm));
}

function isAuthorized(username, pass) {
  const user = getUserByUsername(username);
  return !!(user && String(user.password) === String(pass));
}

function logEvent(username, action, targetRef, details, result) {
  try {
    const sheet = getEventLogSheet();
    const ts = new Date();
    const detailsStr = (details && typeof details === 'object') ? JSON.stringify(details) : (details || '');
    sheet.appendRow([
      Utilities.formatDate(ts, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      username || 'system', action, targetRef || '', detailsStr, result || 'success', '', ''
    ]);
  } catch (e) {
    Logger.log('logEvent failed: ' + e.toString());
  }
}

function getEventLogs(params) {
  const sheet = getEventLogSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  let rows = data.slice(1).map(r => { const obj = {}; headers.forEach((h, i) => obj[h] = r[i]); return obj; }).reverse();

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

function getEventLogSheet() {
  const sheet = getCachedSheet(EVENTLOG_SHEET);
  if (sheet.getLastRow() === 0) {
    const headers = ['timestamp', 'username', 'action', 'targetRef', 'details', 'result', 'ip', 'userAgent'];
    sheet.appendRow(headers);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function invalidateUserCache(username) {
  try { CacheService.getScriptCache().remove('user_' + username.toLowerCase()); } catch (e) {}
}

function invalidateReservationsCache() {
  try {
    const cache = CacheService.getScriptCache();
    // Remove all possible cache variants so stale data never persists
    cache.remove(CACHE_VERSION + ':allReservations');
  } catch (e) {
    Logger.log('invalidateReservationsCache failed: ' + e.toString());
  }
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

function getPrisonerSheet() {
  const sheet = getCachedSheet(PRISONER_SHEET);
  if (sheet.getLastRow() === 0) {
    const headers = ['prisonerId', 'prisonerName', 'wing', 'status', 'vinaiDate', 'note'];
    sheet.appendRow(headers);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function handleCreateUser(body) {
  const adminUser = body.adminUser || body.username;
  if (adminUser.toLowerCase() !== 'superadmin' && !hasPermission(adminUser, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'เฉพาะผู้ดูแลสูงสุดเท่านั้นที่สามารถสร้างผู้ใช้ได้' });
  }

  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usernameIdx = headers.indexOf('username');

  const newUsername = body.username?.trim();
  const newPassword = body.password?.trim();
  const newRole = body.role?.trim();
  const newDisplayName = body.displayName?.trim() || newUsername;

  if (!newUsername || !newPassword || !newRole) {
    return jsonResp({ status: 'error', message: 'กรุณากรอกข้อมูลให้ครบ (username, password, role)' });
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][usernameIdx]).toLowerCase() === newUsername.toLowerCase()) {
      return jsonResp({ status: 'error', message: 'ชื่อผู้ใช้นั้นมีอยู่แล้ว' });
    }
  }

  sheet.appendRow([newUsername, newPassword, newRole, newDisplayName, new Date().toISOString()]);
  invalidateUserCache(adminUser);
  logEvent(adminUser, 'create_user', newUsername, { role: newRole }, 'success');
  return jsonResp({ status: 'ok', message: 'ผู้ใช้ถูกสร้างสำเร็จ', user: { username: newUsername, role: newRole } });
}

function handleCreateRole(body, username) {
  if (!hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'เฉพาะผู้ดูแลสูงสุดเท่านั้นที่สามารถสร้างบทบาทใหม่ได้' });
  }

  const roleName = body.roleName?.trim();
  const permissionsInput = body.permissions;

  if (!roleName) return jsonResp({ status: 'error', message: 'กรุณากรอกชื่อบทบาท' });
  if (!Array.isArray(permissionsInput) || permissionsInput.length === 0) {
    return jsonResp({ status: 'error', message: 'กรุณาเลือกอย่างน้อยหนึ่งสิทธิ์สำหรับบทบาท' });
  }

  const invalidPermissions = permissionsInput.filter(p => !AVAILABLE_PERMISSIONS.includes(p));
  if (invalidPermissions.length > 0) {
    return jsonResp({ status: 'error', message: 'สิทธิ์ต่อไปนี้ไม่ถูกต้อง: ' + invalidPermissions.join(', ') });
  }

  const rolesSheet = getRolesSheet();
  const rolesData = rolesSheet.getDataRange().getValues();
  const roleNameIdx = rolesData[0].indexOf('roleName');
  for (let i = 1; i < rolesData.length; i++) {
    if (String(rolesData[i][roleNameIdx]).toLowerCase() === roleName.toLowerCase()) {
      return jsonResp({ status: 'error', message: 'ชื่อบทบาทนี้มีอยู่แล้วในระบบ' });
    }
  }

  const rowValues = [roleName];
  AVAILABLE_PERMISSIONS.forEach(perm => rowValues.push(permissionsInput.includes(perm) ? true : false));
  rolesSheet.appendRow(rowValues);
  logEvent(username, 'create_role', roleName, { permissions: permissionsInput }, 'success');
  return jsonResp({ status: 'ok', message: 'สร้างบทบาทสำเร็จ', role: { roleName, permissions: permissionsInput } });
}

function updatePassword(username, newPassword) {
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usernameIdx = headers.indexOf('username');
  const passwordIdx = headers.indexOf('password');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][usernameIdx]).toLowerCase() === String(username).toLowerCase()) {
      sheet.getRange(i + 1, passwordIdx + 1).setValue(newPassword);
      return true;
    }
  }
  return false;
}

function handleUpdateUser(body, username) {
  if (!hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'เฉพาะผู้ดูแลสูงสุดเท่านั้นที่สามารถแก้ไขผู้ใช้ได้' });
  }

  const targetUser = body.targetUser;
  if (!targetUser) return jsonResp({ status: 'error', message: 'กรุณาระบุผู้ใช้ที่ต้องการแก้ไข' });

  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usernameIdx = headers.indexOf('username');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][usernameIdx]).toLowerCase() === String(targetUser).toLowerCase()) {
      const row = i + 1;
      if (body.role !== undefined) sheet.getRange(row, headers.indexOf('role') + 1).setValue(body.role);
      if (body.displayName !== undefined) sheet.getRange(row, headers.indexOf('displayName') + 1).setValue(body.displayName);
      if (body.newPassword) sheet.getRange(row, headers.indexOf('password') + 1).setValue(body.newPassword);
      invalidateUserCache(targetUser);
      logEvent(username, 'update_user', targetUser, { role: body.role, displayName: body.displayName }, 'success');
      return jsonResp({ status: 'ok', message: 'อัปเดตผู้ใช้สำเร็จ' });
    }
  }
  return jsonResp({ status: 'error', message: 'ไม่พบผู้ใช้ที่ระบุ' });
}

function handleDeleteUser(body, username) {
  if (!hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'เฉพาะผู้ดูแลสูงสุดเท่านั้นที่สามารถลบผู้ใช้ได้' });
  }

  const targetUser = body.targetUser;
  if (!targetUser) return jsonResp({ status: 'error', message: 'กรุณาระบุผู้ใช้ที่ต้องการลบ' });
  if (String(targetUser).toLowerCase() === String(username).toLowerCase()) {
    return jsonResp({ status: 'error', message: 'ไม่สามารถลบตัวเองได้' });
  }

  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usernameIdx = headers.indexOf('username');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][usernameIdx]).toLowerCase() === String(targetUser).toLowerCase()) {
      sheet.deleteRow(i + 1);
      invalidateUserCache(targetUser);
      logEvent(username, 'delete_user', targetUser, {}, 'success');
      return jsonResp({ status: 'ok', message: 'ลบผู้ใช้สำเร็จ' });
    }
  }
  return jsonResp({ status: 'error', message: 'ไม่พบผู้ใช้ที่ระบุ' });
}

function handleUpdateBooking(body, username) {
  if (!hasPermission(username, 'approve') && !hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'ไม่มีสิทธิ์แก้ไขการจอง' });
  }
  if (!body.ref) return jsonResp({ status: 'error', message: 'กรุณาระบุเลขอ้างอิง' });

  const sheet = getMainSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const refIdx = headers.indexOf('ref');
  const updatableFields = ['visitorName', 'visitorPhone', 'visitorId', 'relation', 'religion', 'allergy',
    'prisonerName', 'prisonerId', 'wing', 'visitDate', 'visitDateISO',
    'visitorCount', 'total', 'status',
    'extraVisitorNames', 'extraVisitorReligions', 'extraVisitorAllergies', 'extraVisitorApproved'
  ];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][refIdx]).trim() === String(body.ref).trim()) {
      const row = i + 1;
      const changes = {};
      updatableFields.forEach(field => {
        if (body[field] !== undefined) {
          const colIdx = headers.indexOf(field);
          if (colIdx >= 0) {
            const range = sheet.getRange(row, colIdx + 1);
            if (field === 'visitorPhone') range.setNumberFormat('@');
            range.setValue(body[field]);
            changes[field] = body[field];
          }
        }
      });
      logEvent(username, 'update_booking', body.ref, changes, 'success');
      invalidateReservationsCache();
      return jsonResp({ status: 'ok', message: 'แก้ไขการจองสำเร็จ' });
    }
  }
  return jsonResp({ status: 'error', message: 'ไม่พบการจองที่ระบุ' });
}

function handleSaveSettings(body, username) {
  if (!hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'ไม่มีสิทธิ์บันทึกตั้งค่า' });
  }

  const scriptProps = PropertiesService.getScriptProperties();
  const settings = body.settings || {};
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

  const sheet = getCachedSheet(NOTES_SHEET);
  if (sheet.getLastRow() === 0) {
    const headers = ['ref', 'text', 'user', 'timestamp', 'createdAt'];
    sheet.appendRow(headers);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#185FA5');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([body.ref, body.note.text || '', body.note.user || username, body.note.timestamp || new Date().toLocaleString('th-TH'), new Date().toISOString()]);
  logEvent(username, 'add_note', body.ref, { text: body.note.text }, 'success');
  return jsonResp({ status: 'ok', message: 'เพิ่มหมายเหตุสำเร็จ' });
}

function handleGetNotes(body) {
  const ref = body.ref;
  if (!ref) return jsonResp({ status: 'error', message: 'Missing ref' });

  const sheet = getCachedSheet(NOTES_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResp({ status: 'ok', notes: [] });

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const refIdx = headers.indexOf('ref');
  if (refIdx === -1) return jsonResp({ status: 'error', message: 'Notes sheet missing ref column' });

  const notes = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][refIdx]).trim() === String(ref).trim()) {
      const note = {};
      headers.forEach((h, j) => { note[h] = data[i][j]; });
      notes.push(note);
    }
  }

  return jsonResp({ status: 'ok', notes: notes });
}

function handleImportPrisoners(body, username) {
  if (!hasPermission(username, 'manage_users')) {
    return jsonResp({ status: 'error', message: 'ไม่มีสิทธิ์นำเข้าข้อมูลผู้ต้องขัง' });
  }

  const prisoners = body.prisoners;
  if (!Array.isArray(prisoners) || prisoners.length === 0) {
    return jsonResp({ status: 'error', message: 'กรุณาส่งข้อมูลผู้ต้องขังอย่างน้อย 1 รายการ' });
  }

  const sheet = getPrisonerSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('prisonerId');
  const nameIdx = headers.indexOf('prisonerName');
  const wingIdx = headers.indexOf('wing');
  const statusIdx = headers.indexOf('status');
  const vinaiDateIdx = headers.indexOf('vinaiDate');
  const noteIdx = headers.indexOf('note');

  let added = 0, updated = 0, errors = [];
  const updates = [];

  prisoners.forEach((p, i) => {
    const prisonerId = String(p.prisonerId || '').trim();
    const name = String(p.prisonerName || '').trim();
    if (!prisonerId || !name) {
      errors.push(`แถวที่ ${i + 1}: ขาดเลขผู้ต้องขังหรือชื่อ`);
      return;
    }

    let foundRow = -1;
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][idIdx]).trim() === prisonerId) {
        foundRow = r;
        break;
      }
    }

    if (foundRow >= 0) {
      const rowNum = foundRow + 1;
      updates.push({ row: rowNum, name: name, wing: String(p.wing || '').trim(), status: String(p.status || '').trim(), vinaiDate: String(p.vinaiDate || '').trim(), note: String(p.note || '').trim(), isNew: false });
      updated++;
    } else {
      updates.push({ row: null, id: prisonerId, name: name, wing: String(p.wing || '').trim(), status: String(p.status || '').trim(), vinaiDate: String(p.vinaiDate || '').trim(), note: String(p.note || '').trim(), isNew: true });
      added++;
    }
  });

  updates.forEach(u => {
    if (u.isNew) {
      const newRow = new Array(headers.length).fill('');
      if (idIdx >= 0) newRow[idIdx] = u.id;
      if (nameIdx >= 0) newRow[nameIdx] = u.name;
      if (wingIdx >= 0) newRow[wingIdx] = u.wing;
      if (statusIdx >= 0) newRow[statusIdx] = u.status;
      if (vinaiDateIdx >= 0) newRow[vinaiDateIdx] = u.vinaiDate;
      if (noteIdx >= 0) newRow[noteIdx] = u.note;
      sheet.appendRow(newRow);
    } else {
      if (nameIdx >= 0) sheet.getRange(u.row, nameIdx + 1).setValue(u.name);
      if (wingIdx >= 0) sheet.getRange(u.row, wingIdx + 1).setValue(u.wing);
      if (statusIdx >= 0) sheet.getRange(u.row, statusIdx + 1).setValue(u.status);
      if (vinaiDateIdx >= 0) sheet.getRange(u.row, vinaiDateIdx + 1).setValue(u.vinaiDate);
      if (noteIdx >= 0) sheet.getRange(u.row, noteIdx + 1).setValue(u.note);
    }
  });

  try { CacheService.getScriptCache().remove('prisoners'); } catch (e) {}
  logEvent(username, 'import_prisoners', '', { added, updated, errors: errors.length }, 'success');
  return jsonResp({ status: 'ok', message: `นำเข้าสำเร็จ: เพิ่ม ${added} รายการ, อัปเดต ${updated} รายการ`, added, updated, errors });
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
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return jsonResp({ status: 'error', message: 'ไม่มีข้อมูลการจองในระบบ' });
  }

  const headers = data[0];
  const pIdBookingIdx = headers.indexOf('prisonerId');
  const wingBookingIdx = headers.indexOf('wing');
  if (pIdBookingIdx === -1 || wingBookingIdx === -1) {
    return jsonResp({ status: 'error', message: 'ข้อมูลการจองไม่ครบถ้วน' });
  }

  const updates = [];
  for (let i = 1; i < data.length; i++) {
    const prisonerId = String(data[i][pIdBookingIdx] || '').trim();
    if (!prisonerId || !wingMap[prisonerId]) continue;
    const currentWing = String(data[i][wingBookingIdx] || '').trim();
    if (currentWing !== wingMap[prisonerId]) {
      updates.push({ row: i + 1, wing: wingMap[prisonerId] });
    }
  }

  if (updates.length > 0) {
    const batchValues = updates.map(u => [u.wing]);
    const batchRanges = updates.map(u => sheet.getRange(u.row, wingBookingIdx + 1));
    batchRanges.forEach((r, i) => r.setValue(batchValues[i][0]));
  }

  try { CacheService.getScriptCache().remove('prisoners'); } catch (e) {}
  logEvent(username, 'sync_prisoner_wings', '', { updated: updates.length }, 'success');
  return jsonResp({ status: 'ok', message: 'อัปเดตแดนผู้ต้องขังเสร็จสิ้น: ' + updates.length + ' รายการ', updated: updates.length });
}

function listAllSheets() {
  return getSpreadsheet().getSheets().map(s => ({ name: s.getName(), rows: s.getLastRow(), cols: s.getLastColumn() }));
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
  let cleaned = 0;

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
        sheet.getRange(i + 1, statusIdx + 1).clearContent();
        sheet.getRange(i + 1, vinaiDateIdx + 1).clearContent();
        cleaned++;
      }
    }
  }

  if (cleaned > 0) {
    console.log('[DailyCleanup] Cleared discipline for ' + cleaned + ' prisoners');
    try { CacheService.getScriptCache().remove('prisoners'); } catch (e) {}
  }
}

function setupDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  const existing = triggers.find(t =>
    t.getHandlerFunction() === 'cleanupExpiredDiscipline' &&
    t.getEventType() === ScriptApp.TriggerSource.CLOCK
  );
  if (existing) {
    return 'Daily cleanup trigger already exists (ID: ' + existing.getUniqueId() + ')';
  }

  ScriptApp.newTrigger('cleanupExpiredDiscipline')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .nearMinute(0)
    .inTimezone('Asia/Bangkok')
    .create();

  return 'Daily cleanup trigger created — runs at midnight Bangkok time';
}