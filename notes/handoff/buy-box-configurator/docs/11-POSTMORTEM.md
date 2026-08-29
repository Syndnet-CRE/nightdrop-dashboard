> CURATION NOTE: The curated handoff (see 01-SCOPE.md) deliberately removes two problem areas described below: the Page-2 Financial subsection and the entire Distress-signals step. The remaining lessons still apply to the new build, especially the create-vs-edit field drift, silently dropped fields, and the schedule model (which the new day-level editor spec in 07 addresses).

# Buy Box Configurator Post-Mortem

**Date:** 2026-05-20  
**Status:** Shipped; MVP constraints acknowledged  
**Audience:** Teams rebuilding this feature in a different stack and business domain

This is an honest, adversarial review of what worked, what failed silently, and the patterns that led to those failures. The intent is not to assign blame, but to arm the next team with concrete guardrails to avoid repeating the same mistakes in a new context.

---

## Part 1: What It Got Right

### 1. The Wizard UX and Step Navigation

The 7-step modal wizard with forward/back navigation, visual stepper, and gated progression is structurally sound.

**Strengths:**

- Clear IA: Asset selection (Step 1), physical envelope (Step 2), owner profile (Step 3), distress signals (Step 4), location risk (Step 5), threshold and delivery (Step 6), review and activate (Step 7).
- Validation gates work: Users cannot advance past Step 1 without selecting an asset class AND a state. The `canGoNext()` function correctly blocks invalid progression.
- Backward navigation is always allowed; users can jump backward to any completed step but cannot skip ahead. This prevents the "I accidentally went forward and now I'm confused" problem.
- Step headers visually indicate progress (pending, active, done). The design is clear.

**Reusable pattern:** Step-based forms with gated progression are valuable for any domain. The gate logic (forward restricted, backward open) prevents user confusion and is easier to test than unrestricted jumping.

**Domain-specific content:** The 7 steps and their labels are CRE-specific, but the structure (multi-step form, visual progress, gate logic) transfers directly to any domain (SaaS user creation, loan origination, marketplace seller onboarding).

### 2. Live Match Count Preview with Debouncing

The preview subsystem (400ms debounced POST to `/api/dealfeed/buy-boxes/preview`) is well-engineered.

**Strengths:**

- Debounce prevents firing a network request on every keystroke. 400ms delay captures user intent without thrashing the backend.
- AbortController cancellation is correctly wired. If the user edits the form again before a preview completes, the old request is cancelled and a new one fires.
- Gate on empty asset class (`if (!form.assets.length)`) prevents full-table COUNT(*) timeout. Smart UX: users see "Select an asset class to start" until that gate opens.
- Slot-machine counter animation (spinning reels → landing on final number) is engaging and differentiates the number from static text.
- Error handling shows graceful degradation: if backend times out, user sees "Preview timed out" + dashes instead of a red error banner that kills the flow.

**Reusable pattern:** Debounced preview with early gates, AbortController cleanup, and graceful error UI is gold. Copy this pattern to any domain where users need real-time feedback on filter changes.

**Domain-specific content:** The preview endpoint and field schema are CRE-specific, but the debounce + abort + error handling is universal.

### 3. Schema-Driven Field Visibility

The `buyBoxFieldSchema.js` file defines a per-class field schema (UNIVERSAL_PHYS + UNIVERSAL_FIN + class-specific additions). This drives which fields render on which steps.

**Strengths:**

- Single source of truth: When you add a new field (e.g., `lot_sf_min`), you add it to CLASS_SCHEMA once. All pages read from this schema to decide what to render.
- Scalable: Adding a new asset class (e.g., "hospitality" once it was separate) meant adding one entry to CLASS_SCHEMA and defining which classes get which fields. No copy-paste of field lists across multiple step pages.
- No accidental field leakage: A field defined only for multifamily won't render on land buy box creation.
- Readable: CLASS_SCHEMA reads like a table; reviewers can spot missing or misaligned fields at a glance.

**Weakness:** Despite the schema existing, only ~30 of ~91 backend-patchable fields are wired into the wizard. The schema told the truth about visibility, but the form's `nativeToPayload()` function silently dropped fields not in the form state. This made the schema seem more complete than it actually was. More on this below.

**Reusable pattern:** Per-class field schemas are reusable everywhere. Define UNIVERSAL_* fields once, then add per-entity-type additions. This scales to any domain (SaaS tiers, loan products, user profiles).

### 4. The Buy Box Command Center

The kanban view with 5 columns (pending, validating, active, paused, gap) is well-designed.

**Strengths:**

- Visual at a glance: Users see the health of all buy boxes in one screen. Active boxes glow, paused boxes fade, gap boxes show red alert.
- Status derivation is correct: The `deriveColumn()` function reads `status`, `last_run_at`, and coverage state to assign boxes to columns. Logic is clear and testable.
- Drag-and-drop transitions boxes: Dragging a box from "active" to "paused" fires a PATCH to update status. Optimistic update makes it feel fast.
- Card metadata is rich but compact: Each card shows name, asset class, geo summary, week schedule (7-day grid showing which days run), last run time, delivered count (if active), and actions menu. Lots of info without clutter.
- Empty state handling: Columns show "No boxes" when empty, preventing the UI from looking broken. Dimmed headers indicate emptiness.

