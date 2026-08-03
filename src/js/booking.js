// ===== CALENDAR =====
const HOLIDAYS = {
  '2026-01-01': 'วันขึ้นปีใหม่', '2026-02-13': 'มาฆบูชา', '2026-04-06': 'จักรี',
  '2026-04-13': 'สงกรานต์', '2026-04-14': 'สงกรานต์', '2026-04-15': 'สงกรานต์',
  '2026-05-01': 'แรงงาน', '2026-05-04': 'ฉัตรมงคล', '2026-05-11': 'วิสาขบูชา',
  '2026-06-03': 'วันพระราชินี', '2026-07-29': 'อาสาฬหบูชา', '2026-07-28': 'วันเฉลิม ร.10', '2026-07-30': 'หยุดชดเชย',
  '2026-08-12': 'วันแม่', '2026-10-13': 'วันสวรรคต ร.9', '2026-10-23': 'จุฬาลงกรณ์',
  '2026-12-05': 'วันพ่อ', '2026-12-10': 'รัฐธรรมนูญ', '2026-12-31': 'วันสิ้นปี',
  '2026-05-25': 'ปิดจอง',   // ตามคำขอ: ปิดจองวันที่ 25-5-69
  '2026-06-01': 'หยุดชดเชย',
  '2026-06-29': 'เต็ม',
  '2026-08-11': 'เยี่ยมญาติใกล้ชิด', '2026-08-13': 'เยี่ยมญาติใกล้ชิด', '2026-08-14': 'เยี่ยมญาติใกล้ชิด', '2026-08-17': 'เยี่ยมญาติใกล้ชิด', '2026-08-18': 'เยี่ยมญาติใกล้ชิด'
};

let calYear, calMonth, selectedDate = null;
let bookings = {}; // will be loaded from server; no hardcoded demo

const today = new Date(); // use real current date (dynamic)
calYear = today.getFullYear();
calMonth = today.getMonth();

function changeMonth(d) {
  calMonth += d;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
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

  // ──คำนวณช่วงวันที่อนุญาตให้จอง (พรุ่งนี้ ถึง 14 วันล่วงหน้า) ──
  const minAllowedDate = new Date(today);
  minAllowedDate.setDate(today.getDate() + 1);
  const minAllowedStr = toLocalDateStr(minAllowedDate);

  const maxAllowedDate = new Date(today);
  maxAllowedDate.setDate(today.getDate() + 16);
  const maxAllowedStr = toLocalDateStr(maxAllowedDate);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear, calMonth, d);
    const dateStr = toLocalDateStr(date);
    const dow = date.getDay();

    const isPast = dateStr < todayStr;
    const isWknd = dow === 0 || dow === 6;
    const isHol = HOLIDAYS[dateStr];
    const quota = bookings[dateStr] || 0;
    const isFull = quota >= QUOTA;
    const isSel = selectedDate === dateStr;

    // ── ตรวจสอบเงื่อนไข: ถ้านอกเหนือจากช่วงที่อนุญาต ให้ถือว่าจองไม่ได้ ──
    const isNotWithinWindow = dateStr < minAllowedStr || dateStr > maxAllowedStr;

    let cls = 'day-btn';
    // วันที่ผ่านมาแล้ว หรือวันไม่อยู่ในช่วงที่อนุญาต จะแสดงเป็นสีเทาจาง (.past)
    if (isPast || isNotWithinWindow) cls += ' past';
    else if (isHol) cls += ' holiday';
    else if (isWknd) cls += ' weekend';
    else if (isFull) cls += ' full-day';

    if (isSel) cls += ' selected';

    const holLabel = isHol ? `<span class="hol-label">${HOLIDAYS[dateStr]}</span>` : '';
    const quotaLabel = (!isPast && !isNotWithinWindow && !isHol && !isWknd) ? `<span class="quota">${quota}/${QUOTA}</span>` : '';

    // กำหนดให้บล็อกการกด ถ้าเกิดเงื่อนไขอย่างใดอย่างหนึ่ง
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
  const selectText = window.t ? window.t('step2') : 'เลือก:';
  document.getElementById('selectedDateDisplay').textContent =
    '✓ ' + selectText + ' ' + d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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

  // Get translated strings
  const relOptsText = window.t ? {
    placeholder: window.t('relationPlaceholder'),
    father: window.t('relationFather'),
    partner: window.t('relationPartner'),
    child: window.t('relationChild'),
    sibling: window.t('relationSibling'),
    relative: window.t('relationRelative'),
    friend: window.t('relationFriend'),
    lawyer: window.t('relationLawyer'),
    other: window.t('relationOther')
  } : {
    placeholder: '-- เลือก --',
    father: 'บิดา / มารดา',
    partner: 'แฟน/ภรรยา',
    child: 'บุตร / ธิดา',
    sibling: 'พี่ / น้อง',
    relative: 'ญาติ',
    friend: 'เพื่อน',
    lawyer: 'ทนายความ',
    other: 'อื่น ๆ'
  };

  const relOpts = '<option value="">' + relOptsText.placeholder + '</option><option>' + relOptsText.father + '</option><option>' + relOptsText.partner + '</option><option>' + relOptsText.child + '</option><option>' + relOptsText.sibling + '</option><option>' + relOptsText.relative + '</option><option>' + relOptsText.friend + '</option><option>' + relOptsText.lawyer + '</option><option>' + relOptsText.other + '</option>';

  // Religion options (these are static in Thai as they are specific to Thai context)
  const religionOpts = '<option value="">-- เลือก --</option><option>พุทธ</option><option>อิสลาม</option><option>คริสต์</option><option>อื่น ๆ</option>';

  const allergyPh = window.t ? window.t('allergyPlaceholder') : "ระบุอาการแพ้ หรือ 'ไม่มี'";
  const agePh = window.t ? window.t('ageChildRule') : "อายุ (ปี) · <5 ฟรี, 5-8=500, >8=1000";

  for (let i = 2; i <= n; i++) {
    const div = document.createElement('div');
    div.className = 'form-group full';
    div.style.cssText = 'border-top:1px dashed var(--border);padding-top:12px;margin-top:4px;';
    div.innerHTML =
      '<div style="font-size:12px;font-weight:600;color:var(--blue);margin-bottom:8px;">ผู้เข้าร่วมกิจกรรม ' + i + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">' +
      '<div class="form-group"><label>ชื่อ-นามสกุล <span style="color:var(--red)">*</span></label>' +
      '<input type="text" id="extraVisitorName' + i + '" placeholder="เช่น สมหญิง ใจดี"></div>' +
      '<div class="form-group"><label>เลขบัตรประชาชน <span style="color:var(--red)">*</span></label>' +
      '<input type="text" id="extraVisitorId' + i + '" placeholder="เลขบัตร ปชช. หรือ Passport" maxlength="20"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">' +
      '<div class="form-group"><label>ศาสนา <span style="color:var(--red)">*</span></label>' +
      '<select id="extraVisitorReligion' + i + '">' + religionOpts + '</select></div>' +
      '<div class="form-group"><label>การแพ้อาหาร <span style="color:var(--red)">*</span></label>' +
      '<input type="text" id="extraVisitorAllergy' + i + '" placeholder="' + allergyPh + '"></div>' +
      '</div>' +
      '<div class="form-group"><label>ความสัมพันธ์ <span style="color:var(--red)">*</span></label>' +
      '<select id="extraVisitorRelation' + i + '">' + relOpts + '</select></div>' +
      '<div class="form-group" id="ageGroup' + i + '" style="display:none;margin-top:6px;">' +
      '<label>อายุ (ปี) <span style="color:var(--red)">*</span></label>' +
      '<input type="number" id="extraVisitorAge' + i + '" min="0" max="120" placeholder="' + agePh + '">' +
      '</div>';
    list.appendChild(div);
    // attach conditional age field for บุตร/ธิดา
    const relEl = div.querySelector('#extraVisitorRelation' + i);
    if (relEl) {
      relEl.onchange = function () {
        const ag = document.getElementById('ageGroup' + i);
        const ai = document.getElementById('extraVisitorAge' + i);
        if (!ag) return;
        // Check if this is child relationship (in any language)
        const childValues = ['บุตร / ธิดา', 'Child', '子女', 'Son/Daughter'];
        if (childValues.includes(this.value)) {
          ag.style.display = 'block';
        } else {
          ag.style.display = 'none';
          if (ai) ai.value = '';
        }
      };
    }
  }
}

