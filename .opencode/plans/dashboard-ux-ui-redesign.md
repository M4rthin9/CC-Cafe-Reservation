# Admin Dashboard UX/UI Redesign Plan

## Overview
This plan details all changes needed to upgrade the admin dashboard UX/UI to make it easier to understand and use. The guide (guide.html) is also updated to match the new design.

## Files to Modify
1. `admin.html` - Main dashboard HTML
2. `src/css/admin.css` - Dashboard styles
3. `src/js/admin.js` - Dashboard logic
4. `src/guide.html` - User guide

---

## Phase 1: Dashboard Home View (admin.html)

### 1.1 Replace Primary KPI Cards with Action Required Section

**Location:** Lines 90-118 in admin.html

**Current Code:**
```html
<!-- ROW 1: PRIMARY KPI CARDS (4 cards) -->
<div class="metrics-row primary">
  <div class="stat-card blue">...</div>
  <div class="stat-card yellow">...</div>
  <div class="stat-card green">...</div>
  <div class="stat-card red">...</div>
</div>
```

**Replace With:**
```html
<!-- ACTION REQUIRED: Quick access to pending tasks -->
<div class="action-required-section">
  <h3>⚡ สิ่งที่ต้องทำ</h3>
  <div class="action-required-grid">
    <div class="action-card" onclick="switchView('reservations');filterByStatus('รอตรวจสอบวินัย')">
      <div class="action-icon">🔍</div>
      <div class="action-count" id="actionPending">0</div>
      <div class="action-label">รอวินัย</div>
      <button class="action-btn" onclick="event.stopPropagation();switchView('reservations');filterByStatus('รอตรวจสอบวินัย')">ดำเนินการ →</button>
    </div>
    <div class="action-card" onclick="switchView('reservations');filterByStatus('รอตรวจสอบผู้เข้าร่วม')">
      <div class="action-icon">👥</div>
      <div class="action-count" id="actionParticipant">0</div>
      <div class="action-label">รอผู้เข้าร่วม</div>
      <button class="action-btn" onclick="event.stopPropagation();switchView('reservations');filterByStatus('รอตรวจสอบผู้เข้าร่วม')">ดำเนินการ →</button>
    </div>
    <div class="action-card" onclick="switchView('reservations');filterByStatus('รอชำระเงิน')">
      <div class="action-icon">💳</div>
      <div class="action-count" id="actionPayment">0</div>
      <div class="action-label">รอชำระ</div>
      <button class="action-btn" onclick="event.stopPropagation();switchView('reservations');filterByStatus('รอชำระเงิน')">ดำเนินการ →</button>
    </div>
  </div>
</div>
```

### 1.2 Replace Secondary Metrics with Quick Stats Row

**Location:** Lines 166-189 in admin.html

**Current Code:**
```html
<!-- ROW 3: SECONDARY METRICS (Contextual) -->
<div class="metrics-row secondary">
  <div class="stat-card">...</div>
  <div class="stat-card">...</div>
  <div class="stat-card">...</div>
  <div class="stat-card">...</div>
</div>
```

**Replace With:**
```html
<!-- QUICK STATS ROW -->
<div class="quick-stats-row">
  <div class="quick-stat">
    <div class="qs-label">📅 วันนี้</div>
    <div class="qs-value" id="statToday">0</div>
  </div>
  <div class="quick-stat">
    <div class="qs-label">📆 สัปดาห์นี้</div>
    <div class="qs-value" id="statThisWeek">0</div>
  </div>
  <div class="quick-stat">
    <div class="qs-label">📊 เดือนนี้</div>
    <div class="qs-value" id="statThisMonth">0</div>
  </div>
  <div class="quick-stat">
    <div class="qs-label">📋 ทั้งหมด</div>
    <div class="qs-value" id="statTotal">0</div>
  </div>
</div>
```

### 1.3 Replace Finance Ribbon with Clean Finance Summary

**Location:** Lines 120-163 in admin.html

**Current Code:**
```html
<!-- ROW 2: FINANCE KPI RIBBON -->
<div class="finance-ribbon">...</div>
```

