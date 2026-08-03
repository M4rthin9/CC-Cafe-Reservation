// ===== SAFE FETCH WRAPPER =====
async function appsScriptPost(payload) {
  const resp = await appsScriptFetch('', {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }, 2);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response: ' + text.slice(0, 100));
  }
}

async function appsScriptGet(params) {
  const qs = new URLSearchParams(params).toString();
  const resp = await appsScriptFetch('?' + qs, { redirect: 'follow', credentials: 'omit' }, 2);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response: ' + text.slice(0, 100));
  }
}

// ===== TAB =====
let activeTab = 'ref';
function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tabRef').classList.toggle('active', tab === 'ref');
  document.getElementById('tabPrisoner').classList.toggle('active', tab === 'prisoner');
  document.getElementById('tabContentRef').classList.toggle('active', tab === 'ref');
  document.getElementById('tabContentPrisoner').classList.toggle('active', tab === 'prisoner');
}

// ===== Pre-fill from sessionStorage =====
window.addEventListener('load', async () => {
  await initBackendUrl();
  try {
    const lastRef = sessionStorage.getItem('lastRef');
    const lastPId = sessionStorage.getItem('lastPrisonerId');
    if (lastRef) {
      document.getElementById('searchRef').value = lastRef;
      switchTab('ref');
    } else if (lastPId) {
      document.getElementById('searchPrisoner').value = lastPId;
      switchTab('prisoner');
    }
  } catch (e) { }
});

// ===== SEARCH =====
async function doSearch() {
  let query = '';
  const mode = activeTab;
  if (mode === 'ref') {
    query = document.getElementById('searchRef').value.trim().toUpperCase();
    if (!query) { alert('กรุณากรอกเลขอ้างอิง'); return; }
  } else {
    query = document.getElementById('searchPrisoner').value.trim();
    if (!query) { alert('กรุณากรอกหมายเลขผู้ต้องขัง'); return; }
  }

  setOverlay(true, 'กำลังค้นหา...');
  document.getElementById('searchBtn').disabled = true;
  document.getElementById('resultArea').style.display = 'none';
  document.getElementById('thankYouArea').style.display = 'none';

  let rows = [];
  let retryCount = 0;
  const maxRetries = 2;
  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        setOverlay(true, `กำลังลองใหม่ (ครั้งที่ ${retryCount}/${maxRetries})...`);
      }
      const params = mode === 'ref'
        ? { action: 'lookupByRef', ref: query }
        : { action: 'lookupByRef', prisonerId: query };
      const data = await appsScriptGet(params);
      if (data.status === 'ok') { rows = data.rows || []; break; }
      else throw new Error(data.message || 'error');
    } catch (err) {
      retryCount++;
      console.error('Fetch error (attempt ' + retryCount + '):', err);
      if (retryCount > maxRetries) {
        if (APPS_SCRIPT_URL.includes('YOUR_GOOGLE')) {
          rows = getDemoRows();
          break;
        } else {
          setOverlay(false);
          document.getElementById('searchBtn').disabled = false;
          const errMsg = err.message || '';
          if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('abort') || err.name === 'AbortError') {
            renderErrorWithRetry('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ — กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง');
          } else if (errMsg.includes('HTTP 5') || errMsg.includes('HTTP 4')) {
            renderErrorWithRetry('เซิร์ฟเวอร์มีปัญหา (HTTP Error) — กรุณาลองใหม่อีกครั้ง');
          } else {
            renderErrorWithRetry('ไม่สามารถเชื่อมต่อระบบได้ — ' + (errMsg || 'กรุณาลองใหม่อีกครั้ง'));
          }
          return;
        }
      }
    }
  }
  setOverlay(false);
  document.getElementById('searchBtn').disabled = false;

  // Filter - find upcoming bookings (not cancelled and not past completed)
  let found = null;
  const todayStr = toLocalDateStr(new Date());
  const completedStatus = ['เสร็จสิ้น', 'done'];
  const cancelledStatus = ['ยกเลิก', 'cancelled'];

  if (mode === 'ref') {
    found = rows.find(r => (r.ref || '').toUpperCase() === query);
  } else {
    const matches = rows.filter(r => String(r.prisonerId || '').trim() === query);
    if (matches.length > 0) {
      // Sort by visit date (earliest first) - use visitDateISO for reliable sorting
      const validMatches = matches
        .filter(r => {
          const rStatus = normalizeStatus(r.status);
          // Never show cancelled bookings
          if (cancelledStatus.includes(rStatus)) return false;
          // Show upcoming bookings, and completed bookings only if date hasn't passed
          if (completedStatus.includes(rStatus)) {
            const rDate = r.visitDateISO || parseThaiDateToISO(r.visitDate) || '';
            return String(rDate).trim() >= todayStr;
          }
          return true;
        })
        .sort((a, b) => {
          const d1 = a.visitDateISO || parseThaiDateToISO(a.visitDate) || '';
          const d2 = b.visitDateISO || parseThaiDateToISO(b.visitDate) || '';
          return String(d1).localeCompare(String(d2));
        });
      if (validMatches.length > 0) found = validMatches[0];
    }
  }

  if (!found) {
    renderNotFound(query);
  } else {
    renderResult(found);
  }
}

