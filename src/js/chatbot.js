// ===== i18n TRANSLATIONS =====
const i18n = {
  th: {
    chatGreeting: '🤖 สวัสดี! ฉันเป็น M4RTHIN9 AI ผู้ช่วยตอบคำถามเกี่ยวกับการจองเข้ากิจกรรม ลองถามมาได้เลย',
    chatPlaceholder: 'พิมพ์คำถาม...',
    chatClose: 'ปิดแชท',
    overlayLoading: 'กำลังส่งคำขอ...',
    noBookingFound: '🔍 ไม่พบการจองสำหรับ <strong>{ref}</strong><br>กรุณาเช็คความถูกต้องหรือลองใหม่<br><br><button onclick="window.retryStatusCheck&&window.retryStatusCheck()" style="margin-top:8px;padding:6px 12px;background:var(--blue);color:#fff;border:none;border-radius:4px;cursor:pointer">ลองใหม่</button>',
    paymentCost: '💰 <strong>ค่าใช้จ่าย</strong> ผู้ใหญ่ 1,000 บาท / คน (คิดรวมผู้ต้องขัง)<br>👶 เด็ก 5-8 ขวบ 500 บาท / คน<br>👶 เด็ก <5 ขวบ ฟรี<br><br>เช่น ญาติ 2 คน + ผู้ต้องขัง 1 คน = 3,000 บาท',
    bookingSteps: '📋 <strong>ขั้นตอบการจอง 4 ขั้นตอบ</strong>:<br>① กดปุ่ม "จองคิว" ด้านบน<br>② กรอกข้อมูลผู้เข้าร่วมกิจกรรม ข้อมูลผู้ต้องขัง และเลือกวันที่<br>③ รับเลขอ้างอิง (Ref No.) ทันที<br>④ รอเจ้าหน้าที่ตรวจสอบ (1-2 วัน)<br>⑤ ชำระเงินเมื่อได้รับการอนุมัติ',
    checkStatus: '🔍 <strong>ตรวจสอบสถานะ</strong>:<br>ใช้ <strong>Ref No.</strong> หรือ <strong>เลขผู้ต้องขัง</strong> ที่หน้า "ตรวจสอบสถานะ"<br><br>สถานะที่อาจเจอ:<br>• รอตรวจสอบวินัย<br>• รอตรวจสอบผู้เข้าร่วม<br>• รอชำระเงิน<br>• ชำระแล้ว<br>• เสร็จสิ้น<br>• ไม่อนุมัติ',
    daysTime: '📅 <strong>วันและเวลา</strong>:<br>เปิดรับจองเฉพาะ <strong>วันทำการ</strong><br>จันทร์ – ศุกร์ (ยกเว้นวันหยุดราชการ)<br><br>จำนวนโต๊ะจำกัด 20 โต๊ะ / วัน<br>เมื่อเต็มแล้วระบบจะปิดรับโดยอัตโนมัติ',
    whatToBring: '📝 <strong>สิ่งที่ควรเตรียมในวันเยี่ยม</strong>:<br>• แสดงบัตรประชาชนตัวจริง<br>• ห้ามนำโทรศัพท์เข้าพื้นที่เยี่ยม<br><br>ในกิจกรรมจะมีอาหารเป็น <strong>Fine Dining 6 คอร์ส</strong>เสิร์ฟให้ผู้เข้าร่วม',
    childAgePrice: '👶 <strong>อายุและค่าใช้จ่ายของเด็ก</strong>:<br>• อายุ <5 ขวบ: ฟรี<br>• อายุ 5-8 ขวบ: 500 บาท / คน<br>• อายุ >8 ขวบ: 1,000 บาท / คน (เท่าผู้ใหญ่)',
    paymentMethod: '💳 <strong>การชำระเงิน</strong>:<br>ชำระเงินได้หลังจากได้รับการอนุมัติ<br>จะมีลิงก์ชำระค่าร่วมกิจกรรมให้ดำเนินการ<br><br>ใช้บริการโอนเงินผ่านธนาคาร',
    approvalTime: '⏱️ <strong>ระยะเวลาการตรวจสอบ</strong>:<br>เจ้าหน้าที่จะตรวจสอบประวัติวินัยของผู้ต้องขัง<br>ใช้เวลาประมาณ 1-2 วันทำการ<br><br>หากสถานะยังคง "รอตรวจสอบ" เกิน 3 วัน กรุณาติดต่อเจ้าหน้าที่โดยตรง',
    contactUs: '📞 <strong>ติดต่อเจ้าหน้าที่</strong>:<br>สอบถามเพิ่มเติมได้ที่ ทัณฑสถานบำบัดพิเศษกลาง<br><br>หรือเยี่ยมชม <a href="https://main.correct.go.th" target="_blank" style="color:var(--blue);">main.correct.go.th</a>',
    greetingHello: '👋 สวัสดีครับ! ยินดีช่วยคุยเลขานุการ<br>ฉันเป็นผู้ช่วย AI ที่สามารถตอบคำถามเกี่ยวกับการจองเข้ากิจกรรมของทัณฑสถานบำบัดพิเศษกลาง<br><br>ลองถามมาได้เลย เช่น "ค่าใช้จ่ายเท่าไหร่" หรือ "จองยังไง"',
    notUnderstand: '❓ ขออภัย ฉันไม่เข้าใจคำถามนี้<br>ลองถามในหัวข้ออื่น เช่น "ค่าใช้จ่าย", "จองยังไง", หรือ "ตรวจสอบสถานะ"'
  },
  en: {
    chatGreeting: '🤖 Hello! I\'m the M4RTHIN9 AI assistant for the reservation system. Feel free to ask any questions.',
    chatPlaceholder: 'Type your question...',
    chatClose: 'Close chat',
    overlayLoading: 'Submitting request...',
    noBookingFound: '🔍 No booking found for <strong>{ref}</strong><br>Please check the reference number<br><br><button onclick="window.retryStatusCheck&&window.retryStatusCheck()" style="margin-top:8px;padding:6px 12px;background:var(--blue);color:#fff;border:none;border-radius:4px;cursor:pointer">Try Again</button>',
    paymentCost: '💰 <strong>Cost Details</strong> Adult: 1,000 THB per person (includes prisoner)<br>👶 Child 5-8 years: 500 THB<br>👶 Child under 5 years: Free<br><br>e.g., Family 2 + Prisoner 1 = 3,000 THB',
    bookingSteps: '📋 <strong>4-Step Booking Process</strong>:<br>① Click "Book Slot" button above<br>② Fill in visitor info, prisoner info, and select date<br>③ Get reference number (Ref No.) instantly<br>④ Wait for officer verification (1-2 business days)<br>⑤ Pay when approved',
    checkStatus: '🔍 <strong>Check Status</strong>:<br>Use <strong>Ref No.</strong> or <strong>Prisoner ID</strong> on the "Check Status" page<br><br>Possible statuses:<br>• Pending verification<br>• Pending visitor check<br>• Pending payment<br>• Paid<br>• Completed<br>• Rejected',
    daysTime: '📅 <strong>Days and Hours</strong>:<br>Bookings accepted on <strong>working days</strong><br>Mon – Fri (except public holidays)<br><br>Limited to 20 seats / day<br>System closes automatically when full',
    whatToBring: '📝 <strong>What to Bring</strong>:<br>• Present actual ID card<br>• No phones allowed in visit area<br><br>The activity includes Fine Dining 6-course meal',
    childAgePrice: '👶 <strong>Child Age & Pricing</strong>:<br>• Under 5 years: Free<br>• 5-8 years: 500 THB<br>• Over 8 years: 1,000 THB (same as adult)',
    paymentMethod: '💳 <strong>Payment Method</strong>:<br>Payment can be made after approval<br>Payment link will be provided<br><br>Bank transfer service available',
    approvalTime: '⏱️ <strong>Processing Time</strong>:<br>Officers check prisoner disciplinary record<br>Takes approximately 1-2 business days<br><br>If still "Pending" after 3 days, contact officers directly',
    contactUs: '📞 <strong>Contact Officers</strong>:<br>Inquiries can be made at the institution<br><br>Or visit <a href="https://main.correct.go.th" target="_blank" style="color:var(--blue);">main.correct.go.th</a>',
    greetingHello: '👋 Hello! How can I assist you?<br>I\'m the AI assistant for Chance & Change Cafe reservation system<br><br>Feel free to ask about "cost", "how to book", or "check status"',
    notUnderstand: '❓ Sorry, I don\'t understand this question<br>Try asking about "cost", "how to book", or "check status"'
  },
  zh: {
    chatGreeting: '🤖 您好！我是 M4RTHIN9 AI 助手，可以回答关于本场地预约的任何问题。',
    chatPlaceholder: '请输入问题...',
    chatClose: '关闭聊天',
    overlayLoading: '正在提交请求...',
    noBookingFound: '🔍 未找到参考编号为 <strong>{ref}</strong> 的预约<br>请检查参考编号是否正确<br><br><button onclick="window.retryStatusCheck&&window.retryStatusCheck()" style="margin-top:8px;padding:6px 12px;background:var(--blue);color:#fff;border:none;border-radius:4px;cursor:pointer">重试</button>',
    paymentCost: '💰 <strong>费用详情</strong> 成人：1,000 泰铢/人（包含囚犯）<br>👶 5-8岁儿童：500 泰铢<br>👶 5岁以下儿童：免费<br><br>例如：家属2人 + 囚犯1人 = 3,000 泰铢',
    bookingSteps: '📋 <strong>4步预约流程</strong>:<br>① 点击上方"预约名额"<br>② 填写家属信息、囚犯信息并选择日期<br>③ 立即获取参考编号（Ref No.）<br>④ 等待工作人员审核（1-2个工作日）<br>⑤ 审核通过后付款',
    checkStatus: '🔍 <strong>查询状态</strong>:<br>在"查询状态"页面使用<strong>参考编号</strong>或<strong>囚犯编号</strong><br><br>可能的状态:<br>• 待审核<br>• 待访客确认<br>• 待付款<br>• 已付款<br>• 已完成<br>• 已拒绝',
    daysTime: '📅 <strong>日期与时间</strong>:<br>仅限<strong>工作日</strong>预约<br>星期一 – 星期五（公假除外）<br><br>每天限20个席位<br>满额后系统自动关闭',
    whatToBring: '📝 <strong>参观须知</strong>:<br>• 须出示真实身份证<br>• 访问区内禁止携带电话<br><br>活动包含6道菜Fine Dining',
    childAgePrice: '👶 <strong>儿童年龄与收费</strong>:<br>• 5岁以下：免费<br>• 5-8岁：500 泰铢/人<br>• 8岁以上：1,000 泰铢/人（与成人同价）',
    paymentMethod: '💳 <strong>付款方式</strong>:<br>审核通过后可以付款<br>系统将提供付款链接<br><br>支持银行转账',
    approvalTime: '⏱️ <strong>处理时间</strong>:<br>工作人员将审核囚犯纪律记录<br>约需1-2个工作日<br><br>如3天后仍显示"待审核"，请直接联系工作人员',
    contactUs: '📞 <strong>联系工作人员</strong>:<br>可到矫正院咨询<br><br>或访问 <a href="https://main.correct.go.th" target="_blank" style="color:var(--blue);">main.correct.go.th</a>',
    greetingHello: '👋 您好！我能为您做些什么？<br>我是此活动预约系统的AI助手<br><br>随时可询问"费用"、"如何预约"或"查询状态"',
    notUnderstand: '❓ 抱歉，我不理解您的问题<br>请尝试询问"费用"、"如何预约"或"查询状态"'
  }
};

