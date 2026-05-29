# CLAUDE.md

Inherits all rules from ~/.claude/CLAUDE.md. This file adds project context only.

## REPO

Path: ~/nightdrop-dashboard
Deploy: Netlify — auto-deploys from main (`npm run build` → `dist/`). Netlify site: `nightdropaidashboard` (id `ff6c2656-f26d-4f07-a403-c7d253e175f7`).
Production URL: https://dashboard.propcloud.ai (Netlify subdomain: nightdropaidashboard.netlify.app)
> Drift note (2026-05-29): docs previously listed `nightdropai.netlify.app` as production. That URL is the SEPARATE landing site (repo `nightdrop-landing`, a Next.js app at propcloud.ai). This dashboard deploys to dashboard.propcloud.ai. Do not confuse the two.
Start: `cd ~/nightdrop-dashboard && claude --dangerously-skip-permissions`

## PURPOSE

Nightdrop Dashboard is a React SPA for CRE investors to review distressed property deals matched to their buy boxes. Users authenticate, browse their deal feed, inspect deal details, manage buy boxes, and view deals on a Mapbox map. Frontend hits the nightdrop-api backend at `~/nightdrop-api` (Render service `nightdrop-api`) via `/api/dealfeed/*`.

## STACK

- React 19 + Vite 8 (JSX, no TypeScript)
- react-router-dom v7 (BrowserRouter, Routes/Route)
- react-map-gl v8 + mapbox-gl v3
- lucide-react (TopHeader + AdminView only; all other icons via `Icons.jsx`)
- Plain CSS (no Tailwind) — design tokens in `src/styles/tokens.css`
- Netlify (SPA redirect via `netlify.toml`)

## COMMANDS

```bash
npm run dev       # dev server at localhost:5173
npm run build     # production build to dist/
npm run lint      # ESLint
npm test          # vitest unit tests — single run
npx playwright test           # E2E smoke suite (start dev server first)
npx playwright test --ui      # Playwright interactive mode
```

E2E tests: `tests/smoke.spec.js`. `playwright.config.js` sets `webServer: null` — start dev server separately.

## ENV VARS

```
VITE_API_BASE_URL=   # empty = same origin, routes through Vite proxy
VITE_MAPBOX_TOKEN=   # Mapbox public token
```

`.env.development` is committed with `VITE_API_BASE_URL=` empty, so dev routes through the Vite proxy. The Vite proxy target defaults to `https://nightdrop-api.onrender.com` (see `vite.config.js` `API_TARGET`). Override per-shell with `API_TARGET=http://localhost:3001 npm run dev` to point at a local backend. `.env` is gitignored; if you keep a local `.env` with a different `VITE_API_BASE_URL`, it will override `.env.development` and bypass the Vite proxy entirely.

## ARCHITECTURE

### Provider hierarchy

```
BrowserRouter
  AuthProvider           (src/hooks/useAuth.jsx)
    ToastProvider        (src/contexts/ToastContext.jsx)
      App                (src/App.jsx — also defines AppShell, DealDetailPage, DealDetailModal inline)
        AppShell         (holds view state)
          ReadStateProvider / DealStateProvider / DealsProvider
            TopHeader | LeftPanel | Views | DealDetailPage | DealDetailModal
```

`AppShell`, `DealDetailPage`, and `DealDetailModal` are all defined in `src/App.jsx` — no separate files.

### Contexts

| Context | Hook | Purpose |
|---------|------|---------|
| `DealsContext.jsx` | `useDeals()` | Deals, buy boxes, contacts — central data layer |
| `ToastContext.jsx` | `useToast()` | Fire toasts; never render `Toast` directly |
| `ReadStateContext.jsx` | `useReadState()` | localStorage read/unread per subscriber |
| `DealStateContext.jsx` | `useDealState()` | localStorage deal state machine per subscriber |

### Navigation — hybrid

- Most navigation is **view-state only**: `view` string in AppShell, `setView(...)` on sidebar clicks.
- Deal detail is **URL-based**: `navigate('/deal/' + deal.id)`. Two modes: DealDetailPage (full-screen) vs DealDetailModal (overlay from MapView, detected by `location.state?.fromMap`).
- Admin/invites views gated to `subscriber.email === 'brady@parcyl.ai'`.

### API layer

All requests through `src/lib/api.js` `request()`. Use `api.get/post/patch/delete` everywhere — never call `fetch` directly.

## KEY FILES

> Full component and endpoint reference: `notes/REFERENCE.md`

