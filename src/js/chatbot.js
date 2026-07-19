// ===== i18n TRANSLATIONS =====
const i18n = {
  th: {
    chatGreeting: '🤖 สวัสดี! ฉันเป็น M4RTHIN9 AI ผู้ช่วยตอบคำถามเกี่ยวกับการจองเข้ากิจกรรม ลองถามมาได้เลย',
    chatPlaceholder: 'พิมพ์คำถาม...',
    chatClose: 'ปิดแชท',
    overlayLoading: 'กำลังส่งคำขอ...',
    noBookingFound: '🔍 ไม่พบการจองสำหรับ <strong>{ref}</strong><br>กรุณาเช็คความถูกต้องหรือลองใหม่<br><br><button onclick="window.retryStatusCheck&&window.retryStatusCheck()" style="margin-top:8px;padding:6px 12px;background:#fff;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:600;">ลองใหม่</button>',
    paymentCost: '💰 <strong>ค่าใช้จ่าย</strong> ผู้ใหญ่ 1,000 บาท / คน (คิดรวมผู้ต้องขัง)<br>👶 เด็ก 5-8 ขวบ 500 บาท / คน<br>👶 เด็ก &lt;5 ขวบ ฟรี<br><br>เช่น ญาติ 2 คน + ผู้ต้องขัง 1 คน = 3,000 บาท',
    bookingSteps: '📋 <strong>ขั้นตอนการจอง 5 ขั้นตอน</strong>:<br>① กดปุ่ม "จองคิว" ด้านบน<br>② กรอกข้อมูลผู้เข้าร่วมกิจกรรม ข้อมูลผู้ต้องขัง และเลือกวันที่<br>③ รับเลขอ้างอิง (Ref No.) ทันที<br>④ รอเจ้าหน้าที่ตรวจสอบ (1-2 วัน)<br>⑤ ชำระเงินเมื่อได้รับการอนุมัติ',
    checkStatus: '🔍 <strong>ตรวจสอบสถานะ</strong>:<br>ใช้ <strong>Ref No.</strong> หรือ <strong>เลขผู้ต้องขัง</strong> ที่หน้า "ตรวจสอบสถานะ"<br><br>สถานะที่อาจเจอ:<br>• รอตรวจสอบผู้เข้าร่วม<br>• รอตรวจสอบวินัย<br>• รอชำระเงิน<br>• ชำระแล้ว<br>• เสร็จสิ้น<br>• ไม่อนุมัติ',
    daysTime: '📅 <strong>วันและเวลา</strong>:<br>เปิดรับจองเฉพาะ <strong>วันทำการ</strong><br>จันทร์ – ศุกร์ (ยกเว้นวันหยุดราชการ)<br><br>จำนวนโต๊ะจำกัด 20 โต๊ะ / วัน<br>เมื่อเต็มแล้วระบบจะปิดรับโดยอัตโนมัติ',
    whatToBring: '📝 <strong>สิ่งที่ควรเตรียมในวันเยี่ยม</strong>:<br>• แสดงบัตรประชาชนตัวจริง<br>• ห้ามนำโทรศัพท์เข้าพื้นที่เยี่ยม<br><br>ในกิจกรรมจะมีอาหารเป็น <strong>Fine Dining 6 คอร์ส</strong>เสิร์ฟให้ผู้เข้าร่วม',
    childAgePrice: '👶 <strong>อายุและค่าใช้จ่ายของเด็ก</strong>:<br>• อายุ &lt;5 ขวบ: ฟรี<br>• อายุ 5-8 ขวบ: 500 บาท / คน<br>• อายุ &gt;8 ขวบ: 1,000 บาท / คน (เท่าผู้ใหญ่)',
    paymentMethod: '💳 <strong>การชำระเงิน</strong>:<br>ชำระเงินได้หลังจากได้รับการอนุมัติ<br>จะมีลิงก์ชำระค่าร่วมกิจกรรมให้ดำเนินการ<br><br>ใช้บริการโอนเงินผ่านธนาคาร',
    approvalTime: '⏱️ <strong>ระยะเวลาการตรวจสอบ</strong>:<br>เจ้าหน้าที่จะตรวจสอบประวัติวินัยของผู้ต้องขัง<br>ใช้เวลาประมาณ 1-2 วันทำการ<br><br>หากสถานะยังคง "รอตรวจสอบ" เกิน 3 วัน กรุณาติดต่อเจ้าหน้าที่โดยตรง',
    contactUs: '📞 <strong>ติดต่อเจ้าหน้าที่</strong>:<br>สอบถามเพิ่มเติมได้ที่ ทัณฑสถานบำบัดพิเศษกลาง<br><br>หรือเยี่ยมชม <a href="https://main.correct.go.th" target="_blank" style="color:var(--blue);">main.correct.go.th</a>',
    bookingDetails: '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem;color:#FAFAFA;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div><strong>Ref No.</strong> {ref}</div><div>{status}</div></div><div style="font-size:13px;line-height:1.8;"><div><strong>👤 ผู้ร่วมกิจกรรม:</strong> {visitor}</div><div><strong>🔒 ผู้ต้องขัง:</strong> {prisoner}</div><div><strong>🏢 แดน:</strong> {wing}</div><div><strong>📅 วันที่เยี่ยม:</strong> {visitDate}</div><div><strong>💰 ค่าบริการ:</strong> {total}</div></div></div>',
    statusPrompt: '📌 หากต้องการตรวจสอบสถานะ ให้พิมพ์ <strong>Ref No.</strong> ของคุณ (เช่น VIS-12345)',
    greetingHello: '👋 สวัสดีครับ! ยินดีช่วยคุยเลขานุการ<br>ฉันเป็นผู้ช่วย AI ที่สามารถตอบคำถามเกี่ยวกับการจองเข้ากิจกรรมของทัณฑสถานบำบัดพิเศษกลาง<br><br>ลองถามมาได้เลย เช่น "ค่าใช้จ่ายเท่าไหร่" หรือ "จองยังไง"',
    notUnderstand: '❓ ขออภัย ฉันไม่เข้าใจคำถามนี้<br>ลองถามในหัวข้ออื่น เช่น "ค่าใช้จ่าย", "จองยังไง", หรือ "ตรวจสอบสถานะ"',
    statusApprovedPayment: '✅ อนุมัติ — รอชำระเงิน',
    statusPending: '⏳ รอตรวจสอบ',
    statusApproved: '✅ อนุมัติแล้ว',
    statusRejected: '❌ ไม่อนุมัติ',
    statusPaid: '💳 รอเจ้าหน้าที่ยืนยัน',
    statusCompleted: '✅ เสร็จสิ้นแล้ว',
    statusCancelled: '🚫 ยกเลิก'
  },
  en: {
    chatGreeting: '🤖 Hello! I\'m the M4RTHIN9 AI assistant for the reservation system. Feel free to ask any questions.',
    chatPlaceholder: 'Type your question...',
    chatClose: 'Close chat',
    overlayLoading: 'Submitting request...',
    noBookingFound: '🔍 No booking found for <strong>{ref}</strong><br>Please check the reference number<br><br><button onclick="window.retryStatusCheck&&window.retryStatusCheck()" style="margin-top:8px;padding:6px 12px;background:#fff;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Try Again</button>',
    paymentCost: '💰 <strong>Cost Details</strong> Adult: 1,000 THB per person (includes prisoner)<br>👶 Child 5-8 years: 500 THB<br>👶 Child under 5 years: Free<br><br>e.g. Family 2 + Prisoner 1 = 3,000 THB',
    bookingSteps: '📋 <strong>5-Step Booking Process</strong>:<br>① Click "Book Slot" button above<br>② Fill in visitor info, prisoner info, and select date<br>③ Get reference number (Ref No.) instantly<br>④ Wait for officer verification (1-2 business days)<br>⑤ Pay when approved',
    checkStatus: '🔍 <strong>Check Status</strong>:<br>Use <strong>Ref No.</strong> or <strong>Prisoner ID</strong> on the "Check Status" page<br><br>Possible statuses:<br>• Pending verification<br>• Pending visitor check<br>• Pending payment<br>• Paid<br>• Completed<br>• Rejected',
    daysTime: '📅 <strong>Days and Hours</strong>:<br>Bookings accepted on <strong>working days</strong><br>Mon – Fri (except public holidays)<br><br>Limited to 20 seats / day<br>System closes automatically when full',
    whatToBring: '📝 <strong>What to Bring</strong>:<br>• Present actual ID card<br>• No phones allowed in visit area<br><br>The activity includes Fine Dining 6-course meal',
    childAgePrice: '👶 <strong>Child Age &amp; Pricing</strong>:<br>• Under 5 years: Free<br>• 5-8 years: 500 THB<br>• Over 8 years: 1,000 THB (same as adult)',
    paymentMethod: '💳 <strong>Payment Method</strong>:<br>Payment can be made after approval<br>Payment link will be provided<br><br>Bank transfer service available',
    approvalTime: '⏱️ <strong>Processing Time</strong>:<br>Officers check prisoner disciplinary record<br>Takes approximately 1-2 business days<br><br>If still "Pending" after 3 days, contact officers directly',
    contactUs: '📞 <strong>Contact Officers</strong>:<br>Inquiries can be made at the institution<br><br>Or visit <a href="https://main.correct.go.th" target="_blank" style="color:var(--blue);">main.correct.go.th</a>',
    bookingDetails: '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem;color:#FAFAFA;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div><strong>Ref No.</strong> {ref}</div><div>{status}</div></div><div style="font-size:13px;line-height:1.8;"><div><strong>👤 Visitor:</strong> {visitor}</div><div><strong>🔒 Prisoner:</strong> {prisoner}</div><div><strong>🏢 Wing:</strong> {wing}</div><div><strong>📅 Visit Date:</strong> {visitDate}</div><div><strong>💰 Service Fee:</strong> {total}</div></div></div>',
    statusPrompt: '📌 To check status, type your <strong>Ref No.</strong> (e.g. VIS-12345)',
    greetingHello: '👋 Hello! How can I assist you?<br>I\'m the AI assistant for Chance & Change Cafe reservation system<br><br>Feel free to ask about "cost", "how to book", or "check status"',
    notUnderstand: '❓ Sorry, I don\'t understand this question<br>Try asking about "cost", "how to book", or "check status"',
    statusApprovedPayment: '✅ Approved — waiting for payment',
    statusPending: '⏳ Pending review',
    statusApproved: '✅ Approved',
    statusRejected: '❌ Rejected',
    statusPaid: '💳 Awaiting officer confirmation',
    statusCompleted: '✅ Completed',
    statusCancelled: '🚫 Cancelled'
  },
  zh: {
    chatGreeting: '🤖 您好！我是 M4RTHIN9 AI 助手，可以回答关于本场地预约的任何问题。',
    chatPlaceholder: '请输入问题...',
    chatClose: '关闭聊天',
    overlayLoading: '正在提交请求...',
    noBookingFound: '🔍 未找到参考编号为 <strong>{ref}</strong> 的预约<br>请检查参考编号是否正确<br><br><button onclick="window.retryStatusCheck&&window.retryStatusCheck()" style="margin-top:8px;padding:6px 12px;background:#fff;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:600;">重试</button>',
    paymentCost: '💰 <strong>费用详情</strong> 成人：1,000 泰铢/人（包含囚犯）<br>👶 5-8岁儿童：500 泰铢<br>👶 5岁以下儿童：免费<br><br>例如：家属2人 + 囚犯1人 = 3,000 泰铢',
    bookingSteps: '📋 <strong>5步预约流程</strong>:<br>① 点击上方"预约名额"<br>② 填写家属信息、囚犯信息并选择日期<br>③ 立即获取参考编号（Ref No.）<br>④ 等待工作人员审核（1-2个工作日）<br>⑤ 审核通过后付款',
    checkStatus: '🔍 <strong>查询状态</strong>:<br>在"查询状态"页面使用<strong>参考编号</strong>或<strong>囚犯编号</strong><br><br>可能的状态:<br>• 待审核<br>• 待访客确认<br>• 待付款<br>• 已付款<br>• 已完成<br>• 已拒绝',
    daysTime: '📅 <strong>日期与时间</strong>:<br>仅限<strong>工作日</strong>预约<br>星期一 – 星期五（公假除外）<br><br>每天限20个席位<br>满额后系统自动关闭',
    whatToBring: '📝 <strong>参观须知</strong>:<br>• 须出示真实身份证<br>• 访问区内禁止携带电话<br><br>活动包含6道菜Fine Dining',
    childAgePrice: '👶 <strong>儿童年龄与收费</strong>:<br>• 5岁以下：免费<br>• 5-8岁：500 泰铢/人<br>• 8岁以上：1,000 泰铢/人（与成人同价）',
    paymentMethod: '💳 <strong>付款方式</strong>:<br>审核通过后可以付款<br>系统将提供付款链接<br><br>支持银行转账',
    approvalTime: '⏱️ <strong>处理时间</strong>:<br>工作人员将审核囚犯纪律记录<br>约需1-2个工作日<br><br>如3天后仍显示"待审核"，请直接联系工作人员',
    contactUs: '📞 <strong>联系工作人员</strong>:<br>可到矫正院咨询<br><br>或访问 <a href="https://main.correct.go.th" target="_blank" style="color:var(--blue);">main.correct.go.th</a>',
    bookingDetails: '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem;color:#FAFAFA;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div><strong>Ref No.</strong> {ref}</div><div>{status}</div></div><div style="font-size:13px;line-height:1.8;"><div><strong>👤 参访者:</strong> {visitor}</div><div><strong>🔒 囚犯:</strong> {prisoner}</div><div><strong>🏢 区域:</strong> {wing}</div><div><strong>📅 参访日期:</strong> {visitDate}</div><div><strong>💰 服务费:</strong> {total}</div></div></div>',
    statusPrompt: '📌 如需查询状态，请输入您的 <strong>Ref No.</strong>（例如 VIS-12345）',
    greetingHello: '👋 您好！我能为您做些什么？<br>我是此活动预约系统的AI助手<br><br>随时可询问"费用"、"如何预约"或"查询状态"',
    notUnderstand: '❓ 抱歉，我不理解您的问题<br>请尝试询问"费用"、"如何预约"或"查询状态"',
    statusApprovedPayment: '✅ 已批准 — 等待付款',
    statusPending: '⏳ 待审核',
    statusApproved: '✅ 已批准',
    statusRejected: '❌ 已拒绝',
    statusPaid: '💳 等待工作人员确认',
    statusCompleted: '✅ 已完成',
    statusCancelled: '🚫 已取消'
  }
};

