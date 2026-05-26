# Stories — Deal Feed Excel Cutover

**Inherits from:** `requirements.md`, `PRD.md`, `architecture.md`

Each story is sized to under 2 hours per the global rule. Stories are
executed in order. Each one ends with a green test (where applicable)
and a `/checkpoint` git commit.

---

## Phase 0: Pre-plan spikes

### Story 0.1 — Screenshot spike (theme contrast)

**Goal:** prove bundle renders with real host data inside dark Nightdrop
chrome + light grid. Brady eyeballs contrast.

**Tasks:**
1. Build minimal wrapper at `src/views/__excel-spike.jsx` (gated to
   `subscriber.email === 'brady@parcyl.ai'`, route `/__excel-spike`).
2. One-way publishing only (host → ND). Bundle actions remain
   in-place mutations (will be rewritten in Phase 2 properly).
3. Move vendor files into `src/vendor/deal-feed/` temporarily.
4. Scope-prefix CSS minimally.
5. `npm install lucide@<resolved version>`.
6. Start dev server, log in, screenshot `/__excel-spike` at 1440×900.
7. Save to `notes/bmad/deal-feed-excel/spike-2026-05-25-theme.png`.

**Acceptance:**
- Screenshot exists.
- Bundle renders without console errors.
- Brady eyeballs and says "proceed" or "rework theme."

**Lifetime:** spike route deleted in Story 6.x.

### Story 0.2 — `deal_state` row count (Brady runs)

**Goal:** finalize the stage backfill mapping with real counts.

**Tasks:**
1. Provide SQL to Brady (`deal-state-counts.md`).
2. Brady runs against `$DATABASE_WRITE_URL` (psql or DataGrip).
3. Brady pastes results into `deal-state-counts.md`.

**Acceptance:**
- Row counts per `deal_state` value documented.
- Cross-tab against `status` documented if useful.
- Final `deal_state` → `stage` mapping locked into the Phase 1
  migration SQL.

---

## Phase 1: Backend migration (~/nightdrop-api)

### Story 1.1 — Write migration 050

**Goal:** add `stage` column to `df_deals_sent`, indexed, with the
6-value check constraint.

**Tasks:**
1. Create `~/nightdrop-api/migrations/050_df_deals_sent_stage.sql`.
2. `ALTER TABLE df_deals_sent ADD COLUMN stage TEXT NOT NULL
   DEFAULT 'New' CHECK (stage IN (...))`.
3. `CREATE INDEX idx_df_deals_sent_stage`.
4. Backfill `UPDATE` per the locked mapping from Story 0.2.

**Acceptance:**
- SQL runs against staging DB without error.
- Every row has a non-null stage.
- Index exists.

### Story 1.2 — Backend route: GET /deals returns stage

**Goal:** expose the new column in API responses.

**Tasks:**
1. Edit `~/nightdrop-api/routes/dealfeed/deals.js` SELECT to add
   `ds.stage`.
2. Add `stage` to `normalizeDeal()` output.
3. No client cares yet; backward-compat preserved.

**Acceptance:**
- `curl` to staging shows `stage` in every deal row.

### Story 1.3 — Backend route: PATCH /:id/stage

**Goal:** new endpoint to update stage.

**Tasks:**
1. Add `PATCH /api/dealfeed/deals/:id/stage`.
2. Validate body against 6-value enum.
3. Auth: requires `dealfeedAuth`.
4. Return `{ stage }` on success.

**Acceptance:**
- `curl` PATCH works against staging.
- Invalid stage returns 400.
- Wrong subscriber returns 403.

### Story 1.4 — Backend PR + production deploy

**Tasks:**
1. PR against `~/nightdrop-api/main`.
2. `/code-review` + `/security-review` on backend changes.
3. Merge. Render auto-deploys.
4. Verify production `GET /api/dealfeed/deals` returns `stage`.

**Acceptance:**
- Production response includes `stage` field on every deal.
- No regression in other endpoints.

**Gate:** until production returns `stage`, Story 2.1 does NOT start.

---

## Phase 2: Frontend integration scaffold

### Story 2.1 — Vendor code into build graph

**Goal:** move bundle JS+CSS from `vendor/` into `src/vendor/deal-feed/`.

**Tasks:**
1. `git mv vendor/deal-feed/handoff/*.js src/vendor/deal-feed/`
2. `git mv vendor/deal-feed/handoff/styles.css src/vendor/deal-feed/styles.css`
3. `git mv vendor/deal-feed/handoff/light-theme.css src/vendor/deal-feed/light-theme.css`
4. Move `CLAUDE.md`, `HANDOFF.md`, `TYPES.md`, `README.md`, `index.html`
   to `notes/bmad/deal-feed-excel/vendor-ref/` for posterity.
5. `rm -rf vendor/`.

**Acceptance:**
- `src/vendor/deal-feed/` contains the 9 JS files + 2 CSS files.
- `vendor/` no longer exists at repo root.
- Tests still pass.

