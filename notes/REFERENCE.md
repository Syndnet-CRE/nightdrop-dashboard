# Nightdrop Dashboard — Reference

Load this when you need component locations or the full endpoint list. Not loaded at session start.

Last updated: 2026-05-20 (taxonomy + endpoint sweep after backend MVP rebuild)

## Key Components

| File | Role |
|------|------|
| `src/components/TopHeader.jsx` | Top nav bar — logo, view links, theme toggle, avatar dropdown |
| `src/components/LeftPanel.jsx` | Left sidebar — nav links, TonightsRunCard |
| `src/components/DealDetail.jsx` | Full-page deal detail (12 tabs). Styled by `deal-detail.css` |
| `src/components/DealMap.jsx` | Reusable Mapbox map. `fitDeals()` fires after `onLoad` and on data change |
| `src/components/DealPanel.jsx` | Collapsible sidebar in MapView. Filter state, sort, CSV export |
| `src/components/DealPanelCard.jsx` | Deal card in DealPanel. Expandable preview, calls `onOpenDeal` |
| `src/components/DealComponents.jsx` | Shared atoms: `ScoreBubble`, `MapPinSVG`, `DealCard` |
| `src/components/Icons.jsx` | Central icon lib — exports `I` object. Always import from here |
| `src/components/BuyBoxWizard.jsx` | Buy box create/edit wizard shell. 7 steps: Page1–7 + RightRail |
| `src/components/BuyBoxPage1.jsx` | Wizard step 1 — Target (asset class + sub-asset chips + geography) |
| `src/components/BuyBoxPage23.jsx` | Wizard steps 2 + 3 (exports `BuyBoxPage2` profile, `BuyBoxPage3` owner) |
| `src/components/BuyBoxPage4.jsx` | Wizard step 4 — Distress signals + match logic |
| `src/components/BuyBoxPage5.jsx` | Wizard step 5 — Location rules (flood, underimproved-land for Land) |
| `src/components/BuyBoxPage6.jsx` | Wizard step 6 — Match threshold |
| `src/components/BuyBoxPage7.jsx` | Wizard step 7 — Name, delivery cadence, activate |
| `src/components/BuyBoxRightRail.jsx` | Right rail in wizard — live match count, stat trio, filter chips |
| `src/components/BuyBoxActivatedDialog.jsx` | Success modal after activate |
| `src/components/buybox-icons.jsx` | Buy box wizard icon set — exports `Ic` |
| `src/components/LeftRail.jsx` | Left filter rail in DashboardView |
| `src/components/RightRail.jsx` | Right rail in DashboardView |
| `src/components/OwnerPortfolio.jsx` | D3 force graph of owner portfolio on deal detail |
| `src/components/feed/FeedDealCard.jsx` | Deal card in Dashboard feed |
| `src/components/feed/WeekDayTabs.jsx` | Sun–Sat week nav above feed |
| `src/components/feed/DealChatThread.jsx` | Inline chat on deal card |
| `src/components/feed/ChatFab.jsx` | Floating action button for agent chat |
| `src/components/feed/AgentMessageCard.jsx` | Agent message in chat feed |
| `src/components/feed/MessageInputBar.jsx` | Chat input bar |
| `src/components/feed/TonightsRunCard.jsx` | Tonight's deal run status |
| `src/components/ScoreBadge.jsx` | Deal score badge |
| `src/components/OverflowMenu.jsx` | Three-dot overflow menu on deal cards |
| `src/components/ContactLogModal.jsx` | Log and view contact attempts |
| `src/components/BulkActionBar.jsx` | Bulk action toolbar in DealPanel |
| `src/components/ConfirmModal.jsx` | Generic danger-confirm modal; `kind` prop selects copy |
| `src/components/AerialThumb.jsx` | Aerial imagery thumbnail |
| `src/components/PipelineTimeline.jsx` | Animated pipeline timeline. All styles inlined to avoid cascade conflicts |
| `src/components/MarketNewsfeed.jsx` | Scrolling market news. Data from `src/data/marketPulse.json` |
| `src/components/Toast.jsx` | Toast UI. Use `useToast()` hook — never render directly |
| `src/views/DashboardView.jsx` | Main feed view: LeftRail + center feed + RightRail + ChatFab |
| `src/views/MapView.jsx` | Full-screen map + DealPanel sidebar |
| `src/views/BuyBoxesView.jsx` | Buy box management kanban + card menu |
| `src/views/ForgotPasswordView.jsx` | Forgot password (unauthenticated) |
| `src/views/ResetPasswordView.jsx` | Password reset via URL token (unauthenticated) |
| `src/views/InviteView.jsx` | Admin invite queue manager |
| `src/views/AdminView.jsx` | Admin dashboard — subscriber list, runs, trigger button. Styled by `admin.css` |
| `src/views/InviteClaimView.jsx` | Invite claim at `/invite/:token` (unauthenticated) |
| `src/views/SettingsView.jsx` | Profile + password settings |
| `src/views/LoginView.jsx` | Login at `POST /api/dealfeed/auth/login` |
| `src/pages/BuyBoxPage.jsx` | Routed buy box detail/edit page |
| `src/lib/format.js` | `fmt(val)`, `hasVal(val)`, `fmtMoney(n)`, `scoreClass(s)` |
| `src/lib/api.js` | `request()`, `api.get/post/patch/delete` — use this, never raw fetch |
| `src/lib/buyBoxTaxonomy.js` | Asset class + sub-asset code taxonomy. **STALE** as of 2026-05-20 — backend rebuilt to 10-class taxonomy; this file still has 8 classes. Must be updated before wizard rebuild. |
| `src/lib/inviteHelpers.js` | `parseInvitesFromText`, `validateInvite`, `dedupeByEmail` |
| `src/data/mockData.js` | Static fallback: `DEALS`, `BUY_BOXES`, `COMPS`, `ASSET_CLASSES` |

