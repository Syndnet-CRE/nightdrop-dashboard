# Buy Box Configurator - Handoff Package

**Status:** Curated for embedding | **Stack:** React 19 + Vite, plain CSS | **Audience:** Teams rebuilding in a different stack and domain

This handoff packages two UI surfaces: a **Buy Box Management page** (Kanban) and a **Buy Box Configurator wizard**. They are extracted from the Nightdrop Dashboard (a CRE deal-matching tool) and documented to be **rebuilt, not npm-installed**, into a completely different platform and business domain.

The value is structural. The patterns (multi-step forms, kanban state machines, live preview debouncing, drag-to-transition) transfer directly. The CRE content (asset class taxonomy, distress signals, geo filters) is example data to replace.

---

## What You're Building

### The User Journey

A user needs to set up a **buy box**: a standing filter for "show me deals that match this profile". They:

1. Open the **Management page** and click "New buy box"
2. Walk through a **6-step Configurator wizard** (down from the original 7, with financial distress signals cut)
3. See a live match count preview as they refine criteria
4. Activate the buy box and see a success confirmation
5. Return to the Management page to manage all active buy boxes in a kanban board

On the Management page, they:
- Drag buy box cards between status columns (Pending, Validating, Active, Paused, Coverage gap)
- See a week schedule grid (which days the buy box runs)
- Pause/resume/edit/delete boxes via card actions
- Watch delivered-deal counts and sparklines update in real-time

### The User Value

**Time savings:** Instead of describing filters in text or emails, users build them visually in minutes. They see live feedback on how many deals will arrive.

**Clarity:** The kanban board shows the health of all active filters at a glance. Cards are rich but compact: status, asset class, geo summary, week schedule, last run time, delivered count.

**Control:** A true weekly schedule picker (new [BUILD] feature) lets users run different buy boxes on different days, not just "daily" or "weekly" canned presets.

---

## Package Contents

### source/ - Verbatim React Reference

24 files, ~6,764 lines of production code from `nightdrop-dashboard`. Do NOT npm-install or boot standalone; this code depends on a host app shell, contexts, and a REST API backend. It is **reference material** for understanding the original design and UX.

Read `source/` when you need to see:
- Exact component prop shapes and event signatures
- CSS selectors and class naming conventions
- Form state machine logic (NATIVE_FORM, toNativeForm, nativeToPayload)
- Live preview debounce and abort-controller cleanup patterns

### docs/ - Stack-Agnostic Specification

Start here. Read in order. These documents define WHAT to build, HOW to rebuild it, and WHAT to avoid.

| Doc | Purpose | Read when |
|-----|---------|-----------|
| **01-UX-FLOWS.md** | Screen-by-screen user journeys, interaction sequences, and happy-path flows. | First. Understand what users do. |
| **02-STATE-MACHINE-AND-CONTRACTS.md** | Wizard state shape, form validation rules, component prop contracts, event signatures. | Before you design the component architecture. |
| **03-DATA-CONTRACT.md** | API endpoints, request/response payloads, state layer behavior, optimistic-update semantics, error handling. | Before you write backend integration code. |
| **04-DESIGN-SYSTEM.md** | Design tokens (color palette, typography, spacing, radii, motion), layout anatomy, interaction states, responsive breakpoints. | When designing UI or implementing CSS. |
| **05-REBUILD-GUIDE.md** | Framework-agnostic strategy: which patterns are structural (reuse everywhere), which are CRE-specific (replace), build order, testing strategy, definition of done. | Before you start coding. Read the "Landmines" section. |
| **10-DOMAIN-REFERENCE.md** | The original CRE taxonomy (10 asset classes), field schema (91 patchable fields), three-state booleans, example data. Explicitly labeled as EXAMPLE to replace. | When you need to understand the original domain. |
| **11-POSTMORTEM.md** | Honest retrospective: what worked (live preview debouncing, kanban UX, schema-driven fields), what failed silently (create-vs-edit field drift, optimistic-update rollback gaps), actionable lessons. | Before you design, to avoid repeating mistakes. |

---

## The Legend: [PORT] / [CUT] / [BUILD]

Every feature is tagged. Use this language consistently with your team.

- **[PORT]**: Exists in source code. Your job is to replicate its behavior in your stack. Example: "Kanban board with 5 status columns [PORT]" means the source has this pattern; rebuild it in your framework of choice.

- **[CUT]**: Deliberately excluded from this handoff to simplify the initial rebuild. Do not build these unless your stakeholders explicitly ask. Example: "Distress Signals step with 12 signal cards and AND/OR logic [CUT]" means the original wizard had this, but it is not part of the curated package.

