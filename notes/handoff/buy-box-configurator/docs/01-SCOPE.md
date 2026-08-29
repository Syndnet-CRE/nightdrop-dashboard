# SCOPE: Buy-Box Configurator Rebuild

**Audience:** Engineering team rebuilding this feature in a new platform and business domain.

**Status:** Authoritative specification. Source is verbatim from `/Users/birwin/nightdrop-dashboard/src` as of 2026-06-30.

---

## Overview

The Buy-Box Configurator consists of two embedded surfaces:

1. **MANAGEMENT PAGE** - Kanban board for buy-box lifecycle tracking (status, delivery metrics, actions)
2. **CONFIGURATOR WIZARD** - 6-step guided builder for creating and editing buy-box rules

Both surfaces are [PORT] directly from source with surgical cuts to remove financial, distress-scoring, and geographic-granularity subsections. One new capability [BUILD] is required: a per-day Monday-Sunday editable schedule picker.

---

## 1. MANAGEMENT PAGE - Capabilities & Anchors

**File:** `src/views/BuyBoxesView.jsx`

| Capability | Tag | Details | File:Line |
|-----------|-----|---------|-----------|
| Kanban board layout | [PORT] | 5-lane grid: Pending, Validating, Active, Paused, Coverage gap. Native HTML5 drag-and-drop. Coverage-gap lane rejects drops. | 452-467 |
| Kanban lane definitions | [PORT] | Column titles, subtitles, status-to-column mapping via `deriveColumn()`. | 24-40 |
| Buy-box card display | [PORT] | Label, status dot, delivered count + delta, sparkline (72x36 SVG), asset-class + metro chips, last-run timestamp, week strip, coverage alert. Read-only WeekStrip. | 241-342 |
| Sparkline (inline SVG) | [PORT] | 7-day delivery trend, no external deps. Min/max normalized, area + line + dot. | 106-126 |
| Week strip (read-only) | [PORT] | Days M-T-W-T-F-S-S; filled/unfilled per `box.run_schedule.days[]`. Classes `.bb-week`, `.bb-week__d`, `.is-on`. Dimmed for paused/gap cards. | 131-145 |
| Drag-and-drop | [PORT] | `handleDragStart` sets dataTransfer `boxId`. `handleDrop` patches status (gap rejects). Calls `patchBuyBox(id, {status})`. | 417-424 |
| Pause action | [PORT] | Card button + menu item. Triggers `onPause` callback → App.jsx PauseBoxConfirm modal. | 307-310, 208-211 |
| Resume action | [PORT] | Card button + menu item (paused cards only). Calls `patchBuyBox(id, {status: 'active'})`, toasts "Search resumed - runs tonight." | 312-315, 213-216, 407-414 |
| Configure/Edit action | [PORT] | Card button (pending/validating) + menu item (all). Navigates to `/buy-boxes/{id}/edit`, opens wizard in edit mode. | 322-325, 205-206 |
| Edit geo action | [PORT] | Danger button (gap cards only). Menu item for gap cards. Navigates to `/buy-boxes/{id}/edit`, wizard opens to geography step. | 317-320, 218-221 |
| Delete action | [PORT] | Menu item with confirm dialog. Calls `deleteBuyBox(id)`. | 224-234 |
| Card menu | [PORT] | Dropdown via MoreHorizontal icon. Options vary by column. Backdrop click closes. | 150-239 |
| Page header title & stat | [PORT] | "Buy-Box Management" with active count + attention count (paused + gap). | 432-439 |
| "New buyer search" button | [PORT] | Search icon, stub placeholder (Coming-Soon modal). Button is a placeholder; destination TBD. Document intent but do not implement. | 442-444, 472-474 |
| "New buy box" button | [PORT] | Plus icon, primary style. Navigates to `/buy-boxes/new`, opens wizard in create mode. | 445-447 |
| Metric boxes (left-sidebar KPIs) | [PORT] | Four tiles: "New This Week" (TrendingUp, green, clickable filter), "Hot Deals" (Flame, orange, clickable), "Response Rate" (Target, blue, display-only), "Awaiting" (Clock, violet, display-only). Grid layout 4 cols. Fed by `api.get('/api/dealfeed/deals/dashboard/kpis')` endpoint. | LeftPanel.jsx 11-179 |

### Management Page: Styling & Behavior

- **Classes:** `.bb-shell`, `.bb-pagehead`, `.bb-pagehead__actions`, `.bb-frame`, `.bb-board`, `.bb-col`, `.bb-card`, `.bb-chip`, `.bb-week`, `.bb-alert`.
- **Design tokens:** `--green #5BCC48`, `--warning #F4B73E`, `--danger #E5484D`.
- **Font:** Manrope (no JetBrains Mono anywhere).
- **Read-only:** WeekStrip reflects `box.run_schedule.days[]` only; no edit controls on the card itself. Editing schedule happens only in the wizard Activate step and optionally via a quick-edit button.

---

## 2. CONFIGURATOR WIZARD - Capabilities & Anchors

**Primary File:** `src/components/BuyBoxWizard.jsx`

### 2.1 Wizard Shell & Navigation

