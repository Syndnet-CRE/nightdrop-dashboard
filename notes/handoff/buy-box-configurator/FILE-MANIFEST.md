# Buy Box Configurator - Curated Handoff Package

This package hands off the Nightdrop Dashboard buy box experience so another team can rebuild it inside a different platform and a different business domain. It covers two surfaces: the **buy box management page** (a Kanban board) and the **buy box configurator wizard** (create and edit).

The scope is **curated**, not a raw dump. Specific parts of the original are deliberately excluded, and one part is a net-new build. Every capability is tagged so intent is unambiguous:

- `[PORT]` - exists in the source, replicate its behavior.
- `[CUT]` - deliberately excluded from this build.
- `[BUILD]` - does not exist in the source, must be built new to the spec.

Generated from repo `nightdrop-dashboard` (React 19 + Vite, plain CSS, no TypeScript).

## Curated scope at a glance

**Management page (all [PORT]):** Kanban with 5 lanes (Pending, Validating, Active, Paused, Coverage gap), native drag to change status, buy box cards, left-sidebar metric boxes, New buyer search button (a stub today) and New buy box button, plus pause / resume / reconfigure.

**Configurator wizard (curated to 6 steps):** Target (asset class + geography, `[CUT]` zip codes) → Profile (physical only, `[CUT]` financial) → Owner (kept, incl. tax-delinquent and active-foreclosure as plain owner flags) → Location and risk → Match threshold → Review and activate (cadence + activation dialog). The old Distress-signals step is `[CUT]` entirely.

**New requirement `[BUILD]`:** a true per-day Monday-Sunday editable schedule picker. Today only a Daily / Weekly / Real-time cadence exists and the card week strip is read-only. See `docs/07-SCHEDULE-EDITOR-SPEC.md`.

The authoritative in / out list with exact cut ranges is `docs/01-SCOPE.md`.

## How to read this package

1. `docs/00-README.md` - orientation and the tag legend.
2. `docs/01-SCOPE.md` - the authoritative what-to-build spine.
3. `docs/02-UX-FLOWS.md` - the curated user journeys.
4. `docs/03-MANAGEMENT-SURFACE.md` and the contract docs - the detail.
5. `docs/09-CODE-MAP.md` - jump from any feature to its exact source location.
6. `docs/11-POSTMORTEM.md` - read before designing; what not to repeat.

## docs/ - the stack-agnostic specification

| Doc | Purpose |
|-----|---------|
| `00-README.md` | Orientation, user value, tag legend, reading order. |
| `01-SCOPE.md` | Authoritative IN / OUT / BUILD spine, mapped to file:line, with exact cut ranges. |
| `02-UX-FLOWS.md` | Curated journeys: management page + 6-step wizard + activation. |
| `03-MANAGEMENT-SURFACE.md` | Deep spec of the Kanban, lanes, drag rules, cards, metric boxes, buttons. |
| `04-STATE-AND-CONTRACTS.md` | Form-state model + 6-step state machine + component contracts. |
| `05-DATA-CONTRACT.md` | API wrapper, endpoints, payload shapes (post-cut), run_schedule model, KPIs. |
| `06-DESIGN-SYSTEM.md` | Tokens, wizard + Kanban layout, pills, interaction states, activation dialog. |
| `07-SCHEDULE-EDITOR-SPEC.md` | `[BUILD]` spec for the per-day Mon-Sun schedule editor (net-new). |
| `08-REBUILD-GUIDE.md` | Framework-agnostic build order, structural vs domain, landmines, definition of done. |
| `09-CODE-MAP.md` | Feature-to-source index with PORT / CUT / BUILD tags. |
| `10-DOMAIN-REFERENCE.md` | Original CRE taxonomy and field schema, labeled EXAMPLE content. |
| `11-POSTMORTEM.md` | Honest retrospective of the original build. |

## source/ - the real React source, verbatim

Mirrors the repo `src/` layout. 28 files. Provided as-is for reference; it is not standalone-runnable (it depends on the host app shell, contexts, and backend). Source is intentionally left complete and untrimmed; the curation is expressed in the docs, not by editing code.

