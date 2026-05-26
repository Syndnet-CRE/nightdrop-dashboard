HANDOFF
Date: 2026-05-26
Repo: nightdrop-dashboard
Session objective: Complete Phase 2 (frontend integration scaffold) of the Deal Feed Excel cutover, fix CI lint, ship to main.
Status: COMPLETE — PR #1 merged to main, Netlify deployed, CI green.

---

## What was done

### Phase 2 — Frontend integration scaffold (12 stories, all shipped)

All 12 stories from `notes/bmad/deal-feed-excel/stories.md` Phase 2 executed in order. Branch `feat/deal-feed-excel-cutover` squash-merged as PR #1 at `3b17cc3`.

Commits on the branch (oldest → newest):
- `9bb44ca chore(deal-feed-excel): remove Phase 0.1 spike artifacts` — deleted `src/views/__excel-spike.jsx`, `scripts/spike-screenshot.mjs`, `scripts/scope-prefix-bundle-css.py`, removed `/__excel-spike` route from `src/App.jsx`. 534 lines gone.
- `17c80c3 fix: clean scope-prefix bugs + complete portaled-class renames` — Story 2.2. Six categories of bugs at the source: dropped `JetBrains Mono` from `--font-mono`; removed orphan `.app` property block; stripped accidental `.nd-excel-shell` prefix from `@keyframes` percentages; renamed `.nd-excel-shell .filter-pop*` → `.nd-filter-pop*` (32 selectors — portaled to document.body, scope prefix was dead); renamed `.nd-excel-shell .row-resize` → `.nd-row-resize`; fixed 3 impossible `.nd-excel-shell body.is-row-resizing` ancestor selectors.
- `80d35e6 refactor: rename bundle id 'app' → 'nd-excel-app'` — Story 2.3.
- `196f9f7 feat: add lucide shim module for Story 2.10 wrapper` — Story 2.4. New `src/vendor/deal-feed/lucide-shim.js` + 10-test spec. Bridges lucide-react@1.14.0 CDN-style `createIcons(opts[, root])` calls to lucide@1.14.0 npm API (which needs `opts.icons` injected). Verified all 45 names in ICON_MAP exist in pinned lucide.
- `4ab55ca feat: add adapter.js — host→bundle shape converters` — Story 2.5. `toNDDeal / toNDBox / buildCalendar` + helpers (`cleanNull`, `assetClassLabel`, `humanizeOwnerType`, `categoryToPillClass`, `isoDate`, `fmtDate`, `yearsSince`, `computeLA`, `hashIdToColor`). 46 tests covering the "null" string handling, every fallback path, hot/up flip, ext placeholders, calendar window edges.
- `6e97e10 feat: add sync.js — rAF-throttled host→bundle publishing` — Story 2.6. `createRrThrottle(ND)` + `publishToBundle({...})`. 13 tests including 5-publishes-→-1-_rr integration with the throttle.
- `b561e5e feat: add actions.js — bundle→host action adapters` — Story 2.7. `installActionAdapters(ND, hostActions)` with 8 verbs (toggleHot/toggleSave/saveNote/setStage/setStatus/markRead/deleteDeal/openDetail). Missing host primitives produce silent no-ops; deleteDeal cascades to updateStatus(id, 'archived') if host.deleteDeal absent. 18 tests.
- `836aa39 refactor: patch feed.js to call ND.actions instead of mutating ND.deals` — Story 2.8. 6 mutation sites rewritten to ND.actions.*; dead countdown tick() function removed (host TopHeader owns run-clock).
- `54f081c refactor: patch context-menu.js + selection.js to route via ND.actions` — Story 2.9. Also fixed a pre-existing UUID id bug — bundle used `parseInt(tr.dataset.id)` which returned NaN for UUID deal ids, silently no-op'ing every action. Pattern fixed across feed.js, selection.js, context-menu.js: `const id = tr.dataset.id; ds.find(x => String(x.id) === String(id))`.
- `d6abebe feat: add DealFeedExcelView wrapper + patchStage in DealsContext` — Story 2.10. New `src/views/DealFeedExcelView.jsx` with mount-once `loadBundleOnce()` Promise pattern (bundle IIFEs install document-level listeners — load exactly once for page lifetime, not per remount). `patchStage(dealId, stage)` added to `DealsContext` mirroring the existing optimistic-update-then-PATCH pattern.
- `866c62d feat: lazy-mount DealFeedExcelView at /dashboard + /calendar` — Story 2.11. `React.lazy` + `Suspense`. Entry chunk dropped from 765 kB → 613 kB (~45 kB gzip savings for users not on /dashboard); bundle code lives in its own lazy chunks.
- `a62ecd7 feat: add deleteDeal to DealsContext + wire through wrapper` — Story 2.12. Soft-delete via optimistic local removal + PATCH /status archived. Wired into `installActionAdapters` hostActions.

