HANDOFF
Date: 2026-05-27 (session 5 — P0 production fix)
Repo: nightdrop-dashboard
Session objective: Fix the production bug where the Deal Sheet shows hardcoded mock data and the map shows no pins for real users on nightdropai.netlify.app.
Status: PR #13 OPEN + MERGEABLE awaiting Brady's manual smoke on the Netlify preview deploy.

---

## What was done

### Diagnosis (3 read-only investigation agents)

User-driven DevTools fetch confirmed the backend correctly returns 10 deals with real lat/lng for `brady@parcyl.ai`. The bug was entirely client-side and had three compounding causes traced via parallel code-explorer agents:

1. **Bundle adapter contract drift.** Backend `/api/dealfeed/deals` was rebuilt on 2026-05-20 to return camelCase (`sentAt`, `buyBoxId`, `briefJson`, `addr`, `sf`, `entityType`, `yearBuilt`). The bundle's `toNDDeal()` kept reading snake_case (`sent_at`, `buy_box_id`, `brief_json`, etc.). Every deal's `deliveredOn` came out null because `sent_at` was undefined → bundle day-filter dropped all 10 real deals.

2. **Bundle calendar-freeze.** `src/vendor/deal-feed/tabs.js:6` captured `const cal = ND.calendar` at IIFE-time and initialized `state.activeMonth/Week/Day` once at IIFE-time. `publishToBundle` rebuilt the calendar on every host update but tabs.js never re-read. State pinned to the hardcoded `2026-05-24` anchor.

3. **Hardcoded mock data in data.js.** ~130 lines of hardcoded `ND.deals = [...]`, plus a seeded RNG synthesizing fake historical day counts (1-12 per day), plus hardcoded `ND.todayISO = '2026-05-24'`. This was the visible "55 deals delivered" footer ghost Brady reported.

Plus: **Map auto-fit gate too restrictive.** `DealMap.handleMapLoad` bailed out of `fitDeals` whenever `initialViewState` was non-null — even if the saved viewport pointed at Austin while deals were in Denver. Users with stale localStorage viewports saw empty maps.

### PR #13 — `fix/bundle-adapter-and-mock-data`

5 commits off main:

| Commit | Subject |
|---|---|
| `5f5f7c7` | fix(adapter): align toNDDeal with rebuilt backend camelCase response shape |
| `f14d617` | fix(bundle): tabs.js re-syncs state to live ND.calendar on each render |
| `3b8860e` | chore(bundle): strip hardcoded mock deals + fake RNG counts from data.js |
| `f688851` | fix(map): auto-fit when saved viewport doesn't contain any deals + log silent drops |
| `15bbf21` | fix(adapter): pass lat/lng through toNDDeal output for future bundle consumers |

Gate results:
- `npm run lint` — clean
- `npm test -- --run` — **229/229 vitest** (was 211 — added 18 new tests covering the backend camelCase shape, lat/lng passthrough, and buildCalendar)
- `npm run build` — clean, DealFeedExcelView lazy chunk 390.26 KB / 89.38 KB gzipped
- `npx playwright test tests/excel-feed.spec.js tests/dealsheet-persistence.spec.js` — **12/12** (9 dealsheet-persistence + 3 excel-feed Stage 1)
- code-reviewer agent — 1 CRITICAL claim based on incorrect data-flow trace (map doesn't consume toNDDeal); the lat/lng passthrough was added defensively as commit `15bbf21`. 1 HIGH theoretical render-loop concern dismissed (rAF throttle prevents recursion).
- security-reviewer agent — CLEAN, no findings.

PR URL: https://github.com/Syndnet-CRE/nightdrop-dashboard/pull/13

### Manual smoke required (Brady, on Netlify preview)

When Netlify generates the preview URL for PR #13, Brady to verify:
1. Deal Sheet grid shows 10 real deals (not 8 demos). Footer says `Showing N of 10`, not `55 deals delivered`.
2. Day tabs show the real current week with real day counts.
3. Hamburger calendar (cal popover) shows real month totals, not fake RNG counts.
4. Map shows pins over the deals' real coordinates (Colorado/Broomfield area for brady's account).
5. DevTools console clean (any `[DealMap] dropped deal without coordinates` warns indicate backend-side geocoding gaps, not a regression).

