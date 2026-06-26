
const PERMISSIONS = {
  Superadmin: ['approve', 'reject', 'approve_discipline', 'reject_discipline', 'approve_participant', 'confirm_payment', 'reject_payment', 'cancel', 'visitor_approval', 'view_slip', 'view_detail', 'export', 'print', 'manage_users', 'manage_settings', 'view_eventlog'],
  Admin: ['approve', 'reject', 'approve_discipline', 'reject_discipline', 'approve_participant', 'confirm_payment', 'reject_payment', 'cancel', 'visitor_approval', 'view_slip', 'view_detail', 'export', 'print', 'view_eventlog'],
  Finance: ['confirm_payment', 'reject_payment', 'cancel', 'view_slip', 'view_detail'],
  Vinai: ['approve_discipline', 'reject_discipline', 'view_slip', 'view_detail'],
  Tadtel: ['approve_participant', 'visitor_approval', 'view_slip', 'view_detail'],
  User: ['print']
};

// Sidebar menu visibility by role
const SIDEBAR_MENU = {
  Superadmin: ['home', 'reservations', 'reports', 'formal-reports', 'eventlog', 'users', 'prisoners', 'settings'],
  Admin: ['home', 'reservations', 'reports', 'formal-reports', 'eventlog', 'prisoners'],
  Finance: ['reservations', 'reports'],
  Vinai: ['reservations', 'reports'],
  Tadtel: ['reservations', 'reports'],
  User: ['home']
};

// ===== POLLING FOR REALTIME UPDATES =====
let pollInterval = null;
const POLL_INTERVAL_MS = 30000;

function startPolling() {
  stopPolling();
  pollInterval = setInterval(() => { pollData(); }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

async function pollData() {
  if (!currentUser) return;
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getAll', username: currentUser.username, password: currentUser.password })
    });
    if (!resp.ok) return;
    const text = await resp.text();
    const data = JSON.parse(text);
    if (data.status !== 'ok' || !data.rows) return;

    const oldRefs = allRows.map(r => r.ref + '|' + r.status + '|' + r.wing).join(',');
    const newRefs = data.rows.map(r => r.ref + '|' + r.status + '|' + r.wing).join(',');
    if (oldRefs === newRefs) return;

    allRows = data.rows || [];
    document.getElementById('lastUpdated').textContent = 'อัพเดทล่าสุด: ' + new Date().toLocaleString('th-TH');

    const activeView = document.querySelector('.view:not([style*="display: none"])');
    if (activeView) {
      const viewId = activeView.id.replace('view-', '');
      if (viewId === 'home') renderDashboardHome();
      else if (viewId === 'reservations') renderTable();
      else if (viewId === 'reports') renderReportsView();
      else if (viewId === 'formal-reports') renderFormalReportsView();
    }
  } catch (e) { /* silent */ }
}

