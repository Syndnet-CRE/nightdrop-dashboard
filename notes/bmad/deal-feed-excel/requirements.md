# Requirements — Deal Feed Excel Cutover

**Repo:** `nightdrop-dashboard`
**Branch:** `feat/deal-feed-excel-cutover`
**Created:** 2026-05-25
**Status:** Phase 0 — pre-screenshot-spike

---

## Source of decisions

Brady's session message dated 2026-05-25 is the canonical lock for every
decision below. Anything not in that message is open and must be surfaced,
not invented.

---

## Outcome — what ships

The Deal Feed view becomes the vendor spreadsheet from `~/Downloads/Deal Feed Excel (1).zip`.

- Single click selects a row.
- Double-click on the gutter expands inline.
- Double-click anywhere else opens the existing deal detail page (`/deal/:id`).
- Spreadsheet replaces the card-based feed at `/dashboard`.
- Every action a user could do in the old feed they can still do in the new
  view (mark hot, save, add notes, change status, change stage, mark read,
  open detail). Every action writes through the host's data layer; the rest
  of the app sees the same data.
- No state forks. No stale data in any other view.

## Outcome — what is preserved

- Host's `TopHeader` (pipeline timeline + countdown clock) stays exactly
  where it is. Not touched.
- Host's `LeftPanel` navigation stays exactly where it is. Not touched.
- All other routes (Map, Buy Boxes, Settings, Admin, Invites, Accounts,
  Deal Detail) stay exactly where they are.

## Outcome — what is removed

- The card-based feed (`src/views/DashboardView.jsx`).
- The right rail on this view (`src/components/RightRail.jsx`).
- The "tonight's run" card and AI agent message card components.
- The bundle's own sidebar (the bundle ships one; we don't render it).
- The bundle's tweaks panel (design-iteration tool, not for production).

## Backend orphan endpoints (separate cleanup ticket, not in this work)

- `GET /api/dealfeed/agent/messages` — only consumed by deleted ChatFab +
  DealChatThread. Flagged for cleanup.
- `GET /api/dealfeed/deals/dashboard/kpis` — verify if `TonightsRunCard`
  (deleted) was the sole consumer; if so, same cleanup ticket.

---

## Locked decisions

### Theme
App stays dark. Spreadsheet renders with a light grid inside the dark
chrome, scoped under `.nd-excel-shell` so no host styles leak. **Phase 0
screenshot spike must clear Brady's contrast eyeball before Phase 1
begins.**

### Stage column
Add `stage` column to `df_deals_sent` (backend repo `~/nightdrop-api`).
Six values: `New`, `Researching`, `Contacted`, `Negotiating`, `Passed`,
`Closed`. Existing `deal_state` field stays intact for backward compat
with the pipeline view. Migration backfill mapping is finalized after
Brady runs the `deal_state` count query and pastes results into
`deal-state-counts.md`.

### Read state
Switch from in-view dwell to **mark-on-row-select** (single click selects
a row). Intentional, deliberate, zero false positives in a dense
spreadsheet. Wired into bundle's `selection.js` setCell/setRow handlers
to call `markRead(dealId)`.

### Deal detail navigation
Bundle's double-click handler routes into the host's `/deal/:id` route via
`navigate(...)`. No user-visible behavior change.

### Fonts
DM Sans + DM Mono scoped to `.nd-excel-shell` only. Outside the
spreadsheet, host keeps Manrope (UI) and Inter (numerics). JetBrains Mono
is banned everywhere — bundle's font fallback chain must be trimmed.

### Icons
`npm install lucide@<pinned>` locally. Replace the bundle's CDN
`<script src="...lucide@latest">` tag. No CDN. Version is pinned to align
with `lucide-react@1.14.0`'s icon set.

### Vendor code loading
Move bundle JS+CSS into `src/vendor/deal-feed/`. Import as side-effect
modules in the React wrapper. Vite bundles, code-splits, lazy-loads when
the view mounts. No runtime `<script>` injection.

### Rollback
Single squashed commit on `main`. Recovery is `git revert <sha>`. No
environment flag, no in-app toggle.

### Accessibility
Ship at parity with the current feed (which has near-zero a11y today).
Improvements deferred to a separate sprint.

### Cutover sequencing
Two commits, in this order:
1. Backend migration first as its own deploy (separate PR against
   `~/nightdrop-api`, separate Render deploy, verified live in
   production response before frontend cutover starts).
2. Frontend cutover as a squashed merge on `feat/deal-feed-excel-cutover`
   into `main`.

---

## Open product calls (still on the table)

- **Phase 0.1 result**: dark chrome + light grid contrast Brady-eyeball.
- **Phase 0.2 result**: `deal_state` row counts → final stage backfill
  mapping in the migration.
- **`BuyBox.color`**: whether host buy boxes already carry a `color`
  field or whether the wrapper derives a color from an id-hash (see
  `data-gaps.md`).

---

## Out of scope

- Pagination (current 100-deal backend cap is sufficient; revisit
  post-cutover).
- Virtualization (would only help if cap is lifted).
- Light theme flip of the entire app (Option B from gap audit; not
  needed if contrast is acceptable).
- A11y improvements beyond parity (separate sprint).
- Cleanup of orphan backend endpoints (separate ticket).
- Cleanup of orphan `BuyBoxConfigurator/`, `BuyBoxEditModal.jsx`,
  `wizardHelpers.js` (separate cleanup, per CLAUDE.md).