- **[BUILD]**: Does not exist in source. Must be built new to spec. Example: "True per-day Monday-Sunday schedule picker [BUILD]" means the original only had "Daily / Weekly / Real-time" cadences; the new build adds a full day-by-day editor.

---

## How Source and Docs Relate

**Source files are reference.** They are provided verbatim, with exact line numbers and file paths, so you can trace behavior and understand the original design.

**Docs define the curated target.** When a doc says [CUT], you ignore that feature in the source. When it says [BUILD], you find a corresponding behavior spec in the contracts doc. When it says [PORT], you read the source to understand the pattern, then rebuild it in your stack.

**Domain content is example.** References to "asset class" (real estate), "buy box" (real estate concept), "distress signals" (real estate metrics), geo modes (counties/states/ZIP), and delivery cadence (nightly runs) are specific to commercial real estate. Your domain will have different entities and workflows. The structural patterns (multi-step form, kanban, live preview) are what you adopt.

---

## Reading Order

### Quick Path (3 docs, ~45 min)
If you only read three, read these:
1. **01-UX-FLOWS.md** - Understand what users do
2. **05-REBUILD-GUIDE.md** - Understand how to rebuild it
3. **11-POSTMORTEM.md** - Learn what to avoid

### Full Path (recommended, ~90 min)
1. **01-UX-FLOWS.md** - User journeys, screen flows, interaction sequences
2. **02-STATE-MACHINE-AND-CONTRACTS.md** - Form state shape, component props, validation rules
3. **03-DATA-CONTRACT.md** - API contract, request/response shapes, optimistic updates
4. **04-DESIGN-SYSTEM.md** - Tokens, layout, interaction states, responsive rules
5. **05-REBUILD-GUIDE.md** - Build order, structural vs. domain-specific patterns, testing strategy
6. **10-DOMAIN-REFERENCE.md** - Understand the original CRE domain (for context only)
7. **11-POSTMORTEM.md** - Retrospective lessons before you start coding

### Reference Path (while building)
- **source/components/BuyBoxWizard.jsx** (407 lines) - Wizard state machine, step navigation, submit logic
- **source/views/BuyBoxesView.jsx** (477 lines) - Kanban board, drag-and-drop, status transitions
- **source/lib/buyBoxFieldSchema.js** (193 lines) - Per-class field visibility pattern (replicate this logic)
- **source/lib/buyBoxTaxonomy.js** (301 lines) - Schema definition; replace with your domain's taxonomy
- **source/contexts/DealsContext.jsx** (204 lines) - Data layer pattern, fetch/create/update/delete
- **source/styles/buy-box-wizard.css** + **buy-box-wizard-pages.css** (~1,066 lines) - Layout and interaction CSS

---

## The Curation: What's In, What's Out, What's New

### Management Page (Kanban)

All [PORT] unless noted.

- **5 status columns exactly:** Pending (awaiting validation), Validating (coverage check in progress), Active (running), Paused (manually paused), Coverage gap (no parcel data). Gap column rejects drops.
- **Rich cards:** Label, status dot, delivered count (large) + weekly delta, sparkline, asset class chip, geo chip, last-run timestamp, week schedule grid, coverage alert (gap cards only).
- **Drag-and-drop:** Dragging between lanes triggers a status PATCH. Optimistic update makes it snappy.
- **Card actions:** Pause (active), Resume (paused), Configure/Edit (any), Edit geo (gap only). Pause requires a confirmation modal.
- **Header buttons:** "New buyer search" (stub, [PORT] the button, document it as a placeholder, exact destination TBD) and "New buy box" (opens wizard in create mode).
- **Metric tiles in left sidebar:** New This Week, Hot Deals, Response Rate, Awaiting. Fed from a KPIs endpoint. Two are clickable feed filters; two are display-only. (These live in LeftPanel.jsx, NOT the buy-box view, but are shown in the same page.)

### Configurator Wizard

**Reduced from 7 steps to 6 effective steps** via deliberate cuts.

