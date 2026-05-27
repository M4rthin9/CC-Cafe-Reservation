const SHEET_NAME = 'การจอง';
const USERS_SHEET = 'Users';
const EVENTLOG_SHEET = 'EventLog';
const PRISONER_SHEET = 'ผู้ต้องขัง';  // Database ผู้ต้องขัง (Prisoner Master Data)

// ===== CONNECTION TEST / HEALTH CHECK =====
// List all sheets in the spreadsheet for debugging
function listAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  return sheets.map(s => ({ name: s.getName(), rows: s.getLastRow(), cols: s.getLastColumn() }));
}

// Legacy fallback password (for transition / public pages). Remove in production after full migration.
const LEGACY_STAFF_PASS = '10900';

// ===== Default seed users (created on first run if Users sheet empty) =====
const DEFAULT_USERS = [
  { username: 'superadmin', password: 'super123', department: 'ผู้บริหาร', role: 'superadmin', permissions: JSON.stringify(['view_all','approve_reject','update_visitor','mark_paid','cancel_booking','view_reports','export_data','view_eventlog','manage_users']), active: true },
  { username: 'manager01', password: 'mgr123', department: 'ทะเบียน', role: 'manager', permissions: JSON.stringify(['view_all','approve_reject','update_visitor','cancel_booking','view_reports','view_eventlog']), active: true },
  { username: 'finance01', password: 'fin123', department: 'การเงิน', role: 'finance', permissions: JSON.stringify(['view_all','mark_paid','view_reports','view_eventlog']), active: true },
  { username: 'security01', password: 'sec123', department: 'รักษาความปลอดภัย', role: 'security', permissions: JSON.stringify(['view_all','approve_reject','update_visitor','view_eventlog']), active: true },
  { username: 'viewer01', password: 'view123', department: 'ทั่วไป', role: 'viewer', permissions: JSON.stringify(['view_all','view_reports','view_eventlog']), active: true }
];