### Wizard - create and edit

| File | Role |
|------|------|
| `src/components/BuyBoxWizard.jsx` | Wizard shell, `STEPS`, step render/nav, filter/summary builders, preview fetch, activation handler. |
| `src/lib/wizardFormState.js` | The payload brain: `EMPTY_FORM`, `nativeToPayload`, `toNativeForm`. |
| `src/components/BuyBoxPage1.jsx` | Step 1 Target: asset class + sub-asset chips + geography (incl. the zip block that is `[CUT]`). |
| `src/components/BuyBoxPage23.jsx` | Exports Page2 (Profile: physical + the financial section that is `[CUT]`) and Page3 (Owner). |
| `src/components/BuyBoxPage4.jsx` | Distress signals - `[CUT]` entirely in the curated build. |
| `src/components/BuyBoxPage5.jsx` | Location and risk (curated step 4). |
| `src/components/BuyBoxPage6.jsx` | Match threshold 70/80/90 (curated step 5). |
| `src/components/BuyBoxPage7.jsx` | Review and activate + delivery cadence (curated step 6). |
| `src/components/buyBoxInputs.jsx` | Reusable numeric inputs (NumberField, RangeInputs, SingleInput). |
| `src/components/BuyBoxRightRail.jsx` | Live match pool: clock, animated count, geo concentration, active filters. |
| `src/components/BuyBoxActivatedDialog.jsx` | Post-activate success dialog + Build another. |
| `src/components/buybox-icons.jsx` | Icon set. |

### Management - the Kanban Command Center

| File | Role |
|------|------|
| `src/views/BuyBoxesView.jsx` | Kanban board, 5 lanes, drag/drop, cards, header buttons. |
| `src/pages/BuyBoxPage.jsx` | Wizard route wrapper (create/edit). |
| `src/components/LeftPanel.jsx` | Left sidebar incl. the metric boxes (New This Week, Hot Deals, Response Rate, Awaiting). |
| `src/components/ConfirmModal.jsx` | Pause confirmation modal. |
| `src/components/BuyerSearchComingSoonModal.jsx` | The New buyer search stub overlay. |

### Data + contract

| File | Role |
|------|------|
| `src/contexts/DealsContext.jsx` | Central data layer (`useDeals`): fetch/create/update/delete buy boxes. |
| `src/lib/api.js` | `request()` wrapper: base URL, auth, error shape, get/post/patch/delete. |
| `src/lib/buyBoxTaxonomy.js` | 10-class asset taxonomy, land sub-assets, states, metros (domain example). |
| `src/lib/buyBoxFieldSchema.js` | `classSchema()` per-asset-class field map (domain example). |

### Design

| File | Role |
|------|------|
| `src/styles/tokens.css` | Design tokens (color, type, spacing, radii, motion). |
| `src/styles/buy-box-wizard.css` | Wizard shell + stepper styling. |
| `src/styles/buy-box-wizard-pages.css` | Wizard step-page layouts. |
| `src/styles/buy-box-configurator.css` | Configurator layout. |
| `src/styles/buy-box-edit-modal.css` | Edit modal styling. |
| `src/styles/buyBoxes.css` | Kanban board, cards, week strip, metric-adjacent styling. |
| `src/styles/buyBoxActivated.css` | Activation dialog styling. |

## Important context

- Original stack: React 19 + Vite, react-router v7, plain CSS with design tokens. No TypeScript, no Tailwind.
- The source depends on the host app (auth, toast, deal state contexts) and a REST backend. It is reference material, not a runnable module.
- The CRE (commercial real estate) domain content in `buyBoxTaxonomy.js`, `buyBoxFieldSchema.js`, and `docs/10-DOMAIN-REFERENCE.md` is EXAMPLE content. The structural patterns transfer; the domain fields get replaced.
- The per-day schedule editor in `docs/07-SCHEDULE-EDITOR-SPEC.md` is a `[BUILD]` requirement. Do not look for it in the source; it does not exist yet.
