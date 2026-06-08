# Weekly Improvement Loop — Report

**Date:** 2026-06-08
**Branch:** main
**Last commit before run:** `6b692a2` — docs: update handoff (resend wired, merged to main)
**Last HANDOFF:** 2026-06-01 (session 8) — invite delivery-status contract + post-mortem; merged to main.

---

## TL;DR — the discard cycle is broken this week

For the first time, this run's code fixes are **preserved in git** instead of being thrown away.
The 3 CSS silent-failure fixes were pushed to a dedicated branch (not `main`, so no prod
deploy), and Brady can open a PR in one click:

- **Branch:** `chore/weekly-css-token-fallbacks-2026-06-08` (commit `89cbde6`)
- **Open PR:** https://github.com/Syndnet-CRE/nightdrop-dashboard/pull/new/chore/weekly-css-token-fallbacks-2026-06-08

See manual item #1 for why this is the right path and what still needs Brady's hand.

---

## Scan results

### Orphaned scripts
N/A — no top-level `scripts/` directory in this repo. The `hookify.orphaned-scripts.local.md`
rule targets the backend (`nightdrop-api`), a separate checkout not present here. Nothing to check.

### Unregistered routes
N/A — React SPA. Routing is in `src/App.jsx` via `react-router-dom`; no Express-style `routes/`
directory. Backend route registration is enforced by `hookify.unregistered-routes.local.md` in
`nightdrop-api`, not here.

### `console.log` in committed code
**None in product code.** `src/` contains only `console.error` (`DealsContext.jsx`) and
`console.warn` (`DealMap.jsx`) — intentional diagnostics. The only `console.log` hits are in
`tests/smoke.spec.js` (Playwright reporter output) — intentional. Clean.

### TODO / FIXME in source
**None found** in `src/` or `tests/` (`.js`/`.jsx`/`.css`). No stale code TODOs to age. No action.

### Undefined CSS custom properties — fuller audit than prior weeks
A complete `var(--x)` vs `--x:` cross-check surfaced 19 apparent undefined tokens. **Most are
false positives** once you account for two things my earlier-week grep missed:

1. **Multi-declaration lines.** `buy-box-wizard.css:8-14` defines `--base`, `--green-light`,
   `--green-tint-fg`, `--r-card`, `--r-card-lg`, `--r-input`, etc. inline (`--r-chip: 4px; --r-input: 6px; …`).
   An anchored `^\s*--x:` regex only catches the first token on each line. These are **defined and
   scoped to `.buy-box-wizard`**, which `buy-box-wizard-pages.css` inherits from. **Safe.**
2. **Tokens whose value is itself a `var()`** (e.g. `--green-light: var(--chart-1)`) get filtered
   out by a naive `grep -v var`. Also defined. **Safe.**

