# Frontend Wiring Contract — nightdrop-dashboard

**Date:** 2026-05-24
**Purpose:** Hand this file to Claude Design (or any other design surface). It defines every shape, endpoint, hook, storage key, token, and naming convention the new UI must honor so the generated code wires into the existing data layer without translation.

**Rule for Design:** Generate UI that consumes the contracts in this doc verbatim. Do not invent new prop names for existing data. Do not invent new API endpoints. Do not introduce new storage keys without listing them here first. Brand colors, fonts, and spacing come from `src/styles/tokens.css` — use the CSS vars, never hex.

---

## 1. Stack — non-negotiable

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 8 |
| Language | JSX only — no TypeScript |
| Router | `react-router-dom` v7 (`BrowserRouter`, `Routes`/`Route`) |
| Map | `react-map-gl` v8 + `mapbox-gl` v3 |
| Icons | `src/components/Icons.jsx` (`I` object). Never import `lucide-react` outside `TopHeader.jsx` and `AdminView.jsx`. |
| Styling | Plain CSS — no Tailwind, no CSS-in-JS. Design tokens in `src/styles/tokens.css`. |
| Forms / validation | Hand-rolled — no Zod, no React Hook Form |
| Server state | Custom contexts (`DealsProvider`, `AuthProvider`) — no TanStack Query, no SWR |
| Data fetch | `src/lib/api.js` only — never raw `fetch()` |

**File naming:** `PascalCase.jsx` for components, `camelCase.js` for lib modules. CSS classnames are kebab-case.

---

## 2. Design Tokens (CSS Variables)

Source: `src/styles/tokens.css`. Use CSS vars, never hex.

### Color tokens (light + dark via `[data-theme]`)
```
--background, --foreground          page bg + default fg
--card, --card-foreground           card surface + text
--popover, --popover-foreground     overlay surfaces
--primary, --primary-foreground     brand green CTA
--secondary, --secondary-foreground neutral surface tone
--muted, --muted-foreground         muted accents
--accent, --accent-foreground       hover/press tints
--destructive, --destructive-foreground red
--border, --input, --ring           outlines + focus halo
--chart-1, --chart-2                brand green bright + deep
```

### Brand convenience aliases
```
--green                  = --primary
--green-bright           = --chart-1
--nightdrop-ink          #0D0D0D
--warning                #F4B73E
--danger                 = --destructive (#ef4444)
--info                   #3E7BFA
--link                   #1366CC (light) / #6BA8F2 (dark)
```

### Semantic FG / BG / borders
```
--fg-1, --fg-2, --fg-3, --fg-4, --fg-disabled
--bg-page, --bg-subtle, --bg-card, --bg-inverse
--border-1 (card outline), --border-2 (hairline), --border-strong
```

### Pill / badge tokens
```
--pill-green-bg / --pill-green-fg
--pill-amber-bg #FDF1D5 / --pill-amber-fg #8a5a00
--pill-red-bg   / --pill-red-fg
--pill-blue-bg  #D9E8FB / --pill-blue-fg #0F4A99
--pill-gray-bg  / --pill-gray-fg
```

### Typography
```
--font-sans       'Manrope', system-ui, sans-serif         (default)
--font-display    var(--font-sans)
--font-mono       ui-monospace, 'SF Mono', Menlo, Consolas
```
DM Sans + Inter are also imported in `tokens.css` for the wizard specifically (`--font-ui`, `--font-secondary`) — leave that scoped to `.buy-box-wizard`.

Weights: `--w-light .. --w-extrabold` (300–800)
Sizes: `--t-h1 64px`, `--t-h2 48px`, `--t-sh1 32px`, `--t-sh2 24px`, `--t-p1 18px`, `--t-p2 16px`, `--t-cap 13px`, `--t-micro 11px`
Line heights: `--lh-tight 1.05`, `--lh-snug 1.2`, `--lh-normal 1.45`, `--lh-loose 1.6`
Tracking: `--track-tight -0.02em`, `--track-eyebrow 0.12em`

### Radii / Spacing / Shadows
```
Radii:   --r-xs 4 / --r-sm 6 / --r-md 10 / --r-lg 14 / --r-xl 20 / --r-2xl 28 / --r-pill 999
Spacing: --s-1 4 / --s-2 8 / --s-3 12 / --s-4 16 / --s-5 20 / --s-6 24 / --s-7 32 / --s-8 40 / --s-9 48 / --s-10 64
Shadows: --shadow-xs / --shadow-sm / --shadow-md / --shadow-lg / --shadow-glow
Focus:   --ring-shadow / --ring-danger
Motion:  --ease-out / --ease-in-out / --dur-fast 120 / --dur-base 200 / --dur-slow 360
```

### Layout constants
```
--left-panel-w           280px
--left-panel-collapsed-w 60px
--top-header-h           88px
--right-rail-w           360px
```

