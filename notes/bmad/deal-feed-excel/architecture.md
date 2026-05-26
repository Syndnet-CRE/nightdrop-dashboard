# Architecture — Deal Feed Excel Cutover

**Inherits scope from:** `requirements.md`, `PRD.md`

---

## Topology

```
BrowserRouter
└─ AuthProvider
   └─ ToastProvider
      └─ Routes → AppShell
         └─ ReadStateProvider
            └─ DealStateProvider
               └─ DealsProvider                    ← data source
                  └─ TopHeader (unchanged)
                     LeftPanel (unchanged)
                     Routes →
                        /dashboard  → DealFeedExcelView (NEW — lazy)
                        /map         → MapView (unchanged)
                        /buy-boxes/* → BuyBoxPage (unchanged)
                        /deal/:id    → DealDetailPage (V1, unchanged this sprint)
                        ...
```

`DealFeedExcelView` is the only new route component. Everything else
keeps its current shape.

---

## DealFeedExcelView module map

```
src/views/DealFeedExcelView.jsx
src/vendor/deal-feed/
├── adapter.js          ← pure shape converters (host ⇆ ND)
├── sync.js             ← publishing effect (host → ND.deals)
├── actions.js          ← installs ND.actions.* adapters (host actions ← ND mutations)
├── data.js             ← (vendor — keeps ND.stages, but ND.deals comes from sync)
├── tabs.js             ← (vendor — day-tab strip, owns ND.state.activeDay)
├── selection.js        ← (vendor — selection engine)
├── context-menu.js     ← (vendor — patched to call ND.actions.*)
├── row-resize.js       ← (vendor — patched: .row-resize → .nd-row-resize)
├── filter-popover.js   ← (vendor — patched: .filter-pop → .nd-filter-pop)
├── sidebar.js          ← (vendor — keeps Cmd+\ shortcut, sidebar hidden via wrapper choice)
├── feed.js             ← (vendor — patched to call ND.actions.* instead of mutating ND.deals)
├── styles.css          ← (vendor — scope-prefixed under .nd-excel-shell)
└── light-theme.css     ← (vendor — scope-prefixed under .nd-excel-shell .sheet-light)
```

`sidebar-tweaks.js` is deleted from the load list (per requirements);
file may stay in `src/vendor/deal-feed/` as dead code or be removed
entirely in Phase 3.

`adapter.js`, `sync.js`, `actions.js` are NEW host-authored files.
They are the integration contract.

---

## Integration pattern — the sync contract

### Source of truth

`useDeals().deals` is the only source of truth for deal state. The
bundle never owns deal state. `window.ND.deals` is a read-only mirror
maintained by the publishing effect.

### One-way flow: host → bundle (publishing)

A single `useEffect` in `DealFeedExcelView`:

```
useEffect(() => {
  if (!window.ND._rr) return;       // bundle not loaded yet
  window.ND.deals    = deals.map(d => toNDDeal(d, { isRead, today }));
  window.ND.boxes    = buyBoxes.map(toNDBox);
  window.ND.calendar = buildCalendar(deals, today);
  requestRr();                       // rAF-debounced ND._rr()
}, [deals, buyBoxes, isRead, today, ND._rr]);
```

`requestRr` queues a single `_rr()` per animation frame even if
called repeatedly within the frame. Implementation in `sync.js`.

### One-way flow: bundle → host (actions)

A second `useEffect` installs adapter functions on `window.ND.actions`:

```
ND.actions = {
  toggleHot(id, currentFeedback): postFeedback(id, currentFeedback === 'hot' ? null : 'hot'),
  toggleSave(id):                  toggleSave(id),
  saveNote(id, text):              saveNote(id, text),
  setStage(id, stage):             patchStage(id, stage),     // NEW Phase 1 endpoint
  setStatus(id, status):           updateStatus(id, status),
  markRead(id):                    markRead(id),
  deleteDeal(id):                  deleteDeal(id),
  openDetail(id):                  navigate(`/deal/${id}`),
}
```

