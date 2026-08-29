# Buy Box Configurator: Stack-Agnostic Rebuild Guide

**Purpose**: This guide enables an engineering team to rebuild the Buy Box Configurator and Management surfaces in a completely different platform, business domain, and technology stack. It separates structural patterns (reusable anywhere) from CRE-domain specifics (replace with your domain), and documents exact contracts and gotchas.

**Audience**: Backend, frontend, and full-stack engineers rebuilding this feature outside of Node.js/React or outside of real estate.

**Curation scope**: This rebuild includes the management Kanban surface, the 6-step wizard (after the distress cut), the required day-by-day schedule editor, metric KPIs, and activation confirmation. The "New buyer search" button is a stub and remains a stub.

---

## Build Order

Build in this sequence. Each phase has well-defined inputs and outputs.

### Phase 1: Data Layer and API Contract (Days 1-2)

**Structural pattern**: All interactions flow through a central `BuyBoxRepository` or equivalent. Never make API calls directly from views. Implement optimistic updates with rollback.

**Outputs**:
1. Backend schema: `buy_boxes` table with 91 patchable fields (see BACKEND CONTRACT below). UUIDs for IDs. Status enum: `pending`, `validating`, `active`, `paused`, `coverage_failed`.
2. API endpoints:
   - `GET /buy-boxes` returns array of buy boxes with asset_class, asset_classes[], run_schedule.days[], geo_states[], geo_counties[], geo_zips[], last_run_at, status, label, deals (count), deliveredThisWeek, deliveredSpark (weekly spike data as array of 7 numbers).
   - `PATCH /buy-boxes/:id` accepts status, run_schedule.days, and up to 91 filter fields atomically.
   - `POST /buy-boxes/preview` accepts a partial buy box form and returns { estimated_count }.
   - `POST /buy-boxes` for create (accepts all 91 fields, unlike the source which only accepts ~50).
3. Repository wrapper: Implement `getBuyBoxes()`, `patchBuyBox(id, patch)`, `createBuyBox(form)`, `getPreview(form)`. All PATCH/POST ops are optimistic: update local state immediately, roll back on error, emit user-visible error toast.
4. Domain schema registry: A registry or factory that maps domain asset classes, subtypes, geo options, and flags. (See "Plugging In a Different Domain" below.)

**Why first**: Without this, you cannot wire UI state to backend truth. Everything builds on top of this contract.

### Phase 2: Management Surface (Days 3-5)

**Outputs**:
1. Kanban view with 5 lanes: Pending, Validating, Active, Paused, Coverage Gap.
2. Drag-and-drop within lanes (excluding Coverage Gap, which rejects drops).
3. Buy box cards with: label, status indicator, delivered count, week-on-week delta, sparkline, primary asset class chip, geo chip, last run timestamp, read-only 7-day week strip (Mon-Sun boolean indicators), and action buttons.
4. Card actions: Pause (active only), Resume (paused only), Configure (pending/validating), Edit Geo (gap only), Delete (dropdown).
5. Page header: title, active count + attention count (gap + paused), "New buyer search" button (stub, fires `BuyerSearchComingSoonModal`), "New buy box" button (navigates to wizard create).
6. Left sidebar metric boxes (LeftPanel): New This Week, Hot Deals, Response Rate (display-only), Awaiting (display-only). First two are feed filters; all four fed by `GET /dealfeed/deals/dashboard/kpis`.

**Structural patterns to preserve**:
- Lane grouping via `deriveColumn(box)` switch: status field + last_run_at presence determines lane. Not a direct status field; infer it.
- Drag-drop via native HTML5 dataTransfer (no library). dataTransfer.setData('boxId', id) on drag, getData('boxId') on drop.
- Optimistic patch on drop; don't wait for server. If drop is invalid (gap lane), preventDefault and return early.
- Card fields derive from a formatter: `formatGeo()`, `formatAsset()`, `formatLastRun()`. These are not just displays; they control what the card renders. If geo is missing, render a placeholder. If asset is missing, render a fallback.
- WeekStrip is READ-ONLY at this phase (you will extend it in Phase 4).
- Status dots and lane colors are semantic, tied to status enum. No hardcoded hex; use design tokens.

**CRE specifics to replace**:
- Buy box label is a required user-provided string. Replace if your domain has different primary identifiers (e.g., "Portfolio" instead of "Buy Box").
- Asset class, geo, and delivered count are CRE-specific. Swap for your domain's primary dimension (e.g., lead source, property type, pipeline stage).
- "Delivered" count and sparkline plot weekly deal matches. Replace with your domain's key success metric (e.g., leads generated, conversion rate, cost-per-unit).
- Last run timestamp assumes nightly execution. Replace with your domain's execution cadence label (e.g., "last updated", "last matched", "last scheduled").
- Coverage gap status is specific to geospatial matching. Replace with your domain's equivalent (e.g., "data unavailable", "no audience found", "incomplete profile").

### Phase 3: Wizard, Steps 1-3 (Days 6-8)

