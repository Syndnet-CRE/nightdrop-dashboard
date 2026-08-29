# Buy Box Management and Configurator UX Flows

**Date:** 2026-06-30  
**Version:** 2.0 (Curated from source, 6-step wizard, per-day schedule [BUILD])

---

## Overview

This document describes the curated user experience for two integrated surfaces:

1. **Buy Box Management Page** (Kanban board for browsing, pausing, resuming, configuring buy boxes)
2. **Buy Box Configurator Wizard** (6-step guided setup for creating or editing buy boxes, with live match-pool feedback)

The wizard includes one new required feature: **a per-day Mon-Sun schedule picker** that lets users control exactly which days of the week matches are delivered, replacing the read-only cadence presets with true scheduling flexibility.

Target audience: Real estate investment professionals creating targeted property deal filters.

---

## A. Buy Box Management Page

### Entry Point

User lands on the Management page from either the main dashboard sidebar or as a direct route. They see:

- **Header:** "Buy boxes" title with two action buttons
- **Sidebar metrics** (above or beside the Kanban): four metric tiles (New This Week, Hot Deals, Response Rate, Awaiting)
- **Kanban board:** Five columns representing buy box status lanes
- **Visible actions:** Pause, Resume, Configure, Edit geo

### Kanban Board Structure

**5 Lanes (fixed, left-to-right):**

1. **Pending** (sub: "Awaiting first run")  
   Buy boxes waiting for their first nightly run. Status is not yet validated. User can Configure or delete.

2. **Validating** (sub: "Coverage check in progress")  
   Buy boxes in initial coverage validation. The backend checks if the geographic filters return any parcels. User can Configure or delete.

3. **Active** (sub: "Running nightly")  
   Live buy boxes actively matching and delivering deals. The largest lane by volume. User can Pause, Configure, or view details.

4. **Paused** (sub: "Manually paused")  
   Buy boxes that were Active but paused by the user. User can Resume, Configure, or adjust geo.

5. **Coverage gap** (sub: "No parcel data for this geo")  
   Buy boxes that failed validation: the geographic filters (state, county, metro, zip) do not match any parcels in the database. This lane **rejects drag-and-drop** (attempts to drop here are cancelled with no visual feedback). User can only "Edit geo" to fix the filter.

### Buy Box Card

Each buy box appears as a draggable card with these visible elements:

**Header Row:**
- **Status dot** (circle, color-coded: gray=pending, blue=validating, green=active, yellow=paused, red=gap)
- **Label** (the buy box name, e.g. "Sun Belt SFR distress Q2 '26")

**Metrics Row:**
- **"Delivered" count** (large, prominent numeric display)  
  How many deals have been sent to this buy box in total.
- **Weekly delta** (smaller, secondary, e.g. "+8 this week")  
  How many new deals this week. Shows momentum.

**Visual Elements:**
- **Sparkline** (72px wide, 36px tall, gray stroke on transparent)  
  Seven-bar chart showing delivered deals per day of the last week. Gives at-a-glance trend.
- **Asset-class chip** (e.g. "Multifamily")  
  The primary asset class, plus "+N more" if the buy box filters multiple classes.
- **Geography chip** (e.g. "TX", "3 counties", "Austin, TX")  
  The broadest geography filter (state > county > metro > zip). Includes a map-pin icon.

**Footer Row:**
- **Last run timestamp** (e.g. "Last run: Jun 29, 14:32")  
  UTC or the account's timezone. Clarifies when matches were last generated.
- **Week strip** [PORT]  
  Seven small boxes (Mon-Sun), each toggled on or off to show which days the buy box is scheduled to run. This is **read-only** on the card (reflects `run_schedule.days` from the backend). On edit, users can reconfigure it (see Activate step).
- **Coverage alert** (gap cards only)  
  A small red alert banner on the card if in the "Coverage gap" lane, indicating "Fix geo to activate."

### Card Actions

**Right-click menu or three-dot dropdown** reveals:
- **Configure** (all statuses) - Opens the wizard in edit mode at Step 1 (Target).
- **Pause** (active only) - Triggers a confirm modal (see below). On confirm, patches the buy box status to 'paused' and refreshes.
- **Resume** (paused only) - Directly patches status to 'active' without a modal. Toast confirms.
- **Edit geo** (gap only) - Opens the wizard in edit mode at Step 4 (Location), skipping to fix the geography filters.

### Pause Confirm Modal