If all 5 are clean → `gh pr merge 13 --squash --delete-branch`.

---

## What was NOT done (out of scope)

- **PR #12 rebase.** That open PR (`test/phase-4-stage-2`) has Stage 2 Playwright tests using a `BUNDLE_TODAY='2026-05-24'` workaround that becomes obsolete once PR #13 lands. After merging #13, PR #12 either gets rebased + workaround stripped (preferred) or closed in favor of a fresh follow-up PR with dynamic dates.
- **Backend list-endpoint audit.** Agent C confirmed the backend response is correct. No `~/nightdrop-api` changes needed.
- **F11 UI trigger** (bundle has `ND._toggleExpand` machinery but no UI event calls it). Separate decision: wire a UI trigger or delete the dead code.
- **9 pre-existing critical-flows failures** (`page-fade` overlay interception). Tracked from session 3, still untouched.

---

## Anomalies / open questions

- **Brady's "mystery auto-commit"** from earlier this morning (`728ff08` fix(adapter): isoDate uses local time) — still unidentified. Worth checking before similar concurrent edits cause merge conflicts again.
- **No telemetry on bundle-load failure modes.** If `publishToBundle` silently fails (auth error, network blip), users see the empty-state UI now (since mock data is stripped). Could be confusing without a "no deals yet — try refreshing" toast. Not regression-blocking but worth a follow-up.

---

## Decisions made

- **camelCase-first reads with snake_case fallbacks** in adapter — backward compat for fixtures and any host that still serves snake_case.
- **`syncStateToCalendar` is idempotent** — preserves user day-tab navigation when the active day is still in the (new) calendar.
- **Removed all mock data + RNG synthesis from data.js** — not gated by env var or feature flag. Real users need real data only.
- **Map auto-fit only when saved viewport contains zero deals** — preserves intentional pan/zoom when at least one deal is visible.
- **Defensive lat/lng passthrough in toNDDeal** even though the map doesn't currently consume it — small cost, prevents future contract gaps.
- **Did NOT fold PR #12's Stage 2 tests into PR #13** — keeps the P0 fix focused. PR #12 will rebase or close after #13 merges.

---

## Blockers for Brady

1. Smoke-test the Netlify preview URL for PR #13 once it builds. Five-item checklist above.
2. Decide PR #12 fate after #13 merges: rebase + strip workaround, OR close + reopen with dynamic-date tests.
3. Optional: identify the source of the morning's mystery commit `728ff08`.

---

## Post-mortem

This bug shipped because in PR #12 this morning I treated the bundle calendar-freeze as a "test fixture workaround" instead of stopping to smoke production. The HANDOFF flagged it as "real bundle bug worth fixing" but as a follow-up rather than a P0. Brady caught it the same day. Full post-mortem in chat. Process changes I committed to:

1. Manual prod smoke before declaring any cutover-class change done.
2. No "fixture workaround" framing in test code — if a fixture has to lie, production is broken.
3. Any `data.js`-shaped file with hardcoded data is treated as a release blocker until I've confirmed the production app never reads it.
4. Every test spec for a data-bound surface needs at least one non-empty fixture test from day one (Stage 1's empty-deals-only coverage was a false-confidence test that shipped this bug).
5. When I find a bug while doing something else, it becomes its own task with its own priority — not a footnote.

---

## Resume command (next session)

```
cd ~/nightdrop-dashboard && claude --dangerously-skip-permissions
/resume-session 2026-05-27-ndsh-bundle-fix-progress
```

If PR #13 is merged: `git switch main && git pull --ff-only` then decide on PR #12 rebase or pivot to deal-sheet visual wiring per Brady's compaction note.

If PR #13 is still open: `gh pr view 13` first, address any review feedback, re-run gates.
