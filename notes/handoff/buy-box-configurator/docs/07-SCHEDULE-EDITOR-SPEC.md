# Per-Day Schedule Editor Spec

## FEATURE BANNER

**THIS FEATURE DOES NOT EXIST IN THE SOURCE.** Today, users only select a cadence (Daily, Weekly, or Real-time) from a fixed set of three options, and the backend automatically expands the choice into a `run_schedule.days` array (7 booleans for daily, 1 for Monday-only on weekly, 0 on real-time). The card week strip in Buy Box Management is read-only.

The **per-day schedule editor** is a new [BUILD] capability that lets users toggle any subset of Monday through Sunday as individual days, with two UI placements and bidirectional sync with `run_schedule.days`.

---

## OVERVIEW

The schedule editor empowers users to move beyond coarse cadences. Instead of "daily" (all 7 days) or "weekly" (fixed Monday), users can now say "Monday, Wednesday, Friday at 06:00 EST" or "Tue-Thu nightly" by toggling individual day checkboxes.

### Scope

[BUILD] One reusable schedule picker component (`<SchedulePicker />`) used in two contexts.

[PORT] Two surfaces that embed it.

[PORT] Existing run_schedule API contract and WeekStrip visualization.

---

## ARCHITECTURE

### Component Contract

```jsx
<SchedulePicker
  value={[true, true, false, true, false, true, false]}  // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  onChange={(days) => { /* [boolean, boolean, ...] */ }}
  interactive={true}          // if false, render read-only
  variant="inline"            // "inline" (7 small toggle) or "card" (7 stacked) - design choice per placement
/>
```

**Visuals:** Reuse `.bb-week` and `.bb-week__d` classes from `src/styles/buyBoxes.css` (lines 291-318) as the base. When interactive, make `.bb-week__d` a clickable button with `cursor: pointer` and active state. When read-only, keep as span.

**Semantics:** Render as a grid of 7 buttons, each labeled "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" (DAY_LABEL from BuyBoxesView line 84).

### Placement 1: Wizard Activate Step

**File:** `src/components/BuyBoxPage7.jsx`

**Location:** Below the cadence radio-grid, above the activate ribbon.

**Label:** "Run schedule" or "Active days" (new section).

**Interaction:**
1. User selects a cadence (Daily / Weekly / Real-time).
2. The schedule picker populates with the cadence default (see "Default State" below).
3. User can toggle individual days to override the cadence.
4. The activate button stays enabled as long as at least one day is selected (unless real-time).
5. On activate, `form.delivery.days` is the user's chosen array; `nativeToPayload()` uses it directly (no longer auto-generated from cadence).

**Disabled state:** If user selects Real-time (0 days intended), the schedule picker is disabled/dimmed with a label: "Schedule not applicable for real-time delivery."

**Integration with form state:**
- Add `form.delivery.days` array to `EMPTY_FORM` in `src/lib/wizardFormState.js` (default: null or `[true, true, true, true, true, true, true]`).
- Update `nativeToPayload()` to use `form.delivery.days` directly if set, otherwise fallback to cadence default.
- Update `toNativeForm()` (deserializer) to extract `run_schedule.days` into `form.delivery.days` on edit mode.

### Placement 2: Management Card Quick-Reconfigure

**File:** `src/views/BuyBoxesView.jsx` > `BuyBoxCard` component

**Location:** A new "quick-edit" row below the existing WeekStrip.

**Trigger:** Either (a) click the week strip itself to enter edit mode, or (b) add a small "edit schedule" icon/button next to the last-run timestamp.

**Interaction:**
1. Clicking the trigger shows a popover or inline edit mode.
2. The schedule picker appears at 7 small toggles.
3. User toggles days.
4. Save button triggers `api.patch('/api/dealfeed/buy-boxes/:id', { run_schedule: { days: [...] } })`.
5. Toast feedback on success/failure.
6. Card week strip updates immediately (optimistic) or after API returns.

