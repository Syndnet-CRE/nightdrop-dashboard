<!-- Generated: 2026-05-26 | Files scanned: package.json + integrations | Token estimate: ~550 -->
# Dependencies — nightdrop-dashboard

## Runtime stack
| Layer       | Package                 | Version |
|-------------|-------------------------|---------|
| Framework   | react / react-dom       | ^19.2.5 |
| Router      | react-router-dom        | ^7.14.2 |
| Build       | vite                    | ^8.0.10 |
| Map         | mapbox-gl + react-map-gl| ^3.23 / ^8.1 |
| Viz         | d3                      | ^7.9.0  |
| Markdown    | react-markdown          | ^10.1.0 |
| Icons       | lucide-react            | ^1.14.0 |

## Dev tooling
- **eslint** ^10.2 + react-hooks + react-refresh
- **vitest** ^4.1 + @vitest/coverage-v8 (unit/component tests)
- **@playwright/test** ^1.59 (E2E smoke)
- **knip** ^6.12 (dead-code detection)
- **@vitejs/plugin-react** ^6.0

## External services
| Service          | Endpoint                              | Purpose                                |
|------------------|---------------------------------------|----------------------------------------|
| nightdrop-api    | https://nightdrop-api.onrender.com    | All `/api/dealfeed/*` requests         |
| Mapbox           | Mapbox GL JS tiles + style            | DealMap + MapView                      |
| Google Fonts     | Manrope, DM Sans, Inter               | Loaded via `@import` in tokens.css     |
| Netlify          | Static host + auto-deploy from main   | Production CDN                         |

## Env vars
- `VITE_API_BASE_URL` — empty in dev (Vite proxies to nightdrop-api.onrender.com via `vite.config.js` `API_TARGET`)
- `VITE_MAPBOX_TOKEN` — Mapbox public token (required for any map view)

## Shared libraries (in-repo)
| File                              | Role                                              |
|-----------------------------------|---------------------------------------------------|
| `src/lib/api.js`                  | `request()` wrapper + `api.get/post/patch/delete` |
| `src/lib/buyBoxTaxonomy.js`       | 10-class ASSET_CLASSES + LAND_SUB_ASSETS + helpers|
| `src/lib/buyBoxFieldSchema.js`    | per-class field visibility map for wizard pages   |
| `src/lib/wizardFormState.js`      | EMPTY_FORM + nativeToPayload + toNativeForm       |
| `src/lib/numberFormat.js`         | formatNumber/parseNumber (int/money/year/decimal) |
| `src/lib/format.js`               | `fmt(val)`, `hasVal(val)`, `fmtMoney(n)`, `scoreClass(s)` |
| `src/lib/inviteHelpers.js`        | parseInvitesFromText / validate / dedupe          |
| `src/lib/taxonomy.js`             | (legacy — being phased out)                       |

## Backend repo lockstep
4-file taxonomy must stay identical:
- `src/lib/buyBoxTaxonomy.js`                                (this repo)
- `~/nightdrop-api/services/assetUseCodes.js`                (single source of truth)
- `~/nightdrop-api/services/assetClassMap.js`                (resolved_asset_type strings)
- `~/nightdrop-api/agents/lib/asset_class_map.py`            (Python matcher)

Any drift breaks the nightly matcher. Hookify rule warns on edits:
`.claude/hookify.wizard-matcher-drift.local.md`.

## Removed / orphan dependencies (2026-05-20 cleanup)
Deleted from `src/`:
- `components/BuyBoxConfigurator/` (10 files, prior wizard prototype)
- `components/BuyBoxEditModal.jsx` (legacy edit overlay)
- `lib/wizardHelpers.js` + `.test.js` (~77 tests dropped; expected)

## Removed by Deal Feed Excel cutover (2026-05-26)
- `views/DashboardView.jsx` (legacy card feed; replaced by DealFeedExcelView)
- `components/feed/WeekDayTabs.jsx`, `FeedToolbar.jsx`, `FeedDealCard.jsx`,
  `MiniCalendar.jsx`, etc. (only retained where the Excel bundle reuses them
  or where DealDetailPage still needs them)
- sessionStorage keys `nightdrop-feed-scroll` and `nightdrop-feed-sort`

## In-repo orphans flagged for follow-up
- Dead `.app` CSS rules: vendor `styles.css:59` and host `styles.css:96`
- Vendor `adapter.js::buildCalendar` dead export (~46 tests would drop on removal)
- See `notes/HANDOFF.md` "Known Vendor Latent Bugs" for tracking

## CORS / network notes
- Allowed origins on backend: `nightdropai.netlify.app`, `nightdrop.ai`,
  `www.nightdrop.ai`, `localhost:3000`, `localhost:5173`, plus
  `*--nightdropai.netlify.app` for preview deploys.
- Vite dev proxy defaults `API_TARGET` to `https://nightdrop-api.onrender.com`.
  Override per-shell: `API_TARGET=http://localhost:3001 npm run dev`.

## Bundle size at last build (2026-05-20)
- Main JS chunk: ~721 KB raw / ~215 KB gzipped
- Mapbox GL chunk: ~1742 KB raw / ~474 KB gzipped (lazy-loaded)
- CSS: ~272 KB raw / ~45 KB gzipped
- Build time: ~420ms (Vite + Rolldown)