**Replace With:**
```html
<!-- FINANCE SUMMARY CLEAN -->
<div class="finance-summary-clean">
  <div class="fs-item">
    <span class="fs-icon">💰</span>
    <span class="fs-label">ยอดจอง</span>
    <span class="fs-value" id="financeTotalBooked">฿0</span>
  </div>
  <div class="fs-divider"></div>
  <div class="fs-item">
    <span class="fs-icon paid">✅</span>
    <span class="fs-label">ชำระแล้ว</span>
    <span class="fs-value paid" id="financePaid">฿0</span>
  </div>
  <div class="fs-divider"></div>
  <div class="fs-item">
    <span class="fs-icon unpaid">⚠️</span>
    <span class="fs-label">ค้างชำระ</span>
    <span class="fs-value unpaid" id="financeUnpaid">฿0</span>
  </div>
  <div class="fs-divider"></div>
  <div class="fs-item">
    <span class="fs-icon">📈</span>
    <span class="fs-label">อัตราชำระ</span>
    <span class="fs-value" id="financeRate">0%</span>
  </div>
</div>
```

### 1.4 Remove display:none from Status Filter in Reservations

**Location:** Line 263 in admin.html

**Current Code:**
```html
<select class="filter-select" id="filterStatus" aria-label="กรองตามสถานะ" onchange="resetToFirstPage();renderTable()" style="display:none">
```

**Change To:**
```html
<select class="filter-select" id="filterStatus" aria-label="กรองตามสถานะ" onchange="resetToFirstPage();renderTable()">
```

### 1.5 Simplify Reservations Controls Layout

**Location:** Lines 260-292 in admin.html

**Current Code:**
```html
<div class="controls">
  <input class="search-box" id="searchBox" type="text" placeholder="🔍 ค้นหา ชื่อ / เลขอ้างอิง / ผู้ต้องขัง" aria-label="ค้นหารายการจอง" oninput="resetToFirstPage();renderTable()">
  <select class="filter-select" id="filterStatus" ... style="display:none">...</select>
  <select class="filter-select" id="filterDate" ...>...</select>
  <select class="filter-select" id="filterWing" ...>...</select>
  <button class="refresh-btn" onclick="resetToFirstPage();loadData()" aria-label="โหลดข้อมูลใหม่">🔄 โหลดใหม่</button>
  <button class="btn-approve" onclick="openNewBookingModal()" id="btnNewBooking" style="display:none;background:var(--green);">➕ จองใหม่</button>
  <button class="btn-export" onclick="exportFilteredCSV()" aria-label="ส่งออกข้อมูลเป็น CSV" id="btnExport" style="display:none">📤 Export CSV</button>
  <button class="btn-print" onclick="printReport()" aria-label="พิมพ์รายงาน" id="btnPrint" style="display:none">🖨️ พิมพ์รายงาน</button>
  <button class="btn-export" onclick="exportFilteredCSVWithPhones()" aria-label="ส่งออก CSV พร้อมเบอร์โทร" id="btnExportPhones" style="display:none">📤 Export CSV (มีเบอร์)</button>
  <button class="refresh-btn" onclick="syncPrisonerWings()" id="btnSyncWings" style="display:none;background:#7c3aed;">🔄 Sync Wings</button>
</div>
```

**Replace With:**
```html
<!-- Search Bar -->
<div class="controls">
  <input class="search-box" id="searchBox" type="text" placeholder="🔍 ค้นหา ชื่อ / เลขอ้างอิง / ผู้ต้องขัง" aria-label="ค้นหารายการจอง" oninput="resetToFirstPage();renderTable()">
  <button class="refresh-btn" onclick="resetToFirstPage();loadData()" aria-label="โหลดข้อมูลใหม่">🔄</button>
</div>

<!-- Filters Row (Always visible) -->
<div class="controls" style="margin-top:8px;">
  <select class="filter-select" id="filterStatus" aria-label="กรองตามสถานะ" onchange="resetToFirstPage();renderTable()">
    <option value="">📌 ทุกสถานะ</option>
    <option value="รอตรวจสอบวินัย">🔍 รอวินัย</option>
    <option value="รอตรวจสอบผู้เข้าร่วม">👥 รอผู้เข้าร่วม</option>
    <option value="รอชำระเงิน">💳 รอชำระ</option>
    <option value="ชำระแล้ว">✅ ชำระแล้ว</option>
    <option value="เสร็จสิ้น">✔️ เสร็จสิ้น</option>
    <option value="ไม่อนุมัติ">❌ ไม่อนุมัติ</option>
  </select>
  <select class="filter-select" id="filterDate" aria-label="กรองตามวันที่" onchange="resetToFirstPage();renderTable()">
    <option value="">📅 ทุกวัน</option>
  </select>
  <select class="filter-select" id="filterWing" aria-label="กรองตามแดน" onchange="resetToFirstPage();renderTable()">
    <option value="">🏢 ทุกแดน</option>
  </select>
</div>

<!-- Action Buttons Row -->
<div class="controls" style="margin-top:8px;">
  <button class="btn-approve" onclick="openNewBookingModal()" id="btnNewBooking" style="display:none;">➕ จองใหม่</button>
  <button class="btn-export" onclick="exportFilteredCSV()" aria-label="ส่งออกข้อมูลเป็น CSV" id="btnExport" style="display:none">📤 Export</button>
  <button class="btn-print" onclick="printReport()" aria-label="พิมพ์รายงาน" id="btnPrint" style="display:none">🖨️ พิมพ์</button>
  <button class="btn-export" onclick="exportFilteredCSVWithPhones()" aria-label="ส่งออก CSV พร้อมเบอร์โทร" id="btnExportPhones" style="display:none">📤 มีเบอร์</button>
  <button class="refresh-btn" onclick="syncPrisonerWings()" id="btnSyncWings" style="display:none;background:#7c3aed;">🔄 Sync</button>
</div>
```

