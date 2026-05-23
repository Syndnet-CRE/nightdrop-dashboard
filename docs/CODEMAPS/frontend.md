<!-- Generated: 2026-05-22 | Files scanned: ~78 | Token estimate: ~1000 -->
# Frontend — nightdrop-dashboard

## Routes (src/App.jsx)
```
/login                          → LoginView (unauth)
/forgot-password                → ForgotPasswordView (unauth)
/reset-password                 → ResetPasswordView (unauth)
/invite/:token                  → InviteClaimView (unauth)
/buy-boxes/new                  → BuyBoxPage mode="new"  → BuyBoxWizard
/buy-boxes/:id/edit             → BuyBoxPage mode="edit" → BuyBoxWizard
/*  (catch-all auth)            → AppShell  → views switched by `view` state
                                              (no URLs for non-deal views;
                                               `/map` is the default landing path)
/deal/:id                       → DealDetailPage  (state.fromMap → DealDetailModal)
```

Post-auth flow:
- Bare `/`, `/login`, and successful login redirects → `/map` (initial `view = 'map'`)
- `InitialRouteGate` (mounted inside DealsProvider, fires once on load): if the
  subscriber has zero buy boxes, redirects from any landing path to `/buy-boxes/new`

## View map (state-driven inside AppShell)

| `view` value     | Nav label        | Component                       | Description                                  |
|------------------|------------------|---------------------------------|----------------------------------------------|
| `dashboard`      | **Deal Feed**    | views/DashboardView.jsx         | Center feed + sticky toolbar + RightRail     |
| `map`            | Map              | views/MapView.jsx               | Full-screen Mapbox + DealPanel sidebar (default landing) |
| `boxes`          | Buy Boxes        | views/BuyBoxesView.jsx          | Kanban (pending / active / paused / gap)     |
| `accounts`       | Account          | views/AccountsView.jsx          | Owner roll-up (subscriber-level)             |
| `settings`       | Settings         | views/SettingsView.jsx          | Profile + password                           |
| `invites`        | —                | views/InviteView.jsx            | Admin invite queue (brady@parcyl.ai)         |
| `admin`          | —                | views/AdminView.jsx             | Admin dashboard (brady@parcyl.ai)            |

Internal `view` id `'dashboard'` and URL `/dashboard` retained for back-compat;
only the user-facing nav label was renamed in Phase 1.

## Component hierarchy

### Top-level chrome
```
TopHeader (logo + countdown + pipeline track)
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

### Deal Feed (Phase 1 horizontal card layout)
```
views/DashboardView.jsx
  ├─ ref-attached scroll container (.feed-center-col)
  │    – sessionStorage scroll-position persistence (key: nightdrop-feed-scroll)
  │    – two-tier restore on /deal/:id back-nav (immediate + 120ms retry)
  ├─ feed/WeekDayTabs.jsx      (sticky top: 0 — Sun–Sat strip + MiniCalendar)
  ├─ feed/FeedToolbar.jsx      (sticky top: 56px — filter chips + sort dropdown)
  ├─ feed/FeedDealCard.jsx     (horizontal: 205×205 image left, content right)
  │    ├─ normalizeAssetClass (10-class map, lives inline)
  │    ├─ humanizeOwnerType   (Individual / LLC / Trust / Corporate)
  │    ├─ signalLabel/Color   (reads .tag from brief_json signal objects;
  │                            falls back .label/.description/.type;
  │                            skips pill if no string resolves)
  │    ├─ lib/anchorMetric.js  (per-class anchor: $/unit MF, $/SF industrial,
  │                            $/acre land, $/NRSF self-storage, etc.)
  │    └─ DealChatThread       (inline expansion on chat-icon click; unchanged)
  └─ ChatFab (floating)