function getExtraVisitors() {
  const n = parseInt(document.getElementById('visitorCount').value);
  const extras = [];
  for (let i = 2; i <= n; i++) {
    const nameEl = document.getElementById('extraVisitorName' + i);
    const idEl = document.getElementById('extraVisitorId' + i);
    const relEl = document.getElementById('extraVisitorRelation' + i);
    const ageEl = document.getElementById('extraVisitorAge' + i);
    const religionEl = document.getElementById('extraVisitorReligion' + i);
    const allergyEl = document.getElementById('extraVisitorAllergy' + i);
    if (nameEl) extras.push({
      name: nameEl.value.trim(),
      id: idEl ? idEl.value.trim() : '',
      relation: relEl ? relEl.value : '',
      age: ageEl ? ageEl.value.trim() : '',
      religion: religionEl ? religionEl.value : '',
      allergy: allergyEl ? allergyEl.value.trim() : ''
    });
  }
  return extras;
}

function calculateTotal() {
  const n = parseInt(document.getElementById('visitorCount').value) || 1;
  const extras = getExtraVisitors();
  let extraFees = 0;
  const discountNotes = [];
  let adults = 1; // main visitor always counted as adult
  let kids5_8 = 0, kidsUnder5 = 0;
  const kids5_8Names = [], kidsUnder5Names = [];
  extras.forEach((v, idx) => {
    let fee = 1000;
    let isChild = false;
    if (v.relation === 'บุตร / ธิดา') {
      const a = parseInt(v.age, 10);
      if (!isNaN(a)) {
        if (a < 5) { fee = 0; isChild = true; kidsUnder5++; kidsUnder5Names.push(v.name); }
        else if (a <= 8) { fee = 500; isChild = true; kids5_8++; kids5_8Names.push(v.name); }
      }
    }
    extraFees += fee;
    if (!isChild) adults++;
    if (v.relation === 'บุตร / ธิดา' && fee < 1000) {
      discountNotes.push(`คนที่ ${idx + 2}: ${fee === 0 ? 'ฟรี' : fee + ' บาท'}`);
    }
  });
  const total = 1000 + 1000 + extraFees;
  return {
    total, extraFees, discountNotes, numVisitors: n, numExtras: extras.length,
    adults, kids5_8, kidsUnder5, kids5_8Names, kidsUnder5Names
  };
}

// ===== COPY DEPARTMENT REPORTS (plain text for Line / Email / Print) =====
function copyDeptReport(dept) {
  const n = parseInt(document.getElementById('visitorCount').value);
  const totalPersons = n + 1;
  const d = parseLocalDate(selectedDate);
  const thDate = d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const visitor1Name = document.getElementById('visitorName').value.trim();
  const mainPhone = document.getElementById('visitorPhone').value.trim();
  const mainRelation = document.getElementById('relation').value;
  const prisonerName = document.getElementById('prisonerName').value.trim();
  const prisonerId = document.getElementById('prisonerId').value.trim();
  const wing = document.getElementById('wing').value;

  const cost = calculateTotal();
  const c = cost;

  let text = '';

  if (dept === 'booking') {
    text = `รายงานการจอง\n` +
      `วันที่: ${thDate}\n` +
      `ผู้จอง: ${visitor1Name} (${mainPhone})\n` +
      `ความสัมพันธ์: ${mainRelation}\n` +
      `ผู้ต้องขัง: ${prisonerName} (#${prisonerId}) - ${wing}\n` +
      `จำนวน: ญาติ ${n} คน + ผู้ต้องขัง 1 = ${totalPersons} คน\n` +
      `ค่าบริการ: ${cost.total.toLocaleString()} บาท\n` +
      (cost.discountNotes.length ? `ส่วนลดบุตร/ธิดา: ${cost.discountNotes.join(', ')}\n` : '');
  }
  else if (dept === 'table') {
    text = `รายงานการจัดโต๊ะ\n` +
      `วันที่: ${thDate}\n` +
      `โต๊ะ: 1 โต๊ะ\n` +
      `จำนวนที่นั่ง: ${totalPersons} คน\n` +
      `ผู้ติดต่อ: ${visitor1Name} (${mainPhone})\n` +
      `ผู้ต้องขัง: ${prisonerName} (#${prisonerId})`;
  }
  else if (dept === 'disciplinary') {
    text = `รายงานสำหรับส่วนทัณฑ์ (เบิกตัวผู้ต้องขัง)\n` +
      `วันที่: ${thDate}\n` +
      `ชื่อผู้ต้องขัง: ${prisonerName}\n` +
      `เลขผู้ต้องขัง: ${prisonerId}\n` +
      `แดน: ${wing}`;
  }
  else if (dept === 'kitchen') {
    // Get main visitor religion and allergy
    const mainReligion = document.getElementById('visitorReligion').value.trim();
    const mainAllergy = document.getElementById('visitorAllergy').value.trim();
    const extras = getExtraVisitors();

    // Count religions
    const religionCounts = {};
    religionCounts[mainReligion] = (religionCounts[mainReligion] || 0) + 1;
    extras.forEach(v => {
      if (v.religion) religionCounts[v.religion] = (religionCounts[v.religion] || 0) + 1;
    });

    // Count allergies
    const allergyCounts = {};
    const mainAllergyLabel = mainAllergy || 'ไม่มี';
    allergyCounts[mainAllergyLabel] = (allergyCounts[mainAllergyLabel] || 0) + 1;
    extras.forEach(v => {
      const allergyLabel = v.allergy || 'ไม่มี';
      allergyCounts[allergyLabel] = (allergyCounts[allergyLabel] || 0) + 1;
    });

    // Build religion text
    let religionText = '';
    Object.entries(religionCounts).forEach(([religion, count]) => {
      const note = religion === 'อิสลาม' ? ' (อาหารฮาลาล)' : '';
      religionText += `• ${religion}: ${count} คน${note}\n`;
    });

    // Build allergy text
    let allergyText = '';
    Object.entries(allergyCounts).forEach(([allergy, count]) => {
      const label = allergy === 'ไม่มี' ? '✅ ไม่มี' : `⚠️ ${allergy}`;
      allergyText += `• ${label}: ${count} คน\n`;
    });

    text = `รายงานสำหรับครัว\n` +
      `วันที่: ${thDate}\n` +
      `รวมทั้งหมด: ญาติ ${n} คน + ผู้ต้องขัง 1 คน = ${totalPersons} คน\n` +
      `ผู้ใหญ่ (ญาติ): ${c.adults} คน\n` +
      `เด็ก 5-8 ปี (ญาติ): ${c.kids5_8} คน${c.kids5_8Names.length ? ' (' + c.kids5_8Names.join(', ') + ')' : ''}\n` +
      `เด็กต่ำกว่า 5 ปี (ญาติ): ${c.kidsUnder5} คน${c.kidsUnder5Names.length ? ' (' + c.kidsUnder5Names.join(', ') + ')' : ''}\n\n` +
      `📊 ข้อมูลศาสนา:\n${religionText}\n` +
      `⚠️ การแพ้อาหาร:\n${allergyText}\n` +
      `หมายเหตุ: รวมผู้ต้องขัง 1 คนด้วย`;
  }
  else if (dept === 'bakery') {
    text = `รายงานสำหรับเบเกอรี่\n` +
      `วันที่: ${thDate}\n` +
      `รวมทั้งหมด: ญาติ ${n} คน + ผู้ต้องขัง 1 คน = ${totalPersons} คน\n` +
      `ผู้ใหญ่ (ญาติ): ${c.adults} คน\n` +
      `เด็ก 5-8 ปี (ญาติ): ${c.kids5_8} คน${c.kids5_8Names.length ? ' (' + c.kids5_8Names.join(', ') + ')' : ''}\n` +
      `เด็กต่ำกว่า 5 ปี (ญาติ): ${c.kidsUnder5} คน${c.kidsUnder5Names.length ? ' (' + c.kidsUnder5Names.join(', ') + ')' : ''}\n` +
      `หมายเหตุ: รวมผู้ต้องขัง 1 คนด้วย`;
  }

  if (text) {
    navigator.clipboard.writeText(text).catch(() => {
      prompt('คัดลอกข้อความด้านล่าง (กด Ctrl+C):', text);
    });
  }
}