**Reusable pattern:** Kanban boards with status columns, drag-to-transition, and rich metadata cards are valuable for any domain. The deriveColumn() logic (status + dependencies) is reusable.

**Domain-specific content:** The 5 column definitions (pending, validating, active, paused, gap) are specific to buy box operations, but the kanban structure (columns, cards, drag, metadata) transfers to any workflow.

### 5. Optimistic Updates and Snappy UX

Buy box mutations (pause, resume, delete, edit, create) use optimistic updates.

**Strengths:**

- User sees instant feedback: Clicking "Pause" immediately grays out the card and moves it to the paused column, without waiting for the server.
- Network latency is masked: The UI feels snappy even on slow connections.
- Toast feedback confirms success or shows error message.
- Failures are rare enough that the pattern works in practice.

**Weakness:** No rollback mechanism if the network request fails. If PATCH fails, the UI stays in the optimistic state. Users don't know it failed without reading the toast or checking the server logs. More on this below.

---

## Part 2: Incidents: What Went Wrong

### Incident 1: Create-vs-Edit Path Divergence (Silent Data Loss)

**What happened:**

The wizard has two code paths for submitting a new buy box:

**Old path (legacy, still in code until 2026-05-20):**
- Route: `POST /api/dealfeed/onboarding`
- Fields accepted: ~50 fields
- Fields silently dropped: 35 fields from migration 049 (lot_sf, lot_sf_min/max, year_built_min/max, stories_min/max, units_min/max, beds_min/max, baths_min/max, lot_width_min, lot_depth_min, building_classes[], construction_types[], foundation_types[], roof_types[], garage_types[], price_per_unit_max, improvement_to_land_max, development_potential_min, utilities flags, flood/wetlands/tif/etj/opportunity_zone tri-states, corner_lot, assemblage_potential, aadt_min, road_frontage, zoning codes, has_pool, has_elevator, pct_renter_occupied, mf_lihtc_flag, ss_is_reit_owned, ss_has_foreclosure_history)

**New path (2026-05-20 onward):**
- Route: `POST /api/dealfeed/buy-boxes`
- Fields accepted: All 91 PATCHABLE_FIELDS from backend
- Fields preserved: None are dropped

**Root cause:**

The backend was rebuilt to accept all 91 fields in `POST /buy-boxes` (matching the PATCH contract). But the wizard still called the old `/onboarding` endpoint (which was never rebuilt). The wizard's comment at line 254-256 of BuyBoxWizard.jsx suggests the team was aware: "Changed to POST /buy-boxes instead of /onboarding because /onboarding silently drops MVP filter fields."

**Impact:**

Users creating a new buy box could not persist the 35 new fields (migration 049 additions). They could set them in the wizard form, but they were silently dropped on POST. Edit mode (PATCH) worked fine. This created an asymmetry: edit mode supported all fields, create mode supported 50.

If a user edited a buy box created before migration 049, and added a new field (e.g., `lot_sf_min`), the PATCH worked. But they had no way to add those fields to a fresh buy box without manual backend intervention.

**Why it was silent:**

No error was thrown. The wizard accepted the field input, posted to the endpoint, and received a 200 success response. The buy box was created successfully. But the fields were lost. No warning, no 400 error, no toast saying "These fields are not supported on create." Just silent failure.

**How to avoid in the next build:**

1. Enforce API contract symmetry: POST and PATCH to the same entity type must accept the exact same fields. If there are asymmetries (by design), document and test them explicitly.
2. Backend validation: If POST /buy-boxes receives a field that is not in the CREATE schema, return 400 "field not supported on create" instead of silently dropping it.
3. Frontend assertion: Before submit, query the backend for which fields are creatable vs. editable. Cache this. If the form includes a field marked "edit-only," show a warning or disable the create button.
4. Test round-trips: For every new field added to the schema, write a test that creates a buy box with that field, reads it back, and verifies the value matches. Catch silent loss immediately.
5. Version the endpoint: If you must support asymmetric APIs, version them explicitly (`POST /v1/buy-boxes` vs. `POST /v2/buy-boxes`).

### Incident 2: Taxonomy Mismatch (Dashboard 8 vs Backend 10 Classes)

**What happened:**

The CLAUDE.md file states the buy box taxonomy is "8 classes, MVP, locked 2026-05-20." The actual `buyBoxTaxonomy.js` file contains 10 classes (self_storage, multifamily, mobile_home_rv, residential_sfr, land, industrial, retail, gas_station_c_store, office, special_purpose).

**Timeline:**

- Before 2026-05-10: Dashboard had 8 classes (no gas_station_c_store, no special_purpose).
- 2026-05-10: Backend was rebuilt with 10 classes. Matcher updated.
- 2026-05-15: Dashboard was updated to 10 classes in buyBoxTaxonomy.js.
- 2026-05-20: CLAUDE.md was not updated. Still says 8 classes.

**Root cause:**

Documentation was not kept in sync with code during a refactor. The code is correct; the docs are stale.

**Impact:**

Low in this case, because the code is correct. But future developers reading CLAUDE.md would be confused about whether the system supports 8 or 10 classes. They might trust the docs and implement code assuming 8 classes, creating a regression.

**Why it happened:**

CLAUDE.md is a markdown file in the repo. buyBoxTaxonomy.js is the source of truth. When code changes, the docs file was not updated reflexively. No CI check to ensure they stay in sync.

