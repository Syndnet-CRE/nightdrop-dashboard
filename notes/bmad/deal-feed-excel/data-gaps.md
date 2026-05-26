# Data Gaps — Deal Feed Excel Cutover

**Inherits from:** `requirements.md`, `architecture.md`

Bundle field names where the host's current backend response (per
`GET /api/dealfeed/deals` and per the backend reality check in
`notes/HANDOFF.md` 2026-05-24) provides no direct source. The adapter
(`src/vendor/deal-feed/adapter.js`) applies the proposed defaults.

---

## Deal-level gaps

| Bundle field | Default applied by adapter | Reasoning |
|---|---|---|
| `Deal.up` (thumbs-up flag) | `feedback === 'hot'` | Collapse thumbs-up onto hot. Visually the bundle's thumbs-up quick-action becomes synonymous with "Mark Hot." Keeps the UI without a new backend field. |
| `Deal.la` (last-activity dot: `'r'` / `'m'` / `null`) | derived from `updated_at`: `'r'` if ≤ 24h, `'m'` if ≤ 7d, else `null` | Pure client-side derivation. No backend round-trip. |
| `Deal.bullets` (array of `{label, body}` for expanded row) | `brief_json?.bullets || []` | Field exists in `brief_json` for enriched deals; fall back to empty array (expanded row shows narr only). |
| `Deal.narr` (paragraph narrative) | `brief_json?.summary ?? brief_json?.narrative ?? ''` | Same source as DealDetail's narrative. Empty string if missing. |
| `Deal.ext.parcel` | `apn ?? parcel_id ?? '—'` | Both fields exist on host; fall back to em-dash. |
| `Deal.ext.lotSF` | `acres ? Math.round(acres * 43560).toLocaleString() : '—'` | Host has `acres`, not `lot_sf` directly. Convert. |
| `Deal.ext.landVal` | `'—'` | Per backend reality check: NOT in deals response. Out of scope for this work. |
| `Deal.ext.bldgVal` | `'—'` | Same. |
| `Deal.ext.deed` | `'—'` | Same. |
| `Deal.ext.mortAmt` | `'—'` | Same — mortgage data not surfaced. |
| `Deal.ext.mortLender` | `'—'` | Same. |
| `Deal.ext.mortDate` | `'—'` | Same. |

---

## BuyBox-level gaps

| Bundle field | Default applied by adapter | Reasoning |
|---|---|---|
| `BuyBox.color` | `hostBuyBox.color ?? hashIdToColor(hostBuyBox.id)` | If host buy box has a `color` field (TBD — Phase 0 spike confirms), use it. Otherwise derive from id-hash to keep buy-box dots distinguishable. Palette: `['#2da200', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#10b981']`. |
| `BuyBox.mr` (match rate %) | `0` | Backend does not compute. Display as `'—'` when value is `0`. Could derive client-side as `hostBuyBox.deals_sent_total / hostBuyBox.qualified_count` if both fields surface; not today. |

---

## Calendar gaps

| Bundle field | Default applied by adapter | Reasoning |
|---|---|---|
| `Calendar` | client-built from `deals[].sentAt` over 6-month window (today − 5mo → today + 1mo) | No backend calendar endpoint exists. Building locally is fast (one O(N) pass over deals). |
| `Day.count` | count of deals with `sentAt` matching `Day.key` (ISO date) | Direct. |
| `Day.isFuture` | `Day.key > today` | Direct. |
| `Day.isToday` | `Day.key === today` | Direct. |

---

## Backend fields preserved but not consumed by spreadsheet

Several backend fields exist on `df_deals_sent` but the bundle doesn't
surface them (the AI agent already consumes them; the spreadsheet's
12 columns don't have room). These remain in `useDeals().deals[i].*`
for use by:
- DealDetail page (already consumes them).
- MapView (uses lat/lng + asset_class).
- LeftPanel (uses buy_box association).

Examples: `borrower_name`, `total_risk_score`, `distress_tier`,
`development_potential_score`, `vacancy_est`, all the permit fields,
all the risk fields.

Adapter does not surface these; bundle doesn't show them. No work
needed.

---

## Future work (separate ticket, not this cutover)

To close the gaps marked `'—'`:

1. Surface `last_sale.deed_type`, mortgage amount/lender/date,
   land/building component values from `df_deals_sent` or a
   joined table.
2. Add `match_rate` to `df_buy_boxes` schema (compute server-side
   nightly or on every box edit).
3. Add `color` to `df_buy_boxes` schema (user-customizable per box,
   default by hash).

These would unlock the bundle's full visual surface (~40% more data
without any frontend changes per the V1 backend reality check).

File these in a follow-up ticket after the cutover ships.
