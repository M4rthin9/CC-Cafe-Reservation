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
    switchView('home');
    renderDashboardHome();
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
  // reset views to home
  const h = document.getElementById('view-home');
  const r = document.getElementById('view-reservations');
  if (h) h.style.display = '';
  if (r) r.style.display = 'none';
  document.querySelectorAll('.sb-link').forEach(a => a.classList.toggle('active', a.getAttribute('data-view') === 'home'));
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
  renderDashboardHome();
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

function switchView(v) {
  document.querySelectorAll('.view').forEach(el => {
    el.style.display = (el.id === 'view-' + v) ? '' : 'none';
  });
  document.querySelectorAll('.sb-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('data-view') === v);
  });
  if (v === 'reservations' && allRows.length > 0) {
    renderTable();
  }
  if (v === 'home') {
    renderDashboardHome();
  }
}

function renderDashboardHome() {
  const container = document.getElementById('statusBars');
  const recentEl = document.getElementById('recentBookings');
  if (!container || !recentEl) return;

  const total = allRows.length;
  const counts = {};
  allRows.forEach(r => {
    const s = normalizeStatus(r.status);
    counts[s] = (counts[s] || 0) + 1;
  });

  const order = ['รอตรวจสอบ', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น', 'ไม่อนุมัติ', 'ยกเลิก'];
  const cols = ['#b45309', '#1a56db', '#0369a1', '#166534', '#dc2626', '#6b7280'];
  let bars = '';
  const max = Math.max(1, ...Object.values(counts));
  order.forEach((s, i) => {
    const c = counts[s] || 0;
    const pct = total ? Math.round((c / total) * 100) : 0;
    const w = Math.round((c / max) * 100);
    bars += `<div class="status-bar">
      <div class="status-bar-label">${s}</div>
      <div class="status-bar-track"><div class="status-bar-fill" style="width:${w}%;background:${cols[i]}"></div></div>
      <div class="status-bar-val">${c} <span style="font-size:10px;opacity:.6">(${pct}%)</span></div>
    </div>`;
  });
  container.innerHTML = bars || '<div style="color:#888;font-size:12px">ไม่มีข้อมูล</div>';

  // recent 5
  if (!total) {
    recentEl.innerHTML = '<div style="color:#888;font-size:12px">ยังไม่มีข้อมูล</div>';
    return;
  }
  let rhtml = '';
  allRows.slice(0, 5).forEach(r => {
    const idx = allRows.indexOf(r);
    const s = normalizeStatus(r.status);
    let bcls = 'badge-wait';
    if (s === 'รอชำระเงิน') bcls = 'badge-pay';
    else if (s === 'ชำระแล้ว') bcls = 'badge-paid';
    else if (s === 'เสร็จสิ้น') bcls = 'badge-done';
    else if (s === 'ไม่อนุมัติ') bcls = 'badge-reject';
    else if (s === 'ยกเลิก') bcls = 'badge-cancel';
    rhtml += `<div onclick="viewDetail(${idx});switchView('reservations')" style="padding:5px 2px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;gap:8px;align-items:center;">
      <div style="flex:1;min-width:0"><b style="font-size:12px">${r.ref}</b><div style="font-size:11px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.visitorName || ''}</div></div>
      <div><span class="badge ${bcls}" style="font-size:10px;padding:1px 7px">${s}</span></div>
    </div>`;
  });
  recentEl.innerHTML = rhtml;
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
  renderDashboardHome();
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
  renderDashboardHome();
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
  renderDashboardHome();
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
  renderDashboardHome();
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

// ===== HELPER: Parse extra visitors (same logic as detail view) =====
function parseExtraVisitors(row) {
  if (!row || !row.extraVisitorNames || !String(row.extraVisitorNames).trim()) return [];
  const str = String(row.extraVisitorNames);
  const isNew = str.includes(';;') || str.includes('|');
  if (isNew) {
    return str.split(';;').map(e => {
      const p = e.split('|');
      return { name: (p[0]||'').trim(), id: (p[1]||'').trim(), relation: (p[2]||'').trim() };
    }).filter(e => e.name);
  } else {
    return str.split(/,(?![^(]*\))/).map(e => {
      const m = e.trim().match(/^(.+?)\s*\(([^,)]+?)(?:,\s*([^)]+))?\)$/);
      if (m) return { name: m[1].trim(), id: (m[2]||'').trim(), relation: (m[3]||'').trim() };
      return { name: e.trim(), id: '', relation: '' };
    }).filter(e => e.name);
  }
}

// ===== HELPER: Get current filtered & sorted rows (respects UI filters) =====
function getCurrentFilteredSorted() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const fs = document.getElementById('filterStatus').value;
  const fd = document.getElementById('filterDate').value;

  let filtered = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false;
    if (fs && r.status !== fs) return false;
    if (fd && r.visitDate !== fd) return false;
    if (q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    return true;
  });

  if (!filtered.length) return [];
  return [...filtered].sort((a, b) => String(a.ref || '').localeCompare(String(b.ref || '')));
}

