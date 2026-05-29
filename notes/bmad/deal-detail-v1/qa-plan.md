# QA Plan — Deal Detail V1

## Test scenarios

### Happy path
1. **Full-screen deal load**
   - Navigate to `/deal/<real-deal-id>` from `/dashboard`
   - Expect: V1 topbar visible (brand + back + counter + address + stage + actions), Hero with mapbox satellite at deal coords, AI Narrative card, Property Intelligence card with Physical tab active, Chain of Title (or empty state), Owner Portfolio Graph (or empty state), Calculator collapsed showing Buy & Hold default, ActivityRail on right with Buy Box Match + activity feed + composer + Deal Actions
   - No console errors, no `"null"` strings leaking into UI, no layout overflow

### Theme
2. **Dark → light → dark toggle**
   - Click sun/moon icon in topbar
   - Expect: instant theme swap, no transition jank, no "stuck" colors on cards/buttons (MutationObserver flush working)
   - localStorage['nightdrop-theme'] reflects new value
   - Navigating to `/dashboard` and back to `/deal/:id` preserves theme

### Modal mode
3. **Open deal from MapView**
   - On `/map`, click a deal pin → DealPanel → "View deal"
   - Expect: overlay opens with V1 design but topbar suppressed (`.deal-shell--embedded` class). All other sections render normally.
   - Escape key closes the overlay back to `/map`
   - Click outside overlay → also closes (existing behavior)

### Sparse data
4. **Deal with minimal brief_json**
   - Navigate to a deal that has only address + score + minimal signals
   - Expect: Hero renders fully (address, score, signals). KPI strip shows Est Value + $/SF (or `—` if missing). AI Narrative shows brief_json.narrative or "Narrative not yet available". Intel tabs: Physical shows whatever rows exist, all other tabs show "Awaiting enrichment data" empty state. Timeline shows "Title history coming soon" empty state. Owner Portfolio Graph empty state or loaded if attom_id resolves.
   - Zero crashes, zero `"null"` strings rendered.

### Activity composer
5. **Save a note**
   - Click "Note" chip in composer
   - Type "Test note from QA"
   - Click "Save"
   - Expect: optimistic insertion at top of activity feed with type=Note, author=current subscriber initials, time=now
   - Network tab: `POST /api/dealfeed/deals/:id/notes` returns 200
6. **Log a call**
   - Click "Call" chip
   - Type "Spoke with broker"
   - Click "Save"
   - Expect: optimistic insertion as type=Call in feed
   - Network tab: `POST /api/dealfeed/deals/:id/contacts` with `{ channel: 'phone', outcome: 'follow_up', notes: 'Spoke with broker' }` returns 200

### Buy Box Match
7. **Match verdict round-trip**
   - Click "Matches" (green) → expect `postFeedback('hot')` network call, button stays green with selected state
   - Click "Doesn't Match" (red) → expect `postFeedback('not_relevant')` network call, red selected state
   - Click "Need More Info" (orange) → expect **NO** network call, orange selected state (UI-only)
   - Refresh page → "Matches" or "Doesn't Match" persists; "Need More Info" reverts to unchosen (because it's local-only)

### Calculator math (TDD)
8. **Buy & Hold known answers**
   - Inputs: purchase=$1M, rehab=$0, NOI=$80K, NOI growth=3%, hold=5yr, exit cap=7%, LTV=70%, rate=6.5%, amort=30yr
   - Expect: going-in cap 8.00%, DSCR ≈ 1.76×, levered IRR ≈ 15-20% (validate against a spreadsheet calc)
9. **Edge cases**
   - Zero NOI → no NaN, no divide-by-zero, render `—` for IRR/CoC
   - 100% LTV → equity=0, CoC renders gracefully (treat as `∞%` or `—`)
   - Divergent IRR (negative all-CF) → solver returns sentinel value, UI renders `—`

### Owner Portfolio Graph
10. **Graph interaction**
    - Pan: click-drag empty canvas space — view offsets
    - Zoom: scroll wheel anchored at cursor — scales 0.25x to 4x
    - Drag node: click-drag a property node — node moves and pins; physics leaves it where dropped
    - Click node (no drag): selects node, sidebar panel shows property details
    - Double-click empty space: resets view to default
    - "Reset view" pill appears when view ≠ default, dismisses on click
    - Switch theme: graph colors re-resolve correctly (greens stay green, etc.)

### Keyboard nav
11. **J/K/←/→ between deals (full-screen only)**
    - When `deals.length > 1` and on `/deal/<id>`, press J or → → navigates to next deal
    - K or ← → navigates to previous deal
    - In modal mode (`embedded=true`), these keys are inert (preserve map back-navigation)
    - Input/textarea focus suppresses the listener

### Empty state for no portfolio
12. **Deal with no attom_id**
    - Navigate to a deal whose attom_id is null
    - Expect: Owner Portfolio Graph section shows "No portfolio data available" empty state instead of attempting fetch

## Performance budgets

- First contentful paint: < 1.5s on dev server
- Time to interactive: < 3s with full data
- Bundle size delta from this work: < 100kb gzipped (mapbox already loaded)

## Accessibility

- Tab order: topbar → main content sections → right rail composer
- All icon-only buttons have aria-label
- :focus-visible 2px green outline on every interactive element
- Color contrast ≥ 4.5:1 body text in both themes
- Activity feed entries: type indicated by icon + color + text label (not color alone)

## Regression coverage

- `/dashboard` still renders unchanged
- `/map` still renders unchanged
- `/buy-boxes/new` still renders unchanged
- `useDeals()` hook signature unchanged
- TopHeader, FeedDealCard, DealMap, DealPanelCard unaffected (the preserved siblings still work)
