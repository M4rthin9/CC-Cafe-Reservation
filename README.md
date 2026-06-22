# CC Cafe Reservation System

ระบบจองคิวเพื่อร่วมกิจกรรม — ทัณฑสถานบำบัดพิเศษกลาง

**Stack**: Google Apps Script (backend) + Vanilla JS (frontend) + Google Sheets (database)  
**Status**: Active development

---

## Upgrade Roadmap

Comprehensive plan to harden security, fix bugs, improve UX, and clean up technical debt.
Estimated total effort: **30–45 hours** across 6 phases.

---

## Phase 1 🔴 Critical Security (6–8 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 1 | Hardcoded master password `10900` exposed client-side | `src/js/booking.js:912`, `src/js/status.js:3`, `src/js/chatbot.js:75` | Remove from all 3 client files; create public `checkStatus` GAS endpoint |
| 2 | Legacy password fallback still active | `google_apps_script_updated.js:1162` | Remove the `LEGACY_STAFF_PASS` fallback entirely |
| 3 | Plaintext password storage + login comparison | `google_apps_script_updated.js:238,295` | Hash with `Utilities.computeDigest(sha256, ...)` on write; compare hashes on login |
| 4 | `getAll` public data leak via GET | `google_apps_script_updated.js:42-46` | Require authentication for all data-fetch endpoints |
| 5 | Ref No. generated client-side (collision risk) | `src/js/booking.js:727` | Move Ref No. generation server-side using timestamp+counter |
| 6 | `test_connection.html` exposes connection info | `test_connection.html` (project root) | Delete — never ship debug files to production |

### Rationale

The leaked master password (`10900`) means anyone with browser DevTools can authenticate as a full admin. Until this is fixed, no other security measure provides meaningful protection.

---

## Phase 2 🟠 XSS & Input Validation (6–10 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 7 | **admin.js: Zero escaping across 5,236 lines** | `src/js/admin.js` (entire file) | Add `escHtml()`; all `innerHTML` assignments must pass through it |
| 8 | XSS via `innerHTML` with user data | `src/js/booking.js:109-668`, `src/js/status.js:140-351` | Use `textContent` or apply `escHtml()` to every interpolated variable |
| 9 | No server-side input sanitization | `google_apps_script_updated.js:371` | Whitelist allowed fields; validate types/pattern before writing to sheet |
| 10 | Chatbot stores raw HTML in sessionStorage | `src/js/chatbot.js:442-450` | Escape before storage; use `textContent` on restore |
| 11 | Prisoner name masking is client-only | `src/js/booking.js:46-57` | Mask server-side before sending to client; send display name separately |

### Rationale

admin.js at 5,236 lines renders user-supplied names, IDs, wings, and notes directly into table rows and modal HTML without any escaping — this is the single biggest XSS vector in the system.

---

## Phase 3 🟡 Hardening (4–6 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 12 | No Content Security Policy | All HTML files' `<head>` | Add CSP meta tag after migrating off inline event handlers |
| 13 | No origin/CSRF validation | `google_apps_script_updated.js:223` | Check `Origin` header; require CSRF token for state-changing actions |
| 14 | No rate limiting | `google_apps_script_updated.js:366-398` | Use `CacheService` to throttle requests per IP/username |
| 15 | TOCTOU race in duplicate check | `src/js/booking.js:712-769` | Move duplicate detection server-side so it's atomic |
| 16 | No `rel="preconnect"` for Google Fonts | All HTML files | Add `<link rel="preconnect" href="https://fonts.googleapis.com">` to `<head>` |

### Rationale

The client-side duplicate check reads data then submits separately — another tab can race between these calls. Server-side atomic check is the only reliable fix.

---

## Phase 4 🟡 UX & Form Validation (4–6 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 17 | No input format validation | `src/js/booking.js:501-523` | Add regex for Thai ID (`\d{1}-\d{4}-\d{5}-\d{2}-\d{1}`), phone (`0\d{1,2}-\d{3}-\d{4}`), etc. |
| 18 | No `<form>` element in booking page | `booking.html` (global) | Wrap inputs in `<form>` with `novalidate` for accessibility + autofill |
| 19 | Missing `required`/`pattern` HTML5 attributes | `booking.html:58-95` | Add native validation attributes as first defense layer |
| 20 | Error messages leak internal state | `google_apps_script_updated.js:171-708` | Return generic messages to client; log full details server-side |
| 21 | All validation errors use `alert()` | `src/js/booking.js:501-605` | Replace with inline field-level error messages; no modal blocking |
| 22 | No autosave / draft recovery | `booking.html` | Save form state to `sessionStorage` on input; restore on page load |
| 23 | No keyboard shortcuts | `admin.html` modals | Escape closes modal; Ctrl+Enter submits form; arrow keys navigate tables |

### Rationale

The `alert()` pattern blocks user flow and provides no visual anchor to the invalid field. Inline feedback is both more accessible and more usable.

---