---

## Phase 2: CSS Updates (admin.css)

### 2.1 Add New Styles at End of File

**Add the following CSS at the end of `src/css/admin.css`:**

```css
/* ═══════════════════════════════════════════════════════════════
   UX/UI UPGRADE — v3.0
   ═══════════════════════════════════════════════════════════════ */

/* === ACTION REQUIRED SECTION === */
.action-required-section {
  margin-bottom: 20px;
}
.action-required-section h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
}
.action-required-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.action-card {
  background: #fff;
  border: 2px solid var(--blue);
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(30, 58, 138, 0.15);
  border-color: var(--blue-dark);
}
.action-icon {
  font-size: 28px;
  margin-bottom: 8px;
}
.action-count {
  font-size: 36px;
  font-weight: 800;
  color: var(--blue);
  line-height: 1;
  margin-bottom: 4px;
}
.action-label {
  font-size: 13px;
  color: var(--text2);
  margin-bottom: 12px;
}
.action-card .action-btn {
  padding: 8px 20px;
  background: var(--blue);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.action-card .action-btn:hover {
  background: var(--blue-dark);
}

/* === QUICK STATS ROW === */
.quick-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.quick-stat {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  text-align: center;
}
.qs-label {
  font-size: 11px;
  color: var(--text2);
  margin-bottom: 4px;
}
.qs-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
}

/* === FINANCE SUMMARY CLEAN === */
.finance-summary-clean {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  gap: 0;
}
.fs-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.fs-icon {
  font-size: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border-radius: 8px;
  flex-shrink: 0;
}
.fs-icon.paid { background: var(--green-light); }
.fs-icon.unpaid { background: var(--gold-light); }
.fs-label {
  font-size: 11px;
  color: var(--text2);
  white-space: nowrap;
}
.fs-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.fs-value.paid { color: var(--green); }
.fs-value.unpaid { color: var(--gold); }
.fs-divider {
  width: 1px;
  height: 32px;
  background: var(--border);
  flex-shrink: 0;
  margin: 0 12px;
}

/* === RESPONSIVE: Action Required & Stats === */
@media (max-width: 768px) {
  .action-required-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .action-card {
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    padding: 14px 16px;
  }
  .action-icon { margin-bottom: 0; font-size: 24px; }
  .action-count { font-size: 28px; }
  .action-label { margin-bottom: 0; }
  .action-card .action-btn { margin-left: auto; }
  
  .quick-stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .finance-summary-clean {
    flex-wrap: wrap;
    gap: 12px;
  }
  .fs-divider {
    display: none;
  }
  .fs-item {
    min-width: calc(50% - 6px);
  }
}

/* === RESPONSIVE: Small mobile (iPhone SE) === */
@media (max-width: 375px) {
  .action-count {
    font-size: 28px;
  }
  .quick-stat {
    padding: 10px 12px;
  }
  .qs-value {
    font-size: 22px;
  }
}
```

---

## Phase 3: JavaScript Updates (admin.js)

### 3.1 Add filterByStatus Function

