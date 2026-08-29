# CODE MAP: Buy Box Configurator

**Purpose**: A jump-to-reference index mapping each curated capability to its source location in the Nightdrop Dashboard codebase. Designed for an engineering team rebuilding this system in a different platform and domain.

**Status**: This document describes the current Nightdrop Dashboard code (as of 2026-05-20) and exactly which parts map to the CURATED BUILD (management + configurator).

**Audience**: Developers replicating these features in a new codebase. This is NOT npm-install code; it is BEHAVIOR TO REPLICATE.

---

## Part 1: Feature-to-Source Master Index

Each row maps a capability to its implementation. Tags:
- **[PORT]** - exists in source, replicate its behavior exactly
- **[CUT]** - deliberately excluded from the new build (see Part 2 for removal ranges)
- **[BUILD]** - does not exist in source, must be built new to spec

| # | Capability | File | Lines | Tag | Notes |
|---|---|---|---|---|---|
| 1 | Kanban board skeleton | `views/BuyBoxesView.jsx` | 24-30, 452-467 | [PORT] | COLUMNS const defines 5 lanes (pending, validating, active, paused, gap). Render loop 454-466 iterates COLUMNS and passes items per column. |
| 2 | Column data grouping | `views/BuyBoxesView.jsx` | 391-398 | [PORT] | `grouped` memo groups buyBoxes by derived column using deriveColumn(). Status mapping 24-30. |
| 3 | Column status derivation | `views/BuyBoxesView.jsx` | 33-40 | [PORT] | `deriveColumn()` normalizes box.status, handles coverage_failed, maps to 5 lane IDs. |
| 4 | Drag-and-drop handlers | `views/BuyBoxesView.jsx` | 417-424 | [PORT] | `handleDragStart` sets boxId via dataTransfer. `handleDrop` reads it, validates gap rejection, maps colId to newStatus, calls patchBuyBox(). |
| 5 | Card delivery count | `views/BuyBoxesView.jsx` | 241-286 | [PORT] | BuyBoxCard line 246 renders box.deals as bb-card__big. Line 277-282 renders weekly delta (thisWeek) if > 0. |
| 6 | Card sparkline | `views/BuyBoxesView.jsx` | 106-126, 284 | [PORT] | Sparkline component 106-126. Renders SVG polyline + filled area. Card passes box.deliveredSpark data array. |
| 7 | Card asset-class chip | `views/BuyBoxesView.jsx` | 72-81, 289-291 | [PORT] | `formatAsset()` uses getAssetClass() + normalizeAssetClassSlug() to resolve 10-class slug. Renders primary + extra count. |
| 8 | Card geo chip | `views/BuyBoxesView.jsx` | 45-70, 293-296 | [PORT] | `formatGeo()` derives display from geo_zips / geo_counties / geo_states. Uses MapPin icon. Returns { short, detail }. |
| 9 | Card week strip (read-only) | `views/BuyBoxesView.jsx` | 83-90, 131-145, 304 | [PORT] | DAY_KEYS/DAY_LABEL consts. WeekStrip component reads run_schedule.days array (Mon..Sun booleans), renders colored day indicators. Class .bb-week__d.is-on when day active. **FUTURE: Make editable.** |
| 10 | Card last-run timestamp | `views/BuyBoxesView.jsx` | 91-101, 299-302 | [PORT] | `formatLastRun()` parses box.last_run_at to "MMM D, HH:MM". Falls back to "Paused until fixed" for gap cards. |
| 11 | Card pause button | `views/BuyBoxesView.jsx` | 307-310, 404 | [PORT] | Active cards only. OnClick calls onPause prop, threaded to App.jsx PauseBoxConfirm modal. |
| 12 | Card resume button | `views/BuyBoxesView.jsx` | 312-315, 407-414 | [PORT] | Paused cards only. onClick handleResume async: patchBuyBox(id, {status: 'active'}) + success toast. |
| 13 | Card configure button | `views/BuyBoxesView.jsx` | 322-325, 205 | [PORT] | Pending/validating only. "Configure" text. onEdit -> navigate('/buy-boxes/:id/edit'). Also in CardMenu line 205-206. |
| 14 | Card edit-geo button | `views/BuyBoxesView.jsx` | 317-320, 218-221 | [PORT] | Gap cards only. Danger style. MapPin icon. onEditGeo -> navigate('/buy-boxes/:id/edit'). Also CardMenu 218-221. |
| 15 | Card menu (more options) | `views/BuyBoxesView.jsx` | 150-239 | [PORT] | CardMenu component. MoreHorizontal trigger opens dropdown with Edit / Pause-or-Resume / Fix geo / Delete. Delete confirms before executing deleteBuyBox(). |
| 16 | Metric boxes (left sidebar) | `components/LeftPanel.jsx` | 11-33, 144-179 | [PORT] | MetricTile component. Grid 4 tiles: New This Week (TrendingUp, green, clickable), Hot Deals (Flame, orange, clickable), Response Rate (Target, blue, disabled), Awaiting (Clock, violet, disabled). Both clickable tiles toggle feedFilter. |
| 17 | KPI fetch | `App.jsx` | 262 | [PORT] | `useEffect` fetches `/api/dealfeed/deals/dashboard/kpis`. Passed to LeftPanel prop, used in metric tile render. |
| 18 | Header "New buyer search" button | `views/BuyBoxesView.jsx` | 442-444, 472-474 | [PORT] | Search icon button. onClick setShowBuyerSearch(true). Conditional render BuyerSearchComingSoonModal. Destination TBD. |
| 19 | Header "New buy box" button | `views/BuyBoxesView.jsx` | 445-447 | [PORT] | Plus icon, primary style. onClick onCreate -> navigate('/buy-boxes/new'). |
| 20 | Stepper/timeline | `components/BuyBoxWizard.jsx` | 339-354 | [PORT] | Renders STEPS 19-27 (7 steps). Each step button shows step-num (00–07 formatted), label, active/done class. Can jump backward to completed steps. Backward jump only 344. |
| 21 | Wizard steps definition | `components/BuyBoxWizard.jsx` | 19-27 | [CUT] partially; renumber after cutting step 4 (Distress). Currently 7 steps: Target, Profile, Owner, Distress, Location, Threshold, Activate. After cut, becomes 6. |
| 22 | Wizard page 1: Target | `components/BuyBoxPage1.jsx` | 159-573 | [PORT] | Header 307-315. Section A Asset Class 317-329. Section B Geography (geo block) 400-571. Handles states combo 410-441, counties/metros segment 443-544, ZIP input 547-571. |
| 23 | Asset class selector | `components/BuyBoxPage1.jsx` | 139-157, 324-328 | [PORT] | AssetClassCard component 139-157. One-at-a-time selection. Grid render 324-328. toggleAsset 193-202: radio button behavior, clears subtypes/sub_assets. |
| 24 | Sub-asset (non-land) chips | `components/BuyBoxPage1.jsx` | 368-398 | [PORT] | Section conditional 368 if selectedClass && !isLand. Up to 3 selected max line 206, 374. Render 376-393. toggleSubtype 204-209 prevents selection beyond cap. |
| 25 | Land sub-asset selector | `components/BuyBoxPage1.jsx` | 331-366 | [PORT] | Section conditional 331 if selectedClass && isLand. LAND_SUB_ASSETS from taxonomy. toggleSubAsset 211-230 includes auto-populate acres on select. Render 339-361. No cap. |
| 26 | Geography: states combo | `components/BuyBoxPage1.jsx` | 410-441 | [PORT] | Searchable combobox. List filtered by input query. Checkbox per state, count. toggleState 232-248 adds/removes state, purges counties if state removed. |
| 27 | Geography: counties selector | `components/BuyBoxPage1.jsx` | 454-506 | [PORT] | Conditional on geoTab === 'counties'. Disabled if no states selected. Fetch triggers 176-187 api.get('/api/dealfeed/geo/counties?states='). toggleCounty 250-261 uses state:county composite key. |
| 28 | Geography: metros selector | `components/BuyBoxPage1.jsx` | 507-543 | [PORT] | Conditional on geoTab === 'metros'. MAJOR_METROS const filtered by query OR by selected-state affinity. toggleMetro 263-273. |
| 29 | Geography: ZIP input | `components/BuyBoxPage1.jsx` | 547-571 | [CUT] | "Specific ZIP codes, optional" section lines 547-571. Chip input with 5-digit validation. addZip function 275-290. Remove entirely; redirect geo focus to states/counties/metros. |
| 30 | Wizard page 2: Profile | `components/BuyBoxPage23.jsx` | 67-274 | [PORT] | Header 102-110 "02/07 > Property profile" / "Spec the asset." Section A Physical 113-221, Section B Financial 223-271. |
| 31 | Page 2 physical profile | `components/BuyBoxPage23.jsx` | 113-221 | [PORT] | Building size, acreage, lot size, year, building class chips, stories, units, beds, baths, lot dims, construction/foundation/roof/garage fields. All conditional per classSchema(assetClass). |
| 32 | Page 2 financial section | `components/BuyBoxPage23.jsx` | 223-271 | [CUT] | Assessed value, minimum owner equity presets (25/40/50/60/75%), price-per-unit-max, improvement-to-land-max, development-potential-min. Lines 223-271 entire section. Remove; flip grid 112 to 1fr (single column). Also remove from buildFilters 48-56, buildSummary 93-94, clearFilter 280. |
| 33 | Wizard page 3: Owner | `components/BuyBoxPage23.jsx` | 310-390 | [PORT] | Header 325-333 "03/07 > Owner profile" / "Who owns it?" Section A Ownership 335-389. Entity type, hold period, out-of-state, absentee, tax-delinquent, active-foreclosure toggles. |
| 34 | Page 3 owner entity selector | `components/BuyBoxPage23.jsx` | 343-354 | [PORT] | OwnerChips component. Any/Individual/LLC-Entity/Trust/Corporate. Single-select radio. |
| 35 | Page 3 hold period input | `components/BuyBoxPage23.jsx` | 356-358 | [PORT] | Range input for hold_min / hold_max years. |
| 36 | Page 3 out-of-state toggle | `components/BuyBoxPage23.jsx` | 360-365 | [PORT] | Boolean toggle. |
| 37 | Page 3 absentee toggle | `components/BuyBoxPage23.jsx` | 366-371 | [PORT] | Boolean toggle. |
| 38 | Page 3 tax-delinquent flag | `components/BuyBoxPage23.jsx` | 372-377 | [PORT] | ToggleRow. Toggled via signals array (not a direct owner field). Kept as owner flag. |
| 39 | Page 3 active-foreclosure flag | `components/BuyBoxPage23.jsx` | 378-387 | [PORT] | ToggleRow. Toggled via signals array. Kept as owner flag. |
| 40 | Wizard page 4: Distress signals | `components/BuyBoxPage4.jsx` | 107-204 | [CUT] ENTIRELY | 12 signal cards (pressure/flag/urgent tiers). AND/OR toggle. Distress score floor (0-100) preset buttons. All of BuyBoxPage4.jsx is deleted. Remove import line 6 in BuyBoxWizard.jsx. Adjust renderPage switch (now 297-304 becomes 297-303). Update STEPS renumber 19-27. Update buildFilters 62-64, buildSummary 100, clearFilter 285-287, filterKey 171-177. See Part 2. |
| 41 | Wizard page 5: Location | `components/BuyBoxPage5.jsx` | 1-332 | [PORT] renumbered | Location & risk. Utilities (water/sewer/electricity/gas) toggles. Risk (floodplain/wetlands toggles, opp-zone tri, TIF tri). Class-specific (AADT slider for commercial, etc.). Becomes step 4 after distress cut. |
| 42 | Page 5 utilities toggles | `components/BuyBoxPage5.jsx` | A Utilities section | [PORT] | Water, sewer, electricity, gas as individual toggles. Stored in form.utils.{water,sewer,electricity,gas}. |
| 43 | Page 5 risk section | `components/BuyBoxPage5.jsx` | B Risk section | [PORT] | Exclude floodplain, wetlands. Opportunity zone (tri-state: any/yes/no). TIF district (tri-state). |
| 44 | Page 5 class-specific rules | `components/BuyBoxPage5.jsx` | C Class-specific section | [PORT] | Road frontage (land), AADT slider (commercial with heat gradient), corner lot (retail), pool/elevator/renter%/LIHTC (MF), REIT/foreclosure-history (self-storage), assemblage/ETJ/zoning/future land use (land). Conditional per classSchema(). |
| 45 | Wizard page 6: Threshold | `components/BuyBoxPage6.jsx` | 1-71 | [PORT] renumbered | Match threshold. 3 cards: Volume (70%), Balanced (80%), Precision (90%). Becomes step 5 after distress cut. Estimate pool math 19. |
| 46 | Threshold cards | `components/BuyBoxPage6.jsx` | 41-58 | [PORT] | THRESHOLDS const 1-11. Each card shows pct, title, sub, desc, radio. Classes .threshold-grid / .threshold / .threshold-pct / -title / -sub / -desc / -radio. |
| 47 | Wizard page 7: Activate | `components/BuyBoxPage7.jsx` | 1-101 | [PORT] renumbered | Review & activate. Name input, filters review, delivery cadence, activate button. Becomes step 6 after distress cut. |
| 48 | Activate: name input | `components/BuyBoxPage7.jsx` | 27-45 | [PORT] | review-name-input class. form.name. onChange updates form.name. Placeholder text. |
| 49 | Activate: filters review | `components/BuyBoxPage7.jsx` | 47-61 | [PORT] | buildSummary() array. Maps to chips. Edit button jumps to step 1. |
| 50 | Activate: cadence selector | `components/BuyBoxPage7.jsx` | 63-84 | [PORT] | CADENCES const 4-8. 3 cards: Daily (06:00 AM EST), Weekly (Mon 07:00 AM), Real-time (No SLA). Radio selector. |
| 51 | Activate: activate button | `components/BuyBoxPage7.jsx` | 95-97 | [PORT] | "Activate buy box" (zap icon). Calls handleActivate. Disabled if activating || !form.name.trim(). |
| 52 | Activation success dialog | `components/BuyBoxActivatedDialog.jsx` | 45-167 | [PORT] | Portal overlay. Eyebrow "Buy box activated", title "You're hunting." Display box.label. Grid 3 cells: Match pool, First drop, Cadence. Two buttons: "Return to dashboard" + "Build another". Focus trap lines 56-87. |
| 53 | Dialog match pool cell | `components/BuyBoxActivatedDialog.jsx` | 119-128 | [PORT] | Cell displays matchCount (or dashes if null), "properties tracked" sub. |
| 54 | Dialog first drop cell | `components/BuyBoxActivatedDialog.jsx` | 130-134 | [PORT] | formatFirstDrop() 28-43 derives next run day based on run_schedule.days array. Displays time + sub ("Friday morning", "tomorrow morning", etc.). |
| 55 | Dialog cadence cell | `components/BuyBoxActivatedDialog.jsx` | 136-142 | [PORT] | deriveCadence() 17-24. Shows cadence label + max per drop. |
| 56 | Dialog "Build another" action | `components/BuyBoxActivatedDialog.jsx` | 154-161, BuyBoxWizard 322-327 | [PORT] | onClick onBuildAnother resets wizard state: setSubmitted(false), setPage(1), setForm(NATIVE_FORM). |
| 57 | Right-rail live clock | `components/BuyBoxRightRail.jsx` | 62-68 | [PORT] | .rail-tick displays HH:MM:SS. Updates via setInterval every 1000ms lines 37-43. |
| 58 | Right-rail match pool | `components/BuyBoxRightRail.jsx` | 70-92 | [PORT] | SlotMachineCounter component renders matchCount. Displays previewState (idle/spinning/resolved/error). Delta + pulse on count change 45-55, 72-82. |
| 59 | Right-rail stat-trio | `components/BuyBoxRightRail.jsx` | 94-110 | [PORT] initially; (3-cell after cut) | Min equity, Hold period, Occupancy cells. deriveStatTrio() 6-25 pulls from form.fin.equity_preset / form.owner.hold_min/hold_max / form.owner.occupancy. **AFTER FINANCIAL CUT:** loses equity cell, becomes 2-cell (hold + occupancy only) OR restructured per rebuild spec. |
| 60 | Right-rail geo concentration | `components/BuyBoxRightRail.jsx` | 112-129 | [PORT] | Geographic concentration block. Shows selected states grid with dots + state codes. Conditional render if geoStates.length > 0. |
| 61 | Right-rail active filters | `components/BuyBoxRightRail.jsx` | 131-156 | [PORT] | Active filters chip list. Each chip shows label + value + remove (x) button. Calls onRemoveFilter(f.id). Chips include all buildFilters() results. |
| 62 | Wizard form state | `lib/wizardFormState.js` | ~373 lines | [PORT] | EMPTY_FORM constant. nativeToPayload(form) builds backend API payload. toNativeForm(box) hydrates form from edit mode. All form shape + payload transforms. |
| 63 | Wizard preview request | `components/BuyBoxWizard.jsx` | 180-232 | [PORT] | filterKey memo (164-178) triggers preview request debounce 400ms (202-224). Calls api.post('/api/dealfeed/buy-boxes/preview', payload). Sets previewState (spinning/resolved/error). AbortController pattern prevents stale responses. |
| 64 | Wizard activation payload | `components/BuyBoxWizard.jsx` | 247-266 | [PORT] | handleActivate async. Calls nativeToPayload(form). Routes to POST /buy-boxes (create) or PATCH /buy-boxes/:id (edit). Sets submitted + activatedForm on success. Toast on error. |
| 65 | Schedule day array (read-only) | `views/BuyBoxesView.jsx` + `components/BuyBoxActivatedDialog.jsx` | 83-90, 19-20 | [PORT] mostly | run_schedule.days is boolean array [mon,tue,wed,thu,fri,sat,sun] or shortened [mon] etc. Read by WeekStrip, deriveCadence, formatFirstDrop. **Future: Make editable.** |
| 66 | Per-day editable schedule | None yet | - | [BUILD] NEW | A true Monday-Sunday toggle picker. Must appear in: (a) wizard Activate step (right-rail or main), (b) management card quick-edit modal. Writes run_schedule.days array (7 booleans, Mon..Sun order). See spec below. |