**Outputs**:
1. Wizard shell: 6 visible steps (Distress is cut). Stepper at top shows 1..6 stages, current step highlighted, completed steps marked as done. Step timeline and labels update as user progresses.
2. Step 1 (Target): Asset class single-select (primary only, NOT multi-select). Sub-asset multi-select, max 3, optional. Geography: states (searchable combo), counties/metros (segmented tabs), metro multi-select, county multi-select. NO ZIP input. (ZIP section is [CUT].)
3. Step 2 (Profile): Physical envelope only. Building size, acreage, sub-acre lot, year built, building class A/B/C toggles, and class-specific fields (stories, units, beds, baths, lot dims, construction, foundation, roof, garage). NO financial section. (Financial is [CUT].)
4. Step 3 (Owner): Entity type (single-select chips: Any/Individual/LLC/Trust/Corporate), hold period years, out-of-state toggle, absentee toggle, tax-delinquent toggle (stored in signals array, not owner.tax_delinquent), active-foreclosure toggle (stored in signals array). These are plain owner flags, not linked to distress scoring.

**Structural patterns to preserve**:
- Form state lives in a single immutable object: `{ assets, subtypes, sub_assets, geo, phys, owner, utils, location, flags, threshold, delivery, name, ... }`. Every form change creates a new object (spread or immer).
- Each page component receives (form, setForm, nextDisabled). No parent state management per step.
- Asset class selection is SINGLE. Toggling a new class deselects the prior one. Sub-assets are MULTI (max 3 for non-land).
- Geography multi-select uses a combo widget for states, segmented tabs for counties vs metros, chips for selections with x-remove.
- Validation is per-step: step 1 requires asset + state, step 2-6 no hard requirements. canGoNext logic gates the Next button.
- Right rail live preview: matches count, delta, geographic concentration stat, active filter chips with x-remove. This is [PORT]ed from the source.

**CRE specifics to replace**:
- Asset class: 10 classes (self_storage, multifamily, ..., special_purpose). Replace with your domain's asset classes. Update the taxonomy registry and sub-asset logic.
- Building classes (A/B/C based on year_built): Replace with your domain's property grade, risk band, or equivalent.
- Subtypes (366 = Duplex, 369 = Apartment, etc.): These are USDA asset use codes. Swap for your domain's subtype taxonomy. Update the lookup table.
- Geographic hierarchy (state > county / metro > zip): Curated to state / county / metro only (ZIP is cut). Adapt to your domain's geography (e.g., region > territory, or industry > vertical).
- Hold period, out-of-state, absentee: Replace with your domain's owner profile dimensions.
- Tax delinquent and active foreclosure: These are plain Boolean flags (owner signals), not distress signals. They live in the signals array but do NOT trigger distress-score computation.

### Phase 4: Wizard, Steps 4-6 + Day-by-Day Schedule Editor (Days 9-11)

**Outputs**:
1. Step 4 (Location): Class-specific rules. Utilities (4 toggles: water, sewer, electric, gas). Risk toggles (floodplain exclude, wetlands exclude), tri-state toggles (opportunity zone, TIF district, ETJ), corner lot, assemblage potential, AADT slider (commercial only), road frontage (land only), zoning codes and future land use (land only). Indexed by asset_class so irrelevant fields hide.
2. Step 5 (Threshold): Three preset cards (70% Volume, 80% Balanced, 90% Precision). Radio select one. Display estimated deal count range per card.
3. Step 6 (Activate): Buy box name input, filters review summary (with edit link back to step 1), **EDITABLE DAY-BY-DAY SCHEDULE EDITOR** (NEW [BUILD]), delivery cadence display (derived from schedule, not a form field), and Activate button.
4. Day-by-day schedule editor [BUILD]: A grid of 7 toggle buttons (Mon-Sun). User selects any subset. Saves to `run_schedule.days` array (7 booleans). This replaces the cadence tri-state (daily/weekly/realtime) which is now derived read-only from the days array. (Daily = 7 days selected, Weekly = 1 day selected, Real-time = 0 days, Custom = any other subset.)

**Structural patterns to preserve**:
- Step 4 and 5 are largely display-driven. No complex interactions. Validations are value ranges.
- Threshold is a radio group backed by a form.threshold string ('volume' | 'balanced' | 'precision'). Pre-compute and cache estimated counts per threshold on mount.
- Activation flow: On Activate button, POST payload to backend, disable button, show loading spinner. On success, fire activation success dialog. On error, show error toast, re-enable button, do NOT advance.
- Schedule editor [BUILD] is a new component. It must:
  - Accept form.delivery.days (array of 7 booleans, index 0 = Monday).
  - Render 7 buttons labeled M/T/W/T/F/S/S, with visual state for active.
  - Support click to toggle. Click day N flips days[N].
  - Auto-derive cadence label for display (not a form field): if days.length === 7, show "Daily"; if days.length === 1, show "Weekly ({day})"; if days.length === 0, show "Real-time"; else show "Custom ({n} days)".
  - Be reusable on management cards (read-only or editable mode).

**CRE specifics to replace**:
- Utilities (water, sewer, electric, gas): Replace with your domain's infrastructure or constraint toggles.
- AADT (Annual Average Daily Traffic): This is a slider for commercial properties. Replace with your domain's equivalent metric (e.g., footfall, click volume, CTR).
- Class-specific rules: Land has zoning/ETJ/future land use; retail has corner lot; MF has renter pct/LIHTC flag; industrial/SS have foreclosure flags. Map these to your domain's asset-class-conditional fields.
- Opportunity zone, TIF, floodplain, wetlands: These are location-based regulatory flags. Replace with your domain's equivalent constraints.
- Distress signals and AND/OR logic: [CUT] entirely. Owner flags (tax delinquent, active foreclosure) remain as plain Booleans but no scoring.