## Dead / orphaned files (zero imports — slated for deletion)

| File | Notes |
|------|-------|
| `src/components/BuyBoxConfigurator/` (10 files, ~1280 lines) | Prior wizard prototype. No imports. |
| `src/components/BuyBoxEditModal.jsx` (~386 lines) | Old edit modal. No imports. Uses `wizardHelpers`. |
| `src/lib/wizardHelpers.js` (~256 lines) | `canProceedStep`, `buildPayload`, `toFormState`. No imports outside its test file and the orphan edit modal. The active wizard re-implements equivalent logic inline as `NATIVE_FORM` / `nativeToPayload` / `toNativeForm` in `BuyBoxWizard.jsx`. |
| `src/lib/wizardHelpers.test.js` | Tests for the orphan. Removing this drops ~30–40 tests from the 197-test suite. |

## Full Endpoint List

### Auth
- `POST /api/dealfeed/auth/login` → `{ token, subscriber }`
- `GET /api/dealfeed/auth/me` → `{ subscriber }`
- `PATCH /api/dealfeed/auth/me` → update profile
- `POST /api/dealfeed/auth/change-password`
- `GET /api/dealfeed/auth/invite/:token` → `{ email }` (unauthenticated)
- `POST /api/dealfeed/auth/invite/:token/claim` → activates account (unauthenticated)

### Deals
- `GET /api/dealfeed/deals` → `{ deals: Deal[] }` — includes `brief_json` and `notes`
- `POST /api/dealfeed/deals/:id/feedback` → body `{ feedback: "hot" | "not_relevant" | null }`
- `PATCH /api/dealfeed/deals/:id/notes` → body `{ notes: string }`
- `PATCH /api/dealfeed/deals/:id/status` → body `{ status: string }`
- `PATCH /api/dealfeed/deals/:id/save` → toggles `saved_at` → `{ id, saved: boolean }`
- `PATCH /api/dealfeed/deals/:id/read` → marks read → `{ ok: true }`
- `GET /api/dealfeed/deals/:id/contacts` → `{ contacts: ContactLog[] }`
- `POST /api/dealfeed/deals/:id/contacts` → body `{ method, note, ... }` → `{ contact }`

### Buy Boxes
- `GET /api/dealfeed/buy-boxes` → `{ buy_boxes: BuyBox[] }`
- `GET /api/dealfeed/buy-boxes/:id` → `{ buy_box }`
- `POST /api/dealfeed/buy-boxes` → `{ buy_box }` — full create with all 91 patchable fields, validators run server-side. **Not currently used by wizard** (wizard hits `/onboarding`).
- `PATCH /api/dealfeed/buy-boxes/:id` → pause/resume/edit, accepts all 91 patchable fields
- `POST /api/dealfeed/buy-boxes/:id/pause` → `{ buy_box }`
- `POST /api/dealfeed/buy-boxes/:id/resume` → `{ buy_box }`
- `DELETE /api/dealfeed/buy-boxes/:id` → soft delete → `{ deleted: true, id }`
- `POST /api/dealfeed/buy-boxes/preview` → `{ estimated_count }` — debounced 400ms by wizard. Accepts non-spatial filters for fast count.

