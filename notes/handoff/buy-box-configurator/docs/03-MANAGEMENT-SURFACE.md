# Buy-Box Management Surface Specification

**Status:** [PORT] core kanban + actions  
**Last updated:** 2026-06-30  
**Source:** src/views/BuyBoxesView.jsx (477 lines), src/components/LeftPanel.jsx (235 lines), src/styles/buyBoxes.css (444 lines)

---

## Overview

The Buy-Box Management surface is a five-column Kanban board for lifecycle visibility of buy box searches. Cards flow from Pending through Validating and Active (or sideways to Paused), with a fifth immutable Coverage Gap lane for geo errors. Dragging a card between lanes patches the `status` field. All drag-and-drop is native HTML5 (no external library). The surface is self-contained and embeddable into another platform.

**Key facts:**
- 5 fixed columns with exact labels and subtitles [PORT]
- Native HTML5 drag-and-drop internal to the component [PORT]
- No external D&D library (Dnd-kit, react-beautiful-dnd, etc.)
- Drop to gap lane is rejected; gap rejects all drops [PORT]
- Every status change (drag) calls `patchBuyBox(id, { status: newStatus })`
- Left-sidebar metric boxes are context-aware KPI displays fed by a `/dashboard/kpis` endpoint [PORT]
- Header buttons: "New buyer search" (stub, [PORT]) and "New buy box" (opens wizard create, [PORT])
- Card actions include Pause, Resume, Configure, and Edit Geo with confirm modals [PORT]
- Read-only Mon-Sun week strip reflects current run schedule; [BUILD] version with editable toggles goes to session 07

---

## Kanban Board Architecture

### Column Definitions

| Order | ID | Title | Subtitle | Status Values | Droppable? | Dot Color | Notes |
|-------|-----|-------|----------|----------------|-----------|-----------|-------|
| 1 | `pending` | Pending | Awaiting first run | `'pending'` | Yes | Gray `--fg-dim` | Initial state; awaiting first nightly execution |
| 2 | `validating` | Validating | Coverage check in progress | `'active'` + no `last_run_at` | Yes | Blue `--info` | Post-create; coverage validation in flight |
| 3 | `active` | Active | Running nightly | `'active'` + has `last_run_at` | Yes | Green `--accent` (glowing) | Actively delivering deals; can Pause |
| 4 | `paused` | Paused | Manually paused | `'paused'` | Yes | Amber `--warn` | Nightly runs suppressed; can Resume |
| 5 | `gap` | Coverage gap | No parcel data for this geo | `'coverage_failed'` (normalized) | **No** | Red `--danger` | Immutable; rejets all drops; can Edit Geo |

**File reference:** src/views/BuyBoxesView.jsx lines 24-30 (COLUMNS array)

### deriveColumn() Status Mapping Logic

The `deriveColumn(box)` function normalizes backend status values to lane assignment:

```javascript
function deriveColumn(box) {
  const s = (box.status || '').toLowerCase().replace(/\s+/g, '_');
  if (s === 'coverage_failed') return 'gap';
  if (s === 'paused') return 'paused';
  if (s === 'active' && !box.last_run_at && !box.lastRun) return 'validating';
  if (s === 'active') return 'active';
  return 'pending';
}
```

**Key rules:**
- `coverage_failed` (or `Coverage Failed`) always maps to `gap`, regardless of other fields
- If `status = 'active'` but `last_run_at` is null, show `validating` (coverage check in flight)
- If `status = 'active'` and `last_run_at` exists, show `active` (has run history)
- All other statuses default to `pending`

**File reference:** src/views/BuyBoxesView.jsx lines 33-40

---

## Drag-and-Drop (Native HTML5)

### Drop Zone Configuration

**Board element:** `.bb-board` (grid, 5 columns)

**Per-column configuration:**
- **Events:** Each column wraps a `Column` component with `onDragOver` and `onDrop` handlers
- **Drag initiation:** `BuyBoxCard` sets `draggable="true"` and fires `onDragStart` to store the box ID
- **Drop handling:** `onDrop` retrieves the box ID and calls the drop handler; `onDragOver` prevents default to allow drop

**File references:**
- Card drag setup: src/views/BuyBoxesView.jsx lines 256-257 (draggable, onDragStart)
- Column drop zone: src/views/BuyBoxesView.jsx lines 354-355 (onDragOver, onDrop)
- Handler functions: src/views/BuyBoxesView.jsx lines 417-424 (handleDragStart, handleDrop)