---

## Part 2: Curated Cut List

The following three subsystems are **deliberately excluded** from the new build. Exact removal ranges are listed to aid code search.

### CUT 1: ZIP Code Filtering

**Reason**: Geo focus narrows to states, counties, metros only. ZIP selection removed as an optional refinement.

**Removal scope**:
- `components/BuyBoxPage1.jsx` lines 547-571 (entire ZIP input section)
- `components/BuyBoxPage1.jsx` line 164 (zipInput state)
- `components/BuyBoxPage1.jsx` lines 275-290 (addZip function)
- `lib/wizardFormState.js`: remove geo.zips from EMPTY_FORM, nativeToPayload, toNativeForm
- `components/BuyBoxWizard.jsx` line 47 (buildFilters ZIP chip)
- `components/BuyBoxWizard.jsx` line 88 (buildSummary ZIP line)
- `components/BuyBoxWizard.jsx` line 279 (clearFilter 'zips' case)

**Payload impact**: nativeToPayload no longer includes geo.zips. Backend accept but ignores if sent.

---

### CUT 2: Financial Filtering (Assessed Value + Equity Presets + Price-Per-Unit + Improvement-to-Land + Dev Potential)

**Reason**: MVP financials are out of scope. Profile page focuses on physical envelope only. Owner equity filtering removed; only owner profile flags remain.

