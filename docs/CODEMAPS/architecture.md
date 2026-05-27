<!-- Generated: 2026-05-26 (session 4 refresh: test counts only) | Files scanned: ~125 | Token estimate: ~900 -->
# Architecture — nightdrop-dashboard

React 19 + Vite 8 SPA. JSX, no TypeScript. Plain CSS with tokens.
Production: Netlify auto-deploys from `main` → https://nightdropai.netlify.app

Deal Feed Excel cutover (2026-05-26): `/dealsheet` is now the primary
post-auth landing surface alongside `/map`. Legacy `/dashboard` and
`/calendar` redirect to `/dealsheet`.

## Boundaries
```
Browser
  └─ React SPA (this repo)
       ├─ /api/dealfeed/*  → nightdrop-api (Render)
       └─ Mapbox GL JS     → Mapbox tiles
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
- Admin/invites gated to `subscriber.email === 'brady@parcyl.ai'`.

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
├── components/             ← shared UI atoms + composites
│   ├── feed/               ← deal feed cards, chat thread
│   └── kanban/             ← (placeholder, currently empty)
├── vendor/deal-feed/       ← vanilla-JS spreadsheet bundle (~7,500 lines
│                              .js + .css; ported from prior product;
│                              wrapped by DealFeedExcelView)
├── styles/                 ← tokens.css + per-surface CSS files
├── assets/                 ← logo PNG, static images
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
  → exposes via useDeals(): {deals, buyBoxes, contacts, refetch, postFeedback, …}
```

## Vendor bundle integration — `/dealsheet`
```
DealFeedExcelView (src/views/, lazy-loaded)
  ├─ side-effect imports vendor CSS (styles.css + light-theme.css)
  ├─ host overrides via DealFeedExcelView.css (loaded AFTER vendor)
  ├─ bundleLoadPromise (module-scoped) ensures the 8 bundle JS modules
  │  load exactly once per page lifetime:
  │     data → tabs → selection → context-menu → row-resize
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