### Phase 2.5 — CI lint cleanup (one commit)

- `5e7f352 fix(lint): clean CI lint — vendor globals, ignores, surface-level host fixes` — went from 156 lint problems (154 errors + 2 warnings) to 0. Strategy:
  - `eslint.config.js`: new flat-config override for `src/vendor/deal-feed/**/*.js` declaring `ND` (writable) + `lucide` (readonly) as runtime globals, with relaxed `no-empty / no-unused-vars / no-useless-assignment / no-case-declarations` rules. Treats vendor as 3rd-party IIFE code. Killed 134 vendor errors with one block.
  - `globalIgnores` extended: `coverage`, `audit-runtime*.js`, `audit-runtime*.mjs`.
  - New `vite.config.js` file-scoped override with Node + browser globals.
  - Pre-existing host errors resolved via mix of dead-code deletion (App.jsx `useToast` import + assignment), `_`-or-disable-comment for retained-API params (DealMap demoMode, PipelineTimeline showLabels/showPhase), file-level `react-refresh/only-export-components` disable on PipelineTimeline (helpers exported for test imports), and `disable-next-line` comments with reasoning for `react-hooks/set-state-in-effect` (BuyBoxWizard, AccountsView) + `exhaustive-deps` (BuyBoxWizard filterKey).
  - No functional changes. All comments document intent.

### Final verification (every story + lint commit)
- `npm run lint` → 0 errors (was 156)
- `npm test` → 207/207 green (started session at 120 — +87 new tests across lucide-shim, adapter, sync, actions)
- `npm run build` → clean, lazy chunks split correctly
- PR #1 merged to main `3b17cc3`, Netlify auto-deployed.

### Lazy chunk shapes after Phase 2
```
DealFeedExcelView-*.js     390.62 kB │ gzip:  89.54 kB   (lazy, /dashboard only)
feed-*.js                   28.16 kB │ gzip:   8.84 kB
selection-*.js              14.20 kB │ gzip:   4.59 kB
data-*.js                   12.65 kB │ gzip:   4.56 kB
context-menu-*.js            8.31 kB │ gzip:   3.28 kB
filter-popover-*.js          6.37 kB │ gzip:   2.39 kB
tabs-*.js                    6.23 kB │ gzip:   2.02 kB
row-resize-*.js              2.04 kB │ gzip:   0.95 kB
sidebar-*.js                 0.70 kB │ gzip:   0.40 kB
index-*.js                 613.38 kB │ gzip: 186.06 kB  (entry; was 765/231 pre-Phase-2)
```

---

## Architecture decisions locked this session (all carried from prior session's HANDOFF, none reversed)

All 14 locked decisions from the prior session held — see prior HANDOFF for the list. The only meaningful clarifications added this session:
- `deleteDeal` recommendation in architecture.md (alias to `updateStatus(id, 'archived')`) was implemented as the host `deleteDeal` primitive in `DealsContext`. The actions.js adapter calls the primitive directly; the fallback to updateStatus stays in place as a safety net but is now unreachable in the happy path.
- `patchStage` is the host primitive for setStage. PATCHes `/api/dealfeed/deals/:id/stage` (the Phase 1 endpoint).
- ESLint treats `src/vendor/deal-feed/` as vendor code — relaxed rules, ND/lucide as runtime globals. This is the project's stance on the bundle going forward.

---

## Pre-existing bugs found and fixed this session

Two real bugs caught while wiring Phase 2, both load-bearing for any action to actually work:

