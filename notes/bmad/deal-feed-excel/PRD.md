# PRD — Deal Feed Excel Cutover

**Inherits scope from:** `requirements.md`

---

## Problem

Today's `/dashboard` view shows deals as cards: vertical scroll, one card
per deal, right rail with chat + tonight's run. The card layout is hard
to scan when many deals land in a single nightly drop. Sorting,
comparing, and bulk-actioning multiple deals is not natural. The view
optimizes for one deal at a time, not the pile.

The new view is a Google-Sheets-style spreadsheet. Rows are deals,
columns are facts (`Score`, `Address`, `Date`, `Asset`, `$/SF`, `SF`,
`Owner`, `Hold`, `Top Signal`, `Stage`, `Notes`, `Quick`). Bulk select,
copy as TSV, filter per column, sort per column, all at native speed.
Single click selects a row. Double-click opens detail. Right-click
exposes mark-hot / mark-saved / mark-read / delete / export / open
detail. Inline expand on gutter dbl-click for an AI narrative + the
deal's full property record without leaving the spreadsheet.

## Hypothesis

A spreadsheet view shortens the time from "look at tonight's drop" to
"act on the three deals I care about" from minutes (card scroll +
mental filter) to seconds (sort by Score desc, scan the top 5, bulk
mark-hot the two interesting ones, right-click → Open detail on the
one that warrants a click).

## Users

- Subscribers reviewing the nightly deal drop on a desktop browser.
- Brady (admin) auditing all subscribers' feeds.
- Future: investment teams reviewing co-managed boxes.

## Major user flows

### F1 — Load and orient
User logs in. `/dashboard` renders the spreadsheet inside dark Nightdrop
chrome. Active day is today (or most recent day with deals if today is
empty). Top of grid shows row count: `Showing N of M`.

### F2 — Filter
User clicks the `Hot` chip in the toolbar. Grid filters to
`feedback === 'hot'` rows only. Row count updates. Clicking `All`
restores.

### F3 — Sort
User clicks the `Sort` dropdown (Score / Recency / Distress / Value).
Selection commits via the bundle's sort handler. Grid re-renders sorted.

### F4 — Per-column filter
User clicks a column header's triangle. Filter popover (Sheets-style)
opens: search box, sort buttons, value checkboxes. User confirms. Grid
filters; toolbar shows `N filters` chip; clicking it clears all column
filters.

### F5 — Single-row select + read tracking
User single-clicks a row's gutter or any cell. Row is selected. Cell
address (`B7`, etc.) updates in the top-left name box. **Read state
fires: `markRead(dealId)` runs once.** Row's unread style disappears.

### F6 — Range select + copy
User drags from C2 to E5. Range selected. Bundle's name box shows
`C2:E5` and `4R × 3C`. User presses Cmd/Ctrl+C. Clipboard receives
TSV. Pastes cleanly into Google Sheets / Excel.

### F7 — Multi-range select + bulk action
User selects rows 2–4, Cmd-clicks row 7 to add. Bulk toolbar appears:
`Export (4)`, `Set Stage` dropdown, `0 filters`. User picks `Set Stage
→ Researching`. Each selected row's stage updates via
`PATCH /api/dealfeed/deals/:id/stage`. Grid repaints.

### F8 — Right-click context menu
User right-clicks any deal row. Menu shows: Export Selected Rows,
Export Table, Copy, Mark Hot, Mark Saved, Mark Read, Delete, Open
Detail. User picks `Mark Hot`. `postFeedback(dealId, 'hot')` fires.
Row gets the hot indicator. Other host views (LeftPanel hot count,
DealDetail topbar hot button if open) reflect the new state.

### F9 — Inline cell edit
User double-clicks a notes cell. Cell enters edit mode. User types.
Blur or Enter commits via `saveNote(dealId, text)`. PATCH `/notes`
fires. Toast confirms (or fails loudly).

