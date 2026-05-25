# Weekly Improvement Loop — Report

**Date:** 2026-05-25
**Branch:** main
**Last commit before run:** `9f66f42` — fix(deal-feed,map-panel): resolve signal pills against .tag first, prevent crash
**Last HANDOFF:** 2026-05-20 — Buy Box Wizard MVP rebuild (commit `6b51fb5`), awaiting migration 049 apply + Brady visual verification

---

## Scan results

### Orphaned scripts
N/A — this repo has no top-level `scripts/` directory. The `hookify.orphaned-scripts.local.md` rule targets the backend (`nightdrop-api`). Nothing to check here.

### Unregistered routes
N/A — this is a React SPA. Routing lives in `src/App.jsx` via `react-router-dom`; there is no Express-style `routes/` directory. Backend route registration is enforced by `hookify.unregistered-routes.local.md` in `nightdrop-api`, not here.

### `console.log` / `console.debug` in committed code
**None found** in `src/`. `tests/smoke.spec.js` and `tests/story-4.3-pause-resume-preview.test.cjs` use `console.log` as a test reporter — intentional. Clean.

### TODO / FIXME in source
**None found** in `src/` or `tests/`. Only matches are planning-doc notes in `notes/bmad/` and the workflow file itself. No stale code TODOs. No action needed.

### Undefined CSS custom properties

Compared `var(--*)` usages against `--*:` definitions across all `src/` files. **7 undefined tokens found**, of which 5 were silent failures and 2 are intentional dynamic overrides:

| Token | Used in | Status |
|---|---|---|
| `--bg-1` | `src/styles/feed-layout.css:445` (metric-tile hover background, no fallback) | **Fixed** — alias added |
| `--bg-input` | `src/styles/accounts.css:32`, `:124` (acc-search + acc-input bg, no fallback); `src/views/InviteClaimView.jsx:194` (has fallback) | **Fixed** — alias added |
| `--panel-1` | `src/styles/styles.css:2960` (bulk action bar background, no fallback) | **Fixed** — alias added |
| `--surface-1` | `src/components/ContactLogModal.jsx:60` (modal background, no fallback) | **Fixed** — alias added |
| `--fg-5` | `src/styles/feed-layout.css:836` (`.feed-deal-meta-dot`, has `--fg-4` fallback) | **Fixed** — alias added |
| `--chip-color` | `src/styles/deal-detail.css:1624` (has `--smoke` fallback for dynamic per-chip override) | Intentional — left alone |
| `--dc-accent` | `src/styles/styles.css` (deal-card border-left, `transparent` fallback for dynamic per-card accent) | Intentional — left alone (flagged again below) |

**Same five tokens were "fixed" in the 2026-05-18 report but never made it into a commit** — see the workflow gap below.

---

## Auto-fixes applied

**`src/styles/tokens.css`** — Added five compatibility aliases in `:root` under a new "Drift aliases (regenerated 2026-05-25)" section:

```css
--bg-1:       var(--bg-card-hover);
--bg-input:   var(--bg-card);
--panel-1:    var(--bg-card);
--surface-1:  var(--bg-card);
--fg-5:       var(--fg-disabled);
```

All five resolve through tokens that already adapt to the `[data-theme="dark"]` override, so dark mode is covered automatically.

Effect: accounts search/input field, metric-tile hover, bulk action bar, contact log modal, and feed deal-meta dot all render with their intended surface/text color again instead of falling back to `initial`/transparent/black.

No build verification run (GH Actions runner skips `npm install` for this loop). Additive token-only change; cannot regress existing styles.

---

## /evolve and /harness-audit

**Skipped — neither skill is installed in this runtime.**

Available skills in this CI environment: `update-config`, `keybindings-help`, `verify`, `code-review`, `fewer-permission-prompts`, `loop`, `claude-api`, `run`, `init`, `review`, `security-review`. The `/evolve` and `/harness-audit` skills referenced in `.github/workflows/claude-weekly-improve.yml` are not present, identical to the 2026-05-18 run.

`~/.claude/session-data/` does not exist in the runner either. Both are expected gaps in CI (skills + sessions live on Brady's local machine, not on the GH runner).

No new instincts added this run.

---

## Items for Brady to review manually

1. **🔴 Workflow only commits `notes/WEEKLY_IMPROVEMENT.md` — auto-fixes never land.** `.github/workflows/claude-weekly-improve.yml:62` runs `git add notes/WEEKLY_IMPROVEMENT.md` and nothing else. Any CSS / source edit applied by this loop is silently dropped at the end of the run. **This is why the 2026-05-18 "fixed" aliases were missing again this week** — they were applied to the runner's working tree, written into the report, and then `git diff --staged --quiet` was true so the change never reached `main`. Fix: change the `git add` line to `git add notes/WEEKLY_IMPROVEMENT.md src/styles/tokens.css` (or broader: `git add -A notes/ src/styles/`). Not auto-fixed this run — modifying CI is cross-cutting and warrants a human review.

2. **`/evolve` and `/harness-audit` skills missing in CI runtime.** Same as last week. Either package the skills into the runner setup (e.g. an additional `cp -r ~/.claude/skills $GITHUB_WORKSPACE/.claude/` step before `claude` runs) or trim steps 3 and 4 from the workflow prompt to silence the gap.

3. **`--dc-accent` (styles.css)** still has only a `transparent` fallback. If a per-card accent color is meant to be set dynamically (inline style on `.deal-card`), confirm that wiring still exists in `DealPanelCard.jsx` / `FeedDealCard.jsx`. If the feature was dropped, the `border-left: 3px solid var(--dc-accent, transparent)` rule can be deleted. Flagged again from last week.

4. **HANDOFF 2026-05-20 blockers still open.** Migration 049 may not be applied to live DB (`psql $DATABASE_WRITE_URL -f ~/nightdrop-api/migrations/049_df_buy_boxes_mvp_filters.sql`), and the buy-box wizard end-to-end round-trip against live backend has not been verified. Until that runs, any new MVP field in a PATCH returns HTTP 500. Not a regression — re-surfacing because three of the four wizard landmines in `CLAUDE.md` depend on it.

5. **Three test files referenced as failing in HANDOFF history (`wizardHelpers.test.js`) were deleted in commit `6b51fb5`.** That clears the prior "3 failing tests" flag. No tests were run this loop (no `node_modules` on the runner) so this is by-document, not by-verification.

---

WEEKLY IMPROVEMENT COMPLETE.