**Removal scope**:
- `components/BuyBoxPage23.jsx` lines 223-271 (entire "B Financial" section)
- `components/BuyBoxPage23.jsx` line 112 (grid template columns: remove 1fr second column, keep single 1fr)
- `lib/wizardFormState.js`: remove fin.price_min, fin.price_max, fin.equity_preset, fin.price_per_unit_max, fin.improvement_to_land_max, fin.development_potential_min from EMPTY_FORM, nativeToPayload, toNativeForm
- `components/BuyBoxWizard.jsx` lines 48-56 (buildFilters equity + price lines)
- `components/BuyBoxWizard.jsx` lines 93-94 (buildSummary price + equity lines)
- `components/BuyBoxWizard.jsx` line 280 (clearFilter 'equity' case)
- `components/BuyBoxRightRail.jsx` lines 6-25 (deriveStatTrio equity logic)
- `components/BuyBoxRightRail.jsx` lines 94-100 (stat-trio equity cell), then restructure remaining to 2 cells (hold + occupancy) OR per new spec

**Payload impact**: fin object shrinks to empty or removed. Page 2 grid becomes single column. Right-rail stat-trio loses equity cell.

---

### CUT 3: Distress Signals Scoring (12 Cards + AND/OR Logic + Score Floor)

**Reason**: Distress scoring machinery (signal cards, logic selector, score floor) cut entirely. Owner-level flags (tax-delinquent, active-foreclosure) are kept as plain toggles on Page 3.

