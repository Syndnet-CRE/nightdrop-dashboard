# State Machine and Component Contracts
Buy Box Configurator, Curated Build (2026-05-20 snapshot + 6-step after Distress cut)

---

## OVERVIEW

This document specifies:
1. **Form State Model** (EMPTY_FORM, payload builders, round-trip deserializers)
2. **Wizard State Machine** (6 steps after Distress cut, validation gates, mode transitions)
3. **Component Contracts** (8 core surfaces + [BUILD] day editor)

The audience is an engineering team that will REBUILD this feature from scratch in a different platform. Every contract lists responsibility, structural vs. domain-specific concerns, required inputs/outputs, and event flows.

**Note on em dashes:** This document uses commas, periods, and hyphens only (no em dashes).

---

## FORM STATE MODEL

### EMPTY_FORM Shape (src/lib/wizardFormState.js, line 9)

The canonical form state object. Every field starts as empty string (ranges), empty array (multi-select), false (toggles), or null (tri-state). All fields are immutable; updates return a new object.

#### Asset Selection
```javascript
assets: [],              // single-element array [assetClassSlug]
subtypes: [],            // integer[] of asset_use_codes per class
sub_assets: [],          // string[] land sub-types (land only)
```

#### Geography
```javascript
geo: {
  states: [],            // state codes e.g. ['TX', 'CA']
  counties: [],          // 'STATE:CountyName' format
  metros: [],            // city names e.g. 'Austin, TX'
  zips: [],              // 5-digit strings [CUT: not in curated build]
}
```

#### Physical Envelope
```javascript
phys: {
  sf_min: '', sf_max: '',
  acres_min: '', acres_max: '',
  lot_sf_min: '', lot_sf_max: '',
  year_min: '', year_max: '',
  stories_min: '', stories_max: '',
  units_min: '', units_max: '',
  beds_min: '', beds_max: '',
  baths_min: '', baths_max: '',
  lot_width_min: '', lot_depth_min: '',
  building_classes: [],           // subset of ['A', 'B', 'C']
  construction_types: [],
  foundation_types: [],
  roof_types: [],
  garage_types: [],
}
```

#### Financial [CUT in Curated Build]
The following fields exist in EMPTY_FORM but are NOT wired to the curated wizard:
- `fin.price_min`, `fin.price_max`
- `fin.equity_preset` (presets: '25%', '40%', '50%', '60%', '75%')
- `fin.price_per_unit_max`
- `fin.improvement_to_land_max`
- `fin.development_potential_min`

nativeToPayload() still serializes these fields if present; they are silently dropped by the curated build's Page 2.

#### Owner
```javascript
owner: {
  entity: '',                     // 'individual' | 'llc' | 'trust' | 'corporate' | 'any' | ''
  out_of_state: false,
  absentee: false,
  hold_min: '', hold_max: '',
}
```

Owner's `tax_delinquent` and `active_foreclosure` toggles operate directly on form.signals[] (not separate owner fields). See BuyBoxPage23.jsx line 372.

#### Distress Signals [CUT ENTIRELY in Curated Build]
The following fields exist but are not rendered after step 4 cut:
- `signals: []` (list of signal IDs)
- `logic: 'OR'` (AND or OR match mode)
- `distress_floor: ''` (score 0-100 minimum)

Curated build still accepts tax-delinquent and active-foreclosure via signals[], but the 12-signal card UI is removed.

#### Utilities
```javascript
utils: {
  water: false, sewer: false, electricity: false, gas: false
}
```

#### Location and Risk
```javascript
location: {
  flood_exclude: false,
  opportunity_zone: null,         // tri-state: null | true | false
  wetlands_exclude: false,
  tif_district: null,             // tri-state
  in_etj: null,                   // tri-state
  corner_lot: false,
  assemblage_potential: false,
  aadt_min: '',
  road_frontage_min: '', road_frontage_max: '',
  zoning_codes: [],
  future_land_use_codes: [],
}
```

#### Class-Specific Flags
```javascript
flags: {
  has_pool: null,                 // tri-state
  has_elevator: null,             // tri-state
  pct_renter_occupied_min: '',
  mf_lihtc_flag: null,            // tri-state
  ss_is_reit_owned: null,         // tri-state
  ss_has_foreclosure_history: null,  // tri-state
}
```

#### Threshold and Delivery
```javascript
threshold: 'balanced',            // 'volume' (70%), 'balanced' (80%), 'precision' (90%)
delivery: {
  cadence: 'daily',               // 'daily' | 'weekly' | 'realtime' [PORT + [BUILD] day editor]
  max: 5                          // max matches per run
}
```

After [BUILD] day editor, delivery.cadence is still one of the three presets (for Activate step summary), but run_schedule.days is derived from the per-day Monday-Sunday selector.

#### Wizard Meta
```javascript
name: '',                         // buy box display label
matchCount: 0                     // live count from /preview endpoint
```

### Payload Builders

#### nativeToPayload(form) (line 125)

Converts EMPTY_FORM shape to backend POST/PATCH payload. Transformation rules:

