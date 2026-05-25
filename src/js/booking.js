// ===== CONFIG =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwYTAy4xe5z6tv5y0F3mjLqMdvYuothFRWUWz6MAkpq6xbusyOTFHvu7-YA2Z8HMhGDjw/exec';
const QUOTA = 20;

// ===== CALENDAR =====
const HOLIDAYS = {
  '2026-01-01':'วันขึ้นปีใหม่','2026-02-13':'มาฆบูชา','2026-04-06':'จักรี',
  '2026-04-13':'สงกรานต์','2026-04-14':'สงกรานต์','2026-04-15':'สงกรานต์',
  '2026-05-01':'แรงงาน','2026-05-04':'ฉัตรมงคล','2026-05-11':'วิสาขบูชา',
  '2026-06-03':'วันพระราชินี','2026-07-10':'อาสาฬหบูชา','2026-07-28':'วันเฉลิม ร.10',
  '2026-08-12':'วันแม่','2026-10-13':'วันสวรรคต ร.9','2026-10-23':'จุฬาลงกรณ์',
  '2026-12-05':'วันพ่อ','2026-12-10':'รัฐธรรมนูญ','2026-12-31':'วันสิ้นปี','2026-05-25':'เต็ม (20/20)','2026-06-01':'หยุดชดเชย',
  '2026-05-26':'ปิดจอง (18/20)', // เพิ่มตัวอย่างวันปิดจอง
};

let calYear, calMonth, selectedDate = null;
let bookings = { '2026-05-25': 20 };

const today = new Date(2026, 4, 25); // 25 May 2026 — bookings open from 26 May
calYear  = today.getFullYear();
calMonth = today.getMonth();

function changeMonth(d) {
  calMonth += d;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

// แปลง local Date → "YYYY-MM-DD" โดยไม่ผ่าน UTC (แก้ปัญหา timezone offset)
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// parse "YYYY-MM-DD" เป็น local Date (ไม่ใช่ UTC)
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function renderCalendar() {
  const title = new Date(calYear, calMonth, 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
  document.getElementById('calTitle').textContent = title;
  const grid = document.getElementById('dateGrid');
  grid.innerHTML = '';
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) grid.insertAdjacentHTML('beforeend', '<div></div>');
  
  const todayStr = toLocalDateStr(today);

  // ──คำนวณช่วงวันที่อนุญาตให้จอง (7 ถึง 10 วันล่วงหน้า) ──
  const minAllowedDate = new Date(today);
  minAllowedDate.setDate(today.getDate() + 0);
  const minAllowedStr = toLocalDateStr(minAllowedDate);

  const maxAllowedDate = new Date(today);
  maxAllowedDate.setDate(today.getDate() + 14);
  const maxAllowedStr = toLocalDateStr(maxAllowedDate);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear, calMonth, d);
    const dateStr = toLocalDateStr(date);  
    const dow = date.getDay();
    
    const isPast = dateStr < todayStr;
    const isWknd = dow === 0 || dow === 6;
    const isHol  = HOLIDAYS[dateStr];
    const quota  = bookings[dateStr] || 0;
    const isFull = quota >= QUOTA;
    const isSel  = selectedDate === dateStr;
    
    // ── ตรวจสอบเงื่อนไข: ถ้านอกเหนือจากวันที่ 7 ถึง 10 วันล่วงหน้า ให้ถือว่าจองไม่ได้ ──
    const isNotWithinWindow = dateStr < minAllowedStr || dateStr > maxAllowedStr;

    let cls = 'day-btn';
    // วันที่ผ่านมาแล้ว หรือวันไม่อยู่ในเงื่อนไข 7-10 วัน จะแสดงเป็นสีเทาจาง (.past)
    if (isPast || isNotWithinWindow) cls += ' past'; 
    else if (isHol) cls += ' holiday';
    else if (isWknd) cls += ' weekend';
    else if (isFull) cls += ' full-day';
    
    if (isSel) cls += ' selected';
    
    const holLabel = isHol ? `<span class="hol-label">${HOLIDAYS[dateStr]}</span>` : '';
    const quotaLabel = (!isPast && !isNotWithinWindow && !isHol && !isWknd) ? `<span class="quota">${quota}/${QUOTA}</span>` : '';
    
    // กำหนดให้บล็อกการกด ถ้าเกิดเงื่อนไขอย่างใดอย่างหนึ่งรวมถึงการอยู่นอกช่วง 7-10 วันด้วย
    const isBlocked = isPast || isNotWithinWindow || isHol || isWknd || isFull;

    grid.insertAdjacentHTML('beforeend',
      `<div class="${cls}" onclick="selectDate('${dateStr}', ${isBlocked})">${d}${quotaLabel}${holLabel}</div>`
    );
  }
}

