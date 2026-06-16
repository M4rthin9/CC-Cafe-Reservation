// ===== i18n Configuration =====
let currentLang = localStorage.getItem('lang') || 'th';

const translations = {
  th: {
    // Index page
    appName: "ระบบจองคิวเพื่อร่วมกิจกรรม",
    heroBadge: "ระบบออนไลน์ · ทัณฑสถานบำบัดพิเศษกลาง",
    heroTitle: "โครงการจัดการเรียนรู้<br>การฝึกวิชาชีพด้านอาหารและงานบริการฯ",
    heroSub: "จองคิวเพื่อร่วมกิจกรรม · รอเจ้าหน้าที่ตรวจสอบ · ชำระเงินหลังได้รับการอนุมัติ",
    btnBook: "จองคิวเพื่อร่วมกิจกรรม",
    btnBookSub: "กรอกข้อมูล รับเลขอ้างอิงทันที",
    btnStatus: "ตรวจสอบสถานะ",
    btnStatusSub: "ใช้ Ref No. หรือเลขผู้ต้องขัง",
    step1: "กรอกข้อมูล<br>จอง",
    step2: "รอตรวจสอบ<br>วินัย",
    step3: "ได้รับการ<br>อนุมัติ",
    step4: "ชำระค่าร่วมกิจกรรม<br>ยืนยันนัด",
    infoHeading: "ข้อมูลสำคัญ",
    dayTime: "วันและเวลา",
    dayTimeDesc: "เปิดรับจองเฉพาะ<strong>วันทำการ</strong><br>จันทร์ – ศุกร์ (ยกเว้นวันหยุดราชการ)",
    seats: "จำนวนโต๊ะต่อวัน",
    seatsDesc: "รับจองได้ <strong>20 โต๊ะ / วัน</strong><br>เมื่อเต็มแล้วระบบจะปิดรับโดยอัตโนมัติ",
    price: "ค่าบริการอาหาร",
    priceDesc: "<strong>1,000 บาท / คน</strong> (คิดรวมผู้ต้องขัง)<br>เช่น ญาติ 2 + ผู้ต้องขัง 1 = 3,000 บาท",
    rules: "ข้อปฏิบัติ",
    rulesDesc: "แสดงบัตรประชาชนตัวจริง<br>ห้ามนำโทรศัพท์เข้าพื้นที่เยี่ยม",
    stepsHeading: "ขั้นตอนการจอง",
    stepGuide: "① กรอกข้อมูลจอง &mdash; กรอกข้อมูลผู้เข้าร่วมกิจกรรม ข้อมูลผู้ต้องขัง และเลือกวันที่ต้องการเข้าร่วมกิจกรรม<br>② รับเลขอ้างอิง (Ref No.) &mdash; ระบบออกเลขอ้างอิงให้ทันที กรุณาเก็บไว้<br>③ รอผลตรวจสอบวินัย &mdash; เจ้าหน้าที่จะตรวจสอบประวัติและกดรับจอง (1–2 วันทำการ)<br>④ ตรวจสอบสถานะ &mdash; ใช้ Ref No. หรือเลขประจำตัวผู้ต้องขัง ตรวจสอบสถานะได้ที่หน้า \"ตรวจสอบสถานะ\"<br>⑤ ชำระเงิน &mdash; เมื่อสถานะ \"อนุมัติ\" จะมีลิงก์ชำระค่าร่วมกิจกรรมให้ดำเนินการต่อ",
    ctaJoin: "📋 ร่วมกิจกรรม",
    ctaCheck: "🔍 ตรวจสอบสถานะ",
    footer: "ทัณฑสถานบำบัดพิเศษกลาง · กรมราชทัณฑ์<br>สอบถามเพิ่มเติมติดต่อเจ้าหน้าที่ ณ ทัณฑสถาน",
    
    // Booking page
    bookingTitle: "จองคิวเพื่อร่วมกิจกรรม",
    backHome: "หน้าหลัก",
    bookingBadge: "จองคิวเพื่อเข้าร่วมกิจกรรม",
    bookingH1: "โครงการการจัดการเรียนรู้การฝึกวิชาชีพด้านอาหารฯ",
    bookingP: "ทัณฑสถานบำบัดพิเศษกลาง · กรอกข้อมูลให้ครบถ้วนเพื่อจอง",
    stepBooking: "ข้อมูลการจอง",
    stepConfirm: "ยืนยันข้อมูล",
    stepRef: "รับเลขอ้างอิง",
    visitorInfo: "ข้อมูลผู้เข้าร่วมกิจกรรม",
    prisonerInfo: "ข้อมูลผู้ต้องขัง",
    selectDate: "วันที่ต้องการเข้าร่วมกิจกรรม",
    confirmRules: "ข้อปฏิบัติ:",
    confirmInfo: "ตรวจสอบข้อมูลการจอง",
    afterSubmit: "⏳ หลังส่งคำขอจอง:",
    afterSubmitText: "เจ้าหน้าที่จะตรวจสอบประวัติวินัยของผู้ต้องขัง (1–2 วันทำการ)",
    checkStatusInfo: "🔍 ตรวจสอบสถานะ:",
    checkStatusInfoText: "ใช้ <strong>Ref No.</strong> หรือ <strong>เลขผู้ต้องขัง</strong> ในหน้า \"ตรวจสอบสถานะ\"",
    paymentInfo: "💰 ชำระเงิน:",
    paymentInfoText: "เมื่อสถานะ \"อนุมัติ\" จะมีลิงก์ชำระเงินให้ดำเนินการต่อ",
    editBtn: "แก้ไข",
    submitBtn: "ส่งคำขอจอง",
    successTitle: "ส่งคำขอจองสำเร็จ!",
    successSub: "เจ้าหน้าที่จะตรวจสอบประวัติวินัยและดำเนินการภายใน 1–2 วันทำการ",
    refLabel: "เลขอ้างอิง (Ref No.)",
    saveRef: "กรุณาบันทึกเลขอ้างอิงนี้ไว้ · ใช้ตรวจสอบสถานะการจอง",
    checkStatusBtn: "ตรวจสอบสถานะ",
    copyRef: "คัดลอก Ref",
    newBooking: "ทำรายการใหม่",
    mainVisitor: "ผู้จองหลัก (ผู้ติดต่อ)",
    allVisitors: "ผู้เข้าร่วมกิจกรรมทั้งหมด",
    prisonerInfoConfirm: "ผู้ต้องขังที่เข้าร่วม",
    costSummary: "สรุปค่าบริการ",
    verifyInfo: "โปรดตรวจสอบให้แน่ใจว่าข้อมูลข้างต้นถูกต้องทุกประการ<br>หลังส่งคำขอแล้วจะได้รับเลขอ้างอิงทันทีเพื่อติดตามสถานะ",
    copySummary: "คัดลอกสรุปการจองของฉัน (บันทึกส่วนตัว)",
    copied: "คัดลอกแล้ว",
    
    // Form labels
    nameLabel: "ชื่อ-นามสกุล",
    namePlaceholder: "เช่น สมชาย ใจดี",
    idLabel: "เลขบัตรประชาชน",
    idPlaceholder: "X-XXXX-XXXXX-XX-X",
    phoneLabel: "หมายเลขโทรศัพท์",
    phonePlaceholder: "08X-XXX-XXXX",
    relationLabel: "ความสัมพันธ์",
    relationPlaceholder: "-- เลือก --",
    relationFather: "บิดา / มารดา",
    relationPartner: "แฟน/ภรรยา",
    relationChild: "บุตร / ธิดา",
    relationSibling: "พี่ / น้อง",
    relationRelative: "ญาติ",
    relationFriend: "เพื่อน",
    relationLawyer: "ทนายความ",
    relationOther: "อื่น ๆ",
    religionLabel: "ศาสนา",
    allergyLabel: "การแพ้อาหาร",
    allergyPlaceholder: "ระบุอาการแพ้ หรือ 'ไม่มี'",
    visitorCountLabel: "จำนวนผู้เข้าร่วมกิจกรรม",
    visitorCountSub: "(ไม่รวมผู้ต้องขัง · สูงสุด 10 คน)",
    extraVisitorTitle: "ผู้เข้าร่วมกิจกรรมเพิ่มเติม",
    extraVisitorSub: "(ผู้เข้าร่วมกิจกรรมคนที่ 2 เป็นต้นไป)",
    extraVisitorName: "ชื่อ-นามสกุล",
    extraVisitorId: "เลขบัตรประชาชน",
    extraVisitorReligion: "ศาสนา",
    extraVisitorAllergy: "การแพ้อาหาร",
    extraVisitorRelation: "ความสัมพันธ์",
    extraVisitorAge: "อายุ (ปี)",
    ageChildText: " (อายุ {age} ปี)",
    ageChildRule: " (อายุ <5 ฟรี, 5-8=500, >8=1000)",
    
    // Status page
    statusTitle: "ตรวจสอบสถานะการจอง",
    statusH1: "ตรวจสอบสถานะการจอง",
    statusP: "ใช้เลขอ้างอิง (Ref No.) หรือเลขประจำตัวผู้ต้องขัง",
    statusSearch: "ค้นหาการจอง",
    refTab: "Ref No.",
    prisonerTab: "เลขผู้ต้องขัง",
    checkStatus: "ตรวจสอบสถานะ",
    refLabelShort: "เลขอ้างอิง (เช่น VIS-12345)",
    prisonerIdLabelShort: "หมายเลขผู้ต้องขัง",
    searchAgain: "ค้นหาอีกครั้ง",
    backHomeShort: "กลับหน้าหลัก",
    successPage: "ชำระเงินและจองสำเร็จ!",
    successPageSub: "เจ้าหน้าที่จะยืนยันนัดหมายผ่านโทรศัพท์ภายใน 1 วันทำการ",
    
    // Calendar
    calPrev: "‹",
    calNext: "›",
    quotaAvailable: "ว่าง",
    quotaFull: "เต็ม (20/20)",
    quotaPast: "ผ่านแล้ว",
    quotaHoliday: "หยุด/วันหยุดราชการ",
    
    // Chatbot
    chatGreeting: "🤖 สวัสดี! ฉันเป็น M4RTHIN9 AI ผู้ช่วยตอบคำถามเกี่ยวกับการจองเข้ากิจกรรม ลองถามมาได้เลย",
    chatPlaceholder: "พิมพ์คำถาม...",
    chatClose: "ปิดแชท",
    retry: "ลองใหม่",
    copiedSuccess: "✅ คัดลอกแล้ว! สามารถวางส่งต่อแผนกได้เลย",
    copyFallback: "คัดลอกข้อความด้านล่าง (กด Ctrl+C):",
    
    // Validation/alerts
    alertFill: "กรุณากรอก ",
    alertSelectDate: "กรุณาเลือกวันที่ต้องการร่วมกิจกรรม",
    alertDateFull: "วันที่เลือกเต็มแล้ว กรุณาเลือกวันอื่น",
    alertConsent: "กรุณายืนยันและยินยอมก่อนดำเนินการ",
    alertNoMatch: "⚠️ ไม่สามารถจองได้\\n\\nมีการจองผู้ต้องขังหมายเลข \"{id}\" ในวันนี้อยู่แล้ว\\n\\nกรุณาเลือกวันอื่น หรือตรวจสอบสถานะการจองเดิม",
    alertSubmitFail: "❌ การส่งคำขอจองล้มเหลว\\n\\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองใหม่อีกครั้ง\\nหรือติดต่อเจ้าหน้าที่หากปัญหายังคงอยู่",
    
    // Common
    home: "หน้าหลัก",
    loadingPrisoners: "⏳ กำลังโหลดรายชื่อผู้ต้องขังจากฐานข้อมูล...",
    loadSuccess: "✓ โหลดรายชื่อสำเร็จ ({count} คน)",
    loadFail: "⚠️ โหลดรายชื่อจากฐานข้อมูลไม่ได้ — กรอกเองได้ชั่วคราว"
  },
  
  en: {
    // Index page  
    heroBadge: "Online System · Central Special Correctional Institution",
    heroTitle: "Vocational Training Program<br>Food & Service Career Learning",
    heroSub: "Reserve a slot to join activities · Wait for officer verification · Pay after approved",
    btnBook: "Book a Slot",
    btnBookSub: "Fill in details & get reference number instantly",
    btnStatus: "Check Status",
    btnStatusSub: "Use Ref No. or prisoner ID",
    step1: "Fill<br>Booking Info",
    step2: "Wait for<br>Review",
    step3: "Approved &<br>Confirmed",
    step4: "Pay &<br>Confirm Visit",
    infoHeading: "Important Information",
    dayTime: "Days & Hours",
    dayTimeDesc: "Open for booking on <strong>working days</strong><br>Mon – Fri (except public holidays)",
    seats: "Seats per day",
    seatsDesc: "Maximum <strong>20 seats / day</strong><br>System closes automatically when full",
    price: "Food Service Fee",
    priceDesc: "<strong>1,000 THB per person</strong> (includes prisoner)<br>e.g. Family 2 + Prisoner 1 = 3,000 THB",
    rules: "Rules",
    rulesDesc: "Present actual ID card<br>No phones allowed in visit area",
    stepsHeading: "How to Book",
    stepGuide: "① Fill booking info &mdash; Enter visitor info, prisoner info, and select date<br>② Get reference number (Ref No.) &mdash; System generates immediately, please keep it<br>③ Wait for review &mdash; Officer will check background and confirm booking (1-2 business days)<br>④ Check status &mdash; Use Ref No. or prisoner ID at \"Check Status\" page<br>⑤ Pay &mdash; When status shows \"Approved\", payment link will be available",
    ctaJoin: "📋 Join Activity",
    ctaCheck: "🔍 Check Status",
    footer: "Central Special Correctional Institution · Department of Corrections<br>For inquiries, contact officers at the institution",
    
    // Booking page
    bookingTitle: "Book a Slot",
    backHome: "Home",
    bookingBadge: "Book to Join Activity",
    bookingH1: "Vocational Training Program",
    bookingP: "Central Special Correctional Institution · Fill in complete information to book",
    stepBooking: "Booking Info",
    stepConfirm: "Confirm Info",
    stepRef: "Get Reference No.",
    visitorInfo: "Visitor Information",
    prisonerInfo: "Prisoner Information",
    selectDate: "Select Visit Date",
    confirmRules: "Rules:",
    confirmInfo: "Verify Booking Information",
    afterSubmit: "After Submitting:",
    afterSubmitText: "Officer will verify prisoner disciplinary record (1-2 business days)",
    checkStatusInfo: "Check Status:",
    checkStatusInfoText: "Use <strong>Ref No.</strong> or <strong>Prisoner ID</strong> on \"Check Status\" page",
    paymentInfo: "Payment:",
    paymentInfoText: "When status shows \"Approved\", payment link will be available",
    editBtn: "Edit",
    submitBtn: "Submit Booking",
    successTitle: "Booking Request Sent!",
    successSub: "Officer will verify disciplinary record within 1-2 business days",
    refLabel: "Reference No.",
    saveRef: "Please save this reference number · Use to check booking status",
    checkStatusBtn: "Check Status",
    copyRef: "Copy Ref",
    newBooking: "New Booking",
    mainVisitor: "Main Contact",
    allVisitors: "All Visitors",
    prisonerInfoConfirm: "Prisoner",
    costSummary: "Cost Summary",
    verifyInfo: "Please verify all information is correct<br>You will receive reference number immediately after submission",
    copySummary: "Copy My Booking Summary (Personal Record)",
    
    // Form labels
    nameLabel: "Name",
    namePlaceholder: "e.g. Somchai Jai Dee",
    idLabel: "ID Card Number or Passport Number",
    idPlaceholder: "X-XXXX-XXXXX-XX-X",
    phoneLabel: "Phone Number",
    phonePlaceholder: "08X-XXX-XXXX",
    relationLabel: "Relationship",
    relationPlaceholder: "-- Select --",
    relationFather: "Father / Mother",
    relationPartner: "Girlfriend / Wife",
    relationChild: "Child / Daughter",
    relationSibling: "Brother / Sister",
    relationRelative: "Relative",
    relationFriend: "Friend",
    relationLawyer: "Lawyer",
    relationOther: "Other",
    religionLabel: "Religion",
    allergyLabel: "Food Allergy",
    allergyPlaceholder: "Specify allergy or 'None'",
    visitorCountLabel: "Number of Participants",
    visitorCountSub: "(excludes prisoner · max 10 people)",
    extraVisitorTitle: "Additional Participants",
    extraVisitorSub: "(Participant #2 onwards)",
    extraVisitorName: "Name",
    extraVisitorId: "ID Card Number",
    extraVisitorReligion: "Religion",
    extraVisitorAllergy: "Food Allergy",
    extraVisitorRelation: "Relationship",
    extraVisitorAge: "Age (years)",
    ageChildText: " (Age {age} years)",
    ageChildRule: " (<5 free, 5-8=500, >8=1000)",
    
    // Status page
    statusTitle: "Check Booking Status",
    statusH1: "Check Booking Status",
    statusP: "Use reference number or prisoner ID number",
    statusSearch: "Search Booking",
    refTab: "Ref No.",
    prisonerTab: "Prisoner ID",
    checkStatus: "Check Status",
    refLabelShort: "Reference No. (e.g. VIS-12345)",
    prisonerIdLabelShort: "Prisoner ID Number",
    searchAgain: "Search Again",
    backHomeShort: "Back to Home",
    successPage: "Payment & Booking Successful!",
    successPageSub: "Officer will confirm appointment by phone within 1 business day",
    
    // Calendar
    calPrev: "‹",
    calNext: "›",
    quotaAvailable: "Available",
    quotaFull: "Full (20/20)",
    quotaPast: "Past",
    quotaHoliday: "Holiday/Public Holiday",
    
    // Chatbot
    chatGreeting: "🤖 Hello! I'm the M4RTHIN9 AI assistant for the reservation system. Feel free to ask any questions.",
    chatPlaceholder: "Type your question...",
    chatClose: "Close chat",
    retry: "Try Again",
    copySuccess: "Copied!",
    copiedSuccess: "✅ Copied! You can paste to share.",
    copyFallback: "Copy the text below (Ctrl+C):",
    
    // Common
    home: "Home",
    loadingPrisoners: "⏳ Loading prisoner list...",
    loadSuccess: "✓ Loaded ({count} people)",
    loadFail: "⚠️ Failed to load from database — manual entry available"
  },
  
  zh: {
    // Index page  
    heroBadge: "在线系统 · 中央特别矫正院",
    heroTitle: "职业训练计划<br>食品与服务职业学习",
    heroSub: "预约参与活动 · 等待工作人员审核 · 审核通过后付款",
    btnBook: "预约名额",
    btnBookSub: "填写信息 即刻获取参考编号",
    btnStatus: "查询状态",
    btnStatusSub: "使用参考编号或囚犯编号",
    step1: "填写<br>预约信息",
    step2: "等待<br>审核",
    step3: "审核通过<br>确认",
    step4: "付款 &<br>确认访问",
    infoHeading: "重要信息",
    dayTime: "日期与时间",
    dayTimeDesc: "仅在<strong>工作日</strong>接受预约<br>星期一 – 星期五（公假除外）",
    seats: "每日席位",
    seatsDesc: "最多可预约 <strong>20 个席位 / 天</strong><br>满额后系统自动关闭",
    price: "餐饮服务费",
    priceDesc: "<strong>1,000 泰铢每人</strong>（包含囚犯）<br>例如：家属 2 人 + 囚犯 1 人 = 3,000 泰铢",
    rules: "注意事项",
    rulesDesc: "须出示真实身份证<br>不得携带电话进入访问区",
    stepsHeading: "预约步骤",
    stepGuide: "① 填写预约信息 &mdash; 输入家属信息、囚犯信息并选择日期<br>② 获取参考编号 (Ref No.) &mdash; 系统立即生成，请保存好<br>③ 等待审核 &mdash; 工作人员将审核背景（1–2 个工作日）<br>④ 查询状态 &mdash; 使用参考编号或囚犯编号在 \"查询状态\" 页面查询<br>⑤ 付款 &mdash; 当状态显示 \"已批准\" 时，将提供付款链接",
    ctaJoin: "📋 参与活动",
    ctaCheck: "🔍 查询状态",
    footer: "中央特别矫正院 · 泰国监狱局<br>如需查询，请联系矫正院工作人员",
    
    // Booking page
    bookingTitle: "预约名额",
    backHome: "主页",
    bookingBadge: "预约参与活动",
    bookingH1: "职业训练计划",
    bookingP: "中央特别矫正院 · 请填写完整信息进行预约",
    stepBooking: "预约信息",
    stepConfirm: "确认信息",
    stepRef: "获取参考编号",
    visitorInfo: "家属信息",
    prisonerInfo: "囚犯信息",
    selectDate: "选择参访日期",
    confirmRules: "注意事项：",
    confirmInfo: "核对预约信息",
    afterSubmit: "提交后：",
    afterSubmitText: "工作人员将审核囚犯纪律记录（1–2 个工作日）",
    checkStatusInfo: "查询状态：",
    checkStatusInfoText: "使用<strong>参考编号</strong>或<strong>囚犯编号</strong>在 \"查询状态\" 页面",
    paymentInfo: "付款：",
    paymentInfoText: "当状态显示 \"已批准\" 时，将提供付款链接",
    editBtn: "编辑",
    submitBtn: "提交预约",
    successTitle: "预约请求提交成功！",
    successSub: "工作人员将于 1–2 个工作日内审核纪律记录",
    refLabel: "参考编号",
    saveRef: "请保存参考编号 · 用于查询预约状态",
    checkStatusBtn: "查询状态",
    copyRef: "复制参考编号",
    newBooking: "新预约",
    mainVisitor: "主要联系人",
    allVisitors: "所有参访者",
    prisonerInfoConfirm: "囚犯",
    costSummary: "费用总计",
    verifyInfo: "请确认以上信息全部正确<br>提交后将立即获取参考编号",
    copySummary: "复制我的预约摘要",
    
    // Form labels
    nameLabel: "姓名",
    namePlaceholder: "例如：张伟",
    idLabel: "身份证号码",
    idPlaceholder: "X-XXXX-XXXXX-XX-X",
    phoneLabel: "电话号码",
    phonePlaceholder: "08X-XXX-XXXX",
    relationLabel: "关系",
    relationPlaceholder: "-- 选择 --",
    relationFather: "父亲/母亲",
    relationPartner: "伴侣/配偶",
    relationChild: "子女",
    relationSibling: "兄弟/姐妹",
    relationRelative: "亲属",
    relationFriend: "朋友",
    relationLawyer: "律师",
    relationOther: "其他",
    religionLabel: "宗教",
    allergyLabel: "食物过敏",
    allergyPlaceholder: "说明过敏情况或 '无'",
    visitorCountLabel: "参访者人数",
    visitorCountSub: "(不含囚犯 · 最多 10 人)",
    extraVisitorTitle: "额外参访者",
    extraVisitorSub: "(参访者第 2 人起)",
    extraVisitorName: "姓名",
    extraVisitorId: "身份证号码",
    extraVisitorReligion: "宗教",
    extraVisitorAllergy: "食物过敏",
    extraVisitorRelation: "关系",
    extraVisitorAge: "年龄（岁）",
    ageChildText: " (年龄 {age} 岁)",
    ageChildRule: " (<5 岁免费, 5-8岁=500, >8岁=1000)",
    
    // Status page
    statusTitle: "查询预约状态",
    statusH1: "查询预约状态",
    statusP: "使用参考编号或囚犯编号",
    statusSearch: "搜索预约",
    refTab: "参考编号",
    prisonerTab: "囚犯编号",
    checkStatus: "查询状态",
    refLabelShort: "参考编号（例如 VIS-12345）",
    prisonerIdLabelShort: "囚犯编号",
    searchAgain: "重新搜索",
    backHomeShort: "返回主页",
    successPage: "付款和预约成功！",
    successPageSub: "工作人员将在 1 个工作日内电话确认预约",
    
    // Calendar
    calPrev: "‹",
    calNext: "›",
    quotaAvailable: "可用",
    quotaFull: "已满 (20/20)",
    quotaPast: "过去",
    quotaHoliday: "假日/公假",
    
    // Chatbot
    chatGreeting: "🤖 您好！我是此预约系统的AI助手。欢迎提问。",
    chatPlaceholder: "请输入问题...",
    chatClose: "关闭聊天",
    retry: "重试",
    copySuccess: "已复制！",
    copiedSuccess: "✅ 复制成功！可以粘贴分享。",
    copyFallback: "复制以下文本（Ctrl+C）：",
    
    // Common
    home: "主页",
    loadingPrisoners: "⏳ 正在从数据库加载囚犯列表...",
    loadSuccess: "✓ 已加载 ({count} 人)",
    loadFail: "⚠️ 无法从数据库加载 — 可暂时手动输入"
  }
};

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  updatePageTranslations();
  
  // Dispatch custom event for other scripts to listen to
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  
  // Update language switcher button text
  const langSwitcherBtn = document.querySelector('.lang-switcher button');
  if (langSwitcherBtn) {
    const langNames = { th: 'ไทย', en: 'EN', zh: '中文' };
    langSwitcherBtn.textContent = langNames[lang] || lang;
  }
}

