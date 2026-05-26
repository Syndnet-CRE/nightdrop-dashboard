<!-- Generated: 2026-05-26 | Files scanned: ~22 | Token estimate: ~750 -->
<!-- Verified current 2026-05-26: Deal Feed Excel cutover did not change any
     backend contracts. /dealsheet consumes the same /api/dealfeed/deals + 
     /api/dealfeed/buy-boxes payloads via DealsContext. Write paths (saveNote, 
     updateStatus, postFeedback) reuse the existing PATCH endpoints. -->
# Backend Integration — nightdrop-dashboard

This repo is frontend-only. Backend lives in `~/nightdrop-api` (Render service
`nightdrop-api` at `https://nightdrop-api.onrender.com`).

## API client
`src/lib/api.js` exports `api.get/post/patch/delete`. All requests use this —
never raw `fetch`. JWT attached automatically when present in localStorage.

## Endpoint usage map

### Auth (src/hooks/useAuth.jsx)
```
POST /api/dealfeed/auth/login         → useAuth.login()
GET  /api/dealfeed/auth/me            → useAuth bootstrap
POST /api/dealfeed/auth/forgot-password → ForgotPasswordView
POST /api/dealfeed/auth/reset-password  → ResetPasswordView
GET  /api/dealfeed/auth/invite/:token   → InviteClaimView (unauth)
POST /api/dealfeed/auth/invite/:token/claim → InviteClaimView (unauth)
```

### Deals (src/contexts/DealsContext.jsx)
```
GET    /api/dealfeed/deals              → fetchAll() on mount
POST   /api/dealfeed/deals/:id/feedback → postFeedback()  body {feedback: "hot"|"not_relevant"|null}
PATCH  /api/dealfeed/deals/:id/notes    → saveNote()
PATCH  /api/dealfeed/deals/:id/status   → updateStatus()
PATCH  /api/dealfeed/deals/:id/save     → toggle saved
PATCH  /api/dealfeed/deals/:id/read     → mark read
GET    /api/dealfeed/deals/:id/contacts → fetchContacts()
POST   /api/dealfeed/deals/:id/contacts → logContact()
```

### Buy boxes (DealsContext + BuyBoxWizard)
```
GET    /api/dealfeed/buy-boxes              → fetchAll()
GET    /api/dealfeed/buy-boxes/:id          → individual fetch
POST   /api/dealfeed/buy-boxes              → BuyBoxWizard.handleActivate() (create — switched from /onboarding 2026-05-20)
PATCH  /api/dealfeed/buy-boxes/:id          → patchBuyBox() (pause/resume/edit)
POST   /api/dealfeed/buy-boxes/:id/pause    → not currently used by UI
POST   /api/dealfeed/buy-boxes/:id/resume   → not currently used by UI
DELETE /api/dealfeed/buy-boxes/:id          → deleteBuyBox()
POST   /api/dealfeed/buy-boxes/preview      → BuyBoxWizard live preview (debounced 400ms)
```

### Geography (src/components/BuyBoxPage1.jsx)
```
GET /api/dealfeed/geo/counties?states=TX,CA → {counties: {TX: [...], CA: [...]}}
```

### Owner portfolio (src/components/OwnerPortfolio.jsx)
```
GET /api/dealfeed/owner-portfolio/:attomId → graph data for D3 force visualization
```

### Agent chat (src/components/feed/*)
```
GET  /api/dealfeed/agent/messages          → ChatFab, DealChatThread
POST /api/dealfeed/agent/message           → MessageInputBar, DealChatThread
                                             body {content, deal_id?}
```

### Admin (src/views/AdminView.jsx — gated to brady@parcyl.ai)
```
GET  /api/dealfeed/admin/subscribers       → subscriber list
GET  /api/dealfeed/admin/subscribers/:id   → detail
GET  /api/dealfeed/admin/runs              → deal run history
POST /api/dealfeed/admin/runs/trigger      → manual nightly run
```

### Invites (src/views/InviteView.jsx — admin only)
```
GET    /api/dealfeed/invites               → queue
POST   /api/dealfeed/invites               → bulk add
POST   /api/dealfeed/invites/send          → send pending
DELETE /api/dealfeed/invites/:id           → remove
```

### KPIs (src/App.jsx)
```
GET /api/dealfeed/deals/dashboard/kpis     → fed into LeftPanel metric tiles
```

## Payload mapper
`src/lib/wizardFormState.js`
- `EMPTY_FORM` — full wizard form shape (~70 nested fields)
- `nativeToPayload(form)` — serializes to backend POST/PATCH body covering
  all 91 PATCHABLE_FIELDS on `df_buy_boxes`
- `toNativeForm(buyBox)` — deserializes a saved buy box back into form state
- Payload fallback: empty `subtypes` auto-expands to full class codes so
  the backend `validateAssetUseCodes()` non-empty check passes

## ID conventions
All `df_*` table IDs are UUID strings. Never `parseInt()` them. Hookify rule:
`.claude/hookify.uuid-and-backend-target.local.md`.

## Coverage caveat
Parcyl property DB covers 5 Central TX counties only (Travis, Bastrop, Hays,
Williamson, Caldwell). Wizard exposes 51 states but matches return Central TX
data regardless.