function selectDate(dateStr, blocked) {
  if (blocked) return; // คลิกไม่ได้ถ้าโดนบล็อก
  selectedDate = dateStr;
  const d = parseLocalDate(dateStr);  
  document.getElementById('selectedDateDisplay').textContent =
    '✓ เลือก: ' + d.toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  renderCalendar();
}

// ===== EXTRA VISITORS =====
function updateExtraVisitors() {
  const n = parseInt(document.getElementById('visitorCount').value);
  const container = document.getElementById('extraVisitorsContainer');
  const list = document.getElementById('extraVisitorsList');
  list.innerHTML = '';
  if (n <= 1) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  for (let i = 2; i <= n; i++) {
    const div = document.createElement('div');
    div.className = 'form-group full';
    div.style.cssText = 'border-top:1px dashed var(--border);padding-top:12px;margin-top:4px;';
    const relOpts = '<option value="">-- เลือก --</option><option>บิดา / มารดา</option><option>แฟน/ภรรยา</option><option>บุตร / ธิดา</option><option>พี่ / น้อง</option><option>ญาติ</option><option>เพื่อน</option><option>ทนายความ</option><option>อื่น ๆ</option>';
    div.innerHTML =
      '<div style="font-size:12px;font-weight:600;color:var(--blue);margin-bottom:8px;">ผู้เข้าร่วมกิจกรรม ' + i + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">' +
        '<div class="form-group"><label>ชื่อ-นามสกุล <span style=\"color:var(--red)\">*</span></label>' +
        '<input type="text" id="extraVisitorName' + i + '" placeholder="เช่น สมหญิง ใจดี"></div>' +
        '<div class="form-group"><label>เลขบัตรประชาชน <span style=\"color:var(--red)\">*</span></label>' +
        '<input type="text" id="extraVisitorId' + i + '" placeholder="X-XXXX-XXXXX-XX-X" maxlength="17"></div>' +
      '</div>' +
      '<div class="form-group"><label>ความสัมพันธ์ <span style=\"color:var(--red)\">*</span></label>' +
      '<select id="extraVisitorRelation' + i + '">' + relOpts + '</select></div>';
    list.appendChild(div);
  }
}

function getExtraVisitors() {
  const n = parseInt(document.getElementById('visitorCount').value);
  const extras = [];
  for (let i = 2; i <= n; i++) {
    const nameEl = document.getElementById('extraVisitorName' + i);
    const idEl   = document.getElementById('extraVisitorId' + i);
    const relEl  = document.getElementById('extraVisitorRelation' + i);
    if (nameEl) extras.push({ name: nameEl.value.trim(), id: idEl ? idEl.value.trim() : '', relation: relEl ? relEl.value : '' });
  }
  return extras;
}