When user clicks Pause:
- Modal title: "Pause this buy box?"
- Body: "It will stop running nightly. Resume anytime from the dashboard."
- Two buttons: "Cancel" (closes modal) and "Pause" (primary, danger style).
- On confirm: Send PATCH `/api/dealfeed/buy-boxes/:id` with `{ status: 'paused' }`.
- On success: Card moves to Paused lane. Toast: "Buy box paused."
- On error: Toast with error message.

### Drag-and-Drop Behavior

**Setup:**
- All cards in Pending, Validating, Active, and Paused lanes are draggable.
- Cards in the Coverage gap lane are draggable OUT (can move to other lanes).
- **The Coverage gap lane REJECTS drops** (you cannot drag cards INTO the gap lane).

**Interaction:**
1. User presses and holds a card (mousedown or touch start).
2. Card becomes translucent (opacity ~50%) or lifts slightly.
3. Cursor shows a "grab" or "move" hint.
4. User drags to a different lane and releases.

**Drop Logic:**
- If dropping on Pending, Validating, Active, or Paused: Accept. Map lane ID to the new status (pending, validating, active, or paused). Send PATCH with updated status.
- If dropping on Coverage gap: Reject. Visual feedback (shake animation or invalid cursor). No API call.
- On successful drop: Card animates to its new lane. No confirmation modal needed for status changes via drag.
- On error: Toast. Card returns to original lane.

### Sidebar Metric Tiles

These four tiles appear in a left sidebar or above the Kanban (LeftPanel.jsx context).

**Tile 1: New This Week**
- Icon: Trending up (accent green)
- Value: Number (e.g. "3")
- Label: "New This Week"
- Behavior: Clickable. Toggles a feed filter showing only deals from new buy boxes. Click again to clear.
- Display: Always visible. Disabled if zero.

**Tile 2: Hot Deals**
- Icon: Flame (accent orange)
- Value: Number (e.g. "12")
- Label: "Hot Deals"
- Behavior: Clickable. Toggles a feed filter showing only "hot" or high-priority deals. Click again to clear.
- Display: Always visible. Disabled if zero.

**Tile 3: Response Rate**
- Icon: Target bullseye (accent blue)
- Value: Percentage (e.g. "68%")
- Label: "Response Rate"
- Behavior: Display-only (disabled, not clickable). Shows overall deal response rate.

**Tile 4: Awaiting**
- Icon: Clock (accent violet)
- Value: Number (e.g. "4")
- Label: "Awaiting"
- Behavior: Display-only (disabled, not clickable). Shows deals awaiting user response.

Data source: `GET /api/dealfeed/deals/dashboard/kpis`. Polled on page load.

### Header Buttons

**Top-right of the page:**

**"New buyer search"** [PORT + stub]
- Icon: Magnifying glass (Search)
- Status: Currently a **Coming Soon stub**. Clicking opens an informational modal: "Buyer search coming soon. We're building a tool to search for buyers matching your deal profile."
- Destination: TBD by product. For now, document as a placeholder button reserved for future search functionality.
- Do not remove; leave as a disabled or modal-controlled stub.

**"New buy box"** (primary, accent green)
- Icon: Plus
- Clicking navigates to `/buy-boxes/new`, opening the Configurator Wizard in **create mode** at Step 1.
- Behavior: On successful activation, returns user to Management page.

---

## B. Buy Box Configurator Wizard

### Overview

A 6-step guided creation or edit flow. Curated to remove the Distress Signals step entirely, cutting from 7 to 6 pages. Each step focuses on a specific filter category.

**Key features:**
- **Header stepper/timeline** showing all 6 steps, current step highlighted, completed steps marked as "done"
- **Right rail live match pool** updating in real-time as filters change
- **Per-day schedule picker** [BUILD] in the Activate step (Step 6)
- **Activation success dialog** appearing after submission

### Navigation

- **Forward (Next):** Keyboard shortcut Cmd+Enter / Ctrl+Enter, or click Next button
- **Backward (Back):** Keyboard shortcut Alt+Left, or click Back button
- **Jump to any previous step:** Click on a step number in the header stepper (backward jumps only; cannot skip forward)
- **Close/Cancel:** Esc key or backdrop click (if modal mode) closes the wizard and returns to Management page

### Stepper Header

Displays: `01 / 06 > [Step Label]`

Example progression:
- `01 / 06 > Target` (current, highlighted)
- `02 / 06 > Profile` (not yet started)
- `03 / 06 > Owner` (not yet started)
- Etc.