**How to avoid in the next build:**

1. Single source of truth: Define the taxonomy once (in code). Generate docs from code, not by hand.
2. CI check: If you have a separate docs file (CLAUDE.md), write a test that reads the code taxonomy and verifies the docs claim the same number and names of classes. Fail the build if they diverge.
3. Linked definitions: Reference the code definition in the docs. Instead of "8 classes," write "See buyBoxTaxonomy.js for the authoritative list." This keeps docs light and points to the source.
4. Handoff protocol: Before any refactor that changes the taxonomy, update CLAUDE.md, get it reviewed, and commit it together with the code change. Use a conventional commit message: `feat(taxonomy): add gas_station and special_purpose classes; update CLAUDE.md`.

### Incident 3: Wizard Drops 60 Backend Fields (Field Coverage Mismatch)

**What happened:**

The wizard's form state (NATIVE_FORM in wizardFormState.js) includes only ~30 of the 91 PATCHABLE_FIELDS that the backend accepts. The remaining ~60 fields have no form input.

**Examples of dropped fields:**

- Physical: lot_sf_min/max (lot square footage), year_built (on most classes), stories (on most classes), units (on most classes), beds/baths (on most classes), lot_width_min/lot_depth_min, building_classes on retail/gas/industrial, construction_types on most classes, foundation_types (SFR), roof_types (SFR), garage_types (SFR).
- Financial: price_per_unit_max (multifamily), improvement_to_land_max (land), development_potential_min (land).
- Location: road_frontage_min/max, aadt_min, zoning codes, future_land_use_codes, opportunity_zone tri-state, tif_district tri-state, in_etj tri-state, corner_lot, assemblage_potential.
- Flags: has_pool, has_elevator, pct_renter_occupied_min, mf_lihtc_flag, ss_is_reit_owned, ss_has_foreclosure_history.

**Root cause:**

The wizard was built in phases. Phase 1 wired the core fields (asset class, geo, units, price range, distress signals). Phases 2-3 were supposed to add the new MVP fields (migration 049 additions). But Phase 3 was never completed. The 35 new fields in migration 049 were added to the backend but never wired into the wizard.

The schema (buyBoxFieldSchema.js) defines all fields as desired for each class. But the form (BuyBoxWizard.jsx + BuyBoxPageN.jsx files) only renders the subset that has form input. The schema was aspirational; the implementation was incomplete.

**Impact:**

Users could not set these 60 fields via the wizard. To use them, they had to either:
1. Edit a buy box created before migration 049 (if it somehow already had values), or
2. Call the backend API directly via curl/Postman, or
3. Wait for the next wizard rebuild.

This broke the promise that "all 91 patchable fields are editable via the wizard." The truth was closer to "30 of 91 fields are editable; 60 are read-only or inaccessible."

**Why it was silent:**

No error occurred. The wizard accepted the form input (e.g., when editing an existing box), displayed the values correctly in read-only form sections (for reference), but never allowed the user to edit them. No warning. If a user tried to edit a field that had a value but no input widget, they simply couldn't change it. The UI looked complete.

**How to avoid in the next build:**

1. Schema-to-form projection: Write a validation layer that reads CLASS_SCHEMA and asserts that every field in the schema has a corresponding form input component. Fail at startup if there's a gap.
   ```javascript
   for (const field of classSchema.phys) {
     if (!formHasInput(field)) {
       throw new Error(`Field ${field} in schema but not in form`);
     }
   }
   ```
2. Mark aspirational fields: If you define a field in the schema but don't wire it into the form yet, prefix it with `_TODO_` (e.g., `_TODO_lot_sf_min`) to make it obvious in code reviews.
3. Test coverage: Write snapshot tests for each asset class that compare the list of form inputs to the list of schema fields. Fail if they diverge.
4. Phased rollout with flags: If you're rolling out new fields, use feature flags (backend or frontend) to hide unimplemented ones from users. Make the absence intentional and visible, not silent.
5. Clear handoff: When Phase 2 is incomplete and deferred to Phase 3, explicitly document which fields are "coming soon" in CLAUDE.md. Do not leave it ambiguous.

### Incident 4: Geographic Mutual Exclusivity Violated in UI (Silent Misalignment)

**What happened:**

The backend matcher enforces a strict geographic priority order:
1. County (if populated, ignore city/zip/state)
2. City/Metro (if populated, ignore zip/state)
3. ZIP (if populated, ignore state)
4. Radius (if populated, ignore state)
5. State (fallback)

The wizard UI allows users to select values in all four geo modes simultaneously. It renders four independent multi-select inputs: states, counties, metros (cities), and zips. Nothing prevents a user from selecting, e.g., "TX" AND "Travis, Hays" (counties) AND "Austin" (metro) AND "78701" (zip) all at once.

**What should happen:**

The user sets county = "Travis". They think they're narrowing down to Travis county. They also happen to set state = "TX" (which they did on step 1). At runtime, the matcher checks in priority order, sees county is non-empty, and ignores the state filter. Only Travis county is active. The zip and metro filters are also ignored. This is correct.

**What feels wrong to the user:**

They set four filters. Only one is active. No warning. They have no way to know which one is active at runtime without reading the backend matcher code.

**Root cause:**

