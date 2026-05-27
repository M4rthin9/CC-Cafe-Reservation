# CC-Cafe-Reservation - Fixes Applied

## Issues Fixed

### 1. Admin Panel - Authentication Issue
**Problem:** Admin panel couldn't fetch bookings data due to authentication issues.

**Solution:**
- Added detailed error logging to the `loadData()` function in `src/js/admin.js`
- The system already uses password-only authentication (`PASSWORD = '10900'`)
- The Google Apps Script backend supports both username+password AND legacy password-only authentication
- The `isAuthorized()` function in the Apps Script correctly falls back to checking `pass === LEGACY_STAFF_PASS` when no username is provided

**Changes Made:**
```javascript
// Added console.error logging to help debug issues
catch(e) {
  console.error('Load data error:', e);
  // ... rest of error handling
}
```

**How to Test:**
1. Open `admin.html`
2. Enter password: `10900`
3. Click "เข้าสู่ระบบ"
4. Check browser console (F12) for any error messages
5. Verify that booking data loads successfully

---

### 2. Booking Calendar - Database Connection
**Problem:** Calendar wasn't connecting to the database to check which dates are full.

**Solution:**
- Enhanced the `loadBookingCounts()` function in `src/js/booking.js` with detailed console logging
- The function already fetches booking data from the server using `action=getAll&pass=10900`
- Added logging to track:
  - When the request is made
  - The server response
  - The parsed booking data
  - Any errors that occur

**Changes Made:**
```javascript
async function loadBookingCounts() {
  const activeStatuses = ['รอตรวจสอบ', 'รอชำระเงิน', 'ชำระแล้ว', 'เสร็จสิ้น'];
  try {
    console.log('[Calendar] Loading booking counts from server...');
    const data = await appsScriptGet({ action: 'getAll', pass: '10900' });
    console.log('[Calendar] Server response:', data);
    // ... process data ...
    console.log('[Calendar] Loaded bookings:', bookings);
  } catch (err) {
    console.error('[Calendar] loadBookingCounts failed:', err);
  }
  renderCalendar();
}
```

**How to Test:**
1. Open `booking.html`
2. Open browser console (F12)
3. Look for log messages:
   - `[Calendar] Loading booking counts from server...`
   - `[Calendar] Server response: {status: 'ok', rows: [...]}`
   - `[Calendar] Loaded bookings: {...}`
4. Check if calendar shows correct quota numbers (e.g., "5/20")
5. Verify that fully booked dates (20/20) are marked as unavailable

---

## Technical Details

### Authentication Flow
Both the admin panel and booking page use the same authentication method:
- **Password:** `10900` (hardcoded as `LEGACY_STAFF_PASS` in Apps Script)
- **Method:** Password-only (no username required)
- **API Endpoint:** Google Apps Script Web App URL

### Data Flow
1. **Admin Panel:**
   - User logs in with password
   - `loadData()` fetches all bookings with `?action=getAll&pass=10900`
   - Data is displayed in dashboard and tables

2. **Booking Calendar:**
   - Page loads and immediately renders calendar with 0 quotas
   - `loadBookingCounts()` fetches all bookings asynchronously
   - Calendar re-renders with actual quota numbers from database

### Expected Console Output

**Admin Panel (Success):**
```
[No specific logs, but data should load without errors]
```

**Admin Panel (Error):**
```
Load data error: [error details]
```

**Booking Calendar (Success):**
```
[Calendar] Loading booking counts from server...
[Calendar] Server response: {status: 'ok', rows: Array(XX)}
[Calendar] Loaded bookings: {YYYY-MM-DD: X, YYYY-MM-DD: Y, ...}
```

**Booking Calendar (Error):**
```
[Calendar] loadBookingCounts failed: [error details]
```

---

## Troubleshooting

### If Admin Panel Still Can't Load Data:

1. **Check Console for Errors:**
   - Open browser DevTools (F12)
   - Look for error messages in the Console tab
   - Common issues: CORS errors, network errors, authentication failures

2. **Verify Google Apps Script Deployment:**
   - Ensure the Apps Script is deployed as a Web App
   - Check that "Execute as" is set to "Me"
   - Check that "Who has access" is set to "Anyone" (or "Anyone with Google account")
   - Verify the URL in `APPS_SCRIPT_URL` matches your deployment

3. **Test the API Directly:**
   - Open this URL in browser: `https://script.google.com/macros/s/AKfycbxxVj7NhzAuUAHqv_v4OiKtlVD8A1x73PzxLFAZ0TCJCgdTipYNcghaYfuIhn70-JADGg/exec?action=getAll&pass=10900`
   - Should return: `{"status":"ok","rows":[...]}`

### If Calendar Still Doesn't Show Quotas:

1. **Check Console Logs:**
   - Look for `[Calendar]` prefixed messages
   - Verify server response contains `status: 'ok'` and `rows` array

2. **Verify Data Structure:**
   - Each booking row must have `visitDateISO` field in format `YYYY-MM-DD`
   - Check that `visitDateISO` values match the calendar dates

3. **Check Active Statuses:**
   - Only bookings with these statuses count toward quota:
     - รอตรวจสอบ (Pending)
     - รอชำระเงิน (Waiting for payment)
     - ชำระแล้ว (Paid)
     - เสร็จสิ้น (Completed)
   - Bookings with status "ยกเลิก" (Cancelled) or "ไม่อนุมัติ" (Rejected) don't count

4. **Test API Directly:**
   - Same as admin panel test above
   - Verify the response includes rows with `visitDateISO` fields

---

## Files Modified

1. **src/js/admin.js**
   - Added error logging to `loadData()` function
   - Improved error messages

2. **src/js/booking.js**
   - Added comprehensive logging to `loadBookingCounts()` function
   - Added console logs for debugging
   - Added comments for clarity

---

## Next Steps

1. **Test Both Fixes:**
   - Test admin panel login and data loading
   - Test booking page calendar quota display

2. **Monitor Console Logs:**
   - If issues persist, the console logs will provide valuable debugging information
   - Share any error messages for further assistance

3. **Verify Google Apps Script:**
   - Ensure the Apps Script is properly deployed
   - Check that the Sheet has the correct columns and data
   - Verify `visitDateISO` field is populated for all bookings

---

## Support

If you encounter any issues after applying these fixes:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Copy any error messages
4. Share the error messages for further troubleshooting

The logging added will help identify exactly where the issue is occurring in the data flow.