### Drop Rules

| Rule | Implementation | Notes |
|------|----------------|-------|
| Gap rejects all drops | `if (!id \|\| colId === 'gap') return;` line 420 | Coverage gap cards cannot accept drops; dragging to gap is a no-op |
| Status map | `const statusMap = { active: 'active', paused: 'paused', pending: 'pending', validating: 'pending' };` line 421 | Validating cards dragged anywhere (except gap) are set to `pending` |
| PATCH on drop | `patchBuyBox(id, { status: newStatus })` line 423 | Immediately patches the buy box with the new status |
| No optimistic UI | Relies on context re-fetch after PATCH resolves | The UI re-fetches and re-derives columns after the mutation completes |

**Example flow:**
1. User drags card from `active` to `paused`
2. `handleDrop` fires with `colId = 'paused'`
3. Looks up ID in `dataTransfer`
4. Maps `'paused'` to status `'paused'`
5. Calls `patchBuyBox(boxId, { status: 'paused' })`
6. Context refetches and re-derives columns
7. Card moves to paused lane

**File reference:** src/views/BuyBoxesView.jsx lines 418-424

---

## Buy Box Card Anatomy

### Full Card Structure

```html
<article class="bb-card" data-status="[active|pending|validating|paused|gap]" data-box-id="[uuid]" draggable="true">
  <!-- Header: title + status dot -->
  <header class="bb-card__head">
    <span class="bb-card__dot"></span>                <!-- Status indicator dot -->
    <h3 class="bb-card__title">[box.label]</h3>      <!-- Truncated title -->
  </header>

  <!-- Hero or Alert (mutually exclusive) -->
  [Gap card: alert block]
  [Non-gap card: hero block with delivered count + sparkline]

  <!-- Asset class + geography chips -->
  <div class="bb-card__chiprow">
    <span class="bb-chip">[asset class] [+N more if multi-asset]</span>
    <span class="bb-chip bb-chip--geo"><MapPin size=10 /> [geo detail]</span>
  </div>

  <!-- Last run timestamp -->
  <div class="bb-card__nextrun">
    <span class="bb-card__k">Last run</span>
    <span class="bb-card__v">[formatted timestamp or "Paused until fixed"]</span>
  </div>

  <!-- Mon-Sun schedule indicator (read-only in current build) -->
  <div class="bb-week">
    <span class="bb-week__d [is-on]">M</span>
    <span class="bb-week__d [is-on]">T</span>
    ...
  </div>

  <!-- Actions (row or menu) -->
  <div class="bb-card__actions">
    [Primary action button: Pause, Resume, Configure, or Edit Geo]
    [Secondary menu button with dropdown]
  </div>
</article>
```

### Field Mapping and Element Details

| Element | CSS Class | Source Field | Notes | Data Type |
|---------|-----------|--------------|-------|-----------|
| **Title** | `.bb-card__title` | `box.label` | Truncated with ellipsis; wraps `<h3>` | string |
| **Status Dot** | `.bb-card__dot` | `box.status` (derived) | Colors: active=green (glow), paused=amber, gap=red, pending/validating=gray | mapped |
| **Delivered (big number)** | `.bb-card__big` | `box.deals` (or `box.deal_count`) | Large monospace count; 32px font weight 600 | number |
| **Delivered Label** | `.bb-card__lbl` | hardcoded | Always text "Delivered" | - |
| **Weekly Delta** | `.bb-card__delta` | `box.deliveredThisWeek` | Shows only if > 0; "‹ArrowUpRight› +N this week" | number |
| **Sparkline** | `.bb-spark` (inline SVG) | `box.deliveredSpark` | Optional 72x36px line chart; if absent, no sparkline renders | number[] or null |
| **Asset Class Chip** | `.bb-chip` | `box.asset_class` (primary) or `box.asset_classes[0]` (fallback) | Label + optional "+N more" subtitle if multi-asset | string |
| **Geo Chip** | `.bb-chip.bb-chip--geo` | `box.geo_zips \| box.geo_counties \| box.geo_states` | MapPin icon + geo detail text (e.g., "TX · 3 counties") | object |
| **Last Run Label** | `.bb-card__k` | hardcoded | Always text "Last run" | - |
| **Last Run Value** | `.bb-card__v` | `box.last_run_at` | Formatted "MMM D, HH:MM" or "Paused until fixed" (gap cards) | string |
| **Week Strip** | `.bb-week` | `box.run_schedule.days` | Array of day keys ['mon', 'tue', ...]; READ-ONLY in current build | boolean[] |
| **Gap Alert** | `.bb-alert` (gap cards only) | hardcoded | Message "No parcel data for this geo"; hint "Drop to a tighter geo to get coverage" | - |