| Capability | Tag | Details | File:Line |
|-----------|-----|---------|-----------|
| Wizard wrapper | [PORT] | Container, preview state machine (idle/spinning/resolved/error), preview debounce 400ms, form state (EMPTY_FORM). | BuyBoxWizard.jsx 1-50 |
| Step definitions | [PORT] | **6 effective steps** (7 becomes 6 after Distress cut). Labeling: 1=Target, 2=Profile, 3=Owner, 4=Location (was 5), 5=Threshold (was 6), 6=Activate (was 7). | 19-27 (renumber after cut) |
| Stepper/timeline UI | [PORT] | Horizontal timeline showing step nums and labels. CSS classes `.stepper`, `.step`, `.active`, `.done`, `.step-num`, `.step-num-text`. Backward jump only (no forward skip). | 339-354 |
| canGoNext logic | [PORT] | Step 1 requires `form.assets.length > 0 && form.geo.states.length > 0`. Other steps open automatically if form state is present. | 104-107 |
| Page rendering | [PORT] | Switch renders BuyBoxPage1..7 based on current step. Update switch to 1-6 after Distress cut. | 296-305 |
| Form state (EMPTY_FORM) | [PORT] | Central form object with assets, geo, phys, fin, owner, signals, logic, distress_floor, threshold, delivery, name. Updated via page callbacks. | lib/wizardFormState.js (373 lines) |
| nativeToPayload / toNativeForm | [PORT] | Bidirectional converters between form state and API payload. Used on edit load and create/patch submit. | lib/wizardFormState.js |
| Preview pool + live clock | [PORT] | Right-rail live match count with delta pulse, HH:MM:SS clock tick, auto-refresh on form change (debounced 400ms). Hit `POST /api/dealfeed/buy-boxes/preview`. | BuyBoxRightRail.jsx 37-92 |
| buildFilters() | [PORT] | Summarizes form state into human-readable filter chips. Used in Activate step review section and right-rail. Remove ZIP refs and distress-floor refs after cuts. | 36-77 |
| buildSummary() | [PORT] | Human summary of current filters. Update after cuts. | 88-100 |
| clearFilter() | [PORT] | Remove an individual filter (step back to the relevant page). Update after cuts. | 279-287 |

### 2.2 Step 1: Target (Asset Class + Geography)

**File:** `src/components/BuyBoxPage1.jsx`

| Capability | Tag | Details | File:Line |
|-----------|-----|---------|-----------|
| Asset-class selector | [PORT] | 10 primary classes (grid layout): self_storage, multifamily, mobile_home_rv, residential_sfr, land, industrial, retail, gas_station_c_store, office, special_purpose. Single-select (toggles, mutually exclusive). Cards show icon, title, subtitle, property count. | 56-60, 139-157, 193-202, DISPLAY_CLASSES |
| Sub-asset selector | [PORT] | For non-land: multi-select up to 3 sub-asset chips per primary class (SUBTYPE_ICONS keyed by ATTOM use codes). For land: LAND_SUB_ASSETS picker (no cap). Conditional on asset class via classSchema(). | 14-39, 368-398, 331-366 |
| Geography: States | [PORT] | Combobox with search (STATES 51 entries). Multi-select. | 410-441 |
| Geography: Counties/Metros | [PORT] | Segmented toggle between Counties and Metros. Counties populated via `api.get('/api/dealfeed/geo/counties?states=')` (state-scoped). Metros from MAJOR_METROS array. | 443-506, 507-543 |
| Geography: ZIP codes | [CUT] | Entire ZIP sub-section removed. Input `.chip-input` for manual ZIP entry (max 5, validate `^\d{5}$`), form.geo.zips array. All references removed from buildFilters, buildSummary, clearFilter. | 547-571 |
| State counts | [PORT] | Mock counts per state (STATE_COUNTS 51 entries). Displayed on state cards. These are TRACKED DISTRESSED PROPERTIES - when builder supports all 50 states, counts are misleading (MVP 5-county coverage only). Document or relabel before external launch. | 63-75 |

### 2.3 Step 2: Profile (Physical Properties)

**File:** `src/components/BuyBoxPage23.jsx` → `BuyBoxPage2` export

| Capability | Tag | Details | File:Line |
|-----------|-----|---------|-----------|
| Physical section | [PORT] | A-section of 2-col grid. Building size (sqft), acreage, lot size (sub-acre sqft), year built (range). Building class chips (A/B/C, auto-populate year defaults). | 113-221 |
| Class-conditional fields | [PORT] | Stories (MF), units (MF/self-storage), beds/baths (SFR), lot dimensions (SFR), construction/foundation/roof/garage types (per classSchema). | 161-219 |
| Acreage conflict warning | [PORT] | Detects if user's acreage range conflicts with land sub-asset bounds. Shows warning; prevents 0-match scenario. | 48-65 |
| Financial section (FULL) | [CUT] | B-section of 2-col grid. Assessed value, minimum owner equity presets (25/40/50/60/75%), price-per-unit-max (MF), improvement-to-land-max (land), development-potential-min (land). Entire section lines 223-271 removed. | 223-271 |
| Grid layout change | [CUT] | After Financial cut, grid changes from 2-col to 1-col. Line 112: `gridTemplateColumns: '1fr 1fr'` becomes `gridTemplateColumns: '1fr'`. | 112 |