Other apparent-undefined tokens (`--fg2`, `--fgm`, `--green-b`, `--green-t`, `--danger-t`,
`--danger-b`) are all **defined inside `src/styles/buy-box-edit-modal.css` itself** — which is
**orphaned** (imported by nobody; its component `BuyBoxEditModal.jsx` has zero imports per
CLAUDE.md). Dead code → never renders → not a live failure (see manual item #4).

`--tier-color` and `--fg-5` are used **only with fallbacks** (`var(--tier-color, var(--border-sub))`,
`var(--fg-5, var(--fg-4))`). Safe. `--pill-amber-fg`/`--pill-blue-fg` are defined in `tokens.css:125,128`.

**Genuine silent failures (bare `var()`, no fallback, in live-rendered code) — exactly 3, the same
ones as the last two weeks** (because prior fixes were discarded — see item #1):

| Token | Used in | Effect when undefined |
|---|---|---|
| `--bg-1` | `feed-layout.css:540` — `.metric-tile.clickable:hover` background | hover bg drops to transparent |
| `--bg-input` | `accounts.css:32` & `:124` — `.acc-search`, `.acc-field input` background | input bg drops to transparent |
| `--panel-1` | `styles.css:2984` — `.bulk-action-bar` sticky-bottom background | bar bg drops to transparent over scrolling content |

---

## Auto-fixes applied — and PRESERVED this week

Inline `var()` fallbacks at each call site (matches the existing codebase pattern, e.g.
`InviteClaimView.jsx` uses `var(--bg-input, var(--app-bg))`). All fallbacks are defined,
theme-adaptive tokens, so dark mode is covered.

```diff
# src/styles/feed-layout.css:540
- background: var(--bg-1);
+ background: var(--bg-1, var(--bg-card-hover));     # --bg-card-hover = var(--secondary)

# src/styles/accounts.css:32 and :124 (both occurrences)
- background: var(--bg-input);
+ background: var(--bg-input, var(--app-bg));        # --app-bg = var(--background)

# src/styles/styles.css:2984
- background: var(--panel-1);
+ background: var(--panel-1, var(--panel));          # --panel = var(--card)
```

**Verification:** `npm install` + `npm run build` → ✅ exit 0 (only the pre-existing chunk-size
warning). `package-lock.json` churn reverted; the only changes are the 3 CSS files above.

**Persistence (new this run):** committed to branch `chore/weekly-css-token-fallbacks-2026-06-08`
and pushed to origin via the runner's `contents: write` token. **This does NOT deploy to prod** —
Netlify auto-deploys only from `main`. `main` itself is left untouched (still has the undefined
tokens) until Brady reviews/merges the branch.

---

## /evolve and /harness-audit

**Both skipped — neither skill exists in this runtime, and there is no session/instinct store to
operate on.** Unchanged from 2026-05-18 / 05-25 / 06-01.

- Not in the available-skills list; no definitions under `.claude/` or `~/.claude/`.
- `~/.claude/session-data/` does not exist on the runner. Nothing to cluster.
- The project memory dir (`…/memory/`) does not exist either. No instincts to promote.

**No new instincts added this run.**

**Lightweight harness-config check (manual substitute for /harness-audit):** reviewed
`.claude/settings.json` — clean. No hooks, no risky permission grants, MCP servers (pencil,
cortex, parcyl, playwright, figma) appropriately disabled, `ENABLE_TOOL_SEARCH=auto` is fine.
No reliability or cost issues; nothing to auto-fix.

---

## 🔴 Items for Brady to review manually

1. **The loop now hands you a branch instead of silently dropping its fixes — please merge or close it.**
   `chore/weekly-css-token-fallbacks-2026-06-08` carries the 3 CSS fallback fixes (build-verified).
   Open the PR: https://github.com/Syndnet-CRE/nightdrop-dashboard/pull/new/chore/weekly-css-token-fallbacks-2026-06-08
   - **Why a branch and not `main`:** `main` auto-deploys to `dashboard.propcloud.ai` via Netlify, so
     committing CSS to `main` = unreviewed prod deploy. A branch is the safe persistence path (this is
     exactly what the 2026-06-01 report recommended; this week the runner had push rights to do it).
   - **Durable fix for the workflow itself (still requires your hand):** the loop's last step
     (`.github/workflows/claude-weekly-improve.yml:60-62`) only does `git add notes/WEEKLY_IMPROVEMENT.md`
     → commit → `git push origin main`. The loop can push a side branch (as it now does), but it **cannot
     safely auto-open a PR** because `gh` is unauthenticated in the runner (see #2). To fully close the
     loop, either (a) add a `GH_TOKEN` so the loop runs `gh pr create`, or (b) accept the branch-only flow
     and merge the weekly `chore/weekly-*` branch by hand.

2. **`/evolve`, `/harness-audit`, and `gh` (PR creation) remain unavailable in CI.** The two skills
   referenced by steps 3–4 of the loop prompt aren't installed; `gh auth status` reports "not logged
   in." Branch *push* works (uses the Actions `contents: write` token); PR *creation* does not. To make
   the loop fully functional: copy the skills into the runner (or trim steps 3–4 from the prompt), and
   provide `GH_TOKEN`/`gh auth`.

3. **Dead CSS: `src/styles/buy-box-edit-modal.css` is orphaned** (imported by nobody; its component
   `BuyBoxEditModal.jsx` already listed as zero-import orphan in CLAUDE.md). It defines its own
   `--fg2`/`--fgm`/`--green-b`/`--green-t`/`--danger-t`/`--danger-b` tokens that exist nowhere else —
   harmless only because the file never loads. **Add it to the orphan-cleanup batch** alongside
   `BuyBoxConfigurator/`, `BuyBoxEditModal.jsx`, and `wizardHelpers.js`.

4. **Stale hookify trigger (carryover).** `.claude/hookify.silent-zero-results.local.md` triggers on
   `run_deal_feed.js`, which CLAUDE.md marks LEGACY / unscheduled and which lives in the backend repo —
   it can never fire in this checkout. Consider retiring it or repointing at `matcher_clauses.py` in
   `nightdrop-api`. (Low priority.)

5. **Carryover landmines from CLAUDE.md (backend-side, unchanged):** migration 049 may still be
   unapplied to the live DB (any new MVP field in a PATCH → HTTP 500), and the wizard create path
   (`POST /onboarding`) still silently drops the 35 migration-049 fields. Tracked under the
   `buy-box-mvp-rebuild` BMAD doc.

---

WEEKLY IMPROVEMENT COMPLETE.
