HANDOFF
Date: 2026-05-26
Repo: nightdrop-dashboard
Session objective: Multiple ships in one session. (1) Phase 3 cutover deletion. (2) ND.calendar shape hotfix. (3) Shell height + width layout fix.
Status: COMPLETE — PR #2, PR #3, and PR #4 all merged and deployed.

---

## What was done

### Ship 1 — Phase 3: delete old card feed (PR #2, merge `9ef91c4`)

Branch `chore/phase-3-delete-old-feed`. Single commit `68d15df`. 1,512 lines deleted across 11 files (`DashboardView.jsx`, `RightRail.jsx`, all of `components/feed/*`). Also scrubbed a stale "RightRail mini" comment in `DealMap.jsx:110`. Lint 0, tests 207/207, build clean.

### Ship 2 — ND.calendar shape hotfix (PR #3, merge `e7ee064`)

Branch `fix/excel-feed-calendar-shape`. Single commit `4c0606e`. Production was throwing `TypeError: ND.calendar is not iterable` immediately on mount — `feed.js` and `tabs.js` iterate `ND.calendar` as `Array<Month{ weeks: Array<Week{ days: [...] }> }>`, but `publishToBundle` was overwriting it with the adapter's `{ days: [...] }` flat-object shape.

Fix in `sync.js`: dropped the adapter's `buildCalendar` import; added `isoDate`; set `ND.todayISO` then call `ND.buildCalendar()` (the bundle's own builder, which produces the correct shape) and assign to `ND.calendar`. Fallback to `[]` (iterable) when bundle builder is absent. TDD: 6 RED tests first, then GREEN. 211/211 (+4 net). Reviews APPROVED zero findings. Production chunk inspection confirmed `typeof e.buildCalendar` + `todayISO` minified patterns present.

### Ship 3 — Shell height + width layout fix (PR #4, merge `e2b582f`)

Branch `fix/excel-feed-shell-height`. Single commit `95b0899`. After Ship 2 unblocked mount, the shell was rendering as a 240×84 thin strip in the wrong corner of `.app-content`. Full data was in the DOM; CSS layout was collapsed.

Two unrelated rules forced the wrong layout, one from each side of the integration:

1. **Height collapse** — `src/vendor/deal-feed/styles.css:271` defines `.nd-excel-shell .main { display: grid; grid-template-rows: var(--topbar-h) 1fr; height: 100vh }`. The bundle's reference markup placed `<div class="topbar">` first to fill the 84px row, then `<section class="feed">` to fill `1fr`. Our wrapper omits the bundle topbar (host TopHeader replaces it per locked decision 5), so the only child `.feed` auto-placed into the 84px row and the `1fr` row sat empty.
2. **Width collapse** — wrapper had `className="nd-excel-shell app"`. The bundle's `.nd-excel-shell .app` selector is a descendant combinator (space) and never matched co-located classes. But the host's legacy `src/styles/styles.css:96` defines a bare `.app { display: grid; grid-template-columns: 240px 1fr; height: 100vh; overflow: hidden }` rule that DID match, forcing the wrapper into a 240px sidebar column.

Fix:
- New `src/views/DealFeedExcelView.css` — one override on `.nd-excel-shell .main` collapsing to `grid-template-rows: 1fr` and swapping `100vh` for `100%`. Scoped under `.nd-excel-shell`. Side-effect imported AFTER vendor CSS so cascade wins. Vendor files untouched.
- `DealFeedExcelView.jsx` — dropped the dead `app` class from the wrapper className. The class fed only the host's legacy rule (never any bundle rule).

Verification at 1440x900: shell now 1160x812 fills `.app-content` exactly. `.main` 1160x812 (was 240x812). Full 12-column spreadsheet renders with toolbar, statsbar, empty-state row, weekday tabbar. Zero console errors. Reviews APPROVED zero findings. Production chunks confirmed: CSS chunk contains `.nd-excel-shell .main{grid-template-rows:1fr;height:100%}` (last rule in cascade — wins on equal specificity); JS chunk contains `className:\`nd-excel-shell\`` with no trailing `app`.

---

## Architecture decisions locked this session

