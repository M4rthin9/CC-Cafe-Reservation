// ===== CONFIG =====
const PASSWORD = '10900';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfOtYJomd52MxJgKBDxQYH-HlOpVOk0ZMPO4Lc7ehjJAMxCl0hf84wWBf4mctun03xLw/exec';

// ===== STATE =====
let allRows = [];
let currentPage = 1;
let pageSize = 10;

// ===== LOGIN =====
function doLogin() {
  const pass = document.getElementById('passInput').value;
  if (pass === PASSWORD) {
    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('dash').style.display = 'block';
    document.getElementById('topDate').textContent = new Date().toLocaleDateString('th-TH', {year:'numeric',month:'long',day:'numeric'});
    loadData();
  } else {
    document.getElementById('loginErr').style.display = 'block';
    document.getElementById('passInput').value = '';
    setTimeout(() => document.getElementById('loginErr').style.display = 'none', 3000);
  }
}
function doLogout() {
  document.getElementById('loginWrap').style.display = 'flex';
  document.getElementById('dash').style.display = 'none';
  document.getElementById('passInput').value = '';
  allRows = [];
}

// ===== LOAD DATA =====
async function loadData() {
  document.getElementById('tableBody').innerHTML = '<tr><td colspan="9" class="loading-state"><span class="spinner-sm"></span>กำลังโหลดข้อมูล...</td></tr>';
  try {
    const resp = await fetch(APPS_SCRIPT_URL + '?action=getAll&pass=' + encodeURIComponent(PASSWORD), { redirect: 'follow' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    const data = JSON.parse(text);
    if (data.status !== 'ok') throw new Error(data.message);
    allRows = data.rows || [];
    document.getElementById('lastUpdated').textContent = 'อัพเดทล่าสุด: ' + new Date().toLocaleString('th-TH');
  } catch(e) {
    // Demo mode: use sample data if no Apps Script
    if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
      allRows = getDemoData();
      document.getElementById('lastUpdated').textContent = 'โหมด Demo (ยังไม่ได้เชื่อม Google Sheet)';
    } else {
      document.getElementById('tableBody').innerHTML = `<tr><td colspan="9" class="empty-state">❌ โหลดข้อมูลไม่สำเร็จ: ${e.message}</td></tr>`;
      return;
    }
  }
  updateStats();
  buildDateFilter();
  renderTable();
}

// ===== DEMO DATA =====
function getDemoData() {
  return [
    { ref:'VIS-11234', timestamp:'21/05/2568 09:12', visitorName:'สมชาย ใจดี', visitorPhone:'081-234-5678', visitorId:'1-1001-12345-67-8', relation:'บุตร / ธิดา', extraVisitorNames:'สมหญิง ใจดี|1-9999-11111-22-3|คู่สมรส;;น้องชาย ใจดี|1-9999-11111-22-4|พี่น้อง', visitorApproved:'yes', extraVisitorApproved:'yes;;no', prisonerName:'สมศักดิ์ มั่นคง', prisonerId:'20010001', wing:'แดน 3', visitDate:'28 พฤษภาคม 2568', visitorCount:3, total:3000, status:'รอตรวจสอบ', slipImage:'' },
    { ref:'VIS-22345', timestamp:'21/05/2568 10:30', visitorName:'สมหญิง รักดี', visitorPhone:'089-876-5432', visitorId:'1-2002-23456-78-9', relation:'คู่สมรส', prisonerName:'วิชัย สุขสม', prisonerId:'20020002', wing:'แดน 5', visitDate:'29 พฤษภาคม 2568', visitorCount:1, total:1000, status:'รอชำระเงิน', slipImage:'' },
    { ref:'VIS-33456', timestamp:'20/05/2568 14:45', visitorName:'นางมาลี หวานใจ', visitorPhone:'062-111-2222', visitorId:'1-3003-34567-89-0', relation:'บิดา / มารดา', prisonerName:'ประสิทธิ์ ดีมาก', prisonerId:'20030003', wing:'แดน 1', visitDate:'27 พฤษภาคม 2568', visitorCount:3, total:3000, status:'ชำระแล้ว', slipImage:'' },
    { ref:'VIS-44567', timestamp:'19/05/2568 11:00', visitorName:'ธนา สมบัติดี', visitorPhone:'095-333-4444', visitorId:'1-4004-45678-90-1', relation:'พี่น้อง', prisonerName:'ชัยวัฒน์ รุ่งเรือง', prisonerId:'20040004', wing:'แดน 2', visitDate:'26 พฤษภาคม 2568', visitorCount:2, total:2000, status:'ไม่อนุมัติ', slipImage:'' },
  ];
}

// ===== STATS =====
function updateStats() {
  document.getElementById('statTotal').textContent = allRows.length;
  document.getElementById('statWait').textContent = allRows.filter(r=>r.status==='รอตรวจสอบ').length;
  document.getElementById('statOk').textContent = allRows.filter(r=>r.status==='รอชำระเงิน'||r.status==='ชำระแล้ว'||r.status==='เสร็จสิ้น').length;
  document.getElementById('statReject').textContent = allRows.filter(r=>r.status==='ไม่อนุมัติ').length;
}

// ===== DATE FILTER =====
function buildDateFilter() {
  const dates = [...new Set(allRows.map(r=>r.visitDate))].sort();
  const sel = document.getElementById('filterDate');
  const cur = sel.value;
  sel.innerHTML = '<option value="">ทุกวัน</option>';
  dates.forEach(d => {
    const o = document.createElement('option');
    o.value = d; o.textContent = d;
    if (d === cur) o.selected = true;
    sel.appendChild(o);
  });
}

// ===== RENDER TABLE =====
function renderTable() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const fs = document.getElementById('filterStatus').value;
  const fd = document.getElementById('filterDate').value;
  let rows = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false; // ✅ กรอง row ว่าง
    if (fs && r.status !== fs) return false;
    if (fd && r.visitDate !== fd) return false;
    if (q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    return true;
  });
  const totalFiltered = rows.length;
  document.getElementById('tableCount').textContent = totalFiltered + ' รายการ';

  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(startIdx, startIdx + pageSize);

  if (!totalFiltered) {
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="9" class="empty-state">ไม่พบข้อมูล</td></tr>';
    renderPagination(0, 0);
    return;
  }
  document.getElementById('tableBody').innerHTML = pageRows.map((r, idx) => {
  const s = normalizeStatus(r.status);
  let badgeClass = 'badge-wait';
  if (s === 'รอชำระเงิน') badgeClass = 'badge-pay';
  else if (s === 'ชำระแล้ว') badgeClass = 'badge-paid';
  else if (s === 'เสร็จสิ้น') badgeClass = 'badge-done';
  else if (s === 'ไม่อนุมัติ') badgeClass = 'badge-reject';
  else if (s === 'ยกเลิก') badgeClass = 'badge-cancel';

    const isWait      = s === 'รอตรวจสอบ';
    const isPaid      = s === 'ชำระแล้ว';
    const isCancelled = s === 'ยกเลิก';
    const rowIdx      = allRows.indexOf(r);
    return `<tr>
      <td><b style="color:var(--blue);font-size:12px">${r.ref}</b></td>
      <td style="font-size:12px;white-space:nowrap">${r.timestamp||'—'}</td>
      <td class="hide-mobile" style="white-space:nowrap">${r.visitDate||'—'}</td>
      <td>
        <div style="font-weight:600">${r.visitorName}</div>
        <div style="font-size:11px;color:var(--text2)">${r.visitorPhone||''}</div>
      </td>
      <td class="hide-mobile">
        <div style="font-weight:600">${r.prisonerName}</div>
        <div style="font-size:11px;color:var(--text2)">#${r.prisonerId}</div>
      </td>
      <td class="hide-mobile">${r.wing||'—'}</td>
      <td class="hide-mobile">
        <div>${r.visitorCount} คน</div>
        <div style="font-weight:700;color:var(--blue)">${(r.total||0).toLocaleString()} บ.</div>
      </td>
      <td><span class="badge ${badgeClass}">${r.status}</span></td>
      <td>
        <div class="action-btns">
          ${isWait ? `
            <button class="btn-approve" onclick="updateStatus(${rowIdx},'รอชำระเงิน')">✓ อนุมัติ</button>
            <button class="btn-reject"  onclick="updateStatus(${rowIdx},'ไม่อนุมัติ')">✗ ปฏิเสธ</button>
          ` : ''}
          ${isPaid ? `
            <button class="btn-confirm-pay" onclick="confirmPayment(${rowIdx})">💳 ยืนยันชำระเงิน</button>
            <button class="btn-reject-pay" onclick="rejectPayment(${rowIdx})">✗ ปฏิเสธ</button>
          ` : ''}
          ${!isCancelled ? `<button class="btn-cancel" onclick="cancelBooking(${rowIdx})">🚫 ยกเลิก</button>` : ''}
          <button class="btn-slip" onclick="viewSlip(${rowIdx})">🧾 สลิป</button>
          <button class="btn-slip" style="background:var(--blue-light);color:var(--blue);border-color:var(--blue)" onclick="viewDetail(${rowIdx})">📋 รายละเอียด</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  renderPagination(totalPages, totalFiltered);
}

function changePage(p) {
  if (p < 1) return;
  currentPage = p;
  renderTable();
}

function changePageSize(newSize) {
  pageSize = parseInt(newSize, 10) || 10;
  currentPage = 1;
  renderTable();
}

function resetToFirstPage() {
  currentPage = 1;
}

function renderPagination(totalPages, totalFiltered) {
  const container = document.getElementById('pagination');
  if (!container) return;
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalFiltered);
  let html = `
    <div class="pagination-bar">
      <div class="page-size">
        แสดง 
        <select onchange="changePageSize(this.value)">
          <option value="5" ${pageSize===5?'selected':''}>5</option>
          <option value="10" ${pageSize===10?'selected':''}>10</option>
          <option value="20" ${pageSize===20?'selected':''}>20</option>
          <option value="50" ${pageSize===50?'selected':''}>50</option>
        </select>
        รายการ
      </div>
      <div class="page-info">หน้า ${currentPage} / ${totalPages} <span style="color:var(--text2)">(${startItem}-${endItem} จาก ${totalFiltered})</span></div>
      <div class="page-nav">
        <button onclick="changePage(${currentPage-1})" ${currentPage===1 ? 'disabled' : ''}>←</button>
  `;
  // page number buttons (compact)
  const maxButtons = 5;
  let startP = Math.max(1, currentPage - Math.floor(maxButtons/2));
  let endP = Math.min(totalPages, startP + maxButtons - 1);
  if (endP - startP + 1 < maxButtons) startP = Math.max(1, endP - maxButtons + 1);
  if (startP > 1) {
    html += `<button onclick="changePage(1)">1</button>`;
    if (startP > 2) html += `<span class="page-ellipsis">…</span>`;
  }
  for (let p = startP; p <= endP; p++) {
    if (p === currentPage) {
      html += `<span class="page-current">${p}</span>`;
    } else {
      html += `<button onclick="changePage(${p})">${p}</button>`;
    }
  }
  if (endP < totalPages) {
    if (endP < totalPages - 1) html += `<span class="page-ellipsis">…</span>`;
    html += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
  }
  html += `
        <button onclick="changePage(${currentPage+1})" ${currentPage===totalPages ? 'disabled' : ''}>→</button>
      </div>
    </div>`;
  container.innerHTML = html;
}

// ===== UPDATE STATUS =====
async function updateStatus(idx, newStatus) {
  const row = allRows[idx];
  if (!confirm(`ยืนยัน: ${newStatus} การจองของ "${row.visitorName}" ?`)) return;
  row.status = newStatus;
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', ref: row.ref, status: newStatus, pass: PASSWORD })
    });
  } catch(e) { /* demo mode */ }
  updateStats();
  renderTable();
}

// ===== CONFIRM PAYMENT (ยืนยันการชำระเงิน) =====
async function confirmPayment(idx) {
  const row = allRows[idx];
  if (!confirm(`ยืนยันการชำระเงินสำหรับ "${row.visitorName}" (${row.ref}) ?\nสถานะจะเปลี่ยนเป็น "เสร็จสิ้น"`)) return;
  row.status = 'เสร็จสิ้น';
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', ref: row.ref, status: 'เสร็จสิ้น', pass: PASSWORD })
    });
  } catch(e) { /* demo mode */ }
  updateStats();
  renderTable();
}

// ===== REJECT PAYMENT (ปฏิเสธการชำระเงิน) =====
async function rejectPayment(idx) {
  const row = allRows[idx];
  const reason = prompt(`ปฏิเสธการชำระเงินของ "${row.visitorName}" (${row.ref})\n\nเหตุผล (ถ้ามี):`, '');
  if (reason === null) return; // User cancelled
  row.status = 'รอชำระเงิน'; // Back to waiting for payment
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', ref: row.ref, status: 'รอชำระเงิน', pass: PASSWORD })
    });
  } catch(e) { /* demo mode */ }
  alert('ปฏิเสธการชำระเงินแล้ว (สถานะกลับไปเป็น "รอชำระเงิน")');
  updateStats();
  renderTable();
}

// ===== CANCEL BOOKING =====
async function cancelBooking(idx) {
  const row = allRows[idx];
  if (!confirm(`⚠️ ยืนยันการยกเลิกการจอง\n\nRef: ${row.ref}\nผู้เยี่ยม: ${row.visitorName}\nสถานะปัจจุบัน: ${row.status}\n\nการยกเลิกไม่สามารถกู้คืนได้`)) return;
  row.status = 'ยกเลิก';
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'cancelBooking', ref: row.ref, pass: PASSWORD })
    });
  } catch(e) { /* demo mode */ }
  updateStats();
  renderTable();
}

/* ===== Per-visitor approval (update + recalc price + overwrite row) ===== */
async function updateVisitorApproval(idx, pidx, val) {
  const row = allRows[idx];
  if (!row) return;
  if (pidx === 0) {
    row.visitorApproved = val;
  } else {
    let arr = String(row.extraVisitorApproved || '').split(';;');
    const n = row.extraVisitorNames ? row.extraVisitorNames.split(';;').filter(x=>x.trim()).length : 0;
    while(arr.length < n) arr.push('');
    arr[pidx-1] = val;
    row.extraVisitorApproved = arr.join(';;');
  }
  // Consistent recalc: approved relatives + always 1 prisoner
  let approvedRel = ((row.visitorApproved || '') === 'yes' ? 1 : 0);
  if (row.extraVisitorApproved) {
    approvedRel += String(row.extraVisitorApproved).split(';;').filter(v => (v||'').trim().toLowerCase() === 'yes').length;
  }
  row.visitorCount = approvedRel;
  row.total = (approvedRel + 1) * 1000;  // relatives + prisoner
  try {
    await fetch(APPS_SCRIPT_URL, { method:'POST', redirect:'follow', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({ action:'updateVisitorApproval', ref:row.ref, visitorApproved: row.visitorApproved||'', extraVisitorApproved: row.extraVisitorApproved||'', visitorCount: row.visitorCount, total: row.total, pass: PASSWORD }) });
  } catch(e){}
  viewDetail(idx);
  renderTable();
}

/* ===== Visitor per-person approval helpers ===== */
function getApprLabel(v){ return v==='yes' ? '✅ เข้าได้' : v==='no' ? '❌ เข้าไม่ได้' : '⏳ รอตัดสิน'; }

// Normalize legacy statuses for consistent display across pages
function normalizeStatus(s) {
  const v = (s || '').toString().trim().toLowerCase();
  if (['อนุมัติ', 'approved', 'รอชำระเงิน'].includes(v)) return 'รอชำระเงิน';
  if (['rejected', 'ไม่อนุมัติ'].includes(v)) return 'ไม่อนุมัติ';
  if (['paid', 'ชำระแล้ว'].includes(v)) return 'ชำระแล้ว';
  if (['done', 'เสร็จสิ้น'].includes(v)) return 'เสร็จสิ้น';
  if (v === 'ยกเลิก') return 'ยกเลิก';
  return s || 'รอตรวจสอบ';
}

function viewSlip(idx) {
  const row = allRows[idx];
  const modalBody = document.getElementById('modalBody');
  const slip = (row.slipImage || '').trim();

  const infoBox = `<div style="margin-top:10px;font-size:13px;color:var(--text2);padding:10px;background:var(--bg);border-radius:6px;">
    <b>${row.ref}</b> · ${row.visitorName}<br>
    ยอด: <b>${(row.total||0).toLocaleString()} บาท</b> · สถานะ: <b>${row.status}</b>
  </div>`;

  // ✅ ดึง fileId จาก Drive URL ทุกรูปแบบ (?id=, /d/, /open?id=)
  function extractDriveId(url) {
    const m = url.match(/(?:[?&]id=|\/d\/|\/open\?id=)([a-zA-Z0-9_-]{10,})/);
    return m ? m[1] : null;
  }

  if (slip && (slip.includes('drive.google.com') || slip.includes('googleusercontent.com'))) {
    const fileId = extractDriveId(slip);
    // ✅ ใช้ thumbnail URL สำหรับแสดง + uc?export=view เป็น fallback
    const thumbUrl = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` : slip;
    const openUrl  = fileId ? `https://drive.google.com/file/d/${fileId}/view`            : slip;

    modalBody.innerHTML = `
      <div style="text-align:center;padding:10px 10px 4px;">
        <img id="slipImg_${idx}" src="${thumbUrl}" alt="สลิปโอนเงิน"
          style="max-width:100%;max-height:480px;border-radius:8px;border:1px solid var(--border);display:block;margin:0 auto 4px;"
          onerror="document.getElementById('slipImgErr_${idx}').style.display='block';this.style.opacity='0.15';">
        <div id="slipImgErr_${idx}" style="display:none;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:8px;font-size:12px;color:#856404;margin-bottom:6px;">
          ⚠️ โหลดรูปภาพโดยตรงไม่สำเร็จ — กรุณากดปุ่มด้านล่างเพื่อเปิด
        </div>
        <a href="${openUrl}" target="_blank"
          style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:9px 20px;
            background:var(--blue);color:#fff;border-radius:8px;font-weight:600;
            text-decoration:none;font-size:13px;">
          🔗 เปิดสลิปใน Google Drive ↗
        </a>
      </div>${infoBox}`;

  } else if (slip && slip.startsWith('data:image')) {
    modalBody.innerHTML = `<img src="${slip}" alt="สลิป"
      style="max-width:100%;border-radius:8px;margin-bottom:10px;display:block;">${infoBox}`;

  } else if (slip && slip.startsWith('SLIP_UPLOADED:')) {
    modalBody.innerHTML = `<div style="padding:2rem;text-align:center;">
      <div style="font-size:32px;">✅</div>
      <div style="font-weight:600;margin-top:8px;">สลิปถูกอัปโหลดแล้ว</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px;">เวลาอัปโหลด: ${slip.replace('SLIP_UPLOADED:','')}</div>
    </div>${infoBox}`;

  } else if (slip && slip.startsWith('http')) {
    // URL ที่ไม่ใช่ Drive
    modalBody.innerHTML = `<div style="text-align:center;padding:10px;">
      <img src="${slip}" alt="สลิป"
        style="max-width:100%;border-radius:8px;display:block;margin:0 auto 8px;"
        onerror="this.style.opacity='0.1'">
      <a href="${slip}" target="_blank"
        style="display:inline-flex;align-items:center;gap:6px;padding:9px 20px;background:var(--blue);color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:13px;">
        🔗 เปิดสลิปในแท็บใหม่ ↗
      </a>
    </div>${infoBox}`;

  } else if (row.status === 'ชำระแล้ว' || row.status === 'เสร็จสิ้น') {
    modalBody.innerHTML = `<div style="padding:2rem;text-align:center;">
      <div style="font-size:32px;">⏳</div>
      <div style="font-weight:600;margin-top:8px;">ยังไม่มีรูปสลิปในระบบ</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px;">ญาติอาจยังไม่ได้อัปโหลด หรือกำลังประมวลผล</div>
    </div>${infoBox}`;
  } else {
    modalBody.innerHTML = `<div style="padding:2rem;text-align:center;">
      <div style="font-size:32px;">📋</div>
      <div style="font-weight:600;margin-top:8px;">ยังไม่มีรูปสลิป</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px;">รอให้ญาติชำระเงินและอัปโหลดสลิป</div>
    </div>${infoBox}`;
  }
  document.getElementById('modalBg').classList.add('show');
}
function closeModal(e) {
  if (!e || e.target === document.getElementById('modalBg')) {
    document.getElementById('modalBg').classList.remove('show');
  }
}

