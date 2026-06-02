# Post-Mortem: Invite "Send" Reported Success When No Email Was Sent

**Date:** 2026-06-01
**Status:** Backend remediated (nightdrop-api PR #4, deployed). Dashboard fix shipped on branch `feat/invite-delivery-status`.
**Severity:** High (silent failure, onboarding-blocking, admin-invisible)
**Surfaces:** `src/views/AccountsView.jsx`, `src/views/InviteView.jsx`, `src/lib/api.js`, backend invite endpoints

## Summary

When an admin sent or resent a subscriber invite, the dashboard showed a success toast and marked the row "Sent" regardless of whether Resend actually accepted the email. Failed sends looked identical to successful ones. Invited users never received the email, and no one on the admin side could tell.

## Impact

- **Recipients:** anyone whose invite silently failed never got a link, so they could not activate. Indistinguishable from a person who got the email and ignored it.
- **Admins:** false confidence. The Accounts table showed "Sent <date>" and an "Invited" state for people who were never actually contacted. No signal to retry.
- **Onboarding funnel:** unknown number of dropped invitations attributed to "unresponsive leads" rather than a delivery bug. The failure was invisible precisely where it mattered.
- **Duration:** unbounded. There was no error surface, so this could have been wrong for as long as Resend had any failing sends (unverified domain, missing key, rate limits) without anyone noticing.

## Root Cause

Two halves of a dishonest contract, both pointing the same way:

1. **Backend lied about delivery.** The send endpoints returned a 2xx (or a silent 500) even when Resend rejected the email, and set `invited_at` unconditionally. There was no field in the response that said "this actually sent."
2. **Frontend assumed success.** `api.js` `request()` does throw on non-2xx, but because the backend returned 2xx on failure, the throw never fired. The UI treated "the call resolved" as "the email sent," then derived the "Sent" badge from `invited_at` and token existence rather than from real delivery.

Neither layer had a concept of delivery status. Success was inferred, never confirmed.

## Contributing Factors

- **Blanket catch that discards the real error.** `AccountsView.handleAction` resend path: `catch { addToast('Action failed') }`. Even once the backend started returning a real `error` string, this code would still throw it away. The information existed; the UI dropped it.
- **State derived from existence, not outcome.** `inviteState()` and the "Invited" column keyed off `invited_at` / token presence. A token row existing is not evidence an email landed.
- **No tests on any invite path.** No unit tests on `inviteHelpers.js`, no coverage of the send/resend handlers. A test that mocked a failed send would have caught the false-success in seconds.
- **Systemic pattern, not a one-off.** This is the same silent-failure shape already documented as landmines in this repo: `DashboardView` silently falling back to `MOCK_DEALS`, and `saveNote` doing an optimistic update with no error catch. The invite bug is that pattern applied to email delivery.

## Detection

It was not detected by tooling or tests. It surfaced through human observation (the original report: "success toast even when the email never sent"). There was no log, alert, or UI signal. Mean-time-to-detection was effectively "whenever someone happened to notice a recipient never got their invite."

## Resolution

**Backend (done):**
- Single-send endpoints return **502 + `{ ok, statusCode, error, email }`** on real failure, 2xx only on success.
- Bulk send keeps 200 but each `results[]` row carries `ok` / `error`.
- `invited_at` is now set only on confirmed delivery, so it is trustworthy.
- New `token_issued_at` / `token_claimed_at` expose issued-vs-activated truthfully.
- `RESEND_FROM_EMAIL=noreply@propcloud.ai` on a verified domain; migration 054 applied.

**Frontend (this branch):**
- Key success off `ok === true`, surface `error` on failure instead of a generic toast.
- List per-row failures on bulk send.
- Show "Invited <issued>" vs "Activated <claimed>" from the new timestamps.
- Pure helpers in `inviteHelpers.js` with unit tests covering the failure paths.

## Action Items

| # | Action | Owner | Type | Status |
|---|---|---|---|---|
| 1 | Ship the dashboard fix (treat non-`ok` as failure, surface `error`) | dashboard | corrective | done (this branch) |
| 2 | Add unit tests on invite send/resend/bulk handling | dashboard | preventive | done (this branch) |
| 3 | Audit for the same blanket-catch pattern repo-wide | dashboard | preventive | open |
| 4 | Treat "operation resolved" and "operation succeeded" as different states anywhere a 2xx can hide a failure | both | preventive | open |
| 5 | Consider a delivery log / Resend webhook so failures are observable without a user noticing | backend | detective | open |

## Lessons

1. **A resolved request is not a successful outcome.** Any action that crosses a boundary you do not control (email, payment, third-party API) needs an explicit success field, and the UI must read it. "The fetch didn't throw" is not proof.
2. **Silent fallbacks and empty catches are the recurring failure mode in this codebase.** Three independent instances now (MOCK_DEALS, saveNote, invites). The cheapest prevention is a standing rule: no `catch` that swallows without surfacing, and no success UI without a confirmed success signal.
3. **The contract was the real defect.** The frontend behaved reasonably given what the backend told it. The fix that matters most is the honest status field; the UI change is just consuming it.