### Background
Page bg has a radial dot grid: `radial-gradient(circle, var(--dot-grid-color) 1px, transparent 1px)` at `--dot-grid-size 24px`. Light = `rgba(0,0,0,0.055)`, dark = `#2a2a2a`.

---

## 3. Routes

Public (unauthenticated):

| Path | Component |
|---|---|
| `/login` | `LoginView` |
| `/forgot-password` | `ForgotPasswordView` |
| `/reset-password` | `ResetPasswordView` |
| `/invite/:token` | `InviteClaimView` |

Auth-gated (under `AppShell`):

| Path | Behavior |
|---|---|
| `/` | Normalizes to `/map` (default view) |
| `/map` | view-state: `'map'` — `MapView` |
| `/dashboard` | view-state: `'dashboard'` — `DashboardView` |
| `/buy-boxes/new` | `BuyBoxPage mode="new"` |
| `/buy-boxes/:id/edit` | `BuyBoxPage mode="edit"` |
| `/deal/:dealId` | `DealDetailPage` full-screen; `DealDetailModal` overlay if `location.state?.fromMap === true` |
| `/onboarding` | Redirects to `/buy-boxes/new` |

**Navigation pattern is hybrid:**
- Most navigation is view-state via `setView(...)` in `AppShell` — only `map` / `dashboard` / `boxes` / `settings` / `invites` / `admin` / `accounts` / `calendar`.
- Only deal detail and buy-box pages use URLs.
- Admin / Invites visible only when `subscriber.email === 'brady@parcyl.ai'`.

**One-shot landing gate:** `InitialRouteGate` redirects subscribers with zero buy boxes from `/map` or `/dashboard` to `/buy-boxes/new` on first load.

---

## 4. Provider Hierarchy (outside in)

```
BrowserRouter                          (main.jsx)
└─ AuthProvider                        (src/hooks/useAuth.jsx)
   └─ ToastProvider                    (src/contexts/ToastContext.jsx)
      └─ Routes  → AppShell
         └─ ReadStateProvider          (src/contexts/ReadStateContext.jsx)
            └─ DealStateProvider       (src/contexts/DealStateContext.jsx)
               └─ DealsProvider        (src/contexts/DealsContext.jsx)
                  └─ TopHeader, LeftPanel, view, DealDetail
```

`ReadStateProvider` and `DealStateProvider` need `useAuth` for the subscriber id, so they sit between Auth and Deals.

---

## 5. Hook API Contracts (exact)

### `useAuth()` — from `src/hooks/useAuth.jsx`
```js
const {
  subscriber,           // Subscriber | null
  loading,              // boolean — true during initial /auth/me check
  login(email, pass),   // POST /auth/login, sets token, returns {token, subscriber}
  loginWithToken(t, s), // for invite-claim flow
  logout(),             // clears token, sets subscriber=null
} = useAuth();
```

### `useDeals()` — from `src/contexts/DealsContext.jsx`
```js
const {
  // Data
  deals,                // Deal[] — fetched from /api/dealfeed/deals
  buyBoxes,             // BuyBox[] — normalized (see Section 8)
  contacts,             // { [dealId]: ContactLog[] }
  dealNotes,            // { [dealId]: DealNote[] }
  portfolios,           // { [attomId]: OwnerPortfolio | null }
  loading,              // boolean
  error,                // string | null

  // Actions
  refetch(),                       // re-fetch deals + buy boxes
  postFeedback(dealId, fb),        // fb: 'hot' | 'not_relevant' | null
  saveNote(dealId, text),          // single notes field on the deal
  updateStatus(dealId, status),
  fetchContacts(dealId),
  logContact(dealId, payload),     // returns the created ContactLog
  patchBuyBox(id, payload),        // PATCH; returns updated buy box
  deleteBuyBox(id),
  fetchDealNotes(dealId),
  createDealNote(dealId, noteText),
  fetchOwnerPortfolio(attomId),
} = useDeals();
```

### `useToast()` — from `src/contexts/ToastContext.jsx`
```js
const addToast = useToast();
addToast(message, variant);     // variant: 'info' | 'success' | 'error' | 'warning'
// auto-dismisses after 3000ms
```
Never render `<Toast>` directly.

### `useReadState()` — from `src/contexts/ReadStateContext.jsx`
```js
const { isRead, markRead } = useReadState();
isRead(dealId);            // → boolean
markRead(dealId);          // localStorage-backed, scoped per subscriber
```

### `useDealState()` — from `src/contexts/DealStateContext.jsx`
```js
const { getDealState, setDealState } = useDealState();
getDealState(dealId);      // → 'active' | 'dead' | 'loi' | 'archived'  (default 'active')
setDealState(dealId, s);   // s must be in ['active', 'dead', 'loi', 'archived']
```

---

## 6. API Layer

`src/lib/api.js` exports:
```js
import { api, setToken, clearToken } from './lib/api';

api.get(path, opts)
api.post(path, body, opts)
api.patch(path, body, opts)
api.delete(path, opts)
```

