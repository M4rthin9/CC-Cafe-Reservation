# 📋 ระบบจองเยี่ยมผู้ต้องขัง - สรุปอัปเดตทั้งหมด

**วันที่:** 21 พฤษภาคม 2026  
**เวอร์ชัน:** 2.0 (Payment Flow + PromptPay QR Fix)

---

## 🎯 สิ่งที่อัปเดต

### 1️⃣ ขั้นตอนการชำระเงิน (Payment Flow)
- ✅ เพิ่มสถานะ `รอชำระเงิน` (ระหว่าง อนุมัติ → ชำระแล้ว)
- ✅ เพิ่มสถานะ `เสร็จสิ้น` (เมื่อเจ้าหน้าที่ยืนยัน)
- ✅ ปุ่ม "ปฏิเสธการชำระเงิน" บน Dashboard

### 2️⃣ PromptPay QR Code
- ✅ แก้ไขรูปแบบ QR ให้ถูกต้อง (EMV/QRCPM)
- ✅ เพิ่ม Error Handling
- ✅ ปรับปรุง UI Payment Section

### 3️⃣ รูปสลิปอัปโหลด
- ✅ แก้ไขปัญหา slipImage ไม่มาถึง Dashboard
- ✅ ปรับปรุงการแสดงรูปสลิป

---

## 📁 ไฟล์ที่อัปเดต

### ✅ prison_staff_dashboard.html
**เพิ่ม:**
- ปุ่ม `ยืนยันชำระเงิน` (เมื่อ status = ชำระแล้ว)
- ปุ่ม `ปฏิเสธ` (ให้โอกาสญาติทำใหม่)
- ฟังก์ชัน `confirmPayment()` & `rejectPayment()`
- สถานะ Badge ใหม่: `badge-pay`, `badge-paid`, `badge-done`
- ปรับปรุง `viewSlip()` ให้แสดงข้อมูลชัดเจน

**เปลี่ยน:**
- `อนุมัติแล้ว` → `รอชำระเงิน` (ปุ่มอนุมัติแล้ว)

### ✅ status.html
**เพิ่ม:**
- ฟังก์ชัน `generatePromptPayQR()` - สร้าง QR ที่ถูกต้อง
- Error handling for QR generation
- วิธีการชำระเงิน (QR + Bank Transfer)
- ข้อมูลโครงสร้างบัญชี

**เปลี่ยน:**
- Trigger payment เมื่อ `รอชำระเงิน` (ไม่ใช่แค่ `อนุมัติ`)
- Status pills เพิ่มสถานะใหม่

### ✅ google_apps_script_updated.js
**แก้ไข:**
- รวม `slipImage` ในการ fetch data (ไม่ซ่อนอีกต่อไป)

---

## 🔄 ขั้นตอนการจอง (Updated)

```
Step 1: ญาติ กรอกข้อมูล + ส่งใบสมัคร
        ↓
Step 2: เลขอ้างอิง (Ref No.) ออกมา
        ↓
Step 3: เจ้าหน้าที่ตรวจสอบประวัติ (1-2 วันทำการ)
        ↓
Step 4: เจ้าหน้าที่ Dashboard → กด "✓ อนุมัติ"
        สถานะ: รอตรวจสอบ → รอชำระเงิน ← NEW
        ↓
Step 5: ญาติ ตรวจสอบสถานะ → เห็น "ดำเนินการชำระเงิน"
        ↓
Step 6: ญาติ โอนเงิน (QR หรือ Bank Transfer)
        ↓
Step 7: ญาติ อัปโหลดสลิปการโอน
        สถานะ: รอชำระเงิน → ชำระแล้ว
        ↓
Step 8: เจ้าหน้าที่ Dashboard:
        - ดู "🧾 สลิป" (ตรวจสอบภาพ) ← NEW
        - กด "💳 ยืนยันชำระเงิน" ← NEW
        สถานะ: ชำระแล้ว → เสร็จสิ้น ← NEW
        ↓
Step 9: ญาติ ตรวจสอบสถานะ → เห็น "เสร็จสิ้นแล้ว" ← NEW
```

---

## 🎨 สถานะสี (Badges)

| สถานะ | สี | หมายเหตุ |
|---|---|---|
| รอตรวจสอบ | 🟡 เหลือง | รอเจ้าหน้าที่ |
| รอชำระเงิน | 🔵 น้ำเงิน | รอญาติชำระ ← NEW |
| ชำระแล้ว | 🔷 ฟ้า | รอเจ้าหน้าที่ยืนยัน ← NEW |
| เสร็จสิ้น | 🟢 เขียว | ทำเสร็จแล้ว ← NEW |
| ไม่อนุมัติ | 🔴 แดง | ไม่อนุมัติ |

---

## 💳 PromptPay QR Code

