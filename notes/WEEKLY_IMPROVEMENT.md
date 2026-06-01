# Weekly Improvement Loop — Report

**Date:** 2026-06-01
**Branch:** main
**Last commit before run:** `94ac955` — chore(auth-ui): match relaxed password policy (min 8 + special char) (#30)
**Last HANDOFF:** 2026-05-28 (session 7) — 8 PRs (#15–#22) shipped & green, all awaiting Brady's review/merge

---

## Scan results

### Orphaned scripts
N/A — this repo has no top-level `scripts/` directory. The `hookify.orphaned-scripts.local.md` rule targets the backend (`nightdrop-api`), which is a separate checkout not present here. Nothing to check.

### Unregistered routes
N/A — React SPA. Routing lives in `src/App.jsx` via `react-router-dom`; there is no Express-style `routes/` directory. Backend route registration is enforced by `hookify.unregistered-routes.local.md` in `nightdrop-api`, not here.

### `console.log` in committed code
**None in product code.** `src/` contains only `console.error` (`DealsContext.jsx:65`) and `console.warn` (`DealMap.jsx:269–270`) — both intentional diagnostics. The only `console.log` hits are in `tests/smoke.spec.js` (Playwright test reporter output) — intentional. Clean.

### TODO / FIXME in source
**None found** in `src/` or `tests/` (`.js`/`.jsx`/`.css`). No stale code TODOs to age via git blame. No action needed.

### Undefined CSS custom properties
Compared every `var(--*)` usage against all `--*:` definitions across `src/`. **5 tokens are used without being defined**, of which **3 are silent failures** (no fallback → property drops to `initial`/transparent) and 2 are safe:

| Token | Used in | Status |
|---|---|---|
| `--bg-1` | `feed-layout.css:540` — `.metric-tile.clickable:hover` background, **no fallback** | **Fixed** (inline fallback) |
| `--bg-input` | `accounts.css:32` & `:124` — `.acc-search` + `.acc-field input` background, **no fallback** | **Fixed** (inline fallback) |
| `--panel-1` | `styles.css:2984` — `.bulk-action-bar` sticky-bottom background, **no fallback** | **Fixed** (inline fallback) |
| `--dc-accent` | `styles.css:461` (`var(--dc-accent, transparent)`) — set dynamically inline in `DealComponents.jsx:103` | Safe — defined at runtime, left alone |
| `--fg-5` | `feed-layout.css:931` (`var(--fg-5, var(--fg-4))`) | Safe — has fallback, left alone |

> Note: last week's report (2026-05-25) listed `--surface-1` and `--chip-color` too. Both are now clean — the usages were removed/reworked in real commits since then. The remaining 3 are exactly the subset whose last-week "fix" never landed (see manual item #1).

---

## Auto-fixes applied (working tree only — see manual item #1)

Approach changed from last week: **inline `var()` fallbacks at each call site** instead of central aliases in `tokens.css`. Rationale — this matches the pattern already used elsewhere in the codebase (`InviteClaimView.jsx:194` uses `var(--bg-input, var(--app-bg))`, `--fg-5` uses `var(--fg-5, var(--fg-4))`), is self-documenting, and adds no central block to maintain. Chosen fallbacks are all defined, theme-aware tokens.

```diff
# src/styles/feed-layout.css:540
- .metric-tile.clickable:hover { ... background: var(--bg-1); }
+ .metric-tile.clickable:hover { ... background: var(--bg-1, var(--bg-card-hover)); }

# src/styles/accounts.css:32 and :124 (both occurrences)
- background: var(--bg-input);
+ background: var(--bg-input, var(--app-bg));

# src/styles/styles.css:2984
- background: var(--panel-1);
+ background: var(--panel-1, var(--panel));
```

Fallback choices: `--bg-card-hover` (= `var(--secondary)`) for the metric-tile hover; `--app-bg` (= `var(--background)`) for inputs, matching the existing `InviteClaimView` usage; `--panel` (= `var(--card)`) for the sticky action bar so it stays opaque over scrolling content. All resolve through theme-adaptive tokens, so dark mode is covered.

**Verification:** `npm install` + `npm run build` → ✅ built in 1.58s, exit 0. `package-lock.json` churn from the install was reverted; the only working-tree changes are the 3 CSS files above.

---

## /evolve and /harness-audit

**Both skipped — neither skill exists in this runtime**, and there is no session/instinct store for them to operate on.

- Not in the available-skills list; no definitions found under `.claude/` or `~/.claude/`.
- `~/.claude/session-data/` does not exist on the runner. `/evolve` clusters learned session patterns — there is nothing to cluster in CI.
- The project memory dir (`…/memory/`) is also empty/uncreated. No instincts could be promoted.

**No new instincts added this run.** Same gap as 2026-05-18 and 2026-05-25 — skills + session data live on Brady's local machine, not the GH runner.

**Lightweight harness-config check (manual substitute for /harness-audit):** reviewed `.claude/settings.json` — clean. No hooks, no risky permission grants, MCP servers (pencil, cortex, parcyl, playwright, figma) appropriately disabled, `ENABLE_TOOL_SEARCH=auto` is fine. No reliability or cost issues; nothing to auto-fix. One stale-trigger note below (item #3).

---

## 🔴 Items for Brady to review manually

1. **The weekly workflow discards every code fix it makes — second week running.** `.github/workflows/claude-weekly-improve.yml:60–62` does `git add notes/WEEKLY_IMPROVEMENT.md` → commit → `git push origin main`. **Nothing else is staged**, so this run's 3 CSS fixes (and last week's identical alias fixes) are dropped when the runner is torn down. This is *why* `--bg-1` / `--bg-input` / `--panel-1` were still undefined this week. **The exact diffs are inlined in the "Auto-fixes applied" section above so they are one-paste recoverable.**
   - **Do NOT simply broaden `git add` to `src/styles/`.** `main` auto-deploys to production via Netlify, so that would push unreviewed CSS straight to `dashboard.propcloud.ai` every week. The safe fix is to have the loop **open a PR** (push to a `chore/weekly-*` branch + `gh pr create`) instead of committing to `main` — matching the project's PR-based workflow. That also requires authenticating `gh` in the runner (see #2).

2. **`/evolve`, `/harness-audit`, and `gh` are all unavailable in the CI runtime.** The two skills referenced by steps 3–4 of the loop prompt aren't installed, and `gh auth status` reports "not logged into any GitHub hosts." To make the loop fully functional: (a) copy the skills into the runner before `claude` runs, or trim steps 3–4 from the prompt; (b) provide a `GH_TOKEN`/`gh auth` so the loop can open PRs per #1.

3. **Stale hookify trigger.** `.claude/hookify.silent-zero-results.local.md` triggers on `run_deal_feed.js`, which `CLAUDE.md` itself marks LEGACY / no-longer-scheduled and which lives in the backend repo — it can never fire in this checkout. Low priority; consider retiring the rule or repointing it at `matcher_clauses.py` in `nightdrop-api`.

4. **Carryover from HANDOFF 2026-05-28:** PRs #15–#22 are still open awaiting review/merge, plus the 5 open flags (the `deed` backend field, the `hello@nightdrop.io` mailto, the `buy-box-wizard.css:64` leftover `nightdrop-logo.png` asset, the deal-detail-v1 product decisions, and Street View provisioning). Unchanged this week — re-surfacing, not a regression.

5. **Carryover landmines from `CLAUDE.md`:** migration 049 may still be unapplied to the live DB (any new MVP field in a PATCH → HTTP 500), and the wizard create path (`POST /onboarding`) still silently drops the 35 migration-049 fields. Backend-side; tracked under the `buy-box-mvp-rebuild` BMAD doc.

---

WEEKLY IMPROVEMENT COMPLETE.
