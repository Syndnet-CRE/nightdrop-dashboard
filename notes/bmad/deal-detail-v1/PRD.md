# PRD — Deal Detail V1

**Date:** 2026-05-24
**Inherits from:** V1 design package README at `~/Downloads/design_handoff_deal_id_page/README.md`

This PRD does not re-derive what the V1 README already specifies in full. It captures only the deltas required to integrate V1 into the nightdrop-dashboard stack.

## Stack deltas

| Layer | V1 recommends | Nightdrop ships |
|---|---|---|
| Framework | Next.js 14 App Router | React 19 + Vite 8 |
| Language | TypeScript | JSX only |
| Styling | CSS Modules + tokens | Plain CSS + tokens (scoped via classnames) |
| Component primitives | Radix UI | Hand-rolled (no Radix in repo) |
| Icons | Lucide React | Existing `Icons.jsx` (`I` object) for app; `lucide-react` direct inside `DealDetail/*` |
| Maps | Leaflet + Esri tiles | `react-map-gl` v8 + `mapbox-gl` v3, `satellite-streets-v12` |
| State | TanStack Query + Zustand | Custom contexts (`useDeals`, `useAuth`) |
| Routing | `/deals/[dealId]` | `/deal/:dealId` (existing convention) |

## Visual deltas from V1

| Token | V1 | Nightdrop |
|---|---|---|
| `--bg` (page) | `#08090b` | **`#171717`** |
| `--card-border` | `#5e5e5e` dark / `#b8bcc2` light | **`#404040` dark** / `#b8bcc2` light unchanged |

All other tokens (every color, every shadow, every spacing, all typography) ship verbatim from V1's `colors_and_type.css` + `deal-tokens.css`.

## Component spec deltas from V1

| Component | V1 spec | Nightdrop variant |
|---|---|---|
| DealNarrative | 2 tabs (AI Briefing / Property POV) | 1 tab (renamed "AI Narrative"). POV dropped — no backend source. |
| DealActivityRail composer | 3 buttons (Note / Call / Task) | 2 buttons (Note / Call). Task dropped — no backend channel. |
| DealActivityRail feed filter pills | `All / Note / Call / Task / V1 AI` | `All / Note / Call / V1 AI` (Task pill dropped). |
| DealIntel tabs | All 6 tabs (Physical / Tax / Mortgage / Geo / Utilities / Market) always render | Each tab renders rows only if data exists; empty groups hidden; if 0 rows total in a tab, show empty state "Awaiting enrichment data". |
| DealTimeline | Full chain of title (deeds, loans, permits, liens, violations) | Sparse — only events derivable from `brief_json` (typically just `last_sale_date`). If `<2` events, render empty state "Title history coming soon". |
| DealHero KPI strip | 8 KPIs (Est Value, Going-in Cap, NOI, Levered IRR, Equity Mult, Cash-on-Cash, DSCR, $/SF) | 2 KPIs only — Est Value + $/SF (computed from `deal.value / deal.building_sf`). The other 6 require UW assumptions; users get them by opening the Calculator. |
| DealOwnerGraph | Mock data | Live data via `useDeals().fetchOwnerPortfolio(deal.attom_id)` |
| Topbar "Mark Hot" toggle | Local state | Wired to `postFeedback(deal.id, 'hot')` |
| Topbar theme toggle | V1-only `<html data-theme>` | Also writes `localStorage['nightdrop-theme']` so the rest of the app picks up the theme. |
| Topbar Share/List/Flag/Menu buttons | Local state | Inert for v1 — render but no behavior. Tracked as follow-up work. |

## Behavioral contracts inherited from nightdrop

- Optimistic updates via `useDeals` (no rollback on failure — keep optimistic value).
- `fmt(val)` from `src/lib/format.js` wraps every displayed field (handles backend's `"null"` string serialization).
- Toast via `useToast()`, never render `<Toast>` directly.
- 401 → auto-redirect to `/login` with return URL preservation.

## Accessibility (preserved from V1)

- `:focus-visible` ring on every button, tab, input.
- `aria-label` on every icon-only button.
- Color is never the only signal — Buy Box Match has color + icon + text.
- Keyboard nav: J/K/←/→ cycles between deals when in full-screen mode (not in modal mode).