**Removal scope**:
- `components/BuyBoxPage4.jsx` (entire file, ~204 lines)
- `components/BuyBoxPage4.jsx` lines 5-105 (SIGNALS const with 12 signal definitions)
- `components/BuyBoxWizard.jsx` line 6 (import BuyBoxPage4)
- `components/BuyBoxWizard.jsx` lines 19-27 (STEPS array: delete step 4 "Distress", renumber remaining)
- `components/BuyBoxWizard.jsx` lines 300 (switch case 4 deleted)
- `components/BuyBoxWizard.jsx` lines 62-64 (buildFilters distress lines)
- `components/BuyBoxWizard.jsx` line 100 (buildSummary signals line)
- `components/BuyBoxWizard.jsx` lines 285-287 (clearFilter signals + logic cases)
- `components/BuyBoxWizard.jsx` lines 172-174 (filterKey distress_floor)
- `lib/wizardFormState.js`: remove signals[], logic, distress_floor from EMPTY_FORM, nativeToPayload, toNativeForm

**Payload impact**: form.signals, form.logic, form.distress_floor are all removed. Wizard steps renumber from 7 to 6.

**Owner-level flags preserved**: form.owner.tax_delinquent and form.owner.active_foreclosure remain as toggles on Page 3 (kept as boolean owner flags, not signals).