| Step | Status | Scope |
|------|--------|-------|
| **Step 1: Target** | [PORT] | Asset class (single-select primary, up to 3 sub-assets) + geography (states, counties, metros, optionally ZIP). [CUT] ZIP-code subsection. Keep states, counties, metros. |
| **Step 2: Profile** | [PORT] | Physical property envelope only (sqft, acreage, year built, building class, etc.). [CUT] entire "B Financial" subsection (assessed value, owner equity presets, price-per-unit, improvement-to-land, development-potential). After cut, this page becomes 1-column instead of 2. |
| **Step 3: Owner** | [PORT] | Entity type, hold period, out-of-state, absentee. [KEEP] "Tax delinquent" and "Active foreclosure" toggles as plain owner flags (the distress-scoring machinery they used to feed is [CUT]). |
| **Step 4: Location** | [PORT] | Location and risk: utilities, floodplain/wetlands, opportunity zone, TIF, class-specific rules (AADT for commercial). This was page 5 of the original 7. |
| **Step 5: Threshold** | [PORT] | Match threshold cards: 70% (high volume, loose match), 80% (balanced), 90% (high precision, low volume). This was page 6 of original 7. |
| **Step 6: Activate** | [PORT] + [BUILD] | Review filters, set delivery cadence (Daily / Weekly / Real-time), **and pick a per-day Monday-Sunday schedule [BUILD]**. Name the buy box. This was page 7 of original 7. |
| **[CUT] Old Step 4: Distress** | [CUT] | Twelve signal cards, AND/OR logic, distress-floor slider. Entirely removed. This simplifies the first-time UX and avoids asking domain-specific questions. |

**New [BUILD] Feature: Per-Day Schedule Picker**