// ===== SHARED PRINT STYLES =====
const PRINT_SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Sarabun', sans-serif; font-size: 12px; color: #111; padding: 15px; }
  .print-header { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #000; padding-bottom: 10px; }
  .print-header h1 { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .print-header h2 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .print-header p { font-size: 12px; color: #555; }
  .print-title { font-size: 16px; font-weight: 700; text-align: center; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
  th, td { border: 1px solid #000; padding: 5px 7px; text-align: left; }
  th { background: #f0f0f0; font-weight: 700; font-size: 10px; text-transform: uppercase; }
  tr:nth-child(even) { background: #fafafa; }
  .print-footer { text-align: center; font-size: 10px; color: #888; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 6px; }
  @media print {
    body { padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print, .print-preview-bar { display: none !important; }
    .print-header { border-bottom-color: #000; }
    th { background: #e8e8e8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr:nth-child(even) { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

// ===== STATE =====
let allRows = [];
let currentPage = 1;
let pageSize = 10;
let currentUser = null;
let prisonerMaster = [];

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  else if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close-btn">&times;</button>
    </div>
    <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
  `;

  container.appendChild(toast);

  const closeBtn = toast.querySelector('.toast-close-btn');
  const dismissToast = () => {
    if (toast.classList.contains('toast-exit')) return;
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  };

  closeBtn.addEventListener('click', dismissToast);

  setTimeout(dismissToast, duration);
}

// ===== LOGIN =====
async function doLogin() {
  const username = document.getElementById('userInput').value;
  const pass = document.getElementById('passInput').value;

  if (!username || !pass) {
    document.getElementById('loginErr').textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
    document.getElementById('loginErr').style.display = 'block';
    return;
  }

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', username: username, password: pass })
    });

    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();

    if (data.status !== 'ok' || !data.user) {
      throw new Error(data.message || 'การเข้าสู่ระบบล้มเหลว');
    }

    currentUser = {
      username: data.user.username,
      role: data.user.role,
      password: pass,
      displayName: data.user.displayName || data.user.username
    };

    // Clear error display
    document.getElementById('loginErr').style.display = 'none';

    // Show dashboard
    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('dash').style.display = 'block';
    document.getElementById('topDate').textContent = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    // Show user info in sidebar
    document.getElementById('userRole').textContent = currentUser.role;
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userInfo').style.display = 'block';

    // Show/hide sidebar menu items based on role
    const visibleMenu = SIDEBAR_MENU[currentUser.role] || [];
    document.querySelectorAll('.sb-link').forEach(link => {
      const view = link.getAttribute('data-view');
      if (view && !visibleMenu.includes(view)) {
        link.style.display = 'none';
      } else {
        link.style.display = '';
      }
    });

    // Show/hide UI elements based on role (filter status, export/print buttons)
    const isAdminOrSuper = currentUser.role === 'Superadmin' || currentUser.role === 'Admin';
    const filterStatusEl = document.getElementById('filterStatus');
    const btnExport = document.getElementById('btnExport');
    const btnPrint = document.getElementById('btnPrint');
    const btnPrintVinai = document.getElementById('btnPrintVinai');
    const btnExportPhones = document.getElementById('btnExportPhones');
    const btnSyncWings = document.getElementById('btnSyncWings');
    const btnNewBooking = document.getElementById('btnNewBooking');
    if (filterStatusEl) filterStatusEl.style.display = isAdminOrSuper ? '' : 'none';
    if (btnExport) btnExport.style.display = isAdminOrSuper ? '' : 'none';
    if (btnPrint) btnPrint.style.display = isAdminOrSuper ? '' : 'none';
    if (btnPrintVinai) btnPrintVinai.style.display = isAdminOrSuper ? '' : 'none';
    if (btnExportPhones) btnExportPhones.style.display = isAdminOrSuper ? '' : 'none';
    if (btnSyncWings) btnSyncWings.style.display = isAdminOrSuper ? '' : 'none';
    if (btnNewBooking) btnNewBooking.style.display = isAdminOrSuper ? '' : 'none';

    // Show role-specific sidebar links and bottom nav
    ['sbUsers', 'sbPrisoners', 'sbSettings', 'bnUsers', 'bnPrisoners', 'bnSettings'].forEach(id => {
      const viewName = id.replace(/^(sb|bn)/, '').toLowerCase();
      const el = document.getElementById(id);
      if (el) {
        el.style.display = visibleMenu.includes(viewName) ? '' : 'none';
      }
    });

    switchView(visibleMenu.includes('home') ? 'home' : visibleMenu[0] || 'reservations');
    renderDashboardHome();
    loadData();
    startPolling();
    loadPrisonerMaster();
    showToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ' + (currentUser.displayName || currentUser.username), 'success');

  } catch (e) {
    console.error('Login error:', e);
    document.getElementById('loginErr').textContent = e.message || 'การเข้าสู่ระบบล้มเหลว กรุณาตรวจสอบข้อมูล';
    document.getElementById('loginErr').style.display = 'block';
    document.getElementById('passInput').value = '';
    setTimeout(() => document.getElementById('loginErr').style.display = 'none', 3000);
  }
}

function hasPermission(action) {
  return currentUser && PERMISSIONS[currentUser.role] && PERMISSIONS[currentUser.role].includes(action);
}

function logEvent(action, details) {
  const event = {
    timestamp: new Date().toLocaleString('th-TH'),
    user: currentUser ? currentUser.username : 'unknown',
    displayName: currentUser ? currentUser.displayName : null,
    role: currentUser ? currentUser.role : 'unknown',
    action: action,
    details: details
  };
  allEvents.unshift(event);
  localStorage.setItem('eventlog', JSON.stringify(allEvents));
}

let allEvents = JSON.parse(localStorage.getItem('eventlog') || '[]');
function doLogout() {
  currentUser = null;
  document.getElementById('loginWrap').style.display = 'flex';
  document.getElementById('dash').style.display = 'none';
  document.getElementById('passInput').value = '';
  document.getElementById('userInput').value = '';
  document.getElementById('userInfo').style.display = 'none';
  // Reset sidebar menu visibility
  document.querySelectorAll('.sb-link').forEach(link => {
    link.style.display = '';
  });
  // Hide role-specific elements
  ['sbUsers', 'sbPrisoners', 'sbSettings', 'bnUsers', 'bnPrisoners', 'bnSettings'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const notifBell = document.getElementById('notifBell');
  if (notifBell) notifBell.style.display = 'none';
  const notifPanel = document.getElementById('notifPanel');
  if (notifPanel) notifPanel.style.display = 'none';
  stopPolling();
  allRows = [];
}

// ===== LOAD DATA =====
async function loadData() {
  document.getElementById('tableBody').innerHTML = '<tr><td colspan="9" class="loading-state"><span class="spinner-sm"></span>กำลังโหลดข้อมูล...</td></tr>';
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getAll', username: currentUser.username, password: currentUser.password })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    const data = JSON.parse(text);
    if (data.status !== 'ok') throw new Error(data.message || 'Unknown error');
    allRows = data.rows || [];
    document.getElementById('lastUpdated').textContent = 'อัพเดทล่าสุด: ' + new Date().toLocaleString('th-TH');
  } catch (e) {
    console.error('Load data error:', e);
    // Demo mode: use sample data if no Apps Script configured and DEMO_MODE is not explicitly disabled
    if (window.DEMO_MODE !== false && (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE')) {
      allRows = getDemoData();
      document.getElementById('lastUpdated').textContent = 'โหมด Demo (ยังไม่ได้เชื่อม Google Sheet)';
      showToast('ไม่สามารถเชื่อมต่อระบบได้ กำลังแสดงโหมดทดสอบ (Demo)', 'warning');
    } else {
      document.getElementById('tableBody').innerHTML = `<tr><td colspan="9" class="empty-state">❌ โหลดข้อมูลไม่สำเร็จ: ${e.message}</td></tr>`;
      showToast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error');
      return;
    }
  }
  updateStats();
  buildDateFilter();
  buildWingFilter();
  setDefaultFormalDate();
  renderTable();
  logEvent('load_data', 'โหลดข้อมูลการจอง');
}

// ===== DEMO DATA =====
function getDemoData() {
  return [
    { ref: 'VIS-11234', timestamp: '21/05/2568 09:12', visitorName: 'สมชาย ใจดี', visitorPhone: '081-234-5678', visitorId: '1-1001-12345-67-8', relation: 'บุตร / ธิดา', extraVisitorNames: 'สมหญิง ใจดี|1-9999-11111-22-3|คู่สมรส;;น้องชาย ใจดี|1-9999-11111-22-4|พี่น้อง', visitorApproved: 'yes', extraVisitorApproved: 'yes;;no', prisonerName: 'สมศักดิ์ มั่นคง', prisonerId: '20010001', wing: 'แดน 3', visitDate: '28 พฤษภาคม 2568', visitorCount: 3, total: 3000, status: 'รอตรวจสอบ', slipImage: '' },
    { ref: 'VIS-22345', timestamp: '21/05/2568 10:30', visitorName: 'สมหญิง รักดี', visitorPhone: '089-876-5432', visitorId: '1-2002-23456-78-9', relation: 'คู่สมรส', prisonerName: 'วิชัย สุขสม', prisonerId: '20020002', wing: 'แดน 5', visitDate: '29 พฤษภาคม 2568', visitorCount: 1, total: 1000, status: 'รอชำระเงิน', slipImage: '' },
    { ref: 'VIS-33456', timestamp: '20/05/2568 14:45', visitorName: 'นางมาลี หวานใจ', visitorPhone: '062-111-2222', visitorId: '1-3003-34567-89-0', relation: 'บิดา / มารดา', prisonerName: 'ประสิทธิ์ ดีมาก', prisonerId: '20030003', wing: 'แดน 1', visitDate: '27 พฤษภาคม 2568', visitorCount: 3, total: 3000, status: 'ชำระแล้ว', slipImage: '' },
    { ref: 'VIS-44567', timestamp: '19/05/2568 11:00', visitorName: 'ธนา สมบัติดี', visitorPhone: '095-333-4444', visitorId: '1-4004-45678-90-1', relation: 'พี่น้อง', prisonerName: 'ชัยวัฒน์ รุ่งเรือง', prisonerId: '20040004', wing: 'แดน 2', visitDate: '26 พฤษภาคม 2568', visitorCount: 2, total: 2000, status: 'ไม่อนุมัติ', slipImage: '' },
  ];
}

// ===== STATS =====
function updateStats() {
  const role = currentUser ? currentUser.role : null;
  const allowedStatuses = {
    Superadmin: null, // sees all
    Admin: null, // sees all
    Finance: ['รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น'],
    Tadtel: ['รอตรวจสอบผู้เข้าร่วม', 'รอตรวจสอบ'],
    Vinai: ['รอตรวจสอบวินัย', 'รอตรวจสอบ']
  };

  // Filter rows based on role (same logic as renderTable)
  let statsRows = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false;
    if (allowedStatuses[role]) {
      const normalized = normalizeStatus(r.status);
      if (!allowedStatuses[role].includes(normalized)) return false;
    }
    return true;
  });

  document.getElementById('statTotal').textContent = statsRows.length;
  document.getElementById('statWait').textContent = statsRows.filter(r => normalizeStatus(r.status) === 'รอตรวจสอบวินัย').length;
  document.getElementById('statOk').textContent = statsRows.filter(r => normalizeStatus(r.status) === 'รอชำระเงิน' || normalizeStatus(r.status) === 'ชำระแล้ว' || normalizeStatus(r.status) === 'เสร็จสิ้น').length;
  document.getElementById('statReject').textContent = statsRows.filter(r => normalizeStatus(r.status) === 'ไม่อนุมัติ').length;
}

// ===== DATE FILTER =====
function stripDayPrefix(dateStr) {
  return dateStr.replace(/^(?:วัน)?(?:จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์|อาทิตย์)ที่\s+/, '');
}

function buildDateFilter() {
  const dateMap = {};
  allRows.forEach(r => {
    if (r.visitDate && r.visitDateISO && !dateMap[r.visitDate]) {
      dateMap[r.visitDate] = r.visitDateISO;
    }
  });
  const dates = Object.keys(dateMap).sort((a, b) => {
    if (dateMap[a] < dateMap[b]) return -1;
    if (dateMap[a] > dateMap[b]) return 1;
    return 0;
  });
  const sel = document.getElementById('filterDate');
  const cur = sel.value;
  sel.innerHTML = '<option value="">ทุกวัน</option>';
  dates.forEach(d => {
    const o = document.createElement('option');
    o.value = d; o.textContent = stripDayPrefix(d);
    if (d === cur) o.selected = true;
    sel.appendChild(o);
  });
}

function buildWingFilter() {
  const wings = [...new Set(allRows.map(r => (r.wing || '').trim()).filter(Boolean))].sort();
  const sel = document.getElementById('filterWing');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">ทุกแดน</option>';
  wings.forEach(w => {
    const o = document.createElement('option');
    o.value = w; o.textContent = w;
    if (w === cur) o.selected = true;
    sel.appendChild(o);
  });
}

// ===== RENDER TABLE =====
function renderTable() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const fs = document.getElementById('filterStatus').value;
  const fd = document.getElementById('filterDate').value;
  const fw = document.getElementById('filterWing') ? document.getElementById('filterWing').value : '';
  const role = currentUser ? currentUser.role : null;

  // Filter by role - each role sees only specific statuses
  const allowedStatuses = {
    Superadmin: null, // sees all
    Admin: null, // sees all
    Finance: ['รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น'],
    Tadtel: ['รอตรวจสอบผู้เข้าร่วม', 'รอตรวจสอบ'],
    Vinai: ['รอตรวจสอบวินัย', 'รอตรวจสอบ']
  };

  let rows = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false;
    if (allowedStatuses[role]) {
      const normalized = normalizeStatus(r.status);
      if (!allowedStatuses[role].includes(normalized)) return false;
    }
    if (fs && normalizeStatus(r.status) !== fs) return false;
    if (fd && r.visitDate !== fd) return false;
    if (fw && (r.wing || '') !== fw) return false;
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
    let badgeClass = 'badge-discipline-check';
    if (s === 'รอตรวจสอบวินัย') badgeClass = 'badge-discipline-check';
    else if (s === 'รอตรวจสอบผู้เข้าร่วม') badgeClass = 'badge-participant-check';
    else if (s === 'รอชำระเงิน') badgeClass = 'badge-payment-pending';
    else if (s === 'ชำระแล้ว') badgeClass = 'badge-paid';
    else if (s === 'เสร็จสิ้น') badgeClass = 'badge-completed';
    else if (s === 'ไม่อนุมัติ') badgeClass = 'badge-rejected';
    else if (s === 'ยกเลิก') badgeClass = 'badge-cancelled';

    const isDiscipline = s === 'รอตรวจสอบวินัย';
    const isParticipant = s === 'รอตรวจสอบผู้เข้าร่วม';
    const isPaymentPending = s === 'รอชำระเงิน';
    const isPaid = s === 'ชำระแล้ว';
    const isCompleted = s === 'เสร็จสิ้น';
    const isCancelled = s === 'ยกเลิก';
    const rowIdx = allRows.indexOf(r);

    // Status checkmarks - 3 steps of verification (updated workflow)
    const disciplineApproved = r.status !== 'รอตรวจสอบวินัย';
    const participantApproved = r.status === 'รอชำระเงิน' || r.status === 'ชำระแล้ว' || r.status === 'เสร็จสิ้น';
    const financeConfirmed = r.status === 'ชำระแล้ว' || r.status === 'เสร็จสิ้น';

    const role = currentUser ? currentUser.role : 'User';
    const isAdminOrSuper = role === 'Superadmin' || role === 'Admin';

    // Permission helper for button visibility
    const canApproveDiscipline = isAdminOrSuper || hasPermission('approve_discipline');
    const canRejectDiscipline = isAdminOrSuper || hasPermission('reject_discipline');
    const canApproveParticipant = isAdminOrSuper || hasPermission('approve_participant');
    const canConfirmPayment = (role === 'Superadmin' || role === 'Admin' || hasPermission('confirm_payment'));
    const canRejectPayment = isAdminOrSuper || hasPermission('reject_payment');
    const canCancel = isAdminOrSuper || hasPermission('cancel');

    return `<tr data-idx="${rowIdx}">
           <td data-label="" style="width:32px;text-align:center;"><input type="checkbox" class="row-select" data-idx="${rowIdx}" onchange="updateBulkBar()" style="cursor:pointer;"></td>
           <td data-label="เลขอ้างอิง"><b style="color:var(--blue);font-size:12px">${escHtml(r.ref)}</b></td>
<td data-label="ผู้เข้าร่วม">
              <div style="font-weight:600">${escHtml(r.visitorName)}</div>
              <div style="font-size:11px;color:var(--text2)">${escHtml(r.visitorPhone || '')}</div>
              <div style="font-size:11px;color:var(--text2);margin-top:6px;padding-top:6px;border-top:1px dashed var(--border);display:none" class="mobile-show-prisoner">
                <span style="font-weight:600;color:var(--text2)">👤 ผู้ต้องขัง:</span> ${escHtml(r.prisonerName || '')} (#${escHtml(r.prisonerId || '')})
              </div>
            </td>
           <td data-label="ผู้ต้องขัง" class="hide-mobile">
             <div style="font-weight:600">${escHtml(r.prisonerName)}</div>
             <div style="font-size:11px;color:var(--text2)">#${escHtml(r.prisonerId)}</div>
           </td>
           <td data-label="แดน">${escHtml(r.wing) || '—'}</td>
           <td data-label="จำนวน/ยอด">
             <div>${escHtml(r.visitorCount)} คน • ${(r.total || 0).toLocaleString()} บ.</div>
           </td>
           <td data-label="สถานะ"><span class="badge ${badgeClass}">${escHtml(r.status)}</span></td>
           <td data-label="ตรวจสอบ">
             <div style="display:flex;gap:4px;align-items:center;justify-content:center">
               <span class="status-check ${disciplineApproved ? 'done' : 'pending'}" title="อนุมัติโดย Vinai (ตรวจสอบวินัย)">✓</span>
               <span class="status-check ${participantApproved ? 'done' : 'pending'}" title="อนุมัติโดย Tadtel (ผู้เข้าร่วม)">✓</span>
               <span class="status-check ${financeConfirmed ? 'done' : 'pending'}" title="ยืนยันโดย Finance (การเงิน)">✓</span>
             </div>
           </td>
<td data-label="จัดการ">
              <div class="action-btns">
                <button class="btn-slip" onclick="viewSlip(${rowIdx})">🧾 สลิป</button>
                <button class="btn-slip" style="background:var(--blue-light);color:var(--blue);border-color:var(--blue)" onclick="viewDetail(${rowIdx})">📋 รายละเอียด</button>
                ${isAdminOrSuper ? `<button class="btn-slip" style="background:#f0fdf4;color:var(--green);border-color:var(--green)" onclick="editBooking(${rowIdx})">✏️ แก้ไข</button>` : ''}
              </div>
              <div class="mobile-actions-expanded" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);display:${s === 'รอตรวจสอบวินัย' || s === 'รอตรวจสอบผู้เข้าร่วม' || s === 'รอชำระเงิน' || s === 'ชำระแล้ว' ? 'flex' : 'none'};flex-wrap:wrap;gap:6px">
                ${canConfirmPayment && (s === 'รอชำระเงิน' || s === 'ชำระแล้ว') ? `<button class="btn-confirm-pay" onclick="confirmPayment(${rowIdx})">${s === 'ชำระแล้ว' ? '✅ เสร็จสิ้น' : '💳 ยืนยันชำระเงิน'}</button>` : ''}
                ${canApproveDiscipline && s === 'รอตรวจสอบวินัย' ? `<button class="btn-approve" onclick="updateStatus(${rowIdx},'รอตรวจสอบผู้เข้าร่วม')">✓ อนุมัติวินัย</button>` : ''}
                ${canRejectDiscipline && s === 'รอตรวจสอบวินัย' ? `<button class="btn-reject" onclick="updateStatus(${rowIdx},'ไม่อนุมัติ')">✗ ปฏิเสธ</button>` : ''}
                ${canApproveParticipant && s === 'รอตรวจสอบผู้เข้าร่วม' ? `<button class="btn-approve" onclick="updateStatus(${rowIdx},'รอชำระเงิน')">✓ อนุมัติผู้เข้าร่วม</button>` : ''}
                ${canRejectPayment && (s === 'รอชำระเงิน' || s === 'ชำระแล้ว') ? `<button class="btn-reject-pay" onclick="updateStatus(${rowIdx},'รอชำระเงิน')">✗ ปฏิเสธการชำระ</button>` : ''}
                ${canCancel && !isCancelled && !['เสร็จสิ้น'].includes(s) ? `<button class="btn-cancel" onclick="cancelBooking(${rowIdx})">🚫 ยกเลิก</button>` : ''}
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
          <option value="5" ${pageSize === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
        </select>
        รายการ
      </div>
      <div class="page-info">หน้า ${currentPage} / ${totalPages} <span style="color:var(--text2)">(${startItem}-${endItem} จาก ${totalFiltered})</span></div>
      <div class="page-nav">
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>←</button>
  `;
  // page number buttons (compact)
  const maxButtons = 5;
  let startP = Math.max(1, currentPage - Math.floor(maxButtons / 2));
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
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>→</button>
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
  // Update bottom nav active state on mobile
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  bottomNavItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === v);
  });

  if (v === 'reservations') {
    renderTable();
  } else if (v === 'reports') {
    populateReportsDateFilter();
    populateReportsWingFilter();
    renderReportsView();
  } else if (v === 'formal-reports') {
    populateFormalWingFilter();
    renderFormalReportsView();
  } else if (v === 'eventlog') {
    renderEventlog();
  } else if (v === 'users') {
    renderUsersView();
  } else if (v === 'prisoners') {
    renderPrisonersView();
  } else if (v === 'settings') {
    renderSettingsView();
  }

  // Dashboard home view - only for Admin/Superadmin who have access
  if (v === 'home' && SIDEBAR_MENU[currentUser?.role]?.includes('home')) {
    renderDashboardHome();
  }
}

function renderEventlog() {
  const container = document.getElementById('eventlogBody');
  if (!container) return;

  // Limit to 100 entries max for display
  const displayEvents = allEvents.slice(0, 100);
  document.getElementById('eventlogCount').textContent = allEvents.length + ' รายการ' + (allEvents.length > 100 ? ' (แสดง 100 รายการล่าสุด)' : '');

  if (allEvents.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="empty-state">ยังไม่มีบันทึกการทำงาน</td></tr>';
    return;
  }

  container.innerHTML = displayEvents.map(e => `
    <tr>
      <td style="white-space:nowrap;font-size:12px;">${escHtml(e.timestamp)}</td>
      <td style="font-size:12px;">${escHtml(e.user)} <span style="color:var(--text2);">(${escHtml(e.role)})</span></td>
      <td style="font-size:12px;color:var(--text2);">${escHtml(e.displayName || '-')}</td>
      <td style="font-size:12px;">${escHtml(e.action)}</td>
      <td style="font-size:12px;">${escHtml(e.details)}</td>
    </tr>
  `).join('');
}

function computeFinanceStats(rows) {
  let totalBooked = 0;
  let paid = 0;
  let unpaid = 0;
  let pendingReview = 0;
  let bookingCount = 0;

  (rows || []).forEach(r => {
    if (!r.ref || String(r.ref).trim() === '') return;
    const s = normalizeStatus(r.status);
    if (s === 'ยกเลิก' || s === 'ไม่อนุมัติ') return;

    const amt = parseInt(r.total, 10) || 0;
    bookingCount++;
    totalBooked += amt;

    if (s === 'ชำระแล้ว' || s === 'เสร็จสิ้น') paid += amt;
    else if (s === 'รอชำระเงิน') unpaid += amt;
    else if (s === 'รอตรวจสอบ') pendingReview += amt;
  });

  return { totalBooked, paid, unpaid, pendingReview, bookingCount };
}

function getRowVisitDateKey(r) {
  let key = r.visitDateISO;
  if (!key && r.visitDate) {
    const ts = r.timestamp ? new Date(r.timestamp.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')) : null;
    if (ts && !isNaN(ts)) key = ts.toISOString().slice(0, 10);
  }
  if (key && !/^\d{4}-\d{2}-\d{2}$/.test(String(key).trim())) {
    const parsed = new Date(key);
    if (!isNaN(parsed)) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      key = `${y}-${m}-${d}`;
    }
  }
  return key ? String(key).trim() : '';
}

function computeFinanceTimeSeries(rows) {
  const today = new Date();
  const days = [];
  const byDay = {};

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(key);
    byDay[key] = { booked: 0, paid: 0, unpaid: 0 };
  }

  (rows || []).forEach(r => {
    if (!r.ref || String(r.ref).trim() === '') return;
    const s = normalizeStatus(r.status);
    if (s === 'ยกเลิก' || s === 'ไม่อนุมัติ') return;

    const key = getRowVisitDateKey(r);
    if (!key || !byDay[key]) return;

    const amt = parseInt(r.total, 10) || 0;
    byDay[key].booked += amt;
    if (s === 'ชำระแล้ว' || s === 'เสร็จสิ้น') byDay[key].paid += amt;
    else if (s === 'รอชำระเงิน') byDay[key].unpaid += amt;
  });

  return {
    days,
    series: [
      { id: 'booked', label: 'ยอดจอง', color: '#0B2545', fillTop: 'rgba(11,37,69,0.22)', fillBottom: 'rgba(11,37,69,0.02)', values: days.map(d => byDay[d].booked) },
      { id: 'paid', label: 'ชำระแล้ว', color: '#2E5238', fillTop: 'rgba(46,82,56,0.2)', fillBottom: 'rgba(46,82,56,0.02)', values: days.map(d => byDay[d].paid) },
      { id: 'unpaid', label: 'ยังไม่ชำระ', color: '#C8922A', fillTop: 'rgba(200,146,42,0.25)', fillBottom: 'rgba(200,146,42,0.02)', values: days.map(d => byDay[d].unpaid) }
    ]
  };
}

let financeChartCache = [];

function formatBaht(n) {
  return (n || 0).toLocaleString('th-TH') + ' บาท';
}

function renderFinanceOverview() {
  const summaryEl = document.getElementById('financeSummary');
  const canvas = document.getElementById('financeChart');
  if (!summaryEl || !canvas) return;

  const stats = computeFinanceStats(allRows);
  const { totalBooked, paid, unpaid, pendingReview, bookingCount } = stats;

  summaryEl.innerHTML = `
    <div class="finance-kpi">
      <div class="finance-kpi-item total">
        <div class="finance-kpi-label">ยอดจองทั้งหมด</div>
        <div class="finance-kpi-val">${formatBaht(totalBooked)}</div>
        <div class="finance-kpi-sub">${bookingCount} รายการ</div>
      </div>
      <div class="finance-kpi-item paid">
        <div class="finance-kpi-label">ชำระแล้ว</div>
        <div class="finance-kpi-val">${formatBaht(paid)}</div>
        <div class="finance-kpi-sub">${totalBooked ? Math.round((paid / totalBooked) * 100) : 0}% ของยอดจอง</div>
      </div>
      <div class="finance-kpi-item unpaid">
        <div class="finance-kpi-label">ยังไม่ชำระ</div>
        <div class="finance-kpi-val">${formatBaht(unpaid)}</div>
        <div class="finance-kpi-sub">${totalBooked ? Math.round((unpaid / totalBooked) * 100) : 0}% ของยอดจอง</div>
      </div>
    </div>
    ${pendingReview > 0 ? `<div class="finance-pending-note">⏳ รอตรวจสอบ (ยังไม่ถึงขั้นชำระ): <strong>${formatBaht(pendingReview)}</strong></div>` : ''}
  `;

  const timeSeries = computeFinanceTimeSeries(allRows);
  drawFinanceLineChart(canvas, timeSeries);

  const legendEl = document.getElementById('financeLegend');
  if (legendEl) {
    legendEl.innerHTML = timeSeries.series.map(s => `
      <span class="finance-legend-item">
        <span class="finance-legend-line" style="background:${s.color}"></span>
        ${s.label}
      </span>
    `).join('');
  }
}

function formatChartBahtShort(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function buildSmoothPoints(values, xAt, yAt, baselineY) {
  const pts = values.map((v, i) => ({ x: xAt(i), y: yAt(v), value: v }));
  if (pts.length < 2) return pts;
  return pts;
}

function traceSmoothLine(ctx, points) {
  if (!points.length) return;
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    ctx.bezierCurveTo(mx, p0.y, mx, p1.y, p1.x, p1.y);
  }
}

function drawFinanceLineChart(canvas, timeSeries) {
  if (!canvas || !timeSeries) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  const w = canvas.width = canvas.offsetWidth || 520;
  const h = canvas.height = 240;
  ctx.clearRect(0, 0, w, h);
  financeChartCache = [];

  const { days, series } = timeSeries;
  const allVals = series.flatMap(s => s.values);
  const maxVal = Math.max(1, ...allVals);
  const hasData = allVals.some(v => v > 0);

  const pad = { top: 24, right: 20, bottom: 32, left: 52 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const baseY = pad.top + chartH;

  if (!hasData) {
    ctx.fillStyle = '#6B7280';
    ctx.font = '13px Sarabun, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ยังไม่มียอดจองในช่วง 14 วันนี้', w / 2, h / 2);
    return;
  }

  const xAt = i => pad.left + (days.length <= 1 ? chartW / 2 : (i / (days.length - 1)) * chartW);
  const yAt = v => baseY - (v / maxVal) * chartH;

  // grid + y-axis labels
  ctx.strokeStyle = 'rgba(11,37,69,0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    const val = Math.round(maxVal * (1 - i / 4));
    ctx.fillStyle = '#6B7280';
    ctx.font = '9px Sarabun, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatChartBahtShort(val), pad.left - 8, y + 3);
  }

  // x-axis labels (every other day on narrow screens)
  const step = days.length > 10 ? 2 : 1;
  days.forEach((day, i) => {
    if (i % step !== 0 && i !== days.length - 1) return;
    const x = xAt(i);
    const label = new Date(day + 'T12:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
    ctx.fillStyle = '#3F4755';
    ctx.font = '9px Sarabun, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, h - 10);
  });

  // draw areas then lines (booked behind, unpaid in front)
  [...series].reverse().forEach(s => {
    const points = buildSmoothPoints(s.values, xAt, yAt, baseY);
    if (!points.length) return;

    const grad = ctx.createLinearGradient(0, pad.top, 0, baseY);
    grad.addColorStop(0, s.fillTop);
    grad.addColorStop(1, s.fillBottom);

    ctx.beginPath();
    traceSmoothLine(ctx, points);
    ctx.lineTo(points[points.length - 1].x, baseY);
    ctx.lineTo(points[0].x, baseY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    traceSmoothLine(ctx, points);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    points.forEach((p, i) => {
      financeChartCache.push({
        x: p.x - 8, y: p.y - 8, width: 16, height: 16,
        date: days[i],
        series: s.label,
        value: p.value,
        label: new Date(days[i] + 'T12:00:00').toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
      });
      if (p.value > 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  });
}

// Hover tooltip for finance line chart (desktop) + tap support (mobile)
const financeCanvasEl = document.getElementById('financeChart');
if (financeCanvasEl) {
  financeCanvasEl.addEventListener('mousemove', (e) => {
    if (!financeChartCache.length) return;
    const rect = financeCanvasEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    let found = null;
    let best = Infinity;
    for (const item of financeChartCache) {
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      const d = Math.hypot(mouseX - cx, mouseY - cy);
      if (d < 14 && d < best) { best = d; found = item; }
    }
    if (found) {
      financeCanvasEl.style.cursor = 'pointer';
      financeCanvasEl.title = `${found.label} · ${found.series}: ${found.value.toLocaleString('th-TH')} บาท`;
    } else {
      financeCanvasEl.style.cursor = 'default';
      financeCanvasEl.title = '';
    }
  });
  financeCanvasEl.addEventListener('mouseleave', () => {
    financeCanvasEl.style.cursor = 'default';
    financeCanvasEl.title = '';
  });
  // Tap for mobile
  financeCanvasEl.addEventListener('click', (e) => {
    if ('ontouchstart' in window) {
      showChartTooltip(financeCanvasEl, financeChartCache, financeCanvasEl.getBoundingClientRect(), e.clientX, e.clientY);
      setTimeout(hideChartTooltip, 2000);
    }
  });
}

let renderDashboardHome = function () {
  // Role‑based KPI visibility
  const role = currentUser && currentUser.role;
  const visible = {
    Superadmin: ['statTotal', 'statWait', 'statOk', 'statReject', 'statUniquePrisoners', 'statThisWeek', 'statThisMonth', 'statUniqueVisitors'],
    Admin: ['statTotal', 'statWait', 'statOk', 'statReject', 'statUniquePrisoners', 'statThisWeek', 'statThisMonth', 'statUniqueVisitors'],
    Vinai: ['statWait', 'statThisWeek'],
    Tadtel: ['statOk', 'statThisWeek'],
    Finance: ['statOk', 'statThisWeek', 'statUniqueVisitors']
  }[role] || [];
  // hide all KPI cards then show allowed
  ['statTotal', 'statWait', 'statOk', 'statReject', 'statUniquePrisoners', 'statThisWeek', 'statThisMonth', 'statUniqueVisitors'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentElement && el.parentElement.parentElement) {
      el.parentElement.parentElement.style.display = visible.includes(id) ? '' : 'none';
    }
  });

  // Show pipeline for admin roles
  const pipeline = document.getElementById('statusPipeline');
  if (pipeline && (role === 'Superadmin' || role === 'Admin')) {
    pipeline.style.display = 'block';
  } else if (pipeline) {
    pipeline.style.display = 'none';
  }

  const recentEl = document.getElementById('recentBookings');
  if (!recentEl) return;

  renderFinanceOverview();

  const total = allRows.length;

  // recent 5
  if (!total) {
    recentEl.innerHTML = '<div style="color:#888;font-size:12px">ยังไม่มีข้อมูล</div>';
    document.getElementById('statUniquePrisoners').textContent = '0';
    document.getElementById('statThisWeek').textContent = '0';
    document.getElementById('statThisMonth').textContent = '0';
    document.getElementById('statUniqueVisitors').textContent = '0';
    const chartEl = document.getElementById('trendChart');
    if (chartEl) chartEl.getContext && chartEl.getContext('2d').clearRect(0, 0, chartEl.width, chartEl.height);
    return;
  }

  let rhtml = '';
  allRows.slice(0, 5).forEach(r => {
    const idx = allRows.indexOf(r);
    const s = normalizeStatus(r.status);
    let bcls = 'badge-pending-review';
    if (s === 'รอชำระเงิน') bcls = 'badge-payment-pending';
    else if (s === 'ชำระแล้ว') bcls = 'badge-paid';
    else if (s === 'เสร็จสิ้น') bcls = 'badge-completed';
    else if (s === 'ไม่อนุมัติ') bcls = 'badge-rejected';
    else if (s === 'ยกเลิก') bcls = 'badge-cancelled';
    rhtml += `<div onclick="viewDetail(${idx});switchView('reservations')" style="padding:10px 2px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;flex-direction:column;gap:6px;">
       <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
         <b style="font-size:13px;color:var(--blue)">${r.ref}</b>
         <span class="badge ${bcls}" style="font-size:11px;padding:2px 8px;white-space:nowrap">${s}</span>
       </div>
       <div style="display:flex;flex-direction:column;gap:2px;font-size:12px">
         <span><strong style="color:var(--text2)">👤</strong> ${r.visitorName || ''}</span>
         <span><strong style="color:var(--text2)">🏢</strong> ${r.prisonerName || ''} (#${r.prisonerId || ''})</span>
         <span><strong style="color:var(--text2)">📅</strong> ${r.visitDate || ''} • <strong style="color:var(--blue)">${(r.total || 0).toLocaleString()} บ.</strong></span>
       </div>
     </div>`;
  });

  const recentCountEl = document.getElementById('recentCount');
  if (recentCountEl) recentCountEl.textContent = '(' + allRows.length + ' รายการทั้งหมด)';

  recentEl.innerHTML = rhtml || '<div style="color:#888;font-size:13px;padding:12px;text-align:center">ยังไม่มีข้อมูล</div>';

  // ===== Status Pipeline Visualization =====
  const statusOrder = ['รอตรวจสอบวินัย', 'รอตรวจสอบผู้เข้าร่วม', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น', 'ไม่อนุมัติ', 'ยกเลิก'];
  const statusLabels = { 'รอตรวจสอบวินัย': 'วินัย', 'รอตรวจสอบผู้เข้าร่วม': 'ผู้เข้าร่วม', 'รอชำระเงิน': 'ชำระเงิน', 'ชำระแล้ว': 'ชำระแล้ว', 'เสร็จสิ้น': 'เสร็จ', 'ไม่อนุมัติ': 'ปฏิเสธ', 'ยกเลิก': 'ยกเลิก' };
  const statusCounts = {}; statusOrder.forEach(s => statusCounts[s] = 0);
  allRows.forEach(r => { const s = normalizeStatus(r.status); if (statusCounts[s] !== undefined) statusCounts[s]++; });
  const grandTotal = allRows.length;
  let pipelineHtml = '<div class="status-pipeline">';
  statusOrder.forEach(status => {
    const pct = grandTotal ? Math.round(statusCounts[status] / grandTotal * 100) : 0;
    const colors = { 'รอตรวจสอบวินัย': 'var(--status-discipline)', 'รอตรวจสอบผู้เข้าร่วม': 'var(--status-participant)', 'รอชำระเงิน': 'var(--status-payment)', 'ชำระแล้ว': 'var(--status-paid)', 'เสร็จสิ้น': 'var(--status-completed)', 'ไม่อนุมัติ': 'var(--status-rejected)', 'ยกเลิก': 'var(--status-cancelled)' };
    pipelineHtml += `<div class="status-pipeline-item" style="flex:1;min-width:55px;padding:6px 4px;border-radius:8px;background:${colors[status]}22;border:1px solid ${colors[status]}33;text-align:center">
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">${statusLabels[status]}</div>
        <div style="font-size:14px;font-weight:700;color:var(--text)">${statusCounts[status]}</div>
        <div style="font-size:9px;color:var(--text2)" class="status-pct">${pct}% ของทั้งหมด</div>
      </div>`;
  });
  pipelineHtml += '</div>';
  const pipelineEl = document.getElementById('statusPipeline');
  if (pipelineEl) pipelineEl.innerHTML = pipelineHtml;

  // ===== NEW: Additional professional metrics =====
  const uniquePrisoners = new Set();
  const uniqueVisitors = new Set();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
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
      if (ts && !isNaN(ts)) visitKey = ts.toISOString().slice(0, 10);
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
    lastUpdatedEl.textContent = 'อัปเดต ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
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

// Simple hover tooltip for trend chart (desktop) + tap support (mobile)
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
  // Tap for mobile
  trendCanvas.addEventListener('click', (e) => {
    if ('ontouchstart' in window) {
      showChartTooltip(trendCanvas, trendDataCache, trendCanvas.getBoundingClientRect(), e.clientX, e.clientY);
      setTimeout(hideChartTooltip, 2000);
    }
  });
}

// Redraw trend chart on window resize (when overview is visible)
window.addEventListener('resize', () => {
  const homeView = document.getElementById('view-home');
  if (homeView && homeView.style.display !== 'none' && document.getElementById('trendChart')) {
    clearTimeout(window._trendResizeTimer);
    window._trendResizeTimer = setTimeout(() => {
      if (typeof drawReservationTrendChart === 'function') drawReservationTrendChart();
      const financeCanvas = document.getElementById('financeChart');
      if (financeCanvas && typeof drawFinanceLineChart === 'function') {
        drawFinanceLineChart(financeCanvas, computeFinanceTimeSeries(allRows));
      }
    }, 120);
  }
});

// ===== MOBILE CHART INTERACTIONS - Touch/Tap Tooltips =====
let activeTooltip = null;
function showChartTooltip(canvas, data, rect, clientX, clientY) {
  const mouseX = clientX - rect.left;
  const mouseY = clientY - rect.top;

  let found = null;
  let best = Infinity;

  for (const item of data) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const d = Math.hypot(mouseX - cx, mouseY - cy);
    if (d < 20 && d < best) { best = d; found = item; }
  }

  if (found) {
    if (activeTooltip) activeTooltip.remove();
    activeTooltip = document.createElement('div');
    activeTooltip.className = 'chart-tooltip';
    activeTooltip.style.cssText = `
      position: fixed; background: rgba(11,37,69,0.95); color: #fff;
      padding: 8px 12px; border-radius: 6px; font-size: 12px; pointer-events: none;
      z-index: 9999; max-width: 200px; text-align: center;
    `;
    activeTooltip.textContent = `${found.label} · ${found.series}: ${found.value.toLocaleString('th-TH')} บาท`;
    activeTooltip.style.left = (clientX + 10) + 'px';
    activeTooltip.style.top = (clientY - 30) + 'px';
    document.body.appendChild(activeTooltip);
  }
}

function hideChartTooltip() {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

// Setup touch/click handlers for both charts
function setupChartTouchInteractions() {
  const financeCanvas = document.getElementById('financeChart');
  if (financeCanvas) {
    financeCanvas.addEventListener('click', (e) => {
      showChartTooltip(financeCanvas, financeChartCache, financeCanvas.getBoundingClientRect(), e.clientX, e.clientY);
      setTimeout(hideChartTooltip, 2000);
    });
  }

  const trendCanvas = document.getElementById('trendChart');
  if (trendCanvas) {
    trendCanvas.addEventListener('click', (e) => {
      showChartTooltip(trendCanvas, trendDataCache, trendCanvas.getBoundingClientRect(), e.clientX, e.clientY);
      setTimeout(hideChartTooltip, 2000);
    });
  }
}

// ===== FILTER STATE MANAGEMENT =====
const filterState = {
  search: '',
  status: '',
  date: '',
  pageSize: 10
};

function updateFilterState(key, value) {
  filterState[key] = value;
  localStorage.setItem('adminFilterState', JSON.stringify(filterState));
}

function loadFilterState() {
  try {
    const saved = JSON.parse(localStorage.getItem('adminFilterState') || '{}');
    Object.assign(filterState, saved);
  } catch (e) {
    // Ignore parse errors
  }
}

function applySavedFilters() {
  const searchBox = document.getElementById('searchBox');
  const filterStatus = document.getElementById('filterStatus');
  const filterDate = document.getElementById('filterDate');

  if (searchBox && filterState.search) searchBox.value = filterState.search;
  if (filterStatus && filterState.status) filterStatus.value = filterState.status;
  if (filterDate && filterState.date) filterDate.value = filterState.date;

  const reportsSearchBox = document.getElementById('reportsSearchBox');
  if (reportsSearchBox && filterState.search) reportsSearchBox.value = filterState.search;
}

// ===== PULL TO REFRESH =====
let pullStartY = 0;
let pullRefreshEl = null;

function initPullToRefresh() {
  const main = document.querySelector('.main');
  if (!main) return;

  pullRefreshEl = document.getElementById('pullRefresh');
  if (!pullRefreshEl) return;

  let startY = 0;
  let currentY = 0;
  let pulling = false;

  main.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  main.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0 && diff < 80) {
      pullRefreshEl.style.top = (-50 + diff) + 'px';
      if (diff > 50) {
        pullRefreshEl.classList.add('visible');
      }
    }
  }, { passive: true });

  main.addEventListener('touchend', () => {
    if (!pulling) return;
    pulling = false;
    const diff = currentY - startY;

    if (diff > 50) {
      pullRefreshEl.classList.remove('visible');
      pullRefreshEl.style.top = '-50px';
      resetToFirstPage();
      loadData();
    } else {
      pullRefreshEl.style.top = '-50px';
    }
  }, { passive: true });
}

// Close prisoner suggestions when clicking outside
document.addEventListener('click', (e) => {
  const searchBox = document.getElementById('nbPrisonerSearch');
  const suggBox = document.getElementById('nbPrisonerSuggestions');
  if (searchBox && suggBox && !searchBox.contains(e.target) && !suggBox.contains(e.target)) {
    suggBox.style.display = 'none';
  }
});

// Initialize mobile features on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadFilterState();
  setupChartTouchInteractions();
  initPullToRefresh();

  const searchBox = document.getElementById('searchBox');
  if (searchBox) searchBox.addEventListener('input', (e) => updateFilterState('search', e.target.value));

  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) filterStatus.addEventListener('change', (e) => updateFilterState('status', e.target.value));

  const filterDate = document.getElementById('filterDate');
  if (filterDate) filterDate.addEventListener('change', (e) => updateFilterState('date', e.target.value));

  // Apply saved filters after load
  applySavedFilters();
});

// ===== UPDATE STATUS =====
async function updateStatus(idx, newStatus) {
  const row = allRows[idx];
  const currentStatus = normalizeStatus(row.status);
  const role = currentUser ? currentUser.role : null;

  // Permission check based on source status
  if (role !== 'Superadmin' && role !== 'Admin') {
    if (currentStatus === 'รอตรวจสอบวินัย' && (newStatus === 'รอตรวจสอบผู้เข้าร่วม' || newStatus === 'ไม่อนุมัติ') && !hasPermission('approve_discipline')) {
      showToast('คุณไม่มีสิทธิ์ทำรายการนี้', 'error');
      return;
    }
    if (currentStatus === 'รอตรวจสอบผู้เข้าร่วม' && (newStatus === 'รอชำระเงิน' || newStatus === 'ไม่อนุมัติ') && !hasPermission('approve_participant')) {
      showToast('คุณไม่มีสิทธิ์ทำรายการนี้', 'error');
      return;
    }
    if ((currentStatus === 'รอชำระเงิน' || currentStatus === 'ชำระแล้ว' || currentStatus === 'เสร็จสิ้น') && newStatus === 'รอชำระเงิน' && !hasPermission('reject_payment')) {
      showToast('คุณไม่มีสิทธิ์ทำรายการนี้', 'error');
      return;
    }
  }

  if (!confirm(`ยืนยัน: ${newStatus} การจองของ "${row.visitorName}" ?`)) return;

  // Optimistic update
  const oldStatus = row.status;
  row.status = newStatus;

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', username: currentUser.username, password: currentUser.password, ref: row.ref, status: newStatus })
    });

    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Unauthorized');

    // Success
    showToast('เปลี่ยนสถานะการจองสำเร็จ', 'success');
    logEvent('update_status', `เปลี่ยนสถานะ ${row.ref} เป็น ${newStatus}`);
    updateStats();
    renderTable();
    renderDashboardHome();
  } catch (e) {
    // Error - revert optimistic update
    console.error('Update status error:', e);
    row.status = oldStatus;
    showToast(`ไม่สามารถเปลี่ยนสถานะได้: ${e.message || 'กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง'}`, 'error');
    updateStats();
    renderTable();
    renderDashboardHome();
  }
}

// ===== CONFIRM PAYMENT (ยืนยันการชำระเงิน) =====
async function confirmPayment(idx) {
  const row = allRows[idx];
  const s = normalizeStatus(row.status);
  const role = currentUser ? currentUser.role : null;

  // Permission check
  if (role !== 'Superadmin' && role !== 'Admin' && !hasPermission('confirm_payment')) {
    showToast('คุณไม่มีสิทธิ์ทำรายการนี้', 'error');
    return;
  }

  const targetStatus = s === 'รอชำระเงิน' ? 'ชำระแล้ว' : 'เสร็จสิ้น';

  if (!confirm(`ยืนยันการชำระเงินสำหรับ "${row.visitorName}" (${row.ref}) ?\nสถานะจะเปลี่ยนเป็น "${targetStatus}"`)) return;

  const oldStatus = row.status;
  row.status = targetStatus;

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', username: currentUser.username, password: currentUser.password, ref: row.ref, status: targetStatus })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Unauthorized');

    showToast(targetStatus === 'ชำระแล้ว' ? 'ยืนยันการชำระเงินสำเร็จ' : 'ดำเนินการจองเสร็จสิ้นเรียบร้อย', 'success');
    logEvent(s === 'รอชำระเงิน' ? 'confirm_payment_pending' : 'confirm_payment', `${s === 'รอชำระเงิน' ? 'ยืนยันชำระเงิน' : 'เสร็จสิ้น'} ${row.ref}`);
    updateStats();
    renderTable();
    renderDashboardHome();
  } catch (e) {
    console.error('Confirm payment error:', e);
    row.status = oldStatus;
    showToast(`ไม่สามารถยืนยันการชำระเงินได้: ${e.message || 'กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง'}`, 'error');
  }
}

// ===== REJECT PAYMENT (ปฏิเสธการชำระเงิน) =====
async function rejectPayment(idx) {
  const row = allRows[idx];
  const s = normalizeStatus(row.status);
  const role = currentUser ? currentUser.role : null;

  // Permission check
  if (role !== 'Superadmin' && role !== 'Admin' && !hasPermission('reject_payment')) {
    showToast('คุณไม่มีสิทธิ์ทำรายการนี้', 'error');
    return;
  }

  const reason = prompt(`ปฏิเสธการชำระเงินของ "${row.visitorName}" (${row.ref})\n\nเหตุผล (ถ้ามี):`, '');
  if (reason === null) return;

  const oldStatus = row.status;
  row.status = 'รอชำระเงิน';

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', username: currentUser.username, password: currentUser.password, ref: row.ref, status: 'รอชำระเงิน' })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Unauthorized');

    showToast('ปฏิเสธการชำระเงินเรียบร้อยแล้ว', 'warning');
    logEvent('reject_payment', `ปฏิเสธการชำระเงิน ${row.ref} เหตุผล: ${reason}`);
    updateStats();
    renderTable();
    renderDashboardHome();
  } catch (e) {
    console.error('Reject payment error:', e);
    row.status = oldStatus;
    showToast(`ไม่สามารถปฏิเสธการชำระเงินได้: ${e.message || 'กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง'}`, 'error');
  }
}

// ===== CANCEL BOOKING =====
async function cancelBooking(idx) {
  const row = allRows[idx];
  const role = currentUser ? currentUser.role : null;

  // Permission check
  if (role !== 'Superadmin' && role !== 'Admin' && !hasPermission('cancel')) {
    showToast('คุณไม่มีสิทธิ์ทำรายการนี้', 'error');
    return;
  }

  if (!confirm(`⚠️ ยืนยันการยกเลิกการจอง\n\nRef: ${row.ref}\nผู้เยี่ยม: ${row.visitorName}\nสถานะปัจจุบัน: ${row.status}\n\nการยกเลิกไม่สามารถกู้คืนได้`)) return;

  const oldStatus = row.status;
  row.status = 'ยกเลิก';

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'cancelBooking', username: currentUser.username, password: currentUser.password, ref: row.ref })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Unauthorized');
  } catch (e) {
    console.error('Cancel booking error:', e);
    row.status = oldStatus;
    showToast(`ไม่สามารถยกเลิกการจองได้: ${e.message || 'กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง'}`, 'error');
    return;
  }

  showToast('ยกเลิกการจองเรียบร้อยแล้ว', 'warning');
  logEvent('cancel_booking', `ยกเลิกการจอง ${row.ref}`);
  updateStats();
  renderTable();
  renderDashboardHome();
}

/* ===== Per-visitor approval (update + recalc price + overwrite row) ===== */
async function updateVisitorApproval(idx, pidx, val) {
  const row = allRows[idx];
  if (!row) return;
  const role = currentUser ? currentUser.role : null;

  // Permission check
  if (role !== 'Superadmin' && role !== 'Admin' && !hasPermission('visitor_approval')) {
    showToast('คุณไม่มีสิทธิ์ทำรายการนี้', 'error');
    return;
  }

  if (pidx === 0) {
    row.visitorApproved = val;
  } else {
    let arr = String(row.extraVisitorApproved || '').split(';;');
    const n = row.extraVisitorNames ? row.extraVisitorNames.split(';;').filter(x => x.trim()).length : 0;
    while (arr.length < n) arr.push('');
    arr[pidx - 1] = val;
    row.extraVisitorApproved = arr.join(';;');
  }

  // Optimistic update for visitor count and total
  const oldVisitorApproved = row.visitorApproved;
  const oldExtraVisitorApproved = row.extraVisitorApproved;
  const oldVisitorCount = row.visitorCount;
  const oldTotal = row.total;

  let approvedRel = ((row.visitorApproved || '') === 'yes' ? 1 : 0);
  let total = 2000; // main visitor (1000) + prisoner (1000)
  if (row.extraVisitorApproved && row.extraVisitorNames) {
    const extras = parseExtraVisitors(row);
    const approvals = String(row.extraVisitorApproved).split(';;');
    extras.forEach((v, idx) => {
      if ((approvals[idx] || '').trim().toLowerCase() === 'yes') {
        let fee = 1000;
        if (v.relation === 'บุตร / ธิดา') {
          const a = parseInt(v.age, 10);
          if (!isNaN(a)) {
            if (a < 5) fee = 0;
            else if (a <= 8) fee = 500;
          }
        }
        total += fee;
        approvedRel++;
      }
    });
  }
  row.visitorCount = approvedRel;
  row.total = total;

  try {
    const resp = await fetch(APPS_SCRIPT_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateVisitorApproval', username: currentUser.username, password: currentUser.password, ref: row.ref, visitorApproved: row.visitorApproved || '', extraVisitorApproved: row.extraVisitorApproved || '', visitorCount: row.visitorCount, total: row.total }) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Unauthorized');

    // Success
    showToast('อัปเดตการอนุมัติผู้เข้าร่วมสำเร็จ', 'success');
    logEvent('visitor_approval', `อัปเดตการอนุมัติ ${row.ref} ให้ ${val}`);
    viewDetail(idx);
    renderTable();
  } catch (e) {
    // Error - revert optimistic update
    console.error('Visitor approval error:', e);
    row.visitorApproved = oldVisitorApproved;
    row.extraVisitorApproved = oldExtraVisitorApproved;
    row.visitorCount = oldVisitorCount;
    row.total = oldTotal;
    showToast(`ไม่สามารถอัปเดตการอนุมัติผู้เข้าร่วมได้: ${e.message || 'กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง'}`, 'error');
    viewDetail(idx);
    renderTable();
  }
}

/* ===== Visitor per-person approval helpers ===== */
function getApprLabel(v) { return v === 'yes' ? '✅ เข้าได้' : v === 'no' ? '❌ เข้าไม่ได้' : '⏳ รอตัดสิน'; }

// Normalize legacy statuses for consistent display across pages
function normalizeStatus(s) {
  const v = (s || '').toString().trim();
  // New workflow statuses (return as-is) - check first before legacy mapping
  if (['รอตรวจสอบวินัย', 'รอตรวจสอบผู้เข้าร่วม', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น', 'ยกเลิก', 'ไม่อนุมัติ'].includes(v)) {
    return v;
  }
  // Legacy status mappings
  if (v === 'รอตรวจสอบ' || ['อนุมัติ', 'approved'].includes(v) || v.toLowerCase() === 'approved') return 'รอตรวจสอบวินัย';
  if (v.toLowerCase() === 'rejected') return 'ไม่อนุมัติ';
  if (v.toLowerCase() === 'paid') return 'ชำระแล้ว';
  if (v.toLowerCase() === 'done') return 'เสร็จสิ้น';
  return v || 'รอตรวจสอบวินัย';
}

function viewSlip(idx) {
  const row = allRows[idx];
  const modalBody = document.getElementById('modalBody');
  const slip = (row.slipImage || '').trim();

  const infoBox = `<div style="margin-top:10px;font-size:13px;color:var(--text2);padding:10px;background:var(--bg);border-radius:6px;">
    <b>${escHtml(row.ref)}</b> · ${escHtml(row.visitorName)}<br>
    ยอด: <b>${(row.total || 0).toLocaleString()} บาท</b> · สถานะ: <b>${escHtml(row.status)}</b>
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
    const openUrl = fileId ? `https://drive.google.com/file/d/${fileId}/view` : slip;

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
      <div style="font-size:12px;color:var(--text2);margin-top:4px;">เวลาอัปโหลด: ${slip.replace('SLIP_UPLOADED:', '')}</div>
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
  let badgeClass = 'badge-pending-review';
  if (s === 'รอชำระเงิน') badgeClass = 'badge-payment-pending';
  else if (s === 'ชำระแล้ว') badgeClass = 'badge-paid';
  else if (s === 'เสร็จสิ้น') badgeClass = 'badge-completed';
  else if (s === 'ไม่อนุมัติ') badgeClass = 'badge-rejected';
  else if (s === 'ยกเลิก') badgeClass = 'badge-cancelled';
  else if (s === 'รอตรวจสอบ') badgeClass = 'badge-pending-review';
  else if (s === 'รอตรวจสอบวินัย') badgeClass = 'badge-discipline-check';
  else if (s === 'รอตรวจสอบผู้เข้าร่วม') badgeClass = 'badge-participant-check';

  const va = r.visitorApproved || '';
  const role = currentUser ? currentUser.role : null;
  const isAdminOrSuper = role === 'Superadmin' || role === 'Admin';
  const canVisitorApproval = isAdminOrSuper || hasPermission('visitor_approval');
  const canApproveParticipant = isAdminOrSuper || hasPermission('approve_participant');

  const visitor1Html = `
     <div class="visitor-card">
       <div class="vc-num">👤 ผู้ร่วมกิจกรรมคนที่ 1 (ผู้จอง)</div>
       <div class="vc-name">${escHtml(r.visitorName) || '—'}</div>
       <div class="vc-info">บัตร: ${escHtml(r.visitorId) || '—'} · โทร: ${escHtml(r.visitorPhone) || '—'} · ความสัมพันธ์: ${escHtml(r.relation) || '—'}</div>
       <div class="vc-info">ศาสนา: ${escHtml(r.religion) || '—'} · แพ้อาหาร: ${escHtml(r.allergy) || '—'}</div>
        <div class="visitor-approval">
          <span class="lbl">สถานะ:</span>
          <span class="approval-badge ${va === 'yes' ? 'yes' : va === 'no' ? 'no' : 'pending'}">${getApprLabel(va)}</span>
          ${canVisitorApproval ? `<button class="approval-btn yes" onclick="updateVisitorApproval(${idx},0,'yes')">✓</button>
          <button class="approval-btn no" onclick="updateVisitorApproval(${idx},0,'no')">✗</button>` : ''}
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
          name: (parts[0] || '').trim(),
          id: (parts[1] || '').trim(),
          relation: (parts[2] || '').trim(),
          age: (parts[3] || '').trim()
        };
      }).filter(e => e.name);
    } else {
      extras = r.extraVisitorNames.split(/,(?![^(]*\))/).map(e => {
        const m = e.trim().match(/^(.+?)\s*\(([^,)]+?)(?:,\s*([^)]+))?\)$/);
        if (m) return { name: m[1].trim(), id: (m[2] || '').trim(), relation: (m[3] || '').trim(), age: '' };
        return { name: e.trim(), id: '', relation: '', age: '' };
      }).filter(e => e.name);
    }
    extras.forEach((v, i) => {
      const infoParts = [];
      if (v.id) infoParts.push('บัตร: ' + v.id);
      if (v.relation) infoParts.push('ความสัมพันธ์: ' + v.relation);
      const er = String(r.extraVisitorReligions || '').split(';;')[i] || '';
      const ea2 = String(r.extraVisitorAllergies || '').split(';;')[i] || '';
      if (er) infoParts.push('ศาสนา: ' + er);
      if (ea2) infoParts.push('แพ้อาหาร: ' + ea2);
      const ea = String(r.extraVisitorApproved || '').split(';;')[i] || '';
      extraHtml += `
         <div class="visitor-card">
           <div class="vc-num">👤 ผู้ร่วมกิจกรรมคนที่ ${i + 2}</div>
           <div class="vc-name">${escHtml(v.name)}</div>
           ${infoParts.length ? '<div class="vc-info">' + infoParts.join(' · ') + '</div>' : ''}
            <div class="visitor-approval">
              <span class="lbl">สถานะ:</span>
              <span class="approval-badge ${ea === 'yes' ? 'yes' : ea === 'no' ? 'no' : 'pending'}">${getApprLabel(ea)}</span>
              ${canVisitorApproval ? `<button class="approval-btn yes" onclick="updateVisitorApproval(${idx},${i + 1},'yes')">✓</button>
              <button class="approval-btn no" onclick="updateVisitorApproval(${idx},${i + 1},'no')">✗</button>` : ''}
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
        <div style="font-size:20px;font-weight:700;color:var(--blue);letter-spacing:2px;">${escHtml(r.ref) || '—'}</div>
      </div>
      <span class="badge ${badgeClass}" style="font-size:13px;padding:6px 14px;">${s}</span>
    </div>

    <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">ผู้ร่วมกิจกรรมทั้งหมด (${r.visitorCount || 1} คน)</div>
    ${visitor1Html}
    ${extraHtml}

    <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-top:8px;">
      <div class="detail-row">
        <span class="dlbl">🔒 ผู้ต้องขัง</span>
        <span class="dval">${escHtml(r.prisonerName) || '—'} <span style="color:var(--text2);font-weight:400">(#${escHtml(r.prisonerId) || '—'})</span></span>
      </div>
      <div class="detail-row">
        <span class="dlbl">🏢 แดน</span>
        <span class="dval">${escHtml(r.wing) || '—'}</span>
      </div>
      <div class="detail-row">
        <span class="dlbl">📅 วันที่เยี่ยม</span>
        <span class="dval">${escHtml(r.visitDate) || '—'}</span>
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
         <span class="dval">${escHtml(r.timestamp) || '—'}</span>
       </div>
${canApproveParticipant && s === 'รอตรวจสอบผู้เข้าร่วม' ? `
         <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);">
           <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;margin-bottom:8px;">
             <span style="font-size:12px;color:var(--text2);">อนุมัติทั้งหมด:</span>
             <button class="btn-approve" onclick="approveAllVisitorsInDetail(${idx})" style="font-size:12px;padding:6px 12px;">✓ อนุมัติทั้งหมดทันที</button>
           </div>
           <div style="display:flex;gap:8px;justify-content:flex-end">
             <button class="btn-approve" onclick="approveParticipantInDetail(${idx})" style="font-size:13px;padding:8px 16px;">✓ อนุมัติผู้เข้าร่วม (หลังตรวจสอบแต่ละคน)</button>
             <button class="btn-reject" onclick="rejectParticipantInDetail(${idx})" style="font-size:13px;padding:8px 16px;">✗ ปฏิเสธ</button>
           </div>
         </div>` : ''}
     </div>
   `;
  document.getElementById('detailModalBg').classList.add('show');
}

function closeDetailModal(e) {
  if (!e || e.target === document.getElementById('detailModalBg')) {
    document.getElementById('detailModalBg').classList.remove('show');
  }
}

async function approveParticipantInDetail(idx) {
  const row = allRows[idx];
  const role = currentUser ? currentUser.role : null;

  // Permission check
  if (role !== 'Superadmin' && role !== 'Admin' && !hasPermission('approve_participant')) {
    showToast('คุณไม่มีสิทธิ์ทำรายการนี้', 'error');
    return;
  }

  if (!confirm(`อนุมัติผู้เข้าร่วมสำหรับ "${row.visitorName}" ใช่หรือไม่?`)) return;

  const oldStatus = row.status;
  row.status = 'รอชำระเงิน';

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', username: currentUser.username, password: currentUser.password, ref: row.ref, status: 'รอชำระเงิน' })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Unauthorized');

    showToast('อนุมัติผู้เข้าร่วมการจองเรียบร้อยแล้ว', 'success');
    logEvent('approve_participant', `อนุมัติผู้เข้าร่วม ${row.ref}`);
    updateStats();
    renderTable();
    renderDashboardHome();
    closeDetailModal();
  } catch (e) {
    console.error('Approve participant error:', e);
    row.status = oldStatus;
    showToast(`ไม่สามารถอนุมัติผู้เข้าร่วมได้: ${e.message || 'กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง'}`, 'error');
    updateStats();
    renderTable();
    renderDashboardHome();
    closeDetailModal();
  }
}

async function rejectParticipantInDetail(idx) {
  const row = allRows[idx];
  const role = currentUser ? currentUser.role : null;

  // Permission check
  if (role !== 'Superadmin' && role !== 'Admin' && !hasPermission('approve_participant')) {
    showToast('คุณไม่มีสิทธิ์ทำรายการนี้', 'error');
    return;
  }

  if (!confirm(`ปฏิเสธผู้เข้าร่วมสำหรับ "${row.visitorName}" ให้หรือไม่?`)) return;

  const oldStatus = row.status;
  row.status = 'ไม่อนุมัติ';

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', username: currentUser.username, password: currentUser.password, ref: row.ref, status: 'ไม่อนุมัติ' })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Unauthorized');

    // Success
    showToast('ปฏิเสธผู้เข้าร่วมสำเร็จ', 'warning');
    logEvent('reject_participant', `ปฏิเสธผู้เข้าร่วม ${row.ref}`);
    updateStats();
    renderTable();
    renderDashboardHome();
    closeDetailModal();
  } catch (e) {
    // Error - revert optimistic update
    console.error('Reject participant error:', e);
    row.status = oldStatus;
    showToast(`ไม่สามารถปฏิเสธผู้เข้าร่วมได้: ${e.message || 'กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง'}`, 'error');
    updateStats();
    renderTable();
    renderDashboardHome();
    closeDetailModal();
  }
}

/* ===== Approve all visitors at once (Tadtel flow) ===== */
async function approveAllVisitorsInDetail(idx) {
  const row = allRows[idx];
  const role = currentUser ? currentUser.role : null;

  // Permission check
  if (role !== 'Superadmin' && role !== 'Admin' && !hasPermission('approve_participant')) {
    showToast('คุณไม่มีสิทธิ์ทำรายการนี้', 'error');
    return;
  }

  if (!confirm(`อนุมัติผู้เข้าร่วมทุกคนสำหรับ "${row.visitorName}" ใช่หรือไม่? (จะอนุมัติทันทีโดยไม่ต้องตรวจสอบแต่ละคน)`)) return;

  // Approve all visitors automatically
  const oldStatus = row.status;
  const oldVisitorApproved = row.visitorApproved;
  const oldExtraVisitorApproved = row.extraVisitorApproved;

  row.visitorApproved = 'yes';
  const extras = parseExtraVisitors(row);
  if (extras.length > 0) {
    row.extraVisitorApproved = extras.map(() => 'yes').join(';;');
  } else {
    row.extraVisitorApproved = '';
  }

  // Calculate visitor count and total with child pricing
  let total = 2000; // main visitor (1000) + prisoner (1000)
  extras.forEach(v => {
    let fee = 1000;
    if (v.relation === 'บุตร / ธิดา') {
      const a = parseInt(v.age, 10);
      if (!isNaN(a)) {
        if (a < 5) fee = 0;
        else if (a <= 8) fee = 500;
      }
    }
    total += fee;
  });
  const approvedRel = 1 + extras.length;
  row.visitorCount = approvedRel;
  row.total = total;

  // Now approve to next status
  const newStatus = 'รอชำระเงิน';

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updateVisitorApproval',
        username: currentUser.username,
        password: currentUser.password,
        ref: row.ref,
        visitorApproved: row.visitorApproved,
        extraVisitorApproved: row.extraVisitorApproved,
        visitorCount: row.visitorCount,
        total: row.total
      })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Unauthorized');

    // Then update status
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updateStatus',
        username: currentUser.username,
        password: currentUser.password,
        ref: row.ref,
        status: newStatus
      })
    });

    showToast('อนุมัติผู้เข้าร่วมทั้งหมดเรียบร้อยแล้ว', 'success');
    logEvent('approve_all_visitors', `อนุมัติผู้เข้าร่วมทั้งหมด ${row.ref}`);
    updateStats();
    renderTable();
    renderDashboardHome();
    closeDetailModal();
  } catch (e) {
    console.error('Approve all visitors error:', e);
    row.status = oldStatus;
    row.visitorApproved = oldVisitorApproved;
    row.extraVisitorApproved = oldExtraVisitorApproved;
    showToast(`ไม่สามารถอนุมัติผู้เข้าร่วมทั้งหมดได้: ${e.message || 'กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง'}`, 'error');
    updateStats();
    renderTable();
    closeDetailModal();
  }
}

// ===== EXPORT FILTERED DATA AS CSV =====

// ===== EXPORT FILTERED DATA AS CSV =====
function exportFilteredCSV() {
  // Removed permission check - everyone can export
  const q = document.getElementById('searchBox').value.toLowerCase();
  const fs = document.getElementById('filterStatus').value;
  const fd = document.getElementById('filterDate').value;

  const filtered = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false;
    if (fs && normalizeStatus(r.status) !== fs) return false;
    if (fd && r.visitDate !== fd) return false;
    if (q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    return true;
  });

  if (!filtered.length) {
    showToast('ไม่มีข้อมูลตาม filter ที่เลือก', 'warning');
    return;
  }

  const headers = ['ref', 'timestamp', 'visitorName', 'visitorPhone', 'visitorId', 'relation', 'prisonerName', 'prisonerId', 'wing', 'visitDate', 'visitorCount', 'total', 'status', 'extraVisitorNames', 'visitorApproved', 'extraVisitorApproved'];
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
  link.download = `CC_Cafe_Reservations_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('ส่งออกไฟล์ CSV สำเร็จ', 'success');
  logEvent('export_csv', 'ส่งออกข้อมูลเป็น CSV');
}

function exportFilteredCSVWithPhones() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const fs = document.getElementById('filterStatus').value;
  const fd = document.getElementById('filterDate').value;

  const filtered = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false;
    if (fs && normalizeStatus(r.status) !== fs) return false;
    if (fd && r.visitDate !== fd) return false;
    if (q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    return true;
  });

  if (!filtered.length) {
    showToast('ไม่มีข้อมูลตาม filter ที่เลือก', 'warning');
    return;
  }

  const headers = ['ref', 'timestamp', 'visitorName', 'visitorPhone', 'visitorId', 'relation', 'prisonerName', 'prisonerId', 'wing', 'visitDate', 'visitorCount', 'total', 'status', 'extraVisitorNames', 'extraVisitorPhones', 'visitorApproved', 'extraVisitorApproved'];
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

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CC_Cafe_Reservations_WithPhones_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('ส่งออกไฟล์ CSV (มีเบอร์โทร) สำเร็จ', 'success');
  logEvent('export_csv_phones', 'ส่งออกข้อมูล CSV พร้อมเบอร์โทร');
}

async function syncPrisonerWings() {
  if (!confirm('ดำเนินการ Sync Wings (อัปเดตแดนในรายการจองตามข้อมูลผู้ต้องขังล่าสุด) ใช่หรือไม่?')) return;
  const btn = document.getElementById('btnSyncWings');
  if (btn) btn.disabled = true;
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'syncPrisonerWings', username: currentUser.username, password: currentUser.password })
    });
    const data = JSON.parse(await resp.text());
    if (data.status === 'ok') {
      showToast('Sync Wings สำเร็จ: ' + (data.updated || 0) + ' รายการ', 'success');
      logEvent('sync_wings', 'Sync ข้อมูลแดน');
      await loadData();
      renderTable();
      renderReportsView();
      renderFormalReportsView();
    } else {
      showToast('Sync Wings ล้มเหลว: ' + (data.message || ''), 'error');
    }
  } catch (e) {
    showToast('Sync Wings Error: ' + e.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function exportFilteredCSVWithRange() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const fs = document.getElementById('filterStatus').value;
  const fd = document.getElementById('filterDate').value;
  const fw = document.getElementById('filterWing') ? document.getElementById('filterWing').value : '';
  const sd = document.getElementById('exportStartDate') ? document.getElementById('exportStartDate').value : '';
  const ed = document.getElementById('exportEndDate') ? document.getElementById('exportEndDate').value : '';

  const filtered = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false;
    if (fs && normalizeStatus(r.status) !== fs) return false;
    if (fd && r.visitDate !== fd) return false;
    if (fw && (r.wing || '') !== fw) return false;
    if (sd && (r.visitDate || r.visitDateISO) < sd) return false;
    if (ed && (r.visitDate || r.visitDateISO) > ed) return false;
    if (q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    return true;
  });

  if (!filtered.length) {
    showToast('ไม่มีข้อมูลตามช่วงวันที่ที่เลือก', 'warning');
    return;
  }

  const headers = ['ref', 'timestamp', 'visitorName', 'visitorPhone', 'visitorId', 'relation', 'prisonerName', 'prisonerId', 'wing', 'visitDate', 'visitorCount', 'total', 'status', 'extraVisitorNames', 'extraVisitorPhones', 'visitorApproved', 'extraVisitorApproved'];
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

  const rangeLabel = (sd || 'start') + '_to_' + (ed || 'end');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CC_Cafe_Reservations_${rangeLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('ส่งออก CSV (ช่วงวันที่) สำเร็จ ' + filtered.length + ' รายการ', 'success');
  logEvent('export_csv_range', 'ส่งออกข้อมูล CSV ช่วงวันที่');
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
        name: (p[0] || '').trim(),
        id: (p[1] || '').trim(),
        relation: (p[2] || '').trim(),
        age: (p[3] || '').trim()
      };
    }).filter(e => e.name);
  } else {
    return str.split(/,(?![^(]*\))/).map(e => {
      const m = e.trim().match(/^(.+?)\s*\(([^,)]+?)(?:,\s*([^)]+))?\)$/);
      if (m) return { name: m[1].trim(), id: (m[2] || '').trim(), relation: (m[3] || '').trim(), age: '' };
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

  extras.forEach((v, vi) => {
    const ea = String(row.extraVisitorApproved || '').split(';;')[vi] || '';
    if (ea === 'no') return;

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
    if (fs && normalizeStatus(r.status) !== fs) return false;
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
    showToast('ไม่มีข้อมูลตาม filter ที่เลือก', 'warning');
    return;
  }

  const now = new Date().toLocaleString('th-TH');

  // Calculate grand totals
  let totalVisitors = 0;
  let totalPrice = 0;
  filtered.forEach(r => {
    const cnt = parseInt(r.visitorCount) || 1;
    totalVisitors += cnt;
    totalPrice += parseInt(r.total) || 0;
  });
  const totalPrisoners = filtered.length;
  const totalPeople = totalVisitors + totalPrisoners;

  let html = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายงานการจัดโต๊ะ - CC Cafe</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');
  body { font-family: 'Sarabun', system-ui, sans-serif; padding: 20px 24px; margin:0; color:#000; background:#fff; line-height:1.5; font-size:14px; }
  h1 { font-size:22px; margin:0 0 4px; font-weight:700; text-align:center; color: #0B2545; }
  h2 { font-size:16px; margin:0 0 2px; font-weight:700; color: #1C2433; }
  .meta { font-size:12px; color:#555; text-align:center; margin-bottom:20px; }
  
  /* Table/Ref Block */
  .table-block { 
    margin-bottom:20px; 
    page-break-inside: avoid; 
    border: 2px solid #0B2545; 
    border-radius: 8px; 
    overflow: hidden;
    background:#fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  }
  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #0B2545;
    color: #fff;
  }
  .table-num {
    font-size: 15px;
    font-weight: 700;
    background: #D4AF37;
    color: #1C2433;
    padding: 4px 14px;
    border-radius: 4px;
  }
  .table-ref {
    font-size: 14px;
    font-weight: 600;
    margin-left: 10px;
  }
  .table-date {
    font-size: 12px;
    opacity: 0.9;
  }
  
  /* Content sections */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 14px;
  }
  .info-section {
    border: 1.5px solid #ddd;
    border-radius: 6px;
    padding: 10px 12px;
    background: #fafafa;
  }
  .info-section.prisoner {
    background: #f0f7f0;
    border-color: #166534;
  }
  .info-section.visitor {
    background: #f0f4ff;
    border-color: #0B2545;
  }
  .section-title {
    font-weight: 700;
    font-size: 13px;
    margin-bottom: 6px;
    color: #0B2545;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .info-section.prisoner .section-title {
    color: #166534;
  }
  .info-line {
    margin: 3px 0;
    font-size: 13px;
    line-height: 1.4;
  }
  .info-line b {
    font-weight: 600;
    color: #1C2433;
  }
  
  /* Extra visitors */
  .extra-section {
    grid-column: 1 / -1;
    background: #fff8e7;
    border: 1.5px solid #f5c542;
    border-radius: 6px;
    padding: 10px 12px;
  }
  .extra-title {
    font-weight: 700;
    font-size: 13px;
    color: #92400e;
    margin-bottom: 6px;
  }
  .extra-item {
    font-size: 13px;
    padding: 2px 0;
    padding-left: 12px;
    position: relative;
  }
  .extra-item::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #D4AF37;
    font-weight: bold;
  }
  
  /* Footer info */
  .table-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f8f9fa;
    border-top: 1.5px solid #ddd;
  }
  .visit-date-info {
    font-size: 13px;
    color: #555;
  }
  .visit-date-info b {
    color: #0B2545;
    font-size: 15px;
  }
  .people-count {
    background: #D4AF37;
    color: #1C2433;
    padding: 6px 16px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 16px;
    text-align: center;
    min-width: 120px;
  }
  .people-count .label {
    font-size: 11px;
    font-weight: 500;
    display: block;
  }
  .people-count .number {
    font-size: 18px;
    font-weight: 800;
  }
  
  /* Grand Summary */
  .grand-summary { 
    margin-top: 36px; 
    page-break-before: always;
    padding: 24px;
  }
  .grand-box {
    border: 3px solid #0B2545;
    border-radius: 10px;
    padding: 24px 32px;
    background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
    max-width: 500px;
    margin: 0 auto;
  }
  .grand-title {
    font-size: 18px;
    font-weight: 800;
    color: #0B2545;
    text-align: center;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid #0B2545;
  }
  .grand-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 10px 0;
    font-size: 15px;
  }
  .grand-item .g-label {
    color: #555;
    font-weight: 500;
  }
  .grand-item .g-number {
    font-weight: 800;
    font-size: 20px;
    color: #0B2545;
  }
  .grand-total {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 3px solid #D4AF37;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .grand-total .g-label {
    font-size: 16px;
    font-weight: 600;
    color: #1C2433;
  }
  .grand-total .g-number {
    font-size: 26px;
    font-weight: 900;
    color: #D4AF37;
  }
  
  .footer-note {
    text-align: center;
    font-size: 11px;
    color: #888;
    margin-top: 20px;
  }
  
  /* Page footer - fixed at bottom of page */
  body {
    margin-bottom: 16mm;
  }
  .page-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 12mm;
    border-top: 1px solid #ddd;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #666;
    background: #fff;
  }
  .table-block {
    margin-bottom: 16mm;
  }
  
  @media print {
    @page { size: A4; margin: 10mm 8mm; }
    body { padding: 4mm 6mm; font-size: 11px; line-height: 1.4; }
    .no-print, .print-preview-bar { display: none !important; }
    h1 { font-size: 16px; margin-bottom: 2px; }
    h2 { font-size: 13px; }
    .meta { font-size: 10px; margin-bottom: 8px; }
    .table-block { 
      padding: 0;
      margin-bottom: 3mm;
      border-width: 1.5px;
    }
    .table-header {
      padding: 6px 10px;
    }
    .table-num {
      padding: 3px 10px;
      font-size: 12px;
    }
    .table-ref {
      font-size: 12px;
    }
    .table-date {
      font-size: 10px;
    }
    .content-grid {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 8px 10px;
    }
    .info-section {
      padding: 6px 8px;
    }
    .section-title {
      font-size: 11px;
      margin-bottom: 4px;
    }
    .info-line {
      margin: 2px 0;
      font-size: 11px;
    }
    .info-line b {
      font-size: 11px;
    }
    .extra-section {
      padding: 6px 8px;
    }
    .extra-title {
      font-size: 11px;
      margin-bottom: 4px;
    }
    .extra-item {
      font-size: 11px;
      padding: 1px 0;
      padding-left: 10px;
    }
    .table-footer {
      padding: 6px 10px;
    }
    .visit-date-info {
      font-size: 11px;
    }
    .visit-date-info b {
      font-size: 13px;
    }
    .people-count {
      padding: 4px 12px;
      font-size: 13px;
    }
    .people-count .label {
      font-size: 9px;
    }
    .people-count .number {
      font-size: 15px;
    }
    .grand-summary {
      margin-top: 6mm;
      padding: 12px;
    }
    .grand-box {
      padding: 16px 20px;
    }
    .grand-title {
      font-size: 14px;
      margin-bottom: 10px;
      padding-bottom: 6px;
    }
    .grand-item {
      margin: 6px 0;
      font-size: 12px;
    }
    .grand-item .g-number {
      font-size: 16px;
    }
    .grand-total {
      margin-top: 10px;
      padding-top: 10px;
    }
    .grand-total .g-label {
      font-size: 13px;
    }
    .grand-total .g-number {
      font-size: 20px;
    }
    
    /* Page footer */
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 12mm;
      border-top: 1px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #666;
      background: #fff;
    }
    .table-block {
      margin-bottom: 16mm;
    }
  }
</style></head><body>`;

  html += `<div class="no-print print-preview-bar" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#1a1a2e;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'Sarabun',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
    <span style="font-weight:600;">📋 ตัวอย่างก่อนพิมพ์</span>
    <div style="display:flex;gap:8px;">
      <button onclick="window.print()" style="background:#16a34a;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;">🖨️ พิมพ์</button>
      <button onclick="window.close()" style="background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;">✕ ปิด</button>
    </div>
  </div>`;
  html += `<div style="margin-top:50px;"></div>`;
  html += `<div class="print-header"><h1>ทัณฑสถานบำบัดพิเศษกลาง</h1><h2>Chance & Change Cafe</h2></div>`;
  html += `<h1>🪑 รายงานการจัดโต๊ะ</h1>`;
  html += `<h2>ร้าน Chance & Change Cafe · ทัณฑสถานบำบัดพิเศษกลาง</h2>`;
  html += '<div class="meta">พิมพ์เมื่อ ' + now + ' · ผู้ปริ้น: ' + (currentUser?.displayName || currentUser?.username || 'ไม่ระบุ') + ' · เรียงตามเลขที่อ้างอิง · จำนวน ' + filtered.length + ' โต๊ะ</div>';

  filtered.forEach((r, i) => {
    const extras = parseExtraVisitors(r);
    const visitorCount = parseInt(r.visitorCount) || 1;
    const totalPeopleThisTable = visitorCount + 1; // visitors + prisoner

    html += `<div class="table-block">`;

    // Header
    html += `<div class="table-header">`;
    html += `<div style="display:flex;align-items:center;">`;
    html += `<span class="table-num">โต๊ะ ${i + 1}</span>`;
    html += `<span class="table-ref">${r.ref || '—'}</span>`;
    html += `</div>`;
    html += `<span class="table-date">📅 ${r.visitDate || '—'}</span>`;
    html += `</div>`;

    // Content Grid
    html += `<div class="content-grid">`;

    // Left: Prisoner Info
    html += `<div class="info-section prisoner">`;
    html += `<div class="section-title">🔒 ผู้ต้องขัง</div>`;
    html += `<div class="info-line">ชื่อ: <b>น.ช. ${r.prisonerName || '—'}</b></div>`;
    html += `<div class="info-line">เลขประจำตัว: <b>${r.prisonerId || '—'}</b></div>`;
    html += `<div class="info-line">แดน: <b>${r.wing || '—'}</b></div>`;
    html += `</div>`;

    // Right: Main Visitor Info
    html += `<div class="info-section visitor">`;
    html += `<div class="section-title">👤 ผู้เยี่ยมหลัก</div>`;
    html += `<div class="info-line"><b>${r.visitorName || '—'}</b></div>`;
    html += `<div class="info-line">โทร: ${r.visitorPhone || '—'}</div>`;
    html += `<div class="info-line">ความสัมพันธ์: ${r.relation || '—'}</div>`;
    html += `<div class="info-line">ศาสนา: ${r.religion || '—'}</div>`;
    html += `<div class="info-line">แพ้อาหาร: ${r.allergy || 'ไม่มี'}</div>`;
    html += `</div>`;

    // Extra visitors (full width)
    if (extras.length > 0) {
      const approvedExtras = extras.filter((e, ei) => {
        const ea = String(r.extraVisitorApproved || '').split(';;')[ei] || '';
        return ea !== 'no';
      });
      if (approvedExtras.length > 0) {
        html += `<div class="extra-section">`;
        html += `<div class="extra-title">👥 ผู้เยี่ยมเพิ่มเติม (${approvedExtras.length} คน)</div>`;
        approvedExtras.forEach((e) => {
          html += `<div class="extra-item">${e.name || '—'} · ${e.relation || '—'}${e.id ? ' · บัตร ' + e.id : ''}</div>`;
        });
        html += `</div>`;
      }
    }

    html += `</div>`; // End content-grid

    // Footer with date and people count
    html += `<div class="table-footer">`;
    html += `<div class="visit-date-info">วันที่เยี่ยม: <b>${r.visitDate || '—'}</b></div>`;
    html += `<div class="people-count">`;
    html += `<span class="label">จำนวนคน</span>`;
    html += `<span class="number">${totalPeopleThisTable} คน</span>`;
    html += `</div>`;
    html += `</div>`;

    html += `</div>`; // End table-block
  });

  // ========== GRAND TOTAL SUMMARY ==========
  html += `<div class="grand-summary">`;
  html += `<div class="grand-box">`;
  html += `<div class="grand-title">📋 สรุปยอดรวมทั้งหมด</div>`;

  html += `<div class="grand-item">`;
  html += `<span class="g-label">จำนวนโต๊ะ</span>`;
  html += `<span class="g-number">${filtered.length} โต๊ะ</span>`;
  html += `</div>`;

  html += `<div class="grand-item">`;
  html += `<span class="g-label">จำนวนผู้เยี่ยม</span>`;
  html += `<span class="g-number">${totalVisitors} คน</span>`;
  html += `</div>`;

  html += `<div class="grand-item">`;
  html += `<span class="g-label">จำนวนผู้ต้องขัง</span>`;
  html += `<span class="g-number">${totalPrisoners} คน</span>`;
  html += `</div>`;

  html += `<div class="grand-item">`;
  html += `<span class="g-label">ยอดเงินรวม</span>`;
  html += `<span class="g-number">${totalPrice.toLocaleString('th-TH')} บาท</span>`;
  html += `</div>`;

  html += `<div class="grand-total">`;
  html += `<span class="g-label">รวมคนทั้งหมด</span>`;
  html += `<span class="g-number">${totalPeople} คน</span>`;
  html += `</div>`;

  html += `</div>`;
  html += `<div class="footer-note">พิมพ์จากระบบ CC Cafe Reservation · ทัณฑสถานบำบัดพิเศษกลาง · ${now}</div>`;
  html += `</div>`;

  // Page footer for print
  const printerName = currentUser?.displayName || currentUser?.username || 'ไม่ระบุ';
  html += `<div class="page-footer">ผู้ปริ้น: ${printerName} · พิมพ์เมื่อ ${now}</div>`;

  html += `</body></html>`;

  const w = window.open('', '_blank', 'width=1200,height=850');
  if (!w) {
    showToast('กรุณาอนุญาต Popup เพื่อเปิดหน้าพิมพ์รายงาน', 'warning');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
}

// ===== PRINT PRISONER LIST FOR วินัย CHECK (only name, ID, Wing) =====
function printPrisonerVinaiList() {
  const filtered = getCurrentFilteredSorted();
  if (!filtered.length) {
    showToast('ไม่มีข้อมูลตาม filter ที่เลือก', 'warning');
    return;
  }

  const now = new Date().toLocaleString('th-TH');
  const filterDate = document.getElementById('filterDate').value || 'ทุกวัน';

  let html = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายชื่อผู้ต้องขัง - ตรวจสอบวินัย ${filterDate}</title>
<style>${PRINT_SHARED_CSS}
  .num { width:42px; text-align:center; }
</style></head><body>`;

  html += `<div class="no-print print-preview-bar" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#1a1a2e;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'Sarabun',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
    <span style="font-weight:600;">📋 ตัวอย่างก่อนพิมพ์</span>
    <div style="display:flex;gap:8px;">
      <button onclick="window.print()" style="background:#16a34a;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;">🖨️ พิมพ์</button>
      <button onclick="window.close()" style="background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;">✕ ปิด</button>
    </div>
  </div>`;
  html += `<div style="margin-top:50px;"></div>`;
  html += `<div class="print-header"><h1>ทัณฑสถานบำบัดพิเศษกลาง</h1><h2>Chance & Change Cafe</h2></div>`;
  html += `<div class="print-title">รายชื่อผู้ต้องขัง - ตรวจสอบวินัย<br><span style="font-size:14px; font-weight:500;">วันที่ ${filterDate}</span></div>`;
  html += `<div class="meta">พิมพ์เมื่อ ${now}</div>`;

  html += `<table>`;
  html += `<thead><tr>`;
  html += `<th class="num">ลำดับ</th>`;
  html += `<th>ชื่อผู้ต้องขัง</th>`;
  html += `<th>เลขประจำตัว</th>`;
  html += `<th>แดนที่อยู่</th>`;
  html += `</tr></thead><tbody>`;

  filtered.forEach((r, i) => {
    html += `<tr>`;
    html += `<td class="num">${i + 1}</td>`;
    html += `<td><b>${r.prisonerName || '-'}</b></td>`;
    html += `<td>${r.prisonerId || '-'}</td>`;
    html += `<td>${r.wing || '-'}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  html += `<div class="note">สำหรับใช้ตรวจสอบวินัย • ข้อมูลจากระบบการจอง CC Cafe</div>`;
  const printerName = currentUser?.displayName || currentUser?.username || 'ไม่ระบุ';
  html += `<div class="print-footer">ผู้ปริ้น: ${printerName} · พิมพ์เมื่อ ${now}</div>`;
  html += `</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    showToast('กรุณาอนุญาต Popup เพื่อเปิดหน้าพิมพ์', 'warning');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
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
    const totalPeople = totalRelatives + rows.length;

    html += `
      <div style="border:1px solid var(--border); border-radius:8px; padding:12px; background:var(--bg2);">
        <div style="font-weight:700; font-size:14px; margin-bottom:6px; color:var(--blue);">${date}</div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:8px; font-size:12px;">
          <div style="background:#fff5f5; border:1px solid #c62828; border-radius:6px; padding:8px;">
            <strong style="color:#c62828">🚨 ส่วนทัณฑ์</strong><br>
            <div style="margin-top:4px;">${prisoners.length} คน</div>
            <div style="font-size:11px; color:#666; margin-top:2px;">${prisoners.slice(0, 3).join(', ')}${prisoners.length > 3 ? ' ...' : ''}</div>
          </div>
          <div style="background:#fff8f0; border:1px solid #ff9800; border-radius:6px; padding:8px;">
            <strong style="color:#e65100">🪑 โต๊ะ</strong><br>
            <div style="margin-top:4px; font-weight:700;">${totalTables} โต๊ะ</div>
            <div style="font-size:11px;">รวม ${totalPeople} คน</div>
          </div>
          <div style="background:#f0fff0; border:1px solid #2e7d32; border-radius:6px; padding:8px;">
            <strong style="color:#1b5e20">🍽️ ครัว</strong><br>
            ผู้ใหญ่: <strong>${totalAdults}</strong><br>
            เด็ก 5-8: <strong>${totalKids5_8}</strong><br>
            ต่ำกว่า 5: <strong>${totalKidsUnder5}</strong>
          </div>
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

function fetchRolesList() {
  const select = document.getElementById('addUserRole');
  select.innerHTML = '<option value="">กำลังโหลดบทบาท...</option>';
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'getRoles', username: currentUser.username, password: currentUser.password })
  })
    .then(resp => resp.json())
    .then(data => {
      if (data.status === 'ok') {
        populateRoleDropdown(data.roles);
      } else {
        showToast('โหลดบทบาทไม่สำเร็จ: ' + data.message, 'error');
      }
    })
    .catch(err => {
      showToast('เกิดข้อผิดพลาดในการโหลดบทบาท', 'error');
    });
}

function populateRoleDropdown(roles) {
  const select = document.getElementById('addUserRole');
  select.innerHTML = '<option value="">เลือกบทบาท</option>';
  roles.forEach(role => {
    const option = document.createElement('option');
    const roleName = role.roleName || role.name || role;
    option.value = roleName;
    option.textContent = roleName;
    select.appendChild(option);
  });
}

function createAddUser() {
  const username = document.getElementById('addUserUsername').value.trim();
  const password = document.getElementById('addUserPassword').value;
  const confirmPassword = document.getElementById('addUserConfirmPassword').value;
  const role = document.getElementById('addUserRole').value;
  const displayName = document.getElementById('addUserDisplayName').value.trim() || username;

  if (!username || !password || !confirmPassword || !role) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    return;
  }
  if (password !== confirmPassword) {
    showToast('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน', 'warning');
    return;
  }
  if (password.length < 6) {
    showToast('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
    return;
  }

  // Call createUser action
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'createUser', username: username, password: password, role: role, displayName: displayName, adminUser: currentUser.username, pass: currentUser.password })
  })
    .then(resp => resp.json())
    .then(data => {
      if (data.status === 'ok') {
        showToast('สร้างผู้ใช้สำเร็จ', 'success');
        // Clear form
        document.getElementById('addUserUsername').value = '';
        document.getElementById('addUserPassword').value = '';
        document.getElementById('addUserConfirmPassword').value = '';
        document.getElementById('addUserRole').value = '';
        document.getElementById('addUserDisplayName').value = '';
        // Reload the table
        loadAddUserTable();
      } else {
        showToast('เกิดข้อผิดพลาด: ' + data.message, 'error');
      }
    })
    .catch(err => {
      console.error('Error creating user:', err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    });
}

function loadAddUserTable() {
  const tbody = document.getElementById('addUserTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-state">กำลังโหลดข้อมูล...</td></tr>';
  }
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'getUsers', username: currentUser.username, password: currentUser.password })
  })
    .then(resp => resp.json())
    .then(data => {
      if (data.status === 'ok') {
        renderAddUserTable(data.users);
      } else {
        renderAddUserTableError(data.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      }
    })
    .catch(err => {
      renderAddUserTableError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderAddUserTable(users) {
  const tbody = document.getElementById('addUserTableBody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">ยังไม่มีผู้ใช้ในระบบ</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => {
    return `<tr>
      <td>${escapeHtml(u.username)}</td>
      <td>${escapeHtml(u.role)}</td>
      <td>${escapeHtml(u.displayName || '-')}</td>
      <td>
        <button class="btn-refresh" onclick="editUser('${u.username}')">แก้ไข</button>
        <button class="btn-refresh" onclick="deleteUser('${u.username}')">ลบ</button>
      </td>
    </tr>`;
  }).join('');
}

function renderAddUserTableError(message) {
  const tbody = document.getElementById('addUserTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="error-state">' + escapeHtml(message) + '</td></tr>';
}

// ===== USER MANAGEMENT =====
function renderUsersView() {
  document.getElementById('view-users').style.display = '';
  fetchRolesList();
  loadAddUserTable();
}

// ===== PRISONER CSV IMPORT =====
function renderPrisonersView() {
  document.getElementById('csvFileInput').value = '';
  document.getElementById('prisonerPreviewContainer').style.display = 'none';
  document.getElementById('btnImportCSV').style.display = 'none';
  document.getElementById('csvStatus').textContent = '';
  document.getElementById('csvStatus').style.color = 'var(--text2)';
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuote) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (ch === '\n') {
        row.push(cell.trim());
        if (row.some(c => c)) rows.push(row);
        row = [];
        cell = '';
      } else if (ch === '\r') {
        // skip, handle \r\n below
      } else {
        cell += ch;
      }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c)) rows.push(row);
  }
  return rows;
}

function previewPrisonerCSV() {
  const fileInput = document.getElementById('csvFileInput');
  const file = fileInput.files[0];
  if (!file) {
    showToast('กรุณาเลือกไฟล์ CSV ก่อน', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const text = e.target.result;
      const rows = parseCSV(text);

      if (rows.length < 2) {
        showToast('ไฟล์ CSV มีข้อมูลไม่ถูกต้องหรือน้อยเกินไป', 'error');
        return;
      }

      // First row is header - find column mapping
      const headerRow = rows[0].map(h => h.toLowerCase().replace(/[\s\-]/g, ''));
      const colMap = {
        prisonerId: headerRow.indexOf('prisonerid'),
        prisonerName: headerRow.indexOf('prisonername'),
        wing: headerRow.indexOf('wing'),
        status: headerRow.indexOf('status'),
        note: headerRow.indexOf('note')
      };

      if (colMap.prisonerId < 0 || colMap.prisonerName < 0) {
        showToast('CSV ต้องมีคอลัมน์ prisonerId และ prisonerName อย่างน้อย', 'error');
        return;
      }

      const dataRows = rows.slice(1).filter(r => r[colMap.prisonerId] && r[colMap.prisonerId].trim());
      if (dataRows.length === 0) {
        showToast('ไม่พบข้อมูลผู้ต้องขังในไฟล์ CSV', 'error');
        return;
      }

      // Store parsed data for import
      const hasStatus = colMap.status >= 0;
      const hasNote = colMap.note >= 0;
      window._parsedPrisoners = dataRows.map(r => ({
        prisonerId: r[colMap.prisonerId] || '',
        prisonerName: r[colMap.prisonerName] || '',
        wing: colMap.wing >= 0 ? (r[colMap.wing] || '') : '',
        status: hasStatus ? (r[colMap.status] || '') : '',
        note: hasNote ? (r[colMap.note] || '') : ''
      }));

      // Build dynamic header
      const previewHeader = document.getElementById('prisonerPreviewHeader');
      let headerHtml = '<th>#</th><th>prisonerId</th><th>prisonerName</th><th>wing</th>';
      if (hasStatus) headerHtml += '<th>status</th>';
      if (hasNote) headerHtml += '<th>note</th>';
      previewHeader.innerHTML = headerHtml;

      // Render preview rows
      const tbody = document.getElementById('prisonerPreviewBody');
      tbody.innerHTML = window._parsedPrisoners.slice(0, 50).map((p, i) => {
        let cells = `<td>${i + 1}</td>
          <td>${escapeHtml(p.prisonerId)}</td>
          <td>${escapeHtml(p.prisonerName)}</td>
          <td>${escapeHtml(p.wing)}</td>`;
        if (hasStatus) cells += `<td>${escapeHtml(p.status)}</td>`;
        if (hasNote) cells += `<td>${escapeHtml(p.note)}</td>`;
        return `<tr>${cells}</tr>`;
      }).join('');

      const total = window._parsedPrisoners.length;
      document.getElementById('previewCount').textContent = `(แสดงสูงสุด 50 จาก ${total} รายการ${total > 50 ? ' — จะนำเข้าทั้งหมด ' + total + ' รายการ' : ''})`;
      document.getElementById('prisonerPreviewContainer').style.display = '';
      document.getElementById('btnImportCSV').style.display = 'inline-block';
      document.getElementById('csvStatus').textContent = `พบ ${total} รายการ พร้อมนำเข้า`;
      document.getElementById('csvStatus').style.color = 'var(--green)';
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการอ่าน CSV: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

async function importPrisonerCSV() {
  const prisoners = window._parsedPrisoners;
  if (!prisoners || prisoners.length === 0) {
    showToast('ไม่มีข้อมูลที่จะนำเข้า กรุณาเลือกไฟล์ก่อน', 'warning');
    return;
  }

  document.getElementById('btnImportCSV').disabled = true;
  document.getElementById('csvStatus').textContent = 'กำลังนำเข้า...';
  document.getElementById('csvStatus').style.color = 'var(--text2)';

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'importPrisoners',
        username: currentUser.username,
        password: currentUser.password,
        prisoners: prisoners
      })
    });
    const data = await resp.json();
    if (data.status === 'ok') {
      showToast(data.message, 'success');
      document.getElementById('csvStatus').textContent = data.message;
      document.getElementById('csvStatus').style.color = 'var(--green)';
      document.getElementById('btnImportCSV').style.display = 'none';
      document.getElementById('prisonerPreviewContainer').style.display = 'none';
      document.getElementById('csvFileInput').value = '';
      window._parsedPrisoners = null;
    } else {
      showToast('นำเข้าไม่สำเร็จ: ' + data.message, 'error');
      document.getElementById('csvStatus').textContent = ' error: ' + data.message;
      document.getElementById('csvStatus').style.color = 'var(--red)';
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message, 'error');
    document.getElementById('csvStatus').textContent = 'error: ' + err.message;
    document.getElementById('csvStatus').style.color = 'var(--red)';
  } finally {
    document.getElementById('btnImportCSV').disabled = false;
  }
}

async function editUser(username) {
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getUsers', username: currentUser.username, password: currentUser.password })
    });
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message);

    const user = (data.users || []).find(u => u.username === username);
    if (!user) { showToast('ไม่พบผู้ใช้', 'error'); return; }

    // Fetch roles dynamically from backend
    let roles = ['Superadmin', 'Admin', 'Finance', 'Vinai', 'Tadtel', 'User'];
    try {
      const rolesResp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getRoles', username: currentUser.username, password: currentUser.password })
      });
      const rolesData = await rolesResp.json();
      if (rolesData.status === 'ok' && rolesData.roles && rolesData.roles.length > 0) {
        roles = rolesData.roles.map(r => r.roleName || r.name || r);
      }
    } catch (e) { /* fallback to default */ }

    const modal = document.getElementById('editModalBody');
    modal.innerHTML = `
      <div style="margin-bottom:16px;">
        <div style="font-weight:700;font-size:15px;margin-bottom:12px;">แก้ไขผู้ใช้: ${user.username}</div>
        <div style="margin-bottom:10px;">
          <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">บทบาท</label>
          <select id="editUserRole" class="filter-select" style="width:100%;">
            ${roles.map(r =>
      `<option value="${r}" ${r === user.role ? 'selected' : ''}>${r}</option>`
    ).join('')}
          </select>
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">ชื่อที่แสดง</label>
          <input type="text" id="editUserDisplayName" class="search-box" value="${user.displayName || ''}" style="width:100%;">
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">รหัสผ่านใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)</label>
          <input type="password" id="editUserPassword" class="search-box" placeholder="รหัสผ่านใหม่" style="width:100%;">
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn-cancel" onclick="closeEditModal()">ยกเลิก</button>
        <button class="btn-approve" onclick="saveEditUser('${user.username}')">💾 บันทึก</button>
      </div>
    `;
    document.getElementById('editModalBg').classList.add('show');
  } catch (e) {
    showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  }
}

async function saveEditUser(username) {
  const role = document.getElementById('editUserRole').value;
  const displayName = document.getElementById('editUserDisplayName').value.trim();
  const password = document.getElementById('editUserPassword').value;

  const body = { action: 'updateUser', username: currentUser.username, password: currentUser.password, targetUser: username, role: role, displayName: displayName };
  if (password) body.newPassword = password;

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message);

    showToast('อัปเดตผู้ใช้สำเร็จ', 'success');
    logEvent('update_user', `แก้ไขผู้ใช้ ${username} role=${role}`);
    closeEditModal();
    loadAddUserTable();
  } catch (e) {
    showToast('ไม่สามารถอัปเดตได้: ' + e.message, 'error');
  }
}

async function deleteUser(username) {
  if (username === currentUser.username) { showToast('ไม่สามารถลบตัวเองได้', 'error'); return; }
  if (!confirm(`⚠️ ยืนยันการลบผู้ใช้ "${username}"?\nการดำเนินการนี้ไม่สามารถกู้คืนได้`)) return;

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'deleteUser', username: currentUser.username, password: currentUser.password, targetUser: username })
    });
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message);

    showToast('ลบผู้ใช้สำเร็จ', 'success');
    logEvent('delete_user', `ลบผู้ใช้ ${username}`);
    loadAddUserTable();
  } catch (e) {
    showToast('ไม่สามารถลบได้: ' + e.message, 'error');
  }
}

function closeEditModal(e) {
  if (!e || e.target === document.getElementById('editModalBg')) {
    document.getElementById('editModalBg').classList.remove('show');
  }
}

function printDailyDeptReports() {
  const filtered = getCurrentFilteredSorted();
  if (filtered.length === 0) {
    showToast('ไม่มีข้อมูลตาม filter ที่เลือก', 'warning');
    return;
  }

  const byDate = {};
  filtered.forEach(r => {
    const dateKey = r.visitDate || r.visitDateISO || 'ไม่ระบุวันที่';
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(r);
  });

  const now = new Date().toLocaleString('th-TH');
  const printerName = currentUser?.displayName || currentUser?.username || 'ไม่ระบุ';

  let html = `
    <html><head><meta charset="UTF-8">
    <title>รายงานประจำวัน - แยกตามฝ่าย</title>
    <style>
      ${PRINT_SHARED_CSS}
      .date-block { border:2px solid #333; margin-bottom:20px; padding:12px; page-break-inside:avoid; }
      .date-title { font-size:16px; font-weight:700; border-bottom:1px solid #ccc; padding-bottom:4px; margin-bottom:8px; }
      .dept { margin-bottom:8px; padding:6px; border:1px solid #aaa; border-radius:4px; }
      .dept strong { display:block; margin-bottom:4px; }
    </style>
    </head><body>
    <div class="no-print print-preview-bar" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#1a1a2e;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'Sarabun',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      <span style="font-weight:600;">📋 ตัวอย่างก่อนพิมพ์</span>
      <div style="display:flex;gap:8px;">
        <button onclick="window.print()" style="background:#16a34a;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;">🖨️ พิมพ์</button>
        <button onclick="window.close()" style="background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;">✕ ปิด</button>
      </div>
    </div>
    <div style="margin-top:50px;"></div>
    <div class="print-header"><h1>ทัณฑสถานบำบัดพิเศษกลาง</h1><h2>Chance & Change Cafe</h2></div>
    <div class="print-title">รายงานสรุปประจำวัน (แยกตามฝ่าย)</div>
    <div class="meta">ผู้ปริ้น: ${printerName} • พิมพ์เมื่อ ${now}</div>
  `;

  Object.keys(byDate).sort().forEach(date => {
    const rows = byDate[date];
    let totalAdults = 0, total5_8 = 0, totalUnder5 = 0, prisoners = [];

    rows.forEach(r => {
      const d = computeDeptReportData(r);
      totalAdults += d.adults;
      total5_8 += d.kids5_8;
      totalUnder5 += d.kidsUnder5;
      if (r.prisonerName && !prisoners.includes(r.prisonerName)) prisoners.push(r.prisonerName);
    });

    const totalTables = rows.length;
    const totalRel = rows.reduce((s, r) => s + (parseInt(r.visitorCount) || 1), 0);

    html += `<div class="date-block">`;
    html += `<div class="date-title">${date}</div>`;

    // ส่วนทัณฑ์
    html += `<div class="dept" style="border-color:#c62828;">`;
    html += `<strong style="color:#c62828">🚨 ส่วนทัณฑ์ (เบิกตัวผู้ต้องขัง)</strong>`;
    html += `จำนวน: <strong>${prisoners.length} คน</strong><br>`;
    html += prisoners.map((p, i) => `${i + 1}. ${p}`).join('<br>');
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

  html += `<div class="print-footer">รายงานนี้สร้างจากระบบ CC Cafe · ${now}</div>`;
  html += `</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    showToast('กรุณาอนุญาต Popup เพื่อเปิดหน้าพิมพ์', 'warning');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
}

// ===== Helper: Get filtered rows for the Reports page (independent filters) =====
function getReportsFilteredRows() {
  const searchEl = document.getElementById('reportsSearchBox');
  const statusEl = document.getElementById('reportsFilterStatus');
  const dateEl = document.getElementById('reportsFilterDate');
  const wingEl = document.getElementById('reportsFilterWing');

  const q = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const fs = statusEl ? statusEl.value : '';
  const fd = dateEl ? dateEl.value : '';
  const fw = wingEl ? wingEl.value : '';

  return allRows.filter(r => {
    if (fs && normalizeStatus(r.status) !== fs) return false;
    if (fd && r.visitDate !== fd) return false;
    if (fw && (r.wing || '') !== fw) return false;

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

  const dateMap = {};
  allRows.forEach(r => {
    if (r.visitDate && r.visitDateISO && !dateMap[r.visitDate]) {
      dateMap[r.visitDate] = r.visitDateISO;
    }
  });
  const dates = Object.keys(dateMap).sort((a, b) => {
    if (dateMap[a] < dateMap[b]) return -1;
    if (dateMap[a] > dateMap[b]) return 1;
    return 0;
  });

  const current = select.value;
  select.innerHTML = '<option value="">ทุกวัน</option>';
  dates.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = stripDayPrefix(d);
    select.appendChild(opt);
  });
  if (dates.includes(current)) select.value = current;
}

function populateReportsWingFilter() {
  const el = document.getElementById('reportsFilterWing');
  if (!el) return;
  const wings = [...new Set(allRows.map(r => (r.wing || '').trim()).filter(Boolean))].sort();
  const cur = el.value;
  el.innerHTML = '<option value="">ทุกแดน</option>';
  wings.forEach(w => {
    const o = document.createElement('option');
    o.value = w; o.textContent = w;
    el.appendChild(o);
  });
  if (wings.includes(cur)) el.value = cur;
}

function populateFormalWingFilter() {
  const el = document.getElementById('formalFilterWing');
  if (!el) return;
  const wings = [...new Set(allRows.map(r => (r.wing || '').trim()).filter(Boolean))].sort();
  el.innerHTML = '<option value="">ทุกแดน</option>';
  wings.forEach(w => {
    const o = document.createElement('option');
    o.value = w; o.textContent = w;
    el.appendChild(o);
  });
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
    content += `<tr style="background:#f0f0f0;"><th>ลำดับ</th><th>ชื่อ-นามสกุล</th><th>เลขประจำตัวผู้ต้องขัง</th><th>แดน</th></tr>`;
    prisoners.forEach((p, i) => {
      content += `<tr><td>${i + 1}</td><td><strong>น.ช. ${p.name}</strong></td><td>${p.id}</td><td>${p.wing || '-'}</td></tr>`;
    });
    content += `</table>`;
  }
  else if (type === 'kitchen' || type === 'bakery' || type === 'kitchen-bakery') {
    let visitorAdults = 0, k5 = 0, ku = 0;
    let tables = filtered.length;
    let relatives = filtered.reduce((s, r) => s + (parseInt(r.visitorCount) || 1), 0);

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
      extras.forEach((ex, ei) => {
        if (ex.name) {
          const ea = String(r.extraVisitorApproved || '').split(';;')[ei] || '';
          if (ea !== 'no') visitors.push(ex.name);
        }
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

  const printerName = currentUser?.displayName || currentUser?.username || 'ไม่ระบุ';
  const printWin = window.open('', '_blank');
  if (!printWin) {
    showToast('กรุณาอนุญาต Popup เพื่อเปิดหน้าพิมพ์', 'warning');
    return;
  }
  printWin.document.write(`
    <html><head><meta charset="UTF-8"><title>รายงาน ${date}</title>
    <style>${PRINT_SHARED_CSS}</style>
    </head><body>
    <div class="no-print print-preview-bar" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#1a1a2e;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'Sarabun',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      <span style="font-weight:600;">📋 ตัวอย่างก่อนพิมพ์</span>
      <div style="display:flex;gap:8px;">
        <button onclick="window.print()" style="background:#16a34a;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;">🖨️ พิมพ์</button>
        <button onclick="window.close()" style="background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;">✕ ปิด</button>
      </div>
    </div>
    <div style="margin-top:50px;"></div>
    <div class="print-header"><h1>ทัณฑสถานบำบัดพิเศษกลาง</h1><h2>Chance & Change Cafe</h2></div>
    ${content}
    <div class="print-footer">ผู้ปริ้น: ${printerName} • พิมพ์เมื่อ ${now}</div>
    </body></html>
  `);
  printWin.document.close();
  printWin.focus();
}

// ===== Monthly Report Functions =====
function generateMonthlyReport() {
  const startDateEl = document.getElementById('monthlyStartDate');
  const endDateEl = document.getElementById('monthlyEndDate');
  const contentEl = document.getElementById('monthlyReportContent');
  const outputEl = document.getElementById('monthlyReportOutput');

  if (!startDateEl || !endDateEl || !contentEl || !outputEl) return;

  const startDate = startDateEl.value;
  const endDate = endDateEl.value;

  if (!startDate || !endDate) {
    showToast('กรุณาเลือกวันที่ทั้งสองช่อง', 'warning');
    return;
  }

  if (startDate > endDate) {
    showToast('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด', 'warning');
    return;
  }

  const filtered = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false;
    const key = getRowVisitDateKey(r);
    if (!key) return false;
    return key >= startDate && key <= endDate;
  });

  if (filtered.length === 0) {
    contentEl.style.display = 'block';
    outputEl.innerHTML = '<div style="color:var(--text2);padding:20px;text-align:center;">ไม่มีข้อมูลในช่วงวันที่ที่เลือก</div>';
    return;
  }

  const stats = computeFinanceStats(filtered);

  // Count cancelled and not approved separately
  let cancelledCount = 0;
  let notApprovedCount = 0;
  filtered.forEach(r => {
    const s = normalizeStatus(r.status);
    if (s === 'ยกเลิก') cancelledCount++;
    else if (s === 'ไม่อนุมัติ') notApprovedCount++;
  });

  let totalAdults = 0, totalKids5_8 = 0, totalKidsUnder5 = 0;
  const prisoners = new Set();
  const wingCounts = {};

  filtered.forEach(r => {
    const d = computeDeptReportData(r);
    totalAdults += d.adults;
    totalKids5_8 += d.kids5_8;
    totalKidsUnder5 += d.kidsUnder5;
    if (r.prisonerName) prisoners.add(r.prisonerName);
    if (r.wing) {
      wingCounts[r.wing] = (wingCounts[r.wing] || 0) + 1;
    }
  });

  const totalVisitors = totalAdults + totalKids5_8 + totalKidsUnder5;

  // Build wing statistics
  const wingStats = Object.entries(wingCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([wing, count]) => `• แดน ${wing}: <strong>${count} คน</strong>`)
    .join('\n');

  const startFmt = startDate.split('-').map((p, i) => i === 0 ? parseInt(p) + 543 : p).join('/');
  const endFmt = endDate.split('-').map((p, i) => i === 0 ? parseInt(p) + 543 : p).join('/');

  const outputHtml = `
    <div style="font-size:13px;line-height:1.8;">
      <div style="margin-bottom:12px;">
        <div style="font-weight:600;margin-bottom:6px;">📊 รายงานรายเดือน</div>
        <div style="color:var(--text2);">จากวันที่: ${startFmt} ถึงวันที่: ${endFmt}</div>
      </div>
      
      <div style="background:#fff5f5;border:1px solid #c62828;border-radius:6px;padding:12px;margin-bottom:12px;">
        <div style="font-weight:600;color:#c62828;margin-bottom:6px;">💰 สรุปยอดเงิน</div>
        <div>• ยอดจองทั้งหมด: <strong>${formatBaht(stats.totalBooked)}</strong></div>
        <div>• ยกเลิก: <strong>${cancelledCount} รายการ</strong></div>
        <div>• ไม่อนุมัติ: <strong>${notApprovedCount} รายการ</strong></div>
        <div>• จ่ายแล้ว: <strong>${stats.bookingCount - cancelledCount - notApprovedCount} รายการ</strong></div>
        <div>• ยอดชำระแล้ว: <strong>${formatBaht(stats.paid)}</strong></div>
        <div>• ยอดค้างชำระ: <strong>${formatBaht(stats.unpaid)}</strong></div>
      </div>
      
      <div style="background:#f0f8ff;border:1px solid var(--blue);border-radius:6px;padding:12px;margin-bottom:12px;">
        <div style="font-weight:600;color:var(--blue);margin-bottom:6px;">🏢 สรุปผู้ต้องขัง (แยกแดน)</div>
        <div>• จำนวนผู้ต้องขังที่เข้าร่วม: <strong>${prisoners.size} คน</strong></div>
        ${wingStats || '<div>• ไม่มีข้อมูลแดน</div>'}
      </div>
      
      <div style="background:#f5fff0;border:1px solid var(--green);border-radius:6px;padding:12px;">
        <div style="font-weight:600;color:var(--green);margin-bottom:6px;">👥 สรุปญาติผู้เยี่ยม</div>
        <div>• ผู้ใหญ่: <strong>${totalAdults} คน</strong></div>
        <div>• เด็ก 5-8 ปี: <strong>${totalKids5_8} คน</strong></div>
        <div>• เด็กต่ำกว่า 5 ปี: <strong>${totalKidsUnder5} คน</strong></div>
        <div>• รวมญาติผู้เยี่ยม: <strong>${totalVisitors} คน</strong></div>
      </div>
    </div>
  `;

  outputEl.innerHTML = outputHtml;
  contentEl.style.display = 'block';
}

function printMonthlyReport() {
  const outputEl = document.getElementById('monthlyReportOutput');
  if (!outputEl) return;

  const startDateEl = document.getElementById('monthlyStartDate');
  const endDateEl = document.getElementById('monthlyEndDate');
  const startDate = startDateEl?.value || '';
  const endDate = endDateEl?.value || '';

  if (!startDate || !endDate) {
    alert('กรุณาสร้างรายงานก่อนพิมพ์');
    return;
  }

  const now = new Date().toLocaleString('th-TH');
  const printerName = currentUser?.displayName || currentUser?.username || 'ไม่ระบุ';

  const startFmt = startDate.split('-').map((p, i) => i === 0 ? parseInt(p) + 543 : p).join('/');
  const endFmt = endDate.split('-').map((p, i) => i === 0 ? parseInt(p) + 543 : p).join('/');

  const filtered = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false;
    const key = getRowVisitDateKey(r);
    if (!key) return false;
    return key >= startDate && key <= endDate;
  });

  const stats = computeFinanceStats(filtered);

  // Count cancelled and not approved separately
  let cancelledCount = 0;
  let notApprovedCount = 0;
  filtered.forEach(r => {
    const s = normalizeStatus(r.status);
    if (s === 'ยกเลิก') cancelledCount++;
    else if (s === 'ไม่อนุมัติ') notApprovedCount++;
  });

  let totalAdults = 0, totalKids5_8 = 0, totalKidsUnder5 = 0;
  const prisoners = new Set();
  const wingCounts = {};

  filtered.forEach(r => {
    const d = computeDeptReportData(r);
    totalAdults += d.adults;
    totalKids5_8 += d.kids5_8;
    totalKidsUnder5 += d.kidsUnder5;
    if (r.prisonerName) prisoners.add(r.prisonerName);
    if (r.wing) {
      wingCounts[r.wing] = (wingCounts[r.wing] || 0) + 1;
    }
  });

  // Build wing statistics
  const wingStats = Object.entries(wingCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([wing, count]) => `<div>• แดน ${wing}: <strong>${count} คน</strong></div>`)
    .join('\n');

  const printWin = window.open('', '_blank', 'width=800,height=600');
  if (!printWin) {
    showToast('กรุณาอนุญาต Popup เพื่อเปิดหน้าพิมพ์', 'warning');
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">
    <title>รายงานรายเดือน</title>
    <style>
      ${PRINT_SHARED_CSS}
      .report-section { padding: 12px; border-radius: 6px; margin-bottom: 12px; }
      .section-title { font-weight: 600; margin-bottom: 6px; }
      .finance-section { background: #fff5f5; border: 1px solid #c62828; }
      .finance-section .section-title { color: #c62828; }
      .prisoner-section { background: #f0f8ff; border: 1px solid #0B2545; }
      .prisoner-section .section-title { color: #0B2545; }
      .visitor-section { background: #f5fff0; border: 1px solid #2E5238; }
      .visitor-section .section-title { color: #2E5238; }
    </style>
    </head><body>
    <div class="no-print print-preview-bar" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#1a1a2e;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'Sarabun',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      <span style="font-weight:600;">📋 ตัวอย่างก่อนพิมพ์</span>
      <div style="display:flex;gap:8px;">
        <button onclick="window.print()" style="background:#16a34a;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;">🖨️ พิมพ์</button>
        <button onclick="window.close()" style="background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;">✕ ปิด</button>
      </div>
    </div>
    <div style="margin-top:50px;"></div>
    <div class="print-header"><h1>ทัณฑสถานบำบัดพิเศษกลาง</h1><h2>Chance & Change Cafe</h2></div>
    <div class="print-title">📊 รายงานรายเดือน</div>
    <div class="meta">จากวันที่: ${startFmt} ถึงวันที่: ${endFmt}<br>ผู้ปริ้น: ${printerName} • พิมพ์เมื่อ: ${now}</div>
    <div style="font-size:13px;line-height:1.8;">
      <div class="report-section finance-section">
        <div class="section-title">💰 สรุปยอดเงิน</div>
        <div>• ยอดจองทั้งหมด: <strong>${formatBaht(stats.totalBooked)}</strong></div>
        <div>• ยกเลิก: <strong>${cancelledCount} รายการ</strong></div>
        <div>• ไม่อนุมัติ: <strong>${notApprovedCount} รายการ</strong></div>
        <div>• จ่ายแล้ว: <strong>${stats.bookingCount - cancelledCount - notApprovedCount} รายการ</strong></div>
        <div>• ยอดชำระแล้ว: <strong>${formatBaht(stats.paid)}</strong></div>
        <div>• ยอดค้างชำระ: <strong>${formatBaht(stats.unpaid)}</strong></div>
      </div>
      
      <div class="report-section prisoner-section">
        <div class="section-title">🏢 สรุปผู้ต้องขัง (แยกแดน)</div>
        <div>• จำนวนผู้ต้องขังที่เข้าร่วม: <strong>${prisoners.size} คน</strong></div>
        ${wingStats || '<div>• ไม่มีข้อมูลแดน</div>'}
      </div>
      
      <div class="report-section visitor-section">
        <div class="section-title">👥 สรุปญาติผู้เยี่ยม</div>
        <div>• ผู้ใหญ่: <strong>${totalAdults} คน</strong></div>
        <div>• เด็ก 5-8 ปี: <strong>${totalKids5_8} คน</strong></div>
        <div>• เด็กต่ำกว่า 5 ปี: <strong>${totalKidsUnder5} คน</strong></div>
        <div>• รวมญาติผู้เยี่ยม: <strong>${totalAdults + totalKids5_8 + totalKidsUnder5} คน</strong></div>
      </div>
    </div>
    <div class="print-footer">ทัณฑสถานบำบัดพิเศษกลาง • ผู้ปริ้น: ${printerName} • พิมพ์เมื่อ ${now}</div>
    </body></html>
  `);
  printWin.document.close();
  printWin.focus();
}

// ═══════════════════════════════════════════════════════════════
// PREMIUM DASHBOARD v2.0 — Finance Ribbon, Floor Plan, Donut
// ═══════════════════════════════════════════════════════════════

// ===== FINANCE RIBBON =====
function renderFinanceRibbon() {
  const stats = computeFinanceStats(allRows);
  const { totalBooked, paid, unpaid, bookingCount } = stats;
  const activeBookings = bookingCount || 1;
  const avg = Math.round(totalBooked / activeBookings);
  const rate = totalBooked > 0 ? Math.round((paid / totalBooked) * 100) : 0;

  const el = (id) => document.getElementById(id);
  if (el('financeTotalBooked')) el('financeTotalBooked').textContent = formatBaht(totalBooked);
  if (el('financePaid')) el('financePaid').textContent = formatBaht(paid);
  if (el('financeUnpaid')) el('financeUnpaid').textContent = formatBaht(unpaid);
  if (el('financeAvg')) el('financeAvg').textContent = formatBaht(avg);
  if (el('financeRate')) el('financeRate').textContent = rate + '%';
}

// ===== STATUS DONUT CHART (Canvas 2D) =====
function drawStatusDonutChart() {
  const canvas = document.getElementById('statusDonutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 180;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const statusOrder = ['รอตรวจสอบวินัย', 'รอตรวจสอบผู้เข้าร่วม', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น', 'ไม่อนุมัติ', 'ยกเลิก'];
  const colors = {
    'รอตรวจสอบวинัย': '#3b82f6',
    'รอตรวจสอบผู้เข้าร่วม': '#f97316',
    'รอชำระเงิน': '#eab308',
    'ชำระแล้ว': '#22c55e',
    'เสร็จสิ้น': '#6366f1',
    'ไม่อนุมัติ': '#ef4444',
    'ยกเลิก': '#64748b'
  };
  const labels = {
    'รอตรวจสอบวินัย': 'วินัย',
    'รอตรวจสอบผู้เข้าร่วม': 'ผู้เข้าร่วม',
    'รอชำระเงิน': 'ชำระเงิน',
    'ชำระแล้ว': 'ชำระแล้ว',
    'เสร็จสิ้น': 'เสร็จ',
    'ไม่อนุมัติ': 'ปฏิเสธ',
    'ยกเลิก': 'ยกเลิก'
  };

  const counts = {};
  statusOrder.forEach(s => counts[s] = 0);
  allRows.forEach(r => {
    if (!r.ref || String(r.ref).trim() === '') return;
    const s = normalizeStatus(r.status);
    if (counts[s] !== undefined) counts[s]++;
  });

  const total = allRows.filter(r => r.ref && String(r.ref).trim() !== '').length || 1;
  const cx = size / 2, cy = size / 2;
  const outerR = 78, innerR = 50;
  let startAngle = -Math.PI / 2;

  statusOrder.forEach(status => {
    const val = counts[status];
    if (val === 0) return;
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[status];
    ctx.fill();
    startAngle += slice;
  });

  // Center text
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px Sarabun, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy - 6);
  ctx.font = '11px Sarabun, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('รายการทั้งหมด', cx, cy + 14);

  // Legend
  const legendEl = document.getElementById('donutLegend');
  if (legendEl) {
    legendEl.innerHTML = statusOrder
      .filter(s => counts[s] > 0)
      .map(s => `
        <div class="donut-legend-item">
          <span class="donut-legend-dot" style="background:${colors[s]}"></span>
          <span>${labels[s]}</span>
          <strong>${counts[s]}</strong>
        </div>
      `).join('');
  }
}

// ===== WING REVENUE HORIZONTAL BAR CHART =====
function drawWingRevenueChart() {
  const canvas = document.getElementById('wingRevenueChart');
  if (!canvas) return;

  // Aggregate revenue by wing
  const wingData = {};
  allRows.forEach(r => {
    if (!r.ref || String(r.ref).trim() === '') return;
    const s = normalizeStatus(r.status);
    if (s === 'ยกเลิก' || s === 'ไม่อนุมัติ') return;
    const wing = r.wing || 'ไม่ระบุ';
    wingData[wing] = (wingData[wing] || 0) + (parseInt(r.total) || 0);
  });

  const sorted = Object.entries(wingData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length === 0) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 400;
    canvas.height = 200;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Sarabun, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ยังไม่มีข้อมูลรายได้', canvas.width / 2, 100);
    return;
  }

  const maxVal = sorted[0][1] || 1;
  const barColors = ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
  const container = canvas.parentElement;

  // Replace canvas with HTML bars for better responsiveness
  const existingBars = container.querySelector('.wing-bars');
  if (existingBars) existingBars.remove();

  const barsDiv = document.createElement('div');
  barsDiv.className = 'wing-bars';
  barsDiv.style.cssText = 'margin-top:8px;padding:0 4px;';

  sorted.forEach(([wing, revenue], i) => {
    const pct = Math.round((revenue / maxVal) * 100);
    barsDiv.innerHTML += `
      <div class="wing-bar-row">
        <div class="wing-bar-label">แดน ${wing}</div>
        <div class="wing-bar-track">
          <div class="wing-bar-fill" style="width:${pct}%;background:${barColors[i] || barColors[4]}">
            <span class="wing-bar-val">${revenue.toLocaleString()} บ.</span>
          </div>
        </div>
      </div>
    `;
  });

  container.appendChild(barsDiv);
  // Hide canvas since we're using HTML bars
  canvas.style.display = 'none';
}

// ===== FLOOR PLAN RENDERER =====
function buildFloorPlanDateFilter() {
  const sel = document.getElementById('floorPlanDate');
  if (!sel) return;

  const dates = [...new Set(allRows
    .filter(r => r.ref && String(r.ref).trim() !== '')
    .map(r => r.visitDate || r.visitDateISO)
    .filter(Boolean)
  )].sort();

  const today = new Date().toLocaleDateString('th-TH');
  sel.innerHTML = '';

  dates.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    sel.appendChild(opt);
  });

  // Try to select today or nearest future date
  const todayISO = toLocalDateStr(new Date());
  const matchToday = dates.find(d => {
    const key = getRowVisitDateKey({ visitDate: d, visitDateISO: d });
    return key === todayISO;
  });
  if (matchToday) sel.value = matchToday;
  else if (dates.length > 0) sel.value = dates[dates.length - 1];
}

function renderFloorPlan() {
  const grid = document.getElementById('floorPlanGrid');
  const sel = document.getElementById('floorPlanDate');
  if (!grid || !sel) return;

  const selectedDate = sel.value;
  if (!selectedDate) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text2);">เลือกวันที่เพื่อดูแผนผังโต๊ะ</div>';
    return;
  }

  // Filter bookings for selected date — only เสร็จสิ้น and รอชำระเงิน
  const dayBookings = allRows.filter(r => {
    if (!r.ref || String(r.ref).trim() === '') return false;
    const rDate = r.visitDate || r.visitDateISO || '';
    if (rDate !== selectedDate) return false;
    const s = normalizeStatus(r.status);
    return s === 'เสร็จสิ้น' || s === 'รอชำระเงิน';
  }).sort((a, b) => String(a.ref || '').localeCompare(String(b.ref || '')));

  if (dayBookings.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text2);">
      <div style="font-size:28px;margin-bottom:8px;">🪑</div>
      ไม่มีโต๊ะที่มีสถานะ "เสร็จสิ้น" หรือ "รอชำระเงิน" ในวัน ${selectedDate}
    </div>`;
    return;
  }

  const wingColors = {
    'แดน 1': '#1e40af', 'แดน 2': '#7c3aed', 'แดน 3': '#b91c1c',
    'แดน 4': '#c2410c', 'แดน 5': '#15803d', 'แดน 6': '#0e7490'
  };

  grid.innerHTML = dayBookings.map((r, i) => {
    const tableNo = i + 1;
    const prisonerName = r.prisonerName || '—';
    const wing = r.wing || '—';
    const visitors = r.visitorCount || 1;
    const ref = r.ref || '';
    const s = normalizeStatus(r.status);
    const total = parseInt(r.total) || 0;

    let statusClass = 'occupied';
    let statusText = 'เสร็จสิ้น';
    if (s === 'รอชำระเงิน') {
      statusClass = 'reserved';
      statusText = 'รอชำระ';
    }

    const wingColor = wingColors[wing] || '#475569';

    return `
      <div class="floor-table ${statusClass}" onclick="viewDetail(${allRows.indexOf(r)});switchView('reservations')" title="ดูรายละเอียด ${ref}">
        <span class="ft-status-badge">${statusText}</span>
        <div class="ft-num">โต๊ะ ${tableNo}</div>
        <div class="ft-ref">${ref}</div>
        <div class="ft-prisoner">🔒 ${prisonerName}</div>
        <div class="ft-wing" style="color:${wingColor};font-weight:600;">${wing}</div>
        <div class="ft-visitors">👥 ${visitors} คน · ${total.toLocaleString()} บ.</div>
      </div>
    `;
  }).join('');
}

// ===== OVERRIDE renderDashboardHome to include new components =====
const _origRenderDashboardHome = typeof renderDashboardHome === 'function' ? renderDashboardHome : null;

function renderDashboardHomeV2() {
  // Call original if exists
  if (_origRenderDashboardHome) {
    // We need to patch in the new elements after the original renders
  }

  // Role-based KPI visibility
  const role = currentUser && currentUser.role;
  const visible = {
    Superadmin: ['statTotal', 'statWait', 'statOk', 'statReject', 'statUniquePrisoners', 'statThisWeek', 'statThisMonth', 'statUniqueVisitors'],
    Admin: ['statTotal', 'statWait', 'statOk', 'statReject', 'statUniquePrisoners', 'statThisWeek', 'statThisMonth', 'statUniqueVisitors'],
    Vinai: ['statWait', 'statThisWeek'],
    Tadtel: ['statOk', 'statThisWeek'],
    Finance: ['statOk', 'statThisWeek', 'statUniqueVisitors']
  }[role] || [];

  ['statTotal', 'statWait', 'statOk', 'statReject', 'statUniquePrisoners', 'statThisWeek', 'statThisMonth', 'statUniqueVisitors'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentElement && el.parentElement.parentElement) {
      el.parentElement.parentElement.style.display = visible.includes(id) ? '' : 'none';
    }
  });

  // Show pipeline for admin roles
  const pipeline = document.getElementById('statusPipeline');
  if (pipeline && (role === 'Superadmin' || role === 'Admin')) {
    pipeline.style.display = 'block';
  } else if (pipeline) {
    pipeline.style.display = 'none';
  }

  const recentEl = document.getElementById('recentBookings');
  if (!recentEl) return;

  renderFinanceOverview();
  renderFinanceRibbon();

  const total = allRows.length;

  // recent 5
  if (!total) {
    recentEl.innerHTML = '<div style="color:#888;font-size:12px">ยังไม่มีข้อมูล</div>';
    document.getElementById('statUniquePrisoners').textContent = '0';
    document.getElementById('statThisWeek').textContent = '0';
    document.getElementById('statThisMonth').textContent = '0';
    document.getElementById('statUniqueVisitors').textContent = '0';
    const chartEl = document.getElementById('trendChart');
    if (chartEl) chartEl.getContext && chartEl.getContext('2d').clearRect(0, 0, chartEl.width, chartEl.height);
    return;
  }

  let rhtml = '';
  allRows.slice(0, 5).forEach(r => {
    const idx = allRows.indexOf(r);
    const s = normalizeStatus(r.status);
    let bcls = 'badge-pending-review';
    if (s === 'รอชำระเงิน') bcls = 'badge-payment-pending';
    else if (s === 'ชำระแล้ว') bcls = 'badge-paid';
    else if (s === 'เสร็จสิ้น') bcls = 'badge-completed';
    else if (s === 'ไม่อนุมัติ') bcls = 'badge-rejected';
    else if (s === 'ยกเลิก') bcls = 'badge-cancelled';
    rhtml += `<div onclick="viewDetail(${idx});switchView('reservations')" style="padding:10px 2px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;flex-direction:column;gap:6px;">
       <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
         <b style="font-size:13px;color:var(--blue)">${r.ref}</b>
         <span class="badge ${bcls}" style="font-size:11px;padding:2px 8px;white-space:nowrap">${s}</span>
       </div>
       <div style="display:flex;flex-direction:column;gap:2px;font-size:12px">
         <span><strong style="color:var(--text2)">👤</strong> ${r.visitorName || ''}</span>
         <span><strong style="color:var(--text2)">🏢</strong> ${r.prisonerName || ''} (#${r.prisonerId || ''})</span>
         <span><strong style="color:var(--text2)">📅</strong> ${r.visitDate || ''} • <strong style="color:var(--blue)">${(r.total || 0).toLocaleString()} บ.</strong></span>
       </div>
     </div>`;
  });

  const recentCountEl = document.getElementById('recentCount');
  if (recentCountEl) recentCountEl.textContent = '(' + allRows.length + ' รายการทั้งหมด)';

  recentEl.innerHTML = rhtml || '<div style="color:#888;font-size:13px;padding:12px;text-align:center">ยังไม่มีข้อมูล</div>';

  // Status Pipeline Visualization
  const statusOrder = ['รอตรวจสอบวินัย', 'รอตรวจสอบผู้เข้าร่วม', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น', 'ไม่อนุมัติ', 'ยกเลิก'];
  const statusLabels = { 'รอตรวจสอบวินัย': 'วินัย', 'รอตรวจสอบผู้เข้าร่วม': 'ผู้เข้าร่วม', 'รอชำระเงิน': 'ชำระเงิน', 'ชำระแล้ว': 'ชำระแล้ว', 'เสร็จสิ้น': 'เสร็จ', 'ไม่อนุมัติ': 'ปฏิเสธ', 'ยกเลิก': 'ยกเลิก' };
  const statusCounts = {}; statusOrder.forEach(s => statusCounts[s] = 0);
  allRows.forEach(r => { const s = normalizeStatus(r.status); if (statusCounts[s] !== undefined) statusCounts[s]++; });
  const grandTotal = allRows.length;
  let pipelineHtml = '<div class="status-pipeline">';
  statusOrder.forEach(status => {
    const pct = grandTotal ? Math.round(statusCounts[status] / grandTotal * 100) : 0;
    const colors = { 'รอตรวจสอบวินัย': 'var(--status-discipline)', 'รอตรวจสอบผู้เข้าร่วม': 'var(--status-participant)', 'รอชำระเงิน': 'var(--status-payment)', 'ชำระแล้ว': 'var(--status-paid)', 'เสร็จสิ้น': 'var(--status-completed)', 'ไม่อนุมัติ': 'var(--status-rejected)', 'ยกเลิก': 'var(--status-cancelled)' };
    pipelineHtml += `<div class="status-pipeline-item" style="flex:1;min-width:55px;padding:6px 4px;border-radius:8px;background:${colors[status]}22;border:1px solid ${colors[status]}33;text-align:center">
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">${statusLabels[status]}</div>
        <div style="font-size:14px;font-weight:700;color:var(--text)">${statusCounts[status]}</div>
        <div style="font-size:9px;color:var(--text2)" class="status-pct">${pct}% ของทั้งหมด</div>
      </div>`;
  });
  pipelineHtml += '</div>';
  const pipelineEl = document.getElementById('statusPipeline');
  if (pipelineEl) pipelineEl.innerHTML = pipelineHtml;

  // Additional metrics
  const uniquePrisoners = new Set();
  const uniqueVisitors = new Set();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let weekCount = 0, monthCount = 0;

  allRows.forEach(r => {
    if (r.prisonerId) uniquePrisoners.add(String(r.prisonerId).trim());
    const vid = r.visitorId || r.visitorName;
    if (vid) uniqueVisitors.add(String(vid).trim());

    let visitKey = r.visitDateISO;
    if (!visitKey && r.visitDate) {
      const ts = r.timestamp ? new Date(r.timestamp.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')) : null;
      if (ts && !isNaN(ts)) visitKey = ts.toISOString().slice(0, 10);
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

  const lastUpdatedEl = document.getElementById('overviewLastUpdated');
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = 'อัปเดต ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }

  // Trend Chart
  drawReservationTrendChart();

  // NEW: Donut chart, Wing revenue, Floor plan
  drawStatusDonutChart();
  drawWingRevenueChart();
  buildFloorPlanDateFilter();
  renderFloorPlan();
}

// ===== VALIDATION HELPERS =====
function validateIdFormat(val) {
  if (!val) return { valid: true };
  if (val.includes('-')) {
    const isValid = /^\d{1}-\d{4}-\d{5}-\d{2}-\d{1}$/.test(val);
    return { valid: isValid, error: 'รูปแบบเลขบัตรประชาชนไม่ถูกต้อง (X-XXXX-XXXXX-XX-X)' };
  }
  const isValid = /^[A-Za-z0-9]{6,20}$/.test(val);
  return { valid: isValid, error: 'รูปแบบ Passport ไม่ถูกต้อง (ตัวอักษร/ตัวเลข 6-20 หลัก)' };
}

function validatePhone(val) {
  const cleaned = val.replace(/[^0-9]/g, '');
  return { cleaned, valid: cleaned.length === 10, error: 'เบอร์โทรศัพท์ต้องมี 10 ตัวเลข' };
}

// ===== PRISONER MASTER DATA =====
async function loadPrisonerMaster() {
  const statusEl = document.getElementById('nbPrisonerLoadStatus');
  if (statusEl) statusEl.textContent = '⏳ กำลังโหลดรายชื่อผู้ต้องขัง...';

  try {
    const resp = await fetch(APPS_SCRIPT_URL + '?action=getPrisoners');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();

    if (data.status === 'ok' && Array.isArray(data.prisoners)) {
      prisonerMaster = data.prisoners;
      if (statusEl) {
        statusEl.textContent = `✓ โหลดสำเร็จ (${prisonerMaster.length} คน)`;
        statusEl.style.color = 'var(--green)';
      }
    } else {
      throw new Error('Invalid response');
    }
  } catch (e) {
    console.error('[PrisonerMaster]', e);
    if (statusEl) {
      statusEl.textContent = '⚠️ โหลดรายชื่อจากฐานข้อมูลไม่ได้ — กรอกเองไม่ได้';
      statusEl.style.color = 'var(--red)';
    }
  }
}

function nbFilterPrisonerSuggestions() {
  const q = document.getElementById('nbPrisonerSearch').value.trim().toLowerCase();
  const container = document.getElementById('nbPrisonerSuggestions');
  container.innerHTML = '';
  container.style.display = 'none';

  if (!q || prisonerMaster.length === 0) return;

  const matches = prisonerMaster.filter(p =>
    p.prisonerId.toLowerCase().includes(q) ||
    p.prisonerName.toLowerCase().includes(q)
  ).slice(0, 8);

  if (matches.length === 0) return;

  matches.forEach(p => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.innerHTML = `
      <div style="flex:1">
        <strong style="font-size:15px;">${escHtml(maskPrisonerName(p.prisonerName))}</strong>
      </div>
      <div style="text-align:right;font-size:12px;line-height:1.25;color:#555;">
        #${escHtml(p.prisonerId)}<br>
        <span style="color:var(--blue);font-weight:600;">${escHtml(p.wing || '')}</span>
      </div>
    `;
    div.onclick = () => nbSelectPrisoner(p);
    container.appendChild(div);
  });
  container.style.display = 'block';
}

function nbSelectPrisoner(p) {
  document.getElementById('nbPrisonerId').value = p.prisonerId;
  document.getElementById('nbPrisonerName').value = p.prisonerName;
  document.getElementById('nbWing').value = p.wing || '';

  document.getElementById('nbDispPrisonerName').textContent = maskPrisonerName(p.prisonerName);
  document.getElementById('nbDispPrisonerId').textContent = p.prisonerId;
  document.getElementById('nbDispWing').textContent = p.wing || '';
  document.getElementById('nbSelectedPrisonerDisplay').style.display = 'block';

  document.getElementById('nbPrisonerSearch').value = '';
  document.getElementById('nbPrisonerSuggestions').innerHTML = '';
  document.getElementById('nbPrisonerSuggestions').style.display = 'none';

  const statusEl = document.getElementById('nbPrisonerMatchStatus');
  statusEl.textContent = `✓ เลือกจากฐานข้อมูล: ${maskPrisonerName(p.prisonerName)} (#${p.prisonerId}) — ${p.wing}`;
  statusEl.style.display = 'block';
  statusEl.style.color = 'var(--green)';
}

// ===== NEW BOOKING MODAL (Superadmin/Admin) =====
function openNewBookingModal() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  document.getElementById('nbVisitDate').value = y + '-' + m + '-' + d;
  document.getElementById('nbVisitorCount').value = '1';
  document.getElementById('nbExtraVisitorsContainer').style.display = 'none';
  document.getElementById('nbExtraVisitorsList').innerHTML = '';

  // Reset prisoner state
  document.getElementById('nbPrisonerName').value = '';
  document.getElementById('nbPrisonerId').value = '';
  document.getElementById('nbWing').value = '';
  document.getElementById('nbPrisonerSearch').value = '';
  document.getElementById('nbPrisonerSuggestions').innerHTML = '';
  document.getElementById('nbPrisonerSuggestions').style.display = 'none';
  document.getElementById('nbSelectedPrisonerDisplay').style.display = 'none';
  document.getElementById('nbPrisonerMatchStatus').style.display = 'none';

  updateNbTotal();
  document.getElementById('newBookingModalBg').classList.add('show');
}

function closeNewBookingModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('newBookingModalBg').classList.remove('show');
}

function nbCalculateTotal() {
  const n = parseInt(document.getElementById('nbVisitorCount').value) || 1;
  const extras = nbGetExtraVisitors();
  let extraFees = 0;
  let adults = 1;
  let kids5_8 = 0, kidsUnder5 = 0;

  extras.forEach(v => {
    let fee = 1000;
    let isChild = false;
    if (v.relation === 'บุตร / ธิดา') {
      const a = parseInt(v.age, 10);
      if (!isNaN(a)) {
        if (a < 5) { fee = 0; isChild = true; kidsUnder5++; }
        else if (a <= 8) { fee = 500; isChild = true; kids5_8++; }
      }
    }
    extraFees += fee;
    if (!isChild) adults++;
  });

  const total = 1000 + 1000 + extraFees;
  return { total, extraFees, adults, kids5_8, kidsUnder5, numVisitors: n };
}

function updateNbTotal() {
  const c = nbCalculateTotal();
  const feeNote = c.extraFees > 0 ? ` (รวมค่าพิเศษ ${c.extraFees.toLocaleString()} บาท)` : '';
  document.getElementById('nbTotalDisplay').textContent = c.total.toLocaleString() + ' บาท' + feeNote;
}

function nbUpdateExtraVisitors() {
  const n = parseInt(document.getElementById('nbVisitorCount').value);
  const container = document.getElementById('nbExtraVisitorsContainer');
  const list = document.getElementById('nbExtraVisitorsList');
  list.innerHTML = '';
  if (n <= 1) { container.style.display = 'none'; return; }
  container.style.display = 'block';

  const relOpts = '<option value="">-- เลือก --</option><option>บิดา / มารดา</option><option>แฟน/ภรรยา</option><option>บุตร / ธิดา</option><option>พี่ / น้อง</option><option>ญาติ</option><option>เพื่อน</option><option>ทนายความ</option><option>อื่น ๆ</option>';
  const religionOpts = '<option value="">-- เลือก --</option><option>พุทธ</option><option>อิสลาม</option><option>คริสต์</option><option>อื่น ๆ</option>';

  for (let i = 2; i <= n; i++) {
    const div = document.createElement('div');
    div.style.cssText = 'border-top:1px dashed var(--border);padding-top:10px;margin-top:4px;';
    div.innerHTML =
      '<div style="font-size:12px;font-weight:600;color:var(--blue);margin-bottom:6px;">ผู้เข้าร่วมคนที่ ' + i + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
      '<div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">ชื่อ-นามสกุล <span style="color:var(--red)">*</span></label>' +
      '<input type="text" id="nbExtraName' + i + '" class="search-box" style="width:100%;"></div>' +
      '<div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">เลขประจำตัว <span style="color:var(--red)">*</span></label>' +
      '<input type="text" id="nbExtraId' + i + '" class="search-box" placeholder="ปชช. X-XXXX-XXXXX-XX-X หรือ Passport" style="width:100%;"></div>' +
      '<div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">ศาสนา <span style="color:var(--red)">*</span></label>' +
      '<select id="nbExtraReligion' + i + '" class="filter-select" style="width:100%;">' + religionOpts + '</select></div>' +
      '<div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">แพ้อาหาร <span style="color:var(--red)">*</span></label>' +
      '<input type="text" id="nbExtraAllergy' + i + '" class="search-box" style="width:100%;"></div>' +
      '<div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">ความสัมพันธ์ <span style="color:var(--red)">*</span></label>' +
      '<select id="nbExtraRelation' + i + '" class="filter-select" style="width:100%;">' + relOpts + '</select></div>' +
      '<div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">อายุ <span style="color:var(--text2);font-size:10px;">(ถ้าเป็นบุตร)</span></label>' +
      '<input type="number" id="nbExtraAge' + i + '" class="search-box" min="0" max="120" style="width:100%;"></div>' +
      '</div>';
    list.appendChild(div);
  }
  updateNbTotal();
}

function nbGetExtraVisitors() {
  const n = parseInt(document.getElementById('nbVisitorCount').value);
  const extras = [];
  for (let i = 2; i <= n; i++) {
    const nameEl = document.getElementById('nbExtraName' + i);
    if (!nameEl) continue;
    const name = nameEl.value.trim();
    if (!name) continue;
    extras.push({
      name,
      id: document.getElementById('nbExtraId' + i).value.trim(),
      relation: document.getElementById('nbExtraRelation' + i).value,
      age: document.getElementById('nbExtraAge' + i).value,
      religion: document.getElementById('nbExtraReligion' + i).value,
      allergy: document.getElementById('nbExtraAllergy' + i).value.trim()
    });
  }
  return extras;
}

async function submitNewBooking() {
  const visitorName = document.getElementById('nbVisitorName').value.trim();
  const visitorId = document.getElementById('nbVisitorId').value.trim();
  let visitorPhone = document.getElementById('nbVisitorPhone').value.trim();
  const relation = document.getElementById('nbRelation').value;
  const visitorReligion = document.getElementById('nbVisitorReligion').value;
  const visitorAllergy = document.getElementById('nbVisitorAllergy').value.trim();
  const prisonerName = document.getElementById('nbPrisonerName').value.trim();
  const prisonerId = document.getElementById('nbPrisonerId').value.trim();
  const wing = document.getElementById('nbWing').value.trim();
  const visitDateISO = document.getElementById('nbVisitDate').value;
  const n = parseInt(document.getElementById('nbVisitorCount').value) || 1;

  if (!visitorName || !visitorId || !visitorPhone || !relation || !visitorReligion || !visitorAllergy) {
    showToast('กรุณากรอกข้อมูลผู้จองให้ครบถ้วน', 'error'); return;
  }

  const idResult = validateIdFormat(visitorId);
  if (!idResult.valid) { showToast(idResult.error, 'error'); return; }

  const phoneResult = validatePhone(visitorPhone);
  if (!phoneResult.valid) { showToast(phoneResult.error, 'error'); return; }
  visitorPhone = phoneResult.cleaned;

  if (!prisonerName || !prisonerId || !wing) {
    showToast('กรุณากรอกข้อมูลผู้ต้องขังให้ครบถ้วน', 'error'); return;
  }
  if (!visitDateISO) {
    showToast('กรุณาเลือกวันที่ต้องการเข้าร่วม', 'error'); return;
  }

  const extras = nbGetExtraVisitors();
  const extraNamesStr = extras.map(v => v.name + '|' + v.id + '|' + v.relation + '|' + (v.age || '')).join(';;');
  const extraReligionsStr = extras.map(v => v.religion || '').join(';;');
  const extraAllergiesStr = extras.map(v => v.allergy || '').join(';;');

  const calc = nbCalculateTotal();
  const totalPersons = n + 1;
  const total = calc.total;

  const ref = 'VIS-' + Math.floor(10000 + Math.random() * 90000);
  const d = new Date(visitDateISO + 'T00:00:00');
  const thDate = d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const now = new Date().toLocaleString('th-TH');

  const data = {
    action: 'saveReservation',
    ref,
    timestamp: now,
    visitorName,
    extraVisitorNames: extraNamesStr,
    visitorId,
    visitorPhone,
    relation,
    religion: visitorReligion,
    allergy: visitorAllergy,
    extraVisitorReligions: extraReligionsStr,
    extraVisitorAllergies: extraAllergiesStr,
    prisonerName,
    prisonerId,
    wing,
    visitDate: thDate,
    visitDateISO,
    visitorCount: n,
    totalPersons,
    total,
    adultCount: calc.adults,
    child5to8Count: calc.kids5_8,
    childUnder5Count: calc.kidsUnder5,
    status: 'รอตรวจสอบวินัย',
    slipImage: ''
  };

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const result = JSON.parse(await resp.text());
    if (result.status !== 'ok') throw new Error(result.message || 'ไม่สำเร็จ');

    showToast('✅ จองสำเร็จ! เลขอ้างอิง: ' + ref, 'success');
    logEvent('admin_new_booking', `Admin สร้างการจอง ${ref} โดย ${currentUser.username}`);
    closeNewBookingModal();
    loadData();
    updateStats();
    renderDashboardHome();
  } catch (e) {
    console.error('New booking error:', e);
    showToast('ไม่สามารถบันทึกการจองได้: ' + e.message, 'error');
  }
}

// ===== EDIT BOOKING (Superadmin) =====
function editBooking(idx) {
  const r = allRows[idx];
  if (!r) return;

  const extras = parseExtraVisitors(r);
  const extraReligions = String(r.extraVisitorReligions || '').split(';;').filter(Boolean);
  const extraAllergies = String(r.extraVisitorAllergies || '').split(';;').filter(Boolean);
  const extraApproved = String(r.extraVisitorApproved || '').split(';;').filter(Boolean);

  window._editExtrasOriginal = extras.map((e, i) => ({
    name: e.name,
    id: e.id,
    relation: e.relation,
    age: e.age,
    religion: extraReligions[i] || '',
    allergy: extraAllergies[i] || '',
    approved: extraApproved[i] || ''
  }));

  function esc(s) { return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  let extraHtml = '';
  extras.forEach((e, i) => {
    const rel = esc(e.relation);
    const relAge = e.relation === 'บุตร / ธิดา' ? 'block' : 'none';
    extraHtml += `
      <div class="edit-extra-row" data-ei="${i}" style="border-top:1px dashed var(--border);padding:10px 0;margin-top:4px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:12px;font-weight:600;color:var(--blue);">👤 ผู้เข้าร่วมเพิ่มเติม #${i + 1}</span>
          <button class="btn-cancel" onclick="removeEditExtra(this)" style="padding:3px 10px;font-size:11px;">✕ ลบ</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">ชื่อ-นามสกุล</label>
            <input type="text" class="edit-extra-name search-box" value="${esc(e.name)}" style="width:100%;"></div>
          <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">เลขประจำตัว</label>
            <input type="text" class="edit-extra-id search-box" value="${esc(e.id)}" style="width:100%;"></div>
          <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">ความสัมพันธ์</label>
            <select class="edit-extra-relation filter-select" style="width:100%;" onchange="toggleEditExtraAge(this)">
              <option value="">-- เลือก --</option>${['บิดา / มารดา', 'แฟน/ภรรยา', 'บุตร / ธิดา', 'พี่ / น้อง', 'ญาติ', 'เพื่อน', 'ทนายความ', 'อื่น ๆ'].map(o =>
      `<option value="${o}" ${rel === o ? 'selected' : ''}>${o}</option>`
    ).join('')}</select></div>
          <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">อายุ</label>
            <input type="number" class="edit-extra-age search-box" value="${esc(e.age)}" min="0" max="120" style="width:100%;${relAge === 'none' ? 'display:none;' : ''}"></div>
          <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">ศาสนา</label>
            <select class="edit-extra-religion filter-select" style="width:100%;">
              <option value="">-- เลือก --</option>${['พุทธ', 'อิสลาม', 'คริสต์', 'อื่น ๆ'].map(o =>
      `<option value="${o}" ${extraReligions[i] === o ? 'selected' : ''}>${o}</option>`
    ).join('')}</select></div>
          <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">แพ้อาหาร</label>
            <input type="text" class="edit-extra-allergy search-box" value="${esc(extraAllergies[i] || '')}" style="width:100%;"></div>
          <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">✅ สถานะอนุมัติ</label>
            <select class="edit-extra-approved filter-select" style="width:100%;">
              <option value="">-- รอพิจารณา --</option>
              <option value="yes" ${extraApproved[i] === 'yes' ? 'selected' : ''}>อนุมัติ</option>
              <option value="no" ${extraApproved[i] === 'no' ? 'selected' : ''}>ไม่อนุมัติ</option>
            </select></div>
        </div>
      </div>`;
  });

  const modal = document.getElementById('editModalBody');
  modal.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-weight:700;font-size:15px;">แก้ไขการจอง ${esc(r.ref)}</div>
        <span class="badge badge-discipline-check" style="font-size:11px;">${esc(r.status)}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">👤 ชื่อผู้เข้าร่วม</label>
          <input type="text" id="editVisitorName" class="search-box" value="${esc(r.visitorName)}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">📞 เบอร์โทร</label>
          <input type="text" id="editVisitorPhone" class="search-box" value="${esc(r.visitorPhone)}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">🪪 เลขประจำตัว (บัตร ปชช. / Passport)</label>
          <input type="text" id="editVisitorId" class="search-box" value="${esc(r.visitorId)}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">🤝 ความสัมพันธ์</label>
          <input type="text" id="editRelation" class="search-box" value="${esc(r.relation)}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">🛐 ศาสนา</label>
          <input type="text" id="editReligion" class="search-box" value="${esc(r.religion)}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">⚠️ แพ้อาหาร</label>
          <input type="text" id="editAllergy" class="search-box" value="${esc(r.allergy)}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">🔒 ชื่อผู้ต้องขัง</label>
          <input type="text" id="editPrisonerName" class="search-box" value="${esc(r.prisonerName)}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">🔢 เลขผู้ต้องขัง</label>
          <input type="text" id="editPrisonerId" class="search-box" value="${esc(r.prisonerId)}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">🏢 แดน</label>
          <input type="text" id="editWing" class="search-box" value="${esc(r.wing)}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">📅 วันที่เยี่ยม</label>
          <input type="text" id="editVisitDate" class="search-box" value="${esc(r.visitDate)}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">👥 จำนวนผู้เข้าร่วม</label>
          <input type="number" id="editVisitorCount" class="search-box" value="${r.visitorCount || 1}" style="width:100%;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">💰 ยอดเงิน</label>
          <input type="number" id="editTotal" class="search-box" value="${r.total || 0}" style="width:100%;">
        </div>
        <div style="grid-column:1/-1;">
          <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:3px;">📝 สถานะ</label>
          <select id="editStatus" class="filter-select" style="width:100%;">
            ${['รอตรวจสอบวินัย', 'รอตรวจสอบผู้เข้าร่วม', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น', 'ไม่อนุมัติ', 'ยกเลิก'].map(s =>
    `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`
  ).join('')}
          </select>
        </div>
      </div>
    </div>

    <div style="margin-bottom:16px;" id="editExtraSection">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px;">👥 ผู้เข้าร่วมเพิ่มเติม</div>
      <div id="editExtraList">${extraHtml}</div>
      <button class="btn-approve" onclick="addEditExtra()" style="margin-top:8px;padding:6px 14px;font-size:12px;">➕ เพิ่มผู้เข้าร่วม</button>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:12px;border-top:1px solid var(--border);">
      <button class="btn-cancel" onclick="closeEditModal()">ยกเลิก</button>
      <button class="btn-approve" onclick="saveBookingEdit(${idx})">💾 บันทึกการแก้ไข</button>
    </div>
  `;
  document.getElementById('editModalBg').classList.add('show');
}

function toggleEditExtraAge(selectEl) {
  const row = selectEl.closest('.edit-extra-row');
  if (!row) return;
  const ageInput = row.querySelector('.edit-extra-age');
  const childValues = ['บุตร / ธิดา'];
  if (childValues.includes(selectEl.value)) {
    ageInput.style.display = '';
  } else {
    ageInput.style.display = 'none';
    ageInput.value = '';
  }
}

function removeEditExtra(btn) {
  const row = btn.closest('.edit-extra-row');
  if (row) row.remove();
}

function addEditExtra() {
  const list = document.getElementById('editExtraList');
  const idx = list.querySelectorAll('.edit-extra-row').length;
  const relOpts = ['บิดา / มารดา', 'แฟน/ภรรยา', 'บุตร / ธิดา', 'พี่ / น้อง', 'ญาติ', 'เพื่อน', 'ทนายความ', 'อื่น ๆ'].map(o =>
    `<option value="${o}">${o}</option>`
  ).join('');
  const relOptsAll = '<option value="">-- เลือก --</option>' + relOpts;
  const relOptsRel = ['พุทธ', 'อิสลาม', 'คริสต์', 'อื่น ๆ'].map(o =>
    `<option value="${o}">${o}</option>`
  ).join('');
  const relOptsRelAll = '<option value="">-- เลือก --</option>' + relOptsRel;
  const div = document.createElement('div');
  div.className = 'edit-extra-row';
  div.style.cssText = 'border-top:1px dashed var(--border);padding:10px 0;margin-top:4px;';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <span style="font-size:12px;font-weight:600;color:var(--green);">➕ ผู้เข้าร่วมเพิ่มเติม (ใหม่)</span>
      <button class="btn-cancel" onclick="removeEditExtra(this)" style="padding:3px 10px;font-size:11px;">✕ ลบ</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">ชื่อ-นามสกุล</label>
        <input type="text" class="edit-extra-name search-box" style="width:100%;"></div>
      <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">เลขประจำตัว</label>
        <input type="text" class="edit-extra-id search-box" placeholder="ปชช. X-XXXX-XXXXX-XX-X หรือ Passport" style="width:100%;"></div>
      <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">ความสัมพันธ์</label>
        <select class="edit-extra-relation filter-select" style="width:100%;" onchange="toggleEditExtraAge(this)">${relOptsAll}</select></div>
      <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">อายุ</label>
        <input type="number" class="edit-extra-age search-box" min="0" max="120" style="width:100%;display:none;"></div>
      <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">ศาสนา</label>
        <select class="edit-extra-religion filter-select" style="width:100%;">${relOptsRelAll}</select></div>
      <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">แพ้อาหาร</label>
        <input type="text" class="edit-extra-allergy search-box" style="width:100%;"></div>
      <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:2px;">✅ สถานะอนุมัติ</label>
        <select class="edit-extra-approved filter-select" style="width:100%;">
          <option value="">-- รอพิจารณา --</option>
          <option value="yes">อนุมัติ</option>
          <option value="no">ไม่อนุมัติ</option>
        </select></div>
    </div>`;
  list.appendChild(div);
}

async function saveBookingEdit(idx) {
  const r = allRows[idx];
  const oldData = { ...r };

  const extraRows = document.querySelectorAll('#editExtraList .edit-extra-row');
  const extraNames = [], extraReligions = [], extraAllergies = [], extraApproved = [];
  extraRows.forEach(row => {
    const name = row.querySelector('.edit-extra-name')?.value?.trim() || '';
    if (!name) return;
    const id = row.querySelector('.edit-extra-id')?.value?.trim() || '';
    const relation = row.querySelector('.edit-extra-relation')?.value || '';
    const age = row.querySelector('.edit-extra-age')?.value || '';
    const religion = row.querySelector('.edit-extra-religion')?.value || '';
    const allergy = row.querySelector('.edit-extra-allergy')?.value?.trim() || '';
    extraNames.push(name + '|' + id + '|' + relation + '|' + age);
    extraReligions.push(religion);
    extraAllergies.push(allergy);

    const ei = row.dataset.ei;
    const orig = ei !== undefined && window._editExtrasOriginal && window._editExtrasOriginal[parseInt(ei)];
    if (orig) {
      const changed = name !== orig.name || id !== orig.id || relation !== orig.relation
        || age !== orig.age || religion !== orig.religion || allergy !== orig.allergy;
      extraApproved.push(changed ? '' : orig.approved);
    } else {
      extraApproved.push('');
    }
  });
  const extraVisitorNamesStr = extraNames.join(';;');
  const extraVisitorReligionsStr = extraReligions.join(';;');
  const extraVisitorAllergiesStr = extraAllergies.join(';;');
  const extraVisitorApprovedStr = extraApproved.join(';;');

  const updates = {
    visitorName: document.getElementById('editVisitorName').value.trim(),
    visitorPhone: document.getElementById('editVisitorPhone').value.trim(),
    visitorId: document.getElementById('editVisitorId').value.trim(),
    relation: document.getElementById('editRelation').value.trim(),
    religion: document.getElementById('editReligion').value.trim(),
    allergy: document.getElementById('editAllergy').value.trim(),
    prisonerName: document.getElementById('editPrisonerName').value.trim(),
    prisonerId: document.getElementById('editPrisonerId').value.trim(),
    wing: document.getElementById('editWing').value.trim(),
    visitDate: document.getElementById('editVisitDate').value.trim(),
    visitorCount: parseInt(document.getElementById('editVisitorCount').value) || 1,
    total: parseInt(document.getElementById('editTotal').value) || 0,
    status: document.getElementById('editStatus').value,
    extraVisitorNames: extraVisitorNamesStr,
    extraVisitorReligions: extraVisitorReligionsStr,
    extraVisitorAllergies: extraVisitorAllergiesStr,
    extraVisitorApproved: extraVisitorApprovedStr
  };

  Object.assign(r, updates);

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateBooking', username: currentUser.username, password: currentUser.password, ref: r.ref, ...updates })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Unauthorized');

    showToast('แก้ไขการจองสำเร็จ', 'success');
    logEvent('edit_booking', `แก้ไขการจอง ${r.ref}`);
    closeEditModal();
    updateStats();
    renderTable();
    renderDashboardHome();
  } catch (e) {
    console.error('Edit booking error:', e);
    Object.assign(r, oldData);
    showToast(`ไม่สามารถแก้ไขได้: ${e.message}`, 'error');
    closeEditModal();
    updateStats();
    renderTable();
  }
}

// ===== BULK ACTIONS =====
function toggleSelectAll() {
  const master = document.getElementById('selectAll');
  if (!master) return;
  document.querySelectorAll('.row-select').forEach(cb => { cb.checked = master.checked; });
  updateBulkBar();
}

function updateBulkBar() {
  const selected = getSelectedRows();
  const bar = document.getElementById('bulkActionsBar');
  const count = document.getElementById('bulkSelectedCount');
  const summary = document.getElementById('bulkStatusSummary');
  const btnComplete = document.getElementById('bulkBtnComplete');
  if (bar && count) {
    if (selected.length > 0) {
      bar.style.display = 'flex';
      count.textContent = selected.length;
      // Count statuses
      const statusCount = {};
      let hasCompleted = false;
      selected.forEach(idx => {
        const s = normalizeStatus(allRows[idx]?.status);
        statusCount[s] = (statusCount[s] || 0) + 1;
        if (s === 'ชำระแล้ว') hasCompleted = true;
      });
      summary.textContent = Object.entries(statusCount)
        .map(([s, n]) => `${s} ${n}`).join(', ');
      btnComplete.style.display = hasCompleted ? '' : 'none';
    } else {
      bar.style.display = 'none';
    }
  }
}

function getSelectedRows() {
  const checked = document.querySelectorAll('.row-select:checked');
  return Array.from(checked).map(cb => parseInt(cb.dataset.idx));
}

async function bulkApprove() {
  const indices = getSelectedRows();
  if (!indices.length) { showToast('กรุณาเลือกรายการ', 'warning'); return; }
  if (!confirm(`ยืนยันอนุมัติ ${indices.length} รายการ?`)) return;

  let success = 0, fail = 0;
  for (const idx of indices) {
    const r = allRows[idx];
    const s = normalizeStatus(r.status);
    let nextStatus = null;
    if (s === 'รอตรวจสอบวินัย') nextStatus = 'รอตรวจสอบผู้เข้าร่วม';
    else if (s === 'รอตรวจสอบผู้เข้าร่วม') nextStatus = 'รอชำระเงิน';

    if (nextStatus) {
      try {
        const resp = await fetch(APPS_SCRIPT_URL, {
          method: 'POST', redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateStatus', username: currentUser.username, password: currentUser.password, ref: r.ref, status: nextStatus })
        });
        const data = await resp.json();
        if (data.status === 'ok') { r.status = nextStatus; success++; } else { fail++; }
      } catch { fail++; }
    }
  }
  document.getElementById('selectAll').checked = false;
  showToast(`อนุมัติสำเร็จ ${success} รายการ${fail ? ', ไม่สำเร็จ ' + fail : ''}`, success ? 'success' : 'warning');
  logEvent('bulk_approve', `อนุมัติ ${success} รายการ`);
  updateStats(); renderTable(); updateBulkBar();
}

async function bulkReject() {
  const indices = getSelectedRows();
  if (!indices.length) { showToast('กรุณาเลือกรายการ', 'warning'); return; }
  if (!confirm(`ยืนยันปฏิเสธ ${indices.length} รายการ?`)) return;

  let success = 0;
  for (const idx of indices) {
    const r = allRows[idx];
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateStatus', username: currentUser.username, password: currentUser.password, ref: r.ref, status: 'ไม่อนุมัติ' })
      });
      const data = await resp.json();
      if (data.status === 'ok') { r.status = 'ไม่อนุมัติ'; success++; }
    } catch { }
  }
  document.getElementById('selectAll').checked = false;
  showToast(`ปฏิเสธ ${success} รายการ`, 'warning');
  logEvent('bulk_reject', `ปฏิเสธ ${success} รายการ`);
  updateStats(); renderTable(); updateBulkBar();
}

async function bulkComplete() {
  const indices = getSelectedRows();
  if (!indices.length) { showToast('กรุณาเลือกรายการ', 'warning'); return; }
  const paid = indices.filter(idx => normalizeStatus(allRows[idx]?.status) === 'ชำระแล้ว');
  if (!paid.length) { showToast('ไม่มีรายการที่สถานะ "ชำระแล้ว"', 'warning'); return; }
  if (!confirm(`ยืนยันเสร็จสิ้น ${paid.length} รายการ?`)) return;

  let success = 0;
  for (const idx of paid) {
    const r = allRows[idx];
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateStatus', username: currentUser.username, password: currentUser.password, ref: r.ref, status: 'เสร็จสิ้น' })
      });
      const data = await resp.json();
      if (data.status === 'ok') { r.status = 'เสร็จสิ้น'; success++; }
    } catch { }
  }
  document.getElementById('selectAll').checked = false;
  showToast(`เสร็จสิ้น ${success} รายการ`, 'success');
  logEvent('bulk_complete', `เสร็จสิ้น ${success} รายการ`);
  updateStats(); renderTable(); updateBulkBar();
}

async function bulkCancel() {
  const indices = getSelectedRows();
  if (!indices.length) { showToast('กรุณาเลือกรายการ', 'warning'); return; }
  if (!confirm(`⚠️ ยืนยันยกเลิก ${indices.length} รายการ?\nไม่สามารถกู้คืนได้`)) return;

  let success = 0;
  for (const idx of indices) {
    const r = allRows[idx];
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'cancelBooking', username: currentUser.username, password: currentUser.password, ref: r.ref })
      });
      const data = await resp.json();
      if (data.status === 'ok') { r.status = 'ยกเลิก'; success++; }
    } catch { }
  }
  document.getElementById('selectAll').checked = false;
  showToast(`ยกเลิก ${success} รายการ`, 'warning');
  logEvent('bulk_cancel', `ยกเลิก ${success} รายการ`);
  updateStats(); renderTable(); updateBulkBar();
}

function bulkExport() {
  const indices = getSelectedRows();
  if (!indices.length) { showToast('กรุณาเลือกรายการ', 'warning'); return; }

  const headers = ['ref', 'timestamp', 'visitorName', 'visitorPhone', 'visitorId', 'relation', 'prisonerName', 'prisonerId', 'wing', 'visitDate', 'visitorCount', 'total', 'status'];
  let csvContent = headers.join(',') + '\r\n';
  indices.forEach(idx => {
    const r = allRows[idx];
    csvContent += headers.map(h => {
      let val = r[h] != null ? String(r[h]) : '';
      if (val.includes(',') || val.includes('"')) val = '"' + val.replace(/"/g, '""') + '"';
      return val;
    }).join(',') + '\r\n';
  });

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CC_Selected_${indices.length}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(`ส่งออก ${indices.length} รายการสำเร็จ`, 'success');
}

// ===== NOTIFICATIONS =====
function renderNotifications() {
  const pending = allRows.filter(r => {
    const s = normalizeStatus(r.status);
    return s === 'รอตรวจสอบวินัย' || s === 'รอชำระเงิน';
  });

  const bell = document.getElementById('notifBell');
  const badge = document.getElementById('notifBadge');
  const list = document.getElementById('notifPanel');

  if (pending.length > 0 && bell) {
    bell.style.display = 'flex';
    if (badge) { badge.style.display = 'flex'; badge.textContent = pending.length > 99 ? '99+' : pending.length; }
    if (list) {
      list.innerHTML = pending.slice(0, 20).map(r => {
        const s = normalizeStatus(r.status);
        const icon = s === 'รอตรวจสอบวินัย' ? '🔍' : '💳';
        return `<div onclick="viewDetail(${allRows.indexOf(r)});switchView('reservations');toggleNotifPanel()" style="padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;gap:10px;align-items:center;transition:background 0.15s;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background=''">
          <span style="font-size:18px;">${icon}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:600;color:var(--text);">${escHtml(r.ref)} · ${escHtml(r.visitorName || '')}</div>
            <div style="font-size:11px;color:var(--text2);">${escHtml(s)} · ${escHtml(r.wing || '')}</div>
          </div>
          <span class="badge badge-payment-pending" style="font-size:10px;white-space:nowrap;">${escHtml(s)}</span>
        </div>`;
      }).join('');
      if (pending.length > 20) {
        list.innerHTML += `<div style="padding:10px;text-align:center;font-size:12px;color:var(--text2);">และอีก ${pending.length - 20} รายการ...</div>`;
      }
    }
  } else {
    if (bell) bell.style.display = 'none';
  }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', (e) => {
  const bell = document.getElementById('notifBell');
  const panel = document.getElementById('notifPanel');
  if (bell && panel && !bell.contains(e.target) && !panel.contains(e.target)) {
    panel.style.display = 'none';
  }
});

// ===== SETTINGS =====
function renderSettingsView() {
  document.getElementById('view-settings').style.display = '';
  const saved = JSON.parse(localStorage.getItem('cc_settings') || '{}');
  document.getElementById('settingsPageSize').value = saved.pageSize || '10';
  document.getElementById('settingsNotifEnabled').checked = saved.notifEnabled !== false;
  document.getElementById('settingsEmailNotif').checked = saved.emailNotif || false;
  document.getElementById('settingsSoundNotif').checked = saved.soundNotif || false;
  document.getElementById('settingsDarkMode').checked = saved.darkMode || false;
}

async function saveSettings() {
  const settings = {
    pageSize: document.getElementById('settingsPageSize').value,
    notifEnabled: document.getElementById('settingsNotifEnabled').checked,
    emailNotif: document.getElementById('settingsEmailNotif').checked,
    soundNotif: document.getElementById('settingsSoundNotif').checked,
    darkMode: document.getElementById('settingsDarkMode').checked,
    savedAt: new Date().toISOString(),
    savedBy: currentUser ? currentUser.username : 'unknown'
  };

  localStorage.setItem('cc_settings', JSON.stringify(settings));

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveSettings', username: currentUser.username, password: currentUser.password, settings: settings })
    });
  } catch { }

  pageSize = parseInt(settings.pageSize) || 10;
  showToast('บันทึกตั้งค่าสำเร็จ', 'success');
  logEvent('save_settings', `บันทึกตั้งค่า: pageSize=${settings.pageSize}`);
}