Behavior:
- Base URL: `import.meta.env.VITE_API_BASE_URL` (empty = same origin → Vite proxy → `https://nightdrop-api.onrender.com`)
- Auth header auto-added from `localStorage['nd_token']`
- HTTP 401 → clears token, saves current path+search to `sessionStorage['nd_return_url']`, redirects to `/login`
- Non-OK throws `Error` with `.status` and `.body`
- `opts` may include `{ signal }` for AbortController

**Rule:** never call `fetch()` directly. Always go through `api.*`.

---

## 7. Full API Endpoint Inventory

### Auth
| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/dealfeed/auth/login` | `{ email, password }` | `{ token, subscriber }` |
| GET | `/api/dealfeed/auth/me` | — | `{ subscriber }` |
| PATCH | `/api/dealfeed/auth/me` | partial Subscriber | `{ subscriber }` |
| POST | `/api/dealfeed/auth/change-password` | `{ current, next }` | `{ ok }` |
| GET | `/api/dealfeed/auth/invite/:token` | — | `{ email }` (public) |
| POST | `/api/dealfeed/auth/invite/:token/claim` | `{ password, full_name }` | `{ token, subscriber }` (public) |

### Deals
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/dealfeed/deals` | — | `{ deals: Deal[] }` |
| POST | `/api/dealfeed/deals/:id/feedback` | `{ feedback: 'hot' \| 'not_relevant' \| null }` | `{ ok }` |
| PATCH | `/api/dealfeed/deals/:id/notes` | `{ notes: string }` | `{ ok }` |
| PATCH | `/api/dealfeed/deals/:id/status` | `{ status: string }` | `{ ok }` |
| PATCH | `/api/dealfeed/deals/:id/save` | — | `{ id, saved: boolean }` |
| PATCH | `/api/dealfeed/deals/:id/read` | — | `{ ok: true }` |
| GET | `/api/dealfeed/deals/:id/contacts` | — | `{ contacts: ContactLog[] }` |
| POST | `/api/dealfeed/deals/:id/contacts` | `{ method, note, ... }` | `{ contact: ContactLog }` |
| GET | `/api/dealfeed/deals/:id/notes` | — | `{ notes: DealNote[] }` |
| POST | `/api/dealfeed/deals/:id/notes` | `{ note_text: string }` | `{ note: DealNote }` |
| GET | `/api/dealfeed/deals/dashboard/kpis` | — | `{ unread_count, ... }` |

### Buy Boxes
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/dealfeed/buy-boxes` | — | `{ buy_boxes: BuyBox[] }` |
| GET | `/api/dealfeed/buy-boxes/:id` | — | `{ buy_box: BuyBox }` |
| POST | `/api/dealfeed/buy-boxes` | full BuyBoxPayload (91 fields) | `{ buy_box }` |
| PATCH | `/api/dealfeed/buy-boxes/:id` | partial BuyBoxPayload | `{ buy_box }` |
| POST | `/api/dealfeed/buy-boxes/:id/pause` | — | `{ buy_box }` |
| POST | `/api/dealfeed/buy-boxes/:id/resume` | — | `{ buy_box }` |
| DELETE | `/api/dealfeed/buy-boxes/:id` | — | `{ deleted: true, id }` |
| POST | `/api/dealfeed/buy-boxes/preview` | partial BuyBoxPayload (non-spatial) | `{ estimated_count }` — debounce 400ms |

### Onboarding (legacy create path — see §13)
| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/dealfeed/onboarding` | ~50 of the 91 BuyBoxPayload fields | `{ subscriber_id, buy_box_id, status, buy_box }` |

### Geo
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/dealfeed/geo/counties?states=TX,CA` | querystring | `{ counties: { TX: ['Travis', ...], CA: [...] } }` |

### Owner Portfolio
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/dealfeed/owner-portfolio/:attomId` | — | `{ portfolio: D3GraphData \| null }` |

### Invites (admin)
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/dealfeed/invites` | — | `{ invites: Invite[] }` |
| POST | `/api/dealfeed/invites` | `{ invites: [{ email, full_name }] }` | `{ added, skipped }` |
| POST | `/api/dealfeed/invites/send` | — | `{ sent, failed }` |
| DELETE | `/api/dealfeed/invites/:id` | — | `{ ok }` |

### Admin
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/dealfeed/admin/subscribers` | — | `{ subscribers }` |
| GET | `/api/dealfeed/admin/subscribers/:id` | — | full detail |
| GET | `/api/dealfeed/admin/runs` | — | `{ runs: AgentRun[] }` |
| POST | `/api/dealfeed/admin/runs/trigger` | — | `{ ok }` |