function getLang() {
  return localStorage.getItem('lang') || 'th';
}

function getI18n(key, lang = getLang()) {
  return (i18n[lang] && i18n[lang][key]) || i18n.th[key] || key;
}

function formatI18n(key, params = {}, lang = getLang()) {
  let text = getI18n(key, lang);
  Object.keys(params).forEach(param => {
    text = text.replace(`{${param}}`, params[param]);
  });
  return text;
}

// ===== SAFE FETCH WRAPPER =====
async function appsScriptGet(params) {
  const qs = new URLSearchParams(params).toString();
  let lastErr;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const resp = await appsScriptFetch('?' + qs, { redirect: 'follow', credentials: 'omit' }, 1);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const text = await resp.text();
      return JSON.parse(text);
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw lastErr || new Error('Failed to fetch');
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

function getStatusPill(status, lang = getLang()) {
  const s = normalizeStatus(status);
  if (s === 'รอชำระเงิน') return `<span class="status-pill status-approved">${getI18n('statusApprovedPayment', lang)}</span>`;
  if (s === 'รอตรวจสอบ') return `<span class="status-pill status-pending">${getI18n('statusPending', lang)}</span>`;
  if (s.includes('ไม่อนุมัติ')) return `<span class="status-pill status-rejected">${getI18n('statusRejected', lang)}</span>`;
  if (s.includes('อนุมัติ')) return `<span class="status-pill status-approved">${getI18n('statusApproved', lang)}</span>`;
  if (s.includes('ชำระ')) return `<span class="status-pill status-paid">${getI18n('statusPaid', lang)}</span>`;
  if (s.includes('เสร็จสิ้น')) return `<span class="status-pill" style="background:rgba(74,222,128,0.15);color:#4ADE80;border:1px solid rgba(74,222,128,0.3)">${getI18n('statusCompleted', lang)}</span>`;
  if (s.includes('ยกเลิก')) return `<span class="status-pill" style="background:rgba(255,255,255,0.06);color:#A3A3A3;border:1px solid rgba(255,255,255,0.1)">${getI18n('statusCancelled', lang)}</span>`;
  return `<span class="status-pill status-pending">${getI18n('statusPending', lang)}</span>`;
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
    const data = await appsScriptGet({ action: 'getAll' });
    if (data.status === 'ok') rows = data.rows || [];
  } catch (err) {
    console.error('[Chatbot] Fetch error:', err);
    if (APPS_SCRIPT_URL.includes('YOUR_GOOGLE')) {
      rows = getDemoRows();
    } else {
      return null;
    }
  }
  return rows.find(r => (r.ref || '').toUpperCase() === ref.toUpperCase()) || null;
}