- Empty strings and null values serialize to null (backend nullable handling)
- `form.subtypes`: if empty but asset class is set, defaults to all codes for that class (line 133)
- `form.geo.counties`: strips 'STATE:' prefix when serializing geo_counties (line 150)
- `form.fin.equity_preset`: converted to min_equity_pct (integer 0-100) and min_equity_dollar (absolute, requires value_min floor) (lines 180-188)
- `form.signals`: only serialized if array is non-empty (line 204)
- Tri-state fields (opportunity_zone, tif_district, has_pool, etc.) pass through as null | true | false (no conversion)
- `form.delivery.cadence`: converted to run_schedule.days array (line 238-240):
  - 'daily' = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  - 'weekly' = ['mon']
  - 'realtime' = []

[BUILD] day editor replaces the cadence-to-days logic. After the per-day selector is wired, run_schedule.days comes directly from the user's Monday-Sunday toggles.

**Note:** Curated build does not serialize `fin`, `geo.zips`, or the 12 distress signals from the cut Distress step. These fields exist in EMPTY_FORM but nativeToPayload() treats them like any other, allowing opt-in re-use if the wizard is extended later.

#### toNativeForm(b) (line 245)

Deserializes backend buy-box shape back to EMPTY_FORM for edit mode. Reversal rules:

- Equity round-trip (line 257-271): tries min_equity_pct as integer, then as decimal, then derives from min_equity_dollar / value_min if needed
- Threshold (line 272): reverse-looks THRESHOLD_MAP to recover 'volume' | 'balanced' | 'precision'
- Owner entity (line 274-277): if owner_types is single-element array, recovers the chip; if multi-element, sets 'any'
- run_schedule.days (line 366): if length === 1, cadence is 'weekly'; if length === 7, 'daily'; else 'custom'

[BUILD] day editor will skip the cadence derivation and consume run_schedule.days directly as the per-day selector state.

---

## WIZARD STATE MACHINE

### 6-Step Flow (After Distress Cut)

Original structure (BuyBoxWizard.jsx line 19-27) has 7 steps. After removing the Distress step (step 4), renumber to 6:

| Step | Label | Page Component | Purpose |
|------|-------|---|---|
| 1 | Target | BuyBoxPage1 | Asset class (single-select), sub-assets (land only, multi-select up to 3), geography (states, counties, metros) |
| 2 | Profile | BuyBoxPage2 | [PORT] Physical envelope only. [CUT] entire "B Financial" subsection. |
| 3 | Owner | BuyBoxPage3 | Entity type, hold period, out-of-state, absentee. KEEP tax-delinquent and active-foreclosure toggles as plain owner flags. |
| 4 | Location | BuyBoxPage5 (was 5) | [PORT] Utilities, floodplain/wetlands, opportunity zone, TIF, class-specific rules, AADT slider. |
| 5 | Threshold | BuyBoxPage6 (was 6) | [PORT] Match threshold 70% / 80% / 90% cards. |
| 6 | Activate | BuyBoxPage7 (was 7) | [PORT] Name, filter review, delivery cadence + [BUILD] per-day schedule editor, Activate button. |

### Validation Gates

#### Step 1 (Target)
- **Gate:** form.assets.length > 0 AND form.geo.states.length > 0 (line 105)
- **Blocks:** canGoNext() returns false; user cannot continue until both asset and at least one state are selected
- **Rationale:** Backend matcher enforces both. Geographic selection without assets times out on the preview endpoint (unfiltered full-table COUNT).

#### Step 2-6
- **No additional gates.** User can proceed with partial data (empty ranges, unset toggles). All fields are optional except the gate at step 1.

### Mode Transitions

#### Create Mode
1. Initialize form as { ...EMPTY_FORM } (line 138)
2. User fills all 6 steps
3. On step 6 Activate, POST /api/dealfeed/buy-boxes with full payload (line 257)
4. Success: render BuyBoxActivatedDialog, reset form to blank, allow "Build another"

#### Edit Mode
1. On mount, initialize form as toNativeForm(initialData) (line 138)
2. Step numbering, page UI, and preview behavior are identical to create
3. On step 6 Activate, PATCH /api/dealfeed/buy-boxes/:id with payload (line 252)
4. Success: render BuyBoxActivatedDialog, onSuccess() callback closes modal and returns to management

#### Modal State
- BuyBoxWizard lives inside App.jsx's modal/overlay (App.jsx line 308-400)
- Submitted state (line 140) gates BuyBoxActivatedDialog rendering (line 311-330)
- Backdrop outside .app div (line 310) is intentionally non-clickable to prevent accidental dismissal mid-wizard

### Live Preview

#### Preview Loop (line 180-232)
- Watched fields: assets, subtypes, sub_assets, geo, phys, fin, owner, signals, distress_floor, utils, location, flags (line 164-178)
- Excluded: threshold (match score is delivery-time filter, not pool filter), name, delivery cadence
- Trigger: 400ms debounce after any field change
- Gate: skipped if form.assets.length === 0 (line 183)
- Request: POST /api/dealfeed/buy-boxes/preview with nativeToPayload(form) (line 207)
- States: 'idle' (no assets) => 'spinning' (loading) => 'resolved' (landed) or 'error' (timeout | server)
- Display: SlotMachineCounter in right rail (BuyBoxRightRail.jsx line 70-92) and footer (line 386-387)

**After [BUILD] day editor:** Preview loop is unaffected; run_schedule.days is NOT a preview-watched field.

---

## COMPONENT CONTRACTS

### 1. BuyBoxWizard (src/components/BuyBoxWizard.jsx)

**Classification:** STRUCTURAL (reusable multi-step form harness with live preview and async activation)