The wizard's form design (NATIVE_FORM.geo) reflects the frontend's capability to accept all four geo modes. The backend matcher's priority is an implementation detail buried in `matcher_clauses.py`. The frontend form and the backend logic are misaligned.

The fix was documented in CLAUDE.md line 44: "Geo is mutually exclusive on the backend. Matcher checks geo modes in priority order: county > city > zip > radius > state. Only one mode is active per box; selecting counties REPLACES city/zip/state filtering, not adds to it. The wizard UI lets users multi-select all four - data is persisted, but only the highest-priority non-empty mode narrows results."

But this truth was buried in documentation. Users saw a multi-select UI and assumed all selections were active.

**Impact:**

Users could create valid buy boxes with confusing filter stacking. For example:
- Buy box name: "5-county Austin-area search"
- States: [TX]
- Counties: [Travis, Williamson, Hays]
- Metros: [Austin, San Marcos]
- Zips: [78701, 78702]

At runtime, only the counties filter is active. The metros and zips are persisted in the database but ignored by the matcher. If the user later removes the counties, the metros become active. This asymmetry is documented but not obvious to the user.

**Why it was silent:**

The UI accepted the input without warning. No validation error. The form submit succeeded. The preview endpoint even returned an estimated count. But that count was based on only the active geo mode, not the visualized multi-select stack.

If a user thought they were setting "Austin metro OR 78701 zip" and the actual filter was just "Austin metro," they'd be confused by the results.

**How to avoid in the next build:**

1. Enforce UI/matcher alignment: Make the UI reflect the backend's priority. When the user selects a county, disable or gray out the metro/zip inputs with a tooltip "County selection overrides metro and zip filters."
2. State the priority: Render a visual indicator showing "Active filter: Travis County" below the geo inputs. Update it as the user changes values. Make the active filter explicit.
3. Single-select geo (if possible): If your domain can support it, change the UI to single-select: "Choose one: State / County / Metro / Zip." Force the user to pick one mode at a time. This prevents the confusing stacking.
4. Test priority order: Write tests for the matcher that verify priority is enforced. E.g., "If county and state both set, verify that only county is matched." Don't rely on documentation to enforce a critical contract.
5. Clear conflict warnings: If the form allows multi-select but the matcher uses only one, show a warning during edit: "⚠ Your buy box has counties and metros selected. Only counties will be matched. Edit to confirm."

### Incident 5: Building Class Auto-Population (Destructive UX)

**What happened:**

On Step 2 (Property Profile), when the user selects a building class chip (A/B/C), the form auto-populates the year_built_min and year_built_max fields via BUILDING_CLASS_YEAR_DEFAULTS.

```javascript
// BuyBoxPage23.jsx, line 273-277 (paraphrased)
if (building_classes value added and year_min/max empty) {
  setForm(prev => ({
    ...prev,
    phys: {
      ...prev.phys,
      year_built_min: BUILDING_CLASS_YEAR_DEFAULTS[class].year_built_min,
      year_built_max: BUILDING_CLASS_YEAR_DEFAULTS[class].year_built_max,
    }
  }))
}
```

**Issue:**

There is no confirmation dialog. The auto-population is immediate and silent. If the user:
1. Selects building class "A" (auto-fills year 2010+)
2. Then manually edits year_built_max to 2015 (overriding the auto-fill)
3. Then toggles class A off and back on

The year_built_max will reset to the default (unbounded), losing their manual edit.

**Impact:**

Users who expect manual edits to stick will be surprised. The UX feels magical (auto-filling is convenient) but also fragile (easy to lose edits).

**Root cause:**

The auto-population was added for UX convenience (most users who select a class want a reasonable year range). But it was not gated by "only if the user hasn't manually edited these fields."

**How to avoid in the next build:**

1. No silent auto-population: Do not automatically fill fields without user action. If auto-population is valuable, trigger it via an explicit "Use recommended range" button or checkbox.
2. Preserve manual edits: If you do auto-populate, track which fields were auto-filled. If the user manually edits an auto-filled field, clear the "auto-filled" flag. Do not re-populate over manual edits.
3. Visual indicator: If fields are auto-filled, show a subtle label "Auto-filled based on class" with an "edit" or "reset" link. Make the auto-population visible.
4. Scope: Only auto-populate fields that are empty AND directly related to the changed field. Don't auto-populate unrelated fields.

### Incident 6: Equity Preset Requires Value Floor (Conditional Requirement)

**What happened:**

The equity preset chip (e.g., "25%") is a convenience feature. When selected, it computes min_equity_dollar based on price_min (the assessed value floor). The formula is roughly: min_equity_dollar = price_min * (1 - equity_pct).

If price_min is empty, the chip cannot compute a dollar value. The payload should either omit the equity filter or send a 400 error.

**What the wizard does:**

If the user selects a 25% equity chip without setting a price_min, the chip shows a helper hint: "Set an assessed value floor above to apply this equity filter."

But the form accepts the chip selection. The user can proceed to Step 7 and activate the buy box. The payload is sent with equity_preset set but no min_equity_dollar (because the floor is missing).

**Root cause:**

The equity_preset chip is gated on having a price floor, but the gate is UX-only (a hint). The backend may or may not accept a payload with equity_preset but no price_min floor. The contract is ambiguous.

**Impact:**

