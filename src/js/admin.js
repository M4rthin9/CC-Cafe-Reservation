// ===== CONFIG =====
const PASSWORD = '10900';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxG-5FV4YqoxTKYDOT5oFmsMmkB6ereIdg5TztHuJWLoaCEzq0NWXsrv17cfLUwfpN4Ug/exec';

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
    // Use legacy password-only authentication (no username required)
    const resp = await fetch(APPS_SCRIPT_URL + '?action=getAll&pass=' + encodeURIComponent(PASSWORD), { redirect: 'follow' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    const data = JSON.parse(text);
    if (data.status !== 'ok') throw new Error(data.message || 'Unknown error');
    allRows = data.rows || [];
    document.getElementById('lastUpdated').textContent = 'อัพเดทล่าสุด: ' + new Date().toLocaleString('th-TH');
  } catch(e) {
    console.error('Load data error:', e);
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

  if (v === 'reservations') {
    renderTable();
  } else if (v === 'reports') {
    populateReportsDateFilter();
    renderReportsView();
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

  // === New: Horizontal Stacked Bar (cleaner overview) ===
  const order = ['รอตรวจสอบ', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น', 'ไม่อนุมัติ', 'ยกเลิก'];
  const cols = ['#D4AF37', '#0B2545', '#0A203D', '#2E5238', '#8B0000', '#6B7280'];

  let stackedHTML = `<div class="status-stacked">`;
  let legendHTML = `<div class="status-legend">`;

  order.forEach((s, i) => {
    const c = counts[s] || 0;
    const pct = total ? Math.round((c / total) * 100) : 0;

    if (c > 0) {
      stackedHTML += `<div class="status-segment" style="width:${pct}%; background:${cols[i]}" title="${s}: ${c} (${pct}%)"></div>`;
    }

    legendHTML += `
      <div class="legend-item">
        <span class="legend-dot" style="background:${cols[i]}"></span>
        <span>${s}</span>
        <strong>${c}</strong>
      </div>`;
  });

  stackedHTML += `</div>`;
  legendHTML += `</div>`;

  container.innerHTML = `
    ${stackedHTML}
    ${legendHTML}
    <div style="font-size:11px;color:var(--text2);margin-top:6px;text-align:right;">
      รวม ${total} รายการ
    </div>
  `;

  // recent 5
  if (!total) {
    recentEl.innerHTML = '<div style="color:#888;font-size:12px">ยังไม่มีข้อมูล</div>';
    document.getElementById('statUniquePrisoners').textContent = '0';
    document.getElementById('statThisWeek').textContent = '0';
    document.getElementById('statThisMonth').textContent = '0';
    document.getElementById('statUniqueVisitors').textContent = '0';
    const chartEl = document.getElementById('trendChart');
    if (chartEl) chartEl.getContext && chartEl.getContext('2d').clearRect(0,0,chartEl.width,chartEl.height);
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

  // ===== NEW: Additional professional metrics =====
  const uniquePrisoners = new Set();
  const uniqueVisitors = new Set();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  startOfWeek.setHours(0,0,0,0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let weekCount = 0, monthCount = 0;

  allRows.forEach(r => {
    if (r.prisonerId) uniquePrisoners.add(String(r.prisonerId).trim());
    const vid = r.visitorId || r.visitorName;
    if (vid) uniqueVisitors.add(String(vid).trim());

    // Prefer ISO date for accuracy
    let visitKey = r.visitDateISO;
    if (!visitKey && r.visitDate) {
      // Fallback: try to parse Thai date (rough) or use timestamp date
      const ts = r.timestamp ? new Date(r.timestamp.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')) : null;
      if (ts && !isNaN(ts)) visitKey = ts.toISOString().slice(0,10);
    }
    if (visitKey) {
      const vDate = new Date(visitKey);
      if (!isNaN(vDate)) {
        if (vDate >= startOfWeek) weekCount++;
        if (vDate >= startOfMonth) monthCount++;
      }
    }
  });

  const uniqueP = document.getElementById('statUniquePrisoners');
  const thisWeekEl = document.getElementById('statThisWeek');
  const thisMonthEl = document.getElementById('statThisMonth');
  const uniqueV = document.getElementById('statUniqueVisitors');

  if (uniqueP) uniqueP.textContent = uniquePrisoners.size;
  if (thisWeekEl) thisWeekEl.textContent = weekCount;
  if (thisMonthEl) thisMonthEl.textContent = monthCount;
  if (uniqueV) uniqueV.textContent = uniqueVisitors.size;

  // Last updated in header
  const lastUpdatedEl = document.getElementById('overviewLastUpdated');
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = 'อัปเดต ' + new Date().toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' });
  }

  // Trend Chart
  drawReservationTrendChart();
}

let trendDataCache = []; // for hover detection

function drawReservationTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Aggregate last 14 days
  const dateCounts = {};
  const today = new Date();
  const days = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(key);
    dateCounts[key] = 0;
  }

  allRows.forEach(r => {
    let key = r.visitDateISO;
    if (!key && r.visitDate) {
      const ts = r.timestamp ? new Date(r.timestamp.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')) : null;
      if (ts && !isNaN(ts)) key = ts.toISOString().slice(0, 10);
    }
    if (key && dateCounts.hasOwnProperty(key)) dateCounts[key]++;
  });

  const values = days.map(d => dateCounts[d]);
  const maxVal = Math.max(1, ...values);

  const w = canvas.width = canvas.offsetWidth || 620;
  const h = canvas.height = 220;
  const paddingLeft = 32;
  const paddingBottom = 28;
  const paddingTop = 18;
  const chartW = w - paddingLeft - 8;
  const chartH = h - paddingBottom - paddingTop;
  const barGap = 5;
  const barW = Math.max(6, (chartW - (days.length - 1) * barGap) / days.length);

  trendDataCache = []; // reset for hover

  // Light grid lines
  ctx.strokeStyle = 'rgba(11,37,69,0.08)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const y = paddingTop + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + chartW, y);
    ctx.stroke();
  }

  // Bars + store positions for hover
  days.forEach((day, i) => {
    const val = values[i];
    const barH = Math.max(3, Math.round((val / maxVal) * chartH));
    const x = paddingLeft + i * (barW + barGap);
    const y = h - paddingBottom - barH;

    // Store data for tooltip
    trendDataCache.push({
      x, y, width: barW, height: barH,
      date: day,
      count: val,
      label: new Date(day).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
    });

    // Navy bar
    ctx.fillStyle = val > 0 ? '#0B2545' : '#E8E0D1';
    ctx.fillRect(x, y, barW, barH);

    // Gold top accent
    if (val > 0) {
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(x, y, barW, 2.5);
    }

    // Value label
    if (val > 0) {
      ctx.fillStyle = '#1C2433';
      ctx.font = 'bold 10px Sarabun, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val, x + barW / 2, y - 5);
    }

    // Day label
    const labelDate = new Date(day);
    const label = labelDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
    ctx.fillStyle = '#3F4755';
    ctx.font = '9px Sarabun, sans-serif';
    ctx.fillText(label, x + barW / 2, h - 8);
  });

  // Y-axis max
  ctx.fillStyle = '#6B7280';
  ctx.font = '9px Sarabun, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(maxVal, paddingLeft - 6, paddingTop + 3);
}

// Simple hover tooltip for trend chart
const trendCanvas = document.getElementById('trendChart');
if (trendCanvas) {
  trendCanvas.addEventListener('mousemove', (e) => {
    if (!trendDataCache.length) return;

    const rect = trendCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let found = null;
    for (const item of trendDataCache) {
      if (mouseX >= item.x && mouseX <= item.x + item.width &&
          mouseY >= item.y && mouseY <= item.y + item.height) {
        found = item;
        break;
      }
    }

    if (found) {
      trendCanvas.style.cursor = 'pointer';
      trendCanvas.title = `${found.label} — ${found.count} รายการ`;
    } else {
      trendCanvas.style.cursor = 'default';
      trendCanvas.title = '';
    }
  });

  trendCanvas.addEventListener('mouseleave', () => {
    trendCanvas.style.cursor = 'default';
    trendCanvas.title = '';
  });
}

// Redraw trend chart on window resize (when overview is visible)
window.addEventListener('resize', () => {
  const homeView = document.getElementById('view-home');
  if (homeView && homeView.style.display !== 'none' && document.getElementById('trendChart')) {
    // debounce lightly
    clearTimeout(window._trendResizeTimer);
    window._trendResizeTimer = setTimeout(() => {
      if (typeof drawReservationTrendChart === 'function') {
        drawReservationTrendChart();
      }
    }, 120);
  }
});

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
        return { 
          name: (parts[0]||'').trim(), 
          id: (parts[1]||'').trim(), 
          relation: (parts[2]||'').trim(),
          age: (parts[3]||'').trim()
        };
      }).filter(e => e.name);
    } else {
      extras = r.extraVisitorNames.split(/,(?![^(]*\))/).map(e => {
        const m = e.trim().match(/^(.+?)\s*\(([^,)]+?)(?:,\s*([^)]+))?\)$/);
        if (m) return { name: m[1].trim(), id: (m[2]||'').trim(), relation: (m[3]||'').trim(), age: '' };
        return { name: e.trim(), id: '', relation: '', age: '' };
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
      return { 
        name: (p[0]||'').trim(), 
        id: (p[1]||'').trim(), 
        relation: (p[2]||'').trim(),
        age: (p[3]||'').trim()
      };
    }).filter(e => e.name);
  } else {
    return str.split(/,(?![^(]*\))/).map(e => {
      const m = e.trim().match(/^(.+?)\s*\(([^,)]+?)(?:,\s*([^)]+))?\)$/);
      if (m) return { name: m[1].trim(), id: (m[2]||'').trim(), relation: (m[3]||'').trim(), age: '' };
      return { name: e.trim(), id: '', relation: '', age: '' };
    }).filter(e => e.name);
  }
}