CSS classes (visual states):
- `.step` - default (not visited)
- `.step.active` - currently on this step (bold or highlighted)
- `.step.done` - completed step (checkmark or filled circle)

---

### Step 1: Target [PORT]

**Header:** "01 / 06 > Target"  
**Tagline:** "Spec the asset."

**Validation rule:** User must select at least one asset class AND at least one state before proceeding.

#### Section A: Primary Asset Class

**Display:** Single-select grid of 10 asset-class cards (from MVP taxonomy, 2026-05-20).

**Classes:**
- Self-storage
- Multifamily
- Mobile home / RV
- Residential (SFR)
- Land
- Industrial
- Retail
- Gas station / C-store
- Office
- Special purpose

**Card styling:**
- Each card shows: icon (asset-specific), label, brief descriptor (e.g. "Multifamily" / "Apartments & complexes")
- On selection: Card gains a checkmark or highlight, and the rest of the cards visually dim (but remain clickable)
- Only one asset can be primary at a time

**Behavior:**
- Clicking a different asset deselects the previous choice
- Sub-asset options (Section B) automatically reset when asset class changes

#### Section B: Sub-Asset Class (Non-Land Assets Only)

**Display:** Appears only if the primary asset is NOT land.

**Header:** "Sub-asset class (optional)"  
**Instruction:** "(up to 3 selected)"

**Chips:** Display use-codes as selectable chips. Examples for Multifamily: "Garden", "Midrise", "Highrise"; for SFR: "Freestanding", "Attached", "Manufactured". For Land: not shown.

**Behavior:**
- User can select 0-3 chips (hard cap at 3)
- Selected chips gain a background or highlight
- Deselected chips fade
- Removing all selections is valid (not required)

#### Section C: Geography

**Display:** Three tabs or segments: "States", "Counties", "Metros" (plus a ZIP section cut as per curation contract).

**Subsection C1: States**

- Combo box (searchable dropdown)
- Shows all 51 US states + territories
- User can select multiple states
- Selected states appear as pills/chips with an X to remove
- Required: At least one state must be selected to proceed

**Subsection C2: Counties vs. Metros Toggle**

- Radio buttons or segmented control: "Counties" or "Metros"
- Only one mode is active at a time
- Switching modes clears the other's selection

**Subsection C2a: Counties (if selected)**

- Fetches list from backend: `GET /api/dealfeed/geo/counties?states=[state1,state2,...]`
- Display: Searchable list of county names (format: "County Name (State)")
- User selects multiple counties
- Selected counties appear as chips

**Subsection C2b: Metros (if selected)**

- Display: Predefined list of major US metros (Austin TX, Denver CO, Phoenix AZ, etc.)
- User selects multiple metros
- Selected metros appear as chips

**Geographic exclusivity rule (backend contract):** On the backend, only the highest-priority non-empty mode is used: county > city > metro > zip > state. The wizard UI allows multi-select on all; the user may persist all data, but only one mode narrows results on the nightly run. Document this clearly with a note: "Selecting counties will override any metro filters."

#### Section D: ZIP Codes [CUT]

**Status:** This section is deliberately cut from the curated build. Do not include a ZIP input field.

**Rationale:** The MVP focuses on state/county/metro filtering. ZIP-level precision is deferred to Phase 2.

**In the codebase:** Search for `geo.zips`, `addZip`, or ZIP-related state in BuyBoxPage1.jsx and remove these elements.

---

### Step 2: Profile [PORT]

**Header:** "02 / 06 > Property profile"  
**Tagline:** "Spec the asset."

**Validation rule:** User may leave all fields blank (no required fields on Profile step).

#### Section A: Physical Properties

**Header:** "A Physical"  
**Instruction:** "Ranges are inclusive."

**Fields:**

| Field | Type | Range | Notes |
|-------|------|-------|-------|
| Building size (sqft) | Range inputs (min/max) | 0 - 9,999,999 | Applies to asset classes with building area |
| Lot size (acres) | Range inputs (min/max) | 0 - 100,000 | Land-specific; shown only for Land class |
| Sub-acre lot | Toggle (yes/no) | N/A | Land-specific |
| Year built | Range inputs (min/max) | 1800 - 2050 | |
| Building class | Chip selector (A, B, C) | Up to 3 | Conditional; shown only for asset classes that use building classes |
| Stories | Range inputs (min/max) | 1 - 50 | Conditional (Multifamily, Office, etc.) |
| Units | Range inputs (min/max) | 1 - 10,000 | Conditional (Multifamily) |
| Bedrooms | Range inputs (min/max) | 0 - 10 | Conditional (Multifamily, SFR) |
| Bathrooms | Range inputs (min/max) | 0 - 20 | Conditional (Multifamily, SFR) |
| Lot dimensions | Inputs (width/depth in feet) | 0 - 100,000 | Land-specific |
| Construction type | Chip/multi-select | See schema | Conditional |
| Foundation type | Chip/multi-select | See schema | Conditional |
| Roof type | Chip/multi-select | See schema | Conditional |
| Garage type | Chip/multi-select | See schema | Conditional |