// ===== DETAIL MODAL =====
function viewDetail(idx) {
  const r = allRows[idx];
  const s = r.status || '';
  let badgeClass = 'badge-wait';
  if (s === 'รอชำระเงิน') badgeClass = 'badge-pay';
  else if (s === 'ชำระแล้ว') badgeClass = 'badge-paid';
  else if (s === 'เสร็จสิ้น') badgeClass = 'badge-done';
  else if (s === 'ไม่อนุมัติ') badgeClass = 'badge-reject';

  const va = r.visitorApproved || '';
  const visitor1Html = `
    <div class="visitor-card">
      <div class="vc-num">👤 ผู้ร่วมกิจกรรมคนที่ 1 (ผู้จอง)</div>
      <div class="vc-name">${r.visitorName || '—'}</div>
      <div class="vc-info">บัตร: ${r.visitorId || '—'} · โทร: ${r.visitorPhone || '—'} · ความสัมพันธ์: ${r.relation || '—'}</div>
      <div class="visitor-approval">
        <span class="lbl">สถานะ:</span>
        <span class="approval-badge ${va==='yes'?'yes':va==='no'?'no':'pending'}">${getApprLabel(va)}</span>
        <button class="approval-btn yes" onclick="updateVisitorApproval(${idx},0,'yes')">✓</button>
        <button class="approval-btn no" onclick="updateVisitorApproval(${idx},0,'no')">✗</button>
      </div>
    </div>`;

  let extraHtml = '';
  if (r.extraVisitorNames && r.extraVisitorNames.trim()) {
    const isNewFormat = r.extraVisitorNames.includes(';;') || r.extraVisitorNames.includes('|');
    let extras = [];
    if (isNewFormat) {
      extras = r.extraVisitorNames.split(';;').map(e => {
        const parts = e.split('|');
        return { name: (parts[0]||'').trim(), id: (parts[1]||'').trim(), relation: (parts[2]||'').trim() };
      }).filter(e => e.name);
    } else {
      extras = r.extraVisitorNames.split(/,(?![^(]*\))/).map(e => {
        const m = e.trim().match(/^(.+?)\s*\(([^,)]+?)(?:,\s*([^)]+))?\)$/);
        if (m) return { name: m[1].trim(), id: (m[2]||'').trim(), relation: (m[3]||'').trim() };
        return { name: e.trim(), id: '', relation: '' };
      }).filter(e => e.name);
    }
    extras.forEach((v, i) => {
      const infoParts = [];
      if (v.id) infoParts.push('บัตร: ' + v.id);
      if (v.relation) infoParts.push('ความสัมพันธ์: ' + v.relation);
      const ea = String(r.extraVisitorApproved || '').split(';;')[i] || '';
      extraHtml += `
        <div class="visitor-card">
          <div class="vc-num">👤 ผู้ร่วมกิจกรรมคนที่ ${i + 2}</div>
          <div class="vc-name">${v.name}</div>
          ${infoParts.length ? '<div class="vc-info">' + infoParts.join(' · ') + '</div>' : ''}
          <div class="visitor-approval">
            <span class="lbl">สถานะ:</span>
            <span class="approval-badge ${ea==='yes'?'yes':ea==='no'?'no':'pending'}">${getApprLabel(ea)}</span>
            <button class="approval-btn yes" onclick="updateVisitorApproval(${idx},${i+1},'yes')">✓</button>
            <button class="approval-btn no" onclick="updateVisitorApproval(${idx},${i+1},'no')">✗</button>
          </div>
        </div>`;
    });
  }

  const totalPersons = (parseInt(r.visitorCount) || 1) + 1;
  const total = parseInt(r.total) || totalPersons * 1000;

  document.getElementById('detailModalBody').innerHTML = `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:2px;">เลขอ้างอิง</div>
        <div style="font-size:20px;font-weight:700;color:var(--blue);letter-spacing:2px;">${r.ref || '—'}</div>
      </div>
      <span class="badge ${badgeClass}" style="font-size:13px;padding:6px 14px;">${s}</span>
    </div>

    <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">ผู้ร่วมกิจกรรมทั้งหมด (${r.visitorCount || 1} คน)</div>
    ${visitor1Html}
    ${extraHtml}

    <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-top:8px;">
      <div class="detail-row">
        <span class="dlbl">🔒 ผู้ต้องขัง</span>
        <span class="dval">${r.prisonerName || '—'} <span style="color:var(--text2);font-weight:400">(#${r.prisonerId || '—'})</span></span>
      </div>
      <div class="detail-row">
        <span class="dlbl">🏢 แดน</span>
        <span class="dval">${r.wing || '—'}</span>
      </div>
      <div class="detail-row">
        <span class="dlbl">📅 วันที่เยี่ยม</span>
        <span class="dval">${r.visitDate || '—'}</span>
      </div>
      <div class="detail-row">
        <span class="dlbl">👥 จำนวนรวม</span>
        <span class="dval">ญาติ ${r.visitorCount || '—'} + ผู้ต้องขัง 1 = ${totalPersons} คน</span>
      </div>
      <div class="detail-row">
        <span class="dlbl">💰 ค่าบริการอาหาร</span>
        <span class="dval" style="color:var(--blue);font-size:15px;">${total.toLocaleString()} บาท</span>
      </div>
      <div class="detail-row">
        <span class="dlbl">🕐 จองเมื่อ</span>
        <span class="dval">${r.timestamp || '—'}</span>
      </div>
    </div>
  `;
  document.getElementById('detailModalBg').classList.add('show');
}

