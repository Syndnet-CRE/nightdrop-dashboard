# Weekly Improvement Loop — Report

**Date:** 2026-07-13
**Branch:** main
**Last commit before run:** `c80c415` — chore: weekly improvement loop report (2026-07-06)
**Last HANDOFF:** 2026-06-01 (session 8) — invite delivery-status contract + post-mortem; merged to main.

---

## TL;DR — fully stable; zero deltas from last week's baseline

Third consecutive week at the same clean baseline. No console.log, no TODO/FIXME, all 5 undefined
CSS tokens still carry fallbacks, knip steady at 7 unused files (unchanged from 2026-07-06), and
lint/build/test all green (391 pass). No code changes were needed. The only action this run was
re-seeding the ephemeral project memory store (the `/evolve` substitute).

---

## Auto-fixes applied

1. **Re-seeded project memory store** (`~/.claude/projects/.../memory/`). The store starts empty
   each CI run (ephemeral). Wrote three durable memories + `MEMORY.md` index:
   - `weekly-loop-stable-state.md` — the settled recurring findings so future runs watch for
     *deltas* instead of re-deriving the baseline.
   - `knip-orphan-files.md` — the 7 orphaned files + 2 unused deps awaiting Brady's batch deletion.
   - `skills-unavailable-in-ci.md` — the `/evolve` + `/harness-audit` substitutes and `gh` state.

No CSS, JS, test, or CLAUDE.md changes were needed — the orphan list in CLAUDE.md is already accurate
(updated last week) and the state has not changed.

---

## Scan results

### Undefined CSS custom properties
Used var() tokens: 214. Used-but-never-defined: 5 — **all 5 still carry a `var(--x, fallback)`**, so
none is a live bug. Verified each has zero bare occurrences:

| Token | Status |
|---|---|
| `--bg-1` | ✅ fallback |
| `--bg-input` | ✅ fallback |
| `--dc-accent` | ✅ fallback |
| `--fg-5` | ✅ fallback |
| `--panel-1` | ✅ fallback |

### `console.log` in committed code
**None** in `src/`. (Two legitimate `console.warn/error` in `DealsContext.jsx` and `DealMap.jsx` —
error logging, not debug noise. Left as-is.)

### TODO / FIXME / XXX / HACK
**None** in `src/` or `tests/`. Nothing to age via git blame.

### Orphaned scripts
**N/A** — no top-level `scripts/` dir (React SPA). The `hookify.orphaned-scripts.local.md` rule
targets the backend repo (`nightdrop-api`).

### Unregistered routes
**N/A** — React SPA; routing is `react-router-dom` in `src/App.jsx`. No Express `routes/` dir.

### Dead code (knip) — **UNCHANGED: 7 unused files**
| File | |
|---|---|
| `src/lib/anchorMetric.js` | long-standing |
| `src/lib/taxonomy.js` | long-standing |
| `src/vendor/deal-feed/sidebar-tweaks.js` | long-standing |
| `src/components/DealDetail/narrative.helpers.js` | orphaned 2026-07-06 |
| `src/components/OverflowMenu.jsx` | orphaned 2026-07-06 |
| `src/components/ScoreBadge.jsx` | orphaned 2026-07-06 |
| `src/hooks/useStickyCollapse.js` | orphaned 2026-07-06 |

Also unchanged: unused deps `d3` + `react-markdown`, 31 unused exports, 1 duplicate export
(`EMPTY_FORM|NATIVE_FORM` in `wizardFormState.js`). Not auto-deleted — source deletion is Brady's
batch call (knip false-positives on lazy/dynamic imports and intentional API surface).

### Build / lint / test health
`npm ci` clean → `npm run build` green (only the pre-existing chunk-size warning) → `npm run lint`
clean → `npm test` **391 passed (16 files)**.

---

## /evolve and /harness-audit

**Both skills remain unavailable in this runtime** (not in available-skills; no definitions under
`.claude/` or `~/.claude/skills/`). Substitutes performed:

- **`/evolve` →** re-seeded the project memory store (see Auto-fixes #1) with settled findings so
  future runs inherit them rather than re-deriving.
- **`/harness-audit` →** reviewed `.claude/settings.json` — clean. No hooks, all 5 MCP servers and
  all 3 plugins disabled, `remoteControlAtStartup: false`, `ENABLE_TOOL_SEARCH: auto`. No
  reliability/cost issues; nothing to auto-fix.

---

## 🔴 Items for Brady to review manually

Carryovers from prior weeks — none newly urgent this run:

1. **Dead-code batch deletion.** 7 orphaned files + `d3`/`react-markdown` unused deps are ready for a
   single cleanup batch. Verified zero import references. Stable — no growth this week.

2. **Stale remote branches piling up.** `origin` still carries
   `chore/weekly-css-token-fallbacks-2026-06-08` (fix merged to `main` since 2026-06-22) plus ~10
   other feature/fix branches. Prune merged/dead ones.

3. **`/evolve`, `/harness-audit`, and `gh` PR creation remain unavailable in CI.** Loop steps 3–4
   reference skills that aren't installed; `gh` is not logged in (branch push works via Actions token,
   PR creation does not). Install the skills or trim steps 3–4. Low priority — the loop commits
   straight to `main`.

4. **Stale hookify trigger (carryover).** `.claude/hookify.silent-zero-results.local.md` fires on
   `run_deal_feed.js` — marked LEGACY/unscheduled and living in the backend repo, so it can never fire
   here. Retire it or repoint at `matcher_clauses.py`.

5. **Carryover backend landmines (unchanged):** migration 049 may still be unapplied to the live DB
   (any new MVP field in a PATCH → HTTP 500), and the wizard create path (`POST /onboarding`) still
   silently drops the 35 migration-049 fields. Tracked under the `buy-box-mvp-rebuild` BMAD doc.

---

WEEKLY IMPROVEMENT COMPLETE.