**Conditional display logic:** Asset-class-specific fields (stories, units, beds, baths, garage, construction) are shown/hidden based on the asset class selected in Step 1. Reference the backend's `classSchema()` in `lib/buyBoxFieldSchema.js` to determine which fields appear for each class.

**Styling:**
- Range inputs: Min and max boxes side-by-side, labeled "Min" and "Max"
- Multi-select chips: Display selected chips with X to remove; unselected options dimmed

#### Section B: Financial [CUT]

**Status:** This entire section is deliberately cut from the curated build.

**What is removed:**
- Assessed value range
- Minimum owner equity presets (25%, 40%, 50%, 60%, 75%)
- Price per unit (max)
- Improvement-to-land ratio (max)
- Development potential (min)

**Side effects of the cut:**
- The right rail "stat trio" (equity/hold/occupancy) becomes a "duo" (hold/occupancy only)
- The `buildFilters()` and `buildSummary()` functions in BuyBoxWizard.jsx must remove equity-related entries
- The `clearFilter()` function removes the "equity" branch

**Rationale:** Financial filters are deferred to Phase 2. Physical-only filters are sufficient for MVP.

---

### Step 3: Owner [PORT]

**Header:** "03 / 06 > Owner profile"  
**Tagline:** "Who owns it?"

**Validation rule:** No required fields. All toggles and selections are optional.

#### Section A: Ownership

**Entity Type** (radio buttons or single-select chips: "Any", "Individual", "LLC/Entity", "Trust", "Corporate")
- User selects one entity type or "Any" (no filter)
- Default: "Any" (no selection)

**Hold Period** (range inputs: min/max years)
- Min: 0 years
- Max: 100 years
- User can specify "owns for at least X years" (min) and optionally a max hold period
- Empty = no filter

**Out-of-State** (toggle, two-state: off/on)
- Off: No filter (include in-state and out-of-state owners)
- On: Include only out-of-state owners
- Default: Off

**Absentee** (toggle, two-state: off/on)
- Off: No filter
- On: Include only absentee owners
- Default: Off

**Tax Delinquent** (toggle, two-state: off/on) [KEPT as plain owner flag]
- Off: No filter
- On: Include only properties with tax delinquent flag
- Default: Off
- **Important:** This is now treated as a plain owner flag, NOT as a distress signal. It feeds the owner filter, not the distress_signals array.

**Active Foreclosure** (toggle, two-state: off/on) [KEPT as plain owner flag]
- Off: No filter
- On: Include only properties with active foreclosure flag
- Default: Off
- **Important:** Like Tax Delinquent, this is now a plain owner flag, not a distress signal.

**Styling:**
- Entity type: Single-row chip selector (Any | Individual | LLC | Trust | Corporate)
- Hold period: Two input boxes (Min / Max)
- Toggles: Simple on/off switch or checkbox

---

### Step 4: Location [PORT, renumbered from Step 5]

**Header:** "04 / 06 > Location & risk"  
**Tagline:** "Where, and what kind of dirt?"

**Validation rule:** No required fields.

#### Section A: Utilities

**Display:** Four toggles (all optional).

- Water available (on/off)
- Sewer available (on/off)
- Electricity available (on/off)
- Gas available (on/off)

**Behavior:** User can select any combination. An "include" filter (the property must have these utilities).

#### Section B: Risk Factors

**Flood Exclusion** (toggle)
- On: Exclude properties in FEMA floodplain or flood hazard zones
- Off: No filter
- Default: Off

**Opportunity Zone** (tri-state: null/true/false)
- Null (default): No filter
- True: Include only in opportunity zones
- False: Exclude opportunity zones
- UI: Radio or toggle with three positions

**Wetlands Exclusion** (toggle)
- On: Exclude properties in or adjacent to wetlands
- Off: No filter
- Default: Off

