# Data + API Contract: Buy Box Management & Configurator

Reference implementation: Nightdrop Dashboard, 2026-05-20 MVP.

This document is written for a team rebuilding the feature in a different codebase. It specifies:
- The HTTP request wrapper contract
- Every endpoint in scope, with response shapes
- Payload shapes for create/patch, annotated to show which fields survive the cut
- The run_schedule.days model and how cadence maps to it
- Optimistic update patterns and known gaps
- Structural patterns (reusable) vs domain specifics (CRE example content)

---

## 1. HTTP Request Wrapper

**File:** `src/lib/api.js` (lines 1-51)

### Contract: `request(path, options = {})`

```javascript
// Base URL: empty string means same-origin (routes through dev proxy)
const BASE = import.meta.env.VITE_API_BASE_URL || '';

// Auth: Bearer token read from localStorage, always included in Authorization header
// Token key: 'nd_token' (storage key specific to this project)

// Success: res.status 2xx → parse JSON response
// 401: Clear token, redirect to /login (automatic)
// Non-2xx: Parse error JSON, throw Error with { status, body }

// Cancellation: Supports AbortController via options.signal
```

### Public API

```javascript
export const api = {
  get: (path, opts = {}) => request(path, { ...opts }),
  post: (path, body, opts = {}) => request(path, { method: 'POST', body: JSON.stringify(body), ...opts }),
  patch: (path, body, opts = {}) => request(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: (path, opts = {}) => request(path, { method: 'DELETE', ...opts }),
};
```

### Error Shape

```javascript
{
  message: 'human-readable error text from backend',
  error: 'fallback if message missing',
  status: <HTTP status code>,
  body: <full parsed JSON response>
}
```

### Authentication

```javascript
// Helpers
export function setToken(token) { localStorage.setItem('nd_token', token); }
export function clearToken() { localStorage.removeItem('nd_token'); }
```

**Structural note:** The request wrapper is a generic HTTP client. The domain value is the token key `'nd_token'` and the 401 redirect URL `/login`.

---

## 2. Endpoints in Scope

### 2.1 Buy Box CRUD

#### GET /api/dealfeed/buy-boxes
List all buy boxes for the authenticated subscriber.