If the backend requires both or only one, the wizard may send invalid data. If the backend is lenient and ignores the equity_preset when the floor is missing, the user's intent is silently lost. No error, no warning, just silent loss.

**How to avoid in the next build:**

1. Clarify the contract: Backend decides: "equity_preset requires price_min, return 400 if missing" OR "equity_preset is ignored if price_min is missing." Document this. Frontend enforces the rule.
2. UI-enforced requirement: If the backend requires both, prevent the user from setting equity_preset without price_min. Disable the chips until price_min is non-empty.
3. Submit-time validation: Before submit, check `if (equity_preset && !price_min) throw("Equity preset requires an assessed value floor")`. Fail loudly on the form, not on the backend.
4. Clear error message: If the backend does return 400, show the user a specific error: "Equity preset requires an assessed value floor. Please set the minimum assessed value and try again."

### Incident 7: Silent Optimistic Update Failures (No Rollback)

**What happened:**

Buy box mutations use optimistic updates. When the user clicks "Save buy box," the wizard:
1. Optimistically updates the form state and context
2. Sends PATCH /buy-boxes/:id
3. If response is error, throws error (line 261-262 of BuyBoxWizard.jsx)

If the PATCH fails, the throw is caught at the boundary (in the app shell), not in the wizard itself. The UI remains in the optimistic state with no rollback and no clear error message to the user.

**Example flow:**

1. User edits asset class from "multifamily" to "residential_sfr"
2. UI immediately shows "residential_sfr" everywhere (optimistic)
3. PATCH fails (e.g., backend 500 because a new field from migration 049 is not in the DB schema yet)
4. Wizard catches error, toasts message
5. User closes wizard
6. Navigates back to buy boxes view
7. The buy box still shows "multifamily" (server state) but they expect "residential_sfr" (UI state they just set)

**Root cause:**

No rollback mechanism. The optimistic update is fire-and-forget. If it fails, there's no automatic undo.

**Impact:**

Stale UI state. Users see conflicting information depending on which view they're in. High confidence of a bug, low confidence in the system's integrity.

**Why it was silent:**

The toast does appear. But it's easy to miss. If the user closes the modal before reading the toast, they have no idea the edit failed.

**How to avoid in the next build:**

1. State machine for mutations: Track mutation state: idle, pending, success, error. Do not show optimistic UI until state is at least "pending." Show error state explicitly with a "Retry" button.
2. Rollback on error: If PATCH fails, immediately revert the optimistic update with the original state. Show a banner: "Save failed. Changes discarded."
3. Persisted form state: Save the form state to localStorage before submit. On error, restore from localStorage. Users don't lose their edits.
4. Explicit confirmation: For critical mutations (e.g., delete), require a second confirmation after the first attempt fails. Prevent accidental cascade failures.
5. Block navigation on error: If a mutation fails, prevent the user from leaving the form until they either retry or explicitly discard changes.

### Incident 8: Orphaned Dead Code (Two Parallel Configurator Systems)

**What happened:**

The codebase has two separate buy box configuration systems:
1. BuyBoxWizard.jsx (current, used)
2. BuyBoxConfigurator/ folder (~1,280 lines of code, 10 files, zero imports)

The Configurator folder is a full-page, non-modal interface for buy box creation. It was built before the wizard. As the wizard became the standard, the Configurator was abandoned but not deleted.

**Proof of death:**

- No imports of Configurator files anywhere in the app
- CLAUDE.md marks it as "Orphaned (zero imports - safe to delete in next cleanup)"
- Its styles are in `src/styles/buy-box-configurator.css` (~700 lines, not imported)
- Related file `BuyBoxEditModal.jsx` (180 lines) is also orphaned

**Root cause:**

The team built version 1 (Configurator, full-page), shipped it, then decided to rebuild as a modal wizard (better UX). The wizard was built alongside the old Configurator. As the wizard stabilized, the Configurator was no longer used but was left in the codebase "just in case."

**Impact:**

Code bloat, confusion for new developers, maintenance debt. If you update the taxonomy or schema, you might accidentally also need to update the orphaned Configurator code (if it ever resurrects).

**Why it was silent:**

No CI rule to flag unused imports. The dead code sat in the repo, neither causing errors nor being actively harmful. It just existed.

**How to avoid in the next build:**

1. Atomic replacements: When you build a replacement for a feature, remove the old version at the same commit. Do not leave both in the codebase.
2. CI check for dead code: Use a linter to flag files/functions with zero imports. Require justification in code comments if they're kept. E.g., "Kept for reference until new API is stable" with a date.
3. Deprecation timeline: If you must keep old code, tag it with a deprecation comment and a removal date: "DEPRECATED 2026-04-20. Will be deleted 2026-06-20. Use BuyBoxWizard instead."
4. Clear migration path: If you're replacing a feature, document the new path in the old code. E.g., "// This component is no longer used. The wizard at /src/components/BuyBoxWizard.jsx replaces it."

### Incident 9: The Nightly Matcher Can Enforce Migration 049 Fields, But It Isn't Wired

**What happened:**

The backend's nightly matcher (`~/nightdrop-api/agents/lib/matcher_clauses.py`) has logic to enforce all the migration 049 filters (lot_sf, building_classes, aadt, road_frontage, etc.). It can match on these fields.