**Add at the end of `src/js/admin.js`:**

```javascript
// === UX/UI UPGRADE FUNCTIONS ===

/**
 * Filter reservations by status and switch to reservations view
 * @param {string} status - The status to filter by
 */
function filterByStatus(status) {
  const filterSelect = document.getElementById('filterStatus');
  if (filterSelect) {
    filterSelect.value = status;
    resetToFirstPage();
    renderTable();
  }
}
```

### 3.2 Update renderDashboard Function

**Find the renderDashboard function and update the section that populates KPI values.**

Look for where `statTotal`, `statWait`, `statOk`, `statReject` are set and add/update the following:

```javascript
// In renderDashboard function, after calculating counts:

// Action Required cards
const actionPending = document.getElementById('actionPending');
const actionParticipant = document.getElementById('actionParticipant');
const actionPayment = document.getElementById('actionPayment');
if (actionPending) actionPending.textContent = counts['รอตรวจสอบวินัย'] || 0;
if (actionParticipant) actionParticipant.textContent = counts['รอตรวจสอบผู้เข้าร่วม'] || 0;
if (actionPayment) actionPayment.textContent = counts['รอชำระเงิน'] || 0;

// Quick stats
const statToday = document.getElementById('statToday');
const statThisWeek = document.getElementById('statThisWeek');
const statThisMonth = document.getElementById('statThisMonth');
const statTotal = document.getElementById('statTotal');

// Calculate today's count (bookings with today's date)
const today = new Date();
const todayStr = today.toISOString().slice(0, 10);
let todayCount = 0;
let weekCount = 0;
let monthCount = 0;

bookings.forEach(b => {
  const bDate = b.visitDate || b.date || '';
  if (bDate === todayStr) todayCount++;
  
  // Check if within this week
  const bDateObj = new Date(bDate);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (bDateObj >= weekAgo) weekCount++;
  
  // Check if within this month
  if (bDateObj.getMonth() === today.getMonth() && bDateObj.getFullYear() === today.getFullYear()) {
    monthCount++;
  }
});

if (statToday) statToday.textContent = todayCount;
if (statThisWeek) statThisWeek.textContent = weekCount;
if (statThisMonth) statThisMonth.textContent = monthCount;
if (statTotal) statTotal.textContent = bookings.length;
```

---

## Phase 4: Guide Updates (guide.html)

### 4.1 Add Quick Reference Section

**Location:** After the Quick Start section (after line 792, before System Overview)

**Insert the following HTML:**

```html
<!-- ===== QUICK REFERENCE CARD ===== -->
<div class="section" id="s-quickref">
  <h2><i class="ti ti-bookmark"></i> สรุปด่วน (Quick Reference)</h2>
  <p style="font-size:14px;color:var(--text2);margin-bottom:12px;">สรุปสิ่งที่ต้องทำและปุ่มหลักที่ใช้บ่อย</p>

  <div class="quickref-grid">
    <div class="quickref-card">
      <div class="qr-icon">🔍</div>
      <div class="qr-title">รอวินัย</div>
      <div class="qr-action">คลิก "ดำเนินการ" → อนุมัติ/ปฏิเสธ</div>
      <div class="qr-who">Vinai / Admin</div>
    </div>
    <div class="quickref-card">
      <div class="qr-icon">👥</div>
      <div class="qr-title">รอผู้เข้าร่วม</div>
      <div class="qr-action">คลิก "ดำเนินการ" → อนุมัติ/ปฏิเสธ</div>
      <div class="qr-who">Tadtel / Admin</div>
    </div>
    <div class="quickref-card">
      <div class="qr-icon">💳</div>
      <div class="qr-title">รอชำระ</div>
      <div class="qr-action">ดูสลิป → ยืนยัน/ปฏิเสธ</div>
      <div class="qr-who">Finance / Admin</div>
    </div>
  </div>

  <h3>ปุ่มหลักในหน้ารายการจอง</h3>
  <table class="guide-table">
    <tr><th>ปุ่ม</th><th>ใช้เมื่อ</th><th>สี</th></tr>
    <tr><td>👁️ ดู</td><td>ดูรายละเอียด + สลิป</td><td style="color:#2563eb;">น้ำเงิน</td></tr>
    <tr><td>✏️ แก้ไข</td><td>แก้ไขข้อมูลการจอง</td><td style="color:#64748b;">เทา</td></tr>
    <tr><td>✅ อนุมัติ</td><td>ผ่านการตรวจสอบ</td><td style="color:#16a34a;">เขียว</td></tr>
    <tr><td>❌ ปฏิเสธ</td><td>ไม่ผ่านการตรวจสอบ</td><td style="color:#dc2626;">แดง</td></tr>
    <tr><td>🚫 ยกเลิก</td><td>ยกเลิกการจองทั้งหมด</td><td style="color:#64748b;">เทา</td></tr>
  </table>

  <div class="callout">
    <strong>💡 เคล็ดลับ:</strong> บนหน้า Dashboard จะมีการ์ด "สิ่งที่ต้องทำ" แสดงจำนวนรายการที่รอการดำเนินการ — คลิกเพื่อไปที่รายการเหล่านั้นได้ทันที
  </div>
</div>
```