const knowledgeBase = [
  {
    keywords: {
      th: ['ค่าใช้จ่าย', 'ค่าบริการ', 'ราคา', 'ราคาเท่าไหร่', 'ค่าสมัคร', 'ค่าจอง', 'บาท'],
      en: ['cost', 'price', 'fee', 'how much', 'payment amount', 'adult price', 'child price', 'charge'],
      zh: ['费用', '价格', '多少钱', '收费', '成人', '儿童', '价格']
    },
    responseKey: 'paymentCost'
  },
  {
    keywords: {
      th: ['จอง', 'จองคิว', 'ทำอย่างไร', 'ขั้นตอน', 'ขั้นตอนการจอง', 'เริ่มต้น', 'เริ่มจอง'],
      en: ['book', 'booking', 'reserve', 'reservation', 'how to book', 'steps', 'start booking', 'process'],
      zh: ['预约', '预订', '怎么预约', '步骤', '流程', '开始预约', '报名']
    },
    responseKey: 'bookingSteps'
  },
  {
    keywords: {
      th: ['เช็คสถานะ', 'ตรวจสอบสถานะ', 'สถานะ', 'ค้นหา', 'ref', 'เลขอ้างอิง', 'ผู้ต้องขัง'],
      en: ['check status', 'status', 'search', 'ref', 'reference number', 'prisoner id', 'prisoner number'],
      zh: ['查询状态', '状态', '搜索', '参考编号', '囚犯编号', '编号']
    },
    responseKey: 'checkStatus'
  },
  {
    keywords: {
      th: ['วัน', 'วันไหน', 'เวลา', 'เวลาเปิด', 'เปิด', 'ปิด', 'วันทำการ', 'กะ', 'เวลาจอง'],
      en: ['day', 'days', 'time', 'hours', 'open', 'closed', 'working days', 'schedule', 'hours'],
      zh: ['日期', '时间', '开放', '关闭', '工作日', '营业时间', '预约时间', '星期']
    },
    responseKey: 'daysTime'
  },
  {
    keywords: {
      th: ['นำอะไรไป', 'สิ่งที่ต้องเตรียม', 'อะไรบ้าง', 'ของที่ต้องใช้', 'ต้องเตรียม', 'อุปกรณ์', 'เอกสาร'],
      en: ['bring', 'prepare', 'document', 'id', 'phone', 'what to bring', 'rules'],
      zh: ['携带', '准备', '文件', '证件', '电话', '参观须知', '规则']
    },
    responseKey: 'whatToBring'
  },
  {
    keywords: {
      th: ['เด็ก', 'เด็กอายุ', 'ฟรี', 'เด็กไม่มีค่าใช้จ่าย', 'ฟรีค่าใช้จ่าย'],
      en: ['child', 'children', 'kid', 'age', 'free', 'under 5', '5-8'],
      zh: ['儿童', '小孩', '孩子', '年龄', '免费', '5岁以下', '5到8岁']
    },
    responseKey: 'childAgePrice'
  },
  {
    keywords: {
      th: ['ชำระเงิน', 'ชำระ', 'โอน', 'การชำระ', 'ชำระยังไง', 'วิธีชำระ'],
      en: ['pay', 'payment', 'payment method', 'transfer', 'bank', 'how to pay'],
      zh: ['付款', '支付', '转账', '银行', '付款方式', '怎么付款']
    },
    responseKey: 'paymentMethod'
  },
  {
    keywords: {
      th: ['อนุมัติ', 'ไม่อนุมัติ', 'ผลการตรวจสอบ', 'รอนาน', 'เช็คแล้ว', 'ดำเนินการ', 'เวลา', 'ใช้เวลานาน', 'นานแค่ไหน'],
      en: ['approval', 'approved', 'reject', 'rejected', 'pending', 'review', 'verify', 'verification', 'how long', 'processing time', 'long'],
      zh: ['批准', '审核', '审批', '拒绝', '待审核', '处理时间', '多久', '等待', '结果']
    },
    responseKey: 'approvalTime'
  },
  {
    keywords: {
      th: ['ติดต่อ', 'ติดต่อเจ้าหน้าที่', 'เบอร์', 'โทร', 'สาย', 'ช่วยเหลือ'],
      en: ['contact', 'officer', 'phone', 'call', 'help', 'support', 'number'],
      zh: ['联系', '工作人员', '电话', '帮助', '咨询', '号码']
    },
    responseKey: 'contactUs'
  },
  {
    keywords: {
      th: ['สวัสดี', 'หวัดดี', 'ครับ', 'ค่ะ'],
      en: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'start'],
      zh: ['你好', '您好', '哈喽', '嗨', '早上好', '下午好']
    },
    responseKey: 'greetingHello'
  }
];