But there are two problems:
1. The legacy matcher script (`scripts/run_deal_feed.js` in the API repo) still exists and is still hardcoded in some places. It does NOT enforce migration 049 fields. It's a parallel system.
2. The wizard doesn't wire the UI to set these fields, so even if the matcher could use them, users can't set them.

**Root cause:**

The backend rebuild started with the new matcher (matcher_clauses.py, current). The old matcher (run_deal_feed.js, legacy) was kept for "back-compat" but never actually used. However, the lazy documentation and lack of CI enforcement meant the legacy matcher stayed in the codebase and could be mistaken for the active matcher.

**Impact:**

Confusion about which matcher is active. If someone asks "does the matcher support AADT filtering?", the answer is "yes, in the new Python matcher" but they might look at the legacy Node.js script and think "no, AADT is missing."

**Why it was silent:**

Both matchers work. The legacy one handles older buy boxes (with only the 50 original fields). The new one handles all 91 fields. No error occurs. The system just silently uses the right matcher based on buy box creation date.

**How to avoid in the next build:**

1. Single matcher: Have one matcher implementation. If you must support multiple versions of a schema, do it in one code path with version checking.
2. Clear switchover: Document the switchover date and deployment. "As of 2026-05-01, all new buy boxes use the Python matcher. Old Node.js matcher is deprecated and will be deleted 2026-07-01."
3. Feature parity tests: After deploying the new matcher, write tests that run both matchers on the same buy box and verify they return the same results (or explain why they differ). This catches silent incompatibilities.

### Incident 10: 5-County Coverage Falsely Exposed as Nationwide

**What happened:**

The wizard step 1 (geo selection) exposes all 51 US states (50 + DC) with STATE_COUNTS showing estimated match volumes for each state. E.g., "Texas: 412,500 deals matched."

The actual data covers only 5 counties in Texas: Travis, Bastrop, Hays, Williamson, Caldwell.

**What users think:**

"I can search nationwide. Look at all these state counts."

**What's actually true:**

"I can only search those 5 Texas counties. All other states have zero deals. The counts shown are mock/estimated, not real."

**Root cause:**

The frontend hardcoded STATE_COUNTS with sample numbers. The backend never was rebuilt to return real nationwide counts. The UI was created aspirationally, assuming the data would scale.

**Impact:**

Misleading users. If someone in California tries to create a buy box for California, the form accepts it, the preview runs, and they get zero matches. They don't know why (no deals), or they assume the system is broken, or they think they set filters incorrectly.

**Why it was silent:**

The UI worked. The preview returned 0. No error. The silent zero was rationalized as "no matches for your filters" instead of "no data for your state."

**How to avoid in the next build:**

1. Coverage assertion: Before exposing a geography in the UI, verify the backend has real data for it. If not, hide it or label it "Coming soon."
2. Coverage metadata: Have the backend return a list of available geographies. Frontend only renders those. No more aspirational states with mock counts.
3. Clear constraints: If you're launching MVP with limited coverage, put a banner on the UI: "Currently available in Travis, Hays, Williamson, Bastrop, Caldwell counties (Texas). Nationwide coverage coming Q3 2026."
4. Test data validation: Write tests that query real backend data for each exposed geography. If a state is shown to users, it must have at least N deals in the backend.

---

## Part 3: The Recurring Meta-Pattern (Silent Failure, Dishonest Success)

Across all the incidents above, there is a single recurring pattern: **The system appears to succeed (no errors, no warnings) but silently fails to deliver what the user intended.**

### Examples:

1. **Create endpoint drops fields.** User sets lot_sf_min. Form submits. Success response. Lot size filter is lost. Silent.
2. **Geo priority is hidden.** User sets county + metro. Form submits. Both are persisted. Only county is matched at runtime. Silent.
3. **Equity preset requires value floor.** User sets equity_preset. Hint appears. Form submits anyway. Equity filter is missing at runtime. Silent.
4. **Optimistic update fails.** User edits asset class. UI updates. PATCH fails. UI stays stale. User closes modal. Navigates back. Sees old value. Silent.
5. **Zero deals "matched."** User sets all filters for California. Form submits. Preview shows 0. No warning that CA is unsupported. User assumes filters are too tight. Silent.
6. **Orphaned code can go stale.** Configurator has 10 files, none imported. Mutation to taxonomy never updated this dead code. It would break silently if anyone ever tried to use it. Silent.

### Why This Pattern Emerged:

**Root cause:** The team prioritized "make it work end-to-end" over "make failures explicit." Every time a decision had to be made (drop fields? persist stale UI? accept invalid equity? expose unsupported geography?), the team chose the path that looked like success to the user, deferring the error message or warning to later.