**Response:**
```javascript
{
  buy_boxes: [
    {
      // Identity
      id: <UUID string>,
      label: 'Search name',
      
      // Status + metadata
      status: 'pending' | 'validating' | 'active' | 'paused' | 'coverage_failed',
      created_at: '2026-05-20T14:30:00Z',
      updated_at: '2026-05-20T14:30:00Z',
      last_run_at: '2026-05-20T06:00:00Z' | null,
      
      // Metrics (read-only, set by nightly agent)
      deals: <count of all delivered>,
      deliveredThisWeek: <count this week>,
      deliveredSpark: [28, 31, 25, 19, 22, ...] | null,  // 7-30 point sparkline
      
      // Asset class (10 classes, single)
      asset_class: 'multifamily' | 'self_storage' | ... (see taxonomy),
      asset_use_codes: [101, 102, 103],  // integer codes within the class
      
      // Geography (multi-mode, priority: county > city > zip > radius > state)
      geo_states: ['TX', 'CA'],
      geo_counties: ['Travis', 'Bastrop'],  // unqualified county names
      geo_cities: ['Austin, TX', 'Denver, CO'],  // metro strings
      geo_zips: ['78701', '78702'],
      
      // Physical envelope (ranges, null = no filter)
      sf_min: 5000, sf_max: 50000,
      acres_min: 1, acres_max: 100,
      lot_sf_min: 5000, lot_sf_max: null,
      year_built_min: 1980, year_built_max: 2010,
      stories_min: 1, stories_max: 5,
      units_min: 20, units_max: 100,
      bedrooms_count_min: 1, bedrooms_count_max: 3,
      bath_count_min: 1, bath_count_max: 2,
      lot_width_min: 50, lot_depth_min: 100,
      building_classes: ['A', 'B'],  // subset of ['A', 'B', 'C']
      construction_types: ['wood_frame', 'concrete'],
      foundation_types: ['slab_on_grade'],
      roof_types: ['asphalt', 'metal'],
      garage_types: ['attached', 'detached'],
      
      // Financial (value in dollars, equity in %)
      value_min: 500000, value_max: 5000000,
      min_equity_pct: 25,  // UI round-trip, 0-100 integer
      min_equity_dollar: 125000,  // matcher-active, derived from pct * value_min
      price_per_unit_max: 150000,  // for multifamily / mobile home
      improvement_to_land_max: 2.5,  // for land
      development_potential_min: 50000,  // for land
      
      // Owner (entity, hold period, flags)
      owner_types: ['individual'] | ['llc'] | ['trust'] | ['corporate'] | null,
      absentee_only: false,
      out_of_state_only: false,
      hold_period_min: 2, hold_period_max: 10,  // years
      
      // Distress signals (12 options, AND/OR combos)
      distress_signals: ['tax-delinquent', 'active-foreclosure'],  // subset of 12
      distress_only: true,  // true if signals.length > 0
      distress_match_mode: 'OR' | 'AND',
      distress_score_min: 40,  // 0-100 floor
      
      // Utilities (all boolean)
      water_service_required: false,
      sewer_service_required: false,
      electricity_nearby_required: false,
      gas_pipeline_nearby_required: false,
      
      // Location / risk (mostly tri-state, some boolean)
      flood_exclude: false,
      opportunity_zone: true | false | null,  // tri-state
      wetlands_exclude: false,
      tif_district: false | true | null,  // tri-state
      in_etj: true | null,  // tri-state
      corner_lot_required: false,  // for retail/office
      assemblage_potential: false,  // for land
      aadt_min: 10000,  // annual average daily traffic, for commercial
      road_frontage_min_ft: 100,  // for land
      road_frontage_max_ft: 500,
      zoning_codes: ['C3', 'C4'],  // land
      future_land_use_codes: ['commercial', 'industrial'],  // land
      
      // Class-specific flags (tri-state + numeric)
      has_pool: true | false | null,
      has_elevator: false | null,
      pct_renter_occupied_min: 75,  // for multifamily
      mf_lihtc_flag: true | null,  // multifamily LIHTC, tri-state
      ss_is_reit_owned: false | null,  // self-storage REIT, tri-state
      ss_has_foreclosure_history: null,  // self-storage history, tri-state
      
      // Matching threshold + delivery schedule
      match_threshold: 0.70 | 0.80 | 0.90,  // volume, balanced, precision
      delivery_max_per_run: 5,  // max deals per email
      run_schedule: {
        days: ['mon', 'tue', 'wed', 'thu', 'fri']  // see run_schedule.days model below
      },
    },
    ...
  ]
}
```

#### GET /api/dealfeed/buy-boxes/:id
Fetch a single buy box (used by edit wizard).

**Response:** Single `buy_box` object (same shape as list).

#### POST /api/dealfeed/buy-boxes
**Create a new buy box.** Accepts full 91 PATCHABLE_FIELDS set.

**Current wizard behavior (as of 2026-05-20):** Wizard submits here (switched from `/onboarding` on 2026-05-20 to avoid silently dropping the 35 new MVP filter fields).

**Request body:** See section 3.1 below.

**Response:**
```javascript
{
  buy_box: { /* same shape as GET list */ }
}
```

#### PATCH /api/dealfeed/buy-boxes/:id
**Edit an existing buy box.** Accepts all 91 PATCHABLE_FIELDS plus `status` field.

**Request body:** Partial object, same field names as POST. Only provided fields are updated.

**Response:**
```javascript
{
  buy_box: { /* updated buy box */ }
}
```

#### POST /api/dealfeed/buy-boxes/preview
**Estimate the match pool count without creating/saving.** Debounced 400ms by wizard to avoid hammering the backend.

**Request body:** Non-spatial subset of the PATCHABLE_FIELDS (see section 3.2).