These are wired during the wrapper's mount effect, restored to
no-ops during unmount. All actions are thin re-exports from
`useDeals()` / `useReadState()` / `useNavigate()`.

### Bundle source edits (surgical, in-place)

The vendor JS files have direct mutations of `ND.deals[i].field`
that need to be rewritten to call `ND.actions.*`. Edit sites
identified during audit:

- `feed.js:486–490` row quick-actions (up/dn/sv/hot)
- `feed.js:622` stage dropdown commit
- `feed.js:627` stage dropdown change
- `feed.js:632` notes input blur
- `feed.js:642–644` keyboard shortcut quick-actions
- `feed.js:713` bulk stage action
- `feed.js:770–774` row-level shortcut keys
- `context-menu.js:323–325` mark-hot/saved/read menu items
- `context-menu.js:342–344` delete menu item

Each rewrite: replace `d.field = newValue; rr();` with
`ND.actions.actionName(d.id, ...args);` — the publishing effect
re-runs when host state changes, repainting the bundle.

### Read-state binding

Edit `selection.js` setCell / setRow functions to call
`ND.actions.markRead?.(dealAtRow(r)?.id)` after each selection
change, idempotent (already-read deals are no-ops in
`ReadStateContext`).

### Detail-open binding

Edit `feed.js` double-click handler to call
`ND.actions.openDetail(d.id)` instead of opening internally.
Bundle already dispatches a custom event; just route to host
navigation.

---

## Style isolation

All vendor CSS scope-prefixed under `.nd-excel-shell`:

```
:root { ... }              → .nd-excel-shell { ... }
.feed .toolbar { ... }     → .nd-excel-shell .feed .toolbar { ... }
.sheet-light tr.dr { ... } → .nd-excel-shell .sheet-light tr.dr { ... }
.row-resize { ... }        → renamed to .nd-row-resize (used outside .sheet-light)
.filter-pop { ... }        → renamed to .nd-filter-pop (popover may portal out)
```

Bundle's `:root { --accent: #2da200; ... }` becomes
`.nd-excel-shell { --accent: #2da200; ... }`. Host tokens are
unaffected outside the shell.

Bundle's `.sheet-light` keeps its light-grid colors **inside** the
shell only. Outside, host theme tokens dominate.

---

## Font scope

Inside `.nd-excel-shell`:

```
--font-sans: 'DM Sans', system-ui, sans-serif
--font-mono: 'DM Mono', ui-monospace, monospace      /* JetBrains Mono dropped */
```

Outside, host's `Manrope` (UI) + `Inter` (numerics) applies.

Google Fonts `<link>` in `index.html` is augmented to load DM Sans +
DM Mono (already loads in host for the wizard's `--font-secondary`
chain; verify before adding).

---

## Icon strategy

```
npm install lucide@<pinned>
```

In `DealFeedExcelView`:

```
import * as lucide from 'lucide';

useEffect(() => {
  if (loaded) lucide.createIcons();  // call after each rr() inside the shell
}, [loaded, deals]);
```

Bundle's `feed.js` `renderIcons(root)` function (lines 30–60) is
kept; only the global `lucide` reference must resolve to the npm
import, not a CDN UMD attached to `window.lucide`. Implementation
detail: assign `window.lucide = lucide` in the wrapper mount effect
so the bundle's `lucide.createIcons()` calls succeed.

---

## Lazy loading

`App.jsx`:

```
const DealFeedExcelView = React.lazy(() => import('./views/DealFeedExcelView'));

<Suspense fallback={<DashboardSkeleton />}>
  <DealFeedExcelView />
</Suspense>
```

This puts ~80–100 KB (bundle JS + scoped CSS + Lucide vanilla) into
a chunk that only ships when the user lands on `/dashboard`. Other
routes don't pay.

---

## Data shape adapter

`adapter.js` exports pure functions:

```
toNDDeal(hostDeal, ctx) → bundle Deal
  - id:       hostDeal.id (UUID string; bundle types as number but works fine)
  - bx:       hostDeal.buy_box_id or hostDeal.box
  - score:    hostDeal.score ?? (hostDeal.match_score * 10) ?? 0
  - addr:     hostDeal.address ?? hostDeal.addr
  - city:     `${hostDeal.property_city}, ${hostDeal.property_state} ${hostDeal.property_zip}`
  - brief:    hostDeal.brief_json?.bullets?.[0]?.body
              ?? hostDeal.signals?.[0]?.description ?? ''
  - date:     fmtDate(hostDeal.sent_at ?? hostDeal.created_at, 'weekday')
  - deliveredOn: isoDate(hostDeal.sent_at)
  - asset:    ASSET_CLASS_LABEL[normalizeAssetClass(hostDeal.asset ?? hostDeal.asset_class)]
  - psf:      hostDeal.value && hostDeal.building_sf ? Math.round(hostDeal.value / hostDeal.building_sf) : null
  - sf:       hostDeal.building_sf
  - owner:    humanizeOwnerType(hostDeal.owner_type)
  - hold:     yearsSince(hostDeal.last_sale_date) → '8 yr'
  - sig:      hostDeal.signals?.[0]?.tag ?? hostDeal.signals?.[0]?.label ?? ''
  - sc:       categoryToPillClass(hostDeal.signals?.[0]?.category) → 'pill-r' | 'pill-a' | 'pill-g'
  - stage:    hostDeal.stage ?? 'New'                  (NEW Phase 1 field)
  - notes:    hostDeal.notes ?? ''
  - unread:   !ctx.isRead(hostDeal.id)
  - saved:    !!hostDeal.saved
  - hot:      hostDeal.feedback === 'hot'
  - up:       hostDeal.feedback === 'hot'              (collapse onto hot; see data-gaps)
  - la:       computeLA(hostDeal.updated_at)           (derived; see data-gaps)
  - ext:      { parcel, county, zoning, yearBuilt, lotSF, assessed, lastSale, lastPrice,
                landVal: '—', bldgVal: '—', deed: '—', mortAmt: '—', mortLender: '—', mortDate: '—' }
  - bullets:  hostDeal.brief_json?.bullets ?? []
  - narr:     hostDeal.brief_json?.summary ?? hostDeal.brief_json?.narrative ?? ''
```

```
toNDBox(hostBuyBox) → bundle BuyBox
  - id:    hostBuyBox.id (UUID)
  - name:  hostBuyBox.name (already normalized from b.label)
  - asset: hostBuyBox.asset_classes.join(' / ')
  - color: hostBuyBox.color ?? hashIdToColor(hostBuyBox.id)
  - depth: hostBuyBox.deals ?? hostBuyBox.deals_sent_total ?? 0
  - mr:    0                                            (no host source; see data-gaps)
```

```
buildCalendar(deals, today) → bundle Calendar
  - 6-month window: today − 5mo → today + 1mo
  - Buckets deal sent_at into ISO date keys
  - Each Day: { key, count, isFuture, isToday }
```

All shape conversions are pure functions, unit-tested in
`adapter.test.js`.

---

## Mutation flow examples

### User toggles "hot" via right-click menu

1. User right-clicks row → bundle's `context-menu.js` opens menu.
2. User picks `Mark Hot`. Menu fires `ND.actions.toggleHot(d.id, d.feedback)`.
3. Adapter calls `useDeals().postFeedback(d.id, 'hot')`.
4. `DealsContext.postFeedback`:
   - Optimistic: `setDeals(prev → map updating feedback)`.
   - API: `POST /api/dealfeed/deals/:id/feedback { feedback: 'hot' }`.
5. React state update triggers the publishing effect.
6. Publishing effect: `ND.deals = updated_deals.map(toNDDeal)`, then `_rr()`.
7. Bundle repaints. Row shows hot indicator. `LeftPanel` hot count
   updates (also consumes `useDeals()`).