**TIF District** (tri-state: null/true/false)
- Null (default): No filter
- True: Include only in TIF (Tax Increment Financing) districts
- False: Exclude TIF districts
- UI: Radio or toggle with three positions

**In ETJ (Extraterritorial Jurisdiction)** (tri-state, shown conditionally for Land)
- Null (default): No filter
- True: Include only in city ETJ
- False: Exclude ETJ
- UI: Radio or toggle with three positions

#### Section C: Class-Specific Rules

**Display:** Conditional fields based on the asset class selected in Step 1.

**Multifamily-specific:**
- Corner lot (toggle: on/off)
- Renter occupancy (range: 0-100%)
- LIHTC (Low-Income Housing Tax Credit) flag (tri-state: null/true/false)
- Elevator present (tri-state: null/true/false)

**Land-specific:**
- Road frontage (range: min/max feet)
- Assemblage potential (toggle: on/off)
- Zoning codes (multi-select chips)
- Future land use codes (multi-select chips)

**Retail-specific:**
- Corner lot (toggle: on/off)
- Road frontage (range: min/max feet)

**Commercial (office, industrial, retail, gas station):**
- AADT (Annual Average Daily Traffic) minimum (slider or numeric input, 0-100,000 vehicles/day)
- Heat-gradient visualization on the slider: green (high traffic) to red (low traffic)

**Self-storage-specific:**
- Is REIT-owned (tri-state: null/true/false)
- Has foreclosure history (tri-state: null/true/false)

---

### Step 5: Threshold [PORT, renumbered from Step 6]

**Header:** "05 / 06 > Match threshold"  
**Tagline:** "How strict should the filter be?"

**Validation rule:** User must select one of three options.

#### Cards

Display three radio-button cards:

**Card 1: Volume** (70% match threshold)
- Description: "Cast a wider net"
- Estimated match count: 15-25 deals
- Emoji or icon: Cast icon or expanding circle
- Selection: Single radio, toggles on click

**Card 2: Balanced** (80% match threshold, default)
- Description: "Middle ground"
- Estimated match count: 8-15 deals
- Emoji or icon: Scale or balance icon
- Selection: Single radio, toggles on click
- Default state: Checked

**Card 3: Precision** (90% match threshold)
- Description: "Tight filters only"
- Estimated match count: 2-6 deals
- Emoji or icon: Crosshair or target icon
- Selection: Single radio, toggles on click

**Behavior:**
- Cards are mutually exclusive
- On selection: Card gains a highlight or border, radio button is filled
- Estimated counts update in real-time from the `/api/dealfeed/buy-boxes/preview` API

---

### Step 6: Activate [PORT + [BUILD] schedule picker]

**Header:** "06 / 06 > Activate & review"  
**Tagline:** "Last look before it goes live."

#### Section 1: Buy Box Name

**Input field:** Text input, placeholder "Sun Belt SFR distress - Q2 '26"  
**Label:** "Buy box name"  
**Secondary text:** "UUID bb-[generated-ID] · last edited just now"  
**Behavior:** User types a memorable name for the buy box. Auto-generated UUID shown for reference.

#### Section 2: Live Match Pool

**Display:** Live counter + status

- **Label:** "Live match pool"
- **Value:** Large numeric display (e.g. "42"), with animated updates (+ or - indicator for delta)
- **Status:** "↑ ready for delivery"
- **Clock:** Top-right corner shows HH:MM:SS in monospace, updating in real-time
- **Animated counter:** Uses SlotMachineCounter animation when value changes

#### Section 3: Filters Review

**Display:** All active filters as read-only chips

**Header:** "Filters" with an "Edit ↗" link (navigates back to Step 1)

**Chip list:**
- Each filter appears as a chip: [label] [value]
- Examples: "Assets: Multifamily", "States: TX, CO", "Hold: ≥3yr", "Opportunity zone: True"
- If no filters: Caption reads "No filters configured - your match pool is the entire universe."

**Behavior:**
- Chips are read-only (display only)
- Clicking "Edit ↗" jumps to Step 1 to modify filters

#### Section 4: Delivery Cadence (Simplified Preset)

**Display:** Three cadence presets (radio buttons or single-select cards)

**Note:** This is a simplified entry point. The user selects one of three presets, which then determines the default run_schedule.days:

**Preset 1: Daily**
- Title: "Daily"
- Subtitle: "Top matches every morning"
- Time: "06:00 AM EST"
- On select: Sets form.delivery.cadence = 'daily', initializes run_schedule.days = ['mon','tue','wed','thu','fri','sat','sun'] (7 days)