**Response:**
```javascript
{
  estimated_count: <integer>
}
```

**Error cases:**
- 504 Timeout: Likely a full-table scan (user provided no spatial filters). Frontend treats as `errorKind: 'timeout'`.
- 500/4xx: `errorKind: 'server'`, message supplied.

**Structural note:** The preview payload is a proper subset of PATCHABLE_FIELDS (no geo, no asset-use-code validation). This is a cost-optimization pattern.

#### DELETE /api/dealfeed/buy-boxes/:id
Soft delete a buy box.

**Response:**
```javascript
{
  deleted: true,
  id: <UUID>
}
```

---

### 2.2 Deals Feed (Management Page Metrics)

#### GET /api/dealfeed/deals/dashboard/kpis
Fetch the metrics for the four metric boxes in LeftPanel (used by BuyBoxesView indirectly via App.jsx).

**Response:**
```javascript
{
  new_this_week: <count>,
  hot_deals: <count>,
  response_rate: <float 0-100>,  // percentage
  awaiting_response: <count>
}
```

**Domain note:** These KPIs feed the metric boxes shown in the left sidebar of the management page. First two are clickable (toggle feed filters), last two are display-only.

#### GET /api/dealfeed/deals
Get the deal feed (used indirectly for sparkline data aggregation if needed).

**Response:**
```javascript
{
  deals: [
    {
      id: <UUID>,
      // ... deal fields (not detailed here; out of scope for buy-box feature)
    },
    ...
  ]
}
```

---

### 2.3 Geo Lookup (Used by Wizard Step 1)

#### GET /api/dealfeed/geo/counties?states=TX,CA
Fetch the list of counties for the selected states.

**Query params:**
- `states` (string): Comma-separated state codes (e.g., 'TX,CA,NY')

**Response:**
```javascript
{
  counties: {
    TX: ['Travis', 'Bastrop', 'Williamson', 'Hays', 'Caldwell', ...],
    CA: ['Los Angeles', 'Alameda', ...],
    ...
  }
}
```

**Domain note:** Currently covers 5 counties in Texas as MVP. Frontend exposes 51 states with mock counts (misleading; see CLAUDE.md "5-county coverage MVP" landmine).

---

## 3. Payload Shapes: Create & Patch

This section shows **exactly which fields survive the cut** and which are deliberately excluded from the curated wizard.

### 3.1 POST /api/dealfeed/buy-boxes (Create)

**Used by:** Wizard activation (line 257 in BuyBoxWizard.jsx).

**Source:** `nativeToPayload(form)` in `src/lib/wizardFormState.js` (lines 125-243).

All fields below are **[PORT]** fields - they come from the wizard in scope.