## Phase 5 🟢 Code Quality & Maintainability (8–10 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 24 | **admin.js is monolithic (5,236 lines)** | `src/js/admin.js` | Split into modules: `dashboard.js`, `table.js`, `reports.js`, `settings.js` |
| 25 | Chaotic CSS breakpoints (28 media queries) | `src/css/admin.css` (global) | Standardize to 4 breakpoints: 480px / 768px / 1024px / 1920px |
| 26 | Duplicate utility functions in 4 files | `src/js/admin.js`, `src/js/booking.js`, `src/js/status.js`, `src/js/chatbot.js` | Extract `toLocalDateStr`, `escHtml`, `maskPrisonerName` to `src/js/utils.js` |
| 27 | Hardcoded GAS URL in 4 files | `src/js/booking.js:2`, `src/js/status.js:2`, `src/js/admin.js:29`, `src/js/chatbot.js:2` | Extract to `src/js/config.js` included before other scripts |
| 28 | Dead code branches | `src/js/booking.js:776-779`, multiple CSS blocks | Remove unused demo mode, duplicate CSS, dead classes |
| 29 | Duplicate CSS keyframes (`spin`) | `admin.css`, `status.css`, `booking.css` | Define once in `base.css`; remove from others |
| 30 | Legacy `adminlte.*` files unused | `src/css/adminlte.css`, `src/css/adminlte.min.css`, `src/css/adminlte.rtl.css`, `src/css/adminlte.rtl.min.css`, `src/js/adminlte.js`, `src/js/adminlte.min.js` | Delete all — not referenced by any page |
| 31 | `fix-final.js` and `fix-print.js` are build scripts in root | `fix-final.js`, `fix-print.js` (project root) | Delete; incorporate any remaining mutations directly into `admin.js` |
| 32 | Global namespace pollution | All JS files | Wrap each file in an IIFE or ES module scope; minify surface area |
| 33 | No `.gitignore` | Project root | Create `.gitignore` for OS files, editor artifacts, `node_modules/` |
| 34 | `src/guide.html` is standalone with own i18n/CSS/JS | `src/guide.html` (1,955 lines) | Delete or link from app; currently unreferenced |
| 35 | i18n translations incomplete | `admin.html`, `i18n.js` | Add missing keys for admin panel; audit status page coverage |

### Rationale

With 5,236 lines in a single file, `admin.js` is the largest maintenance burden. Splitting it into focused modules will make future changes safer and faster.

---

## Phase 6 🟢 Polish & Edge Cases (4–6 hrs)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 36 | Calendar navigation missing `aria-label` | `booking.html:172-174` | Add `aria-label="previous month"` / `"next month"` for screen readers |
| 37 | Slip upload MIME type check is case-sensitive | `src/js/status.js:416` | Normalize with `.toLowerCase()` before comparing |
| 38 | Duplicate `@media` blocks not merged | `src/css/admin.css:263-357` | Combine two `min-width: 1920px` blocks into one |
| 39 | No loading skeletons — only text spinners | All pages | Add CSS skeleton screens for table & card loading states |
| 40 | No caching layer for prisoner master data | Architecture | Cache prisoner list in `CacheService` (GAS) for 5 minutes to avoid repeated reads |
| 41 | Slip filename not consistently escaped | `src/js/status.js:436` | Apply `escHtml()` to downloaded filename display in all render paths |
| 42 | Missing eslint/prettier config | Project root | Add `.eslintrc.json` + `.prettierrc` with consistent rules |

---

## Effort Summary

| Phase | Hours | Primary Impact |
|-------|-------|----------------|
| Phase 1 — Security critical | 6–8 | Prevents data breach & unauthorized admin access |
| Phase 2 — XSS & validation | 6–10 | Prevents code injection & corrupt data |
| Phase 3 — Hardening | 4–6 | Prevents abuse, CSRF, & race conditions |
| Phase 4 — UX | 4–6 | Better validation UX & accessibility |
| Phase 5 — Code quality | 8–10 | Easier maintenance & onboarding |
| Phase 6 — Polish | 4–6 | Accessibility & edge-case robustness |
| **Total** | **32–46 hrs** | |

---

## Quick Wins (can do in any order)

- Add `.gitignore` (5 min)
- Delete `test_connection.html`, `fix-*.js`, `adminlte.*` (5 min)
- Add `rel="preconnect"` for Google Fonts to all HTML files (5 min)
- Combine duplicate `@media` blocks in `admin.css` (10 min)
- Merge duplicate `spin` keyframes into `base.css` (10 min)

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
- Prisoner master data frequency: cache in `CacheService` to avoid hitting sheet quotas

### Key data formats
- **Extra visitors**: `name\|id\|relation\|age;;name2\|id2\|relation2\|age2`
- **Parallel arrays**: `extraVisitorReligions`, `extraVisitorAllergies`, `extraVisitorApproved` use `;;`-delimited values aligned by index
- **Thai ID format**: `X-XXXX-XXXXX-XX-X`

### Code style conventions
- All new text rendering must use `textContent` or `escHtml()` — no bare `innerHTML`
- All new reusable functions go in `utils.js`, not pasted per-file
- All configuration (URLs, passwords after migration) goes in `config.js`
- Prefer `const` over `let`; prefer `forEach` over `for` loops for readability
