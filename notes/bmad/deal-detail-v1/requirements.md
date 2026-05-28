# Requirements — Deal Detail V1

**Date:** 2026-05-24
**Status:** Approved, building

## Goal

Replace the `/deal/:id` page entirely with the V1 design package delivered at `~/Downloads/design_handoff_deal_id_page/`. Frontend-only — no backend changes, no new migrations, no new API routes.

## Source artifacts

- **Design package:** `~/Downloads/design_handoff_deal_id_page/` (16 files, see `README.md`)
- **Wiring contract:** `notes/audit/FRONTEND-WIRING-CONTRACT-2026-05-24.md`
- **Schema truth:** `DATABASE.md`

## Constraints

1. No backend changes.
2. Reuse only the existing endpoints documented in the wiring contract Section 7.
3. Reuse only the data shapes the live API actually returns (audited 2026-05-24 — see `architecture.md` data table).
4. Page background = `#171717` (override from V1 `#08090b`).
5. Card borders = `#404040` (override from V1 `#5e5e5e`).
6. Every other V1 token (color, spacing, shadow, typography, hover state, interaction) ships verbatim.

## Locked decisions (from planning session 2026-05-24)

| Decision | Choice |
|---|---|
| Modal mode (from MapView) | Kept. V1 topbar suppressed inside overlay (`embedded={true}` prop on `DealShell`). |
| "Need More Info" verdict | Kept, UI-only local state, no backend write. |
| Property POV narrative tab | Dropped. Card renamed to "AI Narrative", single view fed from `deal.brief_json`. |
| Activity composer "Task" button | Dropped. Backend `channel` enum doesn't include `task`. Composer = Note + Call. |
| Intel sections with no data path (Tax/Mortgage/Foreclosure/Permits/Geo/Utilities/Market) | Honest empty states. Render group only if `deal.brief_json` populates ≥1 row. |
| Chain of Title section | "Coming soon" empty state if `<2` events derivable from brief_json. |
| `lucide-react` imports inside `src/components/DealDetail/*` | New exception alongside `TopHeader.jsx` and `AdminView.jsx`. Wiring contract Section 13 updated in Phase 6. |

## Non-goals (out of scope for this work)

- Backend schema changes.
- New endpoints for chain-of-title history, full intel tabs, or computed UW KPIs.
- Mobile layout for `/deal/:id` (desktop-only, matches V1).
- Skip Trace, Send Offer, Add to List action wiring (V1 design shows them in Deal Actions panel; render as inert buttons for now).
- Real LLM streaming for the AI Narrative (just render `deal.brief_json.narrative` static).

## Out-of-scope drift to flag in HANDOFF

- The "Properties Intelligence — 500+ data points" claim from V1 is impossible against the current backend. We'll render whatever brief_json exposes (~10-30 fields). Document remaining ~470 fields as backend work for a future session.
- "Activity entry types" Email + Task + AI: backend has no creator UI for these. We render existing entries if any exist, but composer only writes Note + Call.
