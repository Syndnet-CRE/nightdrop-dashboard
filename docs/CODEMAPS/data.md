<!-- Generated: 2026-05-26 | Files scanned: ~5 | Token estimate: ~600 -->
<!-- Verified current 2026-05-26: Deal Feed Excel cutover added no new tables or
     migrations. Vendor bundle reads from DealsContext.deals and writes back
     via installActionAdapters callbacks (saveNote, updateStatus, postFeedback)
     — all backend paths unchanged. -->
# Data — nightdrop-dashboard

This repo holds no database. All persistent data lives in backend
(`~/nightdrop-api` → Neon Postgres, two endpoints).

## Backend table reference (read-only awareness)

| Table                       | DB             | Role                                            |
|-----------------------------|----------------|-------------------------------------------------|
| properties                  | DATABASE_URL   | Parcyl parcel/property records (read-only Parcyl data) |
| ownership                   | DATABASE_URL   | Owner / mailing-address join                    |
| df_subscribers              | DATABASE_WRITE_URL | User accounts                               |
| df_buy_boxes                | DATABASE_WRITE_URL | Buy box criteria — 91 patchable fields (migration 049)|
| df_deals_sent               | DATABASE_WRITE_URL | Matched deals delivered to subscribers      |
| df_contacts                 | DATABASE_WRITE_URL | Contact log per deal                        |
| df_deal_notes               | DATABASE_WRITE_URL | Notes per deal                              |
| df_invite_tokens            | DATABASE_WRITE_URL | Invite token store                          |
| df_agent_messages           | DATABASE_WRITE_URL | Agent chat history                          |
| df_owner_portfolio_cache    | DATABASE_WRITE_URL | Pre-computed owner portfolios               |
| df_agent_reasoning          | DATABASE_WRITE_URL | Agent decision rationale                    |
| df_eval_results             | DATABASE_WRITE_URL | Matcher eval / dry-run results              |
| df_market_playbooks         | DATABASE_WRITE_URL | Per-market plays (written by hermes.py)     |

All `df_*` IDs are UUID strings. Never `parseInt()` them.

## Frontend data layer

### DealsContext (`src/contexts/DealsContext.jsx`)
Central data fetch on mount. State shape:
```js
{
  deals: Deal[],            // GET /deals
  buyBoxes: BuyBox[],       // GET /buy-boxes — normalized via normalizeBuyBox()
  contacts: ContactLog[],   // GET /deals/:id/contacts (lazy per-deal)
  dealNotes: Note[],        // GET /deals/:id/notes (lazy per-deal)
  portfolios: { attomId → portfolio[] },  // GET /owner-portfolio/:attomId (cached)
  loading, error,
  // CRUD
  refetch, postFeedback, saveNote, updateStatus,
  fetchContacts, logContact,
  patchBuyBox, deleteBuyBox,
  fetchDealNotes, createDealNote,
  fetchOwnerPortfolio
}
```

### ReadStateContext / DealStateContext (`src/contexts/`)
LocalStorage-backed per-subscriber:
- read/unread per deal id
- deal lifecycle state machine (new → reviewing → contacted → passed)

### Auth (`src/hooks/useAuth.jsx`)
JWT in localStorage. Subscriber object cached. `auth.me()` validates on mount.

## Buy box payload shape

Wizard form state (`src/lib/wizardFormState.js::EMPTY_FORM`) has ~70 nested
fields. `nativeToPayload(form)` flattens to ~80 backend keys spanning:

- Identity: label, notes
- Asset: asset_class, asset_use_codes[], asset_classes[], sub_assets[]
- Geography: geo_states[], geo_cities[], geo_zips[], geo_counties[],
  geo_radius_* (lat/lng/miles/address)
- Size + vintage: sf, acres, lot_sf, lot_width/depth, year_built,
  stories, units, bedrooms_count, bath_count (each with min/max)
- Physical: construction_types[], foundation_types[], roof_types[],
  garage_types[], has_pool, has_elevator, building_classes[]
- Financial: value, min_equity_pct, min_equity_dollar, ltv_max,
  price_per_unit_max, improvement_to_land_max, development_potential_min
- Owner: owner_types[], absentee_only, out_of_state_only,
  hold_period (min/max)
- Distress: distress_signals[], distress_match_mode, distress_score_min
- Location overlays: flood_exclude, opportunity_zone, wetlands_exclude,
  tif_district, in_etj, zoning_codes[], future_land_use_codes[]
- Utilities: water_*, sewer_*, electricity_*, gas_pipeline_*
  (each `_nearby_required` or `_service_required`), utility_proximity_max_ft
- Traffic: aadt_min, road_frontage_min/max_ft, corner_lot_required
- Class-specific:
  - Self storage: ss_is_reit_owned, ss_has_foreclosure_history
  - Multifamily: pct_renter_occupied_min, mf_lihtc_flag, mf_lihtc_proximity_ft
  - Land transitional: land_trans_dev_potential_min, _impr_land_max, _flu_codes[]
  - Assemblage: assemblage_potential
- Climate: climate_risk_max, wildfire_risk_max, heat_risk_max
- Delivery: run_schedule, delivery_max_per_run, match_threshold

Three-state booleans (TRUE / FALSE / NULL): has_pool, has_elevator,
opportunity_zone, tif_district, in_etj, ss_is_reit_owned,
ss_has_foreclosure_history, mf_lihtc_flag.

## Migration awareness

Backend migrations applied (per `~/nightdrop-api/CLAUDE.md`):
018 / 028 / 035-049. Next migration number: **050**.

This repo has no migrations of its own.

## Spec sources (read before touching taxonomy)
- `~/nightdrop-api/docs/taxonomy/mvp-buy-box-taxonomy.md` (authoritative)
- `~/nightdrop-api/services/assetUseCodes.js` (Node single source of truth)
- `~/nightdrop-api/agents/lib/asset_class_map.py` (Python mirror)
- `~/nightdrop-dashboard/notes/audit/CROSS-REPO-AUDIT-BUY-BOX-MVP-2026-05-20.md`