function getLang() {
  return localStorage.getItem('lang') || 'th';
}

function getI18n(key) {
  const lang = getLang();
  return (i18n[lang] && i18n[lang][key]) || i18n.th[key] || key;
}

// ===== CONFIG =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw4e8PcvNkodHjCa-QAHCkGEMz3ojubiBDQuYLu0uRTrJmemWLTUaxXUsx8ypZFX_j06A/exec';
const STAFF_PASS = '10900';

// ===== SAFE FETCH WRAPPER =====
async function appsScriptGet(params) {
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(APPS_SCRIPT_URL + '?' + qs, { redirect: 'follow' });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response: ' + text.slice(0, 100));
  }
}

function normalizeStatus(s) {
  const v = (s || '').toString().trim().toLowerCase();
  if (['อนุมัติ', 'approved', 'รอชำระเงิน'].includes(v)) return 'รอชำระเงิน';
  if (['rejected', 'ไม่อนุมัติ'].includes(v)) return 'ไม่อนุมัติ';
  if (['paid', 'ชำระแล้ว'].includes(v)) return 'ชำระแล้ว';
  if (['done', 'เสร็จสิ้น'].includes(v)) return 'เสร็จสิ้น';
  if (v === 'ยกเลิก') return 'ยกเลิก';
  return s || 'รอตรวจสอบ';
}