**Constraints:**
- Only active/validating cards show the edit trigger (paused and gap cards remain read-only, matching existing pause/resume UX).
- Closing the popover without saving reverts.

---

## DEFAULT STATE

### Cadence Mapping

When the user selects a cadence, the schedule picker populates as follows:

| Cadence | Default Days | Visual | Notes |
|---------|--------------|--------|-------|
| Daily | [T, T, T, T, T, T, T] | All 7 day buttons highlighted | User can toggle any days off to create a subset. |
| Weekly | [T, F, F, F, F, F, F] | Only Monday highlighted | User can change to a different single day, or multi-select for "weekly-plus" mode. |
| Real-time | [F, F, F, F, F, F, F] | All buttons dimmed/disabled | Schedule not applicable; delivery happens on-demand. |

### Edit Mode Default

When editing an existing buy box that already has a `run_schedule.days` array, `toNativeForm()` loads it directly into `form.delivery.days`. The schedule picker displays the persisted state, and the cadence radio shows a "custom" state (or derived as "daily"/"weekly" if it matches the pattern).

---

## VALIDATION

### Business Rules

1. **At least one day required** (unless real-time): If the user tries to activate with all 7 toggles off and cadence is not real-time, show an error message: "Select at least one day or switch to Real-time delivery."

2. **Real-time overrides schedule**: If cadence is Real-time, the schedule picker is disabled. `run_schedule.days` is sent as `[]` (empty array) on activation.

3. **No day overlap with paused status**: A paused buy box cannot be edited to have days selected (the edit UI is not exposed for paused cards anyway, but the API should reject if somehow sent a PATCH with both `status: 'paused'` and `days: [...]` with length > 0).

### Edge Cases

1. **All days selected (cadence remains custom)**: A user who selects all 7 days does NOT automatically revert to "Daily" cadence label. It stays in a "custom" mode. The matcher sees 7 days and behaves identically to daily, but the UI is explicit about the user's choice.

2. **All days unselected (not allowed)**: Prevent the button click that would unselect the last remaining day. Show a tooltip or inline message: "At least one day required."

3. **Timezone note**: The time `06:00 AM EST` (for daily) or `Mon 07:00 AM` (for weekly) displayed in the cadence cards is fixed at the backend level. The per-day picker does not expose timezone selection. Users should understand that "Monday" means "Monday 07:00 EST" if they're in a different timezone. Add a small help text: "All times in EST. Your local time may differ."

4. **Persistence during wizard flow**: If the user changes the cadence on page 7, then scrolls back to page 5, then returns to page 7, the schedule picker should reflect their current form state (not reset). Use the form state as source of truth.

---

## INTERACTION & VISUAL STATES

### Button States (Per Day Toggle)

**Inactive / Unselected:**
- Background: `transparent`
- Border: `1px solid var(--border, #2a2a2e)`
- Text: `var(--fg-dim, #6b6b6b)`
- Cursor: `pointer`

**Active / Selected:**
- Background: `var(--accent, #1db954)`
- Border: `1px solid var(--accent, #1db954)`
- Text: `#fff`
- Cursor: `pointer`

**Hover (unselected):**
- Background: `var(--surface-hi, #22222a)`
- Border: `1px solid var(--border, #2a2a2e)`

**Hover (selected):**
- Background: `var(--accent-hi, #1ed760)`
- Border: `1px solid var(--accent-hi, #1ed760)`

**Disabled (real-time or read-only):**
- Background: `var(--surface, #1a1a1f)`
- Border: `1px solid var(--border, #2a2a2e)`
- Color: `var(--fg-dim, #6b6b6b)`
- Opacity: 0.6
- Cursor: `not-allowed`

**Read-Only (management card, non-editable):**
- Same as inactive/active, but `pointer-events: none` or render as spans instead of buttons.

### Container

Use the existing `.bb-week` grid layout (7-column, 4px gap). The SchedulePicker component wraps or exports this class for consistency.

### Label & Help Text