// ===== VALIDATION =====
function validate() {
  const fields = [
    { id: 'visitorName',  label: 'ชื่อผู้ร่วมกิจกรรม' },
    { id: 'visitorId',    label: 'เลขบัตรประชาชน' },
    { id: 'visitorPhone', label: 'เบอร์โทรศัพท์' },
    { id: 'relation',     label: 'ความสัมพันธ์' },
    { id: 'prisonerName', label: 'ชื่อผู้ต้องขัง' },
    { id: 'prisonerId',   label: 'หมายเลขผู้ต้องขัง' },
    { id: 'wing',         label: 'แดน' },
  ];
  for (const f of fields) {
    const el = document.getElementById(f.id);
    if (!el.value.trim()) { alert(`กรุณากรอก ${f.label}`); el.focus(); return false; }
  }
  // Validate extra visitors (name + id)
  const n = parseInt(document.getElementById('visitorCount').value);
  for (let i = 2; i <= n; i++) {
    const nameEl = document.getElementById('extraVisitorName' + i);
    const idEl   = document.getElementById('extraVisitorId' + i);
    if (nameEl && !nameEl.value.trim()) { alert('กรุณากรอกชื่อผู้เข้าร่วมกิจกรรมคนที่ ' + i); nameEl.focus(); return false; }
    if (idEl && !idEl.value.trim()) { alert('กรุณากรอกเลขบัตรประชาชนผู้เข้าร่วมกิจกรรมคนที่ ' + i); idEl.focus(); return false; }
    const relEl = document.getElementById('extraVisitorRelation' + i);
    if (relEl && !relEl.value) { alert('กรุณาเลือกความสัมพันธ์ผู้ร่วมกิจกรรมคนที่ ' + i); relEl.focus(); return false; }
  }
  if (!selectedDate) { alert('กรุณาเลือกวันที่ต้องการร่วมกิจกรรม'); return false; }
  if ((bookings[selectedDate] || 0) >= QUOTA) { alert('วันที่เลือกเต็มแล้ว กรุณาเลือกวันอื่น'); return false; }
  if (!document.getElementById('consent').checked) { alert('กรุณายืนยันและยินยอมก่อนดำเนินการ'); return false; }
  return true;
}

// ===== GO TO CONFIRM PAGE =====
function goToConfirm() {
  if (!validate()) return;
  const n = parseInt(document.getElementById('visitorCount').value);
  const totalPersons = n + 1;
  const d = parseLocalDate(selectedDate);  // ✅ parse local ไม่ผ่าน UTC
  const thDate = d.toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const extras = getExtraVisitors();
  const visitor1Name = document.getElementById('visitorName').value.trim();
  const visitor1Id   = document.getElementById('visitorId').value.trim();
  let visitorRowsHtml = `<div class="summary-row"><span class="lbl">👤 ผู้ร่วมกิจกรรมคนที่ 1</span><span class="val">${visitor1Name}<br><span style="font-size:12px;color:var(--text2)">${visitor1Id}</span></span></div>`;
  extras.forEach((v, idx) => {
    visitorRowsHtml += `<div class="summary-row"><span class="lbl">👤 ผู้ร่วมกิจกรรมคนที่ ${idx+2}</span><span class="val">${v.name}<br><span style="font-size:12px;color:var(--text2)">${v.id} · ${v.relation}</span></span></div>`;
  });

  document.getElementById('confirmSummary').innerHTML = `
    ${visitorRowsHtml}
    <div class="summary-row"><span class="lbl">📞 โทรศัพท์</span><span class="val">${document.getElementById('visitorPhone').value.trim()}</span></div>
    <div class="summary-row"><span class="lbl">🔗 ความสัมพันธ์</span><span class="val">${document.getElementById('relation').value}</span></div>
    <div class="summary-row"><span class="lbl">🔒 ผู้ต้องขัง</span><span class="val">${document.getElementById('prisonerName').value.trim()} (#${document.getElementById('prisonerId').value.trim()})</span></div>
    <div class="summary-row"><span class="lbl">🏢 แแดน</span><span class="val">${document.getElementById('wing').value}</span></div>
    <div class="summary-row"><span class="lbl">📅 วันที่ร่วมกิจกรรม</span><span class="val">${thDate}</span></div>
    <div class="summary-row"><span class="lbl">👥 จำนวนรวม</span><span class="val">ผู้เข้าร่วมกิจกรรม ${n} คน + ผู้ต้องขัง 1 = <strong>${totalPersons} คน</strong></span></div>
    <div class="summary-row"><span class="lbl">💰 ค่าบริการอาหาร (ประมาณ)</span><span class="val">${(totalPersons * 1000).toLocaleString()} บาท (ชำระหลังอนุมัติ)</span></div>
  `;
  showPage(2);
}