### 4.2 Add Quick Reference CSS

**Add in the `<style>` section of guide.html (before `</style>`):**

```css
/* === QUICK REFERENCE CARD === */
.quickref-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 16px 0;
}
.quickref-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
  text-align: center;
  transition: transform 0.15s, box-shadow 0.15s;
}
.quickref-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.quickref-card .qr-icon { font-size: 28px; margin-bottom: 8px; }
.quickref-card .qr-title { font-size: 15px; font-weight: 600; color: var(--navy); margin-bottom: 6px; }
.quickref-card .qr-action { font-size: 12px; color: var(--text2); margin-bottom: 4px; }
.quickref-card .qr-who { font-size: 10px; color: var(--text-muted); }

@media (max-width: 600px) {
  .quickref-grid { grid-template-columns: 1fr; }
}
```

### 4.3 Update Table of Contents

**Location:** Lines 880-898 in guide.html

**Update the TOC to include Quick Reference:**

```html
<ol class="toc-list">
  <li><a href="#s-quickstart">🚀 เริ่มต้นใช้งานสำหรับ Admin ใหม่</a></li>
  <li><a href="#s-quickref">📝 สรุปด่วน (Quick Reference)</a></li>
  <li><a href="#s-overview">🏗️ ภาพรวมระบบ (System Overview)</a></li>
  <li><a href="#s-workflow">🔄 ขั้นตอนการทำงานของระบบ (Workflow)</a></li>
  <li><a href="#s1">🔐 หน้าเข้าสู่ระบบ (Login)</a></li>
  <li><a href="#s2">📊 ภาพรวมแดชบอร์ด (Dashboard)</a></li>
  <li><a href="#s3">📋 จัดการการจอง (Reservations)</a></li>
  <li><a href="#s4">➕ สร้างการจองใหม่ (New Booking)</a></li>
  <li><a href="#s5">✏️ แก้ไขการจอง (Edit Booking)</a></li>
  <li><a href="#s6">🔒 จัดการผู้ต้องขัง (Prisoners)</a></li>
  <li><a href="#s7">📈 รายงาน (Reports)</a></li>
  <li><a href="#s8">📑 รายงานทางการ (Formal Reports)</a></li>
  <li><a href="#s9">📝 บันทึกการทำงาน (Event Log)</a></li>
  <li><a href="#s10">👥 จัดการผู้ใช้ (Users)</a></li>
  <li><a href="#s11">🔑 สิทธิ์ในแต่ละบทบาท (Permissions)</a></li>
  <li><a href="#s12">⚙️ จัดการตั้งค่า (Settings)</a></li>
  <li><a href="#s13">💡 เคล็ดลับการใช้งาน</a></li>
  <li><a href="#s14">🔧 การแก้ไขปัญหาเบื้องต้น</a></li>
</ol>
```

### 4.4 Update Settings Section (Section 12)

**Location:** Lines 1978-2023 in guide.html

**Replace the entire Settings section with updated content:**