Dangerous files — edit carefully:
- `src/App.jsx` — AppShell + DealDetailPage + DealDetailModal + all modal state; 400+ lines
- `src/contexts/DealsContext.jsx` — central data fetch; breaking this breaks all views
- `src/styles/styles.css` — ~3,900 lines; global overrides
- `src/styles/feed-layout.css` — ~2,300 lines; Dashboard three-column layout
- `src/styles/deal-detail.css` — ~1,150 lines
- `src/lib/buyBoxTaxonomy.js` — asset class taxonomy. **STALE as of 2026-05-20:** still 8 classes; backend rebuilt to 10 (see BACKEND CONTRACT below). Must be updated before the next wizard create flow works against migration 049 fields.
- `src/components/BuyBoxWizard.jsx` — wizard shell + `NATIVE_FORM` + `nativeToPayload` + `toNativeForm`. Active create/edit logic. ~30 of the backend's 91 patchable fields are wired; the other ~60 are silently dropped.

Orphaned (zero imports — safe to delete in next cleanup):
- `src/components/BuyBoxConfigurator/` (10 files, ~1,280 lines)
- `src/components/BuyBoxEditModal.jsx`
- `src/lib/wizardHelpers.js` + `wizardHelpers.test.js` (~30–40 tests will drop with these)

## KNOWN LANDMINES

- `DealMap` calls `fitDeals` inside `onLoad` AND in a `useEffect` gated on `mapLoaded`. Both are needed. Removing either breaks auto-fit.
- `fmt()` must wrap any field that might arrive as the string `"null"` — backend serializes nulls as strings.
- `DashboardView` silently falls back to `MOCK_DEALS` when API returns empty. Zero-deal subscribers see fake data.
- `saveNote` does optimistic update with no error catch — failed PATCH leaves stale UI with no feedback.
- `BuyBoxWizard` backdrop has no onClick close — intentional, prevents accidental mid-flow dismissal.
- `POST /api/dealfeed/buy-boxes/preview` exists (confirmed 2026-05-20) and is debounced 400ms by the wizard. Returns `{ estimated_count }`. Failures are non-fatal.
- Playwright tests hardcoded to port 5173. Kill other Vite instances before running.
- **Geo is mutually exclusive on the backend.** Matcher (now `~/nightdrop-api/agents/lib/matcher_clauses.py`, replacing the legacy `scripts/run_deal_feed.js`) checks geo modes in priority order: **county > city > zip > radius > state**. Only one mode is active per box; selecting counties REPLACES city/zip/state filtering, not adds to it. The wizard UI lets users multi-select all four — data is persisted, but only the highest-priority non-empty mode narrows results.
- **5-county coverage MVP.** Parcyl DB covers Travis, Bastrop, Hays, Williamson, Caldwell only. The wizard exposes 51 states with mock counts — misleading. Constrain or label clearly before any external launch.
- **Wizard create path silently drops new fields.** The wizard posts to `POST /api/dealfeed/onboarding` for create. `onboarding.js` accepts ~50 fields. The 35 fields from migration 049 (lot_sf, building_classes, has_pool, opportunity_zone, utilities, road frontage, AADT, LIHTC, etc.) are NOT in onboarding's INSERT — they are silently dropped on create. `PATCH /api/dealfeed/buy-boxes/:id` accepts all of them. Until the create path is reconciled, new buy boxes cannot persist the new MVP filters.
- **Migration 049 may not be applied yet.** Backend writes were complete on 2026-05-20 but the SQL must be run by Brady (`psql $DATABASE_WRITE_URL -f migrations/049_df_buy_boxes_mvp_filters.sql`). Until applied, any new field in a PATCH = HTTP 500 "column does not exist".
- Design tokens: `--green=#5BCC48`, `--warning=#F4B73E`, `--danger=#E5484D`. Never hardcode these hex values.
- Font: Manrope (sans). No JetBrains Mono anywhere — banned.

## LOCAL HOOKIFY RULES

| Rule file | Trigger | Warning |
|-----------|---------|---------|
| `hookify.wizard-matcher-drift.local.md` | `buyBoxTaxonomy.js`, `BuyBoxWizard.jsx`, `BuyBoxPage[0-9].jsx`, `nativeToPayload`, `toNativeForm` | 4-file taxonomy lockstep + payload contract |
| `hookify.silent-zero-results.local.md` | `run_deal_feed.js` | Zero-match logging (legacy matcher — kept for back-compat) |
| `hookify.unregistered-routes.local.md` | New route files | Register in `server.js` |
| `hookify.orphaned-scripts.local.md` | New scripts | Add npm script or cron |
| `hookify.uuid-and-backend-target.local.md` | ID cast or hardcoded URL | IDs are UUIDs; backend is `nightdrop-api.onrender.com` |

## BACKEND CONTRACT

Backend repo: `~/nightdrop-api` (GitHub: `Syndnet-CRE/nightdrop-api`, branch `main`).
Render service: **`nightdrop-api`** at **`https://nightdrop-api.onrender.com`**.

