HANDOFF
Date: 2026-05-27 (session 5 — continued from session 4 via /resume-session)
Repo: nightdrop-dashboard
Session objective: Land the adapter-test follow-up that PR #10 needed (restore vitest 211/211), merge PR #10 with the codemap caveat dropped, and ship Phase 4 Stage 2 (F2/F5/F8/F9/F11/F12/F13).
Status: COMPLETE — PR #11 (adapter-tests) merged. PR #10 (Phase 4 Stage 1) rebased and merged. PR #12 (Phase 4 Stage 2) opened with reviewer-approved data-bound flow tests.

---

## What was done

### PR #11 — adapter-test UTC-midnight fix, merged

- Branched `fix/adapter-tests-local-tz` off `main` post-PR-#9 merge.
- Swapped the 5 brittle `T00:00:00Z` UTC-midnight fixture strings in `src/vendor/deal-feed/adapter.test.js` to `T12:00:00Z` (noon UTC) so the isoDate-now-uses-local-TZ semantics from commit `728ff08` no longer break across US/EU CI runners. Production code untouched. Acknowledged in the comment that UTC+12/+13 zones are not covered (out of scope for US/EU CI).
- code-reviewer ran and returned 1 LOW on comment wording ("never crosses a day boundary" was overstated). Tightened to "stable across US and EU CI runners."
- `gh pr merge 11 --squash --delete-branch` succeeded — main advanced to `bdade6d`.

### PR #10 — Phase 4 Stage 1, rebased and merged

- Switched back to `test/phase-4-playwright`, rebased onto `origin/main` (clean).
- Added a third commit dropping the now-obsolete "vitest currently 206 on main pending the adapter-test PR" caveat from `docs/CODEMAPS/architecture.md` and `.reports/codemap-diff.txt`. No amend — new commit per the global "always create new commits" rule.
- Force-pushed with `--force-with-lease`. PR went `OPEN+MERGEABLE` after GitHub re-evaluated.
- `gh pr merge 10 --squash --delete-branch` succeeded — main at `f2aa54e`.

### PR #12 — Phase 4 Stage 2 (THIS PR)

Branch `test/phase-4-stage-2` off post-PR-#10 main. One file changed (`tests/excel-feed.spec.js`, +294/-11). 7 new tests, all green.

Tests added:
- **F2** — clicking the `.chip[data-f="hot"]` chip filters `tr.dr` from 2 deals to 1 (the hot deal). Active class rotates off `All`, onto `Hot`.
- **F5** — clicking a deal-row cell drops `tr.unread` count by 1, sets `#cellAddr` to `"A1"`, writes `dealfeed.read.${SUBSCRIBER_ID}:deal-1 = 'true'` to localStorage.
- **F8** — right-click → context menu's `.ctx-item[data-act="mark_hot"]` fires `POST /api/dealfeed/deals/deal-2/feedback` with body `{ feedback: 'hot' }`. Method explicitly re-asserted at the assertion site.
- **F9** — filling the notes input and blurring fires `PATCH /api/dealfeed/deals/deal-1/notes` with body `{ notes: 'follow-up tuesday' }`. Method explicitly re-asserted.
- **F11** — bundle-machinery-only: `window.ND._toggleExpand('deal-1')` adds a `tr.xr` (which the PRD calls `tr.xtr` — the PRD is wrong; the actual class is `tr.xr`), calling again removes it. There is NO UI handler in the bundle that calls `_toggleExpand`. The gutter's dblclick handler (feed.js:622) routes to `openDetail`, not expand. Flagged below as the F11 UI gap.
- **F12** — dbl-click on `tr.dr td[data-col="address"]` navigates to `/deal/deal-1`. (First pass used `data-col="addr"`; the actual column key is `address` per feed.js:49 — fixed.)
- **F13** — clicking `.sheet-tab[data-day="2026-05-23"]` swaps the visible `tr.dr` set from today's 2 deals to the sibling-day's 2 deals.

### Bundle gap discovered while writing Stage 2: calendar is FROZEN

While debugging F2 (which initially failed with 0 rows visible), I found that the bundle's data.js hardcodes `ND.todayISO = '2026-05-24'` (line 153) AND auto-runs `ND.calendar = ND.buildCalendar()` at module-load time. Then tabs.js's IIFE (line 6) captures `cal = ND.calendar` and initializes `ND.state.activeMonth/activeWeek/activeDay` ONCE at IIFE time. The first `publishToBundle()` from React DOES update `ND.todayISO` and rebuild `ND.calendar`, but tabs.js never re-initializes `state` from the new calendar.

So the bundle's active day is permanently pinned to `2026-05-24` (a Sunday), and the visible week is May 18–24 2026 — regardless of the real wall-clock today. Stage 2's fixture works around this by using constants `BUNDLE_TODAY='2026-05-24'` and `BUNDLE_SIBLING='2026-05-23'` to land deals inside the frozen week. The block comment above the helpers explains the workaround for future readers.

