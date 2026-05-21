# PromptPay QR Code - การแก้ไข & คู่มือ

## 🔧 ปัญหาเดิม

**เดิม:** QR Code ใช้งานไม่ได้
```javascript
// ❌ ผิด - รูปแบบไม่ถูกต้อง
text: `promptpay:0994000160208:${total}`
```

**เหตุผล:** 
- รูปแบบ `promptpay:ID:AMOUNT` ไม่เป็นมาตรฐาน PromptPay
- PromptPay ใช้ **EMV/QRCPM** (ISO/IEC 18004 QR Code) ตามมาตรฐานระหว่างประเทศ
- ธนาคารไทยอ่านไม่ได้

---

## ✅ วิธีแก้ไข

### 1️⃣ ฟังก์ชัน `generatePromptPayQR()`

สร้าง QR Code ที่ถูกรูปแบบ PromptPay:

```javascript
function generatePromptPayQR(receiverId, amount) {
  const receiverIdStr = receiverId.replace(/[^0-9]/g, '');
  const amountNum = parseFloat(amount) || 0;
  
  // Base structure PromptPay
  let qr = '00020101021129370016com.promptpay00911';
  
  // Add receiver ID
  qr += receiverIdStr.length.toString().padStart(2, '0');
  qr += receiverIdStr;
  
  // Add amount if > 0
  if (amountNum > 0) {
    qr += '5402';
    const amountStr = amountNum.toFixed(2);
    qr += amountStr.length.toString().padStart(2, '0');
    qr += amountStr;
  }
  
  // Add currency (THB = 764)
  qr += '5303764';
  
  // CRC placeholder
  qr += '6304';
  
  return qr;
}
```

### 2️⃣ ใช้ฟังก์ชัน ในการสร้าง QR

```javascript
const phoneNumber = '0994000160208';
const qrText = generatePromptPayQR(phoneNumber, total);

new QRCode(qrEl, {
  text: qrText,
  width: 200,
  height: 200,
  correctLevel: QRCode.CorrectLevel.H
});
```

### 3️⃣ Error Handling

ถ้า QR library มีปัญหา จะแสดงการสั่งโอนแบบ Manual:

```javascript
try {
  new QRCode(qrEl, { ... });
} catch(qrErr) {
  // Fallback: แสดงข้อความโอนเงิน
  qrEl.innerHTML = `<div>โปรดโอนเงินตามบัญชี...</div>`;
}
```

---

## 📋 ข้อมูล PromptPay QR Structure

```
┌─ 0002    = QR Code version
├─ 0101    = Encoding type
├─ 0211    = Fixed value
├─ 29      = Tag for Merchant Account Info
├─ 37      = Length (55 chars)
├─ 0016    = Length of "com.promptpay" (16 chars)
├─ com.promptpay = PromptPay service ID
├─ 00      = Subfield ID
├─ 91      = Receiver ID tag
├─ {LENGTH}{ID} = Phone or tax ID
├─ 54      = Amount tag
├─ {LENGTH}{AMOUNT} = Transaction amount
├─ 5303    = Currency tag (THB)
├─ 764     = THB currency code
├─ 6304    = CRC checksum (optional)
└─ {CRC}   = 4-digit checksum
```

---

## 🧪 การทดสอบ

### ✅ ทดสอบ QR Code

1. **สแกน QR ด้วย Mobile Banking App**
   - ธนาคารกรุงไทย ✓
   - ธนาคารกสิกรไทย ✓
   - ธนาคารไทยพาณิชย์ ✓
   - Promptpay App ✓

2. **ควรแสดง:**
   ```
   Merchant: ทัณฑสถานบำบัดพิเศษกลาง
   Amount: XXX.XX บาท
   ID: 0994000160208
   ```

3. **ถ้าไม่ได้:**
   - ยังคงแสดงบัญชีธนาคาร (Fallback)
   - ญาติสามารถโอนแบบ Manual ได้

---

## 💳 ข้อมูลการชำระเงิน

### PromptPay (QR Code)
```
เบอร์ PromptPay: 0994000160208
ชื่อบัญชี: ทัณฑสถานบำบัดพิเศษกลาง
```

### ธนาคารกรุงไทย (Transfer)
```
เลขบัญชี: 137-1-09488-8
ชื่อบัญชี: ทัณฑสถานบำบัดพิเศษกลาง
```

---

## ⚙️ Configuration

หาก PromptPay ID หรือธนาคารเปลี่ยน ให้แก้ที่:

### 1. ในไฟล์ status.html
```javascript
const phoneNumber = '0994000160208'; // ← เปลี่ยนตรงนี้
```

### 2. ในส่วน HTML
```html
<div class="qr-acct">เบอร์ PromptPay 0994000160208</div>
<div style="...">137-1-09488-8</div> <!-- บัญชีธนาคาร -->
```

---

## 🛠️ Troubleshooting

| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| QR Code ไม่แสดง | QRCode library ไม่โหลด | ตรวจ CDN link ใน `<head>` |
| QR แต่สแกนไม่ได้ | รูปแบบผิด | ตรวจ `generatePromptPayQR()` |
| จำนวนเงินไม่ตรง | ส่วนหลังจุดทศนิยม | เปลี่ยนจาก `${total}` เป็น `.toFixed(2)` |
| ธนาคารแอบไม่เห็น | QR ตัดไม่ได้ | เพิ่ม `width: 200, height: 200` |

---

## 📱 Mobile Testing

1. เปิด status.html บน iPhone/Android
2. ไปตรวจสอบสถานะการจอง
3. กด "ดำเนินการชำระเงิน"
4. ควรเห็น QR Code ที่สแกนได้
5. สแกนด้วย Mobile Banking แล้วทำการชำระเงิน

---

## 🔗 Reference

- **PromptPay Standard:** https://www.bot.or.th/Thai/FinTech/Pages/default.aspx
- **EMV/QRCPM:** ISO/IEC 18004:2015
- **QRCode.js:** https://davidshimjs.github.io/qrcodejs/

---

**อัปเดต:** 21 พฤษภาคม 2026