- **Label (wizard):** "Active delivery days" (14px, font-weight 600, margin-bottom 8px).
- **Help (wizard):** "Pick one or more days. Matches will queue until the selected day arrives." (11px, color var(--fg-muted)).
- **Label (card popover):** No top label if space is tight; use inline title "Edit schedule" in the popover header.
- **Help (management card):** "Saved to PropCloud nightly." (10px, color var(--fg-dim), shown on save success).

### Popover / Inline Edit (Management Card)

**Trigger element:** Click the existing `.bb-week` strip, or add a small edit icon (pencil or sliders icon from lucide-react) next to the last-run timestamp.

**Popover style:**
- Position: Fixed or absolute, anchored to the trigger (e.g., card bottom-right).
- Background: `var(--surface, #1a1a1f)`.
- Border: `1px solid var(--border, #2a2a2e)`.
- Border-radius: 8px.
- Padding: 12px.
- Box-shadow: `0 8px 24px rgba(0,0,0,0.3)`.
- Escape key or clicking outside closes without saving.
- Close button: top-right corner, subtle (no-border, small X icon).

**Button row (below picker):**
- Cancel (secondary, 32px height, 10px padding).
- Save (primary, 32px height, 10px padding).
- Both buttons stay visible, side-by-side.

---

## API CONTRACT

### Create / Activate (POST /api/dealfeed/buy-boxes)

**Payload field:**
```json
{
  "run_schedule": {
    "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  }
}
```

**Value:** An array of day abbreviations. Valid values: `["mon", "tue", "wed", "thu", "fri", "sat", "sun"]` in any order or subset. Empty array signals real-time.

**Validation (backend):** At least one day for non-realtime boxes. Empty array is valid only if `delivery_mode` or delivery type is real-time (backend enforces the semantic).

### Update (PATCH /api/dealfeed/buy-boxes/:id)

**Payload field:**
```json
{
  "run_schedule": {
    "days": ["mon", "wed", "fri"]
  }
}
```

**Validation:** Same as create. Backend returns 400 if attempt to set days=[] on a non-realtime box.

### Read (GET /api/dealfeed/buy-boxes or GET /api/dealfeed/buy-boxes/:id)

**Response field:**
```json
{
  "run_schedule": {
    "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  }
}
```

No change to the existing contract; the backend already returns this structure (it has since the cadence auto-expansion logic was added).

---

## FORM STATE UPDATES

### wizardFormState.js

```javascript
export const EMPTY_FORM = {
  // ... existing fields ...
  delivery: { 
    cadence: 'daily',        // 'daily' | 'weekly' | 'realtime'
    days: [true, true, true, true, true, true, true],  // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    max: 5 
  },
  // ...
};

export function nativeToPayload(form) {
  // ... existing logic ...
  
  // Determine run_schedule.days from form.delivery.days
  const daysArray = form.delivery.days
    ? DAY_KEYS.filter((_, i) => form.delivery.days[i])  // ['mon', 'tue', ...] for true values
    : form.delivery.cadence === 'weekly'
      ? ['mon']
      : form.delivery.cadence === 'realtime'
        ? []
        : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  
  return {
    // ... existing fields ...
    run_schedule: { days: daysArray },
    delivery_max_per_run: form.delivery.max || 5,
  };
}

export function toNativeForm(b) {
  // ... existing logic ...
  
  // Deserialize backend run_schedule.days into form.delivery.days
  const days = b.run_schedule?.days ?? [];
  const deliveryDays = DAY_KEYS.map(d => days.includes(d));
  
  return {
    // ... existing fields ...
    delivery: {
      cadence: days.length === 7 ? 'daily' : days.length === 1 ? 'weekly' : 'realtime',  // Infer cadence for UI
      days: deliveryDays,
      max: b.delivery_max_per_run || 5,
    },
  };
}
```

### Constants (top of wizardFormState.js)

```javascript
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
```

---

## COMPONENT IMPLEMENTATION NOTES

### SchedulePicker.jsx (New Component)