**Responsibility:** Orchestrate form state, page switching, validation, live preview polling, and submission flow.

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| mode | 'create' \| 'edit' | Initialize form blank or from backend data |
| initialData | buyBox object (edit mode) | Populate edit form via toNativeForm() |
| onSuccess() | callback | Close modal after successful activation |
| onCancel() | callback | Close modal on Escape or close button |

**Key Outputs/Events**
- Fires toast (useToast hook) on preview errors and activation failures
- Calls onSuccess() after successful POST/PATCH and BuyBoxActivatedDialog dismissal
- Calls onCancel() on Escape or backdrop click attempt

**State Shape**
```javascript
{
  page: 1-6,                    // current step
  form: {...EMPTY_FORM},        // live form state
  activating: boolean,          // PATCH/POST in flight
  submitted: boolean,           // gates BuyBoxActivatedDialog rendering
  activatedForm: form | null,   // snapshot for success dialog
  previewState: 'idle' | 'spinning' | 'resolved' | 'error',
  errorKind: 'timeout' | 'server' | null,
}
```

**Key Behaviors**
- canGoNext(page, form) gates forward navigation (step 1 only)
- Backward navigation (page > s.id) is always allowed via stepper click (line 344)
- Cmd/Enter or Alt+Right/Left triggers page changes (line 236-240)
- Escape closes wizard and calls onCancel() (line 241)
- Form changes debounce preview request 400ms (line 202)
- Stale preview requests are aborted when newer ones arrive (line 200, 219)

**Structural Patterns**
- Provider of form state and preview data to child pages via props (not context)
- Wraps child pages in a two-column layout: content (left) + right rail (right)
- Stepper buttons are history-aware (only steps < current are clickable)

**Domain-Specific Concerns**
- Rely on wizardFormState.js helpers (nativeToPayload, toNativeForm, EMPTY_FORM)
- Rely on buyBoxTaxonomy.js for asset class and subtype lookups
- Depend on DealsContext.patchBuyBox for edit PATCH
- Route to POST /api/dealfeed/buy-boxes (create) or PATCH /api/dealfeed/buy-boxes/:id (edit)
- Call /api/dealfeed/buy-boxes/preview for live match count

---

### 2. BuyBoxPage1 (Asset + Geography) [PORT]

**Classification:** STRUCTURAL (composable domain page with multi-select and combobox controls)

**Responsibility:** Render asset class single-select chips, sub-asset multi-select (land only), and geography state/county/metro/zip selector.

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| form | {...EMPTY_FORM} | Read-only form state |
| setForm(newForm) | function | Update form immutably |

**Key Outputs/Events**
- None; all events flow through setForm(form => ({...form, ...updates}))

**Form State Updates**
- form.assets: [assetClassSlug]
- form.subtypes: [integer, ...] (asset use codes)
- form.sub_assets: [slug, ...] (land only)
- form.geo.states: [stateCode, ...]
- form.geo.counties: ['STATE:CountyName', ...]
- form.geo.metros: [cityName, ...]
- form.geo.zips: [zipString, ...] [CUT in curated build]

**Key Behaviors**
- Asset class: single-select only. Selecting a new class clears subtypes and sub_assets (line 273)
- Sub-assets: multi-select, land only, max 3 chips (line 206, 368-398)
- States: combobox with STATES array (line 410-441), auto-fetch counties on state selection (line 176-187)
- Counties: paginated grid, multi-select, keyed as 'STATE:CountyName' (line 454-506)
- Metros: preset list MAJOR_METROS (line 507-543), multi-select
- ZIP: optional, regex /^\d{5}$/ validation, chip-input, addZip/removeZip (line 275-290, 547-571) [CUT]

**Structural Patterns**
- Reusable combo/multi-select components (Combo, ChipInput from buyBoxInputs.jsx or inline)
- Display sub-asset selector only if primary asset is 'land'
- Fetch counties list on state selection to avoid payload bloat

**Domain-Specific Concerns**
- STATES, MAJOR_METROS, DISPLAY_CLASSES from buyBoxTaxonomy.js (10 classes MVP)
- Combobox requires async API call to fetch county list per state
- Sub-asset labels from LAND_SUB_ASSETS array

---

### 3. BuyBoxPage2 (Profile: Physical Only) [PORT + CUT Financial]

**Classification:** STRUCTURAL (composable inputs for numeric ranges and categorical chips)

**Responsibility:** Render physical property envelope ranges (sqft, acres, year, stories, units, beds, baths, lot size) and building class/construction type/foundation/roof/garage chips. [CUT the entire "B Financial" subsection.]

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| form | {...EMPTY_FORM} | Read-only form state |
| setForm(newForm) | function | Update form immutably |

**Key Outputs/Events**
- None; all updates flow through setForm()

**Form State Updates**
- form.phys.sf_min / sf_max
- form.phys.acres_min / acres_max
- form.phys.lot_sf_min / lot_sf_max
- form.phys.year_min / year_max
- form.phys.stories_min / stories_max
- form.phys.units_min / units_max
- form.phys.beds_min / beds_max
- form.phys.baths_min / baths_max
- form.phys.lot_width_min / lot_depth_min
- form.phys.building_classes: [chip, ...]
- form.phys.construction_types: [chip, ...]
- form.phys.foundation_types: [chip, ...]
- form.phys.roof_types: [chip, ...]
- form.phys.garage_types: [chip, ...]