// ===== NOTES =====
function getNotes(ref) {
  const allNotes = JSON.parse(localStorage.getItem('cc_notes') || '{}');
  return allNotes[ref] || [];
}

function addNote(ref, text) {
  if (!text.trim()) return;
  const allNotes = JSON.parse(localStorage.getItem('cc_notes') || '{}');
  if (!allNotes[ref]) allNotes[ref] = [];
  const note = {
    text: text.trim(),
    user: currentUser ? currentUser.username : 'unknown',
    timestamp: new Date().toLocaleString('th-TH')
  };
  allNotes[ref].push(note);
  localStorage.setItem('cc_notes', JSON.stringify(allNotes));

  fetch(APPS_SCRIPT_URL, {
    method: 'POST', redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'addNote', username: currentUser.username, password: currentUser.password, ref: ref, note: note })
  }).catch(() => { });

  logEvent('add_note', `เพิ่มหมายเหตุ ${ref}`);
  showToast('เพิ่มหมายเหตุสำเร็จ', 'success');
}

// Override the original renderDashboardHome
renderDashboardHome = renderDashboardHomeV2;

// Call renderNotifications after dashboard loads
const _origRenderDash = renderDashboardHome;
renderDashboardHome = function () {
  _origRenderDash();
  renderNotifications();
  const saved = JSON.parse(localStorage.getItem('cc_settings') || '{}');
  if (saved.pageSize) pageSize = parseInt(saved.pageSize) || 10;
};