---

## Part 3: Build-New Feature Spec

### Per-Day Editable Schedule Picker

**Requirement**: A true Monday-Sunday day-of-week selector that lets users toggle any subset of 7 days, persisting as run_schedule.days array.

**Current behavior (to replace)**:
- Page 7 only offers cadence radio buttons: Daily (7 days), Weekly (1 day Monday), Real-time (0 days)
- run_schedule.days is derived from cadence, NOT editable
- Management card shows read-only WeekStrip (buyBoxes.css .bb-week / .bb-week__d)

**New behavior**:
1. **Wizard Activate step (Page 6, after cut)**:
   - Below the cadence cards, add a collapsible or persistent "Custom schedule" section
   - 7 toggle buttons arranged Mon-Sun, label each day
   - Styled per existing toggle component (toggle.css classes)
   - Clicking a day toggles form.delivery.days[dayIndex]
   - Cadence selector changes days: selecting Daily/Weekly populates defaults; selecting custom pins control to user

2. **Management card quick-edit**:
   - Add a "Schedule" action to CardMenu or a dedicated "Edit schedule" modal
   - Shows same Mon-Sun picker
   - PATCH /api/dealfeed/buy-boxes/:id with { run_schedule: { days: [mon,tue,...,sun] } }
   - Success toast + card WeekStrip updates