function updatePageTranslations() {
  const t = translations[currentLang];
  if (!t) return;
  
  // Handle elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      if (el.tagName === 'INPUT' && el.type !== 'checkbox') {
        // Check if there's a placeholder translation key
        const placeholderKey = el.getAttribute('data-i18n-placeholder');
        if (placeholderKey && t[placeholderKey]) {
          el.placeholder = t[placeholderKey];
        }
      } else if (el.tagName === 'LABEL' || el.tagName === 'SPAN' || el.tagName === 'DIV' || el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'P' || el.tagName === 'STRONG') {
        el.innerHTML = t[key];
      } else if (el.tagName === 'BUTTON' && !el.querySelector('.ti')) {
        el.innerHTML = t[key];
      } else if (el.tagName === 'TITLE') {
        el.textContent = t[key];
      } else {
        el.innerHTML = t[key];
      }
    }
  });
  
  // Update specific elements by ID
  const titleEl = document.querySelector('title');
  if (titleEl && t.appName) {
    titleEl.textContent = t.appName;
  }
}

function toggleLanguage() {
  const langs = ['th', 'en', 'zh'];
  const currentIndex = langs.indexOf(currentLang);
  const nextIndex = (currentIndex + 1) % langs.length;
  setLanguage(langs[nextIndex]);
}

function t(key) {
  const lang = translations[currentLang] || translations.th;
  const value = lang[key] || translations.th[key] || key;
  return value;
}

function tc(key, params = {}) {
  let str = t(key);
  Object.keys(params).forEach(p => {
    str = str.replace(`{${p}}`, params[p]);
  });
  return str;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('lang')) {
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('en')) setLanguage('en');
    else if (browserLang.startsWith('zh')) setLanguage('zh');
    else setLanguage('th');
  } else {
    setLanguage(currentLang);
  }
});

// Export for global use
window.setLanguage = setLanguage;
window.toggleLanguage = toggleLanguage;
window.getCurrentLang = () => currentLang;
window.t = t;
window.tc = tc;