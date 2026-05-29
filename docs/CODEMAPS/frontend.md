<!-- Generated: 2026-05-28 (session 7: V1 deal-detail migration + PR #13/#14 merged) | Files scanned: ~130 | Token estimate: ~1300 -->
# Frontend — nightdrop-dashboard

## Routes (src/App.jsx)
```
/login                          → LoginView (unauth)
/forgot-password                → ForgotPasswordView (unauth)
/reset-password                 → ResetPasswordView (unauth)
/invite/:token                  → InviteClaimView (unauth)
/buy-boxes/new                  → BuyBoxPage mode="new"  → BuyBoxWizard
/buy-boxes/:id/edit             → BuyBoxPage mode="edit" → BuyBoxWizard
/dealsheet                      → AppShell  → view='dealsheet' → DealFeedExcelView
/deal/:id                       → DealDetailPage (full-screen) OR DealDetailModal (overlay)
                                  (overlay mode triggered by state.fromMap from MapView)
/*  (catch-all auth)            → AppShell  → views switched by `view` state
                                  (most non-deal views are URL-less; `/map` is the default landing path)
```

Post-auth flow:
- Bare `/`, `/login`, and successful login redirects → `/map` (initial `view = 'map'`)
- `LANDING_PATHS = {'/map', '/dealsheet'}` — both are valid post-auth landings
- Legacy `/dashboard` and `/calendar` URLs redirect to `/dealsheet`
- `InitialRouteGate` (mounted inside DealsProvider, fires once on load): if the
  subscriber has zero buy boxes, redirects from any landing path to `/buy-boxes/new`
- New: `/deal/:id` route renders V1 DealShell (design package rebuild, 2026-05-28)

## View map (state-driven inside AppShell)

| `view` value     | Nav label        | Component                       | Description                                  |
|------------------|------------------|---------------------------------|----------------------------------------------|
| `dealsheet`     | **Deal Feed**    | views/DealFeedExcelView.jsx     | Spreadsheet UI (vendor bundle); URL `/dealsheet` |
| `map`            | Map              | views/MapView.jsx               | Full-screen Mapbox + DealPanel sidebar (default landing) |
| `boxes`          | Buy Boxes        | views/BuyBoxesView.jsx          | Kanban (pending / active / paused / gap)     |
| `accounts`       | Account          | views/AccountsView.jsx          | Owner roll-up (subscriber-level)             |
| `settings`       | Settings         | views/SettingsView.jsx          | Profile + password                           |
| `invites`        | —                | views/InviteView.jsx            | Admin invite queue (brady@syndnet.com)       |
| `admin`          | —                | views/AdminView.jsx             | Admin dashboard (brady@syndnet.com)          |

The Deal Feed Excel cutover (2026-05-26) replaced the legacy `DashboardView`
card feed with `DealFeedExcelView` at `/dealsheet`. The DashboardView source
file has been removed from the tree — rollback would be a git revert.

## Component hierarchy

### Top-level chrome
```
TopHeader (propcloud logo [theme-aware] + countdown + pipeline track)
LeftPanel (global nav + KPI MetricTiles + Buy Box list + Last 7 Nights chart)
RightRail (DashboardView-only: mini DealMap + Buy Box Health + Recent Activity)
ChatFab → DealChatThread (agent chat)
Toast (via useToast — never render directly)
```

`TonightsRunCard` + `MarketNewsfeed` component files still exist but are not
mounted in Phase 1. Reserved for Phase 3 `/trending` page.

### Buy Box Wizard (7 steps)
```
BuyBoxWizard.jsx (shell, ~380 lines)
  ├─ wizardFormState.js (EMPTY_FORM, nativeToPayload, toNativeForm)
  ├─ buyBoxFieldSchema.js (class → field visibility map)
  ├─ buyBoxTaxonomy.js (10 ASSET_CLASSES, LAND_SUB_ASSETS, building classes)
  ├─ buyBoxInputs.jsx (NumberField, RangeInputs, SingleInput — shared themed inputs)
  ├─ numberFormat.js (formatNumber / parseNumber: int / money / year / decimal)
  ├─ SlotMachineCounter.jsx (6-reel live counter — idle/spinning/resolved/error)
  └─ pages:
      ├─ BuyBoxPage1.jsx     (Target: 10 asset cards + subtypes + geography)
      ├─ BuyBoxPage23.jsx    (Profile + Owner)
      ├─ BuyBoxPage4.jsx     (Distress signals — tier-coded cards)
      ├─ BuyBoxPage5.jsx     (Location & Risk — utilities + class-specific)
      ├─ BuyBoxPage6.jsx     (Threshold — Volume/Balanced/Precision)
      ├─ BuyBoxPage7.jsx     (Activate — name + delivery + activate)
      └─ BuyBoxRightRail.jsx (live match pool + filter chips)
  ScrollHint: auto-detected via useScrollHint hook (any page that overflows)
```

#### Live counter state machine (BuyBoxWizard)
```
previewState ∈ {idle, spinning, resolved, error}
errorKind    ∈ {null, 'timeout' (HTTP 504), 'server' (any other failure)}

mount (new wizard)        → 'idle'   (matchCount=null; copy: "Select an asset class to start.")
mount (edit, has asset)   → 'spinning'
any filterKey change w/ no asset selected → 'idle' (request short-circuited)
any filterKey change w/ asset selected    → 'spinning' → 'resolved' | 'error'
POST /api/dealfeed/buy-boxes/preview      → debounced 400ms; AbortController cancels stale
```
`filterKey` is JSON.stringify of every form slice the matcher honors. `name`,
`delivery`, `threshold`, and `matchCount` are intentionally excluded so they
do not retrigger the counter.

### Deal Feed (Excel cutover, 2026-05-26)
```
views/DealFeedExcelView.jsx           (~400 lines — React wrapper)
  ├─ side-effect imports vendor CSS:
  │    vendor/deal-feed/styles.css      (~2,300 lines — vendor base)
  │    vendor/deal-feed/light-theme.css (~525 lines — light palette overlay)
  │    DealFeedExcelView.css            (host overrides; cascade-last)
  ├─ installLucideShim()                (vendor expects window.lucide)
  ├─ installActionAdapters({...})       (bundle → host: saveNote, updateStatus,
  │                                      postFeedback, navigate, etc.)
  ├─ publishToBundle(state)             (host → bundle data push, rAF-throttled
  │                                      via createRrThrottle)
  └─ loadBundleOnce() — promise-cached side-effect imports of:
       vendor/deal-feed/data.js          (~260 lines — sample/seed)
       vendor/deal-feed/adapter.js       (~270 lines — host Deal → bundle shape; wired camelCase reads)
       vendor/deal-feed/tabs.js          (~220 lines — sheet tab strip)
       vendor/deal-feed/selection.js     (~810 lines — cell select + edit caret)
       vendor/deal-feed/context-menu.js  (~355 lines — right-click menu)
       vendor/deal-feed/row-resize.js    (~130 lines — row height drag)
       vendor/deal-feed/filter-popover.js(~315 lines — column filter UI)
       vendor/deal-feed/sidebar.js       (~40 lines — hidden, locked decision 4)
       vendor/deal-feed/feed.js          (~820 lines — main render orchestrator + .sat-tile + expand buttons)
```

AppShell mounts a single `DealFeedExcelView` instance once the user first
visits `/dealsheet` (`hasVisitedDealsheet` latch in App.jsx) and keeps it
mounted thereafter, toggling visibility with `display:none`. This preserves
the bundle's element-scoped listeners across view switches.

Excel-parity contracts locked in tests (`tests/dealsheet-persistence.spec.js`,
9 tests; `tests/excel-feed.spec.js`, 3 Stage 1 tests for PRD F1/F3/F14 —
chrome flows: shell + toolbar inventory, sort dropdown shape, density toggle
re-renders heights. Stages 2/3 add data-bound flows F2/F4-F13.):
- Single `#sel-overlay > .sel-rect` per selection; no leaked indicators
- Right-click opens context menu without entering edit mode
- dblclick caret lands at END of seeded content via
  `range.selectNodeContents(span) + range.collapse(false)` (Sheets/Excel parity)
- Host's universal `:focus-visible { box-shadow: var(--ring-shadow) }` at
  `src/styles/styles.css:1450` is suppressed inside `.cell-edit`
- Empty filler rows (`tr.empty-row`) override per-column right-align rules to
  left-align the caret regardless of column (psf / sf / hold); populated
  `tr.dr` rows preserve column alignment — locked by synthetic-DOM scope guard
- Vendor bundle file structure under `src/vendor/deal-feed/` is treated as
  porting territory: tests cover behavior, not exact selectors.

New in PR #14: `.sat-tile` wrapper now loads Mapbox satellite image (Static API)
at deal coordinates (read from adapter) with zoom toggle (14-20); falls back to
CSS gradient placeholder on missing lat/lng or HTTP error.

### Deal detail — V1 design package (migrated 2026-05-28)

V1 ground-up rebuild shipped in PR #14. Route `/deal/:id` now renders DealShell
with full-screen or modal mode (detected by `location.state?.fromMap`).

```
components/DealDetail/
  ├─ DealShell.jsx         (202 lines — orchestrator, keyboard nav J/K/←/→)
  ├─ DealTopbar.jsx        (331 lines — deal nav + actions + prev/next + close)
  ├─ DealHero.jsx          (453 lines — address + KPI cards + satellite map + distress signals)
  ├─ DealNarrative.jsx     (130 lines — brief text narrative)
  ├─ DealIntel.jsx         (526 lines — 3-tab intel: properties / mortgage / permits)
  ├─ DealTimeline.jsx      (384 lines — chain of title event timeline [placeholder: awaiting backend])
  ├─ DealOwnerGraph.jsx    (541 lines — D3 force-directed graph + table [placeholder: awaiting backend])
  ├─ DealCalculator.jsx    (274 lines — deal math: CAP / cash flow / ROI)
  ├─ DealActivityRail.jsx  (280 lines — right-edge sticky rail: nav dots + activity stub)
  └─ deal-shell.css        (styles — 2-column grid main/rail + all V1 components)
```

Old deal-detail.css deleted (PR #14). V1 styling isolated to:
- `src/styles/v1-deal-tokens.css` (design tokens scoped to .deal-shell)
- `src/components/DealDetail/deal-shell.css` (component layout + typography)

Both themes (light/dark) supported via `[data-theme]` attribute on document root.
Token overrides in v1-deal-tokens.css from Brady's design review (2026-05-28):
- Dark BG: #171717 (V1 spec was #08090b)
- Card border: #404040 (V1 spec was #2f2f2f)

Data field mapping:
- `mortAmt`, `mortLender`, `mortDate` — now read from briefJson (PR #13 adapter)
- `landVal`, `bldgVal`, `deed` — still hardcoded as '—' (QUEUED: wire in next session)
- `deal.timeline[]`, `deal.ownerPortfolio[]`, `deal.narrative.briefing` — empty-state placeholders waiting for backend

### Buy boxes kanban
```
views/BuyBoxesView.jsx
  ├─ BuyBoxCard
  │    ├─ CardMenu (Tune button → Edit / Pause / Delete / Fix-geo)
  │    └─ formatAsset (uses getAssetClass for humanized labels)
  └─ ConfirmModal (delete/pause confirm)
```

### Map view
```
views/MapView.jsx
  ├─ DealMap.jsx (Mapbox, fitDeals in onLoad + useEffect)
  ├─ DealPanel.jsx (collapsible sidebar)
  └─ DealPanelCard.jsx (expandable preview with .sat-tile satellite image)
```

## State management

### React context
| Context                          | Hook                  | Scope                                       |
|----------------------------------|-----------------------|----------------------------------------------|
| `DealsContext.jsx`               | `useDeals()`          | deals, buyBoxes, contacts, portfolios + CRUD|
| `ToastContext.jsx`               | `useToast()`          | toast queue                                 |
| `ReadStateContext.jsx`           | `useReadState()`      | localStorage read/unread per subscriber     |
| `DealStateContext.jsx`           | `useDealState()`      | localStorage deal-state machine             |
| `useAuth.jsx`                    | `useAuth()`           | JWT + subscriber object                     |

### Persisted UI state

| Key                            | Storage        | Owner                                  | Purpose                            |
|--------------------------------|----------------|----------------------------------------|------------------------------------|
| `nd_return_url`                | sessionStorage | LoginView                              | Post-login redirect target         |
| `nightdrop-theme`              | localStorage   | App.jsx                                | Light/dark theme toggle            |
| `nd:sidebar-collapsed:v1`      | localStorage   | vendor/deal-feed/sidebar.js            | Excel sidebar collapsed state      |
| `nd:rowheights:v1`             | localStorage   | vendor/deal-feed/row-resize.js         | Per-row height overrides           |
| `nd:sidebar-tweaks:v2`         | localStorage   | vendor/deal-feed/sidebar-tweaks.js     | Loaded only when sidebar tweaks are enabled (currently not imported) |
| read/unread per deal           | localStorage   | ReadStateContext                       | Per-subscriber read state          |
| deal lifecycle state           | localStorage   | DealStateContext                       | Per-subscriber state machine       |

### Form state pattern (BuyBoxWizard)
Single deep object held in `useState`. Mutations always immutable
(`setForm({...form, ...})`). `formRef` mirror for stable closures in debounced
preview effect. `wizardFormState.js` exports the canonical shape.

## Styling

### Design tokens — dual-theme (light/dark)
- `src/styles/tokens.css` — global tokens (shadcn-style light + dark palettes)
- `src/styles/v1-deal-tokens.css` — V1-scoped tokens (override light/dark at .deal-shell)
- Theme toggle via `localStorage['nightdrop-theme']` → `data-theme` on `document.documentElement`

### Per-surface CSS
- Plain CSS, no Tailwind
- Font stack: Manrope (global), DM Sans (inside wizard + deal-shell), Inter (accents)
- Wizard CSS scoped to `.buy-box-wizard` root class. Two files:
  `buy-box-wizard.css` (chrome) + `buy-box-wizard-pages.css` (page content)
- Deal Feed — vendor CSS + host overrides: `vendor/deal-feed/styles.css` + `vendor/deal-feed/light-theme.css` + `DealFeedExcelView.css`
- Deal Shell — component scoped + v1 tokens: `components/DealDetail/deal-shell.css` + `styles/v1-deal-tokens.css`
- Heavy global CSS: `styles.css` (~3900 lines) + `feed-layout.css` (~2550 lines)
- Feed card image: fixed 205×205 desktop, full-width 180px tall <=640px
- Logo rebrand (nightdrop → propcloud): theme-aware dual assets at `src/assets/propcloud-logo-*.png`

## Mock fallback
`src/data/mockData.js` is auto-used by `MapView` when the API returns zero deals.
Subscribers with truly empty feeds see fake data. Documented landmine in CLAUDE.md.