```javascript
{
  // Identity
  label: 'Buy Box Name',  // STRUCTURAL: free text, domain-specific example

  // Asset
  asset_class: 'multifamily',  // STRUCTURAL: single slug from taxonomy
  asset_use_codes: [101, 102, 103],  // STRUCTURAL: integer array, asset-class-specific
  asset_classes: ['multifamily'],  // STRUCTURAL: array form (legacy, kept for compat)
  sub_assets: ['urban_infill'] | null,  // DOMAIN: only for land class

  // Geography (optional, but ~50% of filters come from here)
  geo_states: ['TX'] | null,
  geo_counties: ['Travis', 'Bastrop'] | null,  // unqualified names only
  geo_cities: ['Austin, TX'] | null,
  geo_zips: null,  // CUT: zip section removed from step 1

  // Physical envelope (all ranges, null = no filter)
  sf_min: 5000 | null,
  sf_max: 50000 | null,
  acres_min: 1 | null,
  acres_max: 100 | null,
  lot_sf_min: 5000 | null,  // DOMAIN: new field from migration 049
  lot_sf_max: null,
  year_built_min: 1980 | null,
  year_built_max: 2010 | null,
  stories_min: 1 | null,
  stories_max: 5 | null,
  units_min: 20 | null,
  units_max: 100 | null,
  bedrooms_count_min: 1 | null,
  bedrooms_count_max: 3 | null,
  bath_count_min: 1 | null,
  bath_count_max: 2 | null,
  lot_width_min: 50 | null,
  lot_depth_min: 100 | null,
  building_classes: ['A', 'B'] | null,
  construction_types: null,
  foundation_types: null,
  roof_types: null,
  garage_types: null,

  // Financial - CUT: assessed value, owner equity presets, price-per-unit, improvement-to-land, development-potential
  // Only value_min/max pass through
  value_min: 500000 | null,
  value_max: 5000000 | null,
  min_equity_pct: 25 | null,  // UI-only round-trip (percentage 0-100 integer)
  min_equity_dollar: 125000 | null,  // matcher-active (absolute dollars)
  price_per_unit_max: null,  // CUT (no input for this in curated wizard)
  improvement_to_land_max: null,  // CUT
  development_potential_min: null,  // CUT

  // Owner (entity, hold, flags)
  owner_types: ['individual'] | null,
  absentee_only: false,
  out_of_state_only: false,
  hold_period_min: 2 | null,
  hold_period_max: 10 | null,

  // Distress - CUT ENTIRELY: the 12-signal card grid, AND/OR logic, distress_floor input
  // These fields are removed from the payload:
  // - distress_signals (array of signal ids)
  // - distress_only (boolean)
  // - distress_match_mode (string 'AND' | 'OR')
  // - distress_score_min (numeric floor 0-100)
  //
  // However, the Owner page toggles for "tax delinquent" and "active foreclosure" REMAIN
  // as owner flags (moved to the signals[] array internally for backwards compat, but
  // conceptually treated as owner attributes, not distress signals).

  // Utilities (all boolean, false = no filter)
  water_service_required: false,
  sewer_service_required: false,
  electricity_nearby_required: false,
  gas_pipeline_nearby_required: false,

  // Location / risk
  flood_exclude: false,
  opportunity_zone: true | false | null,  // tri-state
  wetlands_exclude: false,
  tif_district: true | false | null,  // tri-state
  in_etj: true | false | null,  // tri-state
  corner_lot_required: false,
  assemblage_potential: false,
  aadt_min: 10000 | null,
  road_frontage_min_ft: 100 | null,
  road_frontage_max_ft: 500 | null,
  zoning_codes: ['C3'] | null,
  future_land_use_codes: null,

  // Class-specific flags
  has_pool: true | false | null,  // tri-state
  has_elevator: null,  // tri-state
  pct_renter_occupied_min: 75 | null,
  mf_lihtc_flag: true | false | null,  // tri-state
  ss_is_reit_owned: false | null,  // tri-state
  ss_has_foreclosure_history: null,  // tri-state

  // Threshold + delivery
  match_threshold: 0.70 | 0.80 | 0.90,  // STRUCTURAL: maps cadence to matcher score
  run_schedule: { days: ['mon', 'tue', 'wed', 'thu', 'fri'] },  // STRUCTURAL: see section 4 below
  delivery_max_per_run: 5,  // STRUCTURAL: max deals per run
}
```

**Field categories:**

| Category | Dropped Fields | Notes |
|----------|---|---|
| **Distress** | distress_signals, distress_only, distress_match_mode, distress_score_min | Entire step 4 removed. Tax-delinquent + active-foreclosure toggles moved to Owner (stored in signals[] for backend compat). |
| **Geography** | geo_zips | ZIP code sub-section removed from step 1. |
| **Financial** | price_per_unit_max, improvement_to_land_max, development_potential_min, assessed_value, owner_equity_presets | Entire "B Financial" section removed. |

**Structural observation:** The payload uses flat object structure with null for "no filter" and specific values for active filters. Triple conversion cycle: form → JSON → nativeToPayload() → backend contract.

### 3.2 POST /api/dealfeed/buy-boxes/preview (Estimation)

Subset of POST create payload. Excludes slow operations (geo validation, asset-use-code verification).