// ===== GET =====
function doGet(e) {
  const params = e.parameter;
  const action = params.action || '';
  const pass   = params.pass  || '';
  const username = params.username || '';

  // Legacy support for old getAll calls
  if (action === 'getAll') {
    const isPublicAccess = !username && !pass || username === 'public';
    if (!isPublicAccess && !isAuthorized(username, pass)) {
      return jsonResp({ status: 'error', message: 'Unauthorized' });
    }
    const sheet = getMainSheet();
    const data  = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResp({ status: 'ok', rows: [] });

    const headers = data[0];
    const refIdx  = headers.indexOf('ref');
    const rows = data.slice(1)
      .filter(row => row[refIdx] && String(row[refIdx]).trim() !== '')
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          let val = row[i];
          if (val instanceof Date) {
            if (h === 'visitDateISO') {
              const y = val.getFullYear();
              const m = String(val.getMonth() + 1).padStart(2, '0');
              const d = String(val.getDate()).padStart(2, '0');
              val = y + '-' + m + '-' + d;
            } else {
              val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
            }
          }
          obj[h] = val;
        });
        return obj;
      });
    return jsonResp({ status: 'ok', rows: rows.reverse() });
  }

  // New: get event logs (can be called with username)
  if (action === 'getEventLogs') {
    if (!isAuthorized(username, pass)) {
      return jsonResp({ status: 'error', message: 'Unauthorized' });
    }
    const logs = getEventLogs(params);
    return jsonResp({ status: 'ok', logs: logs });
  }

  // Get users (for user management UI)
  if (action === 'getUsers') {
    if (!isAuthorized(username, pass)) {
      return jsonResp({ status: 'error', message: 'Unauthorized' });
    }
    const users = getAllUsersSafe();
    return jsonResp({ status: 'ok', users: users });
  }

  // ===== Prisoner master data for booking autocomplete (public) =====
  if (action === 'getPrisoners') {
    // Public endpoint - MUST read from Prisoner Database sheet (ไม่ใช่ sheet การจอง)
    const sheet = getPrisonerSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResp({ status: 'ok', prisoners: [] });

    const headers = data[0];
    const nameIdx = headers.indexOf('prisonerName');
    const idIdx   = headers.indexOf('prisonerId');
    const wingIdx = headers.indexOf('wing');

    const prisoners = [];
    const seen = new Set();

    for (let i = 1; i < data.length; i++) {
      const name = String(data[i][nameIdx] || '').trim();
      const id   = String(data[i][idIdx] || '').trim();
      const wing = String(data[i][wingIdx] || '').trim();

      if (!name || !id) continue;

      const key = id + '|' + name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      prisoners.push({
        prisonerName: name,
        prisonerId: id,
        wing: wing
      });
    }

    // Sort by name (Thai friendly)
    prisoners.sort((a, b) => a.prisonerName.localeCompare(b.prisonerName, 'th'));

    return jsonResp({ status: 'ok', prisoners: prisoners });
  }

  // ===== NEW: Connection test / health check endpoint =====
  if (action === 'testConnection') {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const allSheets = listAllSheets();
      const mainSheet = getMainSheet();
      const mainSheetInfo = {
        name: mainSheet.getName(),
        rows: mainSheet.getLastRow(),
        cols: mainSheet.getLastColumn(),
        headers: mainSheet.getLastRow() > 0 ? mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).getValues()[0] : []
      };
      return jsonResp({
        status: 'ok',
        message: 'Connection successful',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        allSheets: allSheets,
        mainSheet: mainSheetInfo,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      return jsonResp({
        status: 'error',
        message: 'Connection failed: ' + e.toString(),
        error: e.toString()
      });
    }
  }

  // ===== NEW: Get sheet structure info for debugging =====
  if (action === 'getSheetInfo') {
    if (!isAuthorized(username, pass)) {
      return jsonResp({ status: 'error', message: 'Unauthorized' });
    }
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const allSheets = listAllSheets();
      const mainSheet = getMainSheet();
      
      // Get detailed header info
      let headers = [];
      let sampleData = [];
      if (mainSheet.getLastRow() > 0) {
        headers = mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).getValues()[0];
        if (mainSheet.getLastRow() > 1) {
          // Get first data row as sample
          sampleData = mainSheet.getRange(2, 1, 1, mainSheet.getLastColumn()).getValues()[0];
        }
      }
      
      return jsonResp({
        status: 'ok',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        allSheets: allSheets,
        mainSheet: {
          name: mainSheet.getName(),
          totalRows: mainSheet.getLastRow(),
          totalCols: mainSheet.getLastColumn(),
          headers: headers,
          sampleRow: sampleData
        }
      });
    } catch (e) {
      return jsonResp({
        status: 'error',
        message: 'Failed to get sheet info: ' + e.toString()
      });
    }
  }

  return jsonResp({ status: 'error', message: 'Unknown action' });
}

