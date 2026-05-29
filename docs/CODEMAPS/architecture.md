<!-- Generated: 2026-05-28 (session 7: V1 deal-detail migration + PR #13/#14 merged) | Files scanned: ~125 | Token estimate: ~950 -->
# Architecture — nightdrop-dashboard

React 19 + Vite 8 SPA. JSX, no TypeScript. Plain CSS with dual-theme tokens.
Production: Netlify auto-deploys from `main` → https://nightdropai.netlify.app

Deal Feed Excel cutover (2026-05-26): `/dealsheet` is now the primary
post-auth landing surface alongside `/map`. Legacy `/dashboard` and
`/calendar` redirect to `/dealsheet`.

V1 deal-detail migration (2026-05-28): `/deal/:id` route now renders DealShell
(design package rebuild). Old deal-detail.css removed; V1 styling scoped to
.deal-shell via v1-deal-tokens.css + deal-shell.css.

## Boundaries
```
Browser
  └─ React SPA (this repo)
       ├─ /api/dealfeed/*  → nightdrop-api (Render)
       └─ Mapbox GL JS     → Mapbox tiles + Static API
```

## Provider hierarchy (src/App.jsx)
```
BrowserRouter
  AuthProvider              (src/hooks/useAuth.jsx)
    ToastProvider           (src/contexts/ToastContext.jsx)
      App                   (defines AppShell, DealDetailPage, DealDetailModal,
                             InitialRouteGate inline)
        AppShell            (view state, default `view = 'map'`)
          ReadStateProvider / DealStateProvider / DealsProvider
            InitialRouteGate              (post-load: zero buy boxes → /buy-boxes/new)
            TopHeader | LeftPanel | Views | DealDetailPage | DealDetailModal
```

## Navigation — hybrid
- View switching: state-driven (`view` string in AppShell, sidebar click → `setView(...)`).
- URL-driven for deal detail (`/deal/:id`), the buy box wizard
  (`/buy-boxes/new`, `/buy-boxes/:id/edit`), and the Excel deal feed (`/dealsheet`).
- Landing paths (`LANDING_PATHS` in App.jsx): `/map`, `/dealsheet`. Bare `/`
  and `/login` URLs normalize to `/map`. `/dashboard` and `/calendar` redirect
  to `/dealsheet`.
- Admin/invites gated to `subscriber.email === 'brady@syndnet.com'`.

## Top-level dirs
```
src/
├── App.jsx                 ← AppShell + DealDetailPage + DealDetailModal inline
├── hooks/useAuth.jsx       ← auth context, token storage
├── contexts/               ← DealsContext, ReadStateContext, DealStateContext, ToastContext
├── lib/                    ← api client, taxonomy, format, wizardFormState
├── views/                  ← page-level components (Dashboard, Map, BuyBoxes,
│                              Admin, DealFeedExcelView, …)
├── pages/                  ← URL-routed pages (BuyBoxPage)
├── components/
│   ├── DealDetail/         ← V1 design package (DealShell + 8 subcomponents)
│   ├── feed/               ← deal feed cards, chat thread
│   └── kanban/             ← (placeholder, currently empty)
├── vendor/deal-feed/       ← vanilla-JS spreadsheet bundle (~7,500 lines
│                              .js + .css; ported from prior product;
│                              wrapped by DealFeedExcelView)
├── styles/                 ← tokens.css + v1-deal-tokens.css + per-surface CSS
├── assets/                 ← propcloud logo [theme-aware], static images
└── data/mockData.js        ← fallback data when API empty
```

## Data flow — buy box create
```
BuyBoxWizard (7 steps)
  → form state (wizardFormState.EMPTY_FORM shape)
  → previewState machine: idle (no asset class) → spinning → resolved | error
  → debounced POST /api/dealfeed/buy-boxes/preview (400ms, AbortController)
       backend spawns agents/preview_count.py → build_where_from_payload SQL
       → SELECT COUNT(*) FROM properties WHERE ... → {estimated_count}
       shares the same matcher_clauses builders the nightly engine uses, so
       the live counter and nightly delivery cannot disagree on filter SQL.
  → on activate: POST /api/dealfeed/buy-boxes                     ← create
                 OR PATCH /api/dealfeed/buy-boxes/:id             ← edit
```

## Data flow — deal feed
```
DealsContext.fetchAll() (on mount)
  → GET /api/dealfeed/deals       → deals[]
  → GET /api/dealfeed/buy-boxes   → buyBoxes[]
  → GET /api/dealfeed/contacts    → contacts[]
  → exposes via useDeals(): {deals, buyBoxes, contacts, refetch, postFeedback, toggleSave, …}
```

New in PR #14: `useDeals()` extended with `toggleSave` (V1 deal-detail feature).

## Data flow — deal detail
```
/deal/:id → DealDetailPage OR DealDetailModal
  → reads deal from DealsContext.deals[]
  → passes to DealShell
    ├─ DealHero (address + KPI cards + satellite map + distress signals)
    ├─ DealNarrative (brief text)
    ├─ DealIntel (3-tab data: properties / mortgage / permits)
    ├─ DealTimeline (chain-of-title events [placeholder])
    ├─ DealOwnerGraph (D3 force graph + table [placeholder])
    ├─ DealCalculator (deal math)
    └─ DealActivityRail (right edge: scroll-spy nav dots + activity [stub])
```

Keyboard nav (non-embedded mode): J/K/←/→ to move between deals in list.
Escape key closes the page or modal.

## Vendor bundle integration — `/dealsheet`
```
DealFeedExcelView (src/views/, lazy-loaded)
  ├─ side-effect imports vendor CSS (styles.css + light-theme.css)
  ├─ host overrides via DealFeedExcelView.css (loaded AFTER vendor)
  ├─ bundleLoadPromise (module-scoped) ensures the 8 bundle JS modules
  │  load exactly once per page lifetime:
  │     data → adapter → tabs → selection → context-menu → row-resize
  │       → filter-popover → sidebar → feed
  ├─ publishToBundle(state)         host  → bundle data push (deals, buyBoxes,
  │                                  readState, etc.) — rAF-throttled by
  │                                  createRrThrottle()
  └─ installActionAdapters({...})   bundle → host callbacks (saveNote,
                                     updateStatus, postFeedback, navigate, …)
```
AppShell keeps a single `DealFeedExcelView` instance mounted across view
switches (toggled via `display:none`) so element-scoped listeners
attached by the bundle survive navigate-away-and-back.

New in PR #13 + #14:
- `adapter.js` now reads camelCase fields from backend briefJson (mortAmt, mortLender, mortDate wired)
- `feed.js` expand row now wires `.sat-tile` element with Mapbox Static satellite image at deal coords

## Design tokens — dual-theme (light/dark)
```
localStorage['nightdrop-theme'] (default 'dark')
  ↓
document.documentElement[data-theme]
  ↓ matches :root, [data-theme="light"], [data-theme="dark"]
  ├─ src/styles/tokens.css
  │  (shadcn-style light/dark palettes; global tokens)
  │
  └─ src/styles/v1-deal-tokens.css
     (scoped to .deal-shell; overrides light/dark for V1 design)
```

Light theme softening pass (2026-05-28): desaturated greens, warm off-white BG,
softer typography contrast to reduce eye fatigue.

Dark theme: shipped as-is from V1 design package (2026-05-22).

## Cross-repo lockstep (DO NOT BREAK)
The asset class taxonomy must stay identical across 4 files:
- `~/nightdrop-dashboard/src/lib/buyBoxTaxonomy.js`           (this repo)
- `~/nightdrop-api/services/assetUseCodes.js`                 (Node, source of truth)
- `~/nightdrop-api/services/assetClassMap.js`                 (resolved_asset_type strings)
- `~/nightdrop-api/agents/lib/asset_class_map.py`             (Python matcher)

## Build / test
```bash
npm run dev        # vite dev server (5173, auto-bumps if taken)
npm run build      # production build → dist/
npm test           # vitest (211 tests)
npm run lint       # ESLint
npx playwright test    # E2E. Floor: 12 = 9 dealsheet-persistence
                       # + 3 excel-feed Stage 1 (F1/F3/F14).
                       # Pre-existing flake: 10 in critical-flows + smoke BB-1
                       # (page-fade overlay interception).
```
Test floor: 211 vitest + 12 Playwright = 223 total.

## Env vars
- `VITE_API_BASE_URL` — empty in dev (Vite proxies to nightdrop-api.onrender.com)
- `VITE_MAPBOX_TOKEN` — Mapbox public token

## Spec references
- Backend MVP filter contract: `~/nightdrop-api/docs/taxonomy/mvp-buy-box-taxonomy.md`
- Cross-repo audit: `notes/audit/CROSS-REPO-AUDIT-BUY-BOX-MVP-2026-05-20.md`
- Deal Feed Excel cutover plan: `notes/bmad/deal-feed-excel/` (PRD, stories, qa-plan)
- V1 deal-detail design package: `notes/bmad/deal-detail-v1/` (architecture, component breakdown)