**Export:**
```jsx
export function SchedulePicker({ value, onChange, interactive = true, variant = 'inline', label, helpText }) {
  // value: [boolean, boolean, ...] matching DAY_KEYS order
  // onChange(newValue): called on toggle
  // interactive: if false, render read-only
  // variant: 'inline' (compact row) or 'card' (slightly spacious for popover)
}
```

**Internal:**
- Use `.bb-week` and `.bb-week__d` classes from buyBoxes.css.
- Create a 7-button grid mapping DAY_LABEL ('M', 'T', 'W', 'T', 'F', 'S', 'S') to the value array.
- On toggle, call `onChange` with a new boolean array.
- If interactive is false, render spans instead of buttons, skip event handlers.

### BuyBoxPage7.jsx Updates

1. Import SchedulePicker.
2. Add state tracking or passthrough for `form.delivery.days`.
3. Render SchedulePicker below the cadence radio-grid.
4. Disable/dim the SchedulePicker if `delivery.cadence === 'realtime'`.
5. Update the activation button validation: check `form.delivery.days.some(d => d)` or explicitly check that at least one day is true.
6. Pass the days array through `nativeToPayload()` as-is.

### BuyBoxesView.jsx Updates

1. Import SchedulePicker.
2. Add a popover component (use a simple fixed-position div with onKeyDown/onClick handlers for dismiss).
3. In BuyBoxCard, add an edit trigger (pencil icon or "Edit schedule" text link).
4. On trigger, render the popover with SchedulePicker (interactive=true).
5. On Save, extract the days array, call `patchBuyBox(box.id, { run_schedule: { days } })`.
6. On success, close popover and optimistically update the card's week strip display (or refetch).
7. On error, show toast with error message.

### Styling

No new CSS classes needed if using `.bb-week` and `.bb-week__d` directly. If variant-specific styling is needed:

```css
.bb-schedule-picker {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.bb-schedule-picker--variant-card {
  /* Slightly more padding / larger buttons if needed */
  gap: 6px;
}

.bb-schedule-picker__day {
  /* Inherits .bb-week__d styles */
}

.bb-schedule-picker__day--interactive {
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}

.bb-schedule-picker__day--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

---

## PLACEMENT REFERENCE

### Wizard (Page 7 / Activate Step)

**Current structure (BuyBoxPage7.jsx):**
```
<header className="page-head">...</header>
<div className="review-hero">...</div>
<div className="review-section">Filters</div>
<div className="review-section">Delivery cadence
  <div className="delivery-grid">
    [3 cadence radio buttons]
  </div>
</div>
<div className="activate-ribbon">...</div>
```

**Insertion point (NEW):**
```
<div className="review-section">Delivery cadence
  <div className="delivery-grid">
    [3 cadence radio buttons]
  </div>
  <--- INSERT SCHEDULE PICKER HERE (between cadence and activation ribbon) --->
</div>
```

**Styling:** Use existing `.review-section` / `.review-section-title` classes for consistency. Schedule picker inherits `.bb-week` grid.

### Management Card (BuyBoxesView.jsx)

**Current structure (BuyBoxCard component):**
```
<div className="bb-card">
  <header className="bb-card__head">...</header>
  <div className="bb-card__hero">Delivered count</div>
  <div className="bb-card__chiprow">Asset + Geo chips</div>
  <div className="bb-card__nextrun">Last run timestamp</div>
  <div className="bb-week">Read-only week strip</div>
  <alert (gap only)>...</alert>
  <div className="bb-card__actions">Buttons</div>
</div>
```

**Insertion point (NEW):**
```
<div className="bb-card__nextrun">Last run timestamp</div>
<div className="bb-week">Read-only week strip + [EDIT ICON/BUTTON]</div>
  <--- POPOVER RENDERS HERE (fixed position, z-index) --->