### Phase 5: Activation Dialog and Edit Workflow (Days 12-13)

**Outputs**:
1. Activation success dialog [PORT]: Portal overlay, "Buy box activated / You're hunting" title, buy box name, 3-cell stat grid (Match pool / First drop / Cadence), two buttons: "Return to dashboard" and "Build another" (resets wizard).
2. Edit workflow: Navigating to `/buy-boxes/:id/edit` populates the wizard with the buy box's current state (toNativeForm). All steps are editable. On save, PATCH the buy box, show success toast, navigate back to management.
3. Management card quick-edit: Pause/Resume via PATCH status. Edit Geo button on gap cards (step 1 only, other steps skipped). Configure button on pending/validating cards (full wizard).

**Structural patterns to preserve**:
- Edit mode and create mode use the same wizard component, same form state, same validation. The only difference is the initial form data and the final API call (POST vs PATCH).
- toNativeForm() and nativeToPayload() are bidirectional converters. They live in a centralized form state module.
- Activation dialog is a portal, separate from the wizard. It receives activation metadata (match count, first drop info, cadence) and two callbacks (onClose, onBuildAnother).
- Edit Geo shortcut skips steps 2-5 and opens the wizard at step 1. This is a URL param or flag (`?skipTo=1`).

**CRE specifics to replace**:
- Match pool, first drop, cadence: These are deal-engine-specific outputs. Replace with your domain's equivalent activation summary stats (e.g., audience size, CTR, update frequency).

### Phase 6: Integration and Handoff (Days 14)

**Outputs**:
1. Routing: Create links and route handlers for `/buy-boxes/new` (create wizard) and `/buy-boxes/:id/edit` (edit wizard). Wizard is a modal or full page depending on your app's navigation style.
2. API error handling: All PATCH/POST errors must surface via user-facing toast, never silent fail. Optimistic updates must roll back on error.
3. Data sync: Buy box changes on the management page reflect in real-time (via polling or subscriptions). No stale card data.
4. Orphaned code removal: If you ported from this source, remove BuyBoxPage4 (Distress), BuyBoxConfigurator directory, BuyBoxEditModal, wizardHelpers.

---

## Structural Patterns (Reusable in Any Domain)

These patterns are domain-agnostic and MUST be preserved in your rebuild.

### 1. Kanban Status as Lane (Not a Field)

**Pattern**: Status is inferred from multiple signals, not stored directly.

```
deriveColumn(box) {
  if box.status === 'coverage_failed' -> lane 'gap'
  else if box.status === 'paused' -> lane 'paused'
  else if box.status === 'active' AND !box.last_run_at -> lane 'validating'
  else if box.status === 'active' AND box.last_run_at -> lane 'active'
  else -> lane 'pending'
}
```

**Why**: Status is coarse (active/paused/pending). Lanes are semantic and derive from status plus runtime signals. Dragging to a lane patches status, not lane. This decouples UI state from data state.

**Rebuild**: Your domain's statuses and signals will differ. Map them via deriveColumn. Do not create a "lane" field in your database.

### 2. Schema-Driven Fields per Asset Class

**Pattern**: Each asset class has a set of allowed fields (classSchema). Fields not in the schema are hidden.

```
classSchema('multifamily') -> {sf_min, sf_max, units_min, units_max, stories, beds, baths, ...}
classSchema('land') -> {acres_min, acres_max, lot_width, future_land_use_codes, ...}
classSchema('retail') -> {sf_min, sf_max, corner_lot, ...}
```

**Why**: Multifamily cares about unit count and bed/bath; land cares about acreage; retail cares about corner lot. Rendering all fields for all classes is confusing and wastes space. Schema-driven rendering hides irrelevant fields.

**Rebuild**: Build a classSchema registry for your domain. Index by asset class. Use it in every form step to conditionally render fields.

### 3. Single Primary Asset Class + Up to 3 Sub-Asset Chips

**Pattern**: User selects one primary asset class (e.g., Multifamily). Within that class, user can select 0 to 3 subtypes (e.g., Duplex, Triplex, Apartment). Sub-assets are optional.

```
form.assets = ['multifamily'] (single-element array)
form.sub_assets = ['duplex', 'triplex'] (up to 3)
form.subtypes = [366, 369] (USDA use codes)
```

**Why**: Single primary class keeps data model simple and UI unambiguous. Sub-assets let users narrow within a class without creating complexity.

**Rebuild**: If your domain supports multi-select asset classes, adapt this. If your domain has a hierarchy (e.g., Category > Subcategory > SubSubcategory), extend the schema to match your hierarchy depth.

### 4. Per-Step Validation (No Submit Validation)

**Pattern**: Each wizard step has validation logic. canGoNext(step, form) returns Boolean. If false, Next button is disabled. User cannot advance until step is complete.

```
canGoNext(1, form) -> form.assets.length > 0 && form.geo.states.length > 0
canGoNext(2, form) -> true (no required fields)
canGoNext(6, form) -> form.name.trim().length > 0
```

**Why**: Step validation is explicit and per-step. No surprises on submit. User knows immediately what's missing.

**Rebuild**: For each step, define canGoNext. Keep it simple. Return true if step is optional.

### 5. Debounced Live Preview Right Rail