function goBack() { showPage(1); }

// ===== SUBMIT =====
async function submitBooking() {
  const ref = 'VIS-' + Math.floor(10000 + Math.random() * 90000);
  const n = parseInt(document.getElementById('visitorCount').value);
  const totalPersons = n + 1;
  const d = parseLocalDate(selectedDate);  // ✅ parse local ไม่ผ่าน UTC
  const thDate = d.toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const now = new Date().toLocaleString('th-TH');

  const extras = getExtraVisitors();
  const extraNamesStr = extras.map(v => v.name + '|' + v.id + '|' + v.relation).join(';;');

  const prisonerId = document.getElementById('prisonerId').value.trim();

  // ── ตรวจสอบเลขผู้ต้องขังซ้ำในวันเดียวกัน ──
  document.getElementById('overlay').classList.add('show');
  document.getElementById('submitBtn').disabled = true;
  try {
    const checkData = await appsScriptGet({ action: 'getAll', pass: '10900' });
    if (checkData.status === 'ok' && checkData.rows) {
      const activeStatuses = ['รอตรวจสอบ', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น'];
      const duplicate = checkData.rows.find(r =>
        String(r.prisonerId || '').trim() === prisonerId &&
        (r.visitDateISO || '') === selectedDate &&
        activeStatuses.includes(r.status)
      );
      if (duplicate) {
        document.getElementById('overlay').classList.remove('show');
        document.getElementById('submitBtn').disabled = false;
        alert(`⚠️ ไม่สามารถจองได้\n\nมีการจองผู้ต้องขังหมายเลข "${prisonerId}" ในวันนี้อยู่แล้ว\n\nRef: ${duplicate.ref}\nสถานะ: ${duplicate.status}\n\nกรุณาเลือกวันอื่น หรือตรวจสอบสถานะการจองเดิม`);
        return;
      }
    }
  } catch(err) {
    console.warn('Duplicate check skipped:', err);
  }

  const data = {
    ref,
    timestamp: now,
    visitorName: document.getElementById('visitorName').value.trim(),
    extraVisitorNames: extraNamesStr,
    visitorId: document.getElementById('visitorId').value.trim(),
    visitorPhone: document.getElementById('visitorPhone').value.trim(),
    relation: document.getElementById('relation').value,
    prisonerName: document.getElementById('prisonerName').value.trim(),
    prisonerId: document.getElementById('prisonerId').value.trim(),
    wing: document.getElementById('wing').value,
    visitDate: thDate,
    visitDateISO: selectedDate,
    visitorCount: n,
    totalPersons,
    total: totalPersons * 1000,
    status: 'รอตรวจสอบ',
    slipImage: ''
  };

  document.getElementById('overlay').classList.add('show');
  // (already enabled above, keep for demo/no-script-url path)
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const result = JSON.parse(await resp.text());
    if (result.status !== 'ok') throw new Error(result.message || 'ไม่สำเร็จ');
  } catch (err) {
    if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
      console.warn('Demo mode — Apps Script URL not configured');
    } else {
      console.error('Submit error:', err);
      // Don't alert user on network error — ref is already shown
    }
  } finally {
    document.getElementById('overlay').classList.remove('show');
  }

  document.getElementById('refNumber').textContent = ref;
  // ✅ ไม่เพิ่ม bookings[] ที่นี่อีกต่อไป — นับเฉพาะ "ชำระแล้ว" จาก sheet จริง
  renderCalendar();

  document.getElementById('finalSummary').innerHTML = `
    <div>📋 <strong>Ref No.:</strong> ${ref}</div>
    <div>👤 <strong>ผู้ร่วมกิจกรรม:</strong> ${data.visitorName}</div>
    <div>🔒 <strong>ผู้ต้องขัง:</strong> ${data.prisonerName} (#${data.prisonerId})</div>
    <div>🏢 <strong>แดน</strong> ${data.wing}</div>
    <div>📅 <strong>วันที่:</strong> ${thDate}</div>
    <div>👥 <strong>จำนวนรวม:</strong> ${totalPersons} คน</div>
    <div style="color:var(--gold);font-weight:600">⏳ สถานะ: รอตรวจสอบวินัย</div>
  `;

  // Store ref in sessionStorage for status page
  try {
    sessionStorage.setItem('lastRef', ref);
    sessionStorage.setItem('lastPrisonerId', data.prisonerId);
  } catch(e) {}

  showPage(3);
}

