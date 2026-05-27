# คู่มือแก้ไขปัญหาการเชื่อมต่อ Google Apps Script

## 📋 สารบัญ
1. [ปัญหาที่พบบ่อย](#ปัญหาที่พบบ่อย)
2. [วิธีตรวจสอบและแก้ไข](#วิธีตรวจสอบและแก้ไข)
3. [การ Deploy Google Apps Script ที่ถูกต้อง](#การ-deploy-google-apps-script-ที่ถูกต้อง)
4. [การตรวจสอบ Sheet Structure](#การตรวจสอบ-sheet-structure)
5. [API Endpoints ที่พร้อมใช้งาน](#api-endpoints-ที่พร้อมใช้งาน)

---

## ปัญหาที่พบบ่อย

### ❌ ปัญหาที่ 1: ไม่สามารถดึงข้อมูลการจองได้

**อาการ:**
- หน้า admin.html ไม่แสดงข้อมูลการจอง
- หน้า booking.html ไม่แสดงจำนวน quota บนปฏิทิน
- ได้ response เป็น `{ status: 'error', message: 'Unauthorized' }`

**สาเหตุที่เป็นไปได้:**
1. รหัสผ่านไม่ถูกต้อง
2. Google Apps Script ไม่ได้ Deploy เป็น Web App
3. การตั้งค่า "Who has access" ไม่ถูกต้อง

**วิธีแก้ไข:**
```javascript
// ตรวจสอบว่าส่ง pass parameter ถูกต้อง
const resp = await fetch(APPS_SCRIPT_URL + '?action=getAll&pass=10900');
```

---

### ❌ ปัญหาที่ 2: ได้ response เป็น empty rows

**อาการ:**
- ได้ response `{ status: 'ok', rows: [] }` แต่ใน Sheet มีข้อมูล

**สาเหตุที่เป็นไปได้:**
1. Sheet name ไม่ตรง (สคริปต์ใช้ `'การจอง'` แต่ Sheet ใช้ชื่ออื่น)
2. ไม่มี column `'ref'` ใน Sheet
3. ข้อมูลใน column `'ref'` ว่างเปล่า

**วิธีแก้ไข:**

**ขั้นตอนที่ 1:** ตรวจสอบชื่อ Sheet
- เปิด Google Sheet
- ดูชื่อ tab ด้านล่าง ต้องชื่อ **"การจอง"** พอดี
- หากชื่อไม่ตรง ให้:
  - เปลี่ยนชื่อ tab เป็น "การจอง" **หรือ**
  - แก้ไขค่า `SHEET_NAME` ใน Google Apps Script

**ขั้นตอนที่ 2:** ตรวจสอบ column headers
- แถวแรกของ Sheet ต้องมี headers ดังนี้:
  ```
  ref, timestamp, visitorName, visitorId, visitorPhone, relation,
  extraVisitorNames, visitorApproved, extraVisitorApproved,
  prisonerName, prisonerId, wing, visitDate, visitDateISO,
  visitorCount, totalPersons, total, adultCount, child5to8Count, 
  childUnder5Count, status, slipImage
  ```
- หากไม่มี header `'ref'` ให้เพิ่ม column นี้เป็น column แรก

---

### ❌ ปัญหาที่ 3: Network Error / CORS Error

**อาการ:**
- เกิด error ใน browser console: "Failed to fetch" หรือ "CORS error"
- ไม่สามารถเชื่อมต่อได้เลย

**สาเหตุที่เป็นไปได้:**
1. Google Apps Script ไม่ได้ Deploy
2. URL ของ Apps Script ไม่ถูกต้อง
3. การตั้งค่า Deployment ไม่ถูกต้อง

**วิธีแก้ไข:**

#### ขั้นตอนการ Deploy Google Apps Script ที่ถูกต้อง:

1. **เปิด Google Apps Script**
   - ไปที่ Google Sheet
   - คลิก **Extensions** → **Apps Script**

2. **วางโค้ด**
   - คัดลอกโค้ดจาก `google_apps_script_updated.js`
   - วางลงใน Apps Script editor
   - บันทึก (File → Save)

3. **Deploy เป็น Web App**
   - คลิกปุ่ม **"Deploy"** (มุมขวาบน)
   - เลือก **"New deployment"**
   - คลิก gear icon ⚙️ เลือก **"Web app"**
   
4. **ตั้งค่า Deployment:**
   ```
   Description: CC Cafe Reservation API v1
   Execute as: Me (your-email@gmail.com)
   Who has access: Anyone
   ```
   **⚠️ สำคัญ:** ต้องเลือก "Anyone" เท่านั้น!

5. **คลิก "Deploy"**
   - อนุญาตการเข้าถึง (Authorize access)
   - เลือกบัญชี Google ของคุณ
   - คลิก "Advanced" → "Go to ... (unsafe)" → "Allow"

6. **คัดลอก URL**
   - คัดลอก Web app URL ที่ได้
   - นำไปแทนที่ `APPS_SCRIPT_URL` ในไฟล์ JavaScript ทั้งหมด

---

### ❌ ปัญหาที่ 4: Sheet name ไม่ตรง

**อาการ:**
- ระบบสร้าง Sheet ใหม่ชื่อ "การจอง" แต่ข้อมูลอยู่ใน Sheet อื่น

**วิธีแก้ไข:**

**ตัวเลือกที่ 1:** เปลี่ยนชื่อ Sheet tab
1. เปิด Google Sheet
2. คลิกขวาที่ tab ด้านล่าง
3. เลือก "Rename"
4. เปลี่ยนชื่อเป็น **"การจอง"**

**ตัวเลือกที่ 2:** แก้ไขโค้ด Apps Script
```javascript
// ใน google_apps_script_updated.js
// เปลี่ยนค่า SHEET_NAME เป็นชื่อ Sheet ของคุณ
const SHEET_NAME = 'Booking';  // หรือชื่อ Sheet ของคุณ
```

---

## วิธีตรวจสอบและแก้ไข

### ใช้หน้าทดสอบการเชื่อมต่อ

1. เปิดไฟล์ `test_connection.html` ในเบราว์เซอร์
2. ตรวจสอบ URL ของ Google Apps Script
3. คลิกปุ่ม "ทดสอบการเชื่อมต่อ"
4. ตรวจสอบผลลัพธ์:
   - ✅ สีเขียว = สำเร็จ
   - ❌ สีแดง = ล้มเหลว

### ตรวจสอบผ่าน Browser Console

1. เปิดหน้า admin.html หรือ booking.html
2. กด F12 เพื่อเปิด Developer Tools
3. ดูที่ Console tab
4. ค้นหา error messages

### ทดสอบ API โดยตรง

เปิด URL นี้ในเบราว์เซอร์:
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=testConnection
```

ควรได้ response:
```json
{
  "status": "ok",
  "message": "Connection successful",
  "spreadsheetName": "...",
  "spreadsheetId": "...",
  "allSheets": [...],
  "mainSheet": {...}
}
```

---

## การ Deploy Google Apps Script ที่ถูกต้อง

### ✅ การตั้งค่าที่ถูกต้อง:

```
┌─────────────────────────────────────┐
│ Deployment Configuration            │
├─────────────────────────────────────┤
│ Execute as:        Me               │
│ Who has access:    Anyone           │
│ Status:            Deployed         │
└─────────────────────────────────────┘
```

### ❌ การตั้งค่าที่ผิด (จะทำให้เกิด error):

```
// ผิด: Execute as "User accessing the web app"
// จะทำให้ผู้ใช้ต้อง login และมีสิทธิ์ใน Sheet

// ผิด: Who has access "Only myself"
// จะทำให้คนอื่นเข้าถึงไม่ได้

// ผิด: Who has access "Only users in my organization"
// จะทำให้คนนอกองค์กรเข้าถึงไม่ได้
```

---

## การตรวจสอบ Sheet Structure

### Sheet "การจอง" ต้องมีโครงสร้างดังนี้:

| Column Name | ตัวอย่างค่า | หมายเหตุ |
|-------------|-------------|----------|
| ref | VIS-12345 | เลขอ้างอิง (ต้องมี) |
| timestamp | 21/05/2568 09:12 | เวลาจอง |
| visitorName | สมชาย ใจดี | ชื่อผู้จอง |
| visitorId | 1-1001-12345-67-8 | เลขบัตรประชาชน |
| visitorPhone | 081-234-5678 | เบอร์โทร |
| relation | คู่สมรส | ความสัมพันธ์ |
| extraVisitorNames | ... | ชื่อผู้ร่วมกิจกรรม |
| visitorApproved | yes | อนุมัติผู้จองหลัก |
| extraVisitorApproved | yes;;no | อนุมัติผู้ร่วมกิจกรรม |
| prisonerName | สมศักดิ์ มั่นคง | ชื่อผู้ต้องขัง |
| prisonerId | 20010001 | หมายเลขผู้ต้องขัง |
| wing | แดน 3 | แดน |
| visitDate | 28 พฤษภาคม 2568 | วันที่เยี่ยม (ภาษาไทย) |
| visitDateISO | 2026-05-28 | วันที่เยี่ยม (ISO format) |
| visitorCount | 3 | จำนวนผู้เยี่ยม |
| totalPersons | 4 | จำนวนทั้งหมด |
| total | 3000 | ยอดเงิน |
| adultCount | 2 | จำนวนผู้ใหญ่ |
| child5to8Count | 1 | เด็ก 5-8 ปี |
| childUnder5Count | 0 | เด็กต่ำกว่า 5 ปี |
| status | รอตรวจสอบ | สถานะ |
| slipImage | URL | รูปสลิป |

### Sheet "Users" (สำหรับระบบ multi-user):

| Column Name | ตัวอย่างค่า |
|-------------|-------------|
| username | superadmin |
| password | super123 |
| department | ผู้บริหาร |
| role | superadmin |
| permissions | ["view_all","approve_reject",...] |
| active | TRUE |
| createdAt | 2026-05-21 10:00 |

### Sheet "EventLog" (สำหรับบันทึกกิจกรรม):

| Column Name | ตัวอย่างค่า |
|-------------|-------------|
| timestamp | 2026-05-21 10:00:00 |
| username | superadmin |
| action | login_success |
| targetRef | |
| details | {"role":"superadmin"} |
| result | success |
| ip | |
| userAgent | |

### Sheet "ผู้ต้องขัง" (ฐานข้อมูลผู้ต้องขัง):

| Column Name | ตัวอย่างค่า |
|-------------|-------------|
| prisonerId | 20010001 |
| prisonerName | สมศักดิ์ มั่นคง |
| wing | แดน 3 |
| status | active |
| note | |

---

## API Endpoints ที่พร้อมใช้งาน

### 1. ทดสอบการเชื่อมต่อ (ใหม่!)
```
GET: ?action=testConnection
Response: ข้อมูลการเชื่อมต่อและโครงสร้าง Sheet
```

### 2. ดูข้อมูล Sheet (ใหม่!)
```
GET: ?action=getSheetInfo&pass=10900
Response: ข้อมูลโครงสร้าง Sheet แบบละเอียด
```

### 3. ดึงข้อมูลการจองทั้งหมด
```
GET: ?action=getAll&pass=10900
Response: รายการจองทั้งหมด
```

### 4. ดึงข้อมูลผู้ต้องขัง
```
GET: ?action=getPrisoners
Response: รายการผู้ต้องขัง (public)
```

### 5. บันทึกการจองใหม่
```
POST: body = { action: 'saveReservation', ...data }
Response: { status: 'ok', ref: 'VIS-12345' }
```

### 6. อัปโหลดสลิป
```
POST: body = { 
  action: 'uploadSlip', 
  ref: 'VIS-12345', 
  base64Data: 'data:image/...',
  mimeType: 'image/jpeg',
  fileName: 'slip.jpg'
}
Response: { status: 'ok', url: '...' }
```

### 7. อัปเดตสถานะ
```
POST: body = { 
  action: 'updateStatus', 
  ref: 'VIS-12345', 
  status: 'รอชำระเงิน'
}
Response: { status: 'ok' }
```

### 8. อัปเดตการอนุมัติผู้เยี่ยม
```
POST: body = { 
  action: 'updateVisitorApproval', 
  ref: 'VIS-12345', 
  visitorApproved: 'yes',
  extraVisitorApproved: 'yes;;no'
}
Response: { status: 'ok', visitorCount: 2, total: 2000 }
```

---

## 🆘 ต้องการความช่วยเหลือเพิ่มเติม?

หากทำตามคู่มือนี้แล้วยังมีปัญหา:

1. **เปิด test_connection.html** เพื่อดูว่าปัญหาอยู่ที่ขั้นตอนไหน
2. **ตรวจสอบ Browser Console** (F12) เพื่อหา error messages
3. **ตรวจสอบ Google Apps Script Execution Log:**
   - ไปที่ Google Apps Script
   - คลิก "Executions" ด้านซ้าย
   - ดู error messages

4. **แชร์ข้อมูลเหล่านี้เพื่อขอความช่วยเหลือ:**
   - ผลลัพธ์จาก test_connection.html
   - Error messages จาก Browser Console
   - Screenshot ของ Deployment settings
   - ชื่อ Sheet tabs ทั้งหมดใน Google Sheet

---

## สรุปขั้นตอนการแก้ไขปัญหา

```
1. เปิด test_connection.html → ทดสอบการเชื่อมต่อ
   ↓
2. หากล้มเหลว → ตรวจสอบ URL และ Deployment settings
   ↓
3. หากสำเร็จแต่ได้ empty rows → ตรวจสอบ Sheet name และ column headers
   ↓
4. หากยังไม่ได้ → ตรวจสอบว่าข้อมูลใน Sheet มี column 'ref' หรือไม่
   ↓
5. หากยังไม่ได้ → ดู Executions log ใน Google Apps Script
```

---

**เอกสารนี้สร้างเมื่อ:** 27 พฤษภาคม 2569  
**เวอร์ชัน:** 1.0  
**ผู้จัดทำ:** CC Cafe Reservation Team