### Onboarding (current wizard create path)
- `POST /api/dealfeed/onboarding` → `{ subscriber_id, buy_box_id, status, buy_box }` — accepts ~50 fields. **Does NOT include the 35 new MVP filter columns from migration 049.** Drift between wizard fields and persisted columns lives here.

### Geo (used by wizard)
- `GET /api/dealfeed/geo/counties?states=TX,CA` → `{ counties: { TX: ['Travis', …], CA: […] } }`

### Owner Portfolio
- `GET /api/dealfeed/owner-portfolio/:attomId` → graph data for `OwnerPortfolio.jsx`

### Invites (admin)
- `GET /api/dealfeed/invites` → `{ invites: Invite[] }`
- `POST /api/dealfeed/invites` → body `{ invites: [{email, full_name}] }` → `{ added, skipped }`
- `POST /api/dealfeed/invites/send` → bulk send the queue. HTTP `200` even with partial failures: `{ sent, failed, results: [{ email, ok, statusCode, error, token }] }`. **A 200 does NOT mean every invite sent** — read `failed` / per-result `ok`.
- `POST /api/dealfeed/invites/resend/:id` → resend a single queued invite. `200` `{ ok, statusCode, error, email }` on success / **`502`** (same body) on delivery failure. *(Wired in `InviteView` — "Resend" button on already-sent queue rows.)*
- `DELETE /api/dealfeed/invites/:id`

### Admin
- `GET /api/dealfeed/admin/subscribers` → `{ subscribers }`. Each row carries invite-lifecycle fields: `token_status` (`pending`/`claimed`/`expired`), `token_expires_at`, `token_issued_at` (when latest token issued), `token_claimed_at` (when activated), `invited_at` (set only on **successful** delivery — trustworthy), `invite_sent_count`.
- `GET /api/dealfeed/admin/subscribers/:id` → full detail
- `POST /api/dealfeed/admin/subscribers/invite` → create + invite a subscriber. Body `{ email, first_name, last_name, full_name }`. **`201`** `{ ok, statusCode, error, email }` on success / **`502`** (same body) on delivery failure. **Stop treating any 2xx as success — key off `ok`.**
- `POST /api/dealfeed/admin/subscribers/:id/resend-invite` → resend invite to an existing subscriber. **`200`** `{ ok, statusCode, error, email }` on success / **`502`** (same body) on delivery failure.
- `DELETE /api/dealfeed/admin/subscribers/:id` → revoke access
- `DELETE /api/dealfeed/admin/subscribers/:id/purge` → hard delete
- `GET /api/dealfeed/admin/runs` → `{ runs: AgentRun[] }`
- `POST /api/dealfeed/admin/runs/trigger` → triggers deal-feed run

> Delivery-status contract (the three single-send endpoints above + `/invites/resend/:id`): `ok` is true only when Resend accepted the email; `statusCode` is the raw Resend status (or `null` if never dispatched); `error` is a human-readable reason on failure, `null` on success. See `notes/postmortems/invite-false-success.md`.

### Agent
- `GET /api/dealfeed/agent/messages` → `{ messages }` — oldest first
- `POST /api/dealfeed/agent/message` → body `{ content, deal_id? }` → `{ reply }`

### Webhooks
- `POST /api/dealfeed/webhooks/*` — waitlist + other public webhooks; not called from dashboard

## Backend taxonomy (for wizard payload construction)

10 asset class slugs:
`self_storage`, `multifamily`, `mobile_home_rv`, `residential_sfr`, `land`, `industrial`, `retail`, `gas_station_c_store`, `office`, `special_purpose`.

Authoritative: `~/nightdrop-api/services/assetUseCodes.js` + `~/nightdrop-api/docs/taxonomy/mvp-buy-box-taxonomy.md`.

Land sub-asset slugs (4): `urban_infill`, `suburban_fringe`, `agricultural_rural`, `path_of_growth`.

Three-state booleans (TRUE / FALSE / NULL): `has_pool`, `has_elevator`, `opportunity_zone`, `tif_district`, `in_etj`, `ss_is_reit_owned`, `ss_has_foreclosure_history`, `mf_lihtc_flag`.

For the full field list and validator rules, see `~/nightdrop-api/routes/dealfeed/buyboxes.js::PATCHABLE_FIELDS`.