### User types in notes cell

1. User dbl-clicks notes cell → bundle puts cell into edit mode.
2. User types, blurs. Bundle's `feed.js:632` handler fires.
3. **Patched to call** `ND.actions.saveNote(d.id, text)`.
4. Adapter calls `useDeals().saveNote(d.id, text)`.
5. `DealsContext.saveNote`:
   - Optimistic: `setDeals(prev → map updating notes)`.
   - API: `PATCH /api/dealfeed/deals/:id/notes`.
6. Publishing effect re-fires; bundle repaints.

### User selects a row

1. User single-clicks any cell in the row.
2. Bundle's `selection.js:setCell(r, c)` runs.
3. **Patched** to also call `ND.actions.markRead(dealAtRow(r).id)`.
4. `ReadStateContext.markRead` writes localStorage, updates `readIds`.
5. Publishing effect's deps include `isRead` (computed from `readIds`) →
   re-fires → bundle repaints with `unread: false`.

### User deletes a row via context menu

1. User right-clicks row → picks `Delete`.
2. Bundle's `context-menu.js:342` was `ND.deals = ND.deals.filter(...)`
   — **patched** to call `ND.actions.deleteDeal(d.id)`.
3. Adapter calls a new `useDeals().deleteDeal(id)` action that
   PATCHes a soft-delete flag on the backend (or DELETEs, TBD per
   backend support — likely soft-delete via a hidden flag, since
   the backend has no hard-delete endpoint today).
4. On success, host state drops the row; publishing effect re-fires;
   bundle no longer shows it.

---

## File system layout after Phase 2

```
src/
├── views/
│   ├── DealFeedExcelView.jsx        ← NEW
│   ├── ...all other views unchanged
├── vendor/
│   └── deal-feed/                   ← NEW; moved from vendor/deal-feed/handoff/
│       ├── adapter.js               ← NEW
│       ├── sync.js                  ← NEW
│       ├── actions.js               ← NEW
│       ├── adapter.test.js          ← NEW
│       ├── sync.test.js             ← NEW
│       ├── actions.test.js          ← NEW
│       ├── data.js                  ← from bundle (lightly edited)
│       ├── tabs.js                  ← from bundle
│       ├── selection.js             ← from bundle (patched: markRead)
│       ├── context-menu.js          ← from bundle (patched: ND.actions.*)
│       ├── row-resize.js            ← from bundle (.nd-row-resize)
│       ├── filter-popover.js       ← from bundle (.nd-filter-pop)
│       ├── sidebar.js               ← from bundle (sidebar rendered hidden)
│       ├── feed.js                  ← from bundle (patched extensively)
│       ├── styles.css               ← from bundle (scope-prefixed)
│       └── light-theme.css          ← from bundle (scope-prefixed)
├── styles/
│   └── (unchanged; tokens.css, styles.css, feed-layout.css preserved)
├── components/
│   └── feed/                        ← DELETED in Phase 3
├── views/
│   └── DashboardView.jsx            ← DELETED in Phase 3
└── components/
    └── RightRail.jsx                ← DELETED in Phase 3
```

`vendor/deal-feed/handoff/` at repo root is deleted after the move.

---

## Out of scope for the architecture

- Server-side filtering / pagination support.
- Multi-tab live sync via BroadcastChannel.
- Optimistic conflict resolution if PATCH fails.
- Saved view persistence.
- Column reorder.

---

## Open architectural questions

- **`useDeals().deleteDeal`** does not exist today. The current
  `DealsContext` only exposes `deleteBuyBox`. For the bundle's
  Delete menu, we either (a) add a new `deleteDeal` action +
  backend endpoint (separate work), (b) collapse Delete onto an
  existing soft-delete by setting `deal_state: 'archived'` via
  `updateStatus`, or (c) drop Delete from the context menu UI.
  **Recommend (b)** for v1: map Delete → `updateStatus(id, 'archived')`.
  Surfaced as a question in `requirements.md`.