```html
<!-- ===== SECTION 12 ===== -->
<div class="section" id="s12">
  <h2><i class="ti ti-settings"></i> 12. จัดการตั้งค่า (Settings)</h2>

  <div class="mockup-screen" style="max-width:480px;">
    <div class="mockup-screen-header">
      <div class="dots"><span></span><span></span><span></span></div>
      <span style="opacity:0.6;font-size:11px;">Settings — ตั้งค่าระบบ</span>
    </div>
    <div class="mockup-screen-body">
      <div style="margin-bottom:16px;">
        <div style="font-weight:600;font-size:13px;margin-bottom:8px;">📊 การแสดงผล</div>
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">จำนวนรายการต่อหน้า</label>
        <select class="mockup-select" style="width:120px;">
          <option>5</option><option selected>10</option><option>20</option><option>50</option>
        </select>
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-weight:600;font-size:13px;margin-bottom:8px;">🔔 การแจ้งเตือน</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;">
            <input type="checkbox" checked style="cursor:pointer;"> แสดงการแจ้งเตือนในแถบด้านบน
          </label>
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;">
            <input type="checkbox" style="cursor:pointer;"> แจ้งเตือนทางอีเมล (เมื่อมีการจองใหม่)
          </label>
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;">
            <input type="checkbox" style="cursor:pointer;"> เสียงแจ้งเตือน
          </label>
        </div>
      </div>
      <div>
        <div style="font-weight:600;font-size:13px;margin-bottom:8px;">🎨 การแสดงผล</div>
        <label style="font-size:12px;display:flex;align-items:center;gap:6px;">
          <input type="checkbox" style="cursor:pointer;"> โหมดมืด
        </label>
      </div>
    </div>
  </div>

  <div class="callout">
    <strong>🔒 เฉพาะ:</strong> Superadmin เท่านั้นที่เข้าถึงหน้านี้ได้
  </div>

  <h3>ตัวเลือกที่มี</h3>
  <table class="guide-table">
    <tr><th>ตั้งค่า</th><th>คำอธิบาย</th></tr>
    <tr><td>จำนวนรายการต่อหน้า</td><td>กำหนดจำนวนรายการที่แสดงในตาราง (5/10/20/50)</td></tr>
    <tr><td>แสดงการแจ้งเตือน</td><td>เปิด/ปิด กระดิ่งแจ้งเตือนในแถบด้านบน</td></tr>
    <tr><td>แจ้งเตือนทางอีเมล</td><td>รับอีเมลเมื่อมีการจองใหม่</td></tr>
    <tr><td>เสียงแจ้งเตือน</td><td>เล่นเสียงเมื่อมีการแจ้งเตือนใหม่</td></tr>
    <tr><td>โหมดมืด</td><td>เปลี่ยนธีมเป็นสีเข้มสำหรับการใช้งานในที่มืด</td></tr>
  </table>
</div>
```

### 4.5 Update Dashboard Section (Section 2) Description

**Location:** Lines 1080-1235 in guide.html

**Update the description text to reflect new layout:**

Find this line:
```html
<h2><i class="ti ti-dashboard"></i> 2. ภาพรวมแดชบอร์ด (Dashboard)</h2>
```

And update the description paragraph after it to mention:
- "สิ่งที่ต้องทำ" section with action cards
- Quick stats row
- Finance summary

---

## Implementation Checklist

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Replace Primary KPIs with Action Required section | admin.html | ☐ |
| 2 | Replace Secondary Metrics with Quick Stats | admin.html | ☐ |
| 3 | Replace Finance Ribbon with Clean Summary | admin.html | ☐ |
| 4 | Remove display:none from status filter | admin.html | ☐ |
| 5 | Simplify Reservations controls layout | admin.html | ☐ |
| 6 | Add Action Required CSS | admin.css | ☐ |
| 7 | Add Quick Stats CSS | admin.css | ☐ |
| 8 | Add Finance Summary CSS | admin.css | ☐ |
| 9 | Add responsive styles | admin.css | ☐ |
| 10 | Add filterByStatus function | admin.js | ☐ |
| 11 | Update renderDashboard for new elements | admin.js | ☐ |
| 12 | Add Quick Reference section | guide.html | ☐ |
| 13 | Add Quick Reference CSS | guide.html | ☐ |
| 14 | Update TOC in guide | guide.html | ☐ |
| 15 | Update Settings section | guide.html | ☐ |

---

## Notes

- All element IDs are preserved to maintain compatibility with existing JavaScript
- The `statTotal` ID is reused in Quick Stats (previously in Primary KPIs)
- The `statWait`, `statOk`, `statReject` IDs are removed as they're replaced by Action Required cards
- Mobile responsive styles ensure the new layout works on all devices
- The guide's Quick Reference section provides a fast lookup for common tasks

---

*Plan created: June 26, 2569 (2026)*