### Story 2.2 — Scope-prefix CSS

**Goal:** all bundle CSS lives under `.nd-excel-shell`.

**Tasks:**
1. Rewrite `:root { ... }` in `styles.css` → `.nd-excel-shell { ... }`.
2. Prefix every selector in `styles.css` with `.nd-excel-shell `.
3. Same for `light-theme.css` (selectors become
   `.nd-excel-shell .sheet-light ...`).
4. Rename `.row-resize` → `.nd-row-resize` (unscoped → renamed).
5. Rename `.filter-pop` → `.nd-filter-pop` (likely portaled).
6. Drop `JetBrains Mono` from `--font-mono`.
7. Update `row-resize.js` to use new class name.
8. Update `filter-popover.js` to use new class name.

**Acceptance:**
- Visual: spike screenshot still renders correctly.
- Host theme tokens unaffected when navigating to other routes.
- BuyBoxWizard, MapView, BuyBoxesView visually unchanged.

### Story 2.3 — Rename `id="app"` → `id="nd-excel-app"`

**Goal:** avoid collision with host's `<div className="app">`.

**Tasks:**
1. Replace in `feed.js`, `sidebar.js`, any other `getElementById('app')`
   site.
2. Update JSX in `DealFeedExcelView` to use the renamed id.

**Acceptance:**
- `getElementById('app')` is no longer used by the bundle.
- Host's `App.jsx` `<div className="app has-sidebar">` remains untouched.

### Story 2.4 — Install Lucide locally, drop CDN

**Tasks:**
1. `npm install lucide@<pinned to match lucide-react@1.14.0's icons>`.
2. Wrapper assigns `window.lucide = lucide` on mount so bundle's
   `lucide.createIcons()` resolves.
3. Delete the `<script src="https://cdn...">` requirement from
   bundle docs (not strictly needed since `index.html` isn't shipped
   anyway).
4. Verify all 45 icons in `ICON_MAP` render against pinned version.

**Acceptance:**
- No network request to `cdn.jsdelivr.net` in network tab.
- Lucide icons render inside the shell.

### Story 2.5 — Write adapter.js + unit tests

**Tasks:**
1. Create `src/vendor/deal-feed/adapter.js` with `toNDDeal`, `toNDBox`,
   `buildCalendar` per architecture.md spec.
2. Create `adapter.test.js` with 20+ cases: known-good inputs,
   `"null"` string handling, missing `brief_json`, missing optional
   fields, empty signals array, future days in calendar, etc.

**Acceptance:**
- Vitest: all adapter tests green.
- 100% line coverage on `adapter.js`.

### Story 2.6 — Write sync.js + unit tests

**Tasks:**
1. Create `src/vendor/deal-feed/sync.js` with `publishToBundle` and
   `createRrThrottle` (rAF-debounced).
2. Create `sync.test.js`: mock `window.ND._rr`, assert single call
   per frame even with multiple synchronous publishes.

**Acceptance:**
- Vitest green.
- Publishing 5 times in a single tick triggers `_rr` once.

### Story 2.7 — Write actions.js + unit tests

**Tasks:**
1. Create `src/vendor/deal-feed/actions.js` with
   `installActionAdapters(ND, hostActions)`.
2. Each action proxies to the corresponding `useDeals()` / `useReadState()` /
   `useNavigate()` callable.
3. Test with mocked host actions; assert correct arg passing.

**Acceptance:**
- Vitest green.
- `installActionAdapters` returns a `cleanup()` function that
  restores `ND.actions` to its prior state.

### Story 2.8 — Patch bundle's feed.js to call ND.actions.*

**Goal:** rewrite the 9 in-place mutation sites in `feed.js`.

**Tasks:**
1. `feed.js:486–490` quick-actions → `ND.actions.toggleHot/toggleSave/...`.
2. `feed.js:622, 627` stage commits → `ND.actions.setStage`.
3. `feed.js:632` notes blur → `ND.actions.saveNote`.
4. `feed.js:642–644` keyboard shortcuts → action calls.
5. `feed.js:713` bulk stage → loop calling `ND.actions.setStage`.
6. `feed.js:770–774` row keyboard shortcuts → action calls.
7. Bundle no longer calls `rr()` directly after these; publishing
   effect repaints.

**Acceptance:**
- Hot toggle from spreadsheet updates `useDeals().deals` in the React
  devtools.
- `LeftPanel` hot count updates after spreadsheet hot toggle.
- No mutation of `ND.deals[i].*` fields in the bundle source.

### Story 2.9 — Patch bundle's context-menu.js + selection.js

**Tasks:**
1. `context-menu.js:323–325` mark-hot/saved/read → `ND.actions.*`.
2. `context-menu.js:342–344` delete → `ND.actions.deleteDeal`.
3. `selection.js:setCell/setRow` → call `ND.actions.markRead`.
4. `feed.js` dbl-click handler → `ND.actions.openDetail`.