// ===== POST =====
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch(err) { return jsonResp({ status: 'error', message: 'Invalid JSON' }); }

  const action = body.action || 'saveReservation';
  const username = body.username || body.user || 'public';
  const pass = body.pass || '';

  // ===== LOGIN (new multi-user) =====
  if (action === 'login') {
    const user = authenticateUser(body.username, body.password);
    if (!user) {
      logEvent(body.username || 'unknown', 'login_failed', '', { reason: 'invalid credentials' }, 'denied');
      return jsonResp({ status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    if (!user.active) {
      logEvent(body.username, 'login_failed', '', { reason: 'user inactive' }, 'denied');
      return jsonResp({ status: 'error', message: 'บัญชีผู้ใช้นี้ถูกปิดใช้งาน' });
    }
    logEvent(user.username, 'login_success', '', { department: user.department, role: user.role }, 'success');
    return jsonResp({ status: 'ok', user: user });
  }

  // ===== Client-side event log (optional) =====
  if (action === 'logClientEvent') {
    logEvent(username || 'client', body.clientAction || 'client_action', body.targetRef || '', body.details || {}, 'success');
    return jsonResp({ status: 'ok' });
  }

  // ===== PUBLIC: New reservation (from booking form) =====
  if (action === 'saveReservation' || !action) {
    const sheet = getMainSheet();
    ensureHeaders(sheet);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow  = headers.map(h => body[h] !== undefined ? body[h] : '');
    sheet.appendRow(newRow);

    logEvent('public', 'booking_submitted', body.ref || '', { visitorName: body.visitorName, prisonerName: body.prisonerName, visitDate: body.visitDate }, 'success');

    // Optional email notification (kept from original)
    try {
      const adminEmail = Session.getActiveUser().getEmail();
      if (adminEmail) {
        MailApp.sendEmail({
          to: adminEmail,
          subject: `[จองใหม่ — รอตรวจสอบวินัย] ${body.ref} — ${body.visitorName}`,
          body: `มีคำขอจองเยี่ยมใหม่ที่รอตรวจสอบประวัติวินัย\n\n` +
                `เลขอ้างอิง : ${body.ref}\n` +
                `ผู้เยี่ยม  : ${body.visitorName} (${body.visitorPhone})\n` +
                `ความสัมพันธ์: ${body.relation}\n` +
                `ผู้ต้องขัง : ${body.prisonerName} (#${body.prisonerId})\n` +
                `แดน        : ${body.wing}\n` +
                `วันที่เยี่ยม: ${body.visitDate}\n` +
                `จำนวน      : ญาติ ${body.visitorCount} คน + ผู้ต้องขัง 1 = ${body.totalPersons} คน\n` +
                `ค่าบริการ  : ${body.total} บาท\n\n` +
                `กรุณาเข้าระบบเพื่อตรวจสอบและอนุมัติ/ไม่อนุมัติ`
        });
      }
    } catch(mailErr) { /* ignore */ }

    return jsonResp({ status: 'ok', ref: body.ref });
  }

  // ===== Public actions (no login required) =====
  const publicActions = ['uploadSlip', 'updateSlipAndStatus'];
  if (publicActions.includes(action) && (username === 'public' || !username)) {
    // allow public slip upload / payment confirmation
  } else if (!isAuthorized(username, pass)) {
    logEvent(username || 'unknown', action, body.ref || '', { reason: 'unauthorized' }, 'denied');
    return jsonResp({ status: 'error', message: 'Unauthorized' });
  }

  // ── CANCEL BOOKING ──
  if (action === 'cancelBooking') {
    const sheet = getMainSheet();
    const data  = sheet.getDataRange().getValues();
    const refIdx    = data[0].indexOf('ref');
    const statusIdx = data[0].indexOf('status');
    for (let i = 1; i < data.length; i++) {
      if (data[i][refIdx] === body.ref) {
        sheet.getRange(i + 1, statusIdx + 1).setValue('ยกเลิก');
        logEvent(username, 'booking_cancelled', body.ref, { previousStatus: data[i][statusIdx] }, 'success');
        return jsonResp({ status: 'ok' });
      }
    }
    return jsonResp({ status: 'error', message: 'Ref not found' });
  }

  // ── UPDATE STATUS (approve / reject / mark paid etc.) ──
  if (action === 'updateStatus') {
    const sheet = getMainSheet();
    const data  = sheet.getDataRange().getValues();
    const refIdx    = data[0].indexOf('ref');
    const statusIdx = data[0].indexOf('status');
    for (let i = 1; i < data.length; i++) {
      if (data[i][refIdx] === body.ref) {
        const oldStatus = data[i][statusIdx];
        sheet.getRange(i + 1, statusIdx + 1).setValue(body.status);
        logEvent(username, 'status_changed', body.ref, { oldStatus, newStatus: body.status }, 'success');
        return jsonResp({ status: 'ok' });
      }
    }
    return jsonResp({ status: 'error', message: 'Ref not found' });
  }

  // ── UPDATE VISITOR APPROVAL (per person) ──
  if (action === 'updateVisitorApproval') {
    if (!body.ref) return jsonResp({ status: 'error', message: 'Missing ref' });

    const sheet = getMainSheet();
    let data  = sheet.getDataRange().getValues();
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
        rowIndex = i; break;
      }
    }
    if (rowIndex === -1) return jsonResp({ status: 'error', message: 'Ref not found' });

    const row = rowIndex + 1;
    if (body.visitorApproved !== undefined) sheet.getRange(row, vaIdx + 1).setValue(body.visitorApproved);
    if (body.extraVisitorApproved !== undefined) sheet.getRange(row, evaIdx + 1).setValue(body.extraVisitorApproved);

    // Recalc price
    const mainApproved = (body.visitorApproved || '').toString().trim().toLowerCase() === 'yes' ? 1 : 0;
    let extraYesCount = 0;
    if (body.extraVisitorApproved) {
      extraYesCount = String(body.extraVisitorApproved).split(';;').filter(v => (v || '').toString().trim().toLowerCase() === 'yes').length;
    }
    const approvedRelatives = mainApproved + extraYesCount;
    const correctVisitorCount = approvedRelatives;
    const correctTotal = (approvedRelatives + 1) * 1000;

    const vcIdx = headers.indexOf('visitorCount');
    const tIdx  = headers.indexOf('total');
    if (vcIdx > -1) sheet.getRange(row, vcIdx + 1).setValue(correctVisitorCount);
    if (tIdx  > -1) sheet.getRange(row, tIdx  + 1).setValue(correctTotal);

    logEvent(username, 'visitor_approval_updated', body.ref, { visitorApproved: body.visitorApproved, extraVisitorApproved: body.extraVisitorApproved, visitorCount: correctVisitorCount, total: correctTotal }, 'success');
    return jsonResp({ status: 'ok', visitorCount: correctVisitorCount, total: correctTotal });
  }

  // ── UPLOAD SLIP (public or staff) ──
  if (action === 'uploadSlip') {
    if (!body.base64Data) return jsonResp({ status: 'error', message: 'Missing base64Data' });
    if (!body.ref) return jsonResp({ status: 'error', message: 'Missing ref' });
    try {
      const url = saveSlipToDrive(body.ref, body.base64Data, body.mimeType || '', body.fileName || '');
      logEvent(username || 'public', 'slip_uploaded', body.ref, {}, 'success');
      return jsonResp({ status: 'ok', url: url });
    } catch(e) {
      Logger.log('uploadSlip error: ' + e.toString());
      logEvent(username || 'public', 'slip_upload_failed', body.ref, { error: e.toString() }, 'error');
      return jsonResp({ status: 'error', message: e.toString() });
    }
  }

  // ── UPDATE SLIP + STATUS ──
  if (action === 'updateSlipAndStatus') {
    const sheet = getMainSheet();
    const data  = sheet.getDataRange().getValues();
    const headers    = data[0];
    const refIdx     = headers.indexOf('ref');
    const statusIdx  = headers.indexOf('status');
    const slipIdx    = headers.indexOf('slipImage');
    for (let i = 1; i < data.length; i++) {
      if (data[i][refIdx] === body.ref) {
        sheet.getRange(i + 1, statusIdx + 1).setValue(body.status || 'ชำระแล้ว');
        if (slipIdx >= 0 && body.slipImage) {
          let slipVal = body.slipImage;
          if (slipVal.startsWith('data:image')) {
            try { slipVal = saveSlipToDrive(body.ref, slipVal); } catch(e) { slipVal = 'SLIP_UPLOADED:' + new Date().toISOString(); }
          }
          sheet.getRange(i + 1, slipIdx + 1).setValue(slipVal);
        }
        logEvent(username, 'slip_and_status_updated', body.ref, { status: body.status }, 'success');
        return jsonResp({ status: 'ok' });
      }
    }
    return jsonResp({ status: 'error', message: 'Ref not found' });
  }

  // ===== USER MANAGEMENT (superadmin only) =====
  if (action === 'saveUser') {
    const currentUser = getUserByUsername(username);
    if (!currentUser || !userHasPermission(currentUser, 'manage_users')) {
      logEvent(username, 'manage_users_denied', '', {}, 'denied');
      return jsonResp({ status: 'error', message: 'Permission denied: manage_users' });
    }
    saveOrUpdateUser(body.userData);
    logEvent(username, 'user_saved', body.userData.username, {}, 'success');
    return jsonResp({ status: 'ok' });
  }

  if (action === 'getUsers') {
    const currentUser = getUserByUsername(username);
    if (!currentUser || !userHasPermission(currentUser, 'manage_users')) {
      return jsonResp({ status: 'error', message: 'Permission denied' });
    }
    return jsonResp({ status: 'ok', users: getAllUsersSafe() });
  }

  return jsonResp({ status: 'error', message: 'Unknown action' });
}