function renderError(msg) {
  const area = document.getElementById('resultArea');
  area.style.display = 'block';
  area.innerHTML = `
    <div class="error-card">
      <div class="error-icon">⚠️</div>
      <div class="error-title">เกิดข้อผิดพลาด</div>
      <div class="error-message">${msg}</div>
    </div>`;
}

function renderErrorWithRetry(msg) {
  const area = document.getElementById('resultArea');
  area.style.display = 'block';
  area.innerHTML = `
    <div class="error-card">
      <div class="error-icon">⚠️</div>
      <div class="error-title">เกิดข้อผิดพลาด</div>
      <div class="error-message">${msg}</div>
      <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;">
        <button class="btn-primary" onclick="doSearch()" style="font-size:13px;">
          <i class="ti ti-refresh"></i> ลองอีกครั้ง
        </button>
        <button class="btn-secondary" onclick="resetConnection()" style="font-size:13px;">
          <i class="ti ti-plug"></i> รีเซ็ตการเชื่อมต่อ
        </button>
      </div>
      <div style="margin-top:8px;font-size:10px;color:var(--text2);">
        หรือลองเปิด <a href="javascript:void(0)" onclick="checkConnection().then(r => alert('Connected: ' + r.connected + '\\n' + r.message))" style="color:var(--accent)">ตรวจสอบการเชื่อมต่อ</a>
      </div>
    </div>`;
}

// ===== RENDER NOT FOUND =====
function renderNotFound(query) {
  const area = document.getElementById('resultArea');
  area.style.display = 'block';
  area.innerHTML = `
    <div class="not-found show">
      <div class="not-found-icon">🔍</div>
      <h3>ไม่พบข้อมูลการจอง</h3>
      <p>ไม่พบการจองสำหรับ <strong>"${escHtml(query)}"</strong><br>กรุณาตรวจสอบความถูกต้องของข้อมูลที่กรอก</p>
    </div>
    <div style="margin-top:12px">
      <a href="booking.html" class="btn-primary" style="text-decoration:none">
        <i class="ti ti-plus"></i> จองใหม่
      </a>
    </div>
  `;
}

// ===== RENDER RESULT =====
let currentBooking = null;
let slipFile = null;
let slipUploaded = false;


