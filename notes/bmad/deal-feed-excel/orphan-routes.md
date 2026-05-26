# Orphan Backend Routes — Deal Feed Excel Cutover

**Inherits from:** `requirements.md`

After the Deal Feed Excel cutover lands and the old card-based feed
components are deleted (Phase 3), these backend endpoints have zero
remaining consumers in the frontend.

**Action:** flag these for a **separate cleanup ticket**, not in this
work. Backend cleanup is its own PR against `~/nightdrop-api`.

---

## Confirmed orphan after cutover

### `GET /api/dealfeed/agent/messages`

- **Defined in:** `~/nightdrop-api/routes/dealfeed/agent.js:12`
- **Consumed today by:**
  - `src/components/feed/ChatFab.jsx:28` (deleted in Phase 3)
  - `src/components/feed/DealChatThread.jsx:24` (deleted in Phase 3)
- **Consumed after cutover:** none
- **Cleanup action:** drop the route handler + any SQL it depends on.

### `POST /api/dealfeed/agent/message` — **NOT orphan**

- **Consumed today by:** ChatFab, DealChatThread, MessageInputBar
  (all deleted) AND `DealActivityRail.jsx:94` (preserved in V1 deal
  detail).
- **Consumed after cutover:** `DealActivityRail.jsx` only.
- **Cleanup action:** none. Keep the route.

---

## Pending verification (likely orphan)

### `GET /api/dealfeed/deals/dashboard/kpis`

- **Defined in:** `~/nightdrop-api/routes/dealfeed/deals.js` (after the
  list endpoint).
- **Consumed today by:** `src/components/feed/TonightsRunCard.jsx`
  takes a `kpis` prop. Need to trace where that prop is populated.
- **Verification step:** before deletion commit (Phase 3), grep:
  ```bash
  grep -rEn "dashboard/kpis|TonightsRunCard.*kpis" src/
  ```
  Confirm `kpis` is sourced exclusively from `TonightsRunCard`'s
  prop flow OR a fetch in `DashboardView`. If yes, route is orphan.
- **Cleanup action:** TBD pending verification.

---

## Endpoints preserved (still in use after cutover)

### `GET /api/dealfeed/deals`
- The bundle's primary data source.

### `POST /api/dealfeed/deals/:id/feedback`
- Bundle right-click → Mark Hot.

### `PATCH /api/dealfeed/deals/:id/notes`
- Bundle notes cell edit.

### `PATCH /api/dealfeed/deals/:id/save`
- Bundle right-click → Mark Saved.

### `PATCH /api/dealfeed/deals/:id/status`
- Bundle right-click → Delete (mapped to `deal_state='archived'`).

### `PATCH /api/dealfeed/deals/:id/read`
- Bundle row-select handler calls `markRead`, which PATCHes this
  endpoint on first read.

### `PATCH /api/dealfeed/deals/:id/stage` — **NEW Phase 1**
- Bundle stage dropdown + bulk stage action.

### `GET /api/dealfeed/buy-boxes`
- For `BuyBox.color` + `BuyBox.depth` in the bundle.

### `POST /api/dealfeed/agent/message`
- See above.

---

## Backend cleanup ticket — recommended content

Title: `cleanup: drop GET /api/dealfeed/agent/messages after deal-feed-excel cutover`

Body:
- Confirm the cutover has been live in production for >= 7 days.
- Confirm no client (mobile, partner, internal tools) still calls
  the GET endpoint via API logs.
- Delete the route handler.
- Delete any SQL helper functions called only by that handler.
- Run backend tests.
- Deploy to Render.

---

## Why this is separate from cutover

Brady's locked decision: "Any backend endpoints that existed solely
to feed those deleted components get flagged for a separate cleanup
ticket, not removed in this work."

Two reasons to defer:
1. **Decoupling**: cleanup is reversible cheaply; if a partner or
   mobile client unexpectedly calls the GET, we restore quickly.
2. **Soak**: 7-day production soak buys confidence before deleting
   server-side handlers.
