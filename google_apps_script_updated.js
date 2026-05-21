const SHEET_NAME = 'การจอง';
const STAFF_PASS = '10900';

// ===== GET: ดึงข้อมูลทั้งหมด (หน้าเจ้าหน้าที่ + หน้าตรวจสอบสถานะ) =====
function doGet(e) {
  const params = e.parameter;
  const action = params.action || '';
  const pass   = params.pass  || '';

  // ตรวจ password
  if (pass !== STAFF_PASS) {
    return jsonResp({ status: 'error', message: 'Unauthorized' });
  }

  if (action === 'getAll') {
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResp({ status: 'ok', rows: [] });

    const headers = data[0];
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        // Include all data including slipImage so dashboard can display payment slips
        obj[h] = row[i];
      });
      return obj;
    });
    return jsonResp({ status: 'ok', rows: rows.reverse() }); // newest first
  }

  return jsonResp({ status: 'error', message: 'Unknown action' });
}

// ===== POST: บันทึกการจองใหม่ / อัพเดทสถานะ / อัพเดทสลิปพร้อมสถานะ =====
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch(err) { return jsonResp({ status: 'error', message: 'Invalid JSON' }); }

  const action = body.action || 'saveReservation';

  // ── อัพเดทสถานะ (หน้าเจ้าหน้าที่ กด อนุมัติ / ไม่อนุมัติ) ──
  if (action === 'updateStatus') {
    if (body.pass !== STAFF_PASS) return jsonResp({ status: 'error', message: 'Unauthorized' });
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    const refIdx    = data[0].indexOf('ref');
    const statusIdx = data[0].indexOf('status');
    for (let i = 1; i < data.length; i++) {
      if (data[i][refIdx] === body.ref) {
        sheet.getRange(i + 1, statusIdx + 1).setValue(body.status);
        return jsonResp({ status: 'ok' });
      }
    }
    return jsonResp({ status: 'error', message: 'Ref not found' });
  }

  // ── อัพเดทสลิปและสถานะพร้อมกัน (ญาติชำระเงินแล้วอัปโหลดสลิป) ──
  if (action === 'updateSlipAndStatus') {
    if (body.pass !== STAFF_PASS) return jsonResp({ status: 'error', message: 'Unauthorized' });
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    const headers    = data[0];
    const refIdx     = headers.indexOf('ref');
    const statusIdx  = headers.indexOf('status');
    const slipIdx    = headers.indexOf('slipImage');
    for (let i = 1; i < data.length; i++) {
      if (data[i][refIdx] === body.ref) {
        sheet.getRange(i + 1, statusIdx + 1).setValue(body.status || 'ชำระแล้ว');
        if (slipIdx >= 0 && body.slipImage) {
          sheet.getRange(i + 1, slipIdx + 1).setValue(body.slipImage);
        }
        return jsonResp({ status: 'ok' });
      }
    }
    return jsonResp({ status: 'error', message: 'Ref not found' });
  }

  // ── บันทึกการจองใหม่ (ไม่มีสลิป — ชำระทีหลัง) ──
  const sheet = getSheet();
  ensureHeaders(sheet);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow  = headers.map(h => body[h] !== undefined ? body[h] : '');

  sheet.appendRow(newRow);

  // ส่ง email แจ้งเจ้าหน้าที่
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

// ===== Helpers =====
function getSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME);
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
    'extraVisitorNames',
    'prisonerName','prisonerId','wing','visitDate','visitDateISO',
    'visitorCount','totalPersons','total','status','slipImage'
  ];
  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#185FA5');
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  // ซ่อน column slipImage เพราะยาวมาก
  const slipCol = headers.indexOf('slipImage') + 1;
  if (slipCol > 0) sheet.hideColumns(slipCol);
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