**Key Behaviors**
- Section A header: "Property profile" with "Ranges are inclusive" hint
- Two-column layout (line 112) shifts to one column after financial cut
- Numeric fields accept empty string (no filtering) or numeric input
- Building classes: ternary chip set A / B / C (line 141-158)
- Construction/foundation/roof/garage: from classSchema conditional (lib/buyBoxFieldSchema.js)
- Display class-specific sub-fields only if primary asset matches (asset-agnostic in raw markup; conditional via classSchema lookup)

**Structural Patterns**
- Section header with eyebrow + title + sub (line 102-110)
- Grid layout (asset-class determines grid flow after financial cut)
- NumberField / RangeInputs reusable from buyBoxInputs.jsx (or inline)
- Chip toggles (single or multi-select depending on field)

**Domain-Specific Concerns**
- classSchema() from buyBoxFieldSchema.js determines which fields appear per asset class
- Building class chips are always A / B / C (no subtype dependency)
- Construction/roof/garage types vary by asset class

**[CUT] Financial Section**
Removed entirely: "B Financial" header, assessed value, owner equity presets, price-per-unit-max, improvement-to-land-max, development-potential-min, and the equity stat cell in BuyBoxRightRail.

---

### 4. BuyBoxPage3 (Owner) [PORT: Flags, CUT: Distress Score Machinery]

**Classification:** STRUCTURAL (composable chips and toggles)

**Responsibility:** Render entity type (single-select chips), hold period (range), out-of-state (toggle), absentee (toggle), tax-delinquent (toggle), active-foreclosure (toggle).

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| form | {...EMPTY_FORM} | Read-only form state |
| setForm(newForm) | function | Update form immutably |

**Key Outputs/Events**
- None; all updates flow through setForm()

**Form State Updates**
- form.owner.entity: 'individual' | 'llc' | 'trust' | 'corporate' | 'any' | ''
- form.owner.hold_min / hold_max: empty string or number
- form.owner.out_of_state: boolean
- form.owner.absentee: boolean
- form.signals: [signal IDs] (tax-delinquent, active-foreclosure only; not the full 12-signal set from cut step 4)

**Key Behaviors**
- Entity type: OwnerChips single-select (Any / Individual / LLC-Entity / Trust / Corporate) (line 343-354)
- Hold period: two numeric inputs (min years, max years) (line 356-358)
- Out-of-state toggle: labeled "Out-of-state properties" (line 360-365)
- Absentee toggle: labeled "Absentee owners only" (line 366-371)
- Tax-delinquent toggle: adds/removes 'tax-delinquent' from form.signals (line 372-377)
- Active-foreclosure toggle: adds/removes 'active-foreclosure' from form.signals (line 378-387)

**Note:** The tax-delinquent and active-foreclosure toggles operate on form.signals (not dedicated owner fields) because they are optional distress flags that flow through the same array as the 12 full distress signals. Since the curated build CUTs the 12-signal card UI, only these two flags remain. If rebuilt, treat them as plain owner flags (boolean owned_by_tax_delinquent, owned_by_foreclosure) and surface them from form.signals in buildFilters() (wizard.jsx line 62-63).

**Structural Patterns**
- Section A "Ownership" contains all 5 entity/hold/state/absentee chips and toggles
- No Section B in curated build (distress score machinery cut)
- OwnerChips component for entity single-select (defined in BuyBoxPage23.jsx or buyBoxInputs.jsx)

**Domain-Specific Concerns**
- Entity types from buyBoxTaxonomy.js or inline (Individual / LLC / Trust / Corporate)
- Hold period units are years
- Tax-delinquent and active-foreclosure are CRE-domain-specific distress flags

---

### 5. BuyBoxPage5 (Location + Risk) [PORT]

**Classification:** STRUCTURAL (composable toggles, range inputs, and class-specific conditional fields)

**Responsibility:** Render utilities (toggles), floodplain/wetlands/opportunity-zone/TIF (toggles or tri-state), AADT (slider for commercial), road frontage (range), zoning codes (multi-select), class-specific flags (pool, elevator, renter occupancy, LIHTC, REIT, foreclosure history).

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| form | {...EMPTY_FORM} | Read-only form state |
| setForm(newForm) | function | Update form immutably |
| assetClass | slug | Determine which class-specific fields to render |

**Key Outputs/Events**
- None; all updates flow through setForm()

**Form State Updates**
- form.utils: { water, sewer, electricity, gas } (booleans)
- form.location.flood_exclude / wetlands_exclude (boolean)
- form.location.opportunity_zone / tif_district / in_etj (tri-state: null | true | false)
- form.location.corner_lot / assemblage_potential (boolean)
- form.location.aadt_min (number or empty string)
- form.location.road_frontage_min / road_frontage_max
- form.location.zoning_codes / future_land_use_codes (array of strings)
- form.flags: { has_pool, has_elevator, pct_renter_occupied_min, mf_lihtc_flag, ss_is_reit_owned, ss_has_foreclosure_history } (tri-state for has_* and *_flag, number/empty for renter %)