The original only offered canned cadences (Daily / Weekly / Real-time). The new build adds a **true day-of-week picker** in the Activate step:
- Shows 7 buttons, one per day (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- User toggles any subset
- Writes to `run_schedule.days` (7 booleans, Monday through Sunday)
- Also appears as a **quick-edit control on management cards** (no modal, inline toggles in the week strip)

This lets users run different buy boxes on different days, not just all-days-or-one-day.

### Wizard Chrome and Interactions

- **Stepper/timeline header:** Shows 6 stages. Must renumber after the Distress step cut. Active, done, and pending states clearly marked.
- **Backward navigation:** Always allowed. Clicking a completed step jumps backward to it. No skipping ahead.
- **Forward gating:** Step 1 requires `form.assets.length > 0 && form.geo.states.length > 0`. No other gates.
- **Right-side live preview rail [PORT]:**
  - Live clock (HH:MM:SS, ticking)
  - Animated match count with delta
  - Geographic concentration summary
  - Active filter chips with remove buttons
  - After financial section cut: equity stat cell is removed; the stat trio becomes 2 cells (hold + occupancy)
- **Activation success dialog [PORT]:**
  - "Buy box activated / You're hunting" headline
  - Match pool + first-drop + cadence cells
  - Two buttons: "Return to dashboard" (onClose) and "Build another ->" (resets wizard to create mode)
  - Focus trap (keyboard-only modal)

---

## Critical Patterns to Preserve

### 1. Form State Machine

Original uses `NATIVE_FORM` (the in-memory form shape) and helpers:
- `toNativeForm(buyBox)`: Convert backend buy box to form state
- `nativeToPayload(form)`: Convert form state to API payload
- `EMPTY_FORM`: The initial create state

These helpers decouple form UX from API contract. When the backend adds a field, you update the payload function, not every step page.

**Reusable pattern:** Adopt this layer in your rebuild. Don't have step pages talk directly to the API.

### 2. Live Preview with Debounce and AbortController

The original debounces the preview request 400ms and cancels in-flight requests if the user changes the form again.

```
user edits field → 400ms timer → send POST /preview
user edits field again (within 400ms) → cancel old request → reset timer → new POST
```

If the backend times out, show graceful "Preview timed out" instead of a hard error banner.

**Reusable pattern:** Use this in any multi-step form with live feedback.

### 3. Schema-Driven Field Visibility

Original defines `CLASS_SCHEMA` once (per-asset-class, per-field visibility) and all step pages read from it.

**Reusable pattern:** Single source of truth for "which fields show on which pages". No copy-paste of field lists. Scales to any domain.

### 4. Kanban with Drag-and-Drop Status Transitions

Original uses HTML5 drag-and-drop (not a library) and optimistic updates.

```
drag card from "Active" to "Paused" → immediate visual move → PATCH /buy-boxes/{id} {status: 'paused'}
```

Coverage-gap lane rejects drops (no onChange).

**Reusable pattern:** Kanban with drag-triggered mutations is valuable for any domain. The gap-lane-no-drops pattern (read-only status) is domain-agnostic.

### 5. Rich Card Metadata Without Clutter

Cards show: label, status dot, delivered count, delta, sparkline, asset class chip, geo chip, last-run time, week grid, and alert. Yet they don't look crowded.

This is achieved via:
- Consistent use of design tokens (font sizes, spacing, colors)
- Visual hierarchy (large number for count, smaller text for delta)
- Icons that disambiguate (MapPin for geo, TrendingUp for sparkline)

**Reusable pattern:** Define a card anatomy (what slots exist) and use layout and typography to prevent cognitive overload.

---

## File References

### Wizard Components (step-by-step)

| Source File | Lines | Key Logic |
|-------------|-------|-----------|
| `source/components/BuyBoxWizard.jsx` | 407 | Wizard shell, form state, step nav, submit, preview debounce |
| `source/components/BuyBoxPage1.jsx` | 574 | Step 1: asset class + geo |
| `source/components/BuyBoxPage23.jsx` | 392 | Steps 2-3: property + owner |
| `source/components/BuyBoxPage4.jsx` | 204 | Step 4: distress (TO BE CUT) |
| `source/components/BuyBoxPage5.jsx` | 333 | Step 5: location risk |
| `source/components/BuyBoxPage6.jsx` | 71 | Step 6: threshold |
| `source/components/BuyBoxPage7.jsx` | 101 | Step 7: review + activate (renumber to 6 after cut) |
| `source/components/BuyBoxRightRail.jsx` | 160 | Live preview rail, match count, filter summary |
| `source/components/BuyBoxActivatedDialog.jsx` | 167 | Success confirmation modal |

### Management Components

| Source File | Lines | Key Logic |
|-------------|-------|-----------|
| `source/views/BuyBoxesView.jsx` | 477 | Kanban board, cards, drag-drop, actions |
| `source/components/BuyBoxCard.jsx` (inline in BuyBoxesView) | ~100 | Card rendering, actions menu, week strip |

### Data and Schema

| Source File | Lines | Key Logic |
|-------------|-------|-----------|
| `source/contexts/DealsContext.jsx` | 204 | Data fetching, mutations (create/update/delete) |
| `source/lib/buyBoxFieldSchema.js` | 193 | Per-class field visibility (UNIVERSAL_PHYS, UNIVERSAL_FIN, class-specific) |
| `source/lib/buyBoxTaxonomy.js` | 301 | Asset class list, sub-asset options, geo states/metros (EXAMPLE: replace with your domain) |
| `source/lib/wizardFormState.js` | 373 | NATIVE_FORM, toNativeForm, nativeToPayload (CORE: keep the pattern) |

### Styles

| Source File | Lines | Key CSS |
|-------------|-------|---------|
| `source/styles/tokens.css` | 397 | Color, type, spacing, radii, motion (EXAMPLE palette, keep the token approach) |
| `source/styles/buy-box-wizard.css` | 241 | Wizard shell layout and modal styling |
| `source/styles/buy-box-wizard-pages.css` | 825 | Step pages, form fields, grid layouts |
| `source/styles/buyBoxes.css` | 443 | Kanban board, cards, lanes, drag styles |
| `source/styles/buyBoxActivated.css` | 200 | Success dialog styling |

---

## Definition of Done

Before you ship your rebuild:

- [ ] All 6 wizard steps render and validate correctly
- [ ] Backward navigation works from any step; forward is gated on Step 1 (asset class + geo required)
- [ ] Live preview fires on form change, debounced 400ms, cancels in-flight requests, handles timeouts gracefully
- [ ] Kanban board renders all 5 columns and rejects drops on Coverage-gap lane
- [ ] Drag-and-drop triggers status PATCH and optimistic update
- [ ] Card metadata (count, delta, sparkline, week grid, alert) all render correctly
- [ ] [NEW] Per-day Monday-Sunday schedule picker in Activate step works; writes to `run_schedule.days` (7 booleans)
- [ ] [NEW] Quick-edit schedule controls on management cards toggle day-by-day
- [ ] Success modal appears after activate, shows match-pool + first-drop + cadence, offers "Return" and "Build another" buttons
- [ ] Pause action shows confirmation modal and patches status to 'paused'
- [ ] Resume, Edit, Edit geo actions navigate or open modals correctly
- [ ] All interactions are tracked in your analytics (if your platform has analytics)
- [ ] No console errors or warnings in production build
- [ ] Responsive design works at 320, 768, 1024, 1440 breakpoints
- [ ] Keyboard navigation and focus management pass a11y checks

---

## Start Building

1. Read **01-UX-FLOWS.md** to understand the user journeys.
2. Read **05-REBUILD-GUIDE.md** for build order and structural patterns.
3. Read **11-POSTMORTEM.md** to see what failed silently in the original (so you don't repeat it).
4. Open **02-STATE-MACHINE-AND-CONTRACTS.md** and **03-DATA-CONTRACT.md** as reference while you code.
5. Use **source/** code as line-by-line reference for prop shapes, CSS selectors, and logic.
6. Use **04-DESIGN-SYSTEM.md** as your design token and layout reference.

Good luck. The original team learned some hard lessons. This package captures what worked (and can be reused) and what failed (and should be avoided). Read the retrospective before you start.
