# Architecture — Deal Detail V1

**Date:** 2026-05-24
**Inherits from:** `notes/audit/FRONTEND-WIRING-CONTRACT-2026-05-24.md` (full app architecture)

This doc captures deal-detail-specific architectural decisions only.

## File layout

```
src/components/DealDetail/
├── DealShell.jsx           # root: routes deal + onClose + embedded prop; mounts topbar + main + rail
├── DealTopbar.jsx          # V1 topbar (brand + back + counter + address + stage + actions)
├── DealHero.jsx            # image (mapbox satellite) + address card + confidence + distress + owner + 2-KPI strip
├── DealNarrative.jsx       # single-tab "AI Narrative" card (POV dropped)
├── DealIntel.jsx           # 6 tabs, each conditionally renders only populated rows
├── DealTimeline.jsx        # sparse chain of title or empty state
├── DealOwnerGraph.jsx      # canvas force-directed graph + sidebar + table
├── DealCalculator.jsx      # 4-strategy UW calculator (pure client math)
└── DealActivityRail.jsx    # match verdict + activity feed + 2-button composer + deal actions

src/styles/
└── v1-deal-tokens.css      # all V1 tokens scoped to .deal-shell (no leak)
```

## Files deleted (verified safe via audit 2026-05-24)

- `src/components/DealDetail.jsx`
- `src/components/DealDetail.helpers.jsx`
- `src/components/DealDetail/` (legacy 6 files: BriefBlock, SectionNav, ScoreScale, StageIndicator, SignalSeverityTable, OwnerPortfolioTable)
- `src/components/OwnerPortfolio.jsx` (only DealDetail imports it)
- `src/components/ContactLogModal.jsx` (only DealDetail imports it)
- `src/components/MarketNewsfeed.jsx` (orphan, zero imports)
- `src/styles/deal-detail.css` (1,808 lines, only imported by DealDetail.jsx)

## Files preserved (used elsewhere — DO NOT DELETE)

- `src/components/DealComponents.jsx` — `ScoreBubble`, `MapPinSVG`, `ClusterPin` consumed by `DealMap.jsx`, `DealPanelCard.jsx`
- `src/components/PipelineTimeline.jsx` — consumed by `TopHeader.jsx`
- `src/components/ScoreBadge.jsx` — consumed by `feed/FeedDealCard.jsx`
- `src/components/AerialThumb.jsx` — consumed by `DealComponents.FactRow`

## App.jsx changes (lines from current head)

- Line 10: `import { DealDetail } from './components/DealDetail'` → `import { DealShell } from './components/DealDetail/DealShell'`
- Lines 32–63: `DealDetailPage` — replace body to render `<div className="deal-shell"><DealShell deal={...} onClose={...} embedded={false} deals={deals} dealIndex={dealIndex} onNavigateDeal={...}/></div>`
- Lines 66–90: `DealDetailModal` — replace body to render `<div className="deal-shell deal-shell--embedded"><DealShell deal={...} onClose={close} embedded={true}/></div>`
- Existing IIFE at lines 27–30 — add second IIFE after it for theme-flush MutationObserver (see Phase 1 deliverable)

## index.css change

Add `@import './styles/v1-deal-tokens.css';` after `tokens.css`.

## Data wiring map (audited 2026-05-24 against live backend)