3. **Form shape**:
   - form.delivery.days = [boolean, boolean, ..., boolean] length 7, Mon-Sun order
   - nativeToPayload converts form.delivery to backend run_schedule shape

4. **Backend contract**:
   - run_schedule.days is an array of 7 booleans or subset of day names ['mon','tue',...,'sun']
   - Backend matcher honors custom schedules; cadence is derived for display only

5. **Visual anchors** (existing classes to build on):
   - .bb-week / .bb-week__d (read-only week strip CSS, repurpose for new editable version)
   - .toggle (existing toggle component style)
   - .preset-row / .preset-chip (existing chip row layout)

**Acceptance criteria**:
- User can toggle any 1-7 days in wizard and management
- run_schedule.days array persists on create + edit
- Card WeekStrip updates after PATCH
- Cadence selector integrates: selecting Daily/Weekly auto-populates days, custom mode locks control to picker

---

## Part 4: Structural Patterns (Reusable Across Any Domain)

The following implementation patterns are domain-agnostic and transfer directly:

| Pattern | File | Lines | Usage |
|---|---|---|---|
| Form state machine via setter | `components/BuyBoxWizard.jsx` | 135-400 | Single setForm() manages all fields. Validates canGoNext per step. Debounces preview. Easy to reuse. |
| Drag-and-drop via dataTransfer | `views/BuyBoxesView.jsx` | 417-424 | Vanilla HTML5 DnD. No deps. setData on start, getData on drop. Pattern works for any card-based UI. |
| Debounced async request | `components/BuyBoxWizard.jsx` | 202-224 | setTimeout + AbortController prevents stale responses. Generic pattern for live-preview or search-as-you-type. |
| Right-rail live stats | `components/BuyBoxRightRail.jsx` | 27-160 | Clock ticker + delta pulse + filter chip strip + geo grid. Reusable for any configurator sidebar. |
| Tri-state toggle | `components/BuyBoxPage5.jsx` | 13-33 | null / true / false selector. TriToggle component. Useful for "Any/Yes/No" filters. |
| Combo (searchable dropdown) | `components/BuyBoxPage1.jsx` | 410-543 | Reusable UI pattern: search input + filtered list + checkbox. No external combobox library. |
| Portal modal (focus trap) | `components/BuyBoxActivatedDialog.jsx` | 99-167 | createPortal overlay with Escape key + Tab trap + focus restore. Accessible pattern. |
| Immutable form updates | Throughout | - | All setForm() calls use spread operator. { ...form, nested: { ...form.nested, field: value } }. Zero mutations. |

