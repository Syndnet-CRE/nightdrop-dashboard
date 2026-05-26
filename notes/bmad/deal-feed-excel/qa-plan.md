# QA Plan — Deal Feed Excel Cutover

**Inherits from:** `requirements.md`, `PRD.md`, `architecture.md`, `stories.md`

---

## Scope of testing

| Layer | Coverage approach |
|---|---|
| Pure functions (adapter, sync logic, calendar build) | Vitest unit tests with known-good inputs/outputs |
| Side-effectful interceptors (action adapters) | Vitest with mocked host actions |
| Bundle ↔ host integration | Playwright end-to-end against `npm run dev` |
| Visual regression | Playwright screenshot diff with Brady reviewing each diff |
| Performance | Manual timing test at 100-deal cap (current backend ceiling) |
| Cross-route impact | Manual sweep: MapView, BuyBoxesView, DealDetail, BuyBoxWizard, Admin, Settings |
| A11y | Tab nav sanity sweep; no automated audit (parity only per locked decision) |

---

## Vitest (unit) — ~30 new tests

### `src/vendor/deal-feed/adapter.test.js`

- `toNDDeal`: known-good deal → expected ND.deal shape.
- Missing `building_sf` → `psf: null`.
- `"null"` string in any field is treated as nullish.
- Missing `brief_json` → empty bullets, empty narr.
- `feedback === 'hot'` → `hot: true, up: true`.
- `feedback === 'not_relevant'` → `hot: false, up: false`.
- `signals: []` → `sig: '', sc: 'pill-g'`.
- Signal with category `'foreclosure'` → `sc: 'pill-r'`.
- Signal with category `'vacant'` → `sc: 'pill-a'`.
- `last_sale_date` 5 years ago → `hold: '5 yr'`.
- `updated_at` within 24h → `la: 'r'`.
- `updated_at` within 7d → `la: 'm'`.
- `updated_at` 30d ago → `la: null`.
- `toNDBox`: known-good buy box.
- Buy box without `color` → fallback id-hash color.
- `buildCalendar`: 6-month window contains today as `isToday`.
- `buildCalendar`: future days marked `isFuture`.
- `buildCalendar`: deal sent_at buckets correctly into day.count.

### `src/vendor/deal-feed/sync.test.js`

- `publishToBundle` writes `ND.deals` correctly.
- `createRrThrottle` debounces multiple calls into 1 per frame.
- Throttle does not call `_rr` when undefined.
- Throttle cleanup cancels pending rAF.

### `src/vendor/deal-feed/actions.test.js`

- `installActionAdapters` populates `ND.actions.*` keys.
- Each action calls its host action with correct args.
- `toggleHot` collapses currentFeedback === 'hot' to null.
- `setStage` rejects values outside the 6-stage enum (defense-in-depth;
  backend also validates).
- `openDetail` calls `navigate('/deal/:id')`.
- Cleanup restores prior `ND.actions` value.

---

## Playwright (E2E) — `tests/excel-feed.spec.js`

Each test runs against `npm run dev` on port 5173 with `.dev-auth.json`
auto-login.

### Test list (matches PRD flows)

| # | Flow | Assertion |
|---|---|---|
| F1 | Load | `#nd-excel-app` exists; `#tbody tr.dr` count > 0; no console errors |
| F2 | Filter chip "Hot" | Row count after click ≤ row count before; all visible rows have `.row-hot` |
| F3 | Sort dropdown | Score sort: first row's Score ≥ last row's Score |
| F4 | Per-column filter | Triangle click opens `.nd-filter-pop`; checkbox unselect reduces row count |
| F5 | Single-row select + read | Click row → `#cellAddr` shows new address; row's `tr.unread` class drops; localStorage key `dealfeed.read.<sub>:<id>` set |
| F6 | Range select + copy | Drag C2→E5 → `#cellAddr` shows `C2:E5`; Cmd+C → clipboard contents include tab-separated cells |
| F7 | Bulk action: Set Stage | Select 3 rows, pick stage → 3 PATCH `/stage` requests fire; each row's Stage cell updates |
| F8 | Right-click → Mark Hot | Menu appears at click coords; click Mark Hot → PATCH `/feedback` fires with `'hot'`; row shows hot indicator |
| F9 | Inline cell edit (notes) | Dbl-click notes → input appears; type + blur → PATCH `/notes` fires; cell shows new text |
| F10 | Stage dropdown | Click Stage cell → dropdown shows 6 values; pick Negotiating → PATCH `/stage`; cell updates |
| F11 | Inline expand | Dbl-click row gutter → `tr.xtr` appears below; contains bullets + narr; dbl-click gutter again collapses |
| F12 | Open detail | Dbl-click address cell → URL becomes `/deal/<id>`; deal detail page renders |
| F13 | Day switching | Click yesterday's tab in `#tabbar` → grid filters to yesterday's deals only |
| F14 | Density toggle | Click Compact → row heights shrink; localStorage `nd:rowheights:v1` updates |