// =====================================================
// ===== FORMAL GOVERNMENT REPORTS ENGINE =============
// ===== ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 ====
// =====================================================
const FORMAL_PRINT_CSS = `
  @page { size: A4; margin: 35mm 20mm 20mm 30mm; }
  @media print {
    html, body { margin: 0; padding: 0; width:210mm; }
    * { box-sizing:border-box; }
  }
  body {
    font-family:'TH Sarabun New','Sarabun PSK','Sarabun','Tahoma',sans-serif;
    font-size:16pt; line-height:1.5; color:#000;
  }
  .formal-page { width:160mm; margin:0 auto; padding:0; }

  /* ตราครุฑ */
  .garuda-wrap { text-align:center; margin-bottom:12pt; }
  .garuda-img { width:85pt; height:auto; display:inline-block; }

  /* ส่วนราชการเจ้าของหนังสือ และวันที่ */
  .header-block { margin-bottom:14pt; }
  .header-block .ref-line { }
  .header-block .dept-line { }
  .header-block .addr-line { }
  .header-block .date-line { text-align:right; margin-top:2pt; }

  /* เรื่อง */
  .topic-line { margin-bottom:4pt; display:flex; }
  .topic-line .label { white-space:pre; }
  .topic-line .value { }

  /* เรียน */
  .attn-line { margin-bottom:4pt; display:flex; }
  .attn-line .label { white-space:pre; }
  .attn-line .value { }

  /* อ้างถึง */
  .ref-line { margin-bottom:4pt; display:flex; }
  .ref-line .label { white-space:pre; }

  /* สิ่งที่ส่งมาด้วย */
  .enclose-line { margin-bottom:8pt; display:flex; }
  .enclose-line .label { white-space:pre; }

  /* เนื้อหา */
  .content-body { margin-top:10pt; }
  .content-body p { text-indent:2.5cm; margin:0 0 8pt 0; }
  .content-body table { width:100%; border-collapse:collapse; margin:10pt 0; font-size:15pt; }
  .content-body th, .content-body td { border:1px solid #000; padding:5pt 8pt; text-align:left; vertical-align:top; }
  .content-body th { font-weight:700; text-align:center; }
  .content-body .total-row { font-weight:700; }
  .content-body .center { text-align:center; }

  /* คำลงท้าย */
  .closing { margin-top:22pt; text-align:right; }

  /* ลายเซ็น */
  .signature-block { margin-top:16pt; }
  .signature-table { width:100%; }
  .signature-table td { width:50%; vertical-align:top; padding:0 10pt; text-align:center; }
  .signature-table .sign-label { }
  .signature-table .sign-name { font-weight:700; margin-top:2pt; }
  .signature-table .sign-pos { }
  .signature-table .sign-dept { }
  .signature-table .sign-phone { margin-top:4pt; }

  .page-break { page-break-after:always; }
`;