---

## Part 5: CRE-Domain Specifics (Will Be Replaced)

The following content is Nightdrop Dashboard specific and must be reskinned for the new domain:

| Element | Current | New |
|---|---|---|
| Asset classes | 10 CRE classes (self_storage, multifamily, etc.) | Domain-specific categories (e.g., equipment, documents, users, features) |
| Sub-assets | ATTOM use codes + taxonomy | Domain-specific sub-categories |
| Geography filter | States, counties, metros, ZIP | Domain-specific regions/segments |
| Metrics | Delivered count, weekly delta, sparkline | Domain-specific KPIs |
| Owner profile | Entity type, hold period, absentee, out-of-state | Domain-specific audience/account attributes |
| Physical profile | Sqft, acreage, year built, building class | Domain-specific object attributes (e.g., file size, document age, version) |
| Risk / Location flags | Floodplain, opportunity zone, TIF, utilities | Domain-specific flags (e.g., compliance risk, audit status, deprecation) |
| Cadence | Daily, Weekly, Real-time delivery | Domain-specific schedule semantics |

All logic around these is structural; only the label strings, icon choices, and range validators change.

---

## Part 6: Notes for the Rebuilding Team

### Do NOT Copy-Paste Code
This is a **behavior specification**, not a code package. The UI layout, interactions, state management, and API contracts are what to replicate, not the JSX.

### API Contract Assumptions
The rebuild assumes:
1. Backend accepts POST /buy-boxes (create) and PATCH /buy-boxes/:id (edit) with a unified payload
2. GET /buy-boxes returns buy box records with: id, label, status, asset_class, geo_states, geo_counties, geo_metros, run_schedule, last_run_at, deals, deliveredThisWeek, deliveredSpark, etc.
3. POST /buy-boxes/preview returns { estimated_count }
4. GET /geo/counties?states=TX,CA returns { counties: { TX: [...], CA: [...] } }
5. All IDs are UUIDs (never parseInt)
6. run_schedule.days is Mon-Sun ordered boolean array or day-name subset

Adjust endpoints to your backend.

### Styling
The rebuild must define its own design system. Current Nightdrop uses:
- Design tokens in `src/styles/tokens.css` (--green, --warning, --danger, font Manrope)
- Kanban: `src/styles/buyBoxes.css` (~3,900 lines, global overrides)
- Wizard: `src/styles/buy-box-wizard.css` + `buy-box-wizard-pages.css`

Replicate the **component structure**, not the exact CSS classes.

### Testing Strategy
For the new build, test:
1. **Drag-and-drop**: Card moves between lanes, PATCH fires correctly
2. **Wizard flow**: All 6 steps render, state persists across pages, form validation on canGoNext
3. **Preview debounce**: Rapid input changes only fire one network request
4. **Activation**: Success dialog displays, "Build another" resets form
5. **Schedule editing**: Toggling days updates run_schedule.days array
6. **Right-rail**: Live clock ticks, filter chips update on form change, geo grid renders selected states

### Handoff Checklist
- [ ] Understand all 6 wizard steps and skip the Distress page entirely
- [ ] Confirm backend supports run_schedule.days array (7 booleans, Mon-Sun)
- [ ] Build per-day schedule editor (new feature, not in original source)
- [ ] Remove ZIP, Financial, and Distress subsystems completely
- [ ] Test drag-and-drop with all 5 lane states
- [ ] Verify activation dialog "Build another" resets correctly
- [ ] Populate metric KPIs from your domain's dashboard endpoint
- [ ] Update all icons, colors, text to match new platform brand

---

**Document version**: 2026-06-30
**Source repo**: nightdrop-dashboard, branch main, commit 6b692a2
**Audience**: Engineering team, rebuilding in new platform