### ก่อน (❌ ผิด)
```javascript
text: `promptpay:0994000160208:${total}`
// ❌ รูปแบบไม่ถูก - ธนาคารสแกนไม่ได้
```

### หลัง (✅ ถูก)
```javascript
const qrText = generatePromptPayQR('0994000160208', total);
// ✅ EMV/QRCPM Format - ธนาคารสแกนได้
```

### QR Code Structure
```
00020101021129370016com.promptpay009
[LENGTH][PHONE_NUMBER]     ← PromptPay ID
5402[LENGTH][AMOUNT]       ← จำนวนเงิน
5303764                    ← Currency THB
6304                       ← CRC placeholder
```

---

## 🔐 ข้อมูลชำระเงิน

### PromptPay (QR Code)
```
เบอร์: 0994000160208
ชื่อ: ทัณฑสถานบำบัดพิเศษกลาง
```

### ธนาคารกรุงไทย (Transfer)
```
เลขบัญชี: 137-1-09488-8
ชื่อบัญชี: ทัณฑสถานบำบัดพิเศษกลาง
```

---

## 🧪 การทดสอบ

### Dashboard Test
```
1. เข้าระบบ (password: 10900)
2. กด "✓ อนุมัติ" → สถานะ "รอชำระเงิน" ✓
3. Mock slip upload → สถานะ "ชำระแล้ว" ✓
4. กด "💳 ยืนยันชำระเงิน" → "เสร็จสิ้น" ✓
5. กด "✗ ปฏิเสธ" → "รอชำระเงิน" ✓
```

### Status Check Test
```
1. ค้นหาการจองที่ "รอชำระเงิน"
2. ต้องเห็นปุ่ม "ดำเนินการชำระเงิน" ✓
3. QR Code ต้องสแกนได้ ✓
4. แสดงวิธี Bank Transfer ด้วย ✓
```

### PromptPay QR Test
```
1. สแกน QR ด้วย Mobile Banking
   - ธนาคารกรุงไทย ✓
   - ธนาคารอื่น ✓
2. ควรแสดง:
   - Merchant: ทัณฑสถาน
   - Amount: XXX.XX บาท ✓
```

---

## ⚠️ ก่อนใช้งาน

### 1. อัปเดต Google Apps Script
```
ก่อป deploy ให้ใหม่!
- ที่ Google Apps Script Editor
- Publish → New deployment
- Copy URL ใหม่ (ถ้าเปลี่ยน)
```

### 2. ตรวจสอบ Google Sheet
```
✓ คอลัมน์ที่ต้องมี:
  - ref
  - status
  - slipImage ← IMPORTANT
  - ส่วนอื่นตามเดิม
```

### 3. ตรวจสอบ HTML Files
```
✓ ทั้ง 3 ไฟล์อัปเดต:
  - prison_staff_dashboard.html ← ปุ่มใหม่
  - status.html ← QR Fix
  - google_apps_script_updated.js ← slipImage
```

---

## 🚨 Troubleshooting

| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| QR ไม่แสดง | QRCode.js ไม่โหลด | ตรวจ `<script>` CDN ใน head |
| QR แต่สแกนไม่ได้ | รูปแบบผิด | ตรวจ `generatePromptPayQR()` |
| สลิป ไม่มาถึง Dashboard | Apps Script ยังซ่อน | Deploy script ใหม่ |
| ปุ่มปฏิเสธ ไม่มี | JS ไม่โหลด | ตรวจ Browser Console |
| สถานะ ไม่อัปเดต | API error | ตรวจ Network tab + password |

---

## 📚 Document Files

1. **CHANGES_SUMMARY.md** - สรุปการเปลี่ยนแปลง (ทั้งหมด)
2. **PROMPTPAY_QR_FIX.md** - รายละเอียด PromptPay QR
3. **PROMPTPAY_QUICK_REFERENCE.txt** - อ้างอิงด่วน
4. **README_FULL.txt** - ไฟล์นี้

---

## 📞 Support

- ❓ ประวัติวินัย → ตรวจสอบกับเจ้าหน้าที่ทัณฑสถาน
- ❓ ปัญหา QR → ดู PROMPTPAY_QR_FIX.md
- ❓ ปัญหา Dashboard → ดู CHANGES_SUMMARY.md
- ❓ Tech Issue → ตรวจ Browser Console (F12)

---

## ✨ Features

### Version 2.0 ✅
- [x] Multi-stage payment flow (รอ → ชำระ → ยืนยัน → เสร็จ)
- [x] PromptPay QR Code (working)
- [x] Slip image upload & display
- [x] Staff dashboard reject payment
- [x] Improved UI/UX

### Future (v2.1+)
- [ ] SMS notification ยืนยันการชำระ
- [ ] Email receipt
- [ ] Statistics dashboard
- [ ] Multi-language (EN, BU)

---

**Last Updated:** 21 May 2026  
**Status:** ✅ Ready for Production
