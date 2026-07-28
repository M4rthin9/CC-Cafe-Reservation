# Prisoner Validation Plan — Booking Flow

## Context

The "ผู้ต้องขัง" (prisoner) Google Sheet has columns `status` and `vinaiDate` that are not currently exposed to the frontend. Two validation logics need to be added to the booking flow, plus an auto-cleanup mechanism:

1. **Logic 1 (Block)**: If prisoner `status` is `"ติดวินัย งดเยี่ยม"` → reject the booking
2. **Logic 2 (Override)**: If `vinaiDate` is more than 1 year before today → allow booking even if status is `"ติดวินัย งดเยี่ยม"` (discipline has expired)
3. **Logic 3 (Auto-cleanup)**: Every day, automatically check all prisoners — if `vinaiDate` is over 1 year old, clear the `status` and `vinaiDate` fields for that prisoner in the sheet

## Current State

### Google Apps Script (`google_apps_script_updated.js`)
- Prisoner sheet headers (line 824): `['prisonerId', 'prisonerName', 'wing', 'status', 'note']`
- `getPrisoners` (lines 87-121) only returns `{ prisonerName, prisonerId, wing }` — `status` and `vinaiDate` are read from the sheet but **not included** in the response
- `vinaiDate` column does **not** exist in the GAS header definition yet
- `handleImportPrisoners` (lines 1068-1130) only imports `prisonerId, prisonerName, wing, status, note`

### Frontend (`src/js/booking.js`)
- `loadPrisonerMaster()` (line 370) stores `{ prisonerName, prisonerId, wing }` in `prisonerMaster`
- `validate()` (line 584) does soft prisoner validation but **does not check** `status` or `vinaiDate`
- `selectPrisoner(p)` (line 460) sets hidden fields but does not display prisoner status

### Admin (`src/js/admin.js` + `admin.html`)
- CSV import preview (admin.html lines 603-608) shows only `prisonerId, prisonerName, wing`
- `previewPrisonerCSV` (admin.js ~line 3252) only maps those 3 columns

## Changes Required

### 1. GAS — Add `vinaiDate` to prisoner sheet headers
**File**: `google_apps_script_updated.js`
**Location**: Line 824 (`ensurePrisonerSheet` function)
**Change**: Add `'vinaiDate'` to the headers array:
```
['prisonerId', 'prisonerName', 'wing', 'status', 'vinaiDate', 'note']
```

### 2. GAS — Return `status` and `vinaiDate` from `getPrisoners`
**File**: `google_apps_script_updated.js`
**Location**: Lines 105-115 (`getPrisoners` action)
**Change**: Include `status` and `vinaiDate` in the pushed prisoner objects:
```
prisoners.push({ prisonerName: name, prisonerId: id, wing: wing, status: statusVal, vinaiDate: vinaiDateVal });
```
Also need to get the column indices for `status` and `vinaiDate` from the headers.

### 3. GAS — Auto-cleanup stale discipline records in `getPrisoners`
**File**: `google_apps_script_updated.js`
**Location**: Inside `getPrisoners` action, after reading sheet data but before returning
**Change**: After building the `prisoners` array, iterate through the raw sheet data and for each prisoner whose `status` is `"ติดวินัย งดเยี่ยม"` and whose `vinaiDate` is more than 1 year before today, clear the `status` and `vinaiDate` cells in the sheet row. This ensures the cleanup runs automatically every time `getPrisoners` is called (which happens on every page load and every 30-minute cache expiry).

Pseudocode:
```javascript
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

for (let i = 1; i < data.length; i++) {
  const sStatus = String(data[i][statusIdx] || '').trim();
  const sVinaiDate = data[i][vinaiDateIdx];
  if (sStatus === 'ติดวินัย งดเยี่ยม' && sVinaiDate instanceof Date) {
    const vd = Utilities.formatDate(sVinaiDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const vdDate = new Date(vd + 'T00:00:00');
    if (vdDate <= oneYearAgo) {
      // Clear status and vinaiDate for this prisoner
      sheet.getRange(i + 1, statusIdx + 1).clearContent();
      sheet.getRange(i + 1, vinaiDateIdx + 1).clearContent();
    }
  }
}
```

This approach avoids needing a time-driven trigger — the cleanup happens lazily on every `getPrisoners` call, which is frequent enough (every page load + cache refresh).

### 4. GAS — Update `handleImportPrisoners` to handle new columns
**File**: `google_apps_script_updated.js`
**Location**: Lines 1068-1130 (`handleImportPrisoners`)
**Change**: Add `vinaiDate` column index lookup and include it in import/export rows.