function getStatusPill(status) {
  const s = normalizeStatus(status);
  if (s === 'รอชำระเงิน') return `<span class="status-pill status-approved">✅ อนุมัติ — รอชำระเงิน</span>`;
  if (s === 'รอตรวจสอบ') return `<span class="status-pill status-pending">⏳ รอตรวจสอบ</span>`;
  if (s.includes('อนุมัติ')) return `<span class="status-pill status-approved">✅ อนุมัติแล้ว</span>`;
  if (s.includes('ไม่อนุมัติ')) return `<span class="status-pill status-rejected">❌ ไม่อนุมัติ</span>`;
  if (s.includes('ชำระ')) return `<span class="status-pill status-paid">💳 รอเจ้าหน้าที่ยืนยัน</span>`;
  if (s.includes('เสร็จสิ้น')) return `<span class="status-pill status-paid" style="background:#d1fae5;color:#065f46;border-color:rgba(6,95,70,0.3)">✅ เสร็จสิ้นแล้ว</span>`;
  if (s.includes('ยกเลิก')) return `<span class="status-pill" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db">🚫 ยกเลิก</span>`;
  return `<span class="status-pill status-pending">⏳ รอตรวจสอบ</span>`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== DEMO DATA =====
function getDemoRows() {
  return [
    {
      ref: 'VIS-12345',
      timestamp: '21/5/2569 10:30',
      visitorName: 'สมชาย ใจดี',
      visitorPhone: '081-234-5678',
      prisonerName: 'สมศักดิ์ มั่นคง',
      prisonerId: '56781234',
      wing: 'แดน 3',
      visitDate: 'วันจันทร์ที่ 25 พฤษภาคม พ.ศ. 2569',
      total: 2000,
      status: 'รอชำระเงิน'
    },
    {
      ref: 'VIS-67890',
      timestamp: '20/5/2569 14:15',
      visitorName: 'มาลี สุขใจ',
      visitorPhone: '089-876-5432',
      prisonerName: 'วิชัย รักชาตี',
      prisonerId: '11223344',
      wing: 'แดน 7',
      visitDate: 'วันอังคารที่ 26 พฤษภาคม พ.ศ. 2569',
      total: 2000,
      status: 'รอตรวจสอบ'
    },
    {
      ref: 'VIS-22222',
      timestamp: '30/5/2569 09:00',
      visitorName: 'สมศักดิ์ ทดสอบ',
      visitorPhone: '081-111-1111',
      prisonerName: 'สมศักดิ์ มั่นคง',
      prisonerId: '56781234',
      wing: 'แดน 3',
      visitDate: 'วันจันทร์ที่ 2 มิถุนายน พ.ศ. 2569',
      total: 2000,
      status: 'เสร็จสิ้น'
    }
  ];
}

// ===== FETCH BOOKING BY REF =====
async function fetchBookingByRef(ref) {
  let rows = [];
  try {
    const data = await appsScriptGet({ action: 'getAll', pass: STAFF_PASS });
    if (data.status === 'ok') rows = data.rows || [];
  } catch (err) {
    console.error('Fetch error:', err);
    rows = getDemoRows();
  }
  return rows.find(r => (r.ref || '').toUpperCase() === ref.toUpperCase()) || null;
}

const knowledgeBase = [
  {
    keywords: ['ค่าใช้จ่าย', 'ค่าบริการ', 'ราคา', 'ราคาเท่าไหร่', 'ค่าสมัคร', 'ค่าจอง', 'บาท'],
    response: '💰 <strong>ค่าใช้จ่าย</strong> ผู้ใหญ่ 1,000 บาท / คน (คิดรวมผู้ต้องขัง)<br>👶 เด็ก 5-8 ขวบ 500 บาท / คน<br>👶 เด็ก <5 ขวบ ฟรี<br><br>เช่น ญาติ 2 คน + ผู้ต้องขัง 1 คน = 3,000 บาท'
  },
  {
    keywords: ['จอง', 'จองคิว', 'ทำอย่างไร', 'ขั้นตอน', 'ขั้นตอนการจอง', 'เริ่มต้น', 'เริ่มจอง'],
    response: '📋 <strong>ขั้นตอนการจอง 4 ขั้นตอน</strong>:<br>① กดปุ่ม "จองคิว" ด้านบน<br>② กรอกข้อมูลผู้เข้าร่วมกิจกรรม ข้อมูลผู้ต้องขัง และเลือกวันที่<br>③ รับเลขอ้างอิง (Ref No.) ทันที<br>④ รอเจ้าหน้าที่ตรวจสอบ (1-2 วัน)<br>⑤ ชำระเงินเมื่อได้รับการอนุมัติ'
  },
  {
    keywords: ['เช็คสถานะ', 'ตรวจสอบสถานะ', 'สถานะ', 'ค้นหา', 'ref', 'เลขอ้างอิง', 'ผู้ต้องขัง'],
    response: '🔍 <strong>ตรวจสอบสถานะ</strong>:<br>ใช้ <strong>Ref No.</strong> หรือ <strong>เลขผู้ต้องขัง</strong> ที่หน้า "ตรวจสอบสถานะ"<br><br>สถานะที่อาจเจอ:<br>• รอตรวจสอบวินัย<br>• รอตรวจสอบผู้เข้าร่วม<br>• รอชำระเงิน<br>• ชำระแล้ว<br>• เสร็จสิ้น<br>• ไม่อนุมัติ'
  },
  {
    keywords: ['วัน', 'วันไหน', 'เวลา', 'เวลาเปิด', 'เปิด', 'ปิด', 'วันทำการ', 'กะ', 'เวลาจอง'],
    response: '📅 <strong>วันและเวลา</strong>:<br>เปิดรับจองเฉพาะ <strong>วันทำการ</strong><br>จันทร์ – ศุกร์ (ยกเว้นวันหยุดราชการ)<br><br>จำนวนโต๊ะจำกัด 20 โต๊ะ / วัน<br>เมื่อเต็มแล้วระบบจะปิดรับโดยอัตโนมัติ'
  },
  {
    keywords: ['นำอะไรไป', 'สิ่งที่ต้องเตรียม', 'อะไรบ้าง', 'ของที่ต้องใช้', 'ต้องเตรียม', 'อุปกรณ์', 'เอกสาร'],
    response: '📝 <strong>สิ่งที่ควรเตรียมในวันเยี่ยม</strong>:<br>• แสดงบัตรประชาชนตัวจริง<br>• ห้ามนำโทรศัพท์เข้าพื้นที่เยี่ยม<br><br>ในกิจกรรมจะมีอาหารเป็น <strong>Fine Dining 6 คอร์ส</strong>เสิร์ฟให้ผู้เข้าร่วม'
  },
  {
    keywords: ['เด็ก', 'เด็กอายุ', 'ฟรี', 'เด็กไม่มีค่าใช้จ่าย', 'ฟรีค่าใช้จ่าย'],
    response: '👶 <strong>อายุและค่าใช้จ่ายของเด็ก</strong>:<br>• อายุ <5 ขวบ: ฟรี<br>• อายุ 5-8 ขวบ: 500 บาท / คน<br>• อายุ >8 ขวบ: 1,000 บาท / คน (เท่าผู้ใหญ่)'
  },
  {
    keywords: ['ชำระเงิน', 'ชำระ', 'โอน', 'การชำระ', 'ชำระยังไง', 'วิธีชำระ'],
    response: '💳 <strong>การชำระเงิน</strong>:<br>ชำระเงินได้หลังจากได้รับการอนุมัติ<br>จะมีลิงก์ชำระค่าร่วมกิจกรรมให้ดำเนินการ<br><br>ใช้บริการโอนเงินผ่านธนาคาร'
  },
  {
    keywords: ['อนุมัติ', 'ไม่อนุมัติ', 'ผลการตรวจสอบ', 'รอนาน', 'เช็คแล้ว', 'ดำเนินการ', 'เวลา', 'ใช้เวลานาน', 'นานแค่ไหน'],
    response: '⏱️ <strong>ระยะเวลาการตรวจสอบ</strong>:<br>เจ้าหน้าที่จะตรวจสอบประวัติวินัยของผู้ต้องขัง<br>ใช้เวลาประมาณ 1-2 วันทำการ<br><br>หากสถานะยังคง "รอตรวจสอบ" เกิน 3 วัน กรุณาติดต่อเจ้าหน้าที่โดยตรง'
  },
  {
    keywords: ['ติดต่อ', 'ติดต่อเจ้าหน้าที่', 'เบอร์', 'โทร', 'สาย', 'ช่วยเหลือ'],
    response: '📞 <strong>ติดต่อเจ้าหน้าที่</strong>:<br>สอบถามเพิ่มเติมได้ที่ ทัณฑสถานบำบัดพิเศษกลาง<br><br>หรือเยี่ยมชม <a href="https://main.correct.go.th" target="_blank" style="color:var(--blue);">main.correct.go.th</a>'
  },
  {
    keywords: ['สวัสดี', 'hello', 'hi', 'หวัดดี', 'ครับ', 'ค่ะ'],
    response: '👋 สวัสดีครับ! ยินดีช่วยคุยเลขานุการ<br>ฉันเป็นผู้ช่วย AI ที่สามารถตอบคำถามเกี่ยวกับการจองเข้ากิจกรรมของทัณฑสถานบำบัดพิเศษกลาง<br><br>ลองถามมาได้เลย เช่น "ค่าใช้จ่ายเท่าไหร่" หรือ "จองยังไง"'
  }
];

function initChatbot() {
  const chatButton = document.getElementById('chatButton');
  const chatModal = document.getElementById('chatModal');
  const chatClose = document.getElementById('chatClose');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');
  const chatMessages = document.getElementById('chatMessages');
  const quickButtons = document.querySelectorAll('.quick-q-btn');

  if (!chatButton) return;

  // Update chatbot UI with i18n
  const updateChatbotUI = () => {
    if (chatClose) chatClose.setAttribute('aria-label', window.t ? window.t('chatClose') : 'ปิดแชท');
    if (chatInput) chatInput.placeholder = window.t ? window.t('chatPlaceholder') : 'พิมพ์คำถาม...';
  };

  chatButton.addEventListener('click', () => {
    chatModal.classList.add('show');
    chatButton.style.display = 'none';
    restoreChatHistory();
    if (chatMessages.children.length === 0) {
      addMessage(window.t ? window.t('chatGreeting') : '🤖 สวัสดี! ฉันเป็น M4RTHIN9 AI ผู้ช่วยตอบคำถามเกี่ยวกับการจองเข้ากิจกรรม ลองถามมาได้เลย', 'bot');
    }
    updateChatbotUI();
  });
  
  window.retryStatusCheck = function() {
    askQuestion('เช็คสถานะยังไง');
  };

  chatClose && chatClose.addEventListener('click', closeChat);

  chatSend && chatSend.addEventListener('click', sendMessage);
  chatInput && chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  quickButtons.forEach(btn => {
    btn.addEventListener('click', () => askQuestion(btn.dataset.question));
  });
  
  // Listen for language changes
  window.addEventListener('languageChanged', updateChatbotUI);
}

function closeChat() {
  const chatModal = document.getElementById('chatModal');
  const chatButton = document.getElementById('chatButton');
  chatModal.classList.remove('show');
  setTimeout(() => { chatButton.style.display = 'flex'; }, 300);
}

function getChatContext() {
  try {
    const ctx = sessionStorage.getItem('chatContext');
    return ctx ? JSON.parse(ctx) : { intent: null, step: 0 };
  } catch {
    return { intent: null, step: 0 };
  }
}

function setChatContext(ctx) {
  sessionStorage.setItem('chatContext', JSON.stringify(ctx));
}

function clearChatContext() {
  sessionStorage.removeItem('chatContext');
}

function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  chatInput.value = '';

  getBotResponse(message).then(botReply => {
    setTimeout(() => addMessage(botReply, 'bot'), 300);
  });
}