1. **Calendar shape contract.** `data.js#ND.buildCalendar` is the canonical builder. Any wrapper code that updates the calendar must call `ND.buildCalendar()` (not produce its own shape). `ND.todayISO` and `ND.deals` must be set first.
2. **Fallback to `[]` not `undefined`.** When the bundle's builder is absent, set `ND.calendar = []`. Iterability of `ND.calendar` is a hard invariant; tests regression-lock it.
3. **Host CSS overrides for vendor bundle live in `DealFeedExcelView.css`.** Imported AFTER the vendor CSS so cascade wins on equal-specificity selectors. Scoped under `.nd-excel-shell`.
4. **Wrapper className is `nd-excel-shell` only.** The legacy `app` class is gone — it never activated any bundle rule (descendant selector mismatch) and was polluting the wrapper via the host's bare `.app` rule.

---

## What was NOT done

- **Phase 4** (Playwright `tests/excel-feed.spec.js` + selector audit) — Brady's plan from the prior session entry. Pushed again this session because three production fires took priority. Now unblocked.
- **Phase 5** — Manual browser walkthrough of all 14 PRD flows.
- **Two dead `.app` rules** — vendor `styles.css:59` `.nd-excel-shell .app` and host `styles.css:96` bare `.app`. Both no longer match anything useful. Removing either would clean up cognitive load but is out of scope for the hotfires. Separate cleanup ticket.
- **Adapter `buildCalendar` dead-export cleanup** — Still exported from `adapter.js`, still has 46 tests covering it. Removing both would drop test count; future small PR.
- **Bundle's hardcoded calendar window** — `data.js:174-176` hardcodes `today = 2026-05-24` and a Dec-2025→Jun-2026 range. Calendar popover will look stale until the bundle's builder honors `ND.todayISO` and accepts a window argument. Separate ticket.
- **Backend orphan endpoint** — `GET /api/dealfeed/agent/messages` was orphaned in Ship 1. Ticket at `notes/bmad/deal-feed-excel/orphan-routes.md` for the backend repo.
- **`feat/deal-detail-v1` branch merge** — Still on its own branch.

---

## Files in working tree

Clean. `git status` empty. Local `main` matches `origin/main` at `e2b582f`.

---

## Next session

```
cd ~/nightdrop-dashboard && claude --dangerously-skip-permissions
```

Suggested objective: **Phase 4 — Test coverage updates** (now truly unblocked — production is stable, layout is correct, no more fires expected from the cutover itself).

1. `/init` to load HANDOFF + verify CLAUDE.md + check BMAD state.
2. Read `notes/bmad/deal-feed-excel/stories.md` Stories 4.2 and 4.3.
3. Read `notes/bmad/deal-feed-excel/PRD.md` flows F1–F14.
4. Audit existing Playwright suites first (Story 4.3 — fast cleanup). Then write the new spec (Story 4.2 — larger).
5. Run on a new branch `test/phase-4-playwright` off `main`.

If Phase 4 finishes fast, two quick cleanups could ride the same session: the dead `.app` rules + the adapter `buildCalendar` dead export. Each is one PR, each is small.

---

## Known Vendor Latent Bugs

- **Top stats strip stub data.** The bundle's header strip showing `47 SUBMITTED`, `BOXES 48`, `QUEUE 00`, `BRIEFS 00`, `DELIVERED` is rendered from hardcoded values inside the vendor bundle. Same class of problem as the calendar window (bug #3/#4) — vendor demo data baked into source. To be addressed after PR B or in a dedicated stub-data cleanup PR. Surfaced during Brady's PR A local walkthrough on 2026-05-26.

- **Cursor position on cell edit-mode entry (deferred — needs post-merge verification).** During the `fix/cell-selection-vs-edit-indicators` work on 2026-05-26 we made `selection.js` use `range.selectNodeContents(span)` + `range.collapse(false)` to land the caret at the END of existing content on dblclick — matching Sheets/Excel. The G-lock regression test in `tests/dealsheet-persistence.spec.js:365` asserts this. Open question: in real authored use (typing into a populated cell across multiple keystrokes, then re-entering edit mode), does the caret still land where the user expects? If the G=end behavior fully resolves the deferred concern that lived here, this bullet can be deleted in a future doc commit. If a residual issue surfaces post-merge in real usage, file it as a separate PR with a reproducer.

---

## Blockers for Brady

None. Production is restored, stable, and visually correct. Phase 4 is fully unblocked.

One thing to confirm at your leisure: refresh the production browser tab you had DevTools open in during the layout audit, and confirm the spreadsheet fills the container as expected. I verified both fixes are in the deployed chunks (CSS override rule present, wrapper className stripped) and ran a clean prod boot probe (0 errors at the login page), but the bundle-mount verification requires your authed session.

Optional decision still pending: when to merge `feat/deal-detail-v1` to main.