**Key Behaviors**
- Section A Utilities: four toggles (water, sewer, electricity, gas) (line 154-169)
- Section B Risk: exclude toggles (floodplain, wetlands) and tri-state buttons (opportunity zone, TIF) (line 171-204)
- Section C Class-Specific: fields appear only if assetClass matches (line 206-330)
  - Land: road frontage (range), zoning codes (multi-select), future land use codes (multi-select)
  - Retail: corner lot (toggle)
  - Commercial (office, industrial): AADT slider (line 87-125, heat gradient visual)
  - Multifamily: renter occupancy min (number), LIHTC tri-state (line 313-323)
  - Self-storage: REIT owned (tri-state), foreclosure history (tri-state) (line 325-332)

**Structural Patterns**
- Three-section layout: Utilities, Risk, Class-Specific
- Tri-state buttons for optional filters (clicking toggles null => true => false => null)
- Conditional rendering based on assetClass lookup from buyBoxTaxonomy.js
- AADT slider with heat-gradient background (domain-specific visual)

**Domain-Specific Concerns**
- Utilities are infrastructure availability filters
- Opportunity zone and TIF district are tax/incentive-based filters
- AADT (Annual Average Daily Traffic) is commercial-property-specific
- Class-specific flags (has_pool, LIHTC, REIT) are CRE-domain taxonomy

---

### 6. BuyBoxPage6 (Threshold) [PORT]

**Classification:** STRUCTURAL (single-select radio button group with descriptive cards)

**Responsibility:** Render three threshold cards (70% Volume, 80% Balanced, 90% Precision) and allow user to select one.

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| form | {...EMPTY_FORM} | Read-only form state |
| setForm(newForm) | function | Update form immutably |

**Key Outputs/Events**
- None; all updates flow through setForm()

**Form State Updates**
- form.threshold: 'volume' | 'balanced' | 'precision'

**Key Behaviors**
- Display three cards (line 41-58) with radio buttons
- Card labels: "70% Volume", "80% Balanced", "90% Precision"
- Card descriptions: [match count ranges from THRESHOLDS array] (line 1-11)
- Selected card has .on class
- Estimated count display: show form.matchCount and current threshold pool estimate (line 60-67)

**Structural Patterns**
- .threshold-grid layout with three cards
- .threshold-pct styling for large percentage labels
- Radio buttons (not checkboxes)

**Domain-Specific Concerns**
- Volume/balanced/precision are deal-distribution strategy presets
- Threshold affects deal delivery filter (step 6 feedback); it does NOT affect the live preview match pool

---

### 7. BuyBoxPage7 (Activate + [BUILD] Day Editor) [PORT + BUILD]

**Classification:** STRUCTURAL (form review + [BUILD] per-day schedule editor + submission)

**Responsibility:** Render buy box name input, filter review grid with remove buttons, delivery cadence cards (Daily / Weekly / Real-time) [PORT], AND [BUILD] a per-day Monday-Sunday editable schedule picker that lets the user toggle each day independently.

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| form | {...EMPTY_FORM} | Read-only form state |
| setForm(newForm) | function | Update form immutably |
| matchCount | number \| null | Live pool size from preview |
| previewState | 'idle' \| 'spinning' \| 'resolved' \| 'error' | Loading state for counter |
| errorKind | 'timeout' \| 'server' \| null | Error type for messaging |
| summary | array of {label, val} | Condensed filter list for review |
| onActivate() | callback | POST/PATCH and mark as submitted |
| activating | boolean | PATCH/POST in flight |
| goToStep(n) | function | Navigate back to earlier step for filter edits |

**Key Outputs/Events**
- None; all updates flow through setForm()
- onActivate() called on primary button click (disabled if !form.name.trim() or activating)

**Form State Updates**
- form.name: buy box display label (string)
- [BUILD] form.delivery.cadence: 'daily' | 'weekly' | 'realtime' (unchanged; still used for summary + fallback)
- [BUILD] derived run_schedule.days: [boolean, ...] (7 booleans Mon-Sun, derived from per-day toggles)

**Key Behaviors (Current [PORT])**
- Name input: .review-name-input (line 27-45)
- Filter review: condensed grid of active filters with remove buttons (line 47-61)
- Edit filters link: "Edit" button navigates back to step 1 via goToStep(1) (line 61)
- Cadence cards: Daily (06:00 AM EST), Weekly (Mon 07:00 AM), Real-time (No SLA) (line 63-84, CADENCES line 4-8)
- Cadence selection: single radio per card, updates form.delivery.cadence
- Max per run: numeric input (form.delivery.max, default 5) (line 86-91)
- Activation ribbon: zap icon button (line 86-98), disabled if activating or name is empty

**Key Behaviors ([BUILD] Day Editor Requirement)**

After the [BUILD] day editor is wired:
- **Location:** Appears below or alongside the cadence cards (TBD by porting team)
- **Interaction:** 7 day buttons (Mon-Sun), each toggleable on/off
- **State shape:** Derived from form.delivery.cadence initially (e.g., 'daily' = all on, 'weekly' = Mon only, 'realtime' = all off), but user can edit any day independently
- **Behavior on cadence card click:** If user was in 'daily' and clicks the cadence card again (or clicks a day button), the behavior is:
  - Clicking a day button OUTSIDE the preset range = update the day; if now custom (not 7 or 1 or 0), show a visual cue (optional: display "custom" label instead of cadence name)
  - Clicking a cadence card = apply preset; reset all days to the preset (daily = all 7, weekly = Mon only, realtime = 0)