### 2.4 Step 3: Owner (Ownership Profile)

**File:** `src/components/BuyBoxPage23.jsx` → `BuyBoxPage3` export

| Capability | Tag | Details | File:Line |
|-----------|-----|---------|-----------|
| Entity type selector | [PORT] | OwnerChips: Any / Individual / LLC-Entity / Trust / Corporate. Single-select. | 343-354 |
| Hold period | [PORT] | Range input (years). | 356-358 |
| Out-of-state owner toggle | [PORT] | Boolean. Mailing address in different state than property. | 360-365 |
| Absentee owner toggle | [PORT] | Boolean. Mailing address does not match property address. | 366-371 |
| Tax delinquent toggle | [PORT] | Boolean. **Kept as plain owner flag.** No longer feeds distress-scoring. Description updated: "Outstanding property tax balance" (remove distress-signals reference). | 372-377 |
| Active foreclosure toggle | [PORT] | Boolean. **Kept as plain owner flag.** No longer feeds distress-scoring. Description updated: "Notice of default / lis pendens" (remove distress-signals reference). | 378-387 |

**NOTE:** Page3 currently syncs these toggles bidirectionally with `form.signals` array (lines 315-321 via `toggleSignal()`). After Distress page is removed, these toggles must become plain owner flags: `form.owner.tax_delinquent` and `form.owner.active_foreclosure` (boolean fields). Update `toNativeForm()` and `nativeToPayload()` to map these correctly. Do NOT re-wire them into signals; they are owner metadata only.

### 2.5 Step 4: Location & Risk

**File:** `src/components/BuyBoxPage5.jsx`

**Note:** This is currently step 5 of 7. After Distress cut, it becomes step 4 of 6.

| Capability | Tag | Details | File:Line |
|-----------|-----|---------|-----------|
| Utilities section | [PORT] | Toggles for water, sewer, electric, gas availability. | 154-169 |
| Risk section | [PORT] | Exclude floodplain, exclude wetlands (toggles), opportunity zone (tri-state), TIF (tri-state). | 171-204 |
| Class-specific rules | [PORT] | Per-asset-class conditionals via classSchema(). Road frontage (land), AADT slider (commercial heat-gradient blue-yellow-red), corner lot (retail), pool/elevator/renter%/LIHTC (MF), REIT/foreclosure-history (self-storage), assemblage, ETJ, zoning codes (land), future land use (land). | 206-330 |

### 2.6 Step 5: Match Threshold

**File:** `src/components/BuyBoxPage6.jsx`

**Note:** This is currently step 6 of 7. After Distress cut, it becomes step 5 of 6.

| Capability | Tag | Details | File:Line |
|-----------|-----|---------|-----------|
| Threshold cards | [PORT] | Three preset cards: 70% (volume, 15-25 deals), 80% (balanced, 8-15 deals), 90% (precision, 2-6 deals). Radio selection. Estimated count display. Classes `.threshold-grid`, `.threshold`, `.on`. | 1-71 |

### 2.7 Step 6: Activate (Name, Review, Schedule, Delivery)

**File:** `src/components/BuyBoxPage7.jsx`

**Note:** This is currently step 7 of 7. After Distress cut, it remains step 6 of 6.

| Capability | Tag | Details | File:Line |
|-----------|-----|---------|-----------|
| Name input | [PORT] | Text input for buy-box label. Placeholder "Sun Belt SFR distress - Q2 '26". Shown in review section. | 27-36 |
| Filters review section | [PORT] | Human-readable summary of all active filters. Edit link jumps back to step 1. Renders chips from `summary` prop (built by `buildSummary()`). | 47-61 |
| Delivery cadence selector | [PORT] | Three preset cards: Daily (06:00 AM EST), Weekly (Mon 07:00 AM), Real-time (No SLA). Radio selection. | 63-84, CADENCES 4-8 |
| Cadence-to-schedule mapping | [PORT] | Currently: Daily=7 days, Weekly=1 day, Real-time=0 days in `run_schedule.days[]`. After [BUILD] per-day editor: user can toggle any subset of Mon-Sun, writing 7 booleans to `run_schedule.days[]`. | n/a |
| **Per-day schedule editor** | [BUILD] | **NEW FEATURE.** Monday-Sunday grid with 7 toggleable day buttons (one per column). Currently absent from source. User can select any subset of days (e.g., Mon/Wed/Fri for a 3x/week cadence, or all 7 for daily). State stored as `form.delivery.days = [bool, bool, ..., bool]` (Mon..Sun). Also needed: quick-edit button on management cards to adjust schedule without opening full wizard. | n/a (NEW) |
| Activation ribbon | [PORT] | Summary text + Activate button (zap icon). Disabled until `form.name.trim()` is non-empty. On click, calls `onActivate()` which POSTs to backend, then fires BuyBoxActivatedDialog. | 86-98 |
| Live match pool | [PORT] | Right-rail update: shows live match count with delta, first-drop timestamp, cadence label. After Financial cut: stat-trio goes from 3 to 2 cells (min equity cell removed). | BuyBoxRightRail.jsx |

### 2.8 Distress Signals Step (FULL PAGE REMOVED)

**File:** `src/components/BuyBoxPage4.jsx`

**Entire file [CUT]:** 107-204 lines. Includes:

- 12 signal cards (3 tiers: pressure, flag, urgent) with counts and descriptions (lines 5-105).
- Signal toggle logic (lines 108-117).
- AND/OR logic selector (lines 167-179).
- Distress score floor presets (0, 30, 40, 60, 80) (lines 181-199).

**Removal impact:**

- `form.signals` array and `form.logic` (AND/OR) are DEPRECATED and removed from form state.
- `form.distress_floor` is DEPRECATED and removed.
- Owner-page tax-delinquent and active-foreclosure toggles stay but become plain owner flags (see Step 3 notes).
- STEPS array renumbers: `[{id:1,...}, {id:2,...}, {id:3,...}, {id:4,label:'Location',...}, {id:5,label:'Threshold',...}, {id:6,label:'Activate',...}]`. Old {id:4, label:'Distress'} is deleted.
- renderPage switch statement loses the Distress case.
- buildFilters() removes lines that push distress signals and distress_floor.
- buildSummary() removes distress summary line.
- clearFilter() removes distress and signals clearing.
- BuyBoxPage4 import and export removed from BuyBoxWizard.jsx.

### 2.9 Right Rail (Live Match Pool & Stats)

**File:** `src/components/BuyBoxRightRail.jsx`

| Capability | Tag | Details | File:Line |
|-----------|-----|---------|-----------|
| Live pool header | [PORT] | "Live" eyebrow, HH:MM:SS clock tick (updates every 1s), `.rail-tick` class. | 62-68 |
| Match count display | [PORT] | SlotMachineCounter with delta pulse animation (600ms). Classes `.quote-block`, statuses idle/spinning/resolved/error. | 70-92 |
| Stat trio | [PORT] | Three stat cells: min equity, hold period, occupancy. **After Financial cut:** equity cell removed, leaving 2 cells (hold + occupancy). Derived from form state via `deriveStatTrio()`. | 94-110, 6-12 |
| Geo concentration | [PORT] | Geographic focus heatmap. Shows which counties/metros are weighted in the live pool. | 112-129 |
| Active filters chips | [PORT] | Running list of active form filters as removable chips. Clicking X calls `clearFilter()`. | 131-156 |
| Delta pulse animation | [PORT] | 600ms green highlight pulse when match count changes. | 45-55 |

### 2.10 Activation Success Dialog

**File:** `src/components/BuyBoxActivatedDialog.jsx`

| Capability | Tag | Details | File:Line |
|-----------|-----|---------|-----------|
| Activation dialog | [PORT] | Portal-rendered modal. Eyebrow "Buy box activated", title "You're hunting." Displays buy-box name, stat grid (3 cells: Match pool / First drop / Cadence), two action buttons (secondary "Return to dashboard" + primary "Build another"). Focus trap. | 45-167 |
| Stat grid | [PORT] | Match pool (live count), first-drop timestamp (when next delivery runs), cadence label (Daily / Weekly / Real-time). Derived from `run_schedule.days` (7=daily, 1=weekly, 0=realtime, else custom). | 119-143, 17-43 |
| Actions | [PORT] | "Return to dashboard" closes dialog; "Build another" resets wizard form to create new box (EMPTY_FORM) and returns to step 1. | 145-162, 322-327 |

### 2.11 Helper Modules

| Module | Tag | Details | File:Line |
|--------|-----|---------|-----------|
| buyBoxTaxonomy.js | [PORT] | 10-class taxonomy (ASSET_CLASSES), LAND_SUB_ASSETS, US_STATES (51), MAJOR_METROS. Lockstep with backend 4-file set. | lib/buyBoxTaxonomy.js ~250 lines |
| buyBoxFieldSchema.js | [PORT] | Per-class conditional fields via `classSchema(assetClass)`. Returns `{phys: [...], fin: [...]}`. Used to show/hide fields on Page2. | lib/buyBoxFieldSchema.js |
| wizardFormState.js | [PORT] | EMPTY_FORM shape, nativeToPayload (form → POST/PATCH payload), toNativeForm (API response → form). Update after removing signals, distress_floor, financial fields. | lib/wizardFormState.js 373 lines |
| buyBoxInputs.jsx | [PORT] | Reusable input components: NumberField, RangeInputs, SingleInput. Used throughout pages. | components/buyBoxInputs.jsx |

### 2.12 Styling