**File reference:** src/views/BuyBoxesView.jsx lines 241-342 (BuyBoxCard component)

### Card Styling Reference

| CSS Class | Purpose | Responsive | Notes |
|-----------|---------|-----------|-------|
| `.bb-card` | Card container | No (fixed width in 5-col grid) | Drag enabled; hover brightens border + shadow; active shows `cursor: grabbing` |
| `.bb-card[data-status="gap"]` | Gap card styling | - | Border-color tinted red; alert block shown instead of hero |
| `.bb-card[data-status="paused"]` | Paused card styling | - | Opacity 0.85; week indicators dimmed |
| `.bb-card__hero` | Delivered count + sparkline container | - | Sunken background; delivered count and sparkline in 2-column grid |
| `.bb-card__chiprow` | Flex row for asset + geo chips | Wraps | Flex gap 6px |
| `.bb-card__big` | Large delivered count | - | 32px, DM Sans, font-variant-numeric: tabular-nums |
| `.bb-spark` | Inline sparkline SVG | - | 72x36px; green line + area fill; dot at last point |
| `.bb-week` | 7-day grid | - | Grid 7 columns; gap 4px; each day is 24px square |
| `.bb-week__d.is-on` | Active day indicator | - | Green background, white text; dimmed if card paused or gap |

**File reference:** src/styles/buyBoxes.css lines 173-444

### Card Actions

**Location:** `.bb-card__actions` (grid: 1fr auto)

| Column | Lane Condition | Action | Behavior | Icon | Style |
|--------|----------------|--------|----------|------|-------|
| Left | Active | Pause | Opens PauseBoxConfirm modal (lines 107-115 App.jsx); on confirm, calls `patchBuyBox(id, { status: 'paused' })` | `Pause` size 13 | `.bb-btn` (gray) |
| Left | Paused | Resume | Calls `patchBuyBox(id, { status: 'active' })` + toast "Search resumed - runs tonight."; no modal | `Play` size 13 | `.bb-btn.bb-btn--primary` (green) |
| Left | Pending/Validating | Configure | Navigates to `/buy-boxes/[id]/edit` (wizard in edit mode) | - (text only) | `.bb-btn` (gray) |
| Left | Gap | Edit Geo | Navigates to `/buy-boxes/[id]/edit` (wizard in edit mode, focused on geo step) | `MapPin` size 13 | `.bb-btn.bb-btn--danger` (red) |
| Right | All | Menu | Opens CardMenu dropdown with Edit, Pause, Resume, Fix Geo, or Delete options; delete has inline confirmation | `Sliders` size 14 | `.bb-iconbtn` (gray) |

**File reference:**
- Pause action: src/views/BuyBoxesView.jsx lines 307-310
- Resume action: src/views/BuyBoxesView.jsx lines 312-316 (+ handler at lines 407-414)
- Configure: src/views/BuyBoxesView.jsx lines 322-325
- Edit Geo: src/views/BuyBoxesView.jsx lines 317-321
- CardMenu: src/views/BuyBoxesView.jsx lines 150-239

---

## Pause Confirmation Modal

**Component:** `PauseBoxConfirm` (App.jsx lines 107-115), uses `ConfirmModal` generic  
**Kind:** `'pause-box'`  
**Trigger:** User clicks Pause on an active card  
**UI state:** Stored in App.jsx `pausingBuyBox` state (line 155)

### Modal Configuration

| Field | Value | Notes |
|-------|-------|-------|
| Title | "Pause this buy box?" | - |
| Body | "Nightly runs will stop for this buy box. Your data and history are preserved. Resume any time." | - |
| Cancel Button | "Keep Running" | Returns to card; no change |
| Confirm Button | "Pause Buy Box" | Calls `patchBuyBox(id, { status: 'paused' })` then closes modal |
| Danger Styling | None (non-destructive) | Background is neutral gray, not red |

**File references:**
- Modal config: src/components/ConfirmModal.jsx lines 16-22
- Modal render: src/components/ConfirmModal.jsx lines 25-42
- Trigger: src/views/BuyBoxesView.jsx lines 307-310 + App.jsx lines 314, 347

