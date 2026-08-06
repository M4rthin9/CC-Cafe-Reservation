You are working directly in the repo for a Thai correctional-facility 
booking system: admin.html, admin.js, booking.html, booking.js, 
status.js, chatbot.js, config.js, utils.js, i18n.js, and 
google_apps_script_updated.js (Google Apps Script backend). Your job is 
to actually fix the slow-loading issues below — not just report them. 
Make the code changes directly, then show diffs for each.

════════════════════════════════════════
BEFORE YOU TOUCH ANYTHING
════════════════════════════════════════
- Read config.js, booking.js, status.js, admin.js, and chatbot.js in 
  full before editing any of them. These files share state (APPS_SCRIPT_URL, 
  waitForUrlReady, localStorage keys) — a change in config.js can break 
  callers in all four other files. Trace every call site of 
  waitForUrlReady(), initBackendUrl(), resolveBackendUrl(), and 
  appsScriptFetch() before changing their contract.
- Do not assume — verify. If you're not sure whether a function is 
  called elsewhere, grep for it across the whole repo first, not just 
  the file you're editing.
- Preserve every existing error-handling path (try/catch, timeout 
  fallback, the 404-recovery flow) unless a fix explicitly says to 
  change it. Silent removal of error handling to "simplify" code is not 
  acceptable — if you think a fallback path is now dead code, say so and 
  ask, don't delete it unilaterally.
- These are Thai-language, public-facing government forms handling PII 
  (prisoner IDs, visitor names, phone numbers). Do not change any 
  user-facing strings, validation logic, or data fields as a side effect 
  of a performance fix. If a performance fix would require touching 
  validation or data-handling logic, stop and flag it instead of 
  proceeding.

════════════════════════════════════════
FIX 1 (highest priority) — Kill the double cold-start round trip
════════════════════════════════════════
In config.js, bootstrap() calls _discoverBackendUrl() to resolve the 
Apps Script /exec URL, and pages (e.g. booking.js loadPrisonerMaster()) 
wait for that to finish before making their real data request. Since 
Google Apps Script cold starts can take several seconds, this means two 
sequential multi-second round trips before any data appears.

Fix it so:
- The first real data call (getPrisoners, etc.) fires immediately using 
  DEFAULT_APPS_SCRIPT_URL (or the cached URL if one exists in 
  localStorage) — it must NOT wait on _discoverBackendUrl() first.
- Discovery still runs, but in the background, in parallel, only 
  updating APPS_SCRIPT_URL for subsequent calls if it finds a different 
  URL than what's already in use.
- Keep the existing _tryRecover404() reactive re-discovery (triggered 
  only on an actual 404/redirect-loop response) — that part is fine.
- Update initBackendUrl()/waitForUrlReady() and every caller across 
  booking.js, status.js, admin.js, chatbot.js so none of them block the 
  first request on discovery finishing.
- Edge case to think through: what happens if the very first real 
  request fails BECAUSE the hardcoded default URL is stale, and 
  discovery (running in parallel) hasn't resolved yet? Make sure there's 
  still a correct fallback/retry path, not just a faster happy path.

════════════════════════════════════════
FIX 2 — Stop over-aggressive cache wiping
════════════════════════════════════════
_tryRecover404() and the bootstrap stale-URL check currently clear both 
BACKEND_DISCOVERED_KEY and RESOLVED_URL_KEY from localStorage. Make sure 
this only happens on a confirmed 404 / redirect-loop response — never on 
generic network errors, timeouts, or aborts — so flaky connections don't 
trigger unnecessary full re-discovery (another cold GAS hit).

════════════════════════════════════════
FIX 3 — Defer/optimize render-blocking assets
════════════════════════════════════════
In booking.html (and admin.html / status.html if the same pattern 
exists):
- Add `defer` to the sweetalert2 <script> tag, or load it dynamically 
  right before it's actually needed (submitBooking()).
- Add <link rel="preconnect"> for cdn.jsdelivr.net and for the Apps 
  Script domains (script.google.com, script.googleusercontent.com), 
  alongside the existing font preconnects.
- Grep all HTML files for `ti ti-` classes to find which Tabler icons 
  are actually used, and replace the full Tabler Icons webfont CDN 
  stylesheet with either inline SVGs for just those icons or a trimmed 
  subset. Before doing this, list every icon class you found so it's 
  clear nothing gets silently dropped from the UI.

════════════════════════════════════════
FIX 4 — Don't block user actions on the Cloudflare trace call
════════════════════════════════════════
In utils.js, clientMeta.load() fetches https://www.cloudflare.com/cdn-cgi/trace 
for IP/audit logging. Find every place in booking.js and admin.js where 
waitClientMeta() is awaited BEFORE a submit/login action completes, and 
change those to fire-and-forget: kick off the IP fetch in parallel with 
the main request, and attach the IP to the log write asynchronously 
(or omit it) if it isn't back yet — never let it delay the primary 
action. Confirm the backend (google_apps_script_updated.js) tolerates a 
missing/empty IP field gracefully before making this change — check 
logEvent() and any handler reading body.ip.

════════════════════════════════════════
FIX 5 — Extend backend caching coverage
════════════════════════════════════════
google_apps_script_updated.js already caches the 'prisoners' list via 
CacheService.getScriptCache(). Audit every other GET route (sheet info, 
reservation counts, quota/date-availability lookups, etc.) for the same 
pattern and add CacheService caching wherever a route reads a sheet on 
every call but the underlying data doesn't change every request.
- CacheService entries are capped at 100KB per key — if any dataset 
  might exceed that, say so instead of silently caching a truncated 
  result.
- Add matching cache-invalidation calls (like the existing 
  invalidatePrisonersCache()) at every write path that touches that 
  data — a stale cache that silently serves outdated booking/quota 
  numbers is worse than no cache at all. List every write path you 
  found and confirm each one now invalidates the right cache key.

════════════════════════════════════════
VERIFICATION (do this before declaring a fix done)
════════════════════════════════════════
For each fix, after making the change:
- Re-read the modified function(s) end to end and confirm the original 
  behavior is preserved for the non-happy-path (network failure, empty 
  cache, first-ever visit with no localStorage data).
- Check that you haven't introduced a race condition (e.g. background 
  discovery finishing and swapping APPS_SCRIPT_URL mid-request).
- If you can run/lint the JS, do so. If not, at minimum re-read the diff 
  once fresh, as if reviewing someone else's PR, before moving to the 
  next fix.

════════════════════════════════════════
OUTPUT
════════════════════════════════════════
For each fix: make the change directly in the relevant file(s), then 
show the diff. At the end, give a short summary of which fixes reduce 
cold-start latency vs. which reduce render-blocking time, list anything 
you found along the way that looks broken or risky but wasn't in this 
list, and flag any fix you could NOT safely complete along with why.