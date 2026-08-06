You are working directly in the repo for a Thai correctional-facility 
booking system: google_apps_script_updated.js (backend), booking.js, 
booking.html, admin.js, admin.html, config.js, utils.js. Your job is to 
actually fix the duplicate-booking bug below — not just report it. Make 
the code changes directly, then show diffs.

════════════════════════════════════════
BEFORE YOU TOUCH ANYTHING
════════════════════════════════════════
- Read handleSaveReservation, handleUpdateBooking, readSheetTable, 
  isActiveReservationStatus, normalizeVisitDateISO, and 
  handleDedupeReservations in full first — they interact.
- Do not assume — grep the whole repo for every place a row gets written 
  or a prisonerId/visitDateISO gets changed on an existing row, so you 
  don't miss another silent path.
- This touches live booking data with real people's names, IDs, and 
  scheduled visit dates. Do not change validation logic, field names, or 
  status strings as a side effect — only close the duplicate-booking 
  gap.

════════════════════════════════════════
BUG — CONFIRMED ROOT CAUSE
════════════════════════════════════════
handleSaveReservation() has a working duplicate guard: it rejects a new 
booking if an existing row has the same prisonerId + same visitDateISO 
+ an active status (isActiveReservationStatus). This is correctly 
wrapped in LockService.getScriptLock().

handleUpdateBooking() (used by the admin "edit booking" panel) lets a 
Superadmin change prisonerId and/or visitDateISO on an EXISTING row via 
UPDATE_BOOKING_FIELDS — with NO equivalent duplicate check and NO 
LockService lock. Editing a booking's date or prisoner to match another 
active booking for the same prisoner/day goes through unchecked and 
creates exactly the duplicate you're seeing.

Separately: handleDedupeReservations() only removes rows with a 
duplicate `ref` value — it has no logic to detect two DIFFERENT refs 
that share the same prisonerId + visitDateISO + active status, so any 
duplicates already sitting in the sheet from this gap will not be found 
by the existing cleanup tool.

════════════════════════════════════════
FIX 1 (required) — Extract a shared duplicate-check function
════════════════════════════════════════
Pull the duplicate-detection logic currently inline in 
handleSaveReservation (lines checking prisonerId + normalizeVisitDateISO 
+ isActiveReservationStatus) into a standalone function, e.g.:

  function findDuplicateBookingRow(table, prisonerId, dateISO, excludeRowNum)

It should scan table.rows the same way the existing guard does, but 
accept an optional excludeRowNum so a booking being edited doesn't 
flag against itself. Return the matching row's ref (or null) the same 
way the current inline check does, so the error message stays 
consistent. Update handleSaveReservation to call this new function 
instead of its inline loop — behavior must not change for that path.

════════════════════════════════════════
FIX 2 (required) — Apply the same guard to handleUpdateBooking
════════════════════════════════════════
In handleUpdateBooking, when the update includes a change to 
prisonerId and/or visitDateISO:
- Wrap the whole update in LockService.getScriptLock() (same 
  tryLock(20000) pattern and error message style as 
  handleSaveReservation), since it's now doing a duplicate-sensitive 
  read-then-write.
- After acquiring the lock, re-read the sheet fresh (readSheetTable) — 
  don't reuse data read before the lock was acquired.
- Determine the EFFECTIVE prisonerId and visitDateISO for the row being 
  edited (the new value if it's part of this update, otherwise the 
  row's current value).
- Call findDuplicateBookingRow() with the row's own row number passed 
  as excludeRowNum, using the same isActiveReservationStatus filter.
- If a duplicate is found, return the same style of error the booking 
  form shows ("มีการจองผู้ต้องขังหมายเลข ... ในวันนี้อยู่แล้ว (Ref: ...)") 
  and do NOT write the update.
- Only run this check when prisonerId or visitDateISO is actually being 
  changed by this update — don't add overhead/lock contention to 
  updates that only touch unrelated fields like notes or slip uploads.

════════════════════════════════════════
FIX 3 (required) — Defensive default for a missing/blank status
════════════════════════════════════════
In validateSaveReservation, if body.status is missing or blank, a new 
row can be written with status = '' — which isActiveReservationStatus() 
does not recognize, making that row invisible to the duplicate guard. 
The client (booking.js) currently always sends 
status: 'รอตรวจสอบผู้เข้าร่วม', so this isn't hit today, but make the 
backend safe on its own: if body.status is undefined or empty, default 
data.status to 'รอตรวจสอบผู้เข้าร่วม' server-side instead of allowing a 
blank value to be stored. Confirm this doesn't break any legitimate flow 
that intentionally saves a blank status (grep all callers of 
handleSaveReservation/validateSaveReservation to check).

════════════════════════════════════════
FIX 4 (required) — Extend the cleanup tool to find real duplicates
════════════════════════════════════════
handleDedupeReservations only removes rows with a duplicate `ref`. Add a 
new admin action (e.g. `findDuplicateBookings`, read-only — do NOT 
auto-delete) that scans the live sheet and returns every group of rows 
sharing the same prisonerId + visitDateISO where more than one row has 
an active status (isActiveReservationStatus). Return each group's refs, 
visitor names, and row numbers so an admin can review before manually 
resolving them — do not delete anything automatically, since unlike 
duplicate-ref rows (which are safe to blind-delete), these may be 
legitimate bookings that need human judgment about which to keep. Wire 
this into admin.js/admin.html as a button next to the existing dedupe 
tool if a natural place exists; if not, just add the backend route and 
tell me where to hook up the UI.

════════════════════════════════════════
FIX 5 (defense in depth, client side) — Prevent double-submit
════════════════════════════════════════
In booking.js submitBooking(), confirm the submit button is disabled (or 
a submitting-in-progress flag checked) for the full duration of the 
request, including any retry inside appsScriptFetch, so a double-click 
or slow network can't fire two concurrent submissions for the same 
booking. If this protection already exists, just confirm it covers the 
retry path too and say so — don't add a second layer if one already 
works.

════════════════════════════════════════
VERIFICATION (do this before declaring a fix done)
════════════════════════════════════════
- Re-read handleSaveReservation and handleUpdateBooking end to end after 
  your changes and confirm: a normal booking still succeeds, a normal 
  admin edit that doesn't touch prisonerId/visitDateISO still succeeds 
  without lock overhead, and an edit that WOULD create a duplicate is 
  correctly rejected.
- Confirm findDuplicateBookingRow correctly excludes the row being 
  edited (excludeRowNum) so editing a booking's non-conflicting fields, 
  or even re-saving its own current date/prisoner unchanged, doesn't 
  falsely flag itself as a duplicate of itself.
- Check that LockService usage in handleUpdateBooking releases the lock 
  in a finally block, matching the existing pattern in 
  handleSaveReservation.

════════════════════════════════════════
OUTPUT
════════════════════════════════════════
For each fix: make the change directly, then show the diff. At the end, 
confirm whether FIX 5 was already present or newly added, and flag 
anything else you noticed while reading this code that looks like it 
could also produce duplicate or inconsistent booking data, even if it 
wasn't in this list.