- **Serialization:** On activation, nativeToPayload() ignores form.delivery.cadence and uses run_schedule.days directly (all 7 booleans). Curated build does NOT support custom schedules on the backend yet; if user selects a custom day set, either warn them ("Custom schedules not yet supported") or auto-snap to the nearest preset.
- **Visual reference:** WeekStrip component (BuyBoxesView.jsx line 131-145) renders a read-only Mon-Sun strip with classes .bb-week / .bb-week__d / .bb-week__d.is-on (buyBoxes.css line 291-318). Day editor uses same markup for consistency.

**[BUILD] Day Editor Component Contract**

Create a new reusable component (e.g., `DayScheduleEditor`) with these props and behaviors:

| Prop | Type | Purpose |
|------|------|---------|
| days | [bool, ...] (7 elements Mon-Sun) | Current per-day selection |
| onChange(newDays) | function | Callback when any day is toggled |
| cadencePreset | 'daily' \| 'weekly' \| 'realtime' \| null | Optional visual cue showing preset mode |
| disabled | boolean | Disable all day buttons (optional, for loading state) |

**Behavior:**
- Render 7 day buttons (labels: M T W T F S S, keyed to DAY_KEYS ['mon', 'tue', ...])
- On click, toggle the day and call onChange([...days]) with the modified array
- Optional: show "custom" label if current days do not match any preset
- Optional: highlight selected days with .is-on class (reuse buyBoxes.css styling)

**Structural Patterns**
- Review section with edit link (goToStep callback)
- Cadence cards or segmented control for preset selection
- [BUILD] Day editor component integrated into page layout
- Activation button at bottom (primary, zap icon, conditional disable)

**Domain-Specific Concerns**
- Summary array is built by buildSummary(form) in wizard.jsx (line 80-102)
- Filter remove buttons call clearFilter(id) in wizard.jsx (line 271-293)
- Cadence labels include time zone (EST) and specific times (06:00 AM)
- Max per run is a delivery-tuning parameter (default 5)

---

### 8. BuyBoxActivatedDialog [PORT]

**Classification:** STRUCTURAL (full-screen confirmation overlay with focus trap)

**Responsibility:** Display activation success message, live match pool, first drop time, cadence/max, and two action buttons (Return to dashboard, Build another).

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| box | { label, run_schedule: { days }, delivery_max_per_run } | Activated buy box data |
| matchCount | number \| null | Live pool size |
| cadenceOverride | 'daily' \| 'weekly' \| 'realtime' \| null | Override run_schedule derivation (used in wizard) |
| onBuildAnother() | callback | Reset wizard and return to step 1 |
| onClose() | callback | Close and return to dashboard |

**Key Outputs/Events**
- onClose() on Return to dashboard button, Escape key, or backdrop click
- onBuildAnother() on Build another button

**Rendering**
- Portal (createPortal) to document.body
- Modal role="dialog" with aria-modal="true" and aria-labelledby
- Focus trap: Tab cycles between primaryRef (Build another) and secondaryRef (Return)
- Backdrop click (if e.target === e.currentTarget) calls onClose()
- Escape key calls onClose()

**UI Layout**
- Check icon (lucide-react Check, size 32)
- Eyebrow "Buy box activated" (line 113)
- Title "You're hunting." (line 115)
- Buy box name display (line 117)
- 3-cell grid (line 119-143):
  - Cell 1: "Match pool" label, match count value (large, accent-green), "properties tracked" sub
  - Cell 2: "First drop" label, time (HH:MM EST), day of week ("Monday morning") sub
  - Cell 3: "Cadence" label, cadence name (Daily / Weekly / Real-time), "up to N per drop" sub
- Two buttons (line 145-162):
  - Secondary (ref secondaryRef): "Return to dashboard"
  - Primary (ref primaryRef): "Build another →"

**Key Behaviors**
- deriveCadence(box, override) (line 17-24): if override, use it; else derive from box.run_schedule.days length (7 = daily, 1 = weekly, 0 = realtime, else custom)
- formatFirstDrop(box) (line 28-43): compute next scheduled day; iterate from tomorrow, find first day in run_schedule.days, return label + time
- Focus management: focus primaryRef on mount, trap Tab, restore previous focus on unmount
- Prevent body scroll (set overflow hidden on mount, restore on unmount)

**Structural Patterns**
- Portal for full-screen overlay (no z-index needed, sits atop all other content)
- Modal semantics (role, aria-modal, aria-labelledby)
- Grid layout for 3 stat cells
- Two-button footer (secondary + primary)

**Domain-Specific Concerns**
- Time display is hardcoded "06:00 EST" (backend sends no time; front-end assumes fixed time)
- Day names are English locale
- Cadence labels and semantics (Daily / Weekly / Real-time)

---

### 9. BuyBoxRightRail [PORT + CUT]

**Classification:** STRUCTURAL (live preview counter, stat cells, filter chips, geo concentration)

**Responsibility:** Display live clock, match pool counter with delta, stat trio (hold period + occupancy after financial cut), geographic concentration, and active filter chips with remove buttons.

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| matchCount | number \| null | Current pool size from preview |
| previewState | 'idle' \| 'spinning' \| 'resolved' \| 'error' | Loading state |
| errorKind | 'timeout' \| 'server' \| null | Error type |
| filters | array of {id, label, val, inactive?} | Active filter chips from buildFilters() |
| geoStates | [stateCode, ...] | Geographic concentration display |
| onRemoveFilter(id) | callback | Called when user clicks x on a filter chip |
| form | {...EMPTY_FORM} | Read-only form state for deriveStatTrio() |

