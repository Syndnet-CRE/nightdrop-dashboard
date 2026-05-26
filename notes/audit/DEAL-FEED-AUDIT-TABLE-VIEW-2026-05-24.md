# Deal Feed Audit — Table View Build Prep

**Date:** 2026-05-24
**Repo:** nightdrop-dashboard
**Scope:** Full audit of current Deal Feed surface before scoping a major new build (table view variant)
**Mode:** Findings only — no code, no implementation steps, no recommendations
**Run by:** code-explorer agent dispatched from main session

---

## Caveats

1. The agent slipped into recommendation language in a few spots despite the "no solutions" rule — specifically the "Should be added" / "Recommendation:" lines in DEPENDENCY ASSESSMENT, and the "Quality gates before merge" / "If design spec exists..." prose in BUILD COMPLEXITY. Treat those as observations, not endorsements.
2. Line counts cited are from the agent's reading. CLAUDE.md previously documented `App.jsx` as 400+ and `styles.css` as ~3,900 — the agent reports 303 and 4,007 respectively, so the codebase has drifted since CLAUDE.md was written. Numbers below are the agent's current readings, not CLAUDE.md's.

---

## CURRENT STATE

The Deal Feed is a vertical-scrolling card list ("Dashboard" mode). Architecture:

1. **DashboardView** (235 lines) orchestrates layout — fetches via `useDeals()`, client-side filters (All/Unread/Saved/Hot), sorts (Recency/Score/Distress/Value), renders three-column layout (feed center + RightRail mini-map + activity). Scroll position persisted to sessionStorage, restored on back-nav.
2. **FeedDealCard** (320 lines) — horizontal card with address, asset class, score badge, owner type, 3 distress signal pills (red/amber/green), optional headline, action buttons (hot/cold/chat/save). Mapbox satellite thumb loads on intersection. Auto-marks read after 2s in viewport via IntersectionObserver.
3. **Supporting**: FeedToolbar (filter chips + sort dropdown), WeekDayTabs (7-day scroll header + mini-calendar, with day-seen localStorage), ChatFab/DealChatThread (inline LLM agent chat), TonightsRunCard.
4. **Data layer**: DealsContext fetches `GET /api/dealfeed/deals` + `GET /api/dealfeed/buy-boxes` in parallel on mount. Provides deals[], buyBoxes[], loading flag, mutations (postFeedback, saveNote, updateStatus, logContact, patchBuyBox). Response includes brief_json (headline + signal_tags), signals[], feedback, saved, is_read, score/match_score.
5. **Styling**: feed-layout.css (2,602 lines) + styles.css (4,007 lines).

**No view toggle, no table scaffold, no grid variant exists.** Card list is hard-coded.

---

## FILES THAT WILL BE TOUCHED

**Core (modify):**
- `src/views/DashboardView.jsx` (235 lines)
- `src/components/feed/FeedDealCard.jsx` (320 lines)
- `src/styles/feed-layout.css` (2,602 lines)
- `src/styles/styles.css` (4,007 lines)

**New siblings (likely 2–5 files):**
- A card-only extraction
- A table view component
- Possibly a sortable header component, a column config module, table-specific CSS

**Adjacent (used but not modified):**
- `src/components/RightRail.jsx` (131 lines)
- `src/components/LeftPanel.jsx` (206 lines)
- `src/contexts/DealsContext.jsx` (167 lines)
- `src/lib/format.js`, `src/lib/anchorMetric.js`

---

## FILES THAT MUST NOT BE TOUCHED

- `src/contexts/DealsContext.jsx` — central data fetch + mutations; breaking it cascades to Dashboard, Map, BuyBoxes.
- `src/lib/api.js` — low-level request abstraction.
- `src/App.jsx` (303 lines) — provider hierarchy, route setup, modal state.
- `src/components/LeftPanel.jsx` (206 lines) — left nav, used by all views.
- `src/hooks/useAuth.jsx`
- `src/views/MapView.jsx` — separate view, no coupling to feed.
- `src/views/BuyBoxesView.jsx` — kanban, separate.
- `src/components/DealDetail.jsx` (677 lines) — separate page.

---

## LANDMINES AND DEBT