function thaiDateStr(date) {
  const months = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear() + 543;
  return d + ' ' + months[m] + ' พ.ศ. ' + y;
}

function setDefaultFormalDate() {
  const dateEl = document.getElementById('formalDate');
  if (!dateEl) return;
  const dates = allRows.map(r => r.visitDateISO).filter(Boolean).sort();
  if (dates.length > 0) {
    dateEl.value = dates[dates.length - 1];
  }
}

function getFormalFilteredRows() {
  const dateEl = document.getElementById('formalDate');
  const wingEl = document.getElementById('formalFilterWing');
  const statusEl = document.getElementById('formalFilterStatus');

  const fd = dateEl ? dateEl.value : '';
  const fw = wingEl ? wingEl.value : '';
  const fs = statusEl ? statusEl.value : '';

  return allRows.filter(r => {
    if (fs && normalizeStatus(r.status) !== fs) return false;
    if (fw && (r.wing || '') !== fw) return false;
    if (fd && (r.visitDateISO || r.visitDate) !== fd) return false;
    return true;
  });
}

function renderFormalReportsView() {
  const container = document.getElementById('formalReportsContent');
  if (!container) return;

  const dateEl = document.getElementById('formalDate');
  if (!dateEl || !dateEl.value) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2);">กรุณาเลือกวันที่จากปฏิทิน แล้วคลิก "แสดงรายงาน"</div>';
    return;
  }

  const filtered = getFormalFilteredRows();
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2);">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div>';
    return;
  }

  const date = filtered[0].visitDate || filtered[0].visitDateISO || 'ไม่ระบุวันที่';

  let totalAdults = 0, total5_8 = 0, totalUnder5 = 0;
  const prisonerList = [];
  filtered.forEach(r => {
    const d = computeDeptReportData(r);
    totalAdults += d.adults;
    total5_8 += d.kids5_8;
    totalUnder5 += d.kidsUnder5;
    if (r.prisonerName && !prisonerList.some(p => p.id === r.prisonerId)) {
      prisonerList.push({ name: r.prisonerName, id: r.prisonerId, wing: r.wing || '-' });
    }
  });

  const totalTables = filtered.length;
  const totalRelatives = filtered.reduce((sum, r) => sum + (parseInt(r.visitorCount) || 1), 0);
  const totalPrisoners = prisonerList.length;

  let html = '<div style="font-size:13px;color:var(--text2);margin-bottom:12px;">พบ ' + filtered.length + ' รายการ วันที่ ' + date + '</div>';

  html += '<div style="margin-bottom:20px;border:1px solid var(--border);border-radius:8px;padding:14px;background:var(--bg2);">';
  html += '<div style="font-size:14px;font-weight:700;color:var(--blue);margin-bottom:10px;">วันที่ ' + date + '</div>';

  html += buildFormalMiniPreview('disciplinary', prisonerList);
  html += buildFormalMiniPreview('kitchen', null, { totalTables, totalRelatives, totalPrisoners, totalAdults, total5_8, totalUnder5 });
  html += buildFormalMiniPreview('table', null, filtered);

  html += '</div>';

  container.innerHTML = html;
}