### 5. Frontend — Store `status` and `vinaiDate` in prisoner objects
**File**: `src/js/booking.js`
**Location**: `loadPrisonerMaster()` (line 370) and `getPrisoners` response handling (line 401)
**Change**: No code change needed here — the GAS response already includes the fields; they'll be available on `p.status` and `p.vinaiDate` automatically since the response is stored as-is in `prisonerMaster`.

### 6. Frontend — Add validation logic in `validate()`
**File**: `src/js/booking.js`
**Location**: `validate()` function, after prisoner selection check (~line 712)
**Change**: Add a new validation block after the existing prisoner master soft check (after line 726):

```javascript
// ── Check prisoner discipline status ──
if (prisonerMaster.length > 0) {
  const prisoner = prisonerMaster.find(p =>
    p.prisonerId === pidHidden ||
    (p.prisonerName.toLowerCase() === pnameHidden.toLowerCase() && p.wing === wingHidden)
  );
  if (prisoner) {
    const isRestricted = String(prisoner.status || '').trim() === 'ติดวินัย งดเยี่ยม';
    if (isRestricted) {
      const vinaiDateStr = String(prisoner.vinaiDate || '').trim();
      if (vinaiDateStr) {
        const vinaiDate = new Date(vinaiDateStr + 'T00:00:00');
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (vinaiDate <= oneYearAgo) {
          // Discipline expired — allow booking
        } else {
          // Discipline still active — reject
          showError('prisonerSearch', '⚠️ ผู้ต้องขังรายนี้อยู่ในสถานะ "ติดวินัย งดเยี่ยม" — ไม่สามารถจองได้');
          scrollToFirstError();
          return false;
        }
      } else {
        // No vinaiDate — block by default
        showError('prisonerSearch', '⚠️ ผู้ต้องขังรายนี้อยู่ในสถานะ "ติดวินัย งดเยี่ยม" — ไม่สามารถจองได้');
        scrollToFirstError();
        return false;
      }
    }
  }
}
```

### 7. Frontend — Show prisoner status in suggestion dropdown
**File**: `src/js/booking.js`
**Location**: `filterPrisonerSuggestions()` (line 427)
**Change**: Add status badge to the suggestion item HTML so users can see if a prisoner is restricted before selecting them.

### 8. Admin — Update CSV import for new columns
**File**: `src/js/admin.js`
**Location**: `previewPrisonerCSV()` (~line 3252) and `importPrisonerCSV()` (~line 3335)
**Change**: Add `status` and `vinaiDate` to the column mapping and preview table.

### 9. Admin — Update prisoner preview table headers
**File**: `admin.html`
**Location**: Lines 603-608 (`prisonerPreviewHeader`)
**Change**: Add `<th>status</th>` and `<th>vinaiDate</th>` columns.

## Validation & Edge Cases

- **Missing `vinaiDate`**: If `vinaiDate` is empty and status is `"ติดวินัย งดเยี่ยม"`, block the booking (conservative default)
- **Invalid `vinaiDate` format**: If the date cannot be parsed, block the booking (conservative default)
- **Non-Thai date format in sheet**: Google Sheets stores dates as serial numbers; `formatDateISO` in GAS converts them to `YYYY-MM-DD`, so the frontend will receive a standard ISO date string
- **Prisoner not in master data**: If the prisoner is not found in `prisonerMaster`, skip the discipline check (existing behavior — soft validation only)
- **Case sensitivity**: The status comparison uses exact string match `"ติดวินัย งดเยี่ยม"` — ensure the sheet value matches exactly
- **Auto-cleanup idempotency**: The cleanup only clears rows where `status` is exactly `"ติดวินัย งดเยี่ยม"` and `vinaiDate` is over 1 year old. It does not affect other status values or prisoners without a `vinaiDate`.
- **Concurrent cleanup**: Since cleanup runs in `getPrisoners` which is cached for 120 seconds (PUBLIC_CACHE_TTL), multiple concurrent calls within the cache window won't cause duplicate sheet writes. The cache is invalidated after cleanup via `invalidateReservationsCache()` (not needed here since prisoner cache uses a different key).

## Files to Modify

1. `google_apps_script_updated.js` — headers, getPrisoners (add cleanup), handleImportPrisoners
2. `src/js/booking.js` — validation logic, suggestion display
3. `src/js/admin.js` — CSV import handling
4. `admin.html` — preview table headers

## Open Questions

- Does the `status` column in the prisoner sheet already contain `"ติดวินัย งดเยี่ยม"` as a value, or are other values possible? (Assumed yes based on user's description)
- Should the `vinaiDate` be compared to today's date in Thai timezone (Asia/Bangkok) or UTC? (Should use local Thai date for consistency with the rest of the app)
- Should the admin prisoner management view also allow editing `status` and `vinaiDate` inline, or only via CSV import? (CSV import only for now)
- Should the auto-cleanup also update the `note` column to record that the discipline was cleared? (Not required for now)