This is a natural human tendency: shipping a feature that feels complete (even if it's not) beats shipping an incomplete feature with 10 validation errors blocking the user.

**Why it's bad:**

Silent failures erode trust. Users who experience the system working but getting wrong results will debug their own workflow ("maybe I set the filters wrong?") before they suspect the system. This leads to frustration, support tickets, and churn.

Explicit failures (errors, warnings, disabled states) are initially more annoying to users. But they build trust: users know exactly what the system can and can't do.

### The Antidote: Design for Visible Constraints

In the next build, adopt this principle: **If the system cannot do something, make it visible and explicit. Do not silently fail.**

Examples of "visible constraints":

- **"This field is not available on create. Edit the buy box after creation to set it."** (UI shows "Edit mode only" label)
- **"Geo filters are exclusive: only the highest-priority mode will be matched. You've selected county, so metro and zip will be ignored."** (UI shows active mode)
- **"Equity filter requires a value floor. Set the minimum assessed value to enable equity filtering."** (UI disables equity chips until value_min is set)
- **"Coverage is limited to these 5 Texas counties. No data available for your selected state."** (UI warns before form submit)
- **"We couldn't save your changes. Your edits were not applied. Retry or discard."** (UI shows rollback, not stale state)

---

## Part 4: Lessons and Guardrails for the Rebuild

These are not vague recommendations. These are concrete, enforceable rules to prevent the same failures in a new stack or domain.

### Guardrail 1: API Contract Symmetry

**Rule:** POST and PATCH to the same entity type must accept identical fields.

**Enforcement:**
- Write a backend test: generate a payload, POST it, read the created entity back, verify all fields match. Then PATCH the same payload and verify. If any field diverges, fail the test.
- Document any asymmetries: if a field is only settable on PATCH (not on POST), add a comment in the route handler: "// field_name is edit-only; not accepted on POST. See ticket #XYZ."
- Frontend assertion: before submit, compare the form's field set to the allowed fields for the current endpoint (POST vs PATCH). Throw if a mismatch is detected.

### Guardrail 2: Schema-to-Form Projection Validation

**Rule:** Every field in CLASS_SCHEMA must have a corresponding form input, or be explicitly marked as "not yet wired."

**Enforcement:**
- Startup check: iterate CLASS_SCHEMA. For each field, check if a form input exists. If not, throw with a message naming the field and the asset class. Do not allow the app to load if there's a gap.
- Mark aspirational fields: prefix with `_TODO_` in the schema: `_TODO_lot_sf_min`. These are visible in code review and CI checks can flag them.
- Test snapshot: for each asset class, render the form and snapshot the list of inputs. Compare to the schema. Fail if they diverge.

### Guardrail 3: Geographic Priority Enforcement

**Rule:** If your domain has hierarchical filters (geographic or categorical), enforce one-active-level in the UI.

**Enforcement:**
- Single-select geo: make the UI single-select, not multi-select. "Choose one: State / County / Zip". Prevent stacking.
- Active mode indicator: render "Active filter: Travis County" below the inputs. Update in real-time as the user changes values.
- Test matcher priority: write tests that verify the matcher enforces priority order. If county and state both set, verify state is ignored.

### Guardrail 4: No Silent Field Loss

**Rule:** If a backend field is defined but not accepted by an endpoint, return a 400 error. Do not silently drop fields.

**Enforcement:**
- Backend validation: check every incoming field against an allowlist for that endpoint. If a field is not on the list, return 400 with a message naming the field.
- Frontend pre-flight check: before submit, query the backend for the allowed fields for that endpoint. If the form includes a field not on the list, show an error: "Field X is not available for this operation."

### Guardrail 5: Explicit Conditional Requirements

**Rule:** If field A requires field B to be set, enforce this in validation, not in hints.

**Enforcement:**
- UI-level gate: disable input A until B is non-empty. Or show an error: "Set B to enable A."
- Validation function: before submit, check `if (A is set and B is empty) throw("A requires B")`.
- Backend validation: reject payloads that have A without B. Return 400 with a clear error message.

### Guardrail 6: Visible Optimistic Update State Machine

**Rule:** Track mutation state (idle, pending, success, error). Show the user the current state.

**Enforcement:**
- State: `const [mutationState, setMutationState] = useState('idle')`.
- On submit: set to 'pending', show spinner.
- On success: set to 'success', show success message, auto-close after 2s.
- On error: set to 'error', show error message, show "Retry" button. Do not auto-dismiss.
- No optimistic UI until at least 'pending'. No state persistence across error. Rollback on error.

### Guardrail 7: Dead Code Detection

**Rule:** No unused code in the repo. If code is not imported, it's either deleted or justified.

**Enforcement:**
- CI check: run `npm run check:unused-exports` (or equivalent for your language). Fail the build if unused code is found.
- Code comment: if you must keep unused code, add a comment: `// DEPRECATED 2026-04-20. Kept for reference until BuyBoxWizard ships. Remove 2026-06-20.` with a tracked removal date.
- Periodic sweep: monthly, audit the codebase for code marked as deprecated. If the removal date has passed, delete it.

### Guardrail 8: Coverage Metadata and Validation

**Rule:** Any geography, category, or constrained dimension exposed to users must have real backend data.

**Enforcement:**
- Backend API: `GET /metadata/available-geographies` returns the list of geographies with real data, including coverage statistics.
- Frontend: only render geographies returned by the metadata endpoint. Do not hardcode aspirational data.
- Test data validation: for each exposed geography, verify it has N>0 records in the backend. Fail CI if a geography is exposed but has no data.

### Guardrail 9: Round-Trip Testing

**Rule:** Every field and feature must pass a round-trip test: create/edit, read back, verify values match.

**Enforcement:**
- Test template:
  ```javascript
  test('lot_sf_min round-trip', async () => {
    const payload = { lot_sf_min: 2500, /* ... */ };
    const { id } = await create(payload);
    const read = await read(id);
    expect(read.lot_sf_min).toBe(2500);
  });
  ```
- Every field gets its own test. If a field fails round-trip, it's a blocker.

### Guardrail 10: Documentation Synced to Code

**Rule:** Documentation is generated from code or automatically validated against code.

**Enforcement:**
- Define the source of truth once (in code). Generate docs from code using a tool (e.g., TypeDoc, swagger-ui).
- If you maintain a separate documentation file (CLAUDE.md), write a test that reads both code and docs and verifies they agree on key facts (taxonomy size, field count, etc.).
- Enforce in CI: if docs disagree with code, fail the build.

---

## Part 5: Structural Patterns Worth Replicating

Beyond the guardrails (which are defensive), there are several structural patterns worth copying to the new build:

### 1. Multi-Step Form with Gated Progression

**Pattern:** Step 1, 2, 3, ... N. Forward gate: can only advance from step 1 if condition X. Backward gate: always allowed.

**Reusable:** Yes. Applies to any multi-step workflow (signup, checkout, loan origination, user onboarding).

**How to replicate:**
```javascript
const [page, setPage] = useState(1);
const canAdvance = page === 1 && form.assets.length > 0 && form.geo.states.length > 0;
<button onClick={() => canAdvance && setPage(p => p + 1)}>Next</button>
```

### 2. Schema-Driven Field Visibility

**Pattern:** Define UNIVERSAL_FIELDS and PER_CLASS_ADDITIONS in a central schema. Components read this schema to decide which inputs to render.

**Reusable:** Yes. Applies to any domain with multiple entity types (SaaS tiers, loan products, user profiles).

**How to replicate:**
```javascript
const CLASS_SCHEMA = {
  multifamily: { phys: ['units', 'stories'], fin: ['price_per_unit'] },
  land: { phys: [], fin: ['development_potential'] },
};
function classSchema(cls) { return CLASS_SCHEMA[cls] || {}; }
// In component:
const fields = classSchema(form.assetClass).phys;
{fields.map(f => <input key={f} />)}
```

### 3. Debounced Async Preview

**Pattern:** User types filter. After 400ms of silence, fire a preview request. AbortController cancels old requests if user types again.

**Reusable:** Yes. Applies to any domain with live feedback (search, filter preview, config validator).

**How to replicate:**
```javascript
const controller = useRef(new AbortController());
useEffect(() => {
  const timer = setTimeout(async () => {
    controller.current = new AbortController();
    const res = await fetch('/preview', { signal: controller.current.signal });
    setPreview(res);
  }, 400);
  return () => clearTimeout(timer);
}, [filterKey]);
```

### 4. Kanban Board with Drag-to-Transition

**Pattern:** Columns represent states. Cards are entities. Drag a card to a new column to update its state. Optimistic update in frontend, PATCH in backend.

**Reusable:** Yes. Applies to any workflow (task management, order fulfillment, lead nurturing).

**How to replicate:** Use a drag-drop library (react-beautiful-dnd, react-grid-layout) or implement manually with mouse events and element positioning.

### 5. Optimistic Updates with Rollback

**Pattern:** Update UI immediately (optimistic). Fire async mutation. If error, rollback. Show error message.

**Reusable:** Yes. Applies to any mutation-heavy UI.

**How to replicate:**
```javascript
const [state, setState] = useState(initialState);
async function update(newState) {
  setState(newState); // optimistic
  try {
    await api.patch('/resource', newState);
  } catch (e) {
    setState(initialState); // rollback
    throw e; // or show toast
  }
}
```

### 6. Per-Class Color Palette

**Pattern:** Define a color for each taxonomy item. Use that color in badges, cards, charts, and legends.

**Reusable:** Yes. Applies to any system with color-coded categories.

**How to replicate:**
```javascript
const COLORS = { multifamily: '#6366F1', land: '#5BCC48', ... };
function assetColor(cls) { return COLORS[cls] || '#999'; }
// Usage:
<div style={{ background: assetColor(form.assetClass) }} />
```

---

## Part 6: Conclusion and Handoff

The buy box wizard achieved its primary goal: provide a guided UX for creating and editing buy boxes. Users can click through 7 steps and emerge with a working filter. The Command Center provides a visual dashboard for managing all boxes.

However, the implementation accumulated technical debt through silent failures and incomplete coverage. The next team should prioritize:

1. **Visible constraints over silent failures.** If the system can't do something, say so.
2. **API contract clarity.** POST and PATCH must be symmetric, or the asymmetry must be documented and enforced.
3. **Full field coverage.** If a field is in the schema, wire it into the form. Don't claim 91 fields and deliver 30.
4. **Geographic clarity.** Make filter priority explicit in the UI. Don't silently activate only one of four modes.
5. **Dead code cleanup.** Delete unused code. Don't leave orphaned systems in the codebase.
6. **Enforced testing.** Round-trip tests, schema validation, coverage checks. Make failures loud and early.

The structural patterns (multi-step forms, debounced previews, kanban boards, optimistic updates) are sound and reusable. Build on these patterns. But fix the silent failures first.

**For the team rebuilding this in a new domain:** Replace the CRE-specific content (asset classes, distress signals, geographic scopes, financial thresholds) with your domain's equivalents. Keep the structural patterns. Add the guardrails from Part 4. You'll ship a better product, faster.

---

**Document created:** 2026-05-29  
**Status:** Historical record for next rebuild  
**Next session:** Buy Box MVP Rebuild (estimated 2026-06-15)