```javascript
{
  // Minimal set: asset class only, all filters
  asset_class: 'multifamily',
  
  // Include filter ranges but NOT geo (geo validation is slow)
  sf_min: 5000 | null,
  sf_max: null,
  acres_min: null,
  acres_max: null,
  year_built_min: 1980 | null,
  year_built_max: null,
  units_min: 20 | null,
  units_max: null,
  
  // Other filters (owner, location, etc.)
  // ... but NOT geo_states, geo_counties, geo_cities, geo_zips
  
  // All other fields same as POST /buy-boxes
  // Omit asset_use_codes (validator is slow)
}
```

**Response:**
```javascript
{
  estimated_count: 234,
  // or on error:
  estimated_count: null,
  errorKind: 'timeout' | 'server'  // optional error classification
}
```

### 3.3 PATCH /api/dealfeed/buy-boxes/:id (Edit + Status Changes)

**Used by:** Wizard activation (edit mode), drag-and-drop status changes, pause/resume buttons.

**Request body:** Partial object. Only fields to be updated are included.

**Status patch (drag-and-drop, pause/resume):**
```javascript
{
  status: 'active' | 'paused' | 'pending' | 'validating'
}
```

**Full edit patch (wizard activation in edit mode):**
All fields from section 3.1 (same as POST create).

**Partial edit patch (e.g., quick geo fix):**
```javascript
{
  geo_states: ['TX'],
  geo_counties: ['Travis']
  // only geo fields, keep everything else
}
```

**Response:** Updated `buy_box` object.

---

## 4. run_schedule.days Model

### Contract

The `run_schedule` object holds the execution schedule as a 7-element day array:

```javascript
{
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  // or any subset, e.g.
  days: ['mon']  // weekly
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']  // daily
  days: []  // real-time (no SLA)
}
```

### Cadence Mapping (Current Source Behavior)

**File:** `src/lib/wizardFormState.js` lines 238-240

```javascript
run_schedule: form.delivery.cadence === 'weekly'
  ? { days: ['mon'] }
  : { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
```

**Current implementation is binary:**
- `form.delivery.cadence === 'weekly'` → 1 day (Monday)
- Else (daily) → 7 days (all week)
- Real-time → separately handled (delivery_max_per_run = 0 or special value?)

**Reverse mapping (edit mode):** `src/lib/wizardFormState.js` lines 366
```javascript
cadence: b.run_schedule?.days?.length === 1 ? 'weekly' : 'daily',
```

### [BUILD] Required New Feature: Per-Day Editor

**Spec:** The curated build must replace the binary cadence dropdown with a true Monday-Sunday toggleable editor.

