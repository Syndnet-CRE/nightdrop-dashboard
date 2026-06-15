# Weekly Improvement Loop — Report

**Date:** 2026-06-15
**Branch:** main
**Last commit before run:** `53778d4` — chore: weekly improvement loop report
**Last HANDOFF:** 2026-06-01 (session 8) — invite delivery-status contract + post-mortem; merged to main.

---

## TL;DR — last week's fix branch is still unmerged; no new code this week

The genuine issues found this week are **identical to the last three weeks**: 3 undefined CSS
tokens that render as transparent backgrounds. **The fix already exists**, committed and pushed
to `chore/weekly-css-token-fallbacks-2026-06-08` (commit `89cbde6`), and it has **not been merged**.

**This run did NOT create a second branch.** Spawning a `chore/weekly-css-token-fallbacks-2026-06-15`
would leave two competing stale branches with the same 3-line diff — pure churn. The correct action
is for Brady to merge (or close) the existing branch. See manual item #1.

- **Open the existing PR:** https://github.com/Syndnet-CRE/nightdrop-dashboard/pull/new/chore/weekly-css-token-fallbacks-2026-06-08

---

## Scan results

### Orphaned scripts
N/A — no top-level `scripts/` directory in this repo (`ls scripts/` → not found). The
`hookify.orphaned-scripts.local.md` rule targets the backend (`nightdrop-api`), a separate
checkout not present here. Nothing to check.

### Unregistered routes
N/A — React SPA. Routing is in `src/App.jsx` via `react-router-dom`; no Express-style `routes/`
directory. Backend route registration is enforced in `nightdrop-api`, not here.

### `console.log` in committed code
**None in product code.** `src/` contains only `console.error` (`DealsContext.jsx`) and
`console.warn` (`DealMap.jsx`) — intentional diagnostics. The only `console.log` hits are in
test files (`tests/smoke.spec.js`, `tests/story-4.2-edit-buybox.test.cjs`,
`tests/story-4.3-pause-resume-preview.test.cjs`) — test-runner output, intentional. Clean.

### TODO / FIXME in source
**None found** in `src/` or `tests/` (`grep -rn "TODO\|FIXME\|XXX\|HACK"` → empty). No stale
code comments to age via git blame. No action.

### Undefined CSS custom properties — full audit
Cross-checked every `var(--x)` against every `--x:` definition across `src/` (handling
multi-declaration lines and `var()`-valued tokens, which a naive grep miscounts). **5 candidates**
surfaced; only **3 are genuine silent failures** (bare `var()`, no fallback, in live code):

| Token | Used in | Effect when undefined | Status |
|---|---|---|---|
| `--bg-1` | `feed-layout.css:540` — `.metric-tile.clickable:hover` background | hover bg → transparent | 🔴 genuine, fixed on branch |
| `--bg-input` | `accounts.css:32` & `:124` — `.acc-search`, `.acc-field input` background | input bg → transparent | 🔴 genuine, fixed on branch |
| `--panel-1` | `styles.css:2984` — `.bulk-action-bar` sticky-bottom background | bar bg → transparent over scroll | 🔴 genuine, fixed on branch |
| `--dc-accent` | `styles.css:461` — `var(--dc-accent, transparent)` | none — has `transparent` fallback | ✅ false positive |
| `--fg-5` | `feed-layout.css:931` — `var(--fg-5, var(--fg-4))` | none — has `var(--fg-4)` fallback | ✅ false positive |

(`--bg-input` also appears at `InviteClaimView.jsx:194` but already with a `var(--app-bg)`
fallback — safe; only the two `accounts.css` call sites are bare.)

The 3 genuine ones are exactly the set fixed on the `2026-06-08` branch. The branch's fallback
tokens are all confirmed still defined: `--bg-card-hover` (`tokens.css:214`), `--app-bg`
(`styles.css:8,43`), `--panel` (`styles.css:9,44`). The fix is still valid against current `main`.

---

## Auto-fixes applied