**Pattern**: Right rail shows live match pool (count + delta), geographic concentration, and active filter chips. As user types, preview is debounced 400ms. Network errors don't break the flow.

```
onFormChange -> debounce(400) -> POST /buy-boxes/preview -> setMatchCount
```

**Why**: User gets immediate feedback on filter choices without network round-trips on every keystroke. Debouncing prevents request spam.

**Rebuild**: Implement debounce in your preview hook. Treat preview errors as non-fatal; show a spinner or last-known-good count, never an error message.

### 6. Create and Edit Symmetry

**Pattern**: Create and edit use the same wizard, form, and validation. Routing and initial data differ; everything else is identical.

```
/buy-boxes/new -> wizard with EMPTY_FORM
/buy-boxes/:id/edit -> wizard with toNativeForm(box)
```

**Why**: Single code path, no drift between create and edit flows.

**Rebuild**: Ensure your form state module exports toNativeForm() and nativeToPayload(). Edit retrieves the box, calls toNativeForm, populates the wizard. Create starts with EMPTY_FORM.

### 7. Optimistic Update with Rollback

**Pattern**: On user action (e.g., drag card to lane), update local state immediately. Fire PATCH request. If error, roll back local state and show error toast.

```
dragCard(card, newLane) {
  const oldStatus = card.status
  setCards(cards.map(c => c.id === card.id ? {...c, status: newStatus(newLane)} : c))
  patchBuyBox(card.id, {status: newStatus(newLane)})
    .catch(err => {
      setCards(cards.map(c => c.id === card.id ? {...c, status: oldStatus} : c))
      showErrorToast(err.message)
    })
}
```

**Why**: Perceived performance is faster. Network latency doesn't block the UI. Errors are recoverable.

**Rebuild**: Use this pattern for all state mutations. Never wait for the server to confirm before updating UI.

### 8. Activation Dialog as Modal with Actions

**Pattern**: On successful buy box creation, show a modal with activation metadata and two actions: close (return to management) and create another (reset wizard). Modal is a portal, outside the wizard hierarchy.

**Why**: User sees confirmation and has a clear next action (create another or go back).

**Rebuild**: Implement the dialog as a sibling to the wizard, not a child. Pass callbacks for both actions.

---

## Plugging In a Different Domain Schema

This section guides you through swapping CRE domain specifics for your domain.

### Step 1: Asset Class Taxonomy

**CRE example**:
```javascript
ASSET_CLASSES = [
  { id: 'multifamily', label: 'Multifamily', subtypes: [...] },
  { id: 'industrial', label: 'Industrial', subtypes: [...] },
  { id: 'land', label: 'Land', subtypes: [...] },
  ...
]
```

**Your domain example (SaaS verticals)**:
```javascript
ASSET_CLASSES = [
  { id: 'saas_marketplace', label: 'Marketplace (SaaS)', subtypes: [...] },
  { id: 'saas_fintech', label: 'Fintech (SaaS)', subtypes: [...] },
  ...
]
```

**Rebuild**:
1. List your domain's top-level asset classes (e.g., real estate sectors, SaaS verticals, e-commerce categories).
2. Create a taxonomy registry with id, label, and subtypes array. Subtypes should have label and code (or id).
3. Update classSchema() to map asset classes to allowed fields.
4. Update field validators and defaults per class.

### Step 2: Subtype Taxonomy

**CRE example**: Multifamily subtypes are 366 (Duplex), 369 (Apartment), etc. (USDA asset use codes).

**Your domain example**: SaaS fintech subtypes could be loan_origination, payment_processing, investment_advisor, etc.

**Rebuild**:
1. Define subtype codes (numeric IDs or slugs).
2. Map subtype to allowed parent asset classes.
3. Update the classSchema lookup to include subtypes.

### Step 3: Geographic Hierarchy

**CRE example**: State -> County / Metro -> ZIP (ZIP is [CUT], so State -> County / Metro).

**Your domain example**:
- Global SaaS: Region -> Country -> City
- Local service: Region -> Territory -> Branch
- E-commerce: Zone -> District -> Store

**Rebuild**:
1. Identify your domain's geographic or market hierarchy.
2. Update the geography form step to match. Swap states for your top level, counties for your second level, metros for your third.
3. Update formatGeo() and the geo chip to display your hierarchy.

### Step 4: Class-Specific Fields

**CRE example**:
- Multifamily: units, beds, baths, renter%, LIHTC flag
- Land: acreage, lot dims, zoning codes, future land use
- Retail: corner lot

**Your domain example (SaaS fintech)**:
- Loan origination: origination volume, approval rate, default rate, avg loan size
- Payment processing: transaction volume, avg transaction size, chargeback rate, settlement delay

**Rebuild**:
1. For each asset class, list domain-specific fields.
2. Add those fields to EMPTY_FORM and the form state module.
3. Build classSchema() to conditionally expose them.
4. Update field validators per class.

### Step 5: Metric and KPI Registry

**CRE example**: Delivered (deal count), Weekly Delta, Response Rate, Awaiting

**Your domain example (SaaS): Monthly Recurring Revenue (MRR), Churn Rate, Customer Acquisition Cost, Runway

**Rebuild**:
1. Define your domain's top metrics.
2. Update the metric KPI endpoint to return your metrics.
3. Update the LeftPanel MetricTile component to accept metric name and formatter.
4. Replace icons and colors to match your domain.

