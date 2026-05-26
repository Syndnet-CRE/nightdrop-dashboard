HANDOFF
Date: 2026-05-26
Repo: nightdrop-dashboard
Session objective: Two ships in one session. (1) Phase 3 of Deal Feed Excel cutover — delete the old card feed. (2) Production hotfix — restore ND.calendar shape so the Excel feed mounts.
Status: COMPLETE — PR #2 and PR #3 both merged and deployed.

---

## What was done

### Ship 1 — Phase 3: delete old card feed (PR #2, merge `9ef91c4`)

Branch `chore/phase-3-delete-old-feed` off main at `3b17cc3`. Single commit `68d15df`. PR #2 https://github.com/Syndnet-CRE/nightdrop-dashboard/pull/2 merged, Netlify auto-deployed.

Story 3.1 — Listed deletion candidates back to Brady. Confirmed:
- Hard targets: `DashboardView.jsx`, `RightRail.jsx`, `components/feed/*.jsx` (9 files).
- CLAUDE.md's "orphan" list (`BuyBoxConfigurator/`, `BuyBoxEditModal.jsx`, `wizardHelpers.*`) was already deleted in a prior session — CLAUDE.md is stale on that line.

Story 3.2 — Executed. 1,512 lines deleted across 11 files:
- `src/views/DashboardView.jsx` (234)
- `src/components/RightRail.jsx` (131)
- `src/components/feed/{AgentMessageCard,ChatFab,DealChatThread,FeedDealCard,FeedToolbar,MessageInputBar,MiniCalendar,TonightsRunCard,WeekDayTabs}.jsx`

Also scrubbed a stale "RightRail mini" comment in `src/components/DealMap.jsx:110`.

Verification:
- grep for deleted names across `src/` + `tests/` → zero matches.
- lint 0 errors, tests 207/207, build clean (entry chunk 613.37 kB, no regression).

### Ship 2 — Production hotfix: ND.calendar shape (PR #3, merge `e7ee064`)

Branch `fix/excel-feed-calendar-shape` off main at the Phase 3 merge commit. Single commit `4c0606e`. PR #3 merged, Netlify auto-deployed. Production chunk `DealFeedExcelView-jxLyqO_1.js` verified to contain `typeof e.buildCalendar` (minified `typeof ND.buildCalendar`) + `todayISO` — fix is live.

Root cause (full audit in chat earlier this session):
- `feed.js:183` and `feed.js:527` iterate `ND.calendar` as `Array<Month{ weeks: Array<Week{ days: Array<Day> }> }>`.
- `tabs.js:6` snapshots `ND.calendar` at IIFE load expecting the same shape.
- The bundle's own `data.js#ND.buildCalendar` produces that shape; `data.js:259` sets `ND.calendar` correctly at module load.
- The wrapper's `publishToBundle` then overwrote `ND.calendar` with `{ days: [...] }` from the adapter's `buildCalendar`. feed.js's `for...of` blew up immediately. tabs.js survived only because its snapshot captured the pre-overwrite shape.

Fix in `src/vendor/deal-feed/sync.js` (12 lines changed):
- Dropped the adapter's `buildCalendar` import.
- Added `isoDate` import.
- After setting `ND.deals` / `ND.boxes`, set `ND.todayISO` from the `today` arg (or `new Date()` fallback).
- Call `ND.buildCalendar()` if it is a function and assign to `ND.calendar`.
- Fall back to `[]` (iterable empty array) when the bundle's builder is absent, so feed.js's `for...of` never throws.

TDD discipline (RED → GREEN):
- 6 failing tests written first in `src/vendor/deal-feed/sync.test.js`.
- Implementation flipped all 6 to green.
- 2 existing tests had wrong-shape assertions (`ND.calendar.days.length`) updated to `Array.isArray(ND.calendar)`.
- 4 new tests added: todayISO formatting + timing, current-date fallback, deals-populated-before-buildCalendar-runs order, iterable empty-array fallback regression.

Adapter's `buildCalendar` export is intentionally left in place — its 46 tests stay green. Dead-export cleanup is deferred to a future PR to keep this hotfix minimal.

Reviews:
- code-reviewer agent: APPROVED, zero findings any severity.
- security-reviewer agent: PASS, zero findings, full OWASP top 10 clean.
- /quality-gate: lint 0 errors, tests 211/211 (+4 net, no drop), build clean.