The Vite dev proxy default in `vite.config.js` already points here. Production builds inline whatever `VITE_API_BASE_URL` Netlify is configured with — verify in the Netlify env settings, not in local `.env` files.

> Historical note: earlier docs referenced `~/parcyl/scoutgpt-api` and `scoutgpt-app.onrender.com`. That backend is no longer the production target for nightdrop-dashboard. Some local `.env` files, Netlify env vars, and hookify rules may still carry the old URL — treat any sighting as drift to fix.

Key paths inside `~/nightdrop-api`:
- `routes/dealfeed/*.js` — REST endpoints (`auth`, `buyboxes`, `onboarding`, `admin`, `geo`, `agent`, `invites`, `webhooks`, `ownerPortfolio`)
- `agents/lib/property_matcher.py` — current matcher orchestrator (Python, ~238 lines)
- `agents/lib/matcher_clauses.py` — all WHERE-clause builders (~522 lines)
- `agents/deal_engine.py` — nightly orchestrator (triggered by Mac Mini LaunchAgent, NOT Render)
- `scripts/run_deal_feed.js` — **LEGACY** Node matcher. Kept for historical reference. No longer scheduled. Does NOT enforce migration 049 filters.
- `services/assetUseCodes.js`, `services/assetClassMap.js`, `agents/lib/asset_class_map.py` — taxonomy 3-file lockstep

**DB rules**: All `df_*` tables live on `$DATABASE_WRITE_URL` via `poolWrite`. All `df_*` IDs are **UUID strings** — never `parseInt()` them.

> Full endpoint list: `notes/REFERENCE.md`

### Taxonomy (10 classes, MVP — locked 2026-05-20)
`self_storage`, `multifamily`, `mobile_home_rv`, `residential_sfr`, `land`, `industrial`, `retail`, `gas_station_c_store`, `office`, `special_purpose`.

Authoritative: `~/nightdrop-api/docs/taxonomy/mvp-buy-box-taxonomy.md`.

4-file lockstep rule (any drift breaks the nightly matcher):
- `~/nightdrop-api/services/assetUseCodes.js`
- `~/nightdrop-api/services/assetClassMap.js`
- `~/nightdrop-api/agents/lib/asset_class_map.py`
- `~/nightdrop-dashboard/src/lib/buyBoxTaxonomy.js` (mirrors the above)

### Core endpoints (full list in `notes/REFERENCE.md`)
- `POST /api/dealfeed/auth/login` → `{ token, subscriber }`
- `GET /api/dealfeed/deals` → `{ deals: Deal[] }`
- `GET /api/dealfeed/buy-boxes` → `{ buy_boxes: BuyBox[] }`
- `POST /api/dealfeed/buy-boxes` → create (accepts all 91 patchable fields; **not currently used by wizard**)
- `PATCH /api/dealfeed/buy-boxes/:id` → pause/resume/edit (accepts all 91 patchable fields)
- `POST /api/dealfeed/buy-boxes/preview` → `{ estimated_count }`
- `POST /api/dealfeed/onboarding` → wizard's current create path. Accepts ~50 fields. **Missing the 35 columns from migration 049.**

## BMAD + HANDOFF

Planning docs: `notes/bmad/` (project-local).

Historical (shipped, banner added 2026-05-20):
- `buy-box-wizard/` — initial wizard buildout (2026-05-03)
- `buy-box-wizard-v2/` — 7-step rebuild + 13 new fields (2026-05-11)
- `buy-box-command-center/` — buy boxes page conversion (2026-05-10)

Active / unstarted:
- `subscriber-invite`, `snowflake-sync`, `b-plus-roadmap`, `dashboard-redesign-v2`, `nightdrop-rebrand`

Upcoming: `buy-box-mvp-rebuild/` (planned — wizard alignment with backend's 10-class taxonomy + 35 new filter fields).

Session handoff: `notes/HANDOFF.md` (project-local — not `~/parcyl/notes/HANDOFF.md`).
Archived CLAUDE.md versions: `notes/CLAUDE.archive/`.

## CURRENT CROSS-REPO AUDIT

`notes/audit/CROSS-REPO-AUDIT-BUY-BOX-MVP-2026-05-20.md` is the load-bearing reference for the buy box rebuild. It enumerates: every drift between dashboard and backend, the 91-field PATCHABLE_FIELDS list, three-state boolean fields, validator ranges, dead code, and the 12 open questions that must be answered before code is written.

All other audit files in `notes/audit/` carry STALE / PARTIALLY STALE / HISTORICAL banners pointing to this file. Do not treat any 2026-05-11 or 2026-05-16 audit doc as current.