| V1 section | Real source | Hook / endpoint |
|---|---|---|
| Topbar address | `deal.address`, `deal.city`, `deal.state`, `deal.zip` (via `fmt()`) | `useDeals().deals` |
| Topbar pipeline stage + probability | `deal.status` + computed | `useDeals().deals` |
| Topbar deal counter (`1/N`) | `dealIndex + 1 / deals.length` from props | `useDeals().deals` |
| Topbar Mark Hot toggle | `deal.feedback === 'hot'` ↔ `postFeedback(id, 'hot' \| null)` | `useDeals()` |
| Topbar theme toggle | Writes `localStorage['nightdrop-theme']` + `<html data-theme>` | n/a |
| Hero address card | `deal.address`, `deal.city`, `deal.state`, `deal.zip`, `deal.county`, `deal.asset`, `deal.year_built`, `deal.building_sf`, `deal.acres` | `useDeals().deals` |
| Hero map (satellite) | `deal.latitude`, `deal.longitude` via mapbox-gl `satellite-streets-v12` | `useDeals().deals` |
| Hero confidence | `Math.round(deal.score * 10)` or `Math.round(deal.match_score * 100)` (whichever populated) | `useDeals().deals` |
| Hero distress signals | `deal.signals` — array of `{ tag, label, description }`. Resolve via `.tag` first per wiring contract §13. Severity mapping: distress → danger, risk → warn, info → info. | `useDeals().deals` |
| Hero owner card | `deal.owner_name`, `deal.entity` (= owner_type), `deal.owner_since`, portfolio totals from owner-portfolio endpoint | `useDeals().deals` + `useDeals().portfolios[attomId]` |
| Hero 2-KPI strip | Est Value (`deal.value`), $/SF (`deal.value / deal.building_sf`) | `useDeals().deals` |
| AI Narrative card | `deal.brief_json.narrative` (string) or `deal.brief` (legacy fallback) | `useDeals().deals` |
| Intel: Physical tab rows | Derived from `deal.brief_json` and `deal.*` direct fields | `useDeals().deals` |
| Intel: Tax / Mortgage / Foreclosure / Permits / Geo / Utilities / Market tabs | No backend data path → empty state "Awaiting enrichment data" | n/a |
| Timeline | `last_sale_date` from `brief_json.last_sale_date`. If only 1 event → empty state "Title history coming soon". | `useDeals().deals` |
| Owner Portfolio Graph | `useDeals().fetchOwnerPortfolio(deal.attom_id)` on mount → `portfolios[deal.attom_id]` | `useDeals()` |
| Portfolio Summary + Asset Mix + table | Same portfolio object — `totals`, `properties[]` | `useDeals().portfolios` |
| Buy Box Match (3 buttons) | "Matches" → `postFeedback('hot')`. "Doesn't Match" → `postFeedback('not_relevant')`. "Need More Info" → UI-only local state. | `useDeals()` |
| Activity feed entries | Interleaved by `created_at` desc: `dealNotes[deal.id]` (type=note) + `contacts[deal.id]` (type=call when channel='phone', type=email when channel='email', etc.) | `useDeals().fetchDealNotes`, `useDeals().fetchContacts` |
| Composer "Note" button | `createDealNote(deal.id, text)` | `useDeals()` |
| Composer "Call" button | `logContact(deal.id, { channel: 'phone', outcome: 'follow_up', notes: text })` | `useDeals()` |
| Deal Actions (Generate Packet / Skip Trace / Send Offer / Add to List / Favorite / Flag) | Inert for v1 — render buttons but no behavior wired. Follow-up work. | n/a |
| Calculator | Client-side math only. Prefill `purchase = deal.value`, `noi` = 0 (user input), `ppsf` derived. | n/a |

## Token CSS scoping strategy

All V1 tokens live under one selector: `.deal-shell` (and `[data-theme="light"] .deal-shell` for light). No `:root` overrides. This keeps the rest of the app's tokens (`--background`, `--card`, `--primary`, etc. as defined in `src/styles/tokens.css`) untouched.

The `.deal-shell` class is applied by the outer wrapper in `DealDetailPage` and `DealDetailModal` in `App.jsx`. Modal-only refinements live under `.deal-shell--embedded` (hides V1 topbar).

## Theme-flush MutationObserver

V1 transitions `background-color` (longhand) on theme swap. Without a one-frame transition flush, in-flight transitions hold the previous theme's resolved `var()` color for ~200ms. The IIFE in `App.jsx` startup observes `<html data-theme>` mutations and injects/removes `*{transition:none !important}` for one rAF cycle.

## Icon import policy (new exception)

Wiring contract §13 currently restricts `lucide-react` imports to `TopHeader.jsx` and `AdminView.jsx`. This work adds `src/components/DealDetail/*` as a third exception. V1 design uses ~40 lucide icons not present in app's hand-rolled `Icons.jsx`. Adding them to `Icons.jsx` would duplicate work that the already-installed `lucide-react@^1.14.0` does natively.

Wiring contract update in Phase 6: append "and `src/components/DealDetail/*`" to the icon exception list.