**Files:**
- `buy-box-wizard.css` - main wrapper, layout
- `buy-box-wizard-pages.css` - page-specific classes (.asset-grid, .combo, .chip-input, .preset-row, .preset-chip, .geo-seg, .seg, .signal-grid, .signal, .logic-row, .threshold-grid, .delivery-grid, .review-*, .stepper, .activate-ribbon)
- `buyBoxes.css` - kanban (.bb-*), read-only week strip (.bb-week, .bb-week__d, .is-on)
- `buyBoxActivated.css` - success dialog (.bba-*)
- `tokens.css` - design tokens (--green #5BCC48, --warning #F4B73E, --danger #E5484D, Manrope font)

---

## 3. CUTS, PRECISELY

### 3.1 ZIP Codes (BuyBoxPage1.jsx)

**Removal range:** Lines 547-571 (entire ZIP sub-section)

```javascript
// DELETE THESE LINES:
// "Specific ZIP codes, optional"
// .chip-input with manual ZIP entry
// addZip() validation (^\d{5}$)
// state zipInput management
// form.geo.zips array
```

**Side effects:**
- Remove from `buildFilters()` line 47: condition `if (form.geo.zips.length)`
- Remove from `buildSummary()` line 88: ZIP summary
- Remove from `clearFilter()` line 279: ZIP clearing logic
- Update right-rail filter chips to never show "Zips"

---

### 3.2 Financial Section (BuyBoxPage23.jsx, BuyBoxPage2)

**Removal range:** Lines 223-271 (entire B-Financial section)

```javascript
// DELETE THESE LINES:
// Section B header "Financial"
// Assessed value field (price_min/price_max)
// Minimum owner equity presets (25/40/50/60/75%)
// Price-per-unit-max (MF)
// Improvement-to-land-max (land)
// Development-potential-min (land)
```

**Side effects:**
- Line 112: Change grid from `'1fr 1fr'` to `'1fr'` (single-column layout)
- Line 109 page subtitle: Remove "financial floor" language from `<p className="page-sub">`
- Remove from `buildFilters()` lines 48-64: all fin.* field summaries
- Remove from `buildSummary()` lines 93-94: equity/price summary
- Remove from `clearFilter()` lines 280-282: financial field clearing
- BuyBoxRightRail.jsx `deriveStatTrio()` lines 6-12: Remove equity stat cell. Remaining: hold + occupancy only (2 cells instead of 3).
- Update form state (EMPTY_FORM, toNativeForm, nativeToPayload): remove all fin.* fields

---

### 3.3 Distress Signals Step (BuyBoxPage4.jsx, BuyBoxWizard.jsx)

**Removal range:** Entire BuyBoxPage4.jsx file (107-204 lines)

```javascript
// DELETE ENTIRE FILE:
// src/components/BuyBoxPage4.jsx (SIGNALS array, distress floor presets, toggle logic, AND/OR selector)
```

**Side effects in BuyBoxWizard.jsx:**

- Line 6: Remove `import { BuyBoxPage4 } from './BuyBoxPage4'`
- Lines 19-27 (STEPS array): Renumber steps after deletion
  ```javascript
  // OLD (7 steps):
  { id: 1, label: 'Target' },
  { id: 2, label: 'Profile' },
  { id: 3, label: 'Owner' },
  { id: 4, label: 'Distress' },     // DELETE THIS
  { id: 5, label: 'Location' },
  { id: 6, label: 'Threshold' },
  { id: 7, label: 'Activate' },
  
  // NEW (6 steps):
  { id: 1, label: 'Target' },
  { id: 2, label: 'Profile' },
  { id: 3, label: 'Owner' },
  { id: 4, label: 'Location' },      // Was step 5
  { id: 5, label: 'Threshold' },     // Was step 6
  { id: 6, label: 'Activate' },      // Was step 7
  ```

- Line 296-305 (renderPage switch): Remove `case 4: return <BuyBoxPage4 ... />`

- Lines 36-77 (buildFilters): Remove distress-related filters
  ```javascript
  // DELETE:
  if (form.signals?.length) out.push({...})
  if (form.logic) out.push({...})
  if (form.distress_floor) out.push({...})
  ```

- Lines 88-100 (buildSummary): Remove distress summary line

- Lines 279-287 (clearFilter): Remove distress clearing
  ```javascript
  // DELETE:
  case 'signals': setForm({...form, signals: []})
  case 'logic': setForm({...form, logic: 'OR'})
  case 'distress_floor': setForm({...form, distress_floor: ''})
  ```

- Line 171-177 (filterKey): Remove distress_floor and signals from the cache key if present

**Form state updates (lib/wizardFormState.js):**

- EMPTY_FORM: Remove `signals: []`, `logic: 'OR'`, `distress_floor: ''`
- toNativeForm: Remove mapping for signals, logic, distress_floor
- nativeToPayload: Remove mapping for signals, logic, distress_floor

**Owner page (BuyBoxPage3.jsx) toggle rewiring:**

- Lines 312-321: Currently, tax-delinquent and active-foreclosure toggles sync with `form.signals` array via `toggleSignal()`.
- After Distress cut: These toggles must become plain owner flags.
  ```javascript
  // OLD:
  const taxDelinquent = signals.includes('tax-delinquent')
  const toggleSignal = (sig) => { /* rewire signals array */ }
  
  // NEW:
  const taxDelinquent = owner.tax_delinquent
  const toggleTaxDelinquent = () => setOwner('tax_delinquent', !owner.tax_delinquent)
  ```
- Page description (line 332): Update from "adds to distress signals" to "owner flag for tax status"

---

## 4. FINAL 6-STEP WIZARD ORDER

After all cuts, the wizard presents these steps in order:

| Step | Name | Purpose |
|------|------|---------|
| 1 | Target | Select primary asset class, sub-assets (max 3 non-land), and geography (states / counties / metros). |
| 2 | Profile | Configure physical property specs (size, acreage, year built, building class, class-specific fields). |
| 3 | Owner | Set owner entity type, hold period, and owner flags (out-of-state, absentee, tax-delinquent, active-foreclosure). |
| 4 | Location | Select location & risk: utilities, flood/wetland status, opportunity zone, TIF, class-specific constraints (AADT, road frontage, etc.). |
| 5 | Threshold | Choose match threshold: 70% (volume), 80% (balanced), or 90% (precision). |
| 6 | Activate | Name the buy box, review all filters, set delivery cadence (Daily / Weekly / Real-time), and activate. |

---

## 5. NEW FEATURE: PER-DAY MONDAY-SUNDAY SCHEDULE EDITOR [BUILD]

**Status:** Does not exist in source. Must be implemented.

### 5.1 Requirement

Currently, the wizard offers three preset cadences (Daily / Weekly / Real-time) which expand into `run_schedule.days` as 7 / 1 / 0 days respectively. The backend accepts a 7-element boolean array: `run_schedule.days = [Mon, Tue, Wed, Thu, Fri, Sat, Sun]`.

The new build must allow users to toggle any subset of the 7 days, unlocking custom cadences (e.g., Mon/Wed/Fri, weekdays only, etc.).

### 5.2 Location & UX

**Primary location:** BuyBoxPage7.jsx, Activate step, below the 3-preset cadence cards.

```
[Card] Daily      [Card] Weekly      [Card] Real-time

---or, optionally---

[Schedule grid below cadence cards]
Mon [ ] Tue [ ] Wed [ ] Thu [ ] Fri [ ] Sat [ ] Sun [ ]
```

**Quick-edit location:** Management page card actions. Add a "Schedule" button or menu item (Gear/Sliders icon) that opens a minimal modal with just the 7-day toggle grid, patches only `run_schedule.days`, and closes.

### 5.3 Data Contract

- Input: `form.delivery.days = [bool, bool, bool, bool, bool, bool, bool]` (Mon..Sun)
- Output on PATCH/POST: `run_schedule.days` sent to backend as-is
- Cadence presets map to days:
  - Daily → all 7 true
  - Weekly → only first truthy day (e.g., [true, false, ..., false])
  - Real-time → empty array or no days constraint

### 5.4 Styling

- Grid or flex layout, 7 equal-width toggle buttons
- Labels: M / T / W / T / F / S / S (reuse DAY_LABEL from BuyBoxesView.jsx)
- Active state: `.is-on` or equivalent (inherit from existing preset-chip style)
- No external library required; use native `<button>` with onClick handlers

### 5.5 Behavior

1. User selects a cadence preset → days array is auto-populated (7 / 1 / 0).
2. User manually toggles any day → overrides the preset; preview updates in real-time.
3. On Activate: reads `form.delivery.days[]` and POSTs to backend.
4. On edit load: `toNativeForm()` reads `run_schedule.days` and populates `form.delivery.days`.
5. On management card quick-edit: only `run_schedule.days` is sent in PATCH; other fields unchanged.

---

## 6. THREE LOCKED DECISIONS

These are binding constraints for the rebuild:

### Decision 1: Source Verbatim; Curation via Docs

The source code at `/Users/birwin/nightdrop-dashboard/src` is NOT edited. All cuts and changes are expressed in specifications and documentation only. This document is the authoritative contract; the team rebuilds from this spec, not from trimmed source code.

**Rationale:** Separation of concerns. Source remains historical record; new team builds fresh in new platform without cargo-culting legacy code paths.

### Decision 2: Owner Flags, Not Distress Scoring

Tax-delinquent and active-foreclosure toggles remain as plain owner metadata fields (`owner.tax_delinquent`, `owner.active_foreclosure`). They are NOT wired into a distress-signal array or scored into a distress-floor threshold. If the new platform later adds distress scoring as a separate feature, these flags can feed that independently.

**Rationale:** Decouples ownership profile from distress evaluation. Simpler mental model; extensible architecture.

### Decision 3: Per-Day Schedule is In-Scope [BUILD]

The Monday-Sunday editable schedule picker is a mandatory new feature in the Activate step and a quick-edit affordance on management cards. This is not optional, deferred, or "nice-to-have." It is load-bearing for the cadence flexibility the new platform will expose to users.

**Rationale:** Current Nightdrop wizard hides this capability behind preset cadences. The new platform unlocks granular scheduling as a selling point. The feature must be baked into the initial build.

---

## 7. FILE STRUCTURE & DEPENDENCIES

### Components (all under `src/components/`)

```
BuyBoxWizard.jsx              [PORT] Wizard shell, form state, preview, steps routing
├─ BuyBoxPage1.jsx             [PORT] Target step
├─ BuyBoxPage23.jsx            [PORT] Profile & Owner steps (remove Financial section)
│  ├─ BuyBoxPage2             [PORT] Physical fields (update grid to 1-col)
│  └─ BuyBoxPage3             [PORT] Owner fields (rewrite toggles as plain flags)
├─ BuyBoxPage5.jsx             [PORT] Location step
├─ BuyBoxPage6.jsx             [PORT] Threshold step
├─ BuyBoxPage7.jsx             [PORT] Activate step
│  └─ [NEW] ScheduleGrid component or inline toggle UI for per-day picker [BUILD]
├─ BuyBoxRightRail.jsx         [PORT] Live pool, stats (remove equity stat)
├─ BuyBoxActivatedDialog.jsx   [PORT] Success modal
├─ buyBoxInputs.jsx            [PORT] Reusable NumberField, RangeInputs, SingleInput
└─ buybox-icons.jsx            [PORT] Icon symbol library (Ic)

BuyBoxesView.jsx              [PORT] Management page (Kanban)
├─ CardMenu                    [PORT] Dropdown actions per card
├─ BuyBoxCard                  [PORT] Card render + sparkline + week strip
├─ Column                      [PORT] Kanban lane
└─ WeekStrip                   [PORT] Read-only day indicator (reuse in schedule modal)

LeftPanel.jsx                  [PORT] Metric boxes (KPIs sidebar)

BuyerSearchComingSoonModal.jsx [PORT] Stub modal for "New buyer search" button
```

### Libraries (under `src/lib/`)

```
buyBoxTaxonomy.js      [PORT] 10-class taxonomy, LAND_SUB_ASSETS, US_STATES, MAJOR_METROS
buyBoxFieldSchema.js   [PORT] Per-class conditional fields
wizardFormState.js     [PORT] EMPTY_FORM, toNativeForm, nativeToPayload (update after cuts)
api.js                 [PORT] HTTP client
```

### Styles (under `src/styles/`)

```
buy-box-wizard.css          [PORT] Wizard container, layout
buy-box-wizard-pages.css    [PORT] Page-specific components
buyBoxes.css                [PORT] Kanban, card, week strip
buyBoxActivated.css         [PORT] Success dialog
tokens.css                  [PORT] Design tokens (--green, --warning, --danger, font-family)
```

### API Contracts (backend expectations)

| Endpoint | Method | Purpose | Response | Notes |
|----------|--------|---------|----------|-------|
| `/api/dealfeed/buy-boxes` | GET | Fetch all buy boxes for subscriber | `{buy_boxes: BuyBox[]}` | Management page |
| `/api/dealfeed/buy-boxes/:id` | PATCH | Update buy box (status, config, schedule) | `{id, ...updated fields}` | Card actions, wizard save |
| `/api/dealfeed/buy-boxes` | POST | Create new buy box | `{id, ...created fields}` | Wizard activation |
| `/api/dealfeed/buy-boxes/preview` | POST | Preview match pool size | `{estimated_count: number}` | Wizard right-rail |
| `/api/dealfeed/deals/dashboard/kpis` | GET | Fetch KPI metrics | `{new_this_week, hot_deals, response_rate, awaiting_response}` | Metric boxes |
| `/api/dealfeed/geo/counties` | GET | Fetch counties by state | `{counties: {stateCode: [names]}}` | Page1 county combo |

---

## 8. FIELD MAPPING & VALIDATION

### Buy-Box PATCHABLE_FIELDS (91 total in backend)

The backend accepts up to 91 fields on `PATCH`. The wizard wires ~30 of the new MVP fields + legacy fields. See `notes/audit/CROSS-REPO-AUDIT-BUY-BOX-MVP-2026-05-20.md` for the full audit (canonical source).

**Key subset wired by wizard:**
- `name` (string)
- `asset_class` (string, singular)
- `sub_asset_types` (array, max 3 non-land; unlimited land)
- `geo_states`, `geo_counties`, `geo_metros` (arrays; no geo_zips after cut)
- `phys.*` (building_classes, sf_min/max, acres_min/max, year_min/max, stories, units, beds, baths, etc.)
- `owner.*` (entity, hold_min/max, out_of_state, absentee, tax_delinquent, active_foreclosure)
- `utilities_*`, `floodplain_exclude`, `wetlands_exclude`, `opportunity_zone`, `tif` (location)
- `threshold` (70 / 80 / 90)
- `delivery.cadence` (daily / weekly / realtime)
- `run_schedule.days` (7-element boolean array) [NEW mapping after [BUILD]]

**NOT wired by wizard (silently dropped on create):**
- financial.* (assessed_value, equity_presets, price_per_unit, improvement_to_land, dev_potential) - ALL REMOVED AFTER CUT
- distress signals, logic, distress_floor - ALL REMOVED AFTER CUT
- class-specific advanced fields (~60 of the 91 remain unwired)

---

## 9. DOMAIN SPECIFICS vs STRUCTURAL PATTERNS

### CRE Domain-Specific (Replace with Your Domain's Equivalent)

- **Asset classes:** 10 CRE property types (self-storage, multifamily, etc.). Replace with your domain's asset taxonomy.
- **Geographic granularity:** States, counties, metros. Replace with your region/territory model.
- **Geo counts:** STATE_COUNTS array. Replace with your population/market-size metrics.
- **Owner entity types:** Individual, LLC, Trust, Corporate. Replace with your domain's entity model.
- **Risk filters:** Floodplain, wetlands, opportunity zone, TIF. Replace with your risk taxonomy.
- **Delivery cadences:** Daily, Weekly, Real-time. Replace with your notification/batch frequency model.
- **Match pool:** "Properties matching your criteria." Replace with "Items/records matching your search."

### Structural Patterns (Reusable Across Domains)

- **Kanban status lanes:** Generic DnD-driven workflow engine. Reusable for any multi-stage process.
- **Guided wizard:** Step-based form builder with live preview. Reusable for any complex configuration.
- **Live preview pool:** Real-time result count with delta pulse. Reusable for any search/filter interface.
- **Right-rail live stats:** Side panel with derived metrics. Reusable for any analytics-heavy UX.
- **Combobox + grid layout:** Multi-select geography pattern. Reusable for any hierarchical picker.
- **Per-day schedule toggle:** Generic 7-button scheduler. Reusable for any recurring task.

---

## 10. KNOWN ISSUES & MIGRATION NOTES

### Migration 049 (Backend DB)

Backend migration `049_df_buy_boxes_mvp_filters.sql` adds 35 new columns to support the MVP filter fields (lot_sf, building_classes, utilities, road frontage, AADT, LIHTC, etc.). As of 2026-05-20, the SQL had not yet been applied to the production DB. Until applied, any new field in a PATCH returns HTTP 500 "column does not exist."

**Action:** Verify migration 049 is applied before shipping the rebuilt configurator.

### Wizard Create Path Reconciliation

The current `POST /api/dealfeed/onboarding` (wizard create endpoint) only accepts ~50 fields and silently drops the new MVP fields. The `PATCH /api/dealfeed/buy-boxes/:id` accepts all 91 fields correctly.

**Action:** Before the rebuild, ensure the create endpoint is reconciled with the edit endpoint to accept all MVP fields. Otherwise, new buy boxes cannot persist new filter criteria.

### 5-County Coverage MVP

The Parcyl DB currently covers only 5 counties (Travis, Bastrop, Hays, Williamson, Caldwell in Texas). The wizard exposes 51 states with mock STATE_COUNTS, which is misleading. Before external launch, either constrain the picker to covered regions or add clear labeling ("Data available in: [list]").

**Action:** Relabel or gate the geography picker before user-facing release.

---

## 11. TESTING CHECKLIST

| Category | Scenario | Acceptance Criteria |
|----------|----------|---------------------|
| Management - Drag | Drag card from Pending to Active | Card moves, PATCH sent, status updates, toast fires |
| Management - Drag rejection | Drag card into Coverage gap lane | Card bounces back; no PATCH sent |
| Management - Pause | Click Pause on Active card | Modal confirms; on confirm, status = paused, card moves to Paused lane |
| Management - Resume | Click Resume on Paused card | Status = active, card moves to Active lane, toast fires |
| Management - Metrics | Click "New This Week" tile | Dashboard feed filters to `new_this_week=true` |
| Wizard - Step 1 | Select asset class + geography | canGoNext becomes true; preview updates; step 2 unlocks |
| Wizard - Step 2 | Enter physical specs (size, year) | Form updates; no crash on out-of-range values |
| Wizard - Step 2 (no ZIP) | Verify ZIP input is removed | No ZIP section rendered; no ZIP in buildFilters() |
| Wizard - Step 3 | Toggle tax-delinquent flag | Flag persists in owner profile; does NOT add to signals array |
| Wizard - Step 4 | Select AADT range (commercial) | Heat-gradient slider renders; value persists |
| Wizard - Step 5 | Select 80% threshold | Estimated count updates (preview call debounced 400ms) |
| Wizard - Step 6 (no Financial) | Verify Financial section removed | Step 2 grid is 1-col; equity stat removed from right-rail |
| Wizard - Step 6 (schedule [BUILD]) | Toggle Mon/Wed/Fri | `form.delivery.days = [true, false, true, false, true, false, false]` |
| Wizard - Activate | Click "Activate buy box" button | POST sent with all form state; success dialog shows; "Build another" resets wizard |
| Management - Schedule quick-edit [BUILD] | Click schedule icon on card | Modal opens with 7-day grid; toggling saves PATCH with only `run_schedule.days` |
| Right-rail - Clock | Observe HH:MM:SS tick | Clock updates every 1s; does not drift over time |
| Right-rail - Stat trio [BUILD] | Verify only 2 cells (hold + occupancy) | Equity cell is removed; no crash on missing equity data |

---

## 12. HANDOFF CHECKLIST

Before handing off to the new team:

- [ ] All SCOPE contents reviewed with stakeholders
- [ ] Three locked decisions acknowledged and signed off
- [ ] API contracts confirmed with backend team
- [ ] Design tokens and typography finalized
- [ ] Per-day schedule [BUILD] feature acceptance criteria documented
- [ ] Migration 049 status confirmed with backend (applied or pending)
- [ ] Create vs. edit endpoint reconciliation tracked
- [ ] Geography granularity (5 counties vs 51 states) decision made
- [ ] Test scenarios reviewed and assigned to QA team

---

## Appendix: Historical Roadmap Reference

The unstarted `buy-box-mvp-rebuild/` BMAD folder (planned) will detail the step-by-step implementation of this specification. Until that folder is active, this SCOPE document is the authoritative build contract.

See also:
- `notes/audit/CROSS-REPO-AUDIT-BUY-BOX-MVP-2026-05-20.md` - detailed field inventory and taxonomy audit
- `notes/REFERENCE.md` - full API endpoint list and response shapes
- `src/lib/buyBoxFieldSchema.js` - per-class field inclusion logic

---

**Document generated:** 2026-06-30  
**Source codebase:** nightdrop-dashboard @ main  
**Status:** AUTHORITATIVE SPEC FOR REBUILD