**Acceptance:**
- Right-click mark-hot fires `postFeedback` to backend.
- Single-click on a row marks it read in `ReadStateContext` AND
  PATCHes `/read` once.
- Dbl-click navigates to `/deal/:id` via React Router.

### Story 2.10 — Build DealFeedExcelView wrapper

**Tasks:**
1. Create `src/views/DealFeedExcelView.jsx`.
2. Render bundle markup as JSX with `<div className="nd-excel-shell">`
   wrapper, sidebar block omitted.
3. Mount effect: side-effect import bundle JS files in HANDOFF load
   order, assign `window.lucide`.
4. Publishing effect (sync.js).
5. Action interceptor effect (actions.js).
6. Cleanup on unmount: remove event listeners, clear `window.ND`,
   restore Lucide.

**Acceptance:**
- Component mounts in dev without console errors.
- Bundle renders with real `useDeals()` data.
- Strict mode double-invoke does not duplicate event listeners.

### Story 2.11 — Mount in App.jsx (lazy)

**Tasks:**
1. Replace `<DashboardView ... />` mounts in `App.jsx:267, 284` with
   `<DealFeedExcelView />`.
2. Lazy-load via `React.lazy` + `<Suspense>`.
3. Verify `/dashboard` route lands on the new view.

**Acceptance:**
- Navigating to `/dashboard` loads the new view.
- Initial bundle chunk size for entry route does NOT include the
  Excel chunk (verify in `npm run build` output).

### Story 2.12 — Add deleteDeal action to DealsContext

**Tasks:**
1. Decide: separate endpoint or alias to `updateStatus(id, 'archived')`?
2. Add `deleteDeal(id)` to `DealsContext`.
3. Wire into `ND.actions.deleteDeal`.

**Acceptance:**
- Right-click → Delete soft-archives the deal.
- Row disappears from feed (filtered by `deal_state !== 'archived'`
  in `useDeals().deals` getter, or backend filters server-side).

---

## Phase 3: Delete old feed (after Brady's go)

### Story 3.1 — List deletion candidates back to Brady

**Tasks:**
1. Re-run the file-size + mtime audit (already in plan).
2. Post list to chat.
3. Pause for Brady's explicit "go."

**Acceptance:**
- Brady says "go" or names specific files to preserve.

### Story 3.2 — Delete old feed files in a second commit

**Tasks:**
1. `git rm src/views/DashboardView.jsx`.
2. `git rm src/components/RightRail.jsx`.
3. `git rm -r src/components/feed/`.
4. Verify nothing else imports them.
5. Commit as separate atomic commit from the cutover.

**Acceptance:**
- `npm run lint` green.
- `npm test` green.
- `npm run build` green.
- Grep for the deleted file names returns zero matches.

---

## Phase 4: Test coverage

### Story 4.1 — Vitest: adapter + sync + actions

Covered in Stories 2.5–2.7.

### Story 4.2 — Playwright: new excel-feed.spec.js

**Tasks:**
1. Create `tests/excel-feed.spec.js`.
2. Cover all 14 user flows from `PRD.md`.
3. Use `tests/.dev-auth.json` for login (existing pattern).

**Acceptance:**
- `npx playwright test tests/excel-feed.spec.js` all green.

### Story 4.3 — Update existing Playwright suites

**Tasks:**
1. Audit `tests/smoke.spec.js`, `tests/critical-flows.spec.js`,
   `tests/visual-sweep.spec.js`, `tests/visual-bugs.spec.js` for
   selectors that match the deleted `DashboardView`.
2. Update each selector to bundle equivalents.
3. Regenerate visual baselines; Brady reviews each diff before
   commit.

**Acceptance:**
- All Playwright suites green.
- All visual baselines reviewed by Brady before commit.

---

## Phase 5: Ship

### Story 5.1 — Local verification

**Tasks:**
1. `npm run lint` (0 errors).
2. `npm run build` (no chunk regression).
3. `npm run dev` and walk through every flow from PRD F1–F14
   manually.

**Acceptance:**
- All 14 flows pass manually on Brady's machine.

### Story 5.2 — Reviews

**Tasks:**
1. `/code-review` on Phase 2+3 files via code-reviewer agent.
2. `/security-review` on wrapper, adapter, action interceptors via
   security-reviewer agent.
3. `/quality-gate`.

**Acceptance:**
- Zero CRITICAL or HIGH findings from either reviewer.

### Story 5.3 — Merge

**Tasks:**
1. Squash-merge `feat/deal-feed-excel-cutover` → `main` as ONE commit.
2. Netlify auto-deploys.
3. `/verify` on production.

**Acceptance:**
- Production renders the new view.
- All 14 flows pass on production.
- Zero console errors.

### Story 5.4 — 7-day soak

Old feed files stay deleted in tree but the deletion commit (Story
3.2) is the only thing between rollback and a full revert. Wait 7
days. If no issues, soak passes.

### Story 5.5 — Rollback if needed

If production breaks: `git revert <squashed-merge-sha>` on `main`.
Netlify deploys revert in ~2 minutes.