function buildFormalMiniPreview(type, data, extra) {
  const labels = {
    disciplinary: { title: 'รายงานส่วนทัณฑ์', icon: '🚨', color: '#c62828' },
    kitchen: { title: 'รายงานครัวและเบเกอรี่', icon: '🍽️', color: '#1b5e20' },
    table: { title: 'รายงานการจัดโต๊ะ', icon: '🪑', color: '#e65100' }
  };
  const l = labels[type];
  if (!l) return '';
  let detail = '';
  if (type === 'disciplinary' && data) {
    detail = 'ผู้ต้องขัง ' + data.length + ' คน';
  } else if (type === 'kitchen' && extra) {
    detail = extra.totalTables + ' โต๊ะ, ' + (extra.totalRelatives + extra.totalPrisoners) + ' คน';
  } else if (type === 'table' && extra) {
    detail = extra.length + ' โต๊ะ';
  }
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee;">' +
    '<span style="font-size:13px;"><span style="color:' + l.color + ';">' + l.icon + '</span> ' + l.title + '</span>' +
    '<span style="font-size:12px;color:var(--text2);">' + detail + '</span></div>';
}

function printFormalReport() {
  const dateEl = document.getElementById('formalDate');
  if (!dateEl || !dateEl.value) { showToast('กรุณาเลือกวันที่ก่อนพิมพ์', 'warning'); return; }

  const filtered = getFormalFilteredRows();
  if (filtered.length === 0) { showToast('ไม่มีข้อมูลสำหรับพิมพ์', 'warning'); return; }

  const date = filtered[0].visitDate || filtered[0].visitDateISO || 'ไม่ระบุวันที่';

  const wingEl = document.getElementById('formalFilterWing');
  const wingLabel = wingEl && wingEl.value ? ' แดน' + wingEl.value : '';

  const printContainer = document.getElementById('formalReportPrintPage');
  if (!printContainer) return;

  const title = 'รายงานผลการดำเนินกิจกรรมการเยี่ยมผู้ต้องขัง';

  const fullHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + FORMAL_PRINT_CSS + '</style></head><body>' +
    buildLetterhead(title, wingLabel, date) +
    buildDailyFormalContent(date, filtered) +
    buildFromClause(date) +
    buildSignatureBlock() +
    '</body></html>';

  printContainer.innerHTML = fullHtml;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) { showToast('กรุณาอนุญาต Pop-up เพื่อพิมพ์รายงาน', 'error'); return; }
  printWindow.document.write(fullHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

function buildLetterhead(title, wingLabel, visitDate) {
  const dept = 'เรือนจำจําลอง CC คาเฟ่';
  const addr1 = 'เลขที่ ๑ ถนนจําลอง ตําบลจําลอง';
  const addr2 = 'อําเภอจําลอง จังหวัดจําลอง ๑๐๐๐๐';

  const thaiYear = new Date().getFullYear() + 543;
  const docNum = String(Math.floor(Math.random() * 9000) + 1000);
  const docRef = 'ศผ XXX/' + docNum;

  let html = '<div class="formal-page">';

  // Garuda
  html += '<div class="garuda-wrap"><div class="garuda-img"><svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg"><path d="M60 10 L68 30 L95 20 L80 40 L110 50 L88 65 L115 80 L88 90 L95 115 L75 100 L68 130 L60 110 L52 130 L45 100 L25 115 L32 90 L5 80 L32 65 L10 50 L40 40 L25 20 L52 30 Z" fill="black"/><circle cx="60" cy="52" r="12" fill="white"/><circle cx="60" cy="52" r="6" fill="black"/><path d="M50 68 Q60 78 70 68" stroke="black" stroke-width="3" fill="none"/><path d="M40 85 L60 95 L80 85" stroke="black" stroke-width="3" fill="none"/><path d="M35 100 L60 115 L85 100" stroke="black" stroke-width="3" fill="none"/></svg></div></div>';

  // Header block
  html += '<div class="header-block">';
  html += '<div class="ref-line">ที่ ' + docRef + '</div>';
  html += '<div class="dept-line">' + dept + '</div>';
  html += '<div class="addr-line">' + addr1 + '</div>';
  html += '<div class="addr-line">' + addr2 + '</div>';
  html += '<div class="date-line">' + thaiDateStr(new Date()) + '</div>';
  html += '</div>';

  // Subject
  html += '<div class="topic-line"><span class="label">เรื่อง </span><span class="value">' + title + wingLabel + '</span></div>';

  // Attention
  html += '<div class="attn-line"><span class="label">เรียน </span><span class="value">ผู้บัญชาการเรือนจําจําลอง CC คาเฟ่</span></div>';

  // Body opening
  html += '<div class="content-body">';
  html += '<p>ตามที่เรือนจําจําลอง CC คาเฟ่ ได้ดำเนินกิจกรรมการเยี่ยมผู้ต้องขังตามโครงการ Chance &amp; Change Cafe เมื่อวันที่ ' + visitDate + ' นั้น ในการนี้ฝ่ายที่เกี่ยวข้องได้ดำเนินการจัดกิจกรรมและมีรายละเอียดสรุปได้ดังนี้</p>';

  return html;
}

function buildFromClause(visitDate) {
  return '<p>จึงเรียนมาเพื่อโปรดทราบ</p>';
}

function buildSignatureBlock() {
  const dept = 'เรือนจําจําลอง CC คาเฟ่';
  const phone = '๐ ๒xxx-xxxx';

  return '</div>' + // close content-body
    '<div class="closing">ขอแสดงความนับถือ</div>' +
    '<div class="signature-block">' +
    '<table class="signature-table">' +
    '<tr>' +
    '<td>' +
    '<div class="sign-label">(ลงชื่อ)........................................................</div>' +
    '<div class="sign-name">(' + (currentUser ? currentUser.displayName || currentUser.username : '____________________') + ')</div>' +
    '<div class="sign-pos">เจ้าหน้าที่ดําเนินงานโครงการ</div>' +
    '<div class="sign-dept">' + dept + '</div>' +
    '<div class="sign-phone">โทร. ' + phone + '</div>' +
    '</td>' +
    '<td>' +
    '<div class="sign-label">(ลงชื่อ)........................................................</div>' +
    '<div class="sign-name">(____________________________________)</div>' +
    '<div class="sign-pos">ผู้บัญชาการเรือนจําจําลอง CC คาเฟ่</div>' +
    '<div class="sign-dept">' + dept + '</div>' +
    '<div class="sign-phone">โทร. ' + phone + '</div>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</div>' +
    '</div>'; // close formal-page
}

function buildDailyFormalContent(date, rows) {
  let html = '';
  html += buildDisciplinarySection(date, rows);
  html += buildKitchenSection(date, rows);
  html += buildTableSection(date, rows);
  return html;
}

function buildDisciplinarySection(date, rows) {
  const prisonerList = [];
  rows.forEach(r => {
    if (r.prisonerName && !prisonerList.some(p => p.id === r.prisonerId)) {
      prisonerList.push({
        name: r.prisonerName,
        id: r.prisonerId,
        wing: r.wing || '-',
        ref: r.ref || '-'
      });
    }
  });

  let html = '<p><b>๑. ส่วนทัณฑ์ (เบิกตัวผู้ต้องขัง)</b></p>';
  html += '<p>รายชื่อผู้ต้องขังที่ได้รับการเบิกตัวเพื่อเข้าร่วมกิจกรรมการเยี่ยม ณ เรือนจำ CC คาเฟ่ ประจำวันที่ ' + date + ' มีจำนวนทั้งสิ้น ' + prisonerList.length + ' คน ดังนี้</p>';

  if (prisonerList.length === 0) {
    html += '<p>ไม่มีรายการเบิกตัวผู้ต้องขังในวันนี้</p>';
    return html;
  }

  html += '<table>';
  html += '<thead><tr><th>ลำดับ</th><th>ชื่อ-นามสกุล</th><th>เลขประจำตัวผู้ต้องขัง</th><th>แดน</th><th>หมายเลขอ้างอิง</th></tr></thead><tbody>';
  prisonerList.forEach((p, i) => {
    html += '<tr><td class="center">' + (i + 1) + '</td><td>' + p.name + '</td><td>' + p.id + '</td><td>' + p.wing + '</td><td>' + p.ref + '</td></tr>';
  });
  html += '</tbody></table>';
  html += '<p>รวมผู้ต้องขังทั้งสิ้น ' + prisonerList.length + ' คน</p>';
  return html;
}

function buildKitchenSection(date, rows) {
  let totalAdults = 0, total5_8 = 0, totalUnder5 = 0;
  const prisonerList = [];
  rows.forEach(r => {
    const d = computeDeptReportData(r);
    totalAdults += d.adults;
    total5_8 += d.kids5_8;
    totalUnder5 += d.kidsUnder5;
    if (r.prisonerName && !prisonerList.some(p => p.id === r.prisonerId)) {
      prisonerList.push({ name: r.prisonerName, id: r.prisonerId });
    }
  });

  const totalTables = rows.length;
  const totalRelatives = rows.reduce((sum, r) => sum + (parseInt(r.visitorCount) || 1), 0);
  const totalPrisoners = prisonerList.length;
  const grandTotal = totalRelatives + totalPrisoners;
  const combinedAdults = totalAdults + totalPrisoners;

  let html = '<p><b>๒. ครัวและเบเกอรี่ (เตรียมอาหารและของหวาน)</b></p>';
  html += '<p>สรุปจำนวนอาหารและเครื่องดื่มที่ต้องเตรียมสำหรับกิจกรรมการเยี่ยม ประจำวันที่ ' + date + '</p>';

  html += '<table>';
  html += '<thead><tr><th>รายการ</th><th>จำนวน</th><th>หมายเหตุ</th></tr></thead><tbody>';
  html += '<tr><td>จำนวนโต๊ะที่เปิดให้บริการ</td><td class="center">' + totalTables + ' โต๊ะ</td><td></td></tr>';
  html += '<tr><td>จำนวนผู้ต้องขัง (เบิกตัว)</td><td class="center">' + totalPrisoners + ' คน</td><td>นับเป็นผู้ใหญ่ ๑ ที่นั่งต่อคน</td></tr>';
  html += '<tr><td>จำนวนญาติผู้เยี่ยม (ผู้ใหญ่)</td><td class="center">' + totalAdults + ' คน</td><td>อายุ ๙ ปีขึ้นไป</td></tr>';
  html += '<tr><td>จำนวนเด็กอายุ ๕-๘ ปี</td><td class="center">' + total5_8 + ' คน</td><td></td></tr>';
  html += '<tr><td>จำนวนเด็กอายุต่ำกว่า ๕ ปี</td><td class="center">' + totalUnder5 + ' คน</td><td></td></tr>';
  html += '<tr class="total-row"><td>รวมจำนวนผู้เข้าร่วมทั้งหมด</td><td class="center">' + grandTotal + ' คน</td><td>ญาติ ' + totalRelatives + ' คน + ผู้ต้องขัง ' + totalPrisoners + ' คน</td></tr>';
  html += '<tr class="total-row"><td>รวมจำนวนอาหารผู้ใหญ่</td><td class="center">' + combinedAdults + ' ที่</td><td>รวมผู้ต้องขัง</td></tr>';
  html += '</tbody></table>';

  html += '<div style="margin-top:8pt;padding:6pt;border:1px solid #000;">';
  html += '<b>สรุปการเตรียมอาหารและเบเกอรี่</b><br>';
  html += '- อาหารคาว (ผู้ใหญ่): ' + combinedAdults + ' ที่<br>';
  html += '- อาหารว่างและเบเกอรี่: ' + grandTotal + ' ชุด<br>';
  html += '- เครื่องดื่ม: ' + grandTotal + ' แก้ว';
  html += '</div>';

  return html;
}

function buildTableSection(date, rows) {
  const totalTables = rows.length;
  const totalRelatives = rows.reduce((sum, r) => sum + (parseInt(r.visitorCount) || 1), 0);
  const totalPrisoners = rows.filter(r => r.prisonerName).length;
  const grandTotal = totalRelatives + totalPrisoners;

  let html = '<p><b>๓. การจัดโต๊ะ</b></p>';
  html += '<p>รายละเอียดการจัดโต๊ะสำหรับกิจกรรมการเยี่ยม ประจำวันที่ ' + date + ' จำนวน ' + totalTables + ' โต๊ะ รวมผู้เข้าร่วม ' + grandTotal + ' คน</p>';

  html += '<table>';
  html += '<thead><tr><th>ลำดับ</th><th>โต๊ะที่</th><th>ผู้ต้องขัง</th><th>ผู้เยี่ยม</th><th>เบอร์โทรศัพท์</th><th>จำนวน (คน)</th></tr></thead><tbody>';

  rows.forEach((r, i) => {
    const tableNo = i + 1;
    const prisoner = r.prisonerName || '-';
    const mainVisitor = r.visitorName || '-';
    const phone = r.visitorPhone || '-';

    let extras = [];
    try { extras = parseExtraVisitors(r); } catch (e) { extras = []; }
    const extraNames = extras.map(ex => ex.name).filter(Boolean).join(', ');
    const allVisitors = mainVisitor + (extraNames ? ', ' + extraNames : '');
    const totalPeople = (parseInt(r.visitorCount) || 1) + 1;

    html += '<tr><td class="center">' + (i + 1) + '</td><td class="center">' + tableNo + '</td><td>' + prisoner + '</td><td>' + allVisitors + '</td><td>' + phone + '</td><td class="center">' + totalPeople + '</td></tr>';
  });

  html += '</tbody></table>';
  html += '<p><b>รวมทั้งสิ้น ' + totalTables + ' โต๊ะ จำนวน ' + grandTotal + ' คน</b></p>';
  return html;
}
// ===== END FORMAL REPORTS ENGINE =====

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeDetailModal(); closeEditModal(); } });
document.getElementById('passInput').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('userInput').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