1. **Signal pills [object Object] bug — FIXED in `9f66f42`.** FeedDealCard.signalColor() resolves `sig.tag || sig.label || sig.description || sig.type || sig.category`. DealPanelCard signal map resolves string label first. No action needed.
2. **Orphaned files — DELETED.** BuyBoxConfigurator/, BuyBoxEditModal.jsx, wizardHelpers.js + .test.js confirmed gone from working tree.
3. **MOCK_DEALS fallback — isolated to MapView only.** DashboardView renders empty state on zero deals (does NOT fall back to mocks per agent reading). The MapView fallback is separate scope. **Note: this contradicts CLAUDE.md, which says DashboardView falls back to mocks — agent reports current code does not. Worth verifying.**
4. **CSS files large but no hard splits required.** feed-layout.css (2,602) and styles.css (4,007) are bloated but well-organized; table styles can coexist without refactor.
5. **DashboardView scroll-restore is two-tier (sync + 120ms retry).** Tuned for image-load layout shifts. Variable table row heights may need re-tuning. (QA test point.)
6. **RightRail assumes horizontal feed layout.** Table view needs an explicit handling decision (hide / relocate / redesign).
7. **Filter + sort logic inline in DashboardView (lines 68–102).** Table view will need same filters + ascending/descending direction. FeedToolbar UI is chip-based; table headers could replace/augment.
8. **WeekDayTabs (160 lines) tied to horizontal card layout** via selectedDay state. Filter logic is reusable; UI is not.
9. **No column visibility/ordering design exists** — open scope.
10. **FeedDealCard Mapbox satellite thumb** (320×320 per deal) not suitable for table rows. Design decision needed (small thumb vs omit).

**Observations (no action):**
- FeedDealCard at 320 lines is splittable into SignalPill / OwnerTypePill / DealActions sub-components, which would make a card-view extraction cleaner.

---

## DEPENDENCY ASSESSMENT

**Installed and relevant:**
- React 19.2.5, react-dom 19.2.5, react-router-dom 7.14.2
- lucide-react 1.14.0 (icons available for sort arrows, headers)
- d3 7.9.0 (OwnerPortfolio only — not needed for table)
- mapbox-gl 3.23.0 + react-map-gl 8.1.1 (DealMap/RightRail only — not needed for table)
- react-markdown 10.1.0 (deal detail only — not needed for table)

**NOT installed:**
- `@tanstack/react-table` — missing
- `@tanstack/react-virtual` — missing
- No other table/virtualization libraries present (no react-table, react-window, react-virtualized, ag-grid, mantine table)

**Bundle context:** Map + d3 already paid for, but they're conditional renders not loaded on feed view.

---

## BUILD COMPLEXITY ASSESSMENT

**Multi-sprint.** Agent estimates 3–5 days focused dev assuming clear design spec.

**File count:** 12–18 files touched/created (≈12 existing feed files + 3–6 new table files + CSS).

**Files exceeding 400 lines:**
- `feed-layout.css` (2,602) — soft, CSS only, no hard split needed
- `styles.css` (4,007) — soft, CSS only, no hard split needed
- `FeedDealCard.jsx` (320) — under 400 but flagged as a candidate to decompose before table work (extract SignalPill, OwnerTypePill, DealActions)
- `DealDetail.jsx` (677) — out of scope but worth knowing

**Architectural decisions that block implementation start (per agent):**
1. View toggle location (TopHeader / FeedToolbar / new component)
2. RightRail handling (hide / relocate / redesign)
3. MVP column set (which of ~23 deal fields)
4. Column-order persistence (localStorage key or hardcoded)
5. Row height behavior (truncate / wrap / expand)
6. Pagination vs. infinite scroll vs. row virtualization

---

## Gaps in the agent's report (to fill before PRD)

The original audit prompt asked for 12 coverage areas. The agent fully delivered on most, but three were partial:

- **Item 5 — sessionStorage / localStorage full inventory.** Agent mentioned a few keys in passing (scroll position, day-seen, possibly auth return URL) but did not deliver the complete key/value inventory.
- **Item 6 — API endpoints with exact URLs, payloads, response shapes.** Agent named two GETs (`/api/dealfeed/deals`, `/api/dealfeed/buy-boxes`) but didn't enumerate methods/payloads/shapes exhaustively.
- **Item 8 — df_deals_sent shape source.** Agent listed fields consumed but didn't explicitly state whether a schema/types file exists or if the shape is purely implicit from usage.

These gaps do not change the build complexity read but should be closed before writing a PRD.

---

## Pointers

- Backend reference: `~/nightdrop-api`, branch `main`, Render service `nightdrop-api` at `https://nightdrop-api.onrender.com`
- Backend endpoint list: `notes/REFERENCE.md`
- Related historical audit (different scope, still load-bearing for buy-box work): `notes/audit/CROSS-REPO-AUDIT-BUY-BOX-MVP-2026-05-20.md`
- Project CLAUDE.md: repo root