const languageSignals = {
  th: ['ค่าใช้จ่าย', 'จอง', 'สถานะ', 'วัน', 'เวลา', 'ชำระเงิน', 'อนุมัติ', 'ติดต่อ', 'สวัสดี'],
  en: ['cost', 'price', 'fee', 'book', 'booking', 'status', 'payment', 'pay', 'approval', 'approved', 'contact', 'hello', 'hi', 'days', 'hours', 'child', 'children', 'bring', 'ref'],
  zh: ['费用', '预约', '状态', '付款', '审核', '联系', '你好', '您好', '参考编号', '囚犯', '儿童', '携带', '工作日']
};

function detectLanguage(message) {
  const lower = message.toLowerCase();
  const hasChinese = /[\u4e00-\u9fff]/.test(message);
  const hasThai = /[ก-๙]/.test(message);
  const hasEnglishLetters = /[a-z]/i.test(message);

  if (hasChinese || languageSignals.zh.some(kw => lower.includes(kw.toLowerCase()))) return 'zh';
  if (languageSignals.en.some(kw => lower.includes(kw)) || (hasEnglishLetters && !hasThai && !hasChinese)) return 'en';
  if (hasThai || languageSignals.th.some(kw => lower.includes(kw))) return 'th';

  return getLang();
}

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
    chatButton.style.transform = 'scale(0.9)';
    chatButton.style.opacity = '0.5';
    setTimeout(() => {
      chatButton.style.display = 'none';
      chatButton.style.transform = '';
      chatButton.style.opacity = '';
    }, 200);
    chatModal.classList.remove('hiding');
    chatModal.classList.add('show');
    restoreChatHistory();
    if (chatMessages.children.length === 0) {
      setTimeout(() => {
        addMessage(window.t ? window.t('chatGreeting') : '🤖 สวัสดี! ฉันเป็น M4RTHIN9 AI ผู้ช่วยตอบคำถามเกี่ยวกับการจองเข้ากิจกรรม ลองถามมาได้เลย', 'bot');
      }, 300);
    }
    updateChatbotUI();
  });

  window.retryStatusCheck = function () {
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
  chatModal.classList.add('hiding');
  chatModal.classList.remove('show');
  setTimeout(() => {
    chatModal.classList.remove('hiding');
    chatButton.style.display = 'flex';
  }, 250);
}

