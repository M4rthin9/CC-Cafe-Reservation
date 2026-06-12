# เพิ่มระบบหลายภาษา (English/Chinese) ให้เว็บไซต์

## วัตถุประสงค์
เพิ่มเวอร์ชันภาษาอังกฤษและจีนส์ด้วยระบบสลับภาษา

## โครงสร้างไฟล์ที่จะสร้าง

```
/src/
  /lang/
    - th.json    (ภาษาไทย - ค่าเริ่มต้น เดิมจาก HTML)
    - en.json    (ภาษาอังกฤษ)
    - zh.json    (ภาษาจีนส์)
  /js/
    - lang.js    (ระบบจัดการภาษา - โหลด/แปลข้อความ)
```

## ขั้นตอนการทำงาน

### 1. สร้างไฟล์ภาษา (JSON)
- สร้าง `/src/lang/th.json` - กุญแจภาษาไทยทั้งหมด
- สร้าง `/src/lang/en.json` - คำแปลภาษาอังกฤษ
- สร้าง `/src/lang/zh.json` - คำแปลภาษาจีนส์

### 2. สร้าง Language Manager (`src/js/lang.js`)
```javascript
const LANG = {
  current: 'th',
  translations: {},
  async load(lang) { ... },
  t(key) { ... },
  switchLang(lang) { ... }
};
```

### 3. แก้ไข HTML ทั้งหมด
- เพิ่ม language switcher ที่ header
- เปลี่ยนข้อความแบบ inline เป็น `data-key` attributes
- เพิ่ม CSS สำหรับ language switcher

### 4. แก้ไข JavaScript ที่เกี่ยวข้อความ
- `chatbot.js` - แปล response และ quick buttons
- `booking.js` - แปลข้อความ validation/error
- `status.js` - แปลข้อความแสดงผล

### 5. แก้ไข CSS
- เพิ่มฟอนต์ภาษาจีนส์ (Noto Sans SC)
- ปรับ layout รองรับการซ้ำซาก

## รายการข้อความ (Keys) ที่ต้องแปล

### หน้าแรก (index.html)
- `hero.badge` - ระบบออนไลน์ · ทัณฑสถานบำบัดพิเศษกลาง
- `hero.title` - โครงการจัดการเรียนรู้...
- `hero.subtitle` - จองคิวเพื่อร่วมกิจกรรม...
- `hero.book` - จองคิวเพื่อร่วมกิจกรรม
- `hero.status` - ตรวจสอบสถานะการจอง
- `info.time` - วันและเวลา
- `info.tables` - จำนวนโต๊ะต่อวัน
- `info.price` - ค่าบริการอาหาร
- `info.rules` - ข้อปฏิบัติ
- ... และอื่นๆ

### หน้าจอง (booking.html)
- ฟอร์ม, validation, ขั้นตอน, ข้อความยืนยัน

### หน้าตรวจสอบสถานะ (status.html)
- ป้าย, ปุ่ม, สถานะ, ข้อความ not found

### หน้าแอดมิน (admin.html)
- ตาราง, ปุ่ม action, modal

### Chatbot
- knowledge base แต่ละ intent
- quick buttons
- ข้อความตอบกลับ

## Language Switcher Design
- ตำแหน่ง: มุมขวาบนของทุกหน้า
- รูปแบบ: มาตรฐาน 3 ปุ่ม (ไทย/EN/ZH)
- เก็บค่าใน `localStorage.lang`
- โหลดภาษาโดยอัตโนมัติเมื่อเปิดหน้า

## คำแปลตัวอย่าง

| Key | Thai | English | Chinese (Simplified) |
|-----|------|---------|-------------------|
| hero.badge | ระบบออนไลน์ · ทัณฑสถานบำบัดพิเศษกลาง | Online System · Special Correctional Facility | 在线系统 · 特殊矫正机构 |
| hero.book | จองคิวเพื่อร่วมกิจกรรม | Book Visit Activity | 预约参与活动 |
| hero.status | ตรวจสอบสถานะการจอง | Check Booking Status | 查看预约状态 |

## งานที่ทำ

- `src/lang/th.json` - สร้างใหม่
- `src/lang/en.json` - สร้างใหม่
- `src/lang/zh.json` - สร้างใหม่
- `src/js/lang.js` - สร้างใหม่
- `index.html` - แก้ไข
- `booking.html` - แก้ไข
- `status.html` - แก้ไข
- `admin.html` - แก้ไข
- `test_connection.html` - แก้ไข (เล็กน้อย)
- `src/js/chatbot.js` - แก้ไขให้ใช้ระบบภาษา
- `src/js/booking.js` - แก้ไขให้ใช้ระบบภาษา
- `src/css/*.css` - เพิ่มฟอนต์จีนส์