### Step 6: Status and Lane Definitions

**CRE example**:
- pending: Awaiting first run
- validating: Coverage check in progress
- active: Running nightly
- paused: Manually paused
- coverage_failed: No parcel data for this geo

**Your domain example (SaaS pipeline)**:
- draft: Not yet activated
- validating: Checking audience / data availability
- live: Actively running
- paused: Manually stopped
- insufficient_data: No matching records in database

**Rebuild**:
1. Map your domain's statuses to the 5-lane model (or add/remove lanes as needed).
2. Update deriveColumn() to map your statuses to lanes.
3. Update lane titles and subtitles.
4. Update lane styling (colors, icons).

---

## The Day-by-Day Schedule Editor [BUILD]

This is a new component that does NOT exist in the source today. It replaces the old cadence tri-state (Daily / Weekly / Real-time).

### Requirement

Users must be able to select any subset of 7 days (Mon-Sun) on which to run the buy box. The wizard step 6 (Activate) must expose this picker. Management cards must show the selected days and allow quick edit.

### Data Model

```javascript
run_schedule = {
  days: [true, false, true, false, true, false, false] // Mon=true, Tue=false, ..., Sun=false
}
```

The `days` array has exactly 7 elements, index 0 = Monday, index 6 = Sunday. Each element is Boolean.

### Display and Derivation

Cadence is derived (read-only) from days:
- days.filter(d => d).length === 7 -> "Runs daily"
- days.filter(d => d).length === 1 -> "Runs {dayName}" (e.g., "Runs Monday")
- days.filter(d => d).length === 0 -> "Runs real-time" (or "No schedule")
- else -> "Runs {n} days/week"

**Do NOT** store cadence as a form field. Always derive it from days.

### Component Spec: ScheduleEditor

```typescript
interface ScheduleEditorProps {
  days: boolean[]  // 7-element array
  onChange: (days: boolean[]) => void
  readOnly?: boolean
  compact?: boolean  // compact mode for card display
}

export function ScheduleEditor({days, onChange, readOnly = false, compact = false}) {
  // Render 7 buttons M/T/W/T/F/S/S
  // On click day i, call onChange([...days.slice(0, i), !days[i], ...days.slice(i + 1)])
  // If readOnly, buttons are unclickable, just display
  // If compact, smaller size for card display
}
```

### Integration Points

1. **Wizard step 6 (Activate)**: Render ScheduleEditor in editable mode. Bind to form.delivery.days. Display derived cadence label below.
2. **Management card**: Render WeekStrip (existing component, 7-day strip). On hover, show an "Edit schedule" link that opens a quick-edit modal. Modal has ScheduleEditor in editable mode and a Save button.
3. **Right rail preview**: After financial cut, the stat trio drops to 2 cells (hold period / occupancy). Keep the cadence derivation visible somewhere (e.g., a small label "Cadence: {derived}").

### Gotchas

- Days array must always be exactly 7 elements. Never shorten or extend.
- Empty days array ([false, false, false, false, false, false, false]) means "real-time" or "no schedule"; do NOT treat it as an error.
- When displaying on card (WeekStrip), dim all 7 days if the buy box is paused or in gap lane. The days are read-only, but the visual indicates "not currently running".
- On quick-edit save (management card), fire a PATCH /buy-boxes/:id with {run_schedule: {days: [...]}}. Use optimistic update.

---

## Landmines and Gotchas (From Post-Mortem)

These are real bugs and pitfalls from the source. Avoid them.

### Landmine A: Create vs Edit Field Drift

**Issue**: The wizard's create path (`POST /onboarding`) accepts ~50 fields. The edit path (`PATCH /buy-boxes/:id`) accepts all 91 fields. New fields added to the schema are silently dropped on create, but saved on edit. User creates a box with advanced filters, refreshes the page, and sees different filter state because half were silently dropped.

**Fix in rebuild**:
- Ensure create and edit use the SAME backend endpoint. Do not have two create paths.
- Test that every field in the form state can round-trip: create -> retrieve -> edit -> create again.
- If create has fewer fields than edit (e.g., frontend-only limitations), document this clearly in form state module.

### Landmine B: Silently Dropped Fields

**Issue**: The wizard posts to `/onboarding` for create. That handler inserts only ~50 fields. The other ~35 fields (lot_sf, has_pool, AADT, opportunity_zone, etc.) are silently dropped. User thinks they've set "has pool", but the buy box doesn't filter for pools because the field was never saved.

**Fix in rebuild**:
- On form state module, export PATCHABLE_FIELDS constant: the complete list of backend-accepted fields. All of them.
- In nativeToPayload(), explicitly mention which fields are sent to the backend. Comment any fields that are intentionally excluded.
- Write tests: for each form field, verify that it round-trips (create -> GET -> matches original).
- If a field is intentionally not sent on create (e.g., deprecated or backend-only), add a comment explaining why.

### Landmine C: UI Exposes Options the Backend Cannot Honor

**Issue**: The wizard exposes 51 states for ZIP filtering. The database only covers 5 counties in Texas. User selects California, the preview estimates 0 matches, user is confused. Or: user tries to select BOTH counties AND zips, but the backend's geo matcher has priority rules (county REPLACES zip, not AND). User expects county + zip filtering; backend only runs county.