**None this run — by design.** The only actionable fixes are the 3 CSS fallbacks, which already
exist on `chore/weekly-css-token-fallbacks-2026-06-08`. Re-committing them on a new branch would
create a duplicate stale branch. No code changed on `main` this week. The fix is one merge away.

---

## /evolve and /harness-audit

**Both skipped — neither skill exists in this runtime, and there is no session/instinct store to
operate on.** Unchanged from 2026-05-18 through 2026-06-08.

- Not in the available-skills list; no definitions found under `.claude/` or `~/.claude/`
  (`find ... -iname "*evolve*" -o -iname "*harness-audit*"` → empty).
- `~/.claude/session-data/` does not exist on the runner. Nothing to cluster.
- The project memory dir does not exist either. No prior instincts to promote.

**No new instincts added this run.** (A project memory was written this run noting the recurring
unmerged-branch pattern, so future loops don't re-derive it — see below.)

**Lightweight harness-config check (manual substitute for /harness-audit):** reviewed
`.claude/settings.json` — clean. No hooks, no risky permission grants, all MCP servers
(pencil, cortex, parcyl, playwright, figma) disabled, `frontend-design`/`figma`/`firecrawl`
plugins disabled, `remoteControlAtStartup: false`, `ENABLE_TOOL_SEARCH=auto` is fine.
No reliability or cost issues; nothing to auto-fix.

---

## 🔴 Items for Brady to review manually

1. **Merge or close `chore/weekly-css-token-fallbacks-2026-06-08` — it has now sat unmerged for a
   full week.** It carries the 3 CSS fallback fixes (build-verified last week). This is the second
   consecutive report whose only actionable output is "please merge that branch." Until it lands on
   `main`, every weekly loop re-discovers the same 3 transparent-background bugs.
   - PR: https://github.com/Syndnet-CRE/nightdrop-dashboard/pull/new/chore/weekly-css-token-fallbacks-2026-06-08
   - **Durable fix for the loop itself:** the workflow's final step
     (`.github/workflows/claude-weekly-improve.yml`) only `git push origin main` for the report.
     It cannot auto-open a PR because `gh` is unauthenticated in CI. To close the loop, either
     (a) add a `GH_TOKEN` so the loop runs `gh pr create`, or (b) merge the weekly branch by hand.

2. **`/evolve`, `/harness-audit`, and `gh` PR creation remain unavailable in CI.** Steps 3–4 of the
   loop prompt reference two skills that aren't installed; `gh` is not logged in (branch *push*
   works via the Actions `contents: write` token; PR *creation* does not). To make the loop fully
   functional: install the skills into the runner (or trim steps 3–4 from the prompt), and provide
   `GH_TOKEN`/`gh auth`. (Carryover — unchanged 4 weeks running.)

3. **Dead CSS: `src/styles/buy-box-edit-modal.css` is orphaned** (imported by nobody; its component
   `BuyBoxEditModal.jsx` is already a zero-import orphan per CLAUDE.md). It defines its own
   `--fg2`/`--fgm`/`--green-b`/`--green-t`/`--danger-t`/`--danger-b` tokens — harmless only because
   the file never loads. **Add it to the orphan-cleanup batch** alongside `BuyBoxConfigurator/`,
   `BuyBoxEditModal.jsx`, and `wizardHelpers.js`. (Carryover.)

4. **Stale hookify trigger (carryover).** `.claude/hookify.silent-zero-results.local.md` triggers on
   `run_deal_feed.js`, which CLAUDE.md marks LEGACY / unscheduled and which lives in the backend repo
   — it can never fire in this checkout. Consider retiring it or repointing at `matcher_clauses.py`
   in `nightdrop-api`. (Low priority.)

5. **Carryover landmines from CLAUDE.md (backend-side, unchanged):** migration 049 may still be
   unapplied to the live DB (any new MVP field in a PATCH → HTTP 500), and the wizard create path
   (`POST /onboarding`) still silently drops the 35 migration-049 fields. Tracked under the
   `buy-box-mvp-rebuild` BMAD doc.

---

WEEKLY IMPROVEMENT COMPLETE.