function closeDetailModal(e) {
  if (!e || e.target === document.getElementById('detailModalBg')) {
    document.getElementById('detailModalBg').classList.remove('show');
  }
}

// ===== EXPORT FILTERED DATA AS CSV =====
function exportFilteredCSV() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const fs = document.getElementById('filterStatus').value;
  const fd = document.getElementById('filterDate').value;

  const filtered = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false;
    if (fs && r.status !== fs) return false;
    if (fd && r.visitDate !== fd) return false;
    if (q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    return true;
  });

  if (!filtered.length) {
    alert('ไม่มีข้อมูลตาม filter ที่เลือก');
    return;
  }

  const headers = ['ref','timestamp','visitorName','visitorPhone','visitorId','relation','prisonerName','prisonerId','wing','visitDate','visitorCount','total','status','extraVisitorNames','visitorApproved','extraVisitorApproved'];
  let csvContent = headers.join(',') + '\r\n';

  filtered.forEach(r => {
    const row = headers.map(h => {
      let val = r[h] != null ? String(r[h]) : '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    });
    csvContent += row.join(',') + '\r\n';
  });

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel Thai
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CC_Cafe_Reservations_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

document.addEventListener('keydown', e => { if(e.key==='Escape') { closeModal(); closeDetailModal(); } });
document.getElementById('passInput').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