function showTypingIndicator() {
  const chatMessages = document.getElementById('chatMessages');
  const existing = chatMessages.querySelector('.chat-typing');
  if (existing) return;
  const typing = document.createElement('div');
  typing.className = 'chat-typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const chatMessages = document.getElementById('chatMessages');
  const typing = chatMessages.querySelector('.chat-typing');
  if (typing) typing.remove();
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

  showTypingIndicator();
  getBotResponse(message).then(botReply => {
    removeTypingIndicator();
    setTimeout(() => addMessage(botReply, 'bot'), 200);
  });
}

function askQuestion(question) {
  addMessage(question, 'user');
  showTypingIndicator();
  getBotResponse(question).then(botReply => {
    removeTypingIndicator();
    setTimeout(() => addMessage(botReply, 'bot'), 200);
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

let restoreDelay = 0;

function saveChatHistory() {
  const chatMessages = document.getElementById('chatMessages');
  const history = Array.from(chatMessages.children)
    .filter(el => !el.classList.contains('chat-typing'))
    .map(el => ({
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
      restoreDelay = 0;
      JSON.parse(history).forEach(item => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${item.sender}`;
        msgDiv.innerHTML = item.text;
        msgDiv.style.animationDelay = `${restoreDelay}ms`;
        chatMessages.appendChild(msgDiv);
        restoreDelay += 50;
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch { }
  }
}

async function getBotResponse(message) {
  const activeLang = detectLanguage(message);
  const lower = message.toLowerCase();

  // Check for Ref No. pattern (VIS-XXXXX)
  const refMatch = message.match(/([Vv][Ii][Ss]-[0-9]{5})/i);
  if (refMatch) {
    const ref = refMatch[1].toUpperCase();
    const booking = await fetchBookingByRef(ref);
    if (booking === null && !APPS_SCRIPT_URL.includes('YOUR_GOOGLE')) {
      const lang = activeLang;
      if (lang === 'th') return '⚠️ ไม่สามารถเชื่อมต่อระบบได้ในขณะนี้ — กรุณาลองใหม่ภายหลัง หรือใช้หน้า "ตรวจสอบสถานะ"';
      if (lang === 'zh') return '⚠️ 目前无法连接系统 — 请稍后再试或使用"查询状态"页面';
      return '⚠️ Cannot connect to the system at the moment — please try again later or use the "Check Status" page';
    }
    if (!booking) {
      return formatI18n('noBookingFound', { ref: escHtml(ref) }, activeLang);
    }

    const statusPill = getStatusPill(booking.status, activeLang);
    const currency = activeLang === 'th' ? 'บาท' : activeLang === 'zh' ? '泰铢' : 'THB';
    return formatI18n('bookingDetails', {
      ref: escHtml(booking.ref),
      status: statusPill,
      visitor: escHtml(booking.visitorName || '—'),
      prisoner: `${escHtml(booking.prisonerName || '—')} (#${escHtml(booking.prisonerId || '—')})`,
      wing: escHtml(booking.wing || '—'),
      visitDate: escHtml(booking.visitDate || '—'),
      total: `${(booking.total || 0).toLocaleString()} ${currency}`
    }, activeLang);
  }

  // Handle intents from knowledgeBase
  for (const item of knowledgeBase) {
    const keywords = item.keywords[activeLang] || item.keywords.th || [];
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      if (item.responseKey === 'checkStatus') {
        setChatContext({ intent: 'checkStatus', step: 1 });
        return `${getI18n(item.responseKey, activeLang)}<br><br>${getI18n('statusPrompt', activeLang)}`;
      }
      return getI18n(item.responseKey, activeLang);
    }
  }

  return getI18n('notUnderstand', activeLang);
}

document.addEventListener('DOMContentLoaded', initChatbot);