### Smoke negatives

- F-neg-1: Right-click → Delete → row disappears from grid; PATCH
  `/status { status: 'archived' }` fires; other host views update too.
- F-neg-2: Toggle theme to light via host's existing toggle → spreadsheet
  remains light-grid (already light internal); chrome flips light;
  reverting to dark restores dark chrome + light grid. (NOTE: per
  locked decision, app stays dark, but the toggle still works for
  Brady's admin needs.)
- F-neg-3: Empty active day (no deals delivered today) → renders empty
  state, no synthesized stubs (assumes Phase 2 strips the stub
  fallback).

### Cross-route smoke

- After flipping a deal hot in the spreadsheet, navigate to MapView
  → deal's pin shows hot indicator.
- After saving a note in the spreadsheet, navigate to DealDetail of
  that deal → narrative panel shows the note.
- After marking a deal read in the spreadsheet, navigate to LeftPanel
  → unread count decremented.

---

## Visual regression

Run `npx playwright test tests/visual-sweep.spec.js` and
`tests/visual-bugs.spec.js` after updating selectors. Each baseline
diff is reviewed by Brady before commit. Process:

1. Run test → fails on first diff.
2. Open the diff PNG in finder.
3. Brady approves or rejects via chat.
4. If approved → `npx playwright test --update-snapshots <specific test>`.
5. Commit baseline.
6. If rejected → investigate as a real regression.

No batch baseline updates.

---

## Performance benchmark

Manual test:

1. Load `/dashboard` with current production data (~100 deals at cap).
2. Open Chrome DevTools Performance tab.
3. Record while:
   - Clicking through 5 day-tab transitions (5 rerenders).
   - Marking 10 rows hot (10 rerenders).
   - Bulk-selecting 20 rows and setting stage (1 rerender + 20 PATCHes).
4. Capture total scripting + rendering time.

**Pass criteria:**
- Single `rr()` under 50ms at 100 rows on a modern Mac.
- No long task warnings.
- 60fps during drag-select.

If above 50ms per `rr()`: surface to Brady; revisit virtualization
(out of scope per requirements, but a flag to plan for the next sprint
if the backend cap is lifted).

---

## Cross-route manual sweep

After cutover, manually navigate to:

- `/map` — confirm pins render, color coding works.
- `/buy-boxes` — confirm grid renders, counts correct.
- `/buy-boxes/new` — confirm wizard opens, no style bleed.
- `/buy-boxes/:id/edit` — confirm edit wizard opens.
- `/deal/:id` (V1) — confirm deal detail renders cleanly.
- `/settings` — confirm light/dark toggle still works.
- `/admin` (Brady-only) — confirm admin panel renders.
- `/invites` (Brady-only) — confirm invites view.
- `/login` — confirm login renders.

**Pass criteria:** every route renders visually identical to pre-cutover.

---

## Failure recovery

If any of the above fails:

1. Vitest failures: fix the code, re-run, no merge until green.
2. Playwright F1–F14 failure: fix, re-run, no merge.
3. Cross-route regression: fix, re-run, no merge.
4. Performance fail: surface to Brady; decision: ship slow + plan
   virtualization OR delay until virtualization lands.
5. Visual baseline rejected: investigate as a real bug; if not a bug,
   surface; if it is, fix.

---

## Sign-off

Brady's explicit "approved" required before:
- Phase 1 backend PR merges.
- Phase 3 deletion commit lands.
- Phase 5 squashed merge to main.
- Each visual baseline diff commits.