### F10 — Stage dropdown
User clicks the Stage cell. Dropdown opens with six values.
User picks `Negotiating`. PATCH `/stage` fires. Row's stage
updates immediately (optimistic). Other views reading `stage`
see the new value.

### F11 — Inline expand
User double-clicks a row's gutter (the left-most letter column).
An `xtr` (expanded row) appears beneath, showing the AI narrative
+ bullets + ext (parcel, county, zoning, year built, last sale, etc).
Double-click gutter again to collapse.

### F12 — Open detail
User double-clicks any deal cell (not gutter, not editable like
`$/SF` / `SF` / `Hold`). `navigate('/deal/:id')` fires. Deal detail
page opens.

### F13 — Day switching
User clicks a day in the bottom `.tabbar`. Active day updates. Grid
filters to deals delivered on that day. Empty days show synthesized
stub rows (per bundle behavior) unless we strip the stub fallback
(decision for Phase 2 implementation).

### F14 — Density toggle
User clicks Compact / Normal / Comfortable in the toolbar. Row heights
adjust. State persists in localStorage (`nd:rowheights:v1`).

---

## Out of scope (defer)

- Column reorder by drag (bundle does not ship this).
- Saved views (bundle has a Save view button but no persistence;
  current target is render-as-is, defer to a later sprint).
- Cell-level audit history.
- Soft-delete UI (delete in the context menu currently filters from
  `ND.deals` locally; backend delete is wired via the host's
  `deleteDeal` action and the bundle's filter is replaced by
  re-publishing after backend confirms).

---

## Non-goals

- Improving a11y beyond parity.
- Pagination.
- Replacing or modifying the host top header.
- Replacing or modifying the host left panel.

---

## Success criteria

- **All 14 user flows** above land green on Playwright.
- **Vitest** stays at 217 + ~30 new tests (adapter / sync / actions) =
  ~247 passing.
- Lint: 0 new errors.
- Build: chunk size for the new feed lazy chunk under 100 KB gzipped
  (bundle JS + CSS + Lucide vanilla).
- Backend response includes `stage` field in production.
- No state forks: hot/save/notes/stage changes in the spreadsheet
  reflect in `useDeals()` immediately and propagate to every other
  consumer (LeftPanel counts, PipelineTimeline, future Map view,
  DealDetail).

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Theme contrast on light grid in dark chrome looks wrong | Phase 0 spike screenshot; Brady eyeballs before any plan locks |
| `deal_state` → `stage` backfill mapping mis-buckets existing rows | Brady runs count query first; mapping derived from real counts, not guessed |
| Bundle's full-tbody-rebuild `rr()` slow at scale | Current 100-deal backend cap keeps us comfortably under perf cliff; revisit only if cap lifts |
| `window.ND` state forks from host state | Single wrapper-owned publishing effect; bundle mutations rewritten to call `ND.actions.*` adapters that route through `useDeals()` |
| Visual regression in Playwright baselines | Brady reviews every baseline diff before commit; no batch approval |
| Two copies of Lucide in the bundle | `npm install lucide`; replace CDN tag; one version pinned locally |
| Tweaks panel CSS orphans `[data-style]` `[data-logo]` rules | Leave the orphan CSS in vendor bundle; harmless; future cleanup ticket |
| `lucide` vanilla vs `lucide-react` icon name drift | Audit ICON_MAP names against pinned Lucide version; ICON_MAP is the normalization layer and already maps all 45 icons |

---

## Decisions deferred to implementation (Phase 2)

- Whether to strip the `stubsFor(day, count)` empty-day fallback in
  bundle `feed.js` (recommendation: strip; show "no deals on this day"
  empty state).
- Exact rAF debounce window for the publishing effect (start: 1 frame =
  16ms; tune if needed).
- Whether to add a hybrid "in-view dwell + row-select" read signal
  (recommendation in plan: row-select-only for v1).