---

## Left-Sidebar Metric Boxes

**Component:** `LeftPanel` (components/LeftPanel.jsx), metric grid at lines 144-179

These four tiles live in the left sidebar below the main navigation and above the Buy Boxes list. They are fed by a single `/api/dealfeed/deals/dashboard/kpis` endpoint call (App.jsx line 262). Each tile can be:
- **Clickable** (toggles a feed filter) with active state
- **Display-only** (disabled, no click handler)

### Metric Tiles Reference

| Icon | Label | Source Field | KPI Value | Style Class | Clickable? | Active State | On Click | Notes |
|------|-------|--------------|-----------|-------------|-----------|--------------|----------|-------|
| `TrendingUp` | New This Week | `kpis.new_this_week` | count (or " - ") | `accent-green` | Yes | `feedFilter === 'new_this_week'` | Toggle filter to new_this_week/all | Highlights deals from last 7 days |
| `Flame` | Hot Deals | `kpis.hot_deals` | count (or " - ") | `accent-orange` | Yes | `feedFilter === 'hot'` | Toggle filter to hot/all | Highlights deals with score 8+ or marked hot |
| `Target` | Response Rate | `kpis.response_rate` | formatted as "X%" (or " - ") | `accent-blue` | No (disabled) | - | - | Display-only; "Coming soon" title |
| `Clock` | Awaiting | `kpis.awaiting_response` | count (or " - ") | `accent-violet` | No (disabled) | - | - | Display-only; "Coming soon" title |

**File references:**
- MetricTile component: src/components/LeftPanel.jsx lines 11-33
- Metric grid: src/components/LeftPanel.jsx lines 144-179
- KPI fetch: src/App.jsx line 262 (called once on subscriber load)
- Feed filter state: src/App.jsx lines 157, 289-293 (feedFilter state + setter passed to LeftPanel)

### Metric Tile Structure

```html
<button type="button" class="metric-tile [accent-COLOR] [active] [disabled] [clickable]">
  <div class="metric-tile-icon"><ICON size={14} /></div>
  <div class="metric-tile-value">[KPI_VALUE]</div>
  <div class="metric-tile-label">[LABEL]</div>
</button>
```

**CSS classes:**
- `.metric-tile` - base
- `.accent-green`, `.accent-orange`, `.accent-blue`, `.accent-violet` - semantic colors
- `.active` - applied when clickable tile's filter is active
- `.disabled` - applied to display-only tiles (cursor: default)
- `.clickable` - applied when `onClick` handler exists

---

## Header Buttons

**Location:** `.bb-pagehead__actions` (flex row, gap 8px)  
**File reference:** src/views/BuyBoxesView.jsx lines 441-448

### Button Layout

| Order | Button | Icon | Text | onClick | Route | Status | Notes |
|-------|--------|------|------|---------|-------|--------|-------|
| 1 | Search button | `Search` size 13 | "New buyer search" | `setShowBuyerSearch(true)` | N/A (modal) | [PORT] stub | Coming-Soon informational modal; no backend integration yet |
| 2 | Create button | `Plus` size 13 | "New buy box" | `onCreate()` | `/buy-boxes/new` | [PORT] | Opens wizard in create mode; `onCreate` prop navigates to `/buy-boxes/new` (App.jsx line 311) |

### "New Buyer Search" Button (Stub)

**Component:** `BuyerSearchComingSoonModal` (components/BuyerSearchComingSoonModal.jsx)

**Purpose:** Placeholder for a future buyer search feature that mirrors the buy box wizard but for buyer profiles instead of buy box filters.

**Current behavior:**
1. Click "New buyer search" button
2. `setShowBuyerSearch(true)` opens modal
3. Modal shows:
   - Title: "Buyer Search"
   - Badge: "Coming Soon" (green tint)
   - Body: Narrative description of feature (find buyers, asset class, geography, deal size, financing, nightly match)
   - Button: "Got it" (primary, closes modal)
4. No state saved; modal dismissed

**Design note:** The stub is intentional and [PORT]-able. When the feature launches in session N, replace the stub modal with a full wizard navigation (same pattern as the buy box wizard). The button and its state plumbing (`showBuyerSearch` state) remain unchanged.

**File reference:** src/views/BuyBoxesView.jsx lines 442-443, 472-474; component at src/components/BuyerSearchComingSoonModal.jsx

