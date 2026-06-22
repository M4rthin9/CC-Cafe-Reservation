# CC Cafe Reservation System

ระบบจองคิวเพื่อร่วมกิจกรรม — ทัณฑสถานบำบัดพิเศษกลาง

**Stack**: Google Apps Script (backend) + Vanilla JS (frontend) + Google Sheets (database)  
**Status**: Active development

---

## Upgrade Roadmap

Comprehensive plan to harden security, fix bugs, improve UX, and clean up technical debt.
Estimated total effort: **20–32 hours** across 6 phases.

---

## Phase 1 🔴 Critical Security (4–6 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 1 | Hardcoded master password `10900` exposed client-side | `src/js/booking.js:912`, `src/js/status.js:3` | Remove from client; create public `checkStatus` GAS endpoint |
| 2 | `isAuthorized()` legacy password bypass | `google_apps_script_updated.js:1162` | Remove the `LEGACY_STAFF_PASS` fallback entirely |
| 3 | Plaintext password storage | `google_apps_script_updated.js:295` | Hash with `Utilities.computeDigest(SHA_256, ...)` |
| 4 | `getAll` public data leak via GET | `google_apps_script_updated.js:42-46` | Require authentication for all data-fetch endpoints |

### Rationale

The leaked master password (`10900`) means anyone with browser DevTools can authenticate as a full admin. Until this is fixed, no other security measure provides meaningful protection.

---

## Phase 2 🟠 XSS & Input Validation (4–8 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 5 | XSS via `innerHTML` with user-controlled data | `src/js/booking.js:109-668`, `src/js/status.js:140-351` | Use `textContent` or apply `escHtml()` to every interpolated variable |
| 6 | No server-side input sanitization | `google_apps_script_updated.js:371` | Whitelist allowed fields; validate types before writing to sheet |

### Rationale

Multiple locations concatenate user-supplied names, prisoner data, and wings directly into HTML strings without escaping. Fixing injection vulnerabilities before adding features prevents existing bugs from being exploited.

---

## Phase 3 🟡 Hardening (3–5 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 7 | No Content Security Policy | All HTML files' `<head>` | Add CSP meta tag after migrating off inline event handlers |
| 8 | No origin/CSRF validation | `google_apps_script_updated.js:223` | Check `Origin` header; require CSRF token for state-changing actions |
| 9 | No rate limiting | `google_apps_script_updated.js:366-398` | Use `CacheService` to throttle requests per IP/username |
| 10 | TOCTOU race in duplicate check | `src/js/booking.js:712-769` | Move duplicate detection server-side so it's atomic |

### Rationale

The client-side duplicate check reads data then submits separately — another tab can race between these calls. Server-side atomic check is the only reliable fix.

---

## Phase 4 🟡 UX & Form Validation (3–4 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 11 | No input format validation | `src/js/booking.js:501-523` | Add regex for Thai ID (`\d{1}-\d{4}-\d{5}-\d{2}-\d{1}`), phone (`0\d{1,2}-\d{3}-\d{4}`), etc. |
| 12 | No `<form>` element in booking page | `booking.html` (global) | Wrap inputs in `<form>` with `novalidate` for accessibility + autofill |
| 13 | Missing `required`/`pattern` HTML5 attributes | `booking.html:58-95` | Add native validation attributes as first defense layer |
| 14 | Error messages leak internal state | `google_apps_script_updated.js:171-708` | Return generic messages to client; log full details server-side |

---

## Phase 5 🟢 Code Quality & Maintainability (4–6 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 15 | Chaotic CSS breakpoints (12+ overlapping) | `src/css/admin.css` (global) | Standardize to 4 breakpoints: 480px / 768px / 1024px / 1920px |
| 16 | Duplicate utility functions in 3 files | `src/js/admin.js`, `src/js/booking.js`, `src/js/status.js` | Extract `toLocalDateStr`, `escHtml`, `maskPrisonerName` to `src/js/utils.js` |
| 17 | Hardcoded GAS URL in 3 files | `src/js/booking.js:2`, `src/js/status.js:2`, `src/js/admin.js:29` | Extract to `src/js/config.js` included before other scripts |
| 18 | Dead code branches | `src/js/booking.js:776-779`, `src/css/admin.css`, `src/css/booking.css` | Remove unused demo mode, duplicate CSS blocks, unused classes |

---

## Phase 6 🟢 Polish & Edge Cases (2–3 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 19 | Calendar navigation missing `aria-label` | `booking.html:172-174` | Add `aria-label="previous month"` / `"next month"` for screen readers |
| 20 | Slip upload MIME type check is case-sensitive | `src/js/status.js:416` | Normalize with `.toLowerCase()` before comparing |
| 21 | Duplicate `@media` blocks not merged | `src/css/admin.css:263-357` | Combine two `min-width: 1920px` blocks into one |

---

## Effort Summary

| Phase | Hours | Primary Impact |
|-------|-------|----------------|
| Phase 1 — Security critical | 4–6 | Prevents data breach & unauthorized admin access |
| Phase 2 — XSS & validation | 4–8 | Prevents code injection & corrupt data |
| Phase 3 — Hardening | 3–5 | Prevents abuse, CSRF, & race conditions |
| Phase 4 — UX | 3–4 | Better validation UX & accessibility |
| Phase 5 — Code quality | 4–6 | Easier maintenance & onboarding |
| Phase 6 — Polish | 2–3 | Accessibility & edge-case robustness |
| **Total** | **20–32 hrs** | |

---

## Developer Notes

### Running the project
No build step required. Open `index.html` in a browser, or serve with any static file server:

```bash
npx serve .
```

### Deployment
Frontend files (`.html`, `src/`) are static. Deploy to any web host (GitHub Pages, Netlify, etc.).  
The Google Apps Script file (`google_apps_script_updated.js`) must be deployed separately via the Google Apps Script editor.

### Architecture constraints
- Google Sheets is not a real database — no transactions, no locking, limited concurrency
- Apps Script has a 6-minute execution limit and daily quotas
- All sensitive logic should be server-side (GAS) since the frontend is fully inspectable

### Key data formats
- **Extra visitors**: `name\|id\|relation\|age;;name2\|id2\|relation2\|age2`
- **Parallel arrays**: `extraVisitorReligions`, `extraVisitorAllergies`, `extraVisitorApproved` use `;;`-delimited values aligned by index
- **Thai ID format**: `X-XXXX-XXXXX-XX-X`
