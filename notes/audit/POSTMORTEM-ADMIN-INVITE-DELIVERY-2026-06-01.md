# Post-mortem: Admin invites show "sent" toast but recipients never receive them

**Date:** 2026-06-01
**Reporter:** Brady (brady@syndnet.com)
**Area:** Admin → Accounts → "Send Invite" / "Resend Invite"
**Severity:** High (no invited user can actually onboard)
**Status:** Root cause identified. Definitive fix is backend-side (`nightdrop-api`). Dashboard-side mitigation shipped on branch `claude/admin-invite-delivery-bug-ZVCaB`.

---

## Symptom

From the dashboard, admin opens **Accounts**, clicks **Invite**, enters an email, clicks **Send Invite**. A green success toast appears (`Invite sent to <email>`). The recipient never receives an email / access link, so they can never claim a token or log in. There is no error anywhere in the UI.

## TL;DR root cause

There are **two parallel, independent invite subsystems** in this product, and the one the admin can actually reach is the one that does **not** send email:

| | Path the admin uses (broken delivery) | Path that actually emails (unreachable) |
|---|---|---|
| UI | `AccountsView.jsx` → **Accounts** panel (reachable via sidebar "Account") | `InviteView.jsx` → **Invite Queue** |
| Send endpoint | `POST /api/dealfeed/admin/subscribers/invite`<br>`POST /api/dealfeed/admin/subscribers/:id/resend-invite` | `POST /api/dealfeed/invites/send` |
| Response | bare `200` (no delivery info) | `{ sent, failed }` |
| Wired to Resend? | **No (apparent)** — creates the invite/token row, returns 200, but does not dispatch the email | **Yes** — UI even references "check Resend logs" |
| Documented in `notes/REFERENCE.md`? | **No** | **Yes** (`REFERENCE.md:113–117`) |
| Reachable in the running app? | Yes | **No** — `setView('invites')` is never called anywhere |

The admin endpoint returns `200` because it *does* create the invite token row (the Accounts row correctly flips to the blue **"Sent"** badge — see `AccountsView.jsx:21`, which keys off `token_status === 'pending'`). The frontend treats any `200` as success and fires the toast. But the actual email send — which in this codebase lives only in the queue's `/api/dealfeed/invites/send` handler (Resend) — is never invoked by the admin endpoint. Result: **token created, email never sent, UI says success.**

## Evidence

1. **Frontend fires the toast on a bare 200, with no delivery check.**
   `src/views/AccountsView.jsx`
   - `:60` — `await api.post('/api/dealfeed/admin/subscribers/invite', {...})`
   - `:66` — `setMsg({ ok: true, text: \`Invite sent to ${clean}\` })` (unconditional)
   - `:233` — `await api.post('/api/dealfeed/admin/subscribers/${sub.id}/resend-invite', {})`
   - `:234` — `addToast(\`Invite sent to ${sub.email}\`, 'success')` (unconditional)
   `src/lib/api.js:34–42` — `request()` only throws on non-2xx; any 2xx resolves to "success."

2. **The only Resend-wired path is the queue's send endpoint.**
   `src/views/InviteView.jsx:68` — `POST /api/dealfeed/invites/send` → `:163-164` renders `Sent {n}. {failed} failed — check Resend logs.` This is the path that reports real delivery counts.

3. **The admin send endpoints are undocumented; the queue path is documented.**
   `notes/REFERENCE.md:113–117` lists the queue invite endpoints and `admin/subscribers` (GET/detail/runs) — but **not** `admin/subscribers/invite` or `.../resend-invite`. Divergence between the two subsystems is exactly where the bug lives.

4. **The working path is dead-code-reachable only.**
   `src/App.jsx:319` mounts `<InviteView/>` for `view === 'invites'`, but a repo-wide search shows `setView('invites')` is never called. `src/components/LeftPanel.jsx:213–229` only exposes **Account** and **Settings**. So the admin has no way to use the working Resend path from the UI.

5. **No admin gating in the current frontend.** The `subscriber.email === 'brady@parcyl.ai'` gate referenced in `CLAUDE.md` no longer exists in code (no `isAdmin` / email check found). `AccountsView` (full subscriber list + revoke/delete) and `AdminView` are effectively ungated — a separate issue, noted below.

## The definitive fix (backend — `nightdrop-api`)

The admin invite handler must dispatch the email, the same way the queue's `invites/send` does. In `routes/dealfeed/` (likely `admin.js` or an `invites.js`/`subscribers.js` handler):

1. In the `POST /api/dealfeed/admin/subscribers/invite` handler, after creating/locating the subscriber and generating the invite token, **call the same Resend email-send helper that `POST /api/dealfeed/invites/send` uses.** Build the claim URL as `https://dashboard.propcloud.ai/invite/<token>` (the dashboard already serves the claim flow at `src/views/InviteClaimView.jsx`, route `/invite/:token` in `App.jsx:362`).
2. Do the same in `POST /api/dealfeed/admin/subscribers/:id/resend-invite`.
3. **Return delivery status** in the response body (e.g. `{ email_sent: true }` or `{ sent, failed }`) so the frontend can stop guessing. If the Resend call throws, surface it (non-2xx or `email_sent: false`) instead of swallowing it.
4. Confirm the Resend API key / from-address env vars are present in the Render `nightdrop-api` service — if `invites/send` works but the admin path doesn't, the env is fine and the admin handler simply isn't calling the sender.

### Tracking requirement (Brady asked for this explicitly)
Brady wants to "track whoever is getting the token and when those tokens have been activated." The pieces already exist:
- **Issued/sent:** `invited_at` + `token_status` on the subscriber (already surfaced in Accounts: "Invited" column + "Sent" badge).
- **Activated:** the claim flow `POST /api/dealfeed/auth/invite/:token/claim` (`REFERENCE.md:82`) flips the account to `active`; surface a "Joined / activated_at" timestamp. Accounts already shows `created_at` as "Joined" (`AccountsView.jsx:333`) — verify it's actually the claim/activation time, and add an explicit "token activated at" if needed.

## Dashboard-side mitigation (shipped this branch)

I can't reach `nightdrop-api` from this session, so the dashboard changes do **not** by themselves make email go out. They stop the UI from lying and make the failure observable:

1. **Honest toast in `AccountsView`** — the send/resend actions no longer assert "Invite sent" on a bare 200. They report delivery only if the backend confirms it (`email_sent`/`delivered`), warn when the server reports a failed send, and otherwise show a measured "invite created — confirm delivery" message instead of false success.

These are intentionally conservative: I did **not** re-route the Accounts panel through the queue's `invites/send` (which would couple two backend subsystems / different tables and risks orphaned or duplicate records and broken tracking), and I did **not** auto-expose the `InviteView` queue in the global nav (it's an admin tool and the app currently has no admin gate — exposing it to all users would be a new problem).

## Recommended follow-ups (in priority order)

1. **[Backend] Make the admin invite endpoints send via Resend and return delivery status.** This is the actual fix.
2. **[Backend/Frontend] Restore admin gating** before exposing any admin tooling. `AccountsView`/`AdminView`/`InviteView` are currently reachable/ungated.
3. **[Product] Collapse the two invite subsystems into one.** Maintaining `admin/subscribers/invite` and `invites/send` in parallel is the structural cause of this class of bug. Pick the Resend-wired path and delete or redirect the other.
4. **[Frontend] Either wire up or delete the orphaned `InviteView`.** It's mounted but unreachable.