```

Sort options (`FeedToolbar`): recency, score, distress (weighted signal count),
value (assessed_value). Selection persists via sessionStorage
(`nightdrop-feed-sort`).

Empty / loading / not-found states owned by `DashboardView`. Mobile collapse
(`<=640px`): card stacks image-on-top (180px tall full-width) via CSS only.

### Deal detail (rebuilt 2026-05-23)

Full-viewport takeover. When `/deal/:id` is hit standalone (not as the
map-modal overlay), AppShell skips `<TopHeader>` and `<LeftPanel>`
entirely and renders just `<DealDetailPage>` at the root. The page owns
edge-to-edge of the viewport. Only way out is the breadcrumb's "Back to
Deals" link or Escape. Modal-from-map case (location.state.fromMap from
MapView) keeps the existing in-place modal overlay behavior.

Document scrolls naturally (no internal overflow) so the sticky
breadcrumb tracks `window.scrollY` for its on-scroll address injection.

```
DealDetail.jsx (~105 lines — orchestrator only)
  ├─ DealDetail/BreadcrumbStrip      (top-of-page sticky: Back | Deal X of Y +
  │    │                              prev/next | Share | Add to List | Mark
  │    │                              as Hot | More menu)
  │    └─ DealDetail/MoreMenu        (3-dot dropdown: Not Relevant + Copy link)
  ├─ DealDetail/StageIndicator       (5-stage pipeline tracker)
  ├─ DealDetail/IdentityColumn       (left column — address, asset/year/SF/lot
  │                                   chips, satellite + parcel thumbs,
  │                                   Assessed Value / Last Sale Price / Date)
  ├─ DealDetail/WhyFlaggedCard       (center — title + ScoreScale top-right,
  │    │                              one-line thesis, signal bullets with
  │    │                              tier icons, "View AI Analysis →" anchor)
  │    └─ DealDetail/ScoreScale      (score number + 0-100 horizontal bar)
  ├─ DealDetail/PipelineStatusCard   (right — Current Stage / Date Added /
  │                                   Notes count; probability + next step +
  │                                   tags hidden until backend supplies them)
  ├─ DealDetail/NarrativeSection     (full AI prose with regex-bold
  │                                   $ / SF / year / geo tokens; paragraph-split
  │                                   on blank lines)
  ├─ DealDetail/RecommendedAction    (distinct callout w/ Lightbulb icon —
  │                                   primary-tinted bg + 4px left stripe)
  ├─ DealDetail/PropertyIntelligenceCard  ┐
  ├─ DealDetail/DistressSignalsCard       │  3-panel grid (left 2/3)
  ├─ DealDetail/OwnershipHistoryCard      ┘
  └─ DealDetail/OwnerPortfolioCard   (right 1/3 — wraps OwnerPortfolio +
       └─ OwnerPortfolio + OwnerPortfolioTable
          (D3 force graph + clickable address table — see below)

Shared:
  DealDetail/Expandable.jsx           (ExpandToggle button — "View Full X →"
                                       inline expander used by every data panel)
  hooks/useStickyCollapse.js          (rAF-throttled window.scrollY → bool;
                                       threshold 280 here, injects address +
                                       compact ScoreScale into breadcrumb)
  lib/boldNarrative.js                (regex-bold engine — extracted so it's
                                       reusable; produces React node tree)
```

Header actions live in the breadcrumb only:
- Share → clipboard + toast
- Add to List → toggles `deal.saved` via DealsContext.toggleSaved
  (PATCH /api/dealfeed/deals/:id/save), label flips Saved/Add
- Mark as Hot → dominant primary CTA, toggles `deal.feedback === 'hot'`
- More menu → Not Relevant (PATCH feedback) + Copy link

On scroll past 280px, breadcrumb gains a center cluster showing address +
compact score so the user always knows what they're looking at.

Pipeline stages map to backend status enum: Researching = due_diligence,
Closed = offer_made (label aliasing, zero backend changes).

Signal severity (frontend keyword match on tag + category):
- urgent: foreclos / tax / delinq / lien / auction / maturity / default
- pressure: absentee / investor / long_term / hold / arm / high_ltv / free_clear / deed
- flag: everything else

Every data panel hides entirely when it has no rows. Each card has a
hover state (background + border + light-theme shadow lift). Section
headers are neutral fg-1, not green. Timestamps render in Inter tnum
at fg-4 (neutral gray).

Notes section / contact-history / ContactLogModal / quick-actions / the
former 14-section property data grid are all DELETED — not hidden — per
Brady's 2026-05-23 spec. Financial-strip section explicitly skipped
because backend has no proforma data (ARV / profit / cash needed / all-in
cost / margin / break-even rent). Identity column surfaces only real
backend values: Assessed Value, Last Sale Price, Last Sale Date.

### Owner portfolio
```
OwnerPortfolio.jsx
  ├─ d3-force simulation (scaleSqrt → node radius 10-32 by assessed_value)
  ├─ getAssetClassColor (buyBoxTaxonomy.js, 10-class palette)
  ├─ Floating React tooltip (mouse-coord positioned)
  └─ OwnerPortfolioTable (Address | Class | Assessed | Bldg SF | Lot | Match)
```
Caps at 50 visible nodes; surplus surfaces a note + still appears in table.
Graph clicks + table-row clicks both route to `/map?focus=:dealId`; MapView
reads the search param on mount, flies to the parcel, and clears the param.
Rows without `deal_id` (not in user's feed) render disabled with a tooltip.

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
  └─ DealPanelCard.jsx (expandable preview)
```

## State management

### React context
| Context                          | Hook                  | Scope                                       |
|----------------------------------|-----------------------|---------------------------------------------|
| `DealsContext.jsx`               | `useDeals()`          | deals, buyBoxes, contacts, portfolios + CRUD|
| `ToastContext.jsx`               | `useToast()`          | toast queue                                 |
| `ReadStateContext.jsx`           | `useReadState()`      | localStorage read/unread per subscriber     |
| `DealStateContext.jsx`           | `useDealState()`      | localStorage deal-state machine             |
| `useAuth.jsx`                    | `useAuth()`           | JWT + subscriber object                     |

### Persisted UI state (sessionStorage)
| Key                          | Owner            | Purpose                            |
|------------------------------|------------------|------------------------------------|
| `nightdrop-feed-scroll`      | DashboardView    | Restore feed scrollTop on back-nav |
| `nightdrop-feed-sort`        | DashboardView    | Persist sort selection across loads|

### Form state pattern (BuyBoxWizard)
Single deep object held in `useState`. Mutations always immutable
(`setForm({...form, ...})`). `formRef` mirror for stable closures in debounced
preview effect. `wizardFormState.js` exports the canonical shape.

## Styling
- Plain CSS, no Tailwind. Tokens in `src/styles/tokens.css`.
- Font tokens: `--font-ui` (Manrope global, DM Sans inside `.buy-box-wizard`),
  `--font-secondary` (Inter inside wizard), `--font-mono` (legacy, unused in wizard).
- Wizard CSS scoped to `.buy-box-wizard` root class. Two files:
  `buy-box-wizard.css` (chrome) + `buy-box-wizard-pages.css` (page content).
- Heavy global CSS in `styles.css` (~3900 lines) and `feed-layout.css` (~2550).
- Feed card image: fixed 205×205 desktop, full-width 180px tall <=640px.

## Mock fallback
`src/data/mockData.js` is auto-used by `DashboardView` and `MapView` when the
API returns zero deals. Subscribers with truly empty feeds see fake data.
Documented landmine in CLAUDE.md.