// ===== PRINT REPORT: Sorted by Ref No. (respects current filters) =====
function printReport() {
  const filtered = getCurrentFilteredSorted();
  if (!filtered.length) {
    alert('ไม่มีข้อมูลตาม filter ที่เลือก');
    return;
  }

  const now = new Date().toLocaleString('th-TH');

  // Calculate grand totals
  let totalVisitors = 0;
  let totalPrice = 0;
  filtered.forEach(r => {
    const cnt = parseInt(r.visitorCount) || 1;
    const prc = parseInt(r.total) || (cnt * 1000);
    totalVisitors += cnt;
    totalPrice += prc;
  });
  const totalPrisoners = filtered.length;

  let html = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายงานการจอง CC Cafe</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');
  body { font-family: 'Sarabun', system-ui, sans-serif; padding: 20px 24px; margin:0; color:#000; background:#fff; line-height:1.45; font-size:14px; }
  h1 { font-size:20px; margin:0 0 4px; font-weight:700; text-align:center; }
  .meta { font-size:12px; color:#333; text-align:center; margin-bottom:16px; }
  .ref-block { 
    margin-bottom:18px; 
    page-break-inside: avoid; 
    border: 2px solid #000; 
    padding: 10px 12px; 
    border-radius: 6px; 
    background:#fff; 
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .ref-num { 
    display: inline-block; 
    background: #0f766e; 
    color: #fff; 
    padding: 3px 10px; 
    border-radius: 4px; 
    font-size: 13px; 
    font-weight: 700; 
    margin-right: 8px;
  }
  .section { 
    margin-top: 8px; 
    border: 1px solid #555; 
    padding: 7px 9px; 
    border-radius: 4px; 
    background: #f8f9fa;
  }
  .section.prisoner { background: #f0f7f0; border-color: #166534; }
  .section-title { 
    font-weight: 700; 
    font-size: 13px; 
    margin-bottom: 4px; 
    color: #0f766e; 
  }
  .section.prisoner .section-title { color: #166534; }
  .info-line { margin: 2px 0; font-size: 13px; }
  .info-line b { font-size: 14px; }
  .extra-box { 
    margin-top: 7px; 
    background: #fff8e7; 
    border: 1px solid #b45309; 
    padding: 6px 8px; 
    border-radius: 4px; 
  }
  .extra-title { 
    font-weight: 700; 
    font-size: 12px; 
    color: #92400e; 
    margin-bottom: 3px; 
  }
  .extra-line { 
    font-size: 12.5px; 
    padding-left: 8px; 
    margin: 2px 0; 
  }
  .price-box { 
    margin-top: 10px; 
    text-align: right; 
    background: #fefce8; 
    border: 3px solid #854d0e; 
    padding: 8px 12px; 
    border-radius: 5px; 
  }
  .price-box .small { font-size: 12px; color: #713f12; }
  .price-box .big { 
    font-size: 16px; 
    font-weight: 800; 
    color: #713f12; 
    margin-top: 2px; 
  }
  .grand-summary { 
    margin-top: 30px; 
    page-break-before: always; 
    text-align: center; 
  }
  .grand-box { 
    display: inline-block; 
    border: 5px solid #000; 
    padding: 18px 28px; 
    font-size: 16px; 
    line-height: 1.8; 
    background: #fff; 
    text-align: left; 
    min-width: 380px;
  }
  .grand-box .label { font-size: 15px; }
  .grand-box .number { font-size: 22px; font-weight: 800; }
  .grand-box .total-line { 
    margin-top: 10px; 
    padding-top: 10px; 
    border-top: 3px solid #000; 
    font-size: 18px; 
    font-weight: 800; 
  }
  .note { 
    text-align: center; 
    font-size: 11px; 
    color: #444; 
    margin: 12px 0; 
    font-style: italic; 
  }
  @media print {
    @page { size: A4; margin: 10mm 8mm; }
    body { padding: 4mm 6mm; font-size: 10.5px; line-height: 1.28; }
    h1 { font-size: 14px; margin-bottom: 1px; }
    .meta { font-size: 9.5px; margin-bottom: 6px; }
    .note { display: none; } /* hide note in print to save space */
    .ref-block { 
      padding: 5px 7px; 
      margin-bottom: 4mm; 
      border-width: 1.5px;
    }
    .ref-num { 
      padding: 2px 6px; 
      font-size: 10px; 
      margin-right: 5px;
    }
    .section { 
      margin-top: 3px; 
      padding: 3px 5px; 
      border-width: 0.8px;
    }
    .section-title { font-size: 10.5px; margin-bottom: 1px; }
    .info-line { margin: 1px 0; font-size: 10.5px; }
    .info-line b { font-size: 11px; }
    .extra-box { margin-top: 3px; padding: 3px 5px; }
    .extra-title { font-size: 10px; margin-bottom: 1px; }
    .extra-line { font-size: 10px; padding-left: 4px; margin: 1px 0; }
    .price-box { 
      margin-top: 4px; 
      padding: 4px 6px; 
      border-width: 2px;
    }
    .price-box .small { font-size: 9.5px; }
    .price-box .big { font-size: 12px; }
    .grand-summary { margin-top: 6mm; }
    .grand-box { 
      padding: 8px 12px; 
      font-size: 11.5px; 
      line-height: 1.5;
      min-width: 320px;
      border-width: 3px;
    }
    .grand-box .label { font-size: 11px; }
    .grand-box .number { font-size: 15px; }
    .grand-box .total-line { font-size: 13px; margin-top: 4px; padding-top: 4px; }
    .grand-box > div:first-child { font-size: 12px !important; margin-bottom: 4px !important; }
  }
</style></head><body>`;

  html += `<h1>รายงานการจองกิจกรรม<br>ร้าน Chance & Change Cafe</h1>`;
  html += `<div class="meta">ทัณฑสถานบำบัดพิเศษกลาง • พิมพ์เมื่อ ${now} • เรียงตามเลขที่อ้างอิง</div>`;
  html += `<div class="note">รายงานนี้แสดงข้อมูลการจองแต่ละเลขที่ กรุณาตรวจสอบให้ถูกต้องก่อนนำไปใช้</div>`;

  filtered.forEach((r, i) => {
    const extras = parseExtraVisitors(r);
    const people = parseInt(r.visitorCount) || 1;
    const price = parseInt(r.total) || (people * 1000);

    html += `<div class="ref-block">`;

    // Header with number and ref
    html += `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">`;
    html += `<div><span class="ref-num">รายการที่ ${i+1}</span> <span style="font-size:13px; font-weight:800;">เลขที่ ${r.ref}</span></div>`;
    html += `<div style="font-size:10.5px; text-align:right; color:#333;">วันที่นัด: <b>${r.visitDate || '-'}</b></div>`;
    html += `</div>`;

    // Prisoner (first, renamed per request)
    html += `<div class="section prisoner">`;
    html += `<div class="section-title">ชื่อผู้ต้องขัง</div>`;
    html += `<div class="info-line">ชื่อ: <b>${r.prisonerName || '-'}</b></div>`;
    html += `<div class="info-line">เลขประจำตัว: ${r.prisonerId || '-'}</div>`;
    html += `<div class="info-line">แดนที่อยู่: ${r.wing || '-'}</div>`;
    html += `</div>`;

    // Main visitor (ผู้จองหลัก) - after prisoner
    html += `<div class="section">`;
    html += `<div class="section-title">👤 ผู้จองหลัก (คนที่กรอกข้อมูล)</div>`;
    html += `<div class="info-line">ชื่อ-นามสกุล: <b>${r.visitorName || '-'}</b></div>`;
    html += `<div class="info-line">โทรศัพท์: ${r.visitorPhone || '-'}</div>`;
    html += `<div class="info-line">เลขบัตรประชาชน: ${r.visitorId || '-'}</div>`;
    html += `<div class="info-line">ความสัมพันธ์กับผู้ต้องขัง: ${r.relation || '-'}</div>`;
    html += `</div>`;

    // Extra visitors - very simple for elderly
    if (extras.length > 0) {
      html += `<div class="extra-box">`;
      html += `<div class="extra-title">👥 ผู้เข้าร่วมเพิ่มเติม (${extras.length} คน)</div>`;
      extras.forEach((e, ei) => {
        html += `<div class="extra-line">• ${e.name || '-'} &nbsp;&nbsp;บัตร: ${e.id || '-'} &nbsp;&nbsp;ความสัมพันธ์: ${e.relation || '-'}</div>`;
      });
      html += `</div>`;
    }

    // Total people for this booking + PRICE on right bottom (big and clear)
    html += `<div class="price-box">`;
    html += `<div class="small">รวมผู้เข้าร่วมในรายการนี้ <b>${people} คน</b></div>`;
    html += `<div class="big" style="font-size:14px;">ค่าบริการรายการนี้: ${price.toLocaleString('th-TH')} บาท</div>`;
    html += `</div>`;

    html += `</div>`; // end ref-block
  });

  // ========== GRAND TOTAL SUMMARY (last page, very clear for elderly) ==========
  html += `<div class="grand-summary">`;
  html += `<div class="grand-box">`;
  html += `<div style="font-size:15px; font-weight:800; margin-bottom:8px; border-bottom:2px solid #000; padding-bottom:4px; text-align:center;">📋 สรุปยอดรวมทั้งหมด</div>`;

  html += `<div class="label">จำนวนผู้เข้าร่วมกิจกรรมทั้งหมด</div>`;
  html += `<div class="number">${totalVisitors} คน</div>`;

  html += `<div class="label" style="margin-top:8px;">จำนวนผู้ต้องขังที่เยี่ยมทั้งหมด</div>`;
  html += `<div class="number">${totalPrisoners} คน</div>`;

  html += `<div class="total-line">`;
  html += `ยอดรวมค่าบริการทั้งหมด<br>`;
  html += `<span style="font-size:26px; font-weight:900;">${totalPrice.toLocaleString('th-TH')} บาท</span>`;
  html += `</div>`;
  html += `</div>`;

  html += `<div style="margin-top:14px; font-size:11px; color:#444;">(ค่าบริการ 1,000 บาท ต่อ 1 คน รวมผู้ต้องขัง)</div>`;
  html += `<div style="margin-top:20px; font-size:10px; color:#555;">พิมพ์จากระบบเจ้าหน้าที่ • ทัณฑสถานบำบัดพิเศษกลาง • ${now}</div>`;
  html += `</div>`;

  html += `</body></html>`;

  const w = window.open('', '_blank', 'width=1200,height=850');
  if (!w) {
    alert('กรุณาอนุญาต Popup เพื่อเปิดหน้าพิมพ์รายงาน');
    return;
  }
  w.document.write(html);
  w.document.close();

  setTimeout(() => {
    try { w.focus(); w.print(); } catch(e){}
  }, 650);
}

// ===== PRINT PRISONER LIST FOR วินัย CHECK (only name, ID, Wing) =====
function printPrisonerVinaiList() {
  const filtered = getCurrentFilteredSorted();
  if (!filtered.length) {
    alert('ไม่มีข้อมูลตาม filter ที่เลือก');
    return;
  }

  const now = new Date().toLocaleString('th-TH');
  const filterDate = document.getElementById('filterDate').value || 'ทุกวัน';

  let html = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายชื่อผู้ต้องขัง - ตรวจสอบวินัย ${filterDate}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
  body { font-family: 'Sarabun', system-ui, sans-serif; padding: 16px 20px; margin:0; color:#000; background:#fff; font-size:15px; }
  h1 { font-size:18px; margin:0 0 2px; font-weight:700; text-align:center; line-height:1.3; }
  .meta { font-size:11px; color:#333; text-align:center; margin-bottom:12px; }
  table { width:100%; border-collapse:collapse; margin-top:4px; }
  th, td { border:1.5px solid #000; padding:6px 8px; text-align:left; }
  th { background:#f1f5f9; font-weight:700; font-size:13px; }
  td { font-size:14px; }
  .num { width:42px; text-align:center; }
  .note { margin-top:12px; font-size:11px; color:#444; text-align:center; font-style:italic; }
  @media print {
    @page { size: A4; margin: 8mm; }
    body { padding: 4mm 6mm; font-size:12px; }
    h1 { font-size:15px; }
    th, td { padding:4px 6px; font-size:12px; }
    .note { display:none; }
  }
</style></head><body>`;

  html += `<h1>รายชื่อผู้ต้องขัง - ตรวจสอบวินัย<br><span style="font-size:14px; font-weight:500;">วันที่ ${filterDate}</span></h1>`;
  html += `<div class="meta">ทัณฑสถานบำบัดพิเศษกลาง • พิมพ์เมื่อ ${now}</div>`;

  html += `<table>`;
  html += `<thead><tr>`;
  html += `<th class="num">ลำดับ</th>`;
  html += `<th>ชื่อผู้ต้องขัง</th>`;
  html += `<th>เลขประจำตัว</th>`;
  html += `<th>แดนที่อยู่</th>`;
  html += `</tr></thead><tbody>`;

  filtered.forEach((r, i) => {
    html += `<tr>`;
    html += `<td class="num">${i+1}</td>`;
    html += `<td><b>${r.prisonerName || '-'}</b></td>`;
    html += `<td>${r.prisonerId || '-'}</td>`;
    html += `<td>${r.wing || '-'}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  html += `<div class="note">สำหรับใช้ตรวจสอบวินัย • ข้อมูลจากระบบการจอง CC Cafe</div>`;
  html += `</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    alert('กรุณาอนุญาต Popup เพื่อเปิดหน้าพิมพ์');
    return;
  }
  w.document.write(html);
  w.document.close();

  setTimeout(() => {
    try { w.focus(); w.print(); } catch(e){}
  }, 400);
}

document.addEventListener('keydown', e => { if(e.key==='Escape') { closeModal(); closeDetailModal(); } });
document.getElementById('passInput').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