// ===== AUTH HELPERS =====
function isAuthorized(username, pass) {
  if (username && getUserByUsername(username)) {
    return true; // username-based login is sufficient after successful login
  }
  // Legacy fallback
  return String(pass) === String(LEGACY_STAFF_PASS);
}

function authenticateUser(username, password) {
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  const headers = data[0];
  const uIdx = headers.indexOf('username');
  const pIdx = headers.indexOf('password');
  const deptIdx = headers.indexOf('department');
  const roleIdx = headers.indexOf('role');
  const permIdx = headers.indexOf('permissions');
  const activeIdx = headers.indexOf('active');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][uIdx]).trim() === String(username).trim()) {
      if (String(data[i][pIdx]) === String(password)) {
        return {
          username: String(data[i][uIdx]),
          department: String(data[i][deptIdx] || ''),
          role: String(data[i][roleIdx] || ''),
          permissions: data[i][permIdx] ? JSON.parse(data[i][permIdx]) : [],
          active: data[i][activeIdx] !== false && data[i][activeIdx] !== 'FALSE'
        };
      }
    }
  }
  return null;
}

function getUserByUsername(username) {
  if (!username) return null;
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  const headers = data[0];
  const uIdx = headers.indexOf('username');
  const deptIdx = headers.indexOf('department');
  const roleIdx = headers.indexOf('role');
  const permIdx = headers.indexOf('permissions');
  const activeIdx = headers.indexOf('active');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][uIdx]).trim() === String(username).trim()) {
      return {
        username: String(data[i][uIdx]),
        department: String(data[i][deptIdx] || ''),
        role: String(data[i][roleIdx] || ''),
        permissions: tryParseJSON(data[i][permIdx]),
        active: data[i][activeIdx] !== false && String(data[i][activeIdx]).toUpperCase() !== 'FALSE'
      };
    }
  }
  return null;
}