**Key Outputs/Events**
- onRemoveFilter(id) called when user clicks x on a filter chip (e.g., 'assets', 'equity', 'hold')

**Rendering**
- Header: "Live" dot + HH:MM:SS clock (updated every 1s) (line 62-68)
- Quote block: "Live match pool" label, SlotMachineCounter, optional delta pulse (line 70-92)
- Stat trio: 2 cells after financial cut (line 94-110)
  - Cell 1: "Hold period" label, holdVal (display), holdSub (status text)
  - Cell 2: "Occupancy" label, occupancyVal (display), occupancySub (status text)
  - [CUT Cell 3: "Min equity" - removed after financial section cut]
- Geographic concentration: "Geographic concentration" label, list of state codes with dots (line 112-129)
- Active filters: "Active filters" label, grid of removable chips (line 131-156)

**Key Behaviors**
- Clock updates via setInterval every 1s (line 37-43)
- Delta pulse: when matchCount changes, set pulse = true for 600ms, then fade (line 45-55)
- deriveStatTrio(form) (line 6-25): read form.owner.hold_min/max and return holdVal / holdSub. After financial cut, remove equity cell derivation (line 7-13).
- Filter chips have optional .inactive class if chip.inactive === true (for display-only filters like equity without a value floor)
- Chip removal: onClick calls onRemoveFilter(f.id) where id matches buildFilters() id (line 143-150)

**Stat Trio After Financial Cut**

Old shape (3 cells):
```
- Min equity
- Hold period
- Occupancy
```

New shape (2 cells):
```
- Hold period
- Occupancy
```

Remove the equity cell derivation from deriveStatTrio(). Keep occupancy as-is. Update the stat-trio grid from 3 to 2 columns (CSS grid-template-columns: 1fr 1fr).

**Structural Patterns**
- Sticky aside (rail) on right edge of wizard
- Live ticker (clock) signals to user that system is responsive
- Stat cells use consistent label / value / sub structure
- Filter chips are removable badges with x button
- Delta pulse animation on count change

**Domain-Specific Concerns**
- Clock timezone is hardcoded EST (no locale detection)
- Geographic concentration shows state codes (assumes US-only for MVP)
- Hold period is in years
- Equity cell is CRE-finance-specific (cut in curated build)

---

### 10. BuyBoxCard and Column (Kanban Board) [PORT]

**Classification:** STRUCTURAL (reusable drag-and-drop card and column components)

**Responsibility:** Render a single buy box card in a Kanban column with status, delivered count, sparkline, asset/geo chips, week strip, and actions. Columns are droppable targets that update buy box status on drop.

#### BuyBoxCard (BuyBoxesView.jsx line 241)

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| box | buyBox object | Buy box data |
| column | 'pending' \| 'validating' \| 'active' \| 'paused' \| 'gap' | Current column status |
| onEdit(box) | callback | Edit buy box (open wizard) |
| onEditGeo(box) | callback | Edit geography only (gap column) |
| onPause(box) | callback | Pause buy box (open confirm modal) |
| onResume(id) | callback | Resume paused buy box |
| onDragStart(e, box) | callback | Handle drag start (set dataTransfer) |

**Key Rendering**
- Card header: .bb-card__dot (status dot), title (box.label)
- Card hero (not gap): delivered count (large), this-week delta, sparkline
- Card alert (gap only): AlertTriangle icon, "No parcel data for this geo", hint text
- Chip row: asset class + count, geography (state/county/zip) with MapPin icon
- Next run: "Last run" label, timestamp or "Paused until fixed"
- Week strip: 7 day indicators (read-only, from box.run_schedule.days)
- Actions: status-specific buttons (Pause/Resume/Edit geo/Configure) + menu dropdown

**Key Behaviors**
- Draggable if onDragStart is provided (line 256-257)
- Gap cards: no delivered count, no actions except menu (Edit geo button in menu only)
- Active cards: Pause button prominent
- Paused cards: Resume button (primary style)
- Pending/validating cards: Configure button (edit wizard)
- Menu dropdown (CardMenu): Edit, Pause/Resume/Edit geo (context-specific), Delete with confirmation

**Structural Patterns**
- Card container with data-status and data-box-id (for drag data)
- Header, hero, chips, metadata, week strip, actions in fixed order
- Status-conditional rendering (gap alert replaces delivered count)
- Dropdown menu for secondary actions

**Domain-Specific Concerns**
- Delivered count is box.deals
- This-week delta is box.deliveredThisWeek
- Sparkline data is box.deliveredSpark (array of 7 numbers for week trend)
- Last run timestamp from box.last_run_at (formatted as "MMM D, HH:MM")
- Asset class from box.asset_class (singular) or box.asset_classes[0] (legacy)
- Geo display priority: zips > counties > states (formatGeo, line 45-70)
- Week strip shows box.run_schedule.days as boolean array (schedule array, line 86-89)

#### Column (BuyBoxesView.jsx line 347)

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| col | { id, title, sub } | Column definition (from COLUMNS) |
| items | [buyBox, ...] | Buy boxes in this column |
| onEdit / onPause / onResume / onEditGeo | callbacks | Propagate to child cards |
| onDragStart(e, box) | callback | Set drag data |
| onDrop(e, colId) | callback | Handle drop; update buy box status |