### Agent (chat)
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/dealfeed/agent/messages` | — | `{ messages }` — oldest first |
| POST | `/api/dealfeed/agent/message` | `{ content, deal_id? }` | `{ reply }` |

### DEV-only
| Method | Path | Notes |
|---|---|---|
| POST | `/__dev_login` | Vite plugin endpoint; reads `.dev-auth.json` (gitignored), POSTs to prod backend, returns `{ token, subscriber }`. Frontend never sees creds. Production builds skip this. |

---

## 8. Domain Shapes

### Subscriber
```js
{
  id: string,                // UUID — used in all storage-key prefixes
  email: string,
  full_name: string,
  // ...profile fields
}
```

### Deal (canonical fields actually consumed — server is `df_deals_sent` table; no client types file exists, shape is implicit from usage across components)

**Identity / source:** `id`, `attom_id`, `apn`, `parcel_id`, `fips`, `record_type`, `source`, `attom`

**Address:** `address`, `addr`, `city`, `property_city`, `state`, `property_state`, `zip`, `property_zip`, `county`, `submarket`, `census_tract`, `school_district`

**Property physical:** `asset`, `asset_class`, `use_type`, `acres`, `building_sf`, `units`, `stories`, `year_built`, `construction_type`, `exterior_walls`, `foundation`, `roof_type`, `hvac_heating`, `hvac_cooling`, `parking_space_count`, `has_pool`, `has_elevator`, `has_fire_sprinklers`, `has_homeowner_exemption`, `zoning`, `future_land_use`

**Financial:** `value`, `assessed_value`, `tax_amount_billed`, `tax_year`, `last_sale_price`, `last_sale_date`, `auction_date`, `auction_opening_bid`, `default_amount`

**Ownership:** `owner_name`, `owner_type`, `owner_since`, `borrower_name`, `entity`, `absentee`, `absentee_owner`, `same_owner_parcel_count`, `vacancy_est`, `pct_renter_occupied`

**Distress & scoring:** `score`, `match_score`, `distress_score`, `distress_tier`, `assemblage_score`, `seller_motivation_score`, `development_potential_score`, `signals` (array of `{ tag, category?, label?, description? }` — always resolve via `.tag` first), `tax_delinquent`, `tax_delinquent_year`, `foreclosure_status`, `foreclosure_recording_date`, `code_violations`, `last_permit_date`, `last_permit_type`, `permit_count_*`

**Risk / regulatory:** `flood_risk_score`, `fema_flood_zone`, `in_floodplain`, `in_floodway`, `wildfire_risk_score`, `drought_risk_score`, `heat_risk_score`, `storm_risk_score`, `total_risk_score`, `in_opportunity_zone`, `tif_district`, `in_etj`, `etj_city`, `city_jurisdiction`, `gis`

**State (frontend-managed):** `id`, `sent`, `current`, `score`, `feedback` (`'hot'|'not_relevant'|null`), `saved` (bool), `is_read` (bool), `status`, `notes` (string), `created_at`, `updated_at`, `days`, `deal_state` (one of `'active'|'dead'|'loi'|'archived'`), `box`, `buy_box_name`, `brief`, `brief_json`

**Frontend gotcha:** backend serializes null as the string `"null"`. Always wrap displays in `fmt(val)` from `src/lib/format.js` (treats `"null"` and `"undefined"` as nullish).

### BuyBox (after `normalizeBuyBox()` in `DealsContext`)

Backend raw shape (91 patchable fields — see Section 9). After normalization:
```js
{
  id: string,                // UUID
  name: string,              // from b.label
  status: string,            // 'Active' | 'Paused' | 'Pending' | 'Cancelled' | 'Coverage Failed'
  geo: string,               // joined geo summary or '—'
  classes: string[],         // b.asset_classes
  hold: string,              // formatted min_hold_yrs or '—'
  created: string,           // formatted created_at
  deals: number,             // b.deals_sent_total
  lastRun: string,           // formatted last_run_at or '—'
  ...all raw backend fields  // spread, e.g. asset_class, geo_states, sf_min, etc.
}
```

Raw backend has every field from §9 (BuyBox Payload Contract).

### ContactLog
```js
{
  id: string,
  deal_id: string,
  method: string,            // 'phone' | 'email' | 'sms' | 'in_person' | 'mail'
  note: string,
  // ...
}
```

### DealNote (multi-note threading — separate from the singular `deal.notes` text field)
```js
{
  id: string,
  deal_id: string,
  note_text: string,
  created_at: string,
}
```

### Invite
```js
{
  id: string,
  email: string,
  full_name: string,
  status: string,            // 'pending' | 'sent' | 'claimed'
  // ...
}
```

### AgentRun
```js
{
  id: string,
  started_at: string,
  finished_at: string | null,
  status: string,
  deal_count: number,
  // ...
}
```

### AgentMessage (chat)
```js
{
  id: string,
  role: 'user' | 'agent',
  content: string,
  deal_id: string | null,
  created_at: string,
}
```

---

## 9. Buy Box Payload Contract

Wizard form ↔ backend serialization lives in `src/lib/wizardFormState.js`. The full backend `PATCHABLE_FIELDS` set (91 fields) covers:

### Top-level identity
`label` (required for create), `status` (`'active' | 'paused' | ...`)

### Asset
`asset_class` (string slug), `asset_use_codes` (INTEGER[]), `asset_classes` (string[] — legacy), `sub_assets` (string[] of Land slugs, only meaningful when `asset_class === 'land'`)

### Geography (mutually exclusive on backend — priority: county > city > zip > radius > state)
`geo_states` (string[]), `geo_counties` (string[] of names — no state prefix), `geo_cities` (string[] — full `'Austin, TX'`), `geo_zips` (string[]), `geo_radius_address`, `geo_radius_miles`

### Physical envelope
`sf_min`, `sf_max`, `acres_min`, `acres_max`, `lot_sf_min`, `lot_sf_max`, `year_built_min`, `year_built_max`, `stories_min`, `stories_max`, `units_min`, `units_max`, `bedrooms_count_min`, `bedrooms_count_max`, `bath_count_min`, `bath_count_max`, `lot_width_min`, `lot_depth_min`, `building_classes` (subset of `['A','B','C']`), `construction_types` (string[]), `foundation_types` (string[]), `roof_types` (string[]), `garage_types` (string[])

### Financial
`value_min`, `value_max`, `min_equity_pct` (0–100 int — UI-only round-trip), `min_equity_dollar` (matcher uses this), `price_per_unit_max`, `improvement_to_land_max`, `development_potential_min`

### Owner
`owner_types` (string[]), `absentee_only` (bool), `out_of_state_only` (bool), `hold_period_min`, `hold_period_max`

### Distress
`distress_signals` (string[] from the 10-option list), `distress_only` (bool), `distress_match_mode` (`'or'` | `'and'`), `distress_score_min` (number 0–100)

### Utilities (4 strict-required booleans)
`water_service_required`, `sewer_service_required`, `electricity_nearby_required`, `gas_pipeline_nearby_required`

### Location / risk
`flood_exclude` (bool), `wetlands_exclude` (bool), `corner_lot_required` (bool), `assemblage_potential` (bool), `aadt_min` (num), `road_frontage_min_ft`, `road_frontage_max_ft`, `zoning_codes` (string[]), `future_land_use_codes` (string[])

### **TRI-STATE BOOLEANS** (`true` | `false` | `null` — null means "no filter")
`opportunity_zone`, `tif_district`, `in_etj`, `has_pool`, `has_elevator`, `mf_lihtc_flag`, `ss_is_reit_owned`, `ss_has_foreclosure_history`

### Class-specific
`pct_renter_occupied_min`

### Threshold + delivery
`match_threshold` (0.70 volume / 0.80 balanced / 0.90 precision), `run_schedule` (`{ days: ['mon', ...] }`), `delivery_max_per_run` (int)

### Backend equity contract
The matcher only uses `min_equity_dollar`. UI sends both `min_equity_pct` (for round-trip readability) and `min_equity_dollar` (`Math.round(pct * value_min)`). If `value_min` is blank, omit both.

### Empty-subtypes fallback
Backend `validateAssetUseCodes()` requires non-empty array. If the user picks an asset class but zero subtype chips, serialize `asset_use_codes` to every code in the class. UI intent: "empty subtypes = match all types in this class."

---

## 10. Asset Class Taxonomy (10-class MVP — locked 2026-05-20)

Source of truth: `src/lib/buyBoxTaxonomy.js`. Mirrors `~/nightdrop-api/services/assetUseCodes.js` exactly.

| Slug | Label | Notes |
|---|---|---|
| `self_storage` | Self Storage | 1 use code |
| `multifamily` | Multifamily | 6 use codes (duplex → 5+) |
| `mobile_home_rv` | Mobile Home / RV Parks | |
| `residential_sfr` | Single Family Residential | 6 use codes |
| `land` | Land | Has 4 sub-asset slugs (see below) |
| `industrial` | Industrial | 8 use codes |
| `retail` | Retail | 12 use codes |
| `gas_station_c_store` | Gas Station / C-Store | |
| `office` | Office | 6 use codes |
| `special_purpose` | Special Purpose | Banks, parking, recreation, healthcare, day care |

Land sub-asset slugs: `urban_infill`, `suburban_fringe`, `agricultural_rural`, `path_of_growth`.

Legacy aliases handled by `normalizeAssetClassSlug()`:
`sfr → residential_sfr`, `hospitality → special_purpose`, `gas_station → gas_station_c_store`, `rv_park → mobile_home_rv`, `mixed_use → office`, `medical_office → office`, `hotel → special_purpose`.

### Asset palette (for badges, charts, legends — from `buyBoxTaxonomy.js::getAssetClassColor()`)
```
self_storage         #F4B73E   amber
multifamily          #6366F1   indigo
mobile_home_rv       #14B8A6   teal
residential_sfr      #3E7BFA   blue
land                 #5BCC48   brand green
industrial           #475569   slate
retail               #F97316   orange
gas_station_c_store  #EAB308   yellow
office               #A855F7   purple
special_purpose      #EC4899   pink
unknown              #9DA2B3   gray
```

### Map cluster palette (10 land-bucket variants — from `src/lib/assetColors.js`)
```
land_small   (0–25 ac)    #5BCC48
land_med     (25–100 ac)  #38A226
land_large   (100–200 ac) #D4A934
land_xlarge  (200+ ac)    #E07A1F
self_storage              #3F87E5
multifamily               #9E6CDA
industrial                #5B6E84
retail                    #E5484D
office                    #3FAFA5
other                     #8A8F9C
```

Use `colorFor(prop)` and `categorize(prop)` for map pins. Use `getAssetClassColor(slug)` everywhere else.

---

## 11. Storage Keys (complete inventory)

### `localStorage`

| Key | Type | Writer | Reader | Purpose |
|---|---|---|---|---|
| `nd_token` | JWT string | `src/lib/api.js::setToken`, `useAuth.login` | `src/lib/api.js::getToken`, `useAuth init` | Bearer token. Auto-attached to every API request. |
| `df_token` | legacy JWT | — | `src/main.jsx` startup migration | Migrated to `nd_token` then removed on first boot. Safe to assume gone. |
| `nightdrop-theme` | `'light'` \| `'dark'` | `SettingsView`, `App.jsx` startup IIFE | `App.jsx` startup IIFE | Applied via `[data-theme]` on `<html>`. |
| `dealfeed.read.{subId}:{dealId}` | `'true'` | `ReadStateProvider::markRead` | `ReadStateProvider` init scan | Per-subscriber per-deal read flag. |
| `dealfeed.dealstate.{subId}:{dealId}` | `'active'\|'dead'\|'loi'\|'archived'` | `DealStateProvider::setDealState` | `DealStateProvider` init scan | Per-subscriber deal state machine. |
| `dealfeed.day-seen.{subId}:{dayKey}` | `'true'` | `WeekDayTabs::markDaySeen` | `WeekDayTabs::useDaySeenState` init scan | Per-subscriber per-day "I've looked at this day's feed" flag. `dayKey` format: `'YYYY-M-D'`. |
| `nightdrop-map-style` | `'satellite'\|'streets'\|...` | `MapView::saveStyle` | `MapView::loadStyle` (defaults `'satellite'`) | Mapbox style. |
| `nightdrop-map-viewport` | JSON `{lng, lat, zoom, bearing, pitch}` | `MapView` viewport save | `MapView::loadViewport` | Last camera position. |
| `nightdrop.mapPanel.collapsed` | JSON bool | `MapView` panel toggle | `MapView::loadPanelState` (default `false`) | DealPanel sidebar collapsed state. |
| `nightdrop-deals-filters` | JSON object | `MapView::saveFilters` | `MapView::loadFilters` (merged with `DEFAULT_FILTERS`) | Map-side deal filter state (asset class, distress, etc.). |

### `sessionStorage`

| Key | Type | Writer | Reader | Purpose |
|---|---|---|---|---|
| `nd_return_url` | string (path + search) | `api.js` (on 401), `App.jsx` (on `!subscriber`), `LoginView` clears | `useAuth` DEV auto-login, `LoginView`, `App.jsx` URL normalizer | Return URL preservation across login bounce. |
| `nightdrop-feed-scroll` | string number | `DashboardView` on scroll + before nav | `DashboardView` on mount | Restore feed scroll position after `/deal/:id` round-trip. |
| `nightdrop-feed-sort` | string | `DashboardView` sort handler | `DashboardView` init | Sort preference for the deal feed. |

**No keys outside this list are valid.** Generated UI must not introduce new keys without adding them here.

---

## 12. Auth Model

### Token lifecycle
1. **Login:** `POST /auth/login` → `{ token, subscriber }` → `setToken(token)` writes `localStorage['nd_token']` → `setSubscriber(subscriber)` → navigate to `nd_return_url` or `/map`.
2. **Restore:** on app boot, `useAuth` checks `localStorage['nd_token']` → if present, `GET /auth/me` → on 200, sets subscriber; on 401, clears token.
3. **DEV-only auto-login:** if no token in DEV mode, `POST /__dev_login` (Vite plugin) → returns `{ token, subscriber }` → seeds session. Skipped in production builds.
4. **401 anywhere:** `api.js` clears token, stashes path+search to `sessionStorage['nd_return_url']`, hard-redirects to `/login`.
5. **Logout:** clears `nd_token`, sets subscriber to `null`.

### Auth gating
- `AppShell` redirects to `/login` if `!loading && !subscriber`.
- Public routes (`/login`, `/forgot-password`, `/reset-password`, `/invite/:token`) bypass `AppShell`.
- Admin views (`/invites`, `/admin`) gated client-side by `subscriber.email === 'brady@parcyl.ai'`.

### Return URL preservation
Any path + querystring (e.g. `/map?demo=true`) survives the login bounce because it's saved to `sessionStorage['nd_return_url']` before the redirect. Both `api.js` (401 path) and `App.jsx` (no-subscriber path) write this key; `useAuth` DEV-login and `LoginView` consume it.

---

## 13. Behavioral Contracts (must be preserved)

### Optimistic UI updates
`DealsContext` mutates local state first, then fires API call. On failure, the optimistic value stays — no rollback, no error toast. Pattern:
```js
setDeals(prev => prev.map(d => d.id === dealId ? { ...d, feedback: fb } : d));
try { await api.post(...); } catch { /* keep optimistic */ }
```
This is intentional. `saveNote` is the one exception — it lets the error propagate.

### Toasts
Fire via `addToast(message, variant)`. Auto-dismiss after 3000ms. Never render `<Toast>` directly. Variants: `'info' | 'success' | 'error' | 'warning'`.

### Null-string fallback
Backend may serialize null as the string `"null"`. `fmt(val)` in `src/lib/format.js` is the contract for display:
```js
fmt(val)           // returns '—' for null, '', 'null', or 'undefined'
hasVal(val)        // returns boolean
fmtMoney(n)        // $1.5M / $250K / $42 formats
scoreClass(s)      // 'hi' >=80, 'md' >=60, else 'lo'
fmtRelativeTime    // returns { label, days } or null
```

### Mock fallback (landmine)
`DashboardView` falls back to `MOCK_DEALS` (from `src/data/mockData.js`) when the API returns zero deals. Zero-deal subscribers see fake data. **Decision required before Design replaces DashboardView:** keep, gate to DEV, or remove entirely.

### Buy Box geography is mutually exclusive
Backend matcher checks geo modes in priority order: `county > city > zip > radius > state`. Only one mode narrows results. The wizard currently lets users multi-select all four. Data persists, but only the highest-priority non-empty mode is active. UI should communicate this.

### Buy Box preview debounce
`POST /buy-boxes/preview` is debounced 400ms by the wizard. Failures are non-fatal.

### Wizard create path drift
Wizard currently posts to `POST /api/dealfeed/onboarding`. Onboarding accepts ~50 of the 91 patchable fields — the 35 new MVP filter columns (migration 049) are silently dropped on create. `PATCH /buy-boxes/:id` accepts all 91. **Resolution:** wizard should switch create to `POST /buy-boxes` (covered in the 2026-05-20 commit `6b51fb5` but pending verification — see HANDOFF).

### Migration 049 dependency
Until `psql $DATABASE_WRITE_URL -f ~/nightdrop-api/migrations/049_df_buy_boxes_mvp_filters.sql` is applied, any new MVP filter field in a POST/PATCH returns HTTP 500 "column does not exist."

### Date / number formatting
- Currency: `fmtMoney(n)` — `$1.5M`, `$250K`, `$42`.
- Integers / years / decimals: `src/lib/numberFormat.js` — focused-raw / blurred-formatted, thousand-separator, tabular figures (Inter font).
- Relative time: `fmtRelativeTime(dateStr)` → `{ label: 'Today' | '1 day ago' | 'N days ago', days }` or `null`.

### Icon imports
Always `import { I } from '../components/Icons'`. Exceptions: `TopHeader.jsx`, `AdminView.jsx`, and `src/components/DealDetail/*` use `lucide-react` directly. The DealDetail/* exception was added in the 2026-05-24 V1 rebuild — V1 design uses ~40 icons not in `Icons.jsx`, and `lucide-react@^1.14.0` is already a dependency.

---

## 14. File / Module Map (canonical paths Design must honor)

```
src/
├── App.jsx                      # AppShell + DealDetailPage + DealDetailModal (inline)
├── main.jsx                     # Entrypoint + token migration
├── lib/
│   ├── api.js                   # request() + api.{get,post,patch,delete}
│   ├── format.js                # fmt, hasVal, fmtMoney, scoreClass, fmtRelativeTime
│   ├── numberFormat.js          # int/money/year/decimal formatters
│   ├── buyBoxTaxonomy.js        # 10 asset classes + colors + helpers
│   ├── buyBoxFieldSchema.js     # per-class field visibility
│   ├── wizardFormState.js       # EMPTY_FORM + nativeToPayload + toNativeForm
│   ├── assetColors.js           # map cluster palette + categorize()
│   ├── inviteHelpers.js         # parseInvitesFromText, validateInvite, dedupeByEmail
│   ├── googleMapsLoader.js
│   ├── anchorMetric.js
│   └── taxonomy.js
├── hooks/
│   └── useAuth.jsx              # AuthProvider + useAuth
├── contexts/
│   ├── DealsContext.jsx         # DealsProvider + useDeals
│   ├── ToastContext.jsx         # ToastProvider + useToast
│   ├── ReadStateContext.jsx     # ReadStateProvider + useReadState
│   └── DealStateContext.jsx     # DealStateProvider + useDealState
├── views/
│   ├── DashboardView.jsx        # Main feed
│   ├── MapView.jsx              # Full-screen map + DealPanel
│   ├── BuyBoxesView.jsx         # Buy box management
│   ├── SettingsView.jsx, InviteView.jsx, AdminView.jsx, AccountsView.jsx
│   ├── LoginView.jsx, ForgotPasswordView.jsx, ResetPasswordView.jsx, InviteClaimView.jsx
├── pages/
│   └── BuyBoxPage.jsx           # Buy box wizard route
├── components/
│   ├── TopHeader.jsx, LeftPanel.jsx, RightRail.jsx, LeftRail.jsx
│   ├── DealDetail.jsx, DealDetail/, DealComponents.jsx
│   ├── DealMap.jsx, DealPanel.jsx, DealPanelCard.jsx, MapLegend.jsx
│   ├── BuyBoxWizard.jsx, BuyBoxPage[1-7].jsx, BuyBoxRightRail.jsx
│   ├── Icons.jsx, Toast.jsx, ConfirmModal.jsx, OverflowMenu.jsx
│   ├── OwnerPortfolio.jsx, PipelineTimeline.jsx, MarketNewsfeed.jsx
│   ├── ContactLogModal.jsx, ScoreBadge.jsx, AerialThumb.jsx
│   ├── feed/
│   │   ├── FeedDealCard.jsx, WeekDayTabs.jsx
│   │   ├── DealChatThread.jsx, ChatFab.jsx, AgentMessageCard.jsx
│   │   ├── MessageInputBar.jsx, TonightsRunCard.jsx
│   └── kanban/
└── styles/
    ├── tokens.css               # All design tokens
    ├── styles.css               # Global ~3,900 lines
    ├── feed-layout.css          # Dashboard 3-col ~2,300 lines
    ├── deal-detail.css          # ~1,150 lines
    ├── toast.css, admin.css, ...
```

### Orphaned (scheduled deletion — don't reference)
- `src/components/BuyBoxConfigurator/` (10 files)
- `src/components/BuyBoxEditModal.jsx`
- `src/lib/wizardHelpers.js` + `.test.js`

---

## 15. Things Design Must Not Touch

1. **`src/contexts/DealsContext.jsx`** — central data layer. Breaking the hook signature breaks every consumer.
2. **`src/lib/buyBoxTaxonomy.js`** — must stay in 4-file lockstep with backend `assetUseCodes.js`, `assetClassMap.js`, `asset_class_map.py`. Any drift breaks the nightly matcher.
3. **`src/lib/api.js`** — the 401 / return-URL contract is load-bearing for the auth bounce. Don't reshape.
4. **Storage key formats** — `dealfeed.{prefix}.{subId}:{id}` schema is what makes per-subscriber localStorage scans work. Don't change separators.
5. **`netlify.toml` SPA redirect** — required for client-side routing in production.
6. **Wizard payload field names** — every name in `nativeToPayload` is a backend column name. Renames here = silent backend rejection.
7. **`useDeals` hook signature** — `{ deals, buyBoxes, contacts, dealNotes, portfolios, loading, error, refetch, postFeedback, saveNote, updateStatus, fetchContacts, logContact, patchBuyBox, deleteBuyBox, fetchDealNotes, createDealNote, fetchOwnerPortfolio }`. Don't drop or rename any of these.

---

## 16. Open Questions / Known Drift (carry into Design)

1. **DashboardView mock fallback** — keep, DEV-gate, or remove?
2. **Wizard create endpoint** — code in commit `6b51fb5` was supposed to switch to `POST /buy-boxes`. Verify before Design assumes either path.
3. **Tri-state boolean serialization** — `null`/`true`/`false` round-trip never tested end-to-end against migration 049 columns.
4. **Geo mutual exclusion UI** — wizard collects all four modes but only the highest priority narrows results. Should UI hide the others when one is active, or warn the user?
5. **`df_deals_sent` shape** — no client types file exists. Shape is implicit from usage. If Design generates a typed mock, the shape in Section 8 is authoritative.
6. **DM Sans + Inter** — currently scoped to wizard via `--font-ui` and `--font-secondary`. If Design wants to promote them to the rest of the app, that's a token-level change.

---

## 17. How to Use This Doc in Claude Design

When prompting Claude Design, paste this whole file in and add:

> Build the new UI matching the structure in Section 14. Use only design tokens from Section 2. Consume data via the hook contracts in Section 5 — do not invent new prop shapes. Use the exact API endpoints in Section 7. If you need new state, route it through the existing storage keys in Section 11 or add new ones to the same naming scheme. Behavioral contracts in Section 13 are non-negotiable.

After Design returns generated files, the wiring step here is:
1. Verify all hook names + signatures still match Section 5.
2. Verify no new storage keys outside Section 11 (or add them and update Section 11).
3. Verify no new endpoints outside Section 7.
4. Verify no hex colors / hardcoded fonts — only the CSS vars in Section 2.
5. Verify `src/lib/buyBoxTaxonomy.js` was not modified.
6. Drop the new files in, replace the old ones, run `npm run lint && npm run build && npm test`.