function copyRef() {
  const ref = document.getElementById('refNumber').textContent;
  navigator.clipboard.writeText(ref).then(() => {
    const btn = document.getElementById('copyRefBtn');
    btn.innerHTML = '<i class="ti ti-check"></i> คัดลอกแล้ว';
    setTimeout(() => { btn.innerHTML = '<i class="ti ti-copy"></i> คัดลอก Ref'; }, 2000);
  }).catch(() => {});
}

function showPage(n) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page' + n).classList.add('active');
  for (let i = 1; i <= 3; i++) {
    const sc = document.getElementById('sc' + i);
    const sl = document.getElementById('sl' + i);
    sc.className = 'step-circle' + (i < n ? ' done' : i === n ? ' active' : '');
    sc.textContent = i < n ? '✓' : i;
    sl.className = 'step-label' + (i === n ? ' active' : '');
    if (i < 3) document.getElementById('line' + i).className = 'step-line' + (i < n ? ' done' : '');
  }
  window.scrollTo(0, 0);
}

function resetAll() {
  document.querySelectorAll('input[type=text],input[type=tel]').forEach(i => i.value = '');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  document.getElementById('consent').checked = false;
  document.getElementById('extraVisitorsContainer').style.display = 'none';
  document.getElementById('extraVisitorsList').innerHTML = '';
  selectedDate = null;
  document.getElementById('selectedDateDisplay').textContent = '';
  document.getElementById('submitBtn').disabled = false;
  renderCalendar();
  showPage(1);
}

// ===== SAFE FETCH WRAPPER =====
async function appsScriptGet(params) {
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(APPS_SCRIPT_URL + '?' + qs, { redirect: 'follow' });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const text = await resp.text();
  try { return JSON.parse(text); }
  catch { throw new Error('Invalid JSON: ' + text.slice(0, 100)); }
}

// ===== โหลดจำนวนการจองจริงจาก Sheet ก่อน render ปฏิทิน =====
async function loadBookingCounts() {
  // นับเฉพาะสถานะที่ "ครอบครองโต๊ะ" — ไม่นับ ยกเลิก และ ไม่อนุมัติ
  const activeStatuses = ['รอตรวจสอบ', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น'];
  try {
    const data = await appsScriptGet({ action: 'getAll', pass: '10900' });
    if (data.status === 'ok' && data.rows) {
      bookings = {};
      data.rows.forEach(r => {
        if (!r.visitDateISO) return;
        if (!activeStatuses.includes(r.status)) return;

        // ✅ normalize visitDateISO → "YYYY-MM-DD"
        let dateKey = String(r.visitDateISO).trim();

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          const parsed = new Date(dateKey);
          if (!isNaN(parsed)) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, '0');
            const d = String(parsed.getDate()).padStart(2, '0');
            dateKey = `${y}-${m}-${d}`;
          } else {
            return; // parse ไม่ได้ ข้ามไป
          }
        }

        bookings[dateKey] = (bookings[dateKey] || 0) + 1;
      });
    }
  } catch (err) {
    console.warn('loadBookingCounts failed:', err);
  }
  renderCalendar();
}

loadBookingCounts();