---

## Page Header Stats

**Location:** `.bb-pagehead__sub` section  
**File reference:** src/views/BuyBoxesView.jsx lines 400-438

Two derived counts displayed below the page title:

```
[N] active · [M] need attention
```

| Stat | Derivation | Conditions | Color | Notes |
|------|-----------|-----------|-------|-------|
| Active count (green) | `grouped.active.length` | Cards in the `active` column | `var(--accent)` (#1db954) | Always shown if > 0; shown even if 0 |
| Attention count (amber) | `grouped.gap.length + grouped.paused.length` | Sum of cards in `gap` + `paused` columns | `var(--warn)` (#e0a83a) | Only shown if > 0; omitted if no paused or gap cards |

---

## Week Strip (Mon-Sun Schedule)

**Component:** `WeekStrip` (src/views/BuyBoxesView.jsx lines 131-145)  
**Status:** [PORT] read-only display  
**Build status:** Editable version [BUILD] goes to session 07

### Current Behavior (Read-Only)

The week strip is a 7-column grid showing Mon-Sun with visual indicators for which days are scheduled.

```html
<div class="bb-week" aria-label="Run schedule">
  <span class="bb-week__d [is-on]">M</span>
  <span class="bb-week__d [is-on]">T</span>
  ...
</div>
```

| Day Index | DAY_KEYS | DAY_LABEL | Condition for `.is-on` | Notes |
|-----------|----------|-----------|------------------------|-------|
| 0 | `'mon'` | `'M'` | `box.run_schedule.days` includes `'mon'` | Green background if on; dimmed in paused/gap cards |
| 1 | `'tue'` | `'T'` | `box.run_schedule.days` includes `'tue'` | - |
| 2 | `'wed'` | `'W'` | `box.run_schedule.days` includes `'wed'` | - |
| 3 | `'thu'` | `'T'` | `box.run_schedule.days` includes `'thu'` | - |
| 4 | `'fri'` | `'F'` | `box.run_schedule.days` includes `'fri'` | - |
| 5 | `'sat'` | `'S'` | `box.run_schedule.days` includes `'sat'` | - |
| 6 | `'sun'` | `'S'` | `box.run_schedule.days` includes `'sun'` | - |

**Array encoding:** The backend sends `run_schedule: { days: ['mon', 'wed', 'fri'] }` as a flat array of active day keys.

**Styling:**
- `.bb-week` - 7-column grid, gap 4px
- `.bb-week__d` - 24px square, border, monospace label
- `.bb-week__d.is-on` - green (`--accent`) background + white text; dimmed to surface-hi-2 if card is paused or gap

**File reference:** src/views/BuyBoxesView.jsx lines 83-145, src/styles/buyBoxes.css lines 291-318

### Future Editable Week Strip [BUILD]

Session 07 will add an editable toggle UI to the card and wizard Activate step. The spec for the editable version:

1. **Card quick-edit:** Replace read-only WeekStrip with a click-to-toggle version
   - Same 7-day grid
   - Click any day to toggle on/off
   - On change, PATCH `run_schedule.days` to the new boolean array
   - Visual feedback (animate the toggle, show a save toast)

2. **Wizard Activate step:** Add a section above the cadence selector
   - Header: "Run schedule (optional)"
   - Subtitle: "Select the days you want Night Drop to run"
   - 7 toggle buttons (Mon-Sun) with state bound to `form.delivery.days` (new field)
   - On form submit, include `run_schedule: { days: [array of day keys] }` in the PATCH/POST payload

3. **Encoding contract:** The `run_schedule.days` array is always a subset of `['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']`. Empty array `[]` means never run (edge case; not UI-exposed but must be handled gracefully).

4. **Cadence interaction:** The Activate step cadence selector (Daily/Weekly/Real-time) is a convenience preset that also updates the days array:
   - Daily → `['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']`
   - Weekly → `['mon']` (or ask user which day)
   - Real-time → `[]` (no scheduled runs; event-driven delivery)
   - User can still override with manual day selection after choosing a cadence

**Note:** The read-only week strip in the current build (session 06) is a reference point. Do not modify it; it's the visual source for the new toggle style that session 07 will build.

**File reference for future work:** Placeholder at src/views/BuyBoxesView.jsx line 304; will accept a new prop `editable` and conditional rendering in session 07.

---

## Column and Card CSS Classes

### Column (`.bb-col`)

| Class | Purpose |
|-------|---------|
| `.bb-col` | Container for a single column |
| `.bb-col[data-status="ID"]` | Scoped to column ID (pending, validating, active, paused, gap) |
| `.bb-col[data-empty="true"]` | Applied when column has 0 cards; dims header/sub text |
| `.bb-col__head` | Column header with dot, title, count |
| `.bb-col__dot` | Status indicator dot (colored by column) |
| `.bb-col__title` | Column title text |
| `.bb-col__count` | Badge showing card count in column |
| `.bb-col__sub` | Subtitle text (e.g., "Running nightly") |
| `.bb-col__body` | Flex container for cards |
| `.bb-col__empty` | Message shown when column has no cards |

**Dot colors:**
- `[data-status="pending"]` → gray
- `[data-status="validating"]` → blue (`--info`)
- `[data-status="active"]` → green (`--accent`) with glow
- `[data-status="paused"]` → amber (`--warn`)
- `[data-status="gap"]` → red (`--danger`)

**File reference:** src/styles/buyBoxes.css lines 108-172

### Card (`.bb-card`)

| Class | Purpose |
|-------|---------|
| `.bb-card` | Card container; draggable |
| `.bb-card[data-status="ID"]` | Scoped to card status (from deriveColumn) |
| `.bb-card[data-box-id="UUID"]` | Box ID for D&D tracking |
| `.bb-card:hover` | Brightened background; green accent border |
| `.bb-card:active` | `cursor: grabbing` during drag |
| `.bb-card[data-status="gap"]` | Borders red; shows alert instead of hero |
| `.bb-card[data-status="paused"]` | Opacity 0.85; dimmed indicators |
| `.bb-card__head` | Header flex row (dot + title) |
| `.bb-card__dot` | Status indicator dot (6px) |
| `.bb-card__title` | Buy box name (truncated with ellipsis) |
| `.bb-card__hero` | Delivered count + sparkline grid |
| `.bb-card__big` | Large delivered count (32px) |
| `.bb-card__lbl` | "Delivered" label |
| `.bb-card__delta` | Weekly delta badge ("+N this week") |
| `.bb-card__spark` | Inline SVG sparkline container |
| `.bb-card__chiprow` | Asset + geo chip row |
| `.bb-chip` | Asset class chip |
| `.bb-chip--geo` | Geo chip with MapPin icon |
| `.bb-card__nextrun` | "Last run" row |
| `.bb-card__k` | Label ("Last run") |
| `.bb-card__v` | Value (timestamp or message) |
| `.bb-week` | 7-day schedule grid |
| `.bb-week__d` | Single day indicator (24px square) |
| `.bb-week__d.is-on` | Active day (green bg) |
| `.bb-alert` | Coverage gap alert (red tint) |
| `.bb-card__actions` | Action buttons row |
| `.bb-btn` | Primary action button |
| `.bb-btn--primary` | Green accent button (Resume) |
| `.bb-btn--danger` | Red accent button (Edit Geo) |
| `.bb-iconbtn` | Secondary menu button (Sliders icon) |

**File reference:** src/styles/buyBoxes.css lines 173-444

---

## Integration Points

### Context and Props

| Prop / Context | Type | Source | Used For |
|---|---|---|---|
| `onCreate` | function | App.jsx line 311 | Navigate to `/buy-boxes/new` |
| `onEdit(box)` | function | App.jsx line 312 | Navigate to `/buy-boxes/[id]/edit` |
| `onEditGeo(box)` | function | App.jsx line 313 | Navigate to `/buy-boxes/[id]/edit` (same as onEdit; distinguishes intent) |
| `onPause(box)` | function | App.jsx line 314 | Set `pausingBuyBox` state to trigger modal |
| `useDeals()` context | hook | DealsContext.jsx | Access `buyBoxes`, `patchBuyBox()`, `deleteBuyBox()` |
| `useToast()` context | hook | ToastContext.jsx | Fire toast notifications on Resume, Delete |
| `kpis` | object | App.jsx line 262 (fetched) | Feed LeftPanel metric boxes |
| `feedFilter` | string | App.jsx line 157 state | Track active feed filter (new_this_week, hot, all) |
| `setFeedFilter` | function | App.jsx line 157 state | Update feed filter on metric tile click |

**File reference:** App.jsx lines 147-350 (full AppShell with state management)

### API Contracts

| Endpoint | Method | Payload | Response | Trigger | Notes |
|----------|--------|---------|----------|---------|-------|
| `/api/dealfeed/buy-boxes` | GET | - | `{ buy_boxes: BuyBox[] }` | Component mount (via context) | Fetches all buy boxes for the user |
| `/api/dealfeed/buy-boxes/:id` | PATCH | `{ status: 'active'\|'paused'\|'pending' }` | `{ buy_box: BuyBox }` | Drag drop between lanes | Status change only; no other fields |
| `/api/dealfeed/deals/dashboard/kpis` | GET | - | `{ new_this_week, hot_deals, response_rate, awaiting_response, unread_count, run_history }` | App mount (on subscriber load) | Feeds metric boxes and run history chart |
| `/api/dealfeed/buy-boxes/:id` | DELETE | - | `{ success: true }` | Click Delete in CardMenu + confirm | Removes buy box; fires toast |

**File references:**
- BUY-BOXES endpoints: DealsContext.jsx (hooks into API)
- KPI fetch: App.jsx line 262

---

## Accessibility (a11y)

| Feature | Implementation | Notes |
|---------|---|---|
| Drag-and-drop | Native HTML5 `draggable` + ARIA | Keyboard accessible (depends on user agent); visual feedback via cursor + shadow |
| Column headers | Landmark `<div role="region">` implied | Semantic HTML used throughout |
| Week strip | `aria-label="Run schedule"` | Indicates purpose of 7-day grid |
| Metric tiles | `aria-pressed` on clickable tiles | Indicates on/off toggle state |
| Buttons | Semantic `<button>` tags | Icon-only buttons have `aria-label` |
| Cards | `<article>` tags | Structural semantics for each buy box card |
| Menu | Dropdown with `role="menu"` | Keyboard navigation via arrow keys + Escape to close |

**File reference:** src/views/BuyBoxesView.jsx (consistent use of semantic HTML + aria attributes)

---

## Design Tokens and Colors

All colors and dimensions reference `src/styles/tokens.css`:

| Token | Value | Used For |
|-------|-------|----------|
| `--accent` | #1db954 (green) | Active status, primary buttons, sparkline |
| `--accent-hi` | #1ed760 | Hover on green button |
| `--warn` | #e0a83a (amber) | Paused status, attention badge |
| `--danger` | #b26464 (red) | Gap status, danger actions |
| `--danger-hi` | #e07a7a | Hover on danger actions |
| `--info` | #5b8def (blue) | Validating status |
| `--surface` | #1a1a1f | Card background |
| `--surface-hi` | #22222a | Card hover background |
| `--border` | #2a2a2e | Dividers, button borders |
| `--fg` | #e6e6e6 | Primary text |
| `--fg-muted` | #9a9a9a | Secondary text |
| `--fg-dim` | #6b6b6b | Tertiary text, dimmed indicators |
| `--bg-page` | #0d0d0d | Page background |
| `--bg-sunken` | #0d0d10 | Card hero background |

**Font:** Manrope (sans-serif); never JetBrains Mono  
**Typography:** DM Sans for labels/counts; Manrope for body  
**No em dashes:** Use comma, period, or hyphen only.

**File reference:** src/styles/tokens.css (authoritative source)

---

## Summary: What's [PORT], [CUT], and [BUILD]

| Feature | Status | Notes |
|---------|--------|-------|
| 5-lane Kanban board | [PORT] | Replicate all column logic, deriveColumn(), drop rules, status mapping |
| Native HTML5 D&D | [PORT] | Replicate drag/drop handlers; no external library required |
| Card anatomy (title, chips, week strip, actions) | [PORT] | Replicate all fields, styling, click handlers |
| Pause/Resume/Edit/Edit Geo actions | [PORT] | Replicate all action buttons, confirm modals, toast feedback |
| Read-only Mon-Sun week strip | [PORT] | Display only; read from `run_schedule.days` array |
| Editable Mon-Sun week picker | [BUILD] | Session 07; toggle buttons with per-day PATCH calls |
| Left-sidebar metric boxes | [PORT] | Replicate all 4 tiles, KPI binding, clickable filters |
| "New buyer search" button (stub) | [PORT] | Replicate stub; replace with wizard when feature ships |
| "New buy box" button | [PORT] | Navigate to `/buy-boxes/new` (wizard create route) |

---

**End of Management Surface Specification**