**User interaction:**
- Wizard Step 6 (Activate): Display a 7-button grid, one per day (Mon-Sun)
- User toggles any subset of days ON
- On submit, wizard writes `run_schedule: { days: ['mon', 'wed', 'fri', ...] }` (user's selection)

**Quick-reconfigure on management card:**
- Click a card's week strip (currently read-only)
- Opens a simple overlay to toggle days
- PATCH the buy box with new `run_schedule`

**Visual reference:** `src/views/BuyBoxesView.jsx` lines 131-145 shows the read-only WeekStrip component. The new build reuses its styling (.bb-week / .bb-week__d / .is-on) but makes it editable.

**Storage:** Write the raw Monday-Sunday array directly to `run_schedule.days`. Backend expects array of day strings.

---

## 5. Optimistic Updates & Gaps

### 5.1 Pause/Resume

**Implemented:** `src/views/BuyBoxesView.jsx` lines 407-414

```javascript
const handleResume = async (id) => {
  try {
    await patchBuyBox(id, { status: 'active' });
    addToast('Search resumed - runs tonight.', 'success');
  } catch {
    addToast('Failed to resume. Try again.', 'error');
  }
};
```

**Pattern:** Fire API call, show success toast on 2xx, error toast on failure. No local state update before the response (no optimistic render).

**Gap:** If PATCH fails, the UI card still shows 'Active' even though the backend did not change. User must refresh to see true state.

### 5.2 Drag-and-Drop Status

**Implemented:** `src/views/BuyBoxesView.jsx` lines 418-424

```javascript
const handleDrop = (e, colId) => {
  const id = e.dataTransfer.getData('boxId');
  if (!id || colId === 'gap') return;
  const statusMap = { active: 'active', paused: 'paused', pending: 'pending', validating: 'pending' };
  const newStatus = statusMap[colId];
  if (newStatus) patchBuyBox(id, { status: newStatus });
};
```

**Pattern:** Same as pause/resume. No optimistic render.

**Gap:** Card visually moves between columns immediately (CSS reflow), but if PATCH fails silently, the UI column placement and backend state diverge. No rollback or error feedback.

### 5.3 Save Note (Deal Detail)

**Out of scope for buy-box feature, but mentioned in CLAUDE.md as a landmine:**

```javascript
// Pseudocode from CLAUDE.md
saveNote() {
  // optimistic update with no error catch
  // failed PATCH leaves stale UI with no feedback
}
```

### 5.4 Buy Box Create (Wizard Activation)

**Implemented:** `src/components/BuyBoxWizard.jsx` lines 247-266

```javascript
const handleActivate = async () => {
  setActivating(true);
  try {
    const payload = nativeToPayload(form);
    if (mode === 'edit' && initialData?.id) {
      await api.patch(`/api/dealfeed/buy-boxes/${initialData.id}`, payload);
    } else {
      await api.post('/api/dealfeed/buy-boxes', payload);
    }
    setActivatedForm(form);
    setSubmitted(true);  // show success dialog
  } catch (err) {
    addToast(err.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    setActivating(false);
  }
};
```

**Pattern:** Modal shows spinner while in-flight. On success, transition to BuyBoxActivatedDialog (success modal). On error, show toast and stay in wizard.

**Gap:** If user dismisses toast and retries, no dedup check. A double-submit could create two identical buy boxes. Frontend does not check for concurrent requests.

### Recommendations for New Build

1. **Optimistic render for status changes:** Update card's column placement optimistically, with visual indicator (fade, spinner). Rollback on error.
2. **Dedup on create:** Track submitted form signature. Block re-submit if same payload is in-flight.
3. **Error recovery:** Store last-failed mutation and offer "Retry" button in error toast.

---

## 6. Structural vs Domain Fields

**Structural fields** (reusable across any property-matching domain):
- `label`: Name of the saved search
- `asset_class`, `asset_use_codes`: Primary asset taxonomy
- `geo_states`, `geo_counties`, `geo_cities`, `geo_zips`: Geographic filtering
- `sf_min`, `sf_max`, `acres_min`, `acres_max`: Physical dimensions
- `year_built_min`, `year_built_max`: Age filtering
- `value_min`, `value_max`: Price/valuation range
- `owner_types`, `hold_period_min`, `hold_period_max`: Owner characteristics
- `match_threshold`: Score floor (volume / balanced / precision)
- `run_schedule.days`: Day-of-week execution schedule
- `delivery_max_per_run`: Rate limiting per run

**Domain-specific fields** (CRE context, will differ in other domains):
- `building_classes`: A/B/C classification (real estate specific)
- `construction_types`, `foundation_types`, `roof_types`, `garage_types`: Building envelope details
- `opportunity_zone`, `tif_district`, `in_etj`: Tax/regulatory incentive zones
- `flood_exclude`, `wetlands_exclude`: Environmental exclusions
- `has_pool`, `has_elevator`, `corner_lot_required`, `assemblage_potential`: CRE micro-conditions
- `aadt_min`: Traffic (commercial/retail specific)
- `pct_renter_occupied_min`, `mf_lihtc_flag`: Multifamily specific
- `ss_is_reit_owned`, `ss_has_foreclosure_history`: Self-storage specific
- `distress_signals`, `distress_only`, `distress_match_mode`, `distress_score_min`: Distress scoring (CUT from curated build)

---

## 7. Error Handling & Edge Cases

### Preview Timeout (504)

**Scenario:** User provides no geo filters. Backend runs unindexed full-table scan, times out.

**Frontend handling:** `src/components/BuyBoxWizard.jsx` lines 218-223
```javascript
catch (err) {
  if (err?.name === 'AbortError' || controller.signal.aborted) return;
  setForm(f => ({ ...f, matchCount: null }));
  setPreviewState('error');
  setErrorKind(err?.status === 504 ? 'timeout' : 'server');
}
```

**UI feedback:** Slot machine counter shows dashes, tooltip/aria-label explains timeout.

### Missing Required Fields

**Scenario:** POST /buy-boxes with empty asset_class.

**Backend response:** HTTP 400 with `{ error: 'asset_class is required' }`.

**Frontend handling:** Caught by wizard's `canGoNext()` validation. User cannot proceed past Step 1 without picking an asset class. API validation is a safety net only.

### Geo Mutation Exclusivity

**Landmine:** Backend matcher enforces one geo mode per box (priority: county > city > zip > radius > state). If user submits both counties and metros, the matcher silently ignores metros and uses counties.

**Frontend:** Wizard UI allows multi-select all four. Data is persisted, but only the highest-priority non-empty mode narrows results. This is silent drift. See CLAUDE.md for full context.

### Asset-Use-Code Fallback

**File:** `src/lib/wizardFormState.js` lines 129-136

```javascript
// If user picks an asset class but no subtype chips (empty selection), 
// fall back to every code in the class so the payload is valid.
// Empty subtypes UI = "match every type" intent.
let useCodes = form.subtypes?.length ? form.subtypes : null;
if (assetClass && (!useCodes || useCodes.length === 0)) {
  const cls = getAssetClass(assetClass);
  useCodes = cls?.subtypes?.map(s => s.code) || null;
}
```

**Pattern:** Defensive default. If no subtype selection, expand to all subtypes in the class.

---

## 8. Backend Contract Assumptions

### Migration 049 Fields

These 35 fields were added to the `df_buy_boxes` schema on 2026-05-20. They are all [PORT] (already persisted in the current backend) and included in the PATCHABLE_FIELDS list:

- `lot_sf_min`, `lot_sf_max`
- `building_classes`, `construction_types`, `foundation_types`, `roof_types`, `garage_types`
- `opportunity_zone`, `tif_district`, `in_etj`, `corner_lot_required`, `assemblage_potential`
- `aadt_min`, `road_frontage_min_ft`, `road_frontage_max_ft`
- `zoning_codes`, `future_land_use_codes`
- `has_pool`, `has_elevator`, `pct_renter_occupied_min`
- `mf_lihtc_flag`, `ss_is_reit_owned`, `ss_has_foreclosure_history`
- Plus others (see `~/nightdrop-api/routes/dealfeed/buyboxes.js::PATCHABLE_FIELDS`)

**Verified:** 2026-05-20. SQL migration may still need to be applied in production by hand.

### Taxonomy (10 Classes, Locked)

Authoritative in: `~/nightdrop-api/docs/taxonomy/mvp-buy-box-taxonomy.md`

10 classes: `self_storage`, `multifamily`, `mobile_home_rv`, `residential_sfr`, `land`, `industrial`, `retail`, `gas_station_c_store`, `office`, `special_purpose`.

**Mirror in frontend:** `src/lib/buyBoxTaxonomy.js` (STALE as of 2026-05-20 - still has 8 classes. Must be updated before new build ships.)

### Three-State Booleans

Fields that accept null, true, or false:
- `opportunity_zone`, `tif_district`, `in_etj`
- `has_pool`, `has_elevator`
- `mf_lihtc_flag`, `ss_is_reit_owned`, `ss_has_foreclosure_history`

**Semantics:** null = "no filter", true = "required", false = "excluded".

---

## 9. Testing Scenarios

### Happy Path: Create Buy Box

1. User navigates to `/buy-boxes/new`
2. Fills Step 1: picks asset class, selects states/counties
3. Fills Step 2-6 with example values
4. Hits Activate on Step 6
5. Frontend POSTs to `/api/dealfeed/buy-boxes` with full payload
6. Backend validates, creates row, returns 201
7. Frontend shows BuyBoxActivatedDialog with match pool count
8. User clicks "Return to dashboard" or "Build another"

### Happy Path: Edit Buy Box

1. User clicks Configure on a card in Pending/Validating state
2. Route to `/buy-boxes/:id/edit`
3. Wizard loads initial data via `toNativeForm()`
4. User changes a filter (e.g., adds a county)
5. Preview request fires, shows new estimated count
6. Hits Activate on Step 6
7. Frontend PATCHes to `/api/dealfeed/buy-boxes/:id` with full payload
8. Backend validates, updates row, returns 200
9. Success toast, redirect to dashboard

### Happy Path: Status Transition (Pause)

1. User clicks Pause on an Active card
2. App.jsx shows PauseBoxConfirm modal
3. User confirms
4. App.jsx calls `patchBuyBox(id, { status: 'paused' })`
5. Frontend PATCHes `/api/dealfeed/buy-boxes/:id` with `{ status: 'paused' }`
6. Backend updates status, returns 200
7. Success toast, card moves to Paused column

### Error Case: Missing Geo (Preview Timeout)

1. User picks asset class, no states
2. Moves to Step 2
3. Preview request fires, backend times out (504)
4. Frontend catches 504, sets `errorKind: 'timeout'`
5. Slot machine counter shows dashes + tooltip "Request timed out"
6. User adds a state
7. Preview request retries automatically (debounce 400ms)
8. Count resolves

---

## 10. Reference Links

| File | Purpose |
|------|---------|
| `src/lib/api.js` | HTTP wrapper |
| `src/lib/wizardFormState.js` | Payload builders, form ↔ backend conversion |
| `src/views/BuyBoxesView.jsx` | Management page (Kanban, cards, DnD) |
| `src/components/BuyBoxWizard.jsx` | Wizard shell, flow control |
| `src/components/BuyBoxPage1.jsx` | Step 1 (Target) |
| `src/components/BuyBoxPage23.jsx` | Steps 2 (Profile) + 3 (Owner) |
| `src/components/BuyBoxPage5.jsx` | Step 5 (Location / Risk) |
| `src/components/BuyBoxPage6.jsx` | Step 6 (Threshold) |
| `src/components/BuyBoxPage7.jsx` | Step 7 (Activate) |
| `src/components/BuyBoxRightRail.jsx` | Preview counter + live pool stats |
| `src/components/BuyBoxActivatedDialog.jsx` | Success modal |
| `src/contexts/DealsContext.jsx` | Data layer (buy box fetch/update) |
| `src/lib/buyBoxTaxonomy.js` | Asset class taxonomy (STALE) |
| `notes/REFERENCE.md` | Full endpoint reference |
| `~/nightdrop-api/routes/dealfeed/buyboxes.js` | Backend POST/PATCH/DELETE routes |
| `~/nightdrop-api/docs/taxonomy/mvp-buy-box-taxonomy.md` | Canonical taxonomy |

---

## Summary

The buy box feature is built on three structural pillars:

1. **HTTP wrapper** (`api.*`): Generic request/auth/error handling with Bearer token from localStorage.
2. **Payload converters** (`nativeToPayload` / `toNativeForm`): Bidirectional serialization between form state and backend PATCHABLE_FIELDS.
3. **State orchestration**: Form state in React component → preview on debounce → dashboard list via DealsContext.

The new build must preserve the API contract (all endpoints, response shapes, field names) but can restructure the UI, form flow, and internal component layout. The run_schedule.days model must support user-selected per-day toggles (a NEW [BUILD] feature). All [PORT] fields are required; all [CUT] fields should be removed from the UI; all [BUILD] features must be added.

**Next document:** Implementation roadmap and component architecture.
