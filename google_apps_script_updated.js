const SHEET_NAME = 'การจอง';
const STAFF_PASS = '10900';

// ===== GET: ดึงข้อมูลทั้งหมด (หน้าเจ้าหน้าที่ + หน้าตรวจสอบสถานะ) =====
function doGet(e) {
  const params = e.parameter;
  const action = params.action || '';
  const pass   = params.pass  || '';

  // ตรวจ password
  if (String(pass) !== String(STAFF_PASS)) {
    return jsonResp({ status: 'error', message: 'Unauthorized' });
  }

  if (action === 'getAll') {
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResp({ status: 'ok', rows: [] });

    const headers = data[0];
    const refIdx  = headers.indexOf('ref');
    const rows = data.slice(1)
      .filter(row => row[refIdx] && String(row[refIdx]).trim() !== '') // ✅ กรอง row ว่าง
      .map(row => {
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

  // ── ยกเลิกการจอง (ทุกสถานะ) ──
  if (action === 'cancelBooking') {
    if (String(body.pass) !== String(STAFF_PASS)) return jsonResp({ status: 'error', message: 'Unauthorized' });
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    const refIdx    = data[0].indexOf('ref');
    const statusIdx = data[0].indexOf('status');
    for (let i = 1; i < data.length; i++) {
      if (data[i][refIdx] === body.ref) {
        sheet.getRange(i + 1, statusIdx + 1).setValue('ยกเลิก');
        return jsonResp({ status: 'ok' });
      }
    }
    return jsonResp({ status: 'error', message: 'Ref not found' });
  }

  // ── อัพเดทสถานะ (หน้าเจ้าหน้าที่ กด อนุมัติ / ไม่อนุมัติ) ──
  if (action === 'updateStatus') {
    if (String(body.pass) !== String(STAFF_PASS)) return jsonResp({ status: 'error', message: 'Unauthorized' });
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

  // ── อัปโหลดสลิปไป Google Drive แล้ว return URL (เรียกจาก status.html ก่อน) ──
  if (action === 'uploadSlip') {
    if (String(body.pass) !== String(STAFF_PASS)) return jsonResp({ status: 'error', message: 'Unauthorized' });
    if (!body.base64Data) return jsonResp({ status: 'error', message: 'Missing base64Data' });
    if (!body.ref)        return jsonResp({ status: 'error', message: 'Missing ref' });
    try {
      const url = saveSlipToDrive(body.ref, body.base64Data, body.mimeType || '', body.fileName || '');
      return jsonResp({ status: 'ok', url: url });
    } catch(e) {
      Logger.log('uploadSlip error: ' + e.toString());
      return jsonResp({ status: 'error', message: e.toString() });
    }
  }

  // ── อัพเดทสลิปและสถานะพร้อมกัน ──
  // รับ slipImage เป็น URL (จาก uploadSlip) หรือ base64 (legacy) ก็ได้
  if (action === 'updateSlipAndStatus') {
    if (String(body.pass) !== String(STAFF_PASS)) return jsonResp({ status: 'error', message: 'Unauthorized' });
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
          // slipImage ตอนนี้เป็น URL จาก uploadSlip แล้ว — บันทึกตรงๆ ได้เลย
          // (รองรับ base64 legacy ด้วย กรณีมีการเรียกจากที่เก่า)
          let slipVal = body.slipImage;
          if (slipVal.startsWith('data:image')) {
            try {
              slipVal = saveSlipToDrive(body.ref, slipVal);
            } catch(e) {
              slipVal = 'SLIP_UPLOADED:' + new Date().toISOString();
            }
          }
          sheet.getRange(i + 1, slipIdx + 1).setValue(slipVal);
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

// ===== Save slip image to Google Drive, return public URL =====
function saveSlipToDrive(ref, base64Data, mimeTypeOverride, fileNameOverride) {
  // Strip data URI prefix: "data:image/jpeg;base64,..."
  const matches = base64Data.match(/^data:([a-zA-Z0-9+\/]+\/[a-zA-Z0-9+\/]+);base64,(.+)$/);
  
  let mimeType, rawBase64;
  if (matches) {
    mimeType  = mimeTypeOverride || matches[1];
    rawBase64 = matches[2];
  } else if (mimeTypeOverride) {
    // Received raw base64 without data URI prefix (edge case)
    mimeType  = mimeTypeOverride;
    rawBase64 = base64Data;
  } else {
    throw new Error('Invalid base64 format — ไม่พบ data URI prefix และไม่มี mimeType');
  }

  const ext = mimeType.split('/')[1].replace('jpeg','jpg').replace('jpg','jpg');
  const fileName = fileNameOverride || ('slip_' + ref + '_' + new Date().getTime() + '.' + ext);
  let blob;
  try {
    blob = Utilities.newBlob(Utilities.base64Decode(rawBase64), mimeType, fileName);
  } catch(decodeErr) {
    throw new Error('base64 decode failed: ' + decodeErr.message);
  }

  // บันทึกลงโฟลเดอร์ VisitorSlips
  const folderName = 'VisitorSlips';
  const folderIter = DriveApp.getFoldersByName(folderName);
  const folder = folderIter.hasNext() ? folderIter.next() : DriveApp.createFolder(folderName);

  const file = folder.createFile(blob);
  // ตั้งเป็น Public (ทุกคนที่มี link ดูได้ ไม่ต้อง login)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  // ใช้ thumbnail URL — แสดงใน <img> ได้โดยตรง ไม่ต้อง login
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200';
}


function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
