# แผนการเพิ่มฟีเจอร์รายงานรายเดือน

## ภารกิจ
เพิ่มฟีเจอร์รายงานรายเดือนในหน้า Reports ที่ให้ผู้ใช้เลือกช่วงวันที่ และแสดงข้อมูลสรุปพร้อมกราฟ

## รายการทำ

### 1. แก้ไข HTML (admin.html)
- [x] เพิ่มส่วน Date Range Picker ใน #view-reports (input type="date" สำหรับจากวันที่ถึงวันที่)
- [x] เพิ่มปุ่ม "สร้างรายงานรายเดือน"
- [x] เพิ่ม container สำหรับแสดงผลรายงาน (สรุป + กราฟ)

### 2. แก้ไข JavaScript (src/js/admin.js)
- [x] เพิ่มฟังก์ชัน `generateMonthlyReport()` - คำนวณและแสดงรายงานตามช่วงวันที่
- [x] เพิ่มฟังก์ชัน `drawMonthlyFinanceChart()` - วาดกราฟรายวันในช่วงเดือนที่เลือก
- [x] เพิ่งฟังก์ชัน `drawMonthlyVisitorChart()` - วาดกราฟผู้ใหญ่/เด็ก

### 3. แก้ไข CSS (src/css/admin.css)
- [x] เพิ่มสไตล์สำหรับ date picker และ monthly report section

## สถานะ
**เสร็จสิ้น** - ทำการ deploy เรียบร้อย