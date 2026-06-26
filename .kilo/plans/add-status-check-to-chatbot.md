# เพิ่มฟังก์ชันตรวจสอบสถานะการจองให้ Chatbot

## วัตถุประสงค์
ให้ chatbot สนทนาแบบ multi-turn ตอบคำถามและตรวจสอบสถานะการจอง (Ref No.) โดยใช้ API เดียวกับหน้า status.html

## โครงสร้างปัจจุบัน
- `src/js/chatbot.js` - มี knowledge base แบบ static string matching
- `src/js/status.js` - มีฟังก์ชัน `appsScriptGet({ action: 'getAll', pass: STAFF_PASS })` ดึงข้อมูล
- `index.html` - มี chatbot UI พร้อม element `chatMessages`, `chatInput`

## ขั้นตอนการทำงาน

### 1. เพิ่ม Config และ Context Storage
- เพิ่มคงที่ `APPS_SCRIPT_URL` และ `STAFF_PASS` สำหรับเชื่อมต่อ API
- เพิ่ม `chatContext` object เพื่อเก็บ context ของการสนทนา (Ref, ประวัติคำถาม)

### 2. เพิ่มฟังก์ชัน fetch ข้อมูล
- เพิ่มฟังก์ชัน `fetchBookingByRef(ref)` เรียก API `{"action":"getAll"}` แล้วกรองตาม ref
- คืนข้อมูล booking object พร้อมข้อมูลครบถ้วน

### 3. ปรับ getBotResponse() ให้เป็น async
- ตรวจจับรูปแบบ Ref No. (VIS-XXXXX) จากข้อความผู้ใช้
- ถ้าเจอ Ref ให้เรียก API และแสดงผลแบบ rich
- รองรับ multi-turn: ถ้าผู้ใช้บอก "อยากถามสถานะ" ให้ถาม Ref ต่อ

### 4. เพิ่ม Intent Handler หลายอย่าง
- Intent: "สถานะการจอง" → ถาม Ref No. → แสดงสถานะ
- Intent: "คำแนะนำการจอง" → ถามขั้นตอน/วันที่/ค่าใช้จ่าย
- Intent: "ติดต่อเจ้าหน้าที่" → แสดงข้อมูลติดต่อ + โอกาสให้ user ส่งข้อความตรงๆ

### 5. ปรับ UI Quick Buttons
- เพิ่มปุ่ม: "สถานะการจอง", "คำแนะนำจอง", "ติดต่อเจ้าหน้าที่"
- แสดง quick replies ตามบริบทการสนทนา

### 6. เก็บ Context
- ใช้ `sessionStorage` เก็บ `chatHistory` เพื่อคง context ของการสนทนา
- เมื่อผู้ใช้กลับมาใน session เดียวกัน จะคงประวัติการสนทนา

## การทดสอบ
- ผู้ใช้พิมพ์ "สถานะการจอง" → bot ถาม "กรุณาใส่ Ref No." → ผู้ใช้พิมพ์ "VIS-12345" → แสดงสถานะ
- ผู้ใช้พิมพ์ "VIS-12345 อยู่สถานะไหน" → แสดงสถานะทันที
- จัดการกรณีไม่พบ Ref: "ไม่พบ Ref นี้ กรุณาเช็คหรือใส่ใหม่" + ปุ่มให้ลองใหม่

## ไฟล์ที่แก้ไข
- `src/js/chatbot.js` - เพิ่ม API, async response, context management
- `index.html` - ปรับ quick buttons (optional)