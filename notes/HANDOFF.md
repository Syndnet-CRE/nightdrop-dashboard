HANDOFF
Date: 2026-06-01 (session 8 — invite delivery-status contract + post-mortem)
Repo: nightdrop-dashboard
Status: COMPLETE. Merged and pushed to `main`. Resend endpoint now wired (per Brady).

Session objective: Update the dashboard to the nightdrop-api PR #4 invite contract (honest 502 delivery status + token_issued_at/token_claimed_at), and write a post-mortem of the false-success bug.

---

## What was done

### Post-mortem
- `notes/postmortems/invite-false-success.md` — full incident write-up (root cause: dishonest 2xx-on-failure backend + frontend assuming any resolved call = success; ties to the repo's recurring silent-failure pattern: MOCK_DEALS fallback, saveNote no-catch).

### Change 1 — honest send status
- `src/lib/inviteHelpers.js`: added pure helpers `inviteErrorMessage(err, fallback)`, `isSendOk(body)`, `summarizeBulkSend(data)`.
- `src/views/AccountsView.jsx`:
  - Resend path (`handleAction`) no longer shows blanket "Action failed" — surfaces the real backend `error` via `inviteErrorMessage(err)`, and checks `isSendOk` on the 2xx body.
  - `InvitePanel.send` captures the response and treats `ok:false` as failure even on 2xx.
- `src/views/InviteView.jsx`: bulk send (`handleSendAll`) now lists each failed recipient + their `error` (was "check Resend logs"). Added `.iv-send-result-warn` / `.iv-send-failures` styles in `styles.css`.

### Change 2 — timestamps
- `inviteTimeline(sub)` helper: claimed → `{Activated, token_claimed_at}`, pending → `{Invited, token_issued_at ?? invited_at}`, else null.
- AccountsView "Invited" column renders the timeline ("Invited <date>" / "Activated <date>").

### Docs
- `notes/REFERENCE.md`: documented `POST /admin/subscribers/invite` (201/502), `POST /admin/subscribers/:id/resend-invite` (200/502), `POST /invites/resend/:id` (200/502, not wired in UI), updated bulk `/invites/send` shape, and the new subscriber timestamp fields. Added the delivery-status contract note pointing to the post-mortem.

### Verification
- `npm test` → 391 pass (16 new unit cases on the helpers, covering the exact contract shapes: thrown-502 body, 2xx ok:false, partial bulk failure, claimed/pending timelines).
- `npm run lint` → clean. `npm run build` → green (only the pre-existing chunk-size warning).

### Resend button (added after Brady's go-ahead)
- `src/views/InviteView.jsx`: "Resend" button on already-sent queue rows → `POST /api/dealfeed/invites/resend/:id`, using `isSendOk` / `inviteErrorMessage` to toast the real error on 502 (not a false success). Styles `.iv-row-actions` / `.iv-resend-btn` in `styles.css`. REFERENCE.md note updated to "wired".

## What was NOT done / honest gaps
- **No automated E2E.** I wrote a route-mocked Playwright spec to drive the live forced-502 path, but the admin Accounts/Invites views are unreachable in the harness: the map-view `<footer class="footer">` overlays the LeftPanel nav, so clicks never land — confirmed across force-click, dispatchEvent, native click, pointer-events:none, and a tall viewport. The existing `tests/critical-flows.spec.js` avoids LeftPanel nav for the same reason (it uses TopHeader `.pb-tab`, which has no path to these views). Spec was removed rather than committed flaky. The contract's QA checklist (forcing a real Resend 502 via RESEND_FROM_EMAIL) is inherently a backend-env exercise anyway.

## Next session
- Manual visual pass on the live app: Accounts → send invite (force a backend failure to confirm the error toast, confirm Invited/Activated dates); Invites queue → Resend on a sent row.
- Optional: add a TopHeader-reachable E2E hook or fix the map-footer overlay so admin views are testable, then add the invite-delivery E2E.

`cd ~/nightdrop-dashboard && claude --dangerously-skip-permissions`

## Blockers for Brady
- None. Watch the Netlify deploy from `main` (auto-deploys to dashboard.propcloud.ai).