// ===== HELPER: Compute department report data (same logic as booking page) =====
function computeDeptReportData(row) {
  const n = parseInt(row.visitorCount) || 1;
  const totalPersons = n + 1;

  const extras = parseExtraVisitors(row); // now includes .age

  let adults = 1; // main visitor
  let kids5_8 = 0, kidsUnder5 = 0;
  const kids5_8Names = [], kidsUnder5Names = [];

  extras.forEach(v => {
    if (v.relation === 'บุตร / ธิดา') {
      const a = parseInt(v.age, 10);
      if (!isNaN(a)) {
        if (a < 5) {
          kidsUnder5++;
          kidsUnder5Names.push(v.name);
        } else if (a <= 8) {
          kids5_8++;
          kids5_8Names.push(v.name);
        } else {
          adults++;
        }
      } else {
        adults++;
      }
    } else {
      adults++;
    }
  });

  const total = parseInt(row.total) || totalPersons * 1000;

  return {
    n,
    totalPersons,
    adults,
    kids5_8,
    kidsUnder5,
    kids5_8Names,
    kidsUnder5Names,
    total,
    prisonerName: row.prisonerName || '—',
    prisonerId: row.prisonerId || '—',
    wing: row.wing || '—',
    visitDate: row.visitDate || '—',
    visitorName: row.visitorName || '—',
    visitorPhone: row.visitorPhone || '—',
    relation: row.relation || '—',
    ref: row.ref || '—'
  };
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

// ===== DAILY AGGREGATED DEPARTMENT REPORTS (respects current filters) =====
function renderDailyDeptReports() {
  const container = document.getElementById('dailyReportsContent');
  const section = document.getElementById('dailyReportsSection');
  if (!container || !section) return;

  const filtered = getCurrentFilteredSorted();
  if (filtered.length === 0) {
    section.style.display = 'none';
    return;
  }

  // Group by visit date
  const byDate = {};
  filtered.forEach(r => {
    const dateKey = r.visitDate || r.visitDateISO || 'ไม่ระบุวันที่';
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(r);
  });

  let html = '';

  Object.keys(byDate).sort().forEach(date => {
    const rows = byDate[date];

    let totalAdults = 0, totalKids5_8 = 0, totalKidsUnder5 = 0;
    let prisoners = [];
    let totalTables = rows.length;

    rows.forEach(r => {
      const d = computeDeptReportData(r);
      totalAdults += d.adults;
      totalKids5_8 += d.kids5_8;
      totalKidsUnder5 += d.kidsUnder5;

      if (r.prisonerName && !prisoners.includes(r.prisonerName)) {
        prisoners.push(r.prisonerName);
      }
    });

    const totalRelatives = rows.reduce((sum, r) => sum + (parseInt(r.visitorCount) || 1), 0);
    const totalPeople = totalRelatives + rows.length; // +1 prisoner per booking

    html += `
      <div style="border:1px solid var(--border); border-radius:8px; padding:12px; background:var(--bg2);">
        <div style="font-weight:700; font-size:14px; margin-bottom:6px; color:var(--blue);">${date}</div>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:8px; font-size:12px;">
          <!-- ส่วนทัณฑ์ -->
          <div style="background:#fff5f5; border:1px solid #c62828; border-radius:6px; padding:8px;">
            <strong style="color:#c62828">🚨 ส่วนทัณฑ์</strong><br>
            <div style="margin-top:4px;">${prisoners.length} คน</div>
            <div style="font-size:11px; color:#666; margin-top:2px;">${prisoners.slice(0,3).join(', ')}${prisoners.length > 3 ? ' ...' : ''}</div>
          </div>

          <!-- Table -->
          <div style="background:#fff8f0; border:1px solid #ff9800; border-radius:6px; padding:8px;">
            <strong style="color:#e65100">🪑 โต๊ะ</strong><br>
            <div style="margin-top:4px; font-weight:700;">${totalTables} โต๊ะ</div>
            <div style="font-size:11px;">รวม ${totalPeople} คน</div>
          </div>

          <!-- Kitchen -->
          <div style="background:#f0fff0; border:1px solid #2e7d32; border-radius:6px; padding:8px;">
            <strong style="color:#1b5e20">🍽️ ครัว</strong><br>
            ผู้ใหญ่: <strong>${totalAdults}</strong><br>
            เด็ก 5-8: <strong>${totalKids5_8}</strong><br>
            ต่ำกว่า 5: <strong>${totalKidsUnder5}</strong>
          </div>

          <!-- Bakery -->
          <div style="background:#fffdf5; border:1px solid #c8922a; border-radius:6px; padding:8px;">
            <strong style="color:#8d6e00">🍰 เบเกอรี่</strong><br>
            ผู้ใหญ่: <strong>${totalAdults}</strong><br>
            เด็ก 5-8: <strong>${totalKids5_8}</strong><br>
            ต่ำกว่า 5: <strong>${totalKidsUnder5}</strong>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  section.style.display = 'block';
}

function printDailyDeptReports() {
  const filtered = getCurrentFilteredSorted();
  if (filtered.length === 0) {
    alert('ไม่มีข้อมูลตาม filter ที่เลือก');
    return;
  }

  const byDate = {};
  filtered.forEach(r => {
    const dateKey = r.visitDate || r.visitDateISO || 'ไม่ระบุวันที่';
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(r);
  });

  const now = new Date().toLocaleString('th-TH');

  let html = `
    <html><head><meta charset="UTF-8">
    <title>รายงานประจำวัน - แยกตามฝ่าย</title>
    <style>
      body { font-family: 'Sarabun', sans-serif; font-size:13px; padding:20px; }
      h1 { text-align:center; margin-bottom:4px; }
      .date-block { border:2px solid #333; margin-bottom:20px; padding:12px; page-break-inside:avoid; }
      .date-title { font-size:16px; font-weight:700; border-bottom:1px solid #ccc; padding-bottom:4px; margin-bottom:8px; }
      .dept { margin-bottom:8px; padding:6px; border:1px solid #aaa; border-radius:4px; }
      .dept strong { display:block; margin-bottom:4px; }
      table { width:100%; border-collapse:collapse; margin-top:8px; }
      th, td { border:1px solid #999; padding:4px 6px; text-align:left; font-size:12px; }
    </style>
    </head><body>
    <h1>รายงานสรุปประจำวัน (แยกตามฝ่าย)</h1>
    <div style="text-align:center; margin-bottom:16px; color:#555;">พิมพ์เมื่อ ${now}</div>
  `;

  Object.keys(byDate).sort().forEach(date => {
    const rows = byDate[date];
    let totalAdults=0, total5_8=0, totalUnder5=0, prisoners=[];

    rows.forEach(r => {
      const d = computeDeptReportData(r);
      totalAdults += d.adults;
      total5_8 += d.kids5_8;
      totalUnder5 += d.kidsUnder5;
      if (r.prisonerName && !prisoners.includes(r.prisonerName)) prisoners.push(r.prisonerName);
    });

    const totalTables = rows.length;
    const totalRel = rows.reduce((s,r) => s + (parseInt(r.visitorCount)||1), 0);

    html += `<div class="date-block">`;
    html += `<div class="date-title">${date}</div>`;

    // ส่วนทัณฑ์
    html += `<div class="dept" style="border-color:#c62828;">`;
    html += `<strong style="color:#c62828">🚨 ส่วนทัณฑ์ (เบิกตัวผู้ต้องขัง)</strong>`;
    html += `จำนวน: <strong>${prisoners.length} คน</strong><br>`;
    html += prisoners.map(p => `• ${p}`).join('<br>');
    html += `</div>`;

    // Table
    html += `<div class="dept" style="border-color:#ff9800;">`;
    html += `<strong style="color:#e65100">🪑 การจัดโต๊ะ</strong>`;
    html += `จำนวนโต๊ะ: <strong>${totalTables} โต๊ะ</strong><br>`;
    html += `รวมผู้เข้าร่วม: ${totalRel + totalTables} คน (ญาติ ${totalRel} + ผู้ต้องขัง ${totalTables})<br>`;
    html += `<strong>รวมทั้งหมด: ${totalRel + totalTables} คน</strong>`;
    html += `</div>`;

    // Kitchen + Bakery (combined)
    const combinedAdults = totalAdults + totalTables;
    html += `<div class="dept" style="border-color:#2e7d32;">`;
    html += `<strong style="color:#1b5e20">🍽️🍰 ครัว + เบเกอรี่ (รวม)</strong>`;
    html += `ผู้ใหญ่ (รวมผู้ต้องขัง): <strong>${combinedAdults}</strong> คน &nbsp;&nbsp;`;
    html += `เด็ก 5-8 ปี: <strong>${total5_8}</strong> คน &nbsp;&nbsp;`;
    html += `ต่ำกว่า 5 ปี: <strong>${totalUnder5}</strong> คน`;
    html += `</div>`;

    html += `</div>`;
  });

  html += `</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

// ===== Helper: Get filtered rows for the Reports page (independent filters) =====
function getReportsFilteredRows() {
  const searchEl = document.getElementById('reportsSearchBox');
  const statusEl = document.getElementById('reportsFilterStatus');
  const dateEl   = document.getElementById('reportsFilterDate');

  const q = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const fs = statusEl ? statusEl.value : '';
  const fd = dateEl ? dateEl.value : '';

  return allRows.filter(r => {
    if (fs && r.status !== fs) return false;
    if (fd && (r.visitDate !== fd && r.visitDateISO !== fd)) return false;

    if (q) {
      const text = [
        r.ref, r.visitorName, r.visitorPhone, r.visitorId,
        r.prisonerName, r.prisonerId, r.wing, r.extraVisitorNames
      ].join(' ').toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

// ===== Populate date options for Reports page =====
function populateReportsDateFilter() {
  const select = document.getElementById('reportsFilterDate');
  if (!select || !allRows.length) return;

  const dates = [...new Set(allRows.map(r => r.visitDate || r.visitDateISO).filter(Boolean))].sort();

  // Keep current selection if possible
  const current = select.value;
  select.innerHTML = '<option value="">ทุกวัน</option>';
  dates.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    select.appendChild(opt);
  });
  if (dates.includes(current)) select.value = current;
}

// ===== NEW: Dedicated Reports View (each department as its own section/page) =====
function renderReportsView() {
  const container = document.getElementById('reportsContent');
  if (!container) return;

  // Use the reports page's own filters
  const filtered = getReportsFilteredRows();

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--text2);">ไม่พบข้อมูลตามเงื่อนไขที่กรอง<br>ลองเปลี่ยน Filter ด้านบน</div>`;
    return;
  }

  // Group by date
  const byDate = {};
  filtered.forEach(r => {
    const key = r.visitDate || r.visitDateISO || 'ไม่ระบุวันที่';
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(r);
  });

  let html = '';

  Object.keys(byDate).sort().forEach(date => {
    const rows = byDate[date];

    // Aggregate data
    let totalAdults = 0, total5_8 = 0, totalUnder5 = 0;
    const prisonerList = []; // for ส่วนทัณฑ์

    rows.forEach(r => {
      const d = computeDeptReportData(r);
      totalAdults += d.adults;
      total5_8 += d.kids5_8;
      totalUnder5 += d.kidsUnder5;

      if (r.prisonerName && !prisonerList.some(p => p.id === r.prisonerId)) {
        prisonerList.push({
          name: r.prisonerName,
          id: r.prisonerId,
          wing: r.wing || '-'
        });
      }
    });

    const totalTables = rows.length;
    const totalRelatives = rows.reduce((sum, r) => sum + (parseInt(r.visitorCount) || 1), 0);

    html += `<div style="margin-bottom:32px; border:1px solid var(--border); border-radius:10px; padding:16px; background:var(--bg2);">`;
    html += `<div style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--blue);">📅 ${date}</div>`;

    // ========== 1. ส่วนทัณฑ์ (Prisoner) - TABLE FORMAT ==========
    html += `<div style="margin-bottom:20px;">`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
    html += `<strong style="font-size:14px;color:#c62828;">🚨 รายงานส่วนทัณฑ์ (เบิกตัวผู้ต้องขัง)</strong>`;
    html += `<button onclick="printSingleReport('disciplinary', '${date}')" style="font-size:11px;padding:4px 10px;background:#c62828;color:white;border:none;border-radius:4px;cursor:pointer;">🖨️ พิมพ์</button>`;
    html += `</div>`;

    if (prisonerList.length > 0) {
      html += `<table style="width:100%;border-collapse:collapse;font-size:12px;">`;
      html += `<thead><tr style="background:#f8f8f8;">`;
      html += `<th style="border:1px solid #ddd;padding:6px;text-align:left;">ชื่อ-นามสกุล</th>`;
      html += `<th style="border:1px solid #ddd;padding:6px;text-align:left;">เลขประจำตัวผู้ต้องขัง</th>`;
      html += `<th style="border:1px solid #ddd;padding:6px;text-align:left;">แดน</th>`;
      html += `</tr></thead><tbody>`;

      prisonerList.forEach(p => {
        html += `<tr>`;
        html += `<td style="border:1px solid #ddd;padding:6px;"><strong>น.ช. ${p.name}</strong></td>`;
        html += `<td style="border:1px solid #ddd;padding:6px;">${p.id}</td>`;
        html += `<td style="border:1px solid #ddd;padding:6px;">${p.wing}</td>`;
        html += `</tr>`;
      });

      html += `</tbody></table>`;
    } else {
      html += `<div style="color:#888;font-size:12px;">ไม่มีข้อมูลผู้ต้องขัง</div>`;
    }
    html += `</div>`;

    // ========== ครัว + เบเกอรี่ (รวมเป็นอันเดียว) ==========
    const combinedAdults = totalAdults + totalTables; // ผู้ใหญ่ + ผู้ต้องขัง (นับเป็นผู้ใหญ่)

    html += `<div style="margin-bottom:20px;">`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
    html += `<strong style="font-size:14px;color:#1b5e20;">🍽️🍰 ครัว + เบเกอรี่ (เตรียมอาหารและของหวาน)</strong>`;
    html += `<button onclick="printSingleReport('kitchen-bakery', '${date}')" style="font-size:11px;padding:4px 10px;background:#2e7d32;color:white;border:none;border-radius:4px;cursor:pointer;">🖨️ พิมพ์</button>`;
    html += `</div>`;
    html += `<div style="font-size:13px;line-height:1.6;">`;
    html += `จำนวนโต๊ะ: <strong>${totalTables}</strong> โต๊ะ &nbsp;&nbsp;`;
    html += `รวมผู้เข้าร่วม: <strong>${totalRelatives + totalTables}</strong> คน (ญาติ ${totalRelatives} + ผู้ต้องขัง ${totalTables})<br>`;
    html += `ผู้ใหญ่ (รวมผู้ต้องขัง): <strong>${combinedAdults}</strong> คน &nbsp;|&nbsp; `;
    html += `เด็ก 5-8 ปี: <strong>${total5_8}</strong> คน &nbsp;|&nbsp; `;
    html += `ต่ำกว่า 5 ปี: <strong>${totalUnder5}</strong> คน`;
    html += `</div>`;
    html += `</div>`;

    // ========== 4. การจัดโต๊ะ (รายละเอียดต่อโต๊ะ) ==========
    html += `<div>`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
    html += `<strong style="font-size:14px;color:#e65100;">🪑 รายงานการจัดโต๊ะ</strong>`;
    html += `<button onclick="printSingleReport('table', '${date}')" style="font-size:11px;padding:4px 10px;background:#ff9800;color:white;border:none;border-radius:4px;cursor:pointer;">🖨️ พิมพ์</button>`;
    html += `</div>`;

    // Calculate grand total for the day (reuse variable declared earlier in this date block)
    const totalPeopleForDay = totalRelatives + rows.length; // +1 prisoner per table

    // Detailed per-table list
    html += `<div style="font-size:12px; line-height:1.6;">`;
    rows.forEach((r, i) => {
      const tableNo = i + 1;
      const ref = r.ref || '—';
      const prisoner = r.prisonerName ? `น.ช. ${r.prisonerName}` : '—';

      // Get main visitor + extras
      let visitors = [r.visitorName || '—'];
      const extras = parseExtraVisitors(r);
      extras.forEach(ex => {
        if (ex.name) visitors.push(ex.name);
      });

      const totalPeople = (parseInt(r.visitorCount) || 1) + 1; // relatives + prisoner

      html += `
        <div style="border:1px solid #ddd; border-radius:4px; padding:8px; margin-bottom:6px; background:#fff;">
          <strong>โต๊ะ ${tableNo} = ${ref}</strong><br>
          ผู้ต้องขัง: <strong>${prisoner}</strong><br>
          ผู้เยี่ยม: ${visitors.join(' + ')}<br>
          <span style="color:#555;">จำนวนทั้งหมด: <strong>${totalPeople} คน</strong> (รวมผู้ต้องขัง)</span>
        </div>
      `;
    });

    // Grand total line at the bottom
    html += `
      <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #ccc; font-weight:600; color:#e65100;">
        รวมทั้งหมด: <strong>${totalPeopleForDay} คน</strong> จาก ${rows.length} โต๊ะ
      </div>
    `;
    html += `</div>`;
    html += `</div>`;

    html += `</div>`; // close date block
  });

  container.innerHTML = html;
}

// Helper to print individual department report for a specific date
function printSingleReport(type, date) {
  // Prefer Reports page filters (reports search/status/date) when available,
  // otherwise fall back to the main Reservations page filters.
  let baseRows = [];
  try {
    const hasReportsFilters =
      document.getElementById('reportsSearchBox') ||
      document.getElementById('reportsFilterStatus') ||
      document.getElementById('reportsFilterDate');
    baseRows = hasReportsFilters ? getReportsFilteredRows() : getCurrentFilteredSorted();
  } catch (e) {
    baseRows = getCurrentFilteredSorted();
  }

  // Keep a stable order for printing (Ref No. ascending)
  const filtered = (baseRows || [])
    .filter(r => (r.visitDate || r.visitDateISO) === date)
    .sort((a, b) => String(a.ref || '').localeCompare(String(b.ref || '')));
  if (filtered.length === 0) return;

  let content = '';
  const now = new Date().toLocaleString('th-TH');

  if (type === 'disciplinary') {
    const prisoners = [];
    filtered.forEach(r => {
      if (r.prisonerName && !prisoners.some(p => p.id === r.prisonerId)) {
        prisoners.push({ name: r.prisonerName, id: r.prisonerId, wing: r.wing });
      }
    });

    content = `<h2>🚨 รายงานส่วนทัณฑ์ (เบิกตัวผู้ต้องขัง) - ${date}</h2>`;
    content += `<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;font-size:13px;">`;
    content += `<tr style="background:#f0f0f0;"><th>ชื่อ-นามสกุล</th><th>เลขประจำตัวผู้ต้องขัง</th><th>แดน</th></tr>`;
    prisoners.forEach(p => {
      content += `<tr><td><strong>น.ช. ${p.name}</strong></td><td>${p.id}</td><td>${p.wing || '-'}</td></tr>`;
    });
    content += `</table>`;
  } 
  else if (type === 'kitchen' || type === 'bakery' || type === 'kitchen-bakery') {
    let visitorAdults = 0, k5 = 0, ku = 0;
    let tables = filtered.length;
    let relatives = filtered.reduce((s,r) => s + (parseInt(r.visitorCount)||1), 0);

    filtered.forEach(r => {
      const d = computeDeptReportData(r);
      visitorAdults += d.adults; k5 += d.kids5_8; ku += d.kidsUnder5;
    });

    const combinedAdults = visitorAdults + tables; // รวมผู้ต้องขังเป็นผู้ใหญ่

    const reportBody = `
      <div style="border:2px solid #333; padding:12px; margin-bottom:8px; font-size:13px;">
        <strong style="font-size:15px;">🍽️🍰 ครัว + เบเกอรี่ — วันที่ ${date}</strong><br><br>
        จำนวนโต๊ะ: <strong>${tables} โต๊ะ</strong><br>
        รวมผู้เข้าร่วม: <strong>${relatives + tables} คน</strong> (ญาติ ${relatives} + ผู้ต้องขัง ${tables})<br><br>
        <strong>ผู้ใหญ่ (รวมผู้ต้องขัง):</strong> ${combinedAdults} คน<br>
        <strong>เด็ก 5-8 ปี:</strong> ${k5} คน<br>
        <strong>ต่ำกว่า 5 ปี:</strong> ${ku} คน
      </div>
    `;

    // Duplicate for tear-off: Kitchen copy + Bakery copy
    content = `
      <h2 style="text-align:center; margin-bottom:8px;">🍽️🍰 ครัว + เบเกอรี่ — วันที่ ${date}</h2>
      <p style="text-align:center; font-size:12px; color:#555; margin-bottom:12px;">พิมพ์ 1 ครั้ง → ตัดตรงกลาง ส่งครัว 1 ชุด / เบเกอรี่ 1 ชุด</p>

      <!-- สำหรับครัว -->
      ${reportBody}

      <div style="text-align:center; margin:12px 0; border-top:2px dashed #c62828; padding-top:8px; color:#c62828; font-weight:700;">
        ✂️ ตัดตรงนี้ — ส่งครัว
      </div>

      <!-- สำหรับเบเกอรี่ (ซ้ำ) -->
      ${reportBody}

      <div style="text-align:center; margin-top:12px; color:#888; font-size:11px;">
        พิมพ์จากระบบ CC Cafe Reservation • ทัณฑสถานบำบัดพิเศษกลาง
      </div>
    `;
  }

  else if (type === 'table') {
    content = `<h2>🪑 รายงานการจัดโต๊ะ - ${date}</h2>`;
    content += `<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;font-size:13px;">`;
    content += `<tr style="background:#f0f0f0;"><th>โต๊ะ</th><th>Ref No.</th><th>ผู้ต้องขัง</th><th>ผู้เยี่ยม</th><th>จำนวนคนทั้งหมด</th><th>สถานะการจอง</th></tr>`;

    let grandTotal = 0;

    filtered.forEach((r, i) => {
      const tableNo = i + 1;
      const ref = r.ref || '—';
      const prisoner = r.prisonerName ? `น.ช. ${r.prisonerName}` : '—';

      let visitors = [r.visitorName || '—'];
      const extras = parseExtraVisitors(r);
      extras.forEach(ex => {
        if (ex.name) visitors.push(ex.name);
      });

      const totalPeople = (parseInt(r.visitorCount) || 1) + 1;
      grandTotal += totalPeople;

      content += `<tr>`;
      content += `<td><strong>โต๊ะ ${tableNo}</strong></td>`;
      content += `<td>${ref}</td>`;
      content += `<td>${prisoner}</td>`;
      content += `<td>${visitors.join(' + ')}</td>`;
      content += `<td><strong>${totalPeople} คน</strong></td>`;
      content += `<td>${normalizeStatus(r.status)}</td>`;
      content += `</tr>`;
    });

    content += `</table>`;

    // Grand total at the bottom
    content += `<p style="margin-top:12px; font-weight:600; font-size:14px;">รวมทั้งหมด: <strong>${grandTotal} คน</strong> จาก ${filtered.length} โต๊ะ</p>`;
  }

  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <html><head><meta charset="UTF-8"><title>รายงาน ${date}</title>
    <style>body{font-family:'Sarabun',sans-serif;padding:20px;font-size:14px;} table{width:100%;} h2{margin-bottom:16px;}</style>
    </head><body>
    ${content}
    <div style="margin-top:30px;font-size:11px;color:#888;">พิมพ์เมื่อ ${now} • ทัณฑสถานบำบัดพิเศษกลาง</div>
    </body></html>
  `);
  printWin.document.close();
  setTimeout(() => { printWin.focus(); printWin.print(); }, 300);
}

document.addEventListener('keydown', e => { if(e.key==='Escape') { closeModal(); closeDetailModal(); } });
document.getElementById('passInput').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