**Key Rendering**
- Column header: status dot, title, count badge
- Column sub: descriptive subtitle
- Column body: grid of BuyBoxCard components or "No boxes" empty state
- Droppable area (onDragOver preventDefault, onDrop handler)

**Key Behaviors**
- onDrop reads dataTransfer 'boxId', looks up status map, calls patchBuyBox(id, {status}) (line 418-424)
- Gap column rejects drops (colId === 'gap' returns early, line 420)
- Status map: active => active, paused => paused, pending => pending, validating => pending

**Structural Patterns**
- .bb-col container with data-status and data-empty attributes
- .bb-col__body grid for cards
- .bb-col__empty placeholder when no cards

**Domain-Specific Concerns**
- Status map enforces business logic (validating cards move to pending when dragged, not directly to active/paused)
- Coverage gap column is read-only droppable target (visual only, no status update)
- Column order is fixed: Pending, Validating, Active, Paused, Coverage gap

---

### 11. MetricTile (LeftPanel.jsx line 11)

**Classification:** STRUCTURAL (reusable stat tile with optional click handler)

**Responsibility:** Render a small metric box with icon, value, label, and optional click handler for feed filtering.

**Key Inputs (Props)**
| Prop | Type | Purpose |
|------|------|---------|
| Icon | React component (lucide) | Icon to display (top-left) |
| label | string | Metric name (bottom) |
| value | string \| number | Metric value (large, center) |
| accent | 'green' \| 'orange' \| 'blue' \| 'violet' | Color scheme class |
| active | boolean | Highlight when active (for toggle state) |
| disabled | boolean | Disable/dim the tile |
| onClick() | callback | Called on click (if provided) |
| title | string | Tooltip text |

**Key Rendering**
- Icon (top-left, lucide size 14)
- Value (large, center)
- Label (bottom)
- Classes: metric-tile, accent-{color}, active, disabled, clickable (if onClick)

**Key Behaviors**
- onClick fires if provided and tile is not disabled
- aria-pressed reflects active state (for accessibility)
- disabled prop disables button and dims visuals

**Structural Patterns**
- Simple button element (type="button")
- Flex layout (column)
- Color class applied based on accent prop

**Domain-Specific Concerns**
- New This Week, Hot Deals, Response Rate, Awaiting are KPI types (from DealsContext kpis object)
- New This Week and Hot Deals are clickable filters (toggle feed filter)
- Response Rate and Awaiting are placeholder tiles (disabled, coming soon)

---

## GLOSSARY AND KEY CONSTANTS

### Form Constants (lib/wizardFormState.js)

- **EQUITY_MAP:** {'25%': 0.25, '40%': 0.40, '50%': 0.50, '60%': 0.60, '75%': 0.75}
- **THRESHOLD_MAP:** {'volume': 0.70, 'balanced': 0.80, 'precision': 0.90}
- **ENTITY_MAP:** {'individual': ['individual'], 'llc': ['llc'], 'trust': ['trust'], 'corporate': ['corporate']}

### Display Constants (BuyBoxesView.jsx, BuyBoxActivatedDialog.jsx)

- **COLUMNS:** [{ id: 'pending', title: 'Pending', sub: 'Awaiting first run' }, ...]
- **DAY_KEYS:** ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
- **DAY_LABEL:** ['M', 'T', 'W', 'T', 'F', 'S', 'S']
- **CADENCES:** [{ cadence: 'daily', time: '06:00 AM EST' }, { cadence: 'weekly', day: 'Mon', time: '07:00 AM' }, { cadence: 'realtime' }]

### Taxonomy (lib/buyBoxTaxonomy.js)

- **10 Asset Classes (MVP):** self_storage, multifamily, mobile_home_rv, residential_sfr, land, industrial, retail, gas_station_c_store, office, special_purpose
- **Asset Class Structure:** { slug, label, subtypes: [{code, label}, ...] }
- **Land Sub-Assets:** urban_infill, suburban_fringe, agricultural_rural, path_of_growth
- **LAND_SUB_ASSETS:** [{ slug, label }, ...]
- **MAJOR_METROS:** ['Austin, TX', 'Dallas, TX', ...] (sample list)

### API Endpoints

- **POST /api/dealfeed/buy-boxes:** Create buy box (accept full PATCHABLE_FIELDS set)
- **PATCH /api/dealfeed/buy-boxes/:id:** Update buy box (accept full PATCHABLE_FIELDS set)
- **POST /api/dealfeed/buy-boxes/preview:** Debounced preview request (return { estimated_count })
- **GET /api/dealfeed/geo/counties?states=TX,CA:** Fetch counties for selected states (return [{state, county}, ...])

---

## SUMMARY: TAGGING LEGEND

Throughout this document:
- **[PORT]** = Capability exists in source, replicate its behavior
- **[CUT]** = Deliberately excluded from curated build
- **[BUILD]** = New feature not in source, must be built to spec

Current curation:
- [PORT] Target, Profile (physical only), Owner (flags only), Location, Threshold, Activate pages
- [CUT] Distress signals step (12 cards, AND/OR logic, distress floor)
- [CUT] Financial subsection (assessed value, equity presets, price-per-unit, improvement-to-land, development-potential)
- [CUT] ZIP code geography selector
- [CUT] Equity stat cell in right rail (becomes 2-cell trio: hold + occupancy)
- [BUILD] Per-day Monday-Sunday schedule editor in Activate step