function userHasPermission(user, perm) {
  if (!user || !user.permissions) return false;
  if (user.role === 'superadmin') return true;
  return user.permissions.includes(perm);
}

function tryParseJSON(str) {
  try { return JSON.parse(str); } catch { return []; }
}

// ===== EVENT LOG =====
function logEvent(username, action, targetRef, details, result) {
  const sheet = getEventLogSheet();
  const ts = new Date();
  const detailsStr = (details && typeof details === 'object') ? JSON.stringify(details) : (details || '');
  sheet.appendRow([
    Utilities.formatDate(ts, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    username || 'system',
    action,
    targetRef || '',
    detailsStr,
    result || 'success',
    '', // ip (client can send later if needed)
    ''  // userAgent
  ]);
}

function getEventLogs(params) {
  const sheet = getEventLogSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const rows = data.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i]; });
    return obj;
  }).reverse(); // newest first

  // Basic filtering
  let filtered = rows;
  if (params.fromDate) filtered = filtered.filter(r => r.timestamp >= params.fromDate);
  if (params.toDate) filtered = filtered.filter(r => r.timestamp <= params.toDate + ' 23:59:59');
  if (params.username) filtered = filtered.filter(r => String(r.username).toLowerCase().includes(String(params.username).toLowerCase()));
  if (params.action) filtered = filtered.filter(r => String(r.action).toLowerCase().includes(String(params.action).toLowerCase()));
  if (params.search) {
    const s = String(params.search).toLowerCase();
    filtered = filtered.filter(r => JSON.stringify(r).toLowerCase().includes(s));
  }
  return filtered.slice(0, 500); // safety limit
}