function askQuestion(question) {
  addMessage(question, 'user');
  getBotResponse(question).then(botReply => {
    setTimeout(() => addMessage(botReply, 'bot'), 300);
  });
}

function addMessage(text, sender) {
  const chatMessages = document.getElementById('chatMessages');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}`;
  msgDiv.innerHTML = text;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  saveChatHistory();
}

function saveChatHistory() {
  const chatMessages = document.getElementById('chatMessages');
  const history = Array.from(chatMessages.children).map(el => ({
    text: el.innerHTML,
    sender: el.classList.contains('user') ? 'user' : 'bot'
  }));
  sessionStorage.setItem('chatHistory', JSON.stringify(history));
}

function restoreChatHistory() {
  const chatMessages = document.getElementById('chatMessages');
  const history = sessionStorage.getItem('chatHistory');
  if (history) {
    try {
      JSON.parse(history).forEach(item => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${item.sender}`;
        msgDiv.innerHTML = item.text;
        chatMessages.appendChild(msgDiv);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch {}
  }
}

async function getBotResponse(message) {
  const thNormalized = message.replace(/[ก-๙]/g, c => c);
  
  // Check for Ref No. pattern (VIS-XXXXX)
  const refMatch = message.match(/([Vv][Ii][Ss]-[0-9]{5})/i);
  if (refMatch) {
    const ref = refMatch[1].toUpperCase();
    const booking = await fetchBookingByRef(ref);
    if (!booking) {
      return `🔍 ไม่พบการจองสำหรับ <strong>${escHtml(ref)}</strong><br>กรุณาเช็คความถูกต้องหรือลองใหม่<br><br><button onclick="window.retryStatusCheck&&window.retryStatusCheck()" style="margin-top:8px;padding:6px 12px;background:var(--blue);color:#fff;border:none;border-radius:4px;cursor:pointer">ลองใหม่</button>`;
    }
    const statusPill = getStatusPill(booking.status);
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div><strong>Ref No.</strong> ${escHtml(booking.ref)}</div>
        ${statusPill}
      </div>
      <div style="font-size:13px;line-height:1.8;">
        <div><strong>👤 ผู้ร่วมกิจกรรม:</strong> ${escHtml(booking.visitorName || '—')}</div>
        <div><strong>🔒 ผู้ต้องขัง:</strong> ${escHtml(booking.prisonerName || '—')} (#${escHtml(booking.prisonerId || '—')})</div>
        <div><strong>🏢 แดน:</strong> ${escHtml(booking.wing || '—')}</div>
        <div><strong>📅 วันที่เยี่ยม:</strong> ${escHtml(booking.visitDate || '—')}</div>
        <div><strong>💰 ค่าบริการ:</strong> ${(booking.total || 0).toLocaleString()} บาท</div>
      </div>
    </div>`;
  }

  // Handle intents from knowledgeBase
  for (const item of knowledgeBase) {
    if (item.keywords.some(kw => thNormalized.includes(kw.toLowerCase()))) {
      // Handle multi-turn for status check intent
      if (item.keywords.includes('เช็คสถานะ') || item.keywords.includes('ตรวจสอบสถานะ') || item.keywords.includes('สถานะ')) {
        setChatContext({ intent: 'checkStatus', step: 1 });
        return `${item.response}<br><br>📌 หากต้องการตรวจสอบสถานะ ให้พิมพ์ <strong>Ref No.</strong> ของคุณ (เช่น VIS-12345)`;
      }
      return item.response;
    }
  }
  
  return '❓ ขออภัย ฉันไม่เข้าใจคำถามนี้<br>ลองถามในหัวข้ออื่น เช่น "ค่าใช้จ่าย", "จองยังไง", หรือ "ตรวจสอบสถานะ"';
}

document.addEventListener('DOMContentLoaded', initChatbot);