function renderResult(row) {
  currentBooking = row;
  slipFile = null;
  slipUploaded = false;
  const status = row.status || 'รอตรวจสอบ';
  const statusPill = getStatusPill(status);
  const visitorCount = parseInt(row.visitorCount) || 1;
  const totalPersons = visitorCount + 1;
  const total = parseInt(row.total) || totalPersons * 1000;

  let visitorsDetailHtml = '';
  const mainAppr = (row.visitorApproved || '').trim();
  const mainLabel = mainAppr === 'yes' ? '✅ เข้าได้' : mainAppr === 'no' ? '❌ เข้าไม่ได้' : '';
  visitorsDetailHtml += `<div class="visitor-item"><span>👤 ${escHtml(row.visitorName || '—')}</span>${mainLabel ? '<span class="approval-badge ' + (mainAppr === 'yes' ? 'yes' : mainAppr === 'no' ? 'no' : 'pending') + '">' + mainLabel + '</span>' : ''}</div>`;
  if (row.extraVisitorNames && row.extraVisitorNames.trim()) {
    const isNew = row.extraVisitorNames.includes(';;') || row.extraVisitorNames.includes('|');
    let exs = [];
    if (isNew) {
      exs = row.extraVisitorNames.split(';;').map(e => { const p = e.split('|'); return { name: (p[0] || '').trim() }; }).filter(e => e.name);
    } else {
      exs = row.extraVisitorNames.split(/,(?![^(]*\))/).map(e => { const m = e.trim().match(/^(.+?)\s*\(/); return { name: m ? m[1].trim() : e.trim() }; }).filter(e => e.name);
    }
    const eAppr = String(row.extraVisitorApproved || '').split(';;');
    exs.forEach((v, i) => {
      const a = (eAppr[i] || '').trim();
      const lb = a === 'yes' ? '✅ เข้าได้' : a === 'no' ? '❌ เข้าไม่ได้' : '';
      visitorsDetailHtml += `<div class="visitor-item"><span>👤 ${escHtml(v.name)}</span>${lb ? '<span class="approval-badge ' + (a === 'yes' ? 'yes' : a === 'no' ? 'no' : 'pending') + '">' + lb + '</span>' : ''}</div>`;
    });
  }

  const area = document.getElementById('resultArea');
  area.style.display = 'block';

  let paymentBlock = '';
  const sLower = normalizeStatus(status).toLowerCase();

  if (sLower === 'รอชำระเงิน') {
    paymentBlock = `
      <div class="pay-section">
        <h3>✅ อนุมัติผู้เข้าร่วมแล้ว — กรุณาชำระเงิน</h3>
        <p>ฝ่ายวินัยอนุมัติผู้เข้าร่วมแล้ว กรุณาชำระเงินค่าบริการเพื่อยืนยันการเข้าร่วมกิจกรรม</p>
        <div style="text-align:center;margin-bottom:1rem">
          <div style="font-size:13px;color:var(--text-tertiary)">ยอดที่ต้องชำระ</div>
          <div style="font-size:28px;font-weight:700;color:var(--text);margin:8px 0">${total.toLocaleString()} บาท</div>
          <div style="font-size:12px;color:var(--text-tertiary)">${totalPersons} คน × 1,000 บาท</div>
        </div>
        <button class="btn-primary" onclick="showPayment()">
          <i class="ti ti-credit-card"></i> ดำเนินการชำระเงิน
        </button>
      </div>
    `;
  } else if (sLower === 'ไม่อนุมัติ' || sLower === 'rejected') {
    const rejectReason = (row.cancelReason || '').trim();
    paymentBlock = `
      <div class="rejected-notice">
        <h3>❌ การจองถูกปฏิเสธ</h3>
        <p>เจ้าหน้าที่ไม่สามารถอนุมัติการจองนี้ได้ เนื่องจากมีข้อมูลวินัยที่เกี่ยวข้อง หากมีข้อสงสัยกรุณาติดต่อเจ้าหน้าที่ ณ ทัณฑสถาน</p>
        ${rejectReason ? `<div class="reason-box"><div class="reason-label">📌 เหตุผลทางวินัย</div><div class="reason-text">${escHtml(rejectReason)}</div></div>` : ''}
      </div>
      <a href="booking.html" class="btn-secondary" style="text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:1rem">
        <i class="ti ti-plus"></i> จองใหม่
      </a>
    `;
  } else if (sLower === 'ชำระแล้ว' || sLower === 'paid') {
    paymentBlock = `
      <div class="paid-notice">
        <h3>💳 รอเจ้าหน้าที่ยืนยัน</h3>
        <p>ระบบได้รับสลิปการโอนเงินของท่านแล้ว เจ้าหน้าที่กำลังตรวจสอบและจะยืนยันนัดหมายของท่านภายใน 1 วันทำการ</p>
      </div>
    `;
  } else if (sLower === 'เสร็จสิ้น') {
    paymentBlock = `
      <div class="paid-notice" style="background:var(--gray-100);border-color:var(--gray-600);">
        <h3>🎉 การจองเสร็จสมบูรณ์</h3>
        <p>เจ้าหน้าที่ยืนยันการชำระเงินเรียบร้อยแล้ว กรุณานำเลขอ้างอิงมาแสดงในวันเข้าร่วมกิจกรรม</p>
      </div>
    `;
  } else if (sLower === 'ยกเลิก') {
    const cancelReasonText = (row.cancelReason || '').trim();
    paymentBlock = `
      <div class="rejected-notice">
        <h3>🚫 การจองถูกยกเลิก</h3>
        <p>การจองนี้ถูกยกเลิกแล้ว หากต้องการจองใหม่กรุณากดปุ่มด้านล่าง</p>
        ${cancelReasonText ? `<div class="reason-box"><div class="reason-label">📌 เหตุผล</div><div class="reason-text">${escHtml(cancelReasonText)}</div></div>` : ''}
      </div>
      <div id="cancelNotesArea"></div>
      <a href="booking.html" class="btn-secondary" style="text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:1rem">
        <i class="ti ti-plus"></i> จองใหม่
      </a>
    `;
  } else if (sLower === 'รอตรวจสอบผู้เข้าร่วม') {
    paymentBlock = `
      <div class="pay-section">
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;display:flex;align-items:center;gap:8px;">⏳ รอตรวจสอบผู้เข้าร่วม</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;">เจ้าหน้าที่ฝ่ายทัณฑ์กำลังตรวจสอบรายชื่อผู้เข้าร่วม (1–2 วันทำการ) กรุณาตรวจสอบสถานะอีกครั้งในภายหลัง</div>
      </div>
    `;
  } else if (sLower === 'รอตรวจสอบวินัย') {
    paymentBlock = `
      <div class="pay-section">
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;display:flex;align-items:center;gap:8px;">⏳ รอตรวจสอบวินัย</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;">เจ้าหน้าที่ฝ่ายวินัยกำลังตรวจสอบประวัติวินัยของผู้ต้องขัง (1–2 วันทำการ) กรุณาตรวจสอบสถานะอีกครั้งในภายหลัง</div>
      </div>
    `;
  } else {
    paymentBlock = `
      <div class="pay-section">
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;display:flex;align-items:center;gap:8px;">⏳ รอเจ้าหน้าที่ตรวจสอบ</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;">เจ้าหน้าที่กำลังตรวจสอบประวัติวินัยของผู้ต้องขัง (1–2 วันทำการ) กรุณาตรวจสอบสถานะอีกครั้งในภายหลัง</div>
      </div>
    `;
  }

  const isCancelled = sLower === 'ยกเลิก';
  const isDone = sLower === 'เสร็จสิ้น';
  const showCancel = !isCancelled && !isDone;
  let cancelBlock = '';
  if (showCancel) {
    cancelBlock = `
      <div class="cancel-section">
        <button class="btn-danger" onclick="cancelCurrentBooking()">
          <i class="ti ti-x"></i> ยกเลิกการจอง
        </button>
        <p class="cancel-hint">* การยกเลิกไม่สามารถกู้คืนได้</p>
      </div>
    `;
  }

  area.innerHTML = `
    <div class="result-card">
      <div class="result-header">
        <div>
          <div class="result-ref">เลขอ้างอิง · <strong>${escHtml(row.ref || '—')}</strong></div>
          <div style="font-size:12px;color:var(--text-tertiary)">จองเมื่อ ${escHtml(row.timestamp || '—')}</div>
        </div>
        <div>${statusPill}</div>
      </div>
      <div class="result-body">
        <div class="info-row"><span class="lbl">👤 ผู้ร่วมกิจกรรม</span><span class="val">${escHtml(row.visitorName || '—')}</span></div>
        <div class="info-row"><span class="lbl">🔒 ผู้ต้องขัง</span><span class="val">${escHtml(maskPrisonerName(row.prisonerName) || '—')} (#${escHtml(row.prisonerId || '—')})</span></div>
        <div class="info-row"><span class="lbl">🏢 แดน</span><span class="val">${escHtml(row.wing || '—')}</span></div>
        <div class="info-row"><span class="lbl">📅 วันที่ร่วมกิจกรรม</span><span class="val">${escHtml(row.visitDate || '—')}</span></div>
        <div class="info-row"><span class="lbl">👥 จำนวน</span><span class="val">ญาติ ${visitorCount} + ผู้ต้องขัง 1 = ${totalPersons} คน</span></div>
        <div class="info-row"><span class="lbl">💰 ค่าบริการอาหาร</span><span class="val">${total.toLocaleString()} บาท</span></div>
        ${visitorsDetailHtml ? `<div class="visitor-section"><div class="visitor-section-label">รายชื่อผู้เข้าเยี่ยม (สถานะหลังตรวจสอบ)</div>${visitorsDetailHtml}</div>` : ''}
      </div>
    </div>

    <div id="paymentArea">${paymentBlock}${cancelBlock}</div>

    <div id="paymentForm" style="display:none">
      <div class="section-title" style="margin-top:1rem;">
        <i class="ti ti-credit-card"></i> รายละเอียดการชำระเงิน
      </div>

      <div style="background:linear-gradient(135deg,var(--gray-100),var(--gray-200));border:2px solid var(--gray-600);border-radius:var(--radius-md);padding:1.5rem;margin-bottom:1.25rem;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:8px;background:var(--gray-700);color:var(--white);font-size:13px;font-weight:700;padding:6px 18px;border-radius:20px;margin-bottom:14px;">
          📱 PromptPay QR Code
        </div>
        
        <div style="margin: 10px auto 15px; width: 200px; height: 200px; background: var(--white); padding: 10px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <img src="src/asset/promptpay-qr.png" alt="PromptPay QR Code" style="width: 100%; height: 100%; object-fit: contain;">
        </div>

        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px;">ทัณฑสถานบำบัดพิเศษกลาง</div>
        <div style="font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;">ชื่อบัญชี: ร้านสงเคราะห์ผู้ต้องขัง</div>

        <div style="background:rgba(255,255,255,0.7);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--text-secondary);line-height:1.8;">
          💰 ยอดที่ต้องชำระ: <strong style="font-size:18px;color:var(--text);">${total.toLocaleString()} บาท</strong><br>
          <span style="font-size:12px;color:var(--text-tertiary);">${totalPersons} คน × 1,000 บาท</span>
        </div>
        <div style="margin-top:10px;background:rgba(255,255,255,0.8);border-radius:8px;padding:8px 14px;font-size:13px;color:var(--text-secondary);">
          📝 กรุณาระบุเลขอ้างอิง <strong>${escHtml(row.ref)}</strong> ในช่องหมายเหตุเมื่อโอน
        </div>
      </div>

      <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:1.25rem;margin-bottom:1rem;">
        <div class="section-title" style="margin-top:0;">
          <i class="ti ti-upload"></i> อัปโหลดสลิปการโอนเงิน
        </div>
        <div style="background:var(--gray-100);border:1px solid var(--border);border-radius:var(--radius-md);padding:10px 14px;margin-bottom:12px;font-size:13px;color:var(--text-secondary);line-height:1.6;">
          📋 หลังแนบสลิปแล้ว กรุณามาทำการลงทะเบียนในวันที่จอง ก่อนเวลาเข้าเยี่ยมในเวลา 9.00 ตามมาที่รับแขก
        </div>
        <div class="upload-area" id="uploadArea"
          ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
          <input type="file" accept="image/*,application/pdf" id="slipFileInput" onchange="handleUpload(event)">
          <div id="uploadInner">
            <div class="upload-icon">📄</div>
            <p>แตะหรือคลิกเพื่อเลือกรูปสลิป</p>
            <p class="hint">รองรับ JPG, PNG · ขนาดไม่เกิน 10MB · ลากไฟล์มาวางได้</p>
          </div>
          <img id="previewImg" class="preview-img" alt="สลิปที่อัปโหลด">
        </div>
        <div class="upload-progress" id="uploadProgress">
          <div class="upload-progress-bar" id="uploadProgressBar"></div>
        </div>
        <div id="uploadStatus" style="font-size:12px;color:var(--text-tertiary);margin-top:6px;min-height:16px"></div>
        <div class="alert-strip" id="uploadAlert"></div>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:1rem">
        <button class="btn-secondary" onclick="hidePayment()" style="flex:0.4">
          <i class="ti ti-arrow-left"></i> ยกเลิก
        </button>
        <button class="btn-primary" onclick="submitPayment()" style="flex:1" id="paySubmitBtn">
          <i class="ti ti-check"></i> ยืนยันการชำระเงิน
        </button>
      </div>
    </div>

    <button class="btn-secondary" onclick="resetSearch()" style="margin-top:4px">
      <i class="ti ti-search"></i> ค้นหาอีกครั้ง
    </button>
  `;

  if (sLower === 'ยกเลิก') renderCancelNotes(row.ref);
}

async function renderCancelNotes(ref) {
  const el = document.getElementById('cancelNotesArea');
  if (!el) return;
  let notes = [];
  try {
    const result = await appsScriptPost({ action: 'getNotes', ref: ref });
    if (result && result.status === 'ok' && Array.isArray(result.notes)) {
      notes = result.notes.map(n => ({
        text: String(n.text || ''),
        user: String(n.user || ''),
        timestamp: String(n.timestamp || '')
      }));
    }
  } catch (e) {
    console.warn('Failed to load cancel notes:', e);
    return;
  }
  if (!notes.length) return;
  const items = notes.map(n => {
    const text = n.text.replace(/^ยกเลิก:\s*/i, '').trim() || n.text;
    return `
      <div style="padding:6px 0;border-bottom:1px dashed #fcd34d;">
        <div style="color:#78350f;font-size:13px;line-height:1.6;">📝 ${escHtml(text)}</div>
        ${(n.user || n.timestamp) ? `<div style="font-size:11px;color:#92400e;margin-top:2px;">${escHtml(n.user)} · ${escHtml(n.timestamp)}</div>` : ''}
      </div>`;
  }).join('');
  el.innerHTML = `
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:10px 14px;margin-top:8px;font-size:13px;">
      <div style="font-weight:600;color:#92400e;margin-bottom:4px;">📌 หมายเหตุการยกเลิก</div>
      ${items}
    </div>`;
}

// ===== STATUS PILL =====
function normalizeStatus(s) {
  const v = (s || '').toString().trim();
  if (['รอตรวจสอบผู้เข้าร่วม', 'รอตรวจสอบวินัย', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น', 'ยกเลิก', 'ไม่อนุมัติ'].includes(v)) {
    return v;
  }
  if (v === 'รอตรวจสอบ' || ['อนุมัติ', 'approved'].includes(v) || v.toLowerCase() === 'approved') return 'รอตรวจสอบวินัย';
  if (v.toLowerCase() === 'rejected') return 'ไม่อนุมัติ';
  if (v.toLowerCase() === 'paid') return 'ชำระแล้ว';
  if (v.toLowerCase() === 'done') return 'เสร็จสิ้น';
  return v || 'รอตรวจสอบผู้เข้าร่วม';
}

function getStatusPill(status) {
  const s = normalizeStatus(status);
  if (s === 'รอตรวจสอบผู้เข้าร่วม') return `<span class="status-pill status-pending">⏳ รอตรวจสอบผู้เข้าร่วม</span>`;
  if (s === 'รอตรวจสอบวินัย') return `<span class="status-pill status-pending">⏳ รอตรวจสอบวินัย</span>`;
  if (s === 'รอชำระเงิน') return `<span class="status-pill status-approved">✅ อนุมัติ — รอชำระเงิน</span>`;
  if (s.includes('ไม่อนุมัติ') || s === 'rejected') return `<span class="status-pill status-rejected">❌ ไม่อนุมัติ</span>`;
  if (s === 'เสร็จสิ้น') return `<span class="status-pill status-paid" style="background:#d1fae5;color:#065f46;border-color:rgba(6,95,70,0.3)">✅ เสร็จสิ้นแล้ว</span>`;
  if (s.includes('ชำระ') || s === 'paid') return `<span class="status-pill status-paid">💳 รอเจ้าหน้าที่ยืนยัน</span>`;
  if (s === 'ยกเลิก') return `<span class="status-pill" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db">🚫 ยกเลิก</span>`;
  return `<span class="status-pill status-pending">⏳ รอตรวจสอบ</span>`;
}

// ===== SHOW/HIDE PAYMENT =====
function showPayment() {
  const paymentArea = document.getElementById('paymentArea');
  const paymentForm = document.getElementById('paymentForm');
  if (paymentArea) paymentArea.style.display = 'none';
  if (paymentForm) paymentForm.style.display = 'block';
  setTimeout(() => {
    const el = document.getElementById('paymentForm');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}
function hidePayment() {
  const paymentArea = document.getElementById('paymentArea');
  const paymentForm = document.getElementById('paymentForm');
  if (paymentArea) paymentArea.style.display = 'block';
  if (paymentForm) paymentForm.style.display = 'none';
}

// ===== DRAG & DROP =====
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadArea').classList.add('drag-over');
}
function handleDragLeave(e) {
  document.getElementById('uploadArea').classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadArea').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

// ===== FILE UPLOAD HANDLER =====
function handleUpload(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

async function processFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showUploadAlert('err', '❌ ไฟล์ใหญ่เกิน 10MB กรุณาเลือกไฟล์ที่เล็กกว่า');
    return;
  }
  const mime = file.type.toLowerCase();
  if (!mime.startsWith('image/') && mime !== 'application/pdf') {
    showUploadAlert('err', '❌ รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG) เท่านั้น');
    return;
  }
  slipFile = file;
  slipUploaded = true;
  hideUploadAlert();

  if (mime.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = document.getElementById('previewImg');
      img.src = ev.target.result;
      img.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('uploadInner').style.opacity = '0.4';
  document.getElementById('uploadStatus').innerHTML =
    `✓ เลือกไฟล์แล้ว: <strong>${escHtml(file.name)}</strong><br>` +
    `<span style="font-size:11px;color:var(--text2)">ขนาด: ${(file.size / 1024).toFixed(1)} KB</span>`;
}

function showUploadAlert(type, msg) {
  const el = document.getElementById('uploadAlert');
  el.className = 'alert-strip ' + type;
  el.innerHTML = msg;
  el.style.display = 'block';
}
function hideUploadAlert() {
  const el = document.getElementById('uploadAlert');
  if (el) el.style.display = 'none';
}

// ===== UPLOAD SLIP TO APPS SCRIPT =====
async function uploadSlipViaAppsScript(file, ref) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsDataURL(file);
  });

  animateProgress(10, 60);

  const result = await appsScriptPost({
    action: 'uploadSlip',
    ref: ref,
    fileName: file.name,
    mimeType: file.type,
    base64Data: base64
  });

  animateProgress(60, 100);

  if (result.status !== 'ok') {
    throw new Error(result.message || 'อัปโหลดไม่สำเร็จ');
  }
  return result.url;
}

function animateProgress(from, to) {
  const bar = document.getElementById('uploadProgressBar');
  const wrap = document.getElementById('uploadProgress');
  if (!bar || !wrap) return;
  wrap.style.display = 'block';
  bar.style.width = from + '%';
  setTimeout(() => { bar.style.width = to + '%'; }, 50);
}

// ===== SUBMIT PAYMENT =====
async function submitPayment() {
  if (!slipUploaded || !slipFile) {
    showUploadAlert('err', '❌ กรุณาเลือกรูปสลิปการโอนเงินก่อน');
    return;
  }
  if (!currentBooking) return;

  const submitBtn = document.getElementById('paySubmitBtn');
  submitBtn.disabled = true;
  setOverlay(true, 'กำลังอัปโหลดสลิป...');

  let slipUrl = '';
  try {
    slipUrl = await uploadSlipViaAppsScript(slipFile, currentBooking.ref);
  } catch (uploadErr) {
    console.error('Slip upload error:', uploadErr);
    setOverlay(false);
    submitBtn.disabled = false;
    const wrap = document.getElementById('uploadProgress');
    if (wrap) { wrap.style.display = 'none'; }
    showUploadAlert('err',
      '❌ อัปโหลดสลิปไม่สำเร็จ: ' + (uploadErr.message || 'กรุณาลองใหม่') +
      '<br>หากยังไม่สำเร็จ กรุณาติดต่อเจ้าหน้าที่');
    return;
  }

  setOverlay(true, 'กำลังบันทึกการชำระเงิน...');
  try {
    const result = await appsScriptPost({
      action: 'updateSlipAndStatus',
      ref: currentBooking.ref,
      status: 'ชำระแล้ว',
      slipImage: slipUrl
    });
    if (result.status !== 'ok') throw new Error(result.message || 'บันทึกไม่สำเร็จ');
  } catch (err) {
    console.error('Update status error:', err);
  } finally {
    setOverlay(false);
  }

  showThankYou();
}

function showThankYou() {
  const row = currentBooking;
  const visitorCount = parseInt(row.visitorCount) || 1;
  const totalPersons = visitorCount + 1;
  const total = parseInt(row.total) || totalPersons * 1000;

  document.getElementById('resultArea').style.display = 'none';
  document.getElementById('thankYouArea').style.display = 'block';
  document.getElementById('tyRefNumber').textContent = row.ref;

  document.getElementById('tySummary').innerHTML = `
     <div>📋 <strong>Ref No.:</strong> ${escHtml(row.ref)}</div>
     <div>👤 <strong>ผู้ร่วมกิจกรรม:</strong> ${escHtml(row.visitorName)}</div>
     <div>🔒 <strong>ผู้ต้องขัง:</strong> ${escHtml(maskPrisonerName(row.prisonerName))} (#${escHtml(row.prisonerId)})</div>
     <div>🏢 <strong>แดน:</strong> ${escHtml(row.wing)}</div>
     <div>📅 <strong>วันที่:</strong> ${escHtml(row.visitDate)}</div>
     <div>👥 <strong>จำนวน:</strong> ${totalPersons} คน</div>
     <div>💰 <strong>ยอดชำระ:</strong> ${total.toLocaleString()} บาท ✓</div>
   `;
  window.scrollTo(0, 0);
}

// ===== RESET =====
function resetSearch() {
  document.getElementById('searchRef').value = '';
  document.getElementById('searchPrisoner').value = '';
  document.getElementById('resultArea').style.display = 'none';
  document.getElementById('thankYouArea').style.display = 'none';
  currentBooking = null;
  slipFile = null;
  slipUploaded = false;
  window.scrollTo(0, 0);
}

// ===== OVERLAY =====
function setOverlay(show, msg) {
  const el = document.getElementById('overlay');
  if (el) el.classList.toggle('show', show);
  const msgEl = document.getElementById('overlayMsg');
  if (msg && msgEl) msgEl.textContent = msg;
}

function parseThaiDateToISO(dateStr) {
  if (!dateStr) return '';
  const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const match = dateStr.match(/(\d+)\s*(?:วัน)?\s*([^\s]+)\s*(?:พ\.ศ\.|พศ\.|)\s*(\d+)/);
  if (match) {
    const day = String(match[1]).padStart(2, '0');
    const monthName = match[2];
    const year = parseInt(match[3]) - 543; // convert Buddhist era to AD
    const month = String(thMonths.indexOf(monthName) + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(dateStr).trim();
}

// ===== CANCEL BOOKING =====
async function cancelCurrentBooking() {
  const row = currentBooking;
  if (!row) return;

  if (!confirm(`⚠️ ยืนยันยกเลิกการจองนี้?\n\nRef: ${row.ref}\nผู้เยี่ยม: ${row.visitorName}\nสถานะปัจจุบัน: ${row.status}\n\nการยกเลิกไม่สามารถกู้คืนได้`)) return;

  setOverlay(true, 'กำลังยกเลิก...');
  try {
    const result = await appsScriptPost({
      action: 'publicCancelBooking',
      ref: row.ref
    });
    if (result.status !== 'ok') throw new Error(result.message || 'ยกเลิกไม่สำเร็จ');
  } catch (err) {
    console.error('Cancel error:', err);
    setOverlay(false);
    alert(`❌ ไม่สามารถยกเลิกการจองได้: ${err.message || 'กรุณาลองใหม่อีกครั้ง'}`);
    return;
  }
  setOverlay(false);
  row.status = 'ยกเลิก';
  renderResult(row);
}

// ===== DEMO DATA =====
function getDemoRows() {
  return [
    {
      ref: 'VIS-12345',
      timestamp: '21/5/2569 10:30',
      visitorName: 'สมชาย ใจดี',
      visitorId: '1234567890123',
      visitorPhone: '081-234-5678',
      relation: 'คู่สมรส',
      extraVisitorNames: 'สมหญิง ใจดี|1234567890124|คู่สมรส;;น้องชาย ใจดี|1234567890125|พี่น้อง',
      visitorApproved: 'yes',
      extraVisitorApproved: 'yes;;no',
      prisonerName: 'สมศักดิ์ มั่นคง',
      prisonerId: '56781234',
      wing: 'แดน 3',
      visitDate: 'วันจันทร์ที่ 25 พฤษภาคม พ.ศ. 2569',
      visitDateISO: '2026-05-25',
      visitorCount: 2,
      totalPersons: 3,
      total: 2000,
      status: 'รอชำระเงิน'
    },
    {
      ref: 'VIS-67890',
      timestamp: '20/5/2569 14:15',
      visitorName: 'มาลี สุขใจ',
      visitorId: '9876543210987',
      visitorPhone: '089-876-5432',
      relation: 'บุตร / ธิดา',
      prisonerName: 'วิชัย รักชาตี',
      prisonerId: '11223344',
      wing: 'แดน 7',
      visitDate: 'วันอังคารที่ 26 พฤษภาคม พ.ศ. 2569',
      visitDateISO: '2026-05-26',
      visitorCount: 1,
      totalPersons: 2,
      total: 2000,
      status: 'รอตรวจสอบ'
    },
    {
      ref: 'VIS-22222',
      timestamp: '30/5/2569 09:00',
      visitorName: 'สมศักดิ์ ทดสอบ',
      visitorId: '1111111111111',
      visitorPhone: '081-111-1111',
      relation: 'บุตร / ธิดา',
      prisonerName: 'สมศักดิ์ มั่นคง',
      prisonerId: '56781234',
      wing: 'แดน 3',
      visitDate: 'วันจันทร์ที่ 2 มิถุนายน พ.ศ. 2569',
      visitDateISO: '2026-06-02',
      visitorCount: 1,
      totalPersons: 2,
      total: 2000,
      status: 'เสร็จสิ้น'
    },
    {
      ref: 'VIS-33333',
      timestamp: '30/5/2569 10:00',
      visitorName: 'สมหญิง ตรวจสอบ',
      visitorId: '2222222222222',
      visitorPhone: '081-222-2222',
      relation: 'คู่สมรส',
      prisonerName: 'สมศักดิ์ มั่นคง',
      prisonerId: '56781234',
      wing: 'แดน 3',
      visitDate: 'วันพุธที่ 4 มิถุนายน พ.ศ. 2569',
      visitDateISO: '2026-06-04',
      visitorCount: 1,
      totalPersons: 2,
      total: 2000,
      status: 'รอตรวจสอบ'
    },
    {
      ref: 'VIS-44444',
      timestamp: '1/6/2569 08:30',
      visitorName: 'สมปอง ใจเย็น',
      visitorId: '3333333333333',
      visitorPhone: '081-333-3333',
      relation: 'คู่สมรส',
      prisonerName: 'สมศักดิ์ มั่นคง',
      prisonerId: '56781234',
      wing: 'แดน 3',
      visitDate: 'วันศุกร์ที่ 6 มิถุนายน พ.ศ. 2569',
      visitDateISO: '2026-06-06',
      visitorCount: 1,
      totalPersons: 2,
      total: 2000,
      status: 'ยกเลิก',
      cancelReason: 'ผู้เยี่ยมไม่สะดวกเข้าเยี่ยมในวันดังกล่าว',
    },
    {
      ref: 'VIS-55555',
      timestamp: '1/6/2569 09:00',
      visitorName: 'สมหมาย จริงใจ',
      visitorId: '4444444444444',
      visitorPhone: '081-444-4444',
      relation: 'พี่น้อง',
      prisonerName: 'สมศักดิ์ มั่นคง',
      prisonerId: '56781234',
      wing: 'แดน 3',
      visitDate: 'วันศุกร์ที่ 6 มิถุนายน พ.ศ. 2569',
      visitDateISO: '2026-06-06',
      visitorCount: 1,
      totalPersons: 2,
      total: 2000,
      status: 'ไม่อนุมัติ',
      cancelReason: 'วินัย'
    }
  ];
}