// ===== USERS SHEET MANAGEMENT =====
function getUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(USERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET);
    ensureUsersHeaders(sheet);
    seedDefaultUsers(sheet);
  }
  return sheet;
}

function ensureUsersHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;
  const headers = ['username', 'password', 'department', 'role', 'permissions', 'active', 'createdAt'];
  sheet.appendRow(headers);
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setFontWeight('bold');
  range.setBackground('#185FA5');
  range.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

function seedDefaultUsers(sheet) {
  const now = new Date();
  DEFAULT_USERS.forEach(u => {
    sheet.appendRow([
      u.username,
      u.password,
      u.department,
      u.role,
      u.permissions,
      u.active,
      Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
    ]);
  });
}

function getAllUsersSafe() {
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h === 'password') obj[h] = '********'; // never expose
      else obj[h] = row[i];
    });
    return obj;
  });
}

function saveOrUpdateUser(userData) {
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const uIdx = headers.indexOf('username');

  // Find existing
  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][uIdx]).trim() === String(userData.username).trim()) {
      foundRow = i + 1;
      break;
    }
  }

  const rowData = [
    userData.username,
    userData.password || (foundRow > 0 ? data[foundRow-1][headers.indexOf('password')] : 'changeme'),
    userData.department || '',
    userData.role || 'viewer',
    (typeof userData.permissions === 'string') ? userData.permissions : JSON.stringify(userData.permissions || []),
    userData.active !== false,
    foundRow > 0 ? data[foundRow-1][headers.indexOf('createdAt')] : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
  ];

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

// ===== EVENT LOG SHEET =====
function getEventLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(EVENTLOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(EVENTLOG_SHEET);
    ensureEventLogHeaders(sheet);
  }
  return sheet;
}

function ensureEventLogHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;
  const headers = ['timestamp', 'username', 'action', 'targetRef', 'details', 'result', 'ip', 'userAgent'];
  sheet.appendRow(headers);
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setFontWeight('bold');
  range.setBackground('#185FA5');
  range.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

// ===== MAIN RESERVATION SHEET =====
function getMainSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    ensureHeaders(sheet);
  }
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;
  const headers = [
    'ref','timestamp','visitorName','visitorId','visitorPhone','relation',
    'extraVisitorNames','visitorApproved','extraVisitorApproved',
    'prisonerName','prisonerId','wing','visitDate','visitDateISO',
    'visitorCount','totalPersons','total','adultCount','child5to8Count','childUnder5Count','status','slipImage'
  ];
  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#185FA5');
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  const slipCol = headers.indexOf('slipImage') + 1;
  if (slipCol > 0) sheet.hideColumns(slipCol);
}

// ===== SLIP TO DRIVE =====
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

  const ext = mimeType.split('/')[1].replace('jpeg','jpg').replace('jpg','jpg');
  const fileName = fileNameOverride || ('slip_' + ref + '_' + new Date().getTime() + '.' + ext);
  let blob;
  try {
    blob = Utilities.newBlob(Utilities.base64Decode(rawBase64), mimeType, fileName);
  } catch(decodeErr) {
    throw new Error('base64 decode failed: ' + decodeErr.message);
  }

  const folderName = 'VisitorSlips';
  const folderIter = DriveApp.getFoldersByName(folderName);
  const folder = folderIter.hasNext() ? folderIter.next() : DriveApp.createFolder(folderName);

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = file.getId();
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200';
}

// ===== PRISONER MASTER DATABASE =====
function getPrisonerSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PRISONER_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PRISONER_SHEET);
    ensurePrisonerHeaders(sheet);
  }
  return sheet;
}

function ensurePrisonerHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;
  const headers = ['prisonerId', 'prisonerName', 'wing', 'status', 'note'];
  sheet.appendRow(headers);
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setFontWeight('bold');
  range.setBackground('#185FA5');
  range.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

function jsonResp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