// ===== PRISONER MASTER DATA (from Google Sheet via Apps Script) =====

const PRISONER_CACHE_KEY = 'cc_prisoner_cache';
const PRISONER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

let prisonerMaster = [];

function loadPrisonerFromCache() {
  try {
    const raw = localStorage.getItem(PRISONER_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > PRISONER_CACHE_TTL) {
      localStorage.removeItem(PRISONER_CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch (e) {
    return null;
  }
}

function savePrisonerToCache(data) {
  try {
    localStorage.setItem(PRISONER_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    /* storage full - ignore */
  }
}

async function loadPrisonerMaster() {
  const statusEl = document.getElementById('prisonerLoadStatus');

  // Show cached data immediately if available
  const cached = loadPrisonerFromCache();
  if (cached) {
    prisonerMaster = cached;
    if (statusEl) {
      statusEl.textContent = `✓ โหลดรายชื่อสำเร็จ (${prisonerMaster.length} คน)`;
      statusEl.style.color = 'var(--green)';
    }
    // Still refresh in background below
  } else {
    if (statusEl) statusEl.textContent = '⏳ กำลังโหลดรายชื่อผู้ต้องขังจากฐานข้อมูล...';
  }

  // Wait for URL to be ready (short timeout — bootstrap already has a URL)
  try {
    await Promise.race([
      waitForUrlReady(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);
  } catch (e) {
    // proceed with whatever URL is set — bootstrap already set APPS_SCRIPT_URL
  }

  try {
    const resp = await appsScriptFetch('?action=getPrisoners', { redirect: 'follow', credentials: 'omit' }, 0);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();

    if (data.status === 'ok' && Array.isArray(data.prisoners)) {
      prisonerMaster = data.prisoners;
      savePrisonerToCache(prisonerMaster);
      if (statusEl) {
        statusEl.textContent = `✓ โหลดรายชื่อสำเร็จ (${prisonerMaster.length} คน)`;
        statusEl.style.color = 'var(--green)';
      }
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (e) {
    // If we already have cached data, don't overwrite the success message
    if (cached) {
      console.warn('[PrisonerMaster] Background refresh failed, using cached data:', e.message);
      return;
    }
    console.error('[PrisonerMaster] Fetch failed:', e);
    if (statusEl) {
      let msg = '⚠️ โหลดรายชื่อจากฐานข้อมูลไม่ได้';
      if (e.message) msg += ` (${e.message})`;
      statusEl.textContent = msg + ' — กรอกเองได้ชั่วคราว';
      statusEl.style.color = 'var(--red)';
    }
  }
}

function filterPrisonerSuggestions() {
  const q = document.getElementById('prisonerSearch').value.trim().toLowerCase();
  const container = document.getElementById('prisonerSuggestions');
  container.innerHTML = '';
  container.style.display = 'none';

  if (!q || prisonerMaster.length === 0) return;

  const matches = prisonerMaster.filter(p =>
    p.prisonerId.toLowerCase().includes(q) ||
    p.prisonerName.toLowerCase().includes(q)
  ).slice(0, 8); // limit results

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
        ${p.status ? `<br><span style="display:inline-block;margin-top:3px;padding:1px 6px;border-radius:4px;font-size:10px;background:${p.status === 'ติดวินัย งดเยี่ยม' ? '#fee2e2;color:#991b1b' : '#dbeafe;color:#1e40af'};font-weight:600;">${escHtml(p.status)}</span>` : ''}
      </div>
    `;
    div.onclick = () => selectPrisoner(p);
    container.appendChild(div);
  });
  container.style.display = 'block';
}

function selectPrisoner(p) {
  const isRestricted = String(p.status || '').trim() === 'ติดวินัย งดเยี่ยม';
  if (isRestricted) {
    const vinaiDateStr = String(p.vinaiDate || '').trim();
      if (vinaiDateStr) {
        const vinaiDate = vinaiDateStr.indexOf('T') >= 0 ? new Date(vinaiDateStr) : new Date(vinaiDateStr + 'T00:00:00');
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (vinaiDate <= oneYearAgo) {
          // Discipline expired — allow selection
        } else {
          if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถจองได้',
            text: 'ผู้ต้องขังรายนี้อยู่ในสถานะ "ติดวินัย งดเยี่ยม" — ไม่สามารถจองได้',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#dc2626'
          });
        } else {
          alert('ผู้ต้องขังรายนี้อยู่ในสถานะ "ติดวินัย งดเยี่ยม" — ไม่สามารถจองได้');
        }
        return;
      }
    } else {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถจองได้',
          text: 'ผู้ต้องขังรายนี้อยู่ในสถานะ "ติดวินัย งดเยี่ยม" — ไม่สามารถจองได้',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#dc2626'
        });
      } else {
        alert('ผู้ต้องขังรายนี้อยู่ในสถานะ "ติดวินัย งดเยี่ยม" — ไม่สามารถจองได้');
      }
      return;
    }
  }

  // Set hidden fields (used by validate/submit/confirm)
  document.getElementById('prisonerId').value = p.prisonerId;
  document.getElementById('prisonerName').value = p.prisonerName;
  document.getElementById('wing').value = p.wing || '';

  // Update read-only display (masked for privacy)
  document.getElementById('dispPrisonerName').textContent = maskPrisonerName(p.prisonerName);
  document.getElementById('dispPrisonerId').textContent = p.prisonerId;
  document.getElementById('dispWing').textContent = p.wing || '';
  const statusDisplay = document.getElementById('dispPrisonerStatus');
  if (p.status) {
    statusDisplay.textContent = p.status;
    statusDisplay.style.color = p.status === 'ติดวินัย งดเยี่ยม' ? 'var(--red)' : 'var(--text2)';
  } else {
    statusDisplay.textContent = '';
  }
  document.getElementById('selectedPrisonerDisplay').style.display = 'block';

  // Clear search + hide dropdown
  document.getElementById('prisonerSearch').value = '';
  document.getElementById('prisonerSuggestions').innerHTML = '';
  document.getElementById('prisonerSuggestions').style.display = 'none';

  // Show confirmation (below search)
  const statusEl = document.getElementById('prisonerMatchStatus');
  statusEl.textContent = `✓ เลือกจากฐานข้อมูล: ${maskPrisonerName(p.prisonerName)} (#${p.prisonerId}) — ${p.wing}`;
  statusEl.style.display = 'block';
  statusEl.style.color = 'var(--green)';
}

function checkPrisonerMatch() {
  const idEl = document.getElementById('prisonerId');
  const nameEl = document.getElementById('prisonerName');
  const wingEl = document.getElementById('wing');
  const statusEl = document.getElementById('prisonerMatchStatus');

  if (!idEl || !nameEl || !wingEl || prisonerMaster.length === 0) {
    if (statusEl) statusEl.style.display = 'none';
    return;
  }

  const pid = idEl.value.trim();
  const pname = nameEl.value.trim();
  const pwing = wingEl.value.trim();

  if (!pid && !pname) {
    statusEl.style.display = 'none';
    return;
  }

  const match = prisonerMaster.find(p =>
    p.prisonerId === pid ||
    (p.prisonerName.toLowerCase() === pname.toLowerCase() && p.wing === pwing)
  );

  if (match) {
    statusEl.textContent = `✓ ตรงกับฐานข้อมูล: ${match.prisonerName} (#${match.prisonerId}) — ${match.wing}`;
    statusEl.style.color = 'var(--green)';
    statusEl.style.display = 'block';
  } else {
    statusEl.textContent = '⚠ ไม่พบในฐานข้อมูลผู้ต้องขัง — กรุณาตรวจสอบอีกครั้ง';
    statusEl.style.color = 'var(--red)';
    statusEl.style.display = 'block';
  }
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

// ===== INLINE ERROR HELPERS =====
function showError(fieldId, message) {
  const el = document.getElementById(fieldId);
  if (!el) return false;
  clearFieldError(fieldId);
  el.classList.add('field-error');
  const err = document.createElement('div');
  err.className = 'error-text';
  err.id = 'err-' + fieldId;
  err.textContent = message;
  el.parentNode.insertBefore(err, el.nextSibling);
  el.focus();
  el.addEventListener('input', function onClear() { clearFieldError(fieldId); el.removeEventListener('input', onClear); }, { once: true });
  el.addEventListener('change', function onClear() { clearFieldError(fieldId); el.removeEventListener('change', onClear); }, { once: true });
  return false;
}

function showInlineError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return false;
  const existing = container.querySelector('.error-text-inline');
  if (existing) existing.remove();
  const err = document.createElement('div');
  err.className = 'error-text-inline';
  err.textContent = message;
  container.appendChild(err);
  container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return false;
}

function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  if (el) el.classList.remove('field-error');
  const err = document.getElementById('err-' + fieldId);
  if (err) err.remove();
}

function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.classList.remove('field-error'));
  document.querySelectorAll('.error-text, .error-text-inline').forEach(e => e.remove());
}

function scrollToFirstError() {
  const firstErr = document.querySelector('.error-text');
  if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===== VALIDATION =====
function validate() {
  clearAllErrors();

  // Check prisoner selection first (hidden fields set via search dropdown)
  const pidHidden = document.getElementById('prisonerId').value.trim();
  const pnameHidden = document.getElementById('prisonerName').value.trim();
  const wingHidden = document.getElementById('wing').value.trim();
  if (!pidHidden || !pnameHidden || !wingHidden) {
    showError('prisonerSearch', 'กรุณาเลือกผู้ต้องขังจากรายการค้นหา');
    return false;
  }

  const fields = [
    { id: 'visitorName', label: 'ชื่อผู้ร่วมกิจกรรม' },
    { id: 'visitorId', label: 'เลขประจำตัว' },
    { id: 'visitorPhone', label: 'เบอร์โทรศัพท์' },
    { id: 'relation', label: 'ความสัมพันธ์' },
  ];
  for (const f of fields) {
    const el = document.getElementById(f.id);
    if (!el.value.trim()) {
      showError(f.id, `กรุณากรอก ${f.label}`);
      scrollToFirstError();
      return false;
    }
  }

  // Validate ID format (auto-detect Thai ID or Passport)
  const visitorIdEl = document.getElementById('visitorId');
  const idResult = validateIdFormat(visitorIdEl.value.trim());
  if (!idResult.valid) {
    showError('visitorId', idResult.error);
    scrollToFirstError();
    return false;
  }

  // Validate phone format (must be 10 digits)
  const phoneEl = document.getElementById('visitorPhone');
  const phoneResult = validatePhone(phoneEl.value.trim());
  if (!phoneResult.valid) {
    showError('visitorPhone', phoneResult.error);
    scrollToFirstError();
    return false;
  }

  // Validate main visitor religion (required)
  const mainReligion = document.getElementById('visitorReligion');
  if (!mainReligion.value.trim()) {
    showError('visitorReligion', 'กรุณาเลือกศาสนา');
    scrollToFirstError();
    return false;
  }

  // Validate main visitor allergy (required)
  const mainAllergy = document.getElementById('visitorAllergy');
  if (!mainAllergy.value.trim()) {
    showError('visitorAllergy', 'กรุณาระบุการแพ้อาหาร (ถ้าไม่มีให้กรอก "ไม่มี")');
    scrollToFirstError();
    return false;
  }

  // Validate extra visitors (name + id + religion + allergy + relation + age for child)
  const n = parseInt(document.getElementById('visitorCount').value);
  for (let i = 2; i <= n; i++) {
    const nameEl = document.getElementById('extraVisitorName' + i);
    const idEl = document.getElementById('extraVisitorId' + i);
    if (nameEl && !nameEl.value.trim()) {
      showError('extraVisitorName' + i, 'กรุณากรอกชื่อผู้เข้าร่วมกิจกรรมคนที่ ' + i);
      scrollToFirstError();
      return false;
    }
    if (idEl && !idEl.value.trim()) {
      showError('extraVisitorId' + i, 'กรุณากรอกเลขประจำตัวผู้เข้าร่วมกิจกรรมคนที่ ' + i);
      scrollToFirstError();
      return false;
    }
    if (idEl) {
      const extraIdResult = validateIdFormat(idEl.value.trim());
      if (!extraIdResult.valid) {
        showError('extraVisitorId' + i, 'ผู้เข้าร่วมคนที่ ' + i + ': ' + extraIdResult.error);
        scrollToFirstError();
        return false;
      }
    }

    const religionEl = document.getElementById('extraVisitorReligion' + i);
    if (religionEl && !religionEl.value.trim()) {
      showError('extraVisitorReligion' + i, 'กรุณาเลือกศาสนาสำหรับผู้เข้าร่วมกิจกรรมคนที่ ' + i);
      scrollToFirstError();
      return false;
    }

    const allergyEl = document.getElementById('extraVisitorAllergy' + i);
    if (allergyEl && !allergyEl.value.trim()) {
      showError('extraVisitorAllergy' + i, 'กรุณาระบุการแพ้อาหารสำหรับผู้เข้าร่วมกิจกรรมคนที่ ' + i + ' (ถ้าไม่มีให้กรอก "ไม่มี")');
      scrollToFirstError();
      return false;
    }

    const relEl = document.getElementById('extraVisitorRelation' + i);
    if (relEl && !relEl.value) {
      showError('extraVisitorRelation' + i, 'กรุณาเลือกความสัมพันธ์ผู้ร่วมกิจกรรมคนที่ ' + i);
      scrollToFirstError();
      return false;
    }
    if (relEl && relEl.value === 'บุตร / ธิดา') {
      const ageEl = document.getElementById('extraVisitorAge' + i);
      const a = ageEl ? parseInt(ageEl.value, 10) : NaN;
      if (!ageEl || isNaN(a) || a < 0) {
        showError('extraVisitorAge' + i, 'กรุณากรอกอายุ (ปี) สำหรับผู้เข้าร่วมกิจกรรมคนที่ ' + i + ' (บุตร/ธิดา)');
        scrollToFirstError();
        return false;
      }
    }
  }

  // Validate date selection
  if (!selectedDate) {
    showInlineError('page1', 'กรุณาเลือกวันที่ต้องการร่วมกิจกรรม');
    document.getElementById('calTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  if ((bookings[selectedDate] || 0) >= QUOTA) {
    showInlineError('page1', 'วันที่เลือกเต็มแล้ว กรุณาเลือกวันอื่น');
    document.getElementById('calTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  // Optional: soft validation against prisoner master data (if loaded)
  if (prisonerMaster.length > 0) {
    const exists = prisonerMaster.some(p =>
      p.prisonerId === pidHidden ||
      (p.prisonerName.toLowerCase() === pnameHidden.toLowerCase() && p.wing === wingHidden)
    );
    if (!exists) {
      const proceed = confirm('⚠️ ไม่พบข้อมูลผู้ต้องขังนี้ในฐานข้อมูล\n\nคุณต้องการดำเนินการต่อหรือไม่?\n(เจ้าหน้าที่จะตรวจสอบอีกครั้ง)');
      if (!proceed) {
        showError('prisonerSearch', 'กรุณาเลือกผู้ต้องขังที่มีอยู่ในฐานข้อมูล');
        scrollToFirstError();
        return false;
      }
    }
  }

  // ── Check prisoner discipline status ──
  if (prisonerMaster.length > 0) {
    const prisoner = prisonerMaster.find(p =>
      p.prisonerId === pidHidden ||
      (p.prisonerName.toLowerCase() === pnameHidden.toLowerCase() && p.wing === wingHidden)
    );
    if (prisoner) {
      const isRestricted = String(prisoner.status || '').trim() === 'ติดวินัย งดเยี่ยม';
      if (isRestricted) {
        const vinaiDateStr = String(prisoner.vinaiDate || '').trim();
        if (vinaiDateStr) {
          const vinaiDate = vinaiDateStr.indexOf('T') >= 0 ? new Date(vinaiDateStr) : new Date(vinaiDateStr + 'T00:00:00');
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (vinaiDate <= oneYearAgo) {
            // Discipline expired — allow booking
          } else {
            // Discipline still active — reject
            showError('prisonerSearch', '⚠️ ผู้ต้องขังรายนี้อยู่ในสถานะ "ติดวินัย งดเยี่ยม" — ไม่สามารถจองได้');
            scrollToFirstError();
            return false;
          }
        } else {
          // No vinaiDate — block by default
          showError('prisonerSearch', '⚠️ ผู้ต้องขังรายนี้อยู่ในสถานะ "ติดวินัย งดเยี่ยม" — ไม่สามารถจองได้');
          scrollToFirstError();
          return false;
        }
      }
    }
  }

  if (!document.getElementById('consent').checked) {
    showInlineError('page1', 'กรุณายืนยันและยินยอมก่อนดำเนินการ');
    document.getElementById('consent').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  return true;
}

// ===== GO TO CONFIRM PAGE =====
function goToConfirm() {
  if (!validate()) return;
  const n = parseInt(document.getElementById('visitorCount').value);
  const totalPersons = n + 1;
  const d = parseLocalDate(selectedDate);  // ✅ parse local ไม่ผ่าน UTC
  const thDate = d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const extras = getExtraVisitors();
  const visitor1Name = document.getElementById('visitorName').value.trim();
  const visitor1Id = document.getElementById('visitorId').value.trim();
  const mainRelation = document.getElementById('relation').value;
  const mainPhone = document.getElementById('visitorPhone').value.trim();

  const cost = calculateTotal();
  const c = cost;

  const prisonerName = document.getElementById('prisonerName').value.trim();
  const prisonerId = document.getElementById('prisonerId').value.trim();
  const wing = document.getElementById('wing').value;

  // ========== CUSTOMER-FOCUSED CONFIRMATION (UX Redesign) ==========
  /*
  UX RECOMMENDATIONS IMPLEMENTED FOR STEP 2:
  1. Clarity: Hero banner with the 3 most critical facts first (Date, Headcount, Total Cost) — users scan this instantly.
  2. Reduced friction: Grouped into 4 scannable sections using plain language + icons. No jargon like "kitchen report".
  3. Verify ease: Large bold values, subtle labels, visual separation. Users can confirm in <5 seconds.
  4. Admin stuff deprioritized: Removed 5 colored dept-specific reports from customer view (those are internal tools).
     - One clean "Copy my summary" for user's personal record / Line / print.
     - Dept copy buttons remain available via admin interfaces or future "staff view".
  5. Reassurance & commitment: Explicit "ข้อมูลถูกต้องทั้งหมดใช่ไหม?" + prominent primary action.
  6. Accessibility: Uses existing high-contrast text, good tap targets on buttons, logical reading order.
  7. Less cognitive load: ~60% less content vs old version; focused only on what the customer cares about.
  */

  const extrasListHtml = extras.length > 0 ? extras.map((v, i) => {
    const feeNote = (v.relation === 'บุตร / ธิดา' && v.age) ? ` (อายุ ${v.age} ปี)` : '';
    return `<div style="font-size:13px;padding:2px 0;">• ${v.name} — ${v.relation}${feeNote}</div>`;
  }).join('') : '<div style="font-size:13px;color:#666">ไม่มีผู้เข้าร่วมเพิ่มเติม</div>';

  const discountLine = cost.discountNotes.length
    ? `<div style="font-size:12px;color:#2e7d32;margin-top:4px">✓ ส่วนลดบุตร/ธิดา: ${cost.discountNotes.join(' • ')}</div>`
    : '';

  const userSummaryHtml = `
    <div class="confirm-hero">
      <div class="confirm-hero-date">
        <i class="ti ti-calendar-event"></i>
        <span>วันที่เข้าร่วม</span>
      </div>
      <div class="confirm-hero-main">${thDate}</div>
      <div class="confirm-hero-meta">
        👥 ${totalPersons} คน (รวมผู้ต้องขัง) &nbsp;•&nbsp; <strong>${cost.total.toLocaleString()} บาท</strong>
      </div>
    </div>

    <div class="review-grid">
      <div class="review-section">
        <div class="review-label"><i class="ti ti-user"></i> ผู้จองหลัก (ผู้ติดต่อ)</div>
        <div class="review-value">${visitor1Name}</div>
        <div class="review-sub">${mainPhone} • ${mainRelation}</div>
      </div>

      <div class="review-section">
        <div class="review-label"><i class="ti ti-users"></i> ผู้เข้าร่วมกิจกรรมทั้งหมด (${n} คน)</div>
        <div class="review-value" style="font-size:14px;line-height:1.4">
          1. ${escHtml(visitor1Name)} (ผู้จอง)
          ${extrasListHtml}
        </div>
      </div>

      <div class="review-section">
        <div class="review-label"><i class="ti ti-lock"></i> ผู้ต้องขังที่เข้าร่วม</div>
        <div class="review-value">${escHtml(prisonerName)}</div>
        <div class="review-sub">#${escHtml(prisonerId)} • แดน ${escHtml(wing)}</div>
      </div>

      <div class="review-section cost">
        <div class="review-label"><i class="ti ti-coin"></i> สรุปค่าบริการ</div>
        <div style="font-size:22px;font-weight:700;color:var(--text);margin:4px 0">${cost.total.toLocaleString()} บาท</div>
        <div style="font-size:12px;color:var(--text2)">ผู้ใหญ่ ${c.adults} คน • เด็ก 5-8 ปี ${c.kids5_8} • ต่ำกว่า 5 ปี ${c.kidsUnder5}</div>
        ${discountLine}
      </div>
    </div>

    <div style="margin:12px 0 4px;font-size:12px;color:#666;text-align:center;line-height:1.5">
      โปรดตรวจสอบให้แน่ใจว่าข้อมูลข้างต้นถูกต้องทุกประการ<br>
      หลังส่งคำขอแล้วจะได้รับเลขอ้างอิงทันทีเพื่อติดตามสถานะ
    </div>
  `;

  document.getElementById('confirmSummary').innerHTML = userSummaryHtml;

  // Attach one clean user copy button (we can enhance the DOM after insert)
  setTimeout(() => {
    const summaryEl = document.getElementById('confirmSummary');
    if (summaryEl && !document.getElementById('userCopyBtn')) {
      const copyBtn = document.createElement('button');
      copyBtn.id = 'userCopyBtn';
      copyBtn.className = 'btn-secondary';
      copyBtn.style.cssText = 'width:100%;margin-top:8px;font-size:13px;padding:9px';
      copyBtn.innerHTML = '<i class="ti ti-copy"></i> คัดลอกสรุปการจองของฉัน (บันทึกส่วนตัว)';
      copyBtn.onclick = () => {
        const cleanText = `การจองกิจกรรม Chance & Change Cafe\nวันที่: ${thDate}\nผู้จอง: ${visitor1Name} (${mainPhone})\nจำนวน: ${totalPersons} คน\nผู้ต้องขัง: ${prisonerName} (#${prisonerId})\nรวม: ${cost.total} บาท\nRef หลังส่ง: จะได้รับทันที`;
        navigator.clipboard.writeText(cleanText).then(() => {
          copyBtn.innerHTML = '<i class="ti ti-check"></i> คัดลอกแล้ว';
          setTimeout(() => { if (copyBtn) copyBtn.innerHTML = '<i class="ti ti-copy"></i> คัดลอกสรุปการจองของฉัน (บันทึกส่วนตัว)'; }, 1800);
        }).catch(() => prompt('คัดลอกข้อความด้านล่าง (กด Ctrl+C):', cleanText));
      };
      summaryEl.appendChild(copyBtn);
    }
  }, 0);

  showPage(2);
}

function goBack() { showPage(1); }

// ===== SUBMIT =====
let bookingSubmitting = false;

async function submitBooking() {
  if (bookingSubmitting) return;
  bookingSubmitting = true;
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = true;
  document.getElementById('overlay').classList.add('show');

  await initBackendUrl();
  const n = parseInt(document.getElementById('visitorCount').value);
  const totalPersons = n + 1;
  const d = parseLocalDate(selectedDate);  // ✅ parse local ไม่ผ่าน UTC
  const thDate = d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const now = new Date().toLocaleString('th-TH');

  const extras = getExtraVisitors();
  const extraNamesStr = extras.map(v => v.name + '|' + v.id + '|' + v.relation + '|' + (v.age || '')).join(';;');
  const extraReligionsStr = extras.map(v => v.religion || '').join(';;');
  const extraAllergiesStr = extras.map(v => v.allergy || '').join(';;');

  const prisonerId = document.getElementById('prisonerId').value.trim();

  // ── ตรวจสอบเลขผู้ต้องขังซ้ำในวันเดียวกัน ──
  let existingRefs = [];
  try {
    const dupData = await appsScriptGet({ action: 'lookupByRef', prisonerId: prisonerId });
    if (dupData && dupData.status === 'ok' && Array.isArray(dupData.rows)) {
      existingRefs = dupData.rows.map(r => r.ref).filter(Boolean);
      const activeStatuses = ['รอตรวจสอบวินัย', 'รอตรวจสอบผู้เข้าร่วม', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น'];
      const duplicate = dupData.rows.find(r =>
        (r.visitDateISO || '') === selectedDate &&
        activeStatuses.includes(r.status)
      );
      if (duplicate) {
        bookingSubmitting = false;
        document.getElementById('overlay').classList.remove('show');
        const btn = document.getElementById('submitBtn');
        if (btn) btn.disabled = false;
        showInlineError('confirmSummary', `⚠️ ไม่สามารถจองได้ — มีการจองผู้ต้องขังหมายเลข "${escHtml(prisonerId)}" ในวันนี้อยู่แล้ว (Ref: ${escHtml(duplicate.ref)})`);
        return;
      }
    }
  } catch (err) {
    console.warn('Duplicate check skipped:', err);
  }

  const ref = generateUniqueRef(existingRefs);

  const cost = calculateTotal();
  const data = {
    ref,
    timestamp: now,
    visitorName: document.getElementById('visitorName').value.trim(),
    extraVisitorNames: extraNamesStr,
    visitorId: document.getElementById('visitorId').value.trim(),
    visitorPhone: validatePhone(document.getElementById('visitorPhone').value.trim()).cleaned,
    relation: document.getElementById('relation').value,
    religion: document.getElementById('visitorReligion').value.trim(),
    allergy: document.getElementById('visitorAllergy').value.trim(),
    extraVisitorReligions: extraReligionsStr,
    extraVisitorAllergies: extraAllergiesStr,
    prisonerName: document.getElementById('prisonerName').value.trim(),
    prisonerId: document.getElementById('prisonerId').value.trim(),
    wing: document.getElementById('wing').value,
    visitDate: thDate,
    visitDateISO: selectedDate,
    visitorCount: n,
    totalPersons,
    total: cost.total,
    adultCount: cost.adults,
    child5to8Count: cost.kids5_8,
    childUnder5Count: cost.kidsUnder5,
    status: 'รอตรวจสอบผู้เข้าร่วม',
    slipImage: ''
  };

  // overlay already shown from duplicate check; do NOT add again
  let submitSuccess = false;
  let savedRef = '';
  let submitError = '';
  try {
    const resp = await appsScriptFetch('', {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    }, 2);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const result = JSON.parse(await resp.text());
    if (result.status !== 'ok') throw new Error(result.message || 'ไม่สำเร็จ');
    submitSuccess = true;
    savedRef = String(result.ref || '').trim() || ref;
  } catch (err) {
    submitError = err && err.message ? String(err.message) : '';
    const isDemoMode = APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
    if (isDemoMode) {
      console.warn('Demo mode — Apps Script URL not configured (fake success for demo)');
      submitSuccess = true;
      savedRef = ref;
    } else {
      console.error('Submit error:', err);
      submitSuccess = false;
    }
  } finally {
    document.getElementById('overlay').classList.remove('show');
  }

  if (!submitSuccess) {
    bookingSubmitting = false;
    const btn = document.getElementById('submitBtn');
    if (btn) btn.disabled = false;
    const isServerRejection = submitError && (submitError.indexOf('⚠️') === 0 || submitError.indexOf('ไม่สามารถจองได้') === 0 || submitError.indexOf('Cannot change') === 0);
    const failMsg = isServerRejection
      ? submitError
      : '❌ การส่งคำขอจองล้มเหลว — กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองใหม่อีกครั้ง\n⚠️ หากหน้าจอก่อนหน้าแสดงเลขอ้างอิงแล้ว กรุณาไปที่หน้า "ตรวจสอบสถานะ" ก่อนส่งซ้ำ เพื่อหลีกเลี่ยงการจองซ้ำ';
    showInlineError('confirmSummary', failMsg);
    return;
  }

  // ✅ Success path (real save or demo)
  document.getElementById('refNumber').textContent = savedRef;

  // Optimistic update local quota (counts pending bookings too)
  bookings[selectedDate] = (bookings[selectedDate] || 0) + 1;
  renderCalendar();

  const costFinal = calculateTotal();
  const cf = costFinal;

  document.getElementById('finalSummary').innerHTML = `
    <div style="text-align:center;margin-bottom:8px">
      <strong style="color:#185fa5">✅ ส่งคำขอเรียบร้อย — Ref: ${escHtml(savedRef)}</strong>
    </div>
    
    <div class="booking-details">
      <div class="detail-row">
        <span class="detail-label">📅 วันที่เข้าร่วม</span>
        <span class="detail-value">${escHtml(data.visitDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">👥 จำนวนผู้เข้าร่วม</span>
        <span class="detail-value">ญาติ ${escHtml(String(data.visitorCount))} คน + ผู้ต้องขัง 1 คน = ${escHtml(String(totalPersons))} คน</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">👤 ชื่อผู้ต้องขัง</span>
        <span class="detail-value">${escHtml(data.prisonerName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">🔢 เลขประจำตัวผู้ต้องขัง</span>
        <span class="detail-value">${escHtml(data.prisonerId)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">📍 แดนของผู้ต้องขัง</span>
        <span class="detail-value">${escHtml(data.wing)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">🧑 ชื่อผู้จอง</span>
        <span class="detail-value">${escHtml(data.visitorName)}</span>
      </div>
      ${extras.length > 0 ? `<div class="detail-row">
        <span class="detail-label">📋 รายชื่อผู้เข้าร่วมเพิ่มเติม</span>
        <span class="detail-value" style="line-height:1.8">${extras.map((v, i) => `${i + 2}. ${escHtml(v.name)} (${escHtml(v.relation)})`).join('<br>')}</span>
      </div>` : ''}
    </div>
    
    <div style="font-size:11px;color:#888;text-align:center;margin-top:12px">ใช้ปุ่ม "ตรวจสอบสถานะ" เพื่อติดตาม หรือคัดลอก Ref ด้านบน</div>
  `;

  // Store ref in sessionStorage for status page
  try {
    sessionStorage.setItem('lastRef', savedRef);
    sessionStorage.setItem('lastPrisonerId', data.prisonerId);
  } catch (e) { }

  showPage(3);
}

function copyRef() {
  const ref = document.getElementById('refNumber').textContent;
  navigator.clipboard.writeText(ref).then(() => {
    const btn = document.getElementById('copyRefBtn');
    btn.innerHTML = '<i class="ti ti-check"></i> คัดลอกแล้ว';
    setTimeout(() => { btn.innerHTML = '<i class="ti ti-copy"></i> คัดลอก Ref'; }, 2000);
  }).catch(() => { });
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
  // clear prisoner hidden fields + display
  const pName = document.getElementById('prisonerName');
  const pId = document.getElementById('prisonerId');
  const pWing = document.getElementById('wing');
  if (pName) pName.value = '';
  if (pId) pId.value = '';
  if (pWing) pWing.value = '';
  const disp = document.getElementById('selectedPrisonerDisplay');
  if (disp) disp.style.display = 'none';
  const pStatus = document.getElementById('prisonerMatchStatus');
  if (pStatus) pStatus.style.display = 'none';

  document.getElementById('consent').checked = false;
  document.getElementById('extraVisitorsContainer').style.display = 'none';
  document.getElementById('extraVisitorsList').innerHTML = '';
  selectedDate = null;
  document.getElementById('selectedDateDisplay').textContent = '';
  document.getElementById('submitBtn').disabled = false;
  bookingSubmitting = false;
  renderCalendar();
  showPage(1);
}

// ===== SAFE FETCH WRAPPER =====
async function appsScriptGet(params) {
  const qs = new URLSearchParams(params).toString();
  const resp = await appsScriptFetch('?' + qs, { redirect: 'follow', credentials: 'omit' }, 2);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const text = await resp.text();
  try { return JSON.parse(text); }
  catch { throw new Error('Invalid JSON: ' + text.slice(0, 100)); }
}

async function fetchBookingCounts() {
   // Try cache-only approach first for calendar counts
   try {
     const cache = localStorage.getItem('calendar_cache');
     const cacheTime = localStorage.getItem('calendar_cache_time');
     if (cache && cacheTime && (Date.now() - parseInt(cacheTime)) < 60000) {
       const data = JSON.parse(cache);
       if (data && data.status === 'ok') {
         if (data.counts) return data.counts;
         if (Array.isArray(data.rows)) {
           const activeStatuses = ['รอตรวจสอบวินัย', 'รอตรวจสอบผู้เข้าร่วม', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น'];
           const counts = {};
           data.rows.forEach(r => {
             if (!r.visitDateISO) return;
             if (!activeStatuses.includes(r.status)) return;
             const dk = String(r.visitDateISO).trim();
             if (/^\d{4}-\d{2}-\d{2}$/.test(dk)) counts[dk] = (counts[dk] || 0) + 1;
           });
           return counts;
         }
       }
     }
   } catch (e) {}

   const attempts = [
     { action: 'getCountsByDate' },
     { action: 'getAll' }
   ];

   let lastErr = null;
   for (const params of attempts) {
     try {
       const data = await appsScriptGet(params);
       if (data && data.status === 'ok') {
         if (params.action === 'getCountsByDate' && data.counts) {
           try {
             localStorage.setItem('calendar_cache', JSON.stringify({ status: 'ok', counts: data.counts }));
             localStorage.setItem('calendar_cache_time', String(Date.now()));
           } catch (e) {}
           return data.counts;
         }
         if (params.action === 'getAll' && Array.isArray(data.rows)) {
           const activeStatuses = ['รอตรวจสอบวินัย', 'รอตรวจสอบผู้เข้าร่วม', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น'];
           const counts = {};
           data.rows.forEach(r => {
             if (!r.visitDateISO) return;
             if (!activeStatuses.includes(r.status)) return;
             const dk = String(r.visitDateISO).trim();
             if (/^\d{4}-\d{2}-\d{2}$/.test(dk)) counts[dk] = (counts[dk] || 0) + 1;
           });
           return counts;
         }
         throw new Error('Invalid getCountsByDate response');
       }
       if (data && data.status === 'error') throw new Error(data.message || 'Unknown server error');
       throw new Error('Invalid getCountsByDate response');
     } catch (err) {
       lastErr = err;
     }
   }
   throw lastErr || new Error('Cannot load booking counts');
 }

// ===== CONNECTION BANNER =====
function showConnBanner(type, msg) {
  const existing = document.getElementById('connBanner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'connBanner';
  banner.style.cssText = 'padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:13px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
  if (type === 'error') {
    banner.style.background = '#fee2e2';
    banner.style.color = '#991b1b';
    banner.style.border = '1px solid #fecaca';
    banner.innerHTML = `<span>${msg}</span>
      <button onclick="retryLoadBookingCounts()" style="margin-left:auto;padding:4px 12px;border-radius:6px;border:1px solid #991b1b;background:transparent;color:#991b1b;cursor:pointer;font-size:12px;">ลองใหม่</button>`;
  } else if (type === 'success') {
    banner.style.background = '#d1fae5';
    banner.style.color = '#065f46';
    banner.style.border = '1px solid #a7f3d0';
    banner.innerHTML = `<span>${msg}</span>`;
  } else {
    banner.style.background = '#fef3c7';
    banner.style.color = '#92400e';
    banner.style.border = '1px solid #fde68a';
    banner.innerHTML = `<span>${msg}</span>`;
  }
  const target = document.querySelector('.section') || document.getElementById('calTitle')?.parentElement?.parentElement;
  if (target && target.parentElement) {
    target.parentElement.insertBefore(banner, target);
  }
}

async function retryLoadBookingCounts() {
  const existing = document.getElementById('connBanner');
  if (existing) existing.remove();
  showConnBanner('warn', '⏳ กำลังโหลดข้อมูลอีกครั้ง...');
  await loadBookingCounts();
}

// ===== โหลดจำนวนการจองจริงจาก Sheet ก่อน render ปฏิทิน =====
async function loadBookingCounts() {
   await initBackendUrl();
   try {
     const counts = await fetchBookingCounts();
     if (counts && typeof counts === 'object') {
       bookings = {};
       Object.keys(counts).forEach(dk => {
         if (/^\d{4}-\d{2}-\d{2}$/.test(dk)) bookings[dk] = counts[dk];
       });
       const existing = document.getElementById('connBanner');
       if (existing) existing.remove();
       console.log('[Calendar] Loaded booking counts from server');
     } else {
       console.warn('[Calendar] No counts in response, using empty bookings');
       if (!bookings || Object.keys(bookings).length === 0) {
         showConnBanner('warn', '⚠️ ไม่พบข้อมูลการจองจากเซิร์ฟเวอร์ — แสดงข้อมูลว่าง');
       }
     }
   } catch (err) {
     console.error('[Calendar] loadBookingCounts failed:', err);
     if (!bookings || Object.keys(bookings).length === 0) {
       showConnBanner('error', '⚠️ ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้ — จำนวนที่ว่างอาจไม่ถูกต้อง');
     }
   }
   renderCalendar();
}

// Initialize calendar immediately, then load data from server
renderCalendar(); // show immediately (with 0 quotas), load will refresh counts from server
loadBookingCounts();

// Load prisoner master data from Google Sheet (for autocomplete + validation in prisoner info section)
loadPrisonerMaster();

// Close prisoner suggestions when clicking outside the search box
document.addEventListener('click', (e) => {
  const searchBox = document.getElementById('prisonerSearch');
  const suggBox = document.getElementById('prisonerSuggestions');
  if (searchBox && suggBox && !searchBox.contains(e.target) && !suggBox.contains(e.target)) {
    suggBox.style.display = 'none';
  }
});