<alert>...</alert>
```

---

## ACCEPTANCE CHECKLIST

### Component

- [ ] SchedulePicker component created and exported from a new file (e.g., `src/components/SchedulePicker.jsx`).
- [ ] Accepts `value` (7-boolean array), `onChange` callback, `interactive` flag, and optional `label` / `helpText` props.
- [ ] Uses `.bb-week` and `.bb-week__d` CSS classes from buyBoxes.css.
- [ ] Renders 7 buttons labeled M, T, W, T, F, S, S (matching DAY_LABEL in BuyBoxesView).
- [ ] When interactive=true, buttons toggle their state and call onChange on click.
- [ ] When interactive=false, buttons render as spans with no event handlers (read-only).
- [ ] Disabled state (e.g., real-time mode) sets opacity and cursor to not-allowed.
- [ ] Supports variant prop (e.g., 'inline', 'card') for layout flexibility.

### Wizard Integration (BuyBoxPage7.jsx)

- [ ] SchedulePicker imported and rendered below cadence radio-grid.
- [ ] SchedulePicker shows the default days matching the cadence selection (all 7 for daily, Mon-only for weekly, empty/disabled for real-time).
- [ ] SchedulePicker is disabled or dimmed when cadence is real-time.
- [ ] User can toggle individual days to override the cadence default.
- [ ] Activation button disabled if no days are selected (unless real-time).
- [ ] Tooltip or help text explains "Select at least one day or switch to Real-time."
- [ ] form.delivery.days is passed through to nativeToPayload() and becomes run_schedule.days in the API payload.
- [ ] Edit mode (toNativeForm) correctly deserializes backend run_schedule.days into form.delivery.days.

### Management Card Integration (BuyBoxesView.jsx)

- [ ] Edit trigger (button, icon, or clickable week strip) visible on active/validating cards only.
- [ ] Clicking the trigger opens a popover with SchedulePicker (interactive=true).
- [ ] Popover includes Cancel and Save buttons.
- [ ] Save button calls api.patch with run_schedule.days payload.
- [ ] On success, card week strip updates (optimistic or after refetch), popover closes, toast shows "Schedule updated."
- [ ] On error, toast shows error message, popover stays open (user can retry).
- [ ] Escape key closes popover without saving; clicking outside also closes.
- [ ] Paused and gap cards do NOT show the edit trigger (read-only behavior preserved).

### Form State (wizardFormState.js)

- [ ] EMPTY_FORM.delivery includes new `days` array: `[true, true, true, true, true, true, true]`.
- [ ] nativeToPayload() converts `form.delivery.days` boolean array to `run_schedule.days` string array (['mon', 'tue', ...]).
- [ ] nativeToPayload() respects the explicit days array; cadence is no longer the source of truth for run_schedule.
- [ ] toNativeForm() extracts backend run_schedule.days and deserializes to form.delivery.days boolean array.
- [ ] DAY_KEYS constant is defined or imported for consistent ordering.

### Validation

- [ ] Activation blocked if form.delivery.days is all false and cadence is not real-time.
- [ ] Error message displayed: "Select at least one day or switch to Real-time delivery."
- [ ] Real-time cadence sends run_schedule.days as empty array [].
- [ ] Backend rejects PATCH if run_schedule.days is empty and box is not real-time (API-level validation).

### Edge Cases & Timezone

- [ ] User can select all 7 days; cadence label stays "custom" (does not revert to "Daily").
- [ ] User cannot unselect the last remaining day (button click is prevented or ignored).
- [ ] Tooltip or inline help visible: "All times in EST. Your local time may differ."
- [ ] During wizard flow, toggling cadence repopulates the schedule picker with cadence default; persists user overrides if they return to the step.

### Visual & Interaction

- [ ] Unselected day button: transparent background, 1px border, dim text, pointer cursor.
- [ ] Selected day button: green background (#1db954 or --accent), white text, pointer cursor.
- [ ] Hover state (unselected): slight background tint, same border.
- [ ] Hover state (selected): brighter green (#1ed760 or --accent-hi).
- [ ] Disabled state (real-time or read-only): 0.6 opacity, not-allowed cursor.
- [ ] Popover (management card): 8px border-radius, subtle shadow, escape/click-outside closes it.
- [ ] PopOver Save/Cancel buttons are clearly labeled and functional.

### API & Data

- [ ] POST /api/dealfeed/buy-boxes payload includes `run_schedule: { days: [...] }`.
- [ ] PATCH /api/dealfeed/buy-boxes/:id payload includes `run_schedule: { days: [...] }`.
- [ ] Backend accepts and stores the days array correctly.
- [ ] GET /api/dealfeed/buy-boxes/:id returns the persisted run_schedule.days in the response.
- [ ] No silent data loss or server-side transformation of the days array.

### Documentation & Code

- [ ] SchedulePicker component has JSDoc comment explaining props and usage.
- [ ] BuyBoxPage7.jsx comments explain the new schedule section and cadence-to-days logic.
- [ ] BuyBoxesView.jsx comments explain the popover trigger and save flow.
- [ ] wizardFormState.js comments explain the days array, nativeToPayload conversion, and toNativeForm deserialization.
- [ ] All new files follow project naming and style conventions (see coding-style.md, web/patterns.md).
- [ ] No console.log or debug statements in final code.

### Testing (Guidance)

- [ ] Unit: SchedulePicker toggle and onChange callback.
- [ ] Unit: nativeToPayload and toNativeForm days-array handling.
- [ ] E2E (wizard): Select cadence, toggle days, verify activation button state, activate buy box, verify run_schedule in backend.
- [ ] E2E (management): Open card edit popover, toggle days, save, verify card week strip updates and API call succeeds.
- [ ] E2E (real-time): Select real-time cadence, verify schedule picker is disabled, verify activation sends empty days array.
- [ ] Edge case: Toggle all days on, then all off, verify last-day-uncheck is prevented or error is shown.

---

## STRUCTURAL NOTES

### Reusable vs. Domain-Specific

**Reusable (can be ported to other platforms):**
- SchedulePicker component contract (value: boolean[], onChange, interactive, variant).
- Day-of-week toggle UI pattern (7 small buttons, grid layout, on/off states).
- Validation logic: "at least one day required."

**CRE-Domain-Specific (replace with your domain data):**
- Label text ("Active delivery days", "Saved to PropCloud nightly").
- Time labels ("06:00 AM EST", "Mon 07:00 AM").
- Business rule: "real-time" cadence maps to 0 days.
- Field name: `run_schedule.days` (replace with your scheduling backend field name).

### Migration Path

When rebuilding in a new platform:
1. Port SchedulePicker component as-is; it's a pure toggle UI with no domain logic.
2. Adapt form state structure to match your data model (e.g., `delivery.days` may live elsewhere).
3. Update nativeToPayload / toNativeForm to serialize/deserialize days array to/from your backend's run_schedule contract.
4. Adjust labels, help text, and timezone note to your product's messaging and SLA.
5. Reuse the validation rule (at least one day for non-realtime).

---

## REFERENCES

### Current Source Code Anchors

- **BuyBoxesView.jsx** - WeekStrip component (lines 131-145), DAY_KEYS/DAY_LABEL (lines 83-84), scheduleArray helper (lines 86-89).
- **BuyBoxPage7.jsx** - Cadence selection (lines 4-8, 63-82), activation ribbon (lines 86-98).
- **buyBoxes.css** - `.bb-week` and `.bb-week__d` classes (lines 291-318).
- **wizardFormState.js** - EMPTY_FORM (lines 9-101), nativeToPayload (lines 125-243), toNativeForm (lines 245+).
- **BuyBoxActivatedDialog.jsx** - cadenceOverride derivation logic (lines 17-24) for reference.

### Related Specs

- `notes/bmad/buy-box-wizard-v2/PRD.md` - User desire for per-day customization mentioned.
- `notes/REFERENCE.md` - Full endpoint reference for PATCH /api/dealfeed/buy-boxes/:id.
- `CLAUDE.md` - Design tokens: `--green #5BCC48`, `--warning #F4B73E`, `--danger #E5484D`.

---

**End of Spec**

Revision: 2026-06-30 | Status: Ready for Build