1. **UUID id parsing in bundle JS** — every bundle id lookup used `parseInt(tr.dataset.id)`. Demo data had numeric ids; host deals are UUIDs. `parseInt('abc-123-uuid')` → NaN; every `ds.find(x => x.id === NaN)` returned undefined. Silently no-op'd every action handler in feed.js, selection.js, context-menu.js. Fixed in commit `54f081c` with `String(x.id) === String(id)` pattern at every site.

2. **Scope-prefix script artifacts** — the one-shot CSS scope-prefixing script left six categories of bugs: `@keyframes` percentages auto-prefixed (invalid CSS, animations silently dropped); `.nd-excel-shell body.*` impossibles (body is ancestor); orphan `.app` property block + stray `}`; portaled `.filter-pop` selectors with dead scope prefix; `JetBrains Mono` not stripped from font fallback chain. Fixed in commit `17c80c3`.

---

## What was NOT done (deliberately deferred to Phase 3+)

- **Phase 3** — Delete old card-based feed code (`src/views/DashboardView.jsx`, `src/components/feed/*`, `src/components/RightRail.jsx`). Story 3.1 says wait for Brady's "go" before listing deletion candidates. PR is merged but the old files still exist on main as a 7-day soak buffer.
- **Phase 4** — Vitest is covered (130 → 207 tests). Playwright `tests/excel-feed.spec.js` and host suite selector updates remain.
- **Phase 5** — Manual browser walkthrough of all 14 PRD flows. CI green + deployed satisfies Story 5.1's lint/build/test acceptance, but the manual flow walkthrough is a separate gate.
- **`feat/deal-detail-v1` branch merge** — still on its own branch awaiting separate decision.
- **Backend orphan endpoint cleanup** — `GET /api/dealfeed/agent/messages` is orphan after Phase 3. Flagged in `notes/bmad/deal-feed-excel/orphan-routes.md` for separate ticket.
- **Editable cell spans in feed.js (lines 647-669)** — addr/date/asset/owner/hold/sig/psf/sf editability was intentionally NOT patched. Those fields mutate the bundle's local view of `d`, which gets overwritten on the next publish. No backend persistence path exists for these fields today; mutations are benign and self-correcting. Parity with current card feed. Mentioned in commit `836aa39`.

---

## Files in working tree (none — clean)

`git status` clean. Local `main` is at origin/main (commit `3b17cc3`). The `feat/deal-feed-excel-cutover` branch is now merged; safe to delete locally with `git branch -d feat/deal-feed-excel-cutover`.

---

## Next session

cd ~/nightdrop-dashboard && claude --dangerously-skip-permissions

Suggested objective: **Phase 3 — delete old card feed code**.

1. `git switch main && git pull origin main` to catch up local main if needed.
2. Optionally delete the merged `feat/deal-feed-excel-cutover` local branch.
3. `git switch -c chore/phase-3-delete-old-feed`.
4. Read `notes/bmad/deal-feed-excel/stories.md` Story 3.1 — list deletion candidates back to Brady.
5. Pause for Brady's explicit "go" before deleting (Story 3.1 acceptance).
6. Then Story 3.2 — `git rm src/views/DashboardView.jsx src/components/RightRail.jsx; git rm -r src/components/feed/`. Verify nothing imports them; commit; PR.

Phase 4 (Playwright) can happen in parallel on a sibling branch if Brady wants both moving.

---

## Blockers for Brady

None. Phase 2 is complete and deployed. Phase 3 is gated on Brady's "go" per the original BMAD story acceptance — not a true blocker, just a check-in.

Optional decision: when to merge `feat/deal-detail-v1` to main. Was deferred from prior session; no urgency.

---

## Handoff convention (effective 2026-05-26)

This file (`notes/HANDOFF.md`, repo-local) is the **canonical** session handoff for nightdrop-dashboard. Updated at the end of every session.

The global rule in `~/.claude/CLAUDE.md` was patched to write here, NOT to `~/parcyl/notes/HANDOFF-{repo}.md`. The prior `~/parcyl/notes/HANDOFF-nightdrop-dashboard.md` has been deleted to prevent drift.