This is a real bundle bug worth fixing — when the bundle's hardcoded date is replaced with a dynamic initializer that derives from `ND.todayISO`, the fixture constants can be swapped to dynamic dates and the rest of the spec still works.

### F11 UI gap discovered

The bundle defines `ND._toggleExpand(id)` (feed.js:815) and renders a `tr.xr` sibling when `xId === d.id`, but NOTHING in the bundle UI calls `_toggleExpand`. The gutter dblclick (feed.js:622) goes to `openDetail`. The PRD says "dbl-click row gutter → tr.xtr appears" — both the trigger AND the class name are wrong vs the bundle. Stage 2 exercises `_toggleExpand` directly via `page.evaluate` so the underlying machinery stays regression-proof for when a UI trigger is added later. Worth deciding: add a UI trigger to feed.js or remove the expand machinery as dead code.

### Reviewer findings — addressed inline (no separate commits)

- **HIGH** — `request.postData()` semantic clarity for PATCH requests. Added explicit `expect(request.method()).toBe('PATCH')` / `'POST'` assertions next to body assertions in F8 + F9 so the intent is obvious at the use site.
- **MEDIUM** — subscriber-id coupling. Extracted `SUBSCRIBER_ID = 'test-uuid-1'` constant at top of file; F5's localStorage assertion now reads it. Single source of truth.
- **MEDIUM (write-routes scoped at helper-level)** — accepted as documented intentional. Acceptable trade-off for the Stage 2 size.
- **MEDIUM (runtime bundle-date validation)** — rejected. The reviewer's proposed check would read `window.ND.todayISO` which `publishToBundle` updates to REAL today, NOT the frozen `'2026-05-24'`. Wrong target. The frozen state lives in `tabs.js`'s captured `state.activeDay`, which isn't a public surface to assert against without coupling to bundle internals. The current failure mode (`toHaveCount(2)` returning 0 with the test comment block explaining why) is informative enough.
- **LOW (F11 HANDOFF cross-reference)** — fixed; the comment now says "flagged in the PR body" instead of HANDOFF.
- **LOW (selector + style notes)** — no change needed.

Gate results:
- `npm run lint` — clean.
- `npm test -- --run` — 211/211 vitest pass.
- `npm run build` — clean, DealFeedExcelView lazy chunk 390.26 KB / 89.38 KB gzipped (unchanged).
- `npx playwright test tests/dealsheet-persistence.spec.js tests/excel-feed.spec.js` — 19/19 pass (9 dealsheet + 10 excel-feed).

---

## What was NOT done

- **Stage 3** of Phase 4 (F4/F6/F7/F10). Tracked as Task #8. Different fixture needs — clipboard permissions, drag choreography, PATCH sequencing.
- **Bundle calendar-freeze fix.** Out of scope for tests-only PR. Issue is in `src/vendor/deal-feed/data.js:153` and `src/vendor/deal-feed/tabs.js:6,17-21`. Either:
  - Move `ND.todayISO` set to a function called at `publishToBundle` time, and have tabs.js's render() re-derive state from `ND.todayISO` on each render.
  - Or accept the freeze as intentional and document it.
- **F11 UI trigger.** Either wire a dblclick handler that calls `_toggleExpand` (cleanest UX would be Ctrl/Cmd+E or a row-gutter chevron) or delete the dead machinery.
- **9 pre-existing critical-flows failures** (page-fade overlay interception). Tracked from session 3, still untouched.
- **Story 4.3 MEDIUM/LOW rewrites** in `smoke.spec.js`. Tracked from session 3.

---

## Next session

Three clean exit paths:

**Path A — "merge PR #12 then ship Stage 3":**
1. Brady reviews + merges PR #12.
2. Branch `test/phase-4-stage-3` off main.
3. Implement F4 per-column filter, F6 range-copy-as-TSV (needs `context.grantPermissions(['clipboard-read'])`), F7 bulk-set-stage, F10 stage dropdown.
4. Full gate + reviewer + PR.

**Path B — "pivot to deal sheet visual wiring + deal ID page field population" (per session-4 compaction hint):**
- Merge PR #12 first to keep the test floor clean.
- Then start a new branch for the visual/field work. BMAD required (touches 3+ files, multi-session scope).

**Path C — "address the bundle calendar-freeze bug first":**
- Out of scope for tests; would let Stage 2 fixture use real dates instead of hardcoded BUNDLE_TODAY.
- Could unlock additional cross-day testing in Stage 3.

Brady's call.

Branch: `test/phase-4-stage-2` at `66dcbf7` on origin.

Start command: `cd ~/nightdrop-dashboard && claude --dangerously-skip-permissions`