Production verification:
- Deployed chunk inspection confirms the fix code is live (`typeof e.buildCalendar` minified pattern present).
- Local Playwright probe pre-merge: `/dashboard` mounts `.nd-excel-shell`, 0 console errors, 0 TypeError matches.
- Post-merge Playwright probe of the production URL (unauthenticated): login page boots clean, 0 errors. **Authenticated bundle-mount verification still requires Brady's existing logged-in browser tab — refresh and check DevTools to confirm the TypeError is gone.**

---

## Architecture decisions locked this session

1. **Calendar shape contract.** The bundle's `data.js#ND.buildCalendar` is the canonical calendar builder. Any wrapper code that needs to update the calendar must call `ND.buildCalendar()` (not produce its own shape). `ND.todayISO` must be set first because the builder reads it.
2. **Fallback to `[]` not `undefined`.** When the bundle's builder is absent, set `ND.calendar = []`. Iterability of `ND.calendar` is now a hard invariant; the test regression-locks this.
3. **Two calendar builders is a smell.** The adapter's `buildCalendar` is now dead. The CLAUDE.md rule ("when two systems in the codebase do the same thing, consolidate") says clean it up — but only after the production fire is out. Deferred to its own PR.

---

## What was NOT done

- **Phase 4** (Playwright `tests/excel-feed.spec.js` + selector audit of existing suites) — Brady's instruction this session: "Do not start Phase 4 until I review and merge [PR #2]." Then the production crash pulled focus to the hotfix. Phase 4 is the natural next-session objective now that PR #3 is shipped.
- **Phase 5** — Manual browser walkthrough of all 14 PRD flows.
- **Adapter `buildCalendar` dead-export cleanup** — Removing it + its 46 tests would either drop the test count or force re-coverage elsewhere. Filed for a small follow-up PR after Phase 4 lands.
- **Bundle's hardcoded calendar window** — `data.js:174-176` hardcodes `today = 2026-05-24` and a Dec-2025→Jun-2026 range. The calendar popover will look slightly stale until the bundle's builder reads `ND.todayISO` and accepts a window argument. Separate ticket — not in scope for the hotfix.
- **CLAUDE.md stale "orphaned" list cleanup** — One-line strikethrough to note `BuyBoxConfigurator/`, `BuyBoxEditModal.jsx`, `wizardHelpers.*` were already deleted. Low priority.
- **Backend orphan endpoint cleanup** — `GET /api/dealfeed/agent/messages` is fully orphaned now (consumer `AgentMessageCard` was deleted in PR #2). Tracker at `notes/bmad/deal-feed-excel/orphan-routes.md` for the backend repo.
- **`feat/deal-detail-v1` branch merge** — Still on its own branch awaiting a separate decision. No urgency.

---

## Files in working tree

Clean. `git status` empty. Local `main` matches `origin/main` at `e7ee064`.

---

## Next session

```
cd ~/nightdrop-dashboard && claude --dangerously-skip-permissions
```

Suggested objective: **Phase 4 — Test coverage updates** (now unblocked).

1. `/init` to load HANDOFF + verify CLAUDE.md + check BMAD state.
2. Read `notes/bmad/deal-feed-excel/stories.md` Stories 4.2 and 4.3.
3. Read `notes/bmad/deal-feed-excel/PRD.md` flows F1–F14 (drives the new spec file).
4. Audit existing Playwright suites first (Story 4.3 — fast cleanup, removes any dead selectors). Then write the new spec (Story 4.2 — larger).
5. Run on a new branch `test/phase-4-playwright` off `main`.

Phase 5 (manual walkthrough) can happen in parallel — Brady can do it any time on the live Netlify deploy.

---

## Blockers for Brady

None. Production is restored and stable. Phase 4 is fully unblocked.

One small thing to confirm at your leisure: refresh the production browser tab you had open earlier in the session (the one showing the "ND.calendar is not iterable" error in DevTools) and verify the TypeError is gone after the hotfix. I verified the fix code is in the deployed chunk and that the same commit ran clean in a local browser, but I could not auth into prod from my probe to mount the bundle and verify end-to-end.

Optional decision still pending from earlier session: when to merge `feat/deal-detail-v1` to main.