**Fix in rebuild**:
- Validate available options at the backend level. On mount, fetch the scope of available data (e.g., "we cover these 5 states").
- If scope is limited, either:
  a. Restrict the UI to only show available options, or
  b. Show all options but clearly label unavailable ones (gray out, tooltip, banner).
- Document geo priority rules (if applicable): "Selecting counties overrides zip filtering. Only the highest-priority geo mode is active."
- Test: for each class and geo combo, verify that preview count is non-zero (or 0 if expected).

### Landmine D: Read-Only Schedule Confusion

**Issue**: In the source, WeekStrip is completely read-only. User sees Mon/Tue/Wed highlighted on a card and thinks they can click to edit. Or: user edits the schedule in the wizard but the card's WeekStrip doesn't update.

**Fix in rebuild**:
- Make it clear which controls are editable. In the wizard, the schedule picker is editable. On the card, the week strip is read-only (it's data display, not a control).
- If cards allow quick-edit of schedule, add an explicit "Edit schedule" button or link, not just the strip itself.
- On schedule save, refresh the card in the management view (via optimistic update or refetch).

### Landmine E: Activation Success Dialog Not Reached

**Issue**: User clicks Activate. The button is disabled, spinner shows. The backend takes 5 seconds. Request fails silently, spinner stops, button is re-enabled, no error message. User doesn't know if the buy box was created.

**Fix in rebuild**:
- On Activate, always show a result: success dialog or error toast. Never silent fail.
- Log the error server-side for debugging.
- If the request times out or returns 500, show a specific error message to the user and offer a retry or fallback action.

### Landmine F: Optimistic Update Without Rollback

**Issue**: User pauses a buy box. Local state updates immediately. Request fails. State remains updated locally but conflicts with server. On next refresh, the buy box is running again (server truth), confusing the user who thought they paused it.

**Fix in rebuild**:
- Always store the old state before optimistic update.
- On error, rollback to old state.
- Show error toast explaining what failed.
- Test: pause a box, kill the network, verify rollback and error toast.

### Landmine G: Migration Not Applied

**Issue**: New fields are added to the database schema via migration 049. But the migration is not run on the production database yet. Any PATCH with a new field returns HTTP 500 "column does not exist". Frontend code looks correct but fails on deployment.

**Fix in rebuild**:
- Before deploying new fields to frontend, verify the migration is already applied to production database.
- Have a pre-deployment checklist: "All required migrations applied? Y/N"
- If a migration is needed, include it in the deployment plan and run it before pushing the frontend code.

### Landmine H: Wizard Create Path Not Wired

**Issue**: The wizard builds a nativeToPayload, posts to `/onboarding`. That endpoint is supposed to handle create. But it only wires ~30 of 91 fields. Rebuild carefully; ensure every field you want to support is actually posted and inserted.

**Fix in rebuild**:
- Map form state fields to backend INSERT columns. Document this mapping.
- For each field, trace: form -> payload -> API request -> backend handler -> INSERT statement.
- Test: create a buy box with advanced filters set. Fetch it. Verify all fields are present.

---

## Definition of Done Checklist

Before shipping the rebuild, verify:

### Data Layer
- [ ] Backend has buy_boxes table with 91 patchable fields (or equivalent for your domain)
- [ ] Status enum: pending, validating, active, paused, coverage_failed (or your domain's equivalent)
- [ ] IDs are UUIDs (or your domain's ID type)
- [ ] GET /buy-boxes returns required fields: asset_class, run_schedule.days, geo_states/counties/zips, last_run_at, status, label, deals, deliveredThisWeek, deliveredSpark
- [ ] PATCH /buy-boxes/:id accepts status and all 91 fields atomically
- [ ] POST /buy-boxes/preview returns { estimated_count }
- [ ] POST /buy-boxes returns created box with all fields

### Repository / API Wrapper
- [ ] getBuyBoxes() returns array of boxes
- [ ] patchBuyBox(id, patch) optimistically updates local, rolls back on error, emits toast
- [ ] createBuyBox(form) posts payload, returns created box, navigates to management on success
- [ ] getPreview(form) debounced, returns estimated_count, handles errors gracefully
- [ ] All errors surface via user-facing toast, never silent fail

### Management Surface
- [ ] Kanban board: 5 lanes (Pending, Validating, Active, Paused, Coverage Gap)
- [ ] deriveColumn() correctly maps status + runtime signals to lanes
- [ ] Drag-drop: native HTML5, dataTransfer, no library
- [ ] Gap lane rejects drops (preventDefault, return early)
- [ ] Drop to Active/Paused/Pending patches status via optimistic update
- [ ] Cards display: label, status dot, delivered count, delta, sparkline, asset chip, geo chip, last run, week strip, action buttons
- [ ] Pause action: fires confirm modal, patches status to 'paused', shows success toast
- [ ] Resume action: patches status to 'active', shows success toast
- [ ] Configure action: navigates to /buy-boxes/new or /buy-boxes/:id/edit
- [ ] Edit Geo action: navigates to /buy-boxes/:id/edit?skipTo=1 (step 1 only)
- [ ] Delete action: dropdown menu, confirm prompt, calls backend delete, refetches list
- [ ] "New buy box" button: navigates to /buy-boxes/new
- [ ] "New buyer search" button: stubs BuyerSearchComingSoonModal (remains a stub)
- [ ] Metric KPI boxes: New This Week, Hot Deals, Response Rate, Awaiting. First two filter feed; all four fed by KPI endpoint
- [ ] Title bar shows active count + attention count (gap + paused)

### Wizard: Steps 1-3
- [ ] Step 1: Asset single-select, sub-asset multi-select max 3, geo (states combo, county/metro tabs, multi-select). ZIP [CUT].
- [ ] Step 2: Physical fields only (SF, acreage, year, building class, class-specific fields). Financial [CUT].
- [ ] Step 3: Owner entity, hold period, out-of-state, absentee, tax-delinquent, active-foreclosure (all as plain toggles, not distress signals).
- [ ] canGoNext(1, form) returns true iff form.assets.length > 0 && form.geo.states.length > 0
- [ ] canGoNext(2..5, form) returns true (no hard requirements)
- [ ] canGoNext(6, form) returns true iff form.name.trim().length > 0
- [ ] Next button disabled if canGoNext returns false
- [ ] Backward navigation works (all steps)

### Wizard: Steps 4-6
- [ ] Step 4 (Location): Utilities, risk toggles, class-specific rules (indexed by asset_class, irrelevant fields hidden)
- [ ] Step 5 (Threshold): 3 preset cards (70%, 80%, 90%), estimated count range, radio select
- [ ] Step 6 (Activate): Name input, filters review summary (editable link to step 1), **schedule editor [BUILD]**, activate button
- [ ] Stepper shows 6 steps (not 7; Distress [CUT])
- [ ] Distress page [CUT] entirely (no step 4 for distress signals, no AND/OR logic)

### Wizard: Right Rail
- [ ] Live clock with HH:MM:SS tick
- [ ] Live match pool count + delta
- [ ] Geographic concentration stat
- [ ] Active filter chips with x-remove
- [ ] Preview debounced 400ms
- [ ] Preview errors handled gracefully (spinner or last-known count, not error message)

### Schedule Editor [BUILD]
- [ ] Component ScheduleEditor(days, onChange, readOnly, compact) renders 7 toggles M-S
- [ ] Clicking day i toggles days[i] and calls onChange
- [ ] Days array always exactly 7 elements
- [ ] Cadence derived from days: 7 = daily, 1 = weekly, 0 = real-time, else = custom
- [ ] Wizard step 6 embeds ScheduleEditor editable, displays derived cadence label
- [ ] Management card embeds WeekStrip read-only, shows "Edit schedule" link that opens quick-edit modal
- [ ] Quick-edit modal has ScheduleEditor + Save button, patches /buy-boxes/:id with {run_schedule: {days: [...]}}
- [ ] WeekStrip dims if buy box is paused or in gap lane (read-only visual, not a control)
- [ ] Round-trip: create box with days = [true, false, true, ...], retrieve box, verify days array matches

### Create and Edit Symmetry
- [ ] /buy-boxes/new: wizard with EMPTY_FORM
- [ ] /buy-boxes/:id/edit: wizard with toNativeForm(box)
- [ ] Both routes use same wizard, same form state, same validation
- [ ] Edit retrieves box, deserializes to form, allows all steps to be re-edited
- [ ] On save (create or edit): nativeToPayload(form) -> POST or PATCH, show success toast, navigate to management
- [ ] On error: show error toast, stay on wizard, button re-enabled

### Activation Workflow
- [ ] On Activate button click: disable button, show spinner
- [ ] POST /buy-boxes (create) or PATCH /buy-boxes/:id (edit) with nativeToPayload
- [ ] On success: fire activation dialog (create only; edit just navigates back)
- [ ] On error: show error toast, disable spinner, re-enable button, stay on wizard
- [ ] Activation dialog [PORT]: portal, shows buy box name, 3-cell grid (Match pool / First drop / Cadence), "Return" + "Build another" buttons
- [ ] "Return" button: navigate to management
- [ ] "Build another" button: reset wizard (EMPTY_FORM), return to step 1

### Edit Geo Shortcut
- [ ] "Edit geo" button on gap cards navigates to /buy-boxes/:id/edit?skipTo=1
- [ ] Wizard detects skipTo param and renders step 1 (skips steps 2-5)
- [ ] On save, PATCH buy box with geo changes only (or full form; specify in rebuild)

### Data Round-Trip Tests
- [ ] Create buy box with all fields set, retrieve, all fields present
- [ ] Edit buy box, change one field, PATCH, retrieve, field changed
- [ ] Edit buy box in wizard, do NOT click Activate, navigate away, return to management, changes not persisted (form is ephemeral)
- [ ] Schedule: set days = [true, false, true, false, true, false, false], create, retrieve, verify days array matches
- [ ] Cadence: create box with 7 days, verify derived cadence is "Runs daily"; 1 day -> "Runs {day}"; 0 days -> "Runs real-time"

### Styling and Accessibility
- [ ] Design tokens (colors, spacing, typography) match your domain and brand
- [ ] Kanban lanes have semantic colors (status-based, not arbitrary)
- [ ] Cards are readable (high contrast, legible font size)
- [ ] Wizard steps are clear (numbered, labeled, progress visible)
- [ ] Buttons are keyboard-accessible (tab, Enter)
- [ ] Form inputs have labels or aria-labels
- [ ] Modals have focus trap and close button
- [ ] Toasts are visible and include icon + message
- [ ] Reduced-motion: respect prefers-reduced-motion, disable animations if set

### Error Handling and Edge Cases
- [ ] Network error on Activate: show error toast, button re-enabled
- [ ] Network error on Pause: show error toast, card reverts to Active
- [ ] Empty buy box list: "No boxes" message in all lanes
- [ ] Zero matches on preview: preview shows 0, user can still Activate
- [ ] Slow preview (5+ sec debounce): spinner or shimmer, not broken state
- [ ] Missing form data: validation errors on Next, clear message ("Select an asset class to continue")
- [ ] Missing backend field: edit form handles gracefully (null or undefined -> empty string in form)
- [ ] Concurrent edits: if two users edit the same buy box, last write wins (no conflict resolution; simplest case)

### Performance
- [ ] Kanban rendering is smooth (no jank on drag)
- [ ] Preview debounce is 400ms (no excessive network calls)
- [ ] Optimistic updates are instant (no wait for network)
- [ ] Modal overlays do not re-render parent
- [ ] Sparkline is SVG (lightweight, no external chart library)
- [ ] Form state changes do not cause full tree re-render (use proper React memoization)

### Documentation
- [ ] README explains the feature (management + wizard)
- [ ] REBUILD_GUIDE.md (this file) is committed alongside code
- [ ] API contract documented (endpoints, request/response shapes, error codes)
- [ ] Form state module has comments: EMPTY_FORM, nativeToPayload, toNativeForm
- [ ] classSchema() registry is documented: how to add a new asset class
- [ ] Schedule editor is documented: days array format, derivation logic
- [ ] Landings marked [PORT], [CUT], [BUILD] in code comments for clarity

### Commit and Deployment
- [ ] Code compiles / type-checks with zero errors
- [ ] Tests pass (80%+ coverage)
- [ ] Linter passes
- [ ] Staging deployment is clean, no console errors
- [ ] Production deployment: verify buy-boxes page loads, can create/edit/delete box, can pause/resume
- [ ] Smoke test: create a buy box, verify it appears in Pending lane, move to Activate step, edit schedule to Mon/Wed/Fri, verify cadence shows "Runs 3 days/week", activate, verify success dialog, return to management, verify box is in Active lane with Mon/Wed/Fri highlighted
- [ ] Rollback plan: if deploy fails, have a rollback procedure

---

## Appendix: File Structure (Frontend Example)

If using React, organize as follows:

```
src/
├── components/
│   ├── BuyBoxWizard.jsx              [PORT] Wizard shell, step rendering
│   ├── BuyBoxPage1.jsx               [PORT] Target (asset + geo, no ZIP)
│   ├── BuyBoxPage23.jsx              [PORT] Profile + Owner
│   ├── BuyBoxPage5.jsx               [PORT] Location (was page 5 of 7, becomes step 4)
│   ├── BuyBoxPage6.jsx               [PORT] Threshold (was page 6, becomes step 5)
│   ├── BuyBoxPage7.jsx               [PORT] Activate + schedule (was page 7, becomes step 6)
│   ├── ScheduleEditor.jsx            [BUILD] NEW - day-by-day toggle picker
│   ├── BuyBoxRightRail.jsx           [PORT] Live preview
│   ├── BuyBoxActivatedDialog.jsx     [PORT] Activation success modal
│   └── (Delete: BuyBoxPage4.jsx, BuyBoxConfigurator/*, BuyBoxEditModal.jsx)
├── views/
│   └── BuyBoxesView.jsx              [PORT] Kanban management surface
├── lib/
│   ├── wizardFormState.js            [PORT] EMPTY_FORM, nativeToPayload, toNativeForm
│   ├── buyBoxTaxonomy.js             [PORT] Asset classes, subtypes, geo, schedule, etc.
│   ├── buyBoxFieldSchema.js          [PORT] classSchema() - asset class to field map
│   └── api.js                        [PORT] API wrapper (getBuyBoxes, patchBuyBox, etc.)
├── styles/
│   ├── buyBoxes.css                  [PORT] Kanban
│   ├── buy-box-wizard.css            [PORT] Wizard shell
│   ├── buy-box-wizard-pages.css      [PORT] Pages 1-7
│   ├── buyBoxActivated.css           [PORT] Dialog
│   └── tokens.css                    [PORT] Design tokens
└── contexts/
    └── DealsContext.jsx              [PORT] Central data layer
```

---

## Appendix: Common Pitfalls

- **Mutation in form state**: form.assets.push(newAsset) will break React rendering. Use spread: {...form, assets: [...form.assets, newAsset]}.
- **Forgetting toNativeForm() on edit**: Edit mode needs to deserialize the database object into form state. If you skip this, the form loads empty.
- **Hardcoding asset classes**: Use the taxonomy registry everywhere. Do not hardcode 'multifamily' strings.
- **ZIP field still exposed**: The source has ZIP in the combo dropdown. This rebuild [CUT]s it. Do not accidentally re-enable it in merge conflicts.
- **Distress signals in owner toggles**: Tax delinquent and active foreclosure are now plain owner flags (form.signals array), not distress signals. Do not mix them.
- **Schedule days not 7 elements**: Always validate days.length === 7. Never shorten or extend.
- **Cadence stored as a field**: Cadence is derived from days. Do not store it. Always compute it on display.

---

End of Rebuild Guide.