**Preset 2: Weekly**
- Title: "Weekly"
- Subtitle: "Curated digest each Monday"
- Time: "Mon 07:00 AM"
- On select: Sets form.delivery.cadence = 'weekly', initializes run_schedule.days = ['mon'] (1 day)

**Preset 3: Real-time**
- Title: "Real-time"
- Subtitle: "Pushed as they hit the criteria"
- Time: "No SLA"
- On select: Sets form.delivery.cadence = 'realtime', initializes run_schedule.days = [] (0 days)

#### Section 5: Per-Day Schedule Picker [BUILD]

**Status:** This is a new feature. Does not exist in the current source.

**Requirement:** After selecting a cadence preset, the user can refine their delivery schedule by toggling any subset of the seven days (Monday-Sunday).

**Display:**

```
Monday-Sunday Toggle Grid:
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ M   │ T   │ W   │ T   │ F   │ S   │ S   │
│ ☐   │ ☐   │ ☐   │ ☐   │ ☐   │ ☐   │ ☐   │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

**Elements:**
- Seven boxes, one per day, labeled with single letter: M, T, W, T, F, S, S
- Each box is a toggle button (checkbox or click-to-toggle style)
- Selected days show a checkmark or filled state; unselected days show an empty state
- Default state: Populated based on the selected cadence preset
  - Daily: All 7 days checked
  - Weekly: Only Monday checked
  - Real-time: All days unchecked

**Interaction:**
1. User clicks a day box to toggle it on or off
2. The form state updates: `form.delivery.run_schedule.days = ['mon','tue','wed','thu','fri','sat','sun']` (as an array of lowercase day keys or full day names per your backend contract)
3. Text feedback updates: "Running on 3 days: Mon, Wed, Fri" (or similar, showing selected days)

**Validation:**
- User is allowed to select 0 days (equivalent to real-time)
- User is allowed to select 1-7 days
- No validation error if all days are unchecked

**Payload contract:** When sending the activation payload, include:
```
{
  delivery: {
    cadence: 'daily' | 'weekly' | 'realtime' | 'custom',
    max: 5 | 25 (typical)
  },
  run_schedule: {
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] // 7 booleans as day keys
  }
}
```

**Styling recommendations:**
- Day boxes should be visually distinct and touchable (min 44x44px for mobile)
- Use the design token color palette for selected state (e.g., --green #5BCC48)
- Animate the toggle transition (100-150ms)

#### Section 6: Activation Ribbon

**Display:** A banner below the sections with text and button

**Text:**
```
"You're about to activate [buy box name].
[Conditional: For real-time: Matches will be pushed as they arrive.]
[Conditional: For scheduled: The first batch will land in your inbox at 06:00 AM EST / Mon 07:00 AM.]
Pause or adjust anytime - no charges either way."
```

**Button:**
- Label: "Activate buy box" (if creating) or "Save changes" (if editing)
- Icon: Zap icon (lightning bolt)
- State: Disabled while activating (`activating === true`)
- On click: Triggers `handleActivate()` which:
  1. Constructs the full payload from the form state using `nativeToPayload(form)`
  2. POSTs to `/api/dealfeed/buy-boxes` (create) or PATCHes `/api/dealfeed/buy-boxes/:id` (edit)
  3. On success: Shows BuyBoxActivatedDialog
  4. On error: Toast with error message, user remains on Step 6

---

### Right Rail: Live Match Pool

**Display:** Fixed or sticky sidebar on the right side of the wizard

**Contents:**

#### Clock
- Top-right, monospace font
- Shows HH:MM:SS, updating once per second
- Indicates the current time for timezone reference

#### Live Match Pool Counter
- Large numeric display
- Label: "Live match pool"
- Animated count (SlotMachineCounter)
- Status line: "↑ ready for delivery"
- Updates in real-time as filters change (debounced 400ms)
- Fetches from `/api/dealfeed/buy-boxes/preview` with current form filters

#### Geographic Concentration
- Shows distribution of matches across states or regions
- Simple bar chart or heatmap (TBD by design)
- Updates with live match data

#### Active Filters
- List of currently applied filters (same as Step 6 Section 3 but on the rail)
- Each filter as a chip with an X to remove
- Clicking X removes the filter and updates form state + live count
- Examples: "TX" X, "SFR" X, "Hold 3yr" X

#### Stat Cells (Truncated after Financial cut)
- **Hold (min):** Years (e.g. "3+")
- **Occupancy (%):** Percentage (e.g. "70-90%")
- Note: "Equity" stat is removed due to cutting the Financial section

---

## C. Activation Success Dialog

### Entry Point

Triggered after successful API response from POST `/api/dealfeed/buy-boxes` or PATCH `/api/dealfeed/buy-boxes/:id`.

### Dialog Layout

**Overlay:** Full-screen modal with backdrop blur

**Content:**

#### Eyebrow
Text: "Buy box activated"

#### Title
Text: "You're hunting."

#### Buy Box Name
Display the name entered in Step 6 (e.g. "Sun Belt SFR distress Q2 '26")

#### Three-Cell Grid

**Cell 1: Match Pool**
- Label: "Match pool"
- Value: Large numeric count (from the last preview)
- Status: "ready to send"

**Cell 2: First Drop**
- Label: "First drop"
- Value: Calculated next run date/time based on run_schedule.days
  - Logic: Derive from days array (using helper function `formatFirstDrop()`)
  - Examples:
    - Daily: "06:00 EST tomorrow morning"
    - Weekly (Monday only): "06:00 EST Monday morning"
    - Real-time: "06:00 EST first match available"
    - Custom (Wed/Fri): "06:00 EST Wednesday morning"

**Cell 3: Cadence**
- Label: "Cadence"
- Value: Friendly name derived from run_schedule.days
  - Logic: Use helper `deriveCadence(box)` to determine cadence from days array
  - Examples:
    - days.length === 7: "Daily"
    - days.length === 1: "Weekly"
    - days.length === 0: "Real-time"
    - Otherwise: "Custom ([n] days/week)"

#### Action Buttons

**Button 1: Secondary**
- Label: "Return to dashboard"
- On click: Calls `onClose()`, which navigates user back to the Management page

**Button 2: Primary (accent green)**
- Label: "Build another →"
- On click: Calls `onBuildAnother()`, which resets the wizard form to blank (EMPTY_FORM) and returns to Step 1 (create mode)

#### Focus Trap

Modal must trap keyboard focus (Tab / Shift+Tab stays within the modal). Esc closes the dialog and returns to dashboard.

---

## UX Notes & Patterns

### Immutability & State Management

All form updates use immutable patterns:
```
setForm({ ...form, assets: [newAsset] })
setForm({ ...form, geo: { ...form.geo, states: [...] } })
setForm({ ...form, delivery: { ...form.delivery, cadence: 'daily' } })
```

### Validation & canGoNext()

Before allowing forward navigation:
- Step 1: `form.assets.length > 0 && form.geo.states.length > 0`
- Step 5: `form.threshold` must be set
- All other steps: No blocking validation (user can proceed with empty filters)

### Live Preview Debouncing

The `/api/dealfeed/buy-boxes/preview` endpoint is called with a 400ms debounce on form changes. This prevents excessive API calls while the user is typing or adjusting filters. The counter animates while fetching (spinning state) and resolves once data arrives.

### Error Handling

- **Validation errors (client-side):** Show inline feedback next to the field
- **Preview timeout:** If preview fetch times out, show a neutral error state ("Unable to load preview")
- **Activation failure:** Toast notification with the error message. User remains on Step 6 to retry or edit.

### Keyboard Shortcuts

- **Cmd/Ctrl + Enter:** Next step (if canGoNext)
- **Alt + Left Arrow:** Previous step
- **Alt + Right Arrow:** Next step (if canGoNext)
- **Esc:** Close wizard, return to Management

### Mobile Responsiveness

- On narrow viewports (<768px), the right rail may stack below the main form or collapse into a drawer
- Stepper header may stack vertically or truncate to abbreviations (e.g., "01/06" instead of "01 / 06 > Target")
- Per-day schedule picker (7 boxes) may wrap or scale to fit screen

---

## Domain-Specific Content (CRE Examples)

**Asset classes:** Self-storage, Multifamily, Mobile home/RV, Residential (SFR), Land, Industrial, Retail, Gas station/C-store, Office, Special purpose

**Geography:** 51 US states + territories, 3,000+ counties, 50+ major metros, 5-state coverage MVP (Travis, Bastrop, Hays, Williamson, Caldwell)

**Metrics:** Delivered count, weekly delta, sparkline, asset class chip, geo chip, last run time, week strip

**Owner flags:** Entity type, hold period, out-of-state, absentee, tax-delinquent, active-foreclosure

**Utilities:** Water, sewer, electricity, gas

**Location/risk:** Floodplain, opportunity zone, wetlands, TIF, AADT (traffic), corner lot, assemblage, zoning

**Distress signals (removed in this build):** Tax delinquency and active foreclosure remain as plain owner flags; the 12-signal distress scoring tier system is cut

---

## Legends & Tags

- **[PORT]** - Feature exists in source; replicate its behavior exactly
- **[CUT]** - Deliberately excluded from this build (was in source, now removed)
- **[BUILD]** - Does not exist in source; must be built new to this spec (per-day schedule picker)

---

## Structural Patterns (Language & Platform Agnostic)

1. **Immutable form updates** - Always return a new object; never mutate state
2. **Conditional field display** - Field visibility depends on asset class or owner entity type (use schema-driven logic)
3. **Live preview with debounce** - Fetch preview on form change; debounce 400ms
4. **Tri-state boolean** - null (no filter) vs. true (include) vs. false (exclude); use radio or three-position toggle
5. **Modal confirm flow** - Pause action requires confirm modal before API call
6. **Drag-and-drop with rejection** - Coverage gap lane rejects drops; animate feedback
7. **Per-day schedule array** - Store as array of lowercase day keys (e.g., ['mon','tue','wed']) or booleans per day

---

## Reference Architecture Files (Existing Source)

All file paths are relative to `/Users/birwin/nightdrop-dashboard/src/`:

| Concern | File | Notes |
|---------|------|-------|
| Management page | `views/BuyBoxesView.jsx` | Kanban, cards, drag-drop, sidebar metrics |
| Wizard shell | `components/BuyBoxWizard.jsx` | Navigation, stepper, page dispatch, form state |
| Step 1 (Target) | `components/BuyBoxPage1.jsx` | Asset class, sub-asset, geography (ZIP is cut here) |
| Step 2-3 (Profile & Owner) | `components/BuyBoxPage23.jsx` | Physical + Financial (Financial cut), owner toggles |
| Step 4 (Distress - REMOVED) | `components/BuyBoxPage4.jsx` | **CUT** - entire file removed from new build |
| Step 5 (Location, now Step 4) | `components/BuyBoxPage5.jsx` | Utilities, risk, class-specific fields |
| Step 6 (Threshold, now Step 5) | `components/BuyBoxPage6.jsx` | Three threshold cards |
| Step 7 (Activate, now Step 6) | `components/BuyBoxPage7.jsx` | Name, cadence presets, activation button (add schedule picker here) |
| Live pool rail | `components/BuyBoxRightRail.jsx` | Clock, counter, geo, filters, stats |
| Success dialog | `components/BuyBoxActivatedDialog.jsx` | Post-activation confirmation |
| Form state | `lib/wizardFormState.js` | EMPTY_FORM, nativeToPayload, toNativeForm |
| API layer | `lib/api.js` | request() wrapper; use exclusively |
| Taxonomy | `lib/buyBoxTaxonomy.js` | Asset classes, sub-assets, states, metros |
| Styles | `styles/buy-box-wizard.css`, `buy-box-wizard-pages.css`, `buyBoxes.css` | Stepper, cards, grids, theme tokens |

---

## Design Tokens

From `src/styles/tokens.css`:
- `--green: #5BCC48` - Primary actions, selected states
- `--warning: #F4B73E` - Secondary actions, alerts
- `--danger: #E5484D` - Destructive actions, errors
- Font: Manrope (sans-serif), never JetBrains Mono

---

## API Contracts

### Management Page

- `GET /api/dealfeed/deals/dashboard/kpis` - Fetch metric tiles (new_this_week, hot_deals, response_rate, awaiting_response)
- `GET /api/dealfeed/buy-boxes` - List all buy boxes with full details (status, metrics, schedule, last_run_at)
- `PATCH /api/dealfeed/buy-boxes/:id` - Update status (active/paused/pending) or edit full buy box
- `GET /api/dealfeed/geo/counties?states=TX,CO` - Fetch counties for selected states

### Wizard

- `GET /api/dealfeed/geo/counties?states=TX,CO` - Fetch counties
- `POST /api/dealfeed/buy-boxes/preview` - Preview match count for filters (debounced 400ms, timeout ~3s)
- `POST /api/dealfeed/buy-boxes` - Create new buy box
- `PATCH /api/dealfeed/buy-boxes/:id` - Edit existing buy box

---

End of UX Flows document.
