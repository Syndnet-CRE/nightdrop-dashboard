# Weekly Improvement Loop — Report

**Date:** 2026-07-06
**Branch:** main
**Last commit before run:** `7ab37f1` — chore: weekly improvement loop report (2026-06-29)
**Last HANDOFF:** 2026-06-01 (session 8) — invite delivery-status contract + post-mortem; merged to main.

---

## TL;DR — mostly clean; the one net-new signal is dead code growing (knip unused files 3 → 7)

CSS token deadlock stays resolved (all 5 undefined tokens still carry fallbacks). No console.log,
no TODO/FIXME, lint/build/test all green (391 pass). The single change from the stable baseline is
**knip's unused-file count grew from 3 to 7** — 4 net-new orphaned files, each verified as having
zero import references. Not auto-deleted (source deletion is Brady's batch call), but flagged below
and in CLAUDE.md's orphan list.

---

## Auto-fixes applied

1. **`CLAUDE.md` orphan-list update.** The "Orphaned (zero imports)" subsection listed only the 3
   long-standing knip orphans. Added the 4 net-new orphans found this run (verified zero references),
   with a dated note. Pure doc-accuracy fix; no code touched.

2. **Seeded project memory store** (`~/.claude/projects/.../memory/`): the store was empty at this
   session's path. Wrote `weekly-loop-stable-state.md` (settled recurring findings + what's
   permanently N/A) and `knip-orphan-files-growing.md` (this week's net-new orphan signal), plus the
   `MEMORY.md` index. This is the durable-instinct substitute for the unavailable `/evolve`.

No CSS, JS, or test changes were needed.

---

## Scan results

### Undefined CSS custom properties — recomputed
Defined tokens: 263. Used tokens: 214. Used-but-undefined: 5 — **all 5 carry a `var(--x, fallback)`**,
so none is a live bug. Verified each site explicitly (no bare occurrences remain):

| Token | Status |
|---|---|
| `--bg-1` | ✅ fallback |
| `--bg-input` | ✅ fallback |
| `--dc-accent` | ✅ fallback |
| `--fg-5` | ✅ fallback |
| `--panel-1` | ✅ fallback |

### `console.log` in committed code
**None** in `src/`. (Two legitimate `console.warn/error` remain in `DealsContext.jsx` and
`DealMap.jsx` — error logging, not debug noise. Left as-is.)

### TODO / FIXME / XXX / HACK
**None** in `src/` or `tests/`. Nothing to age via git blame.

### Orphaned scripts
**N/A** — no top-level `scripts/` dir (React SPA). The `hookify.orphaned-scripts.local.md` rule
targets the backend repo (`nightdrop-api`), not present here.

### Unregistered routes
**N/A** — React SPA; routing is `react-router-dom` in `src/App.jsx`. No Express `routes/` dir.

### Dead code (knip) — **CHANGED this week: 3 → 7 unused files**
Net-new orphans (each confirmed **zero import references** across `src/` + `tests/`):

| File | Introduced |
|---|---|
| `src/components/DealDetail/narrative.helpers.js` | #14, 2026-05-28 (DealShell route swap) |
| `src/components/OverflowMenu.jsx` | 2026-05-09 (feed redesign) |
| `src/components/ScoreBadge.jsx` | 2026-05-22 (hex→token sweep) |
| `src/hooks/useStickyCollapse.js` | 2026-05-22 (Phase 2 sticky collapse) |

All four were added weeks ago; their last importers were removed by later refactors, so they only
now surface. Stable pre-existing orphans (unchanged): `anchorMetric.js`, `taxonomy.js`,
`vendor/deal-feed/sidebar-tweaks.js`. Also unchanged: unused deps `d3` + `react-markdown`,
31 unused exports, 1 duplicate export `EMPTY_FORM|NATIVE_FORM` in `wizardFormState.js`.

Not auto-deleted — knip false-positives on dynamic/lazy imports and intentional API surface; these
were verified clean but the "human batch call" policy holds for source deletion.

### Build / lint / test health
`npm ci` clean → `npm run build` green (only the pre-existing chunk-size warning) → `npm run lint`
clean → `npm test` **391 passed (16 files)**.

---

## /evolve and /harness-audit

**Both skills remain unavailable in this runtime** (not in available-skills; no definitions under
`.claude/` or `~/.claude/skills/`; no `~/.claude/session-data/`). Substitutes:

- **`/evolve` →** seeded/updated the project memory store (see Auto-fixes #2) so future runs inherit
  settled findings and the net-new orphan-growth signal instead of re-deriving them.
- **`/harness-audit` →** reviewed `.claude/settings.json` — clean. No hooks, all 5 MCP servers and
  all 3 plugins disabled, `remoteControlAtStartup: false`, `ENABLE_TOOL_SEARCH: auto`. No
  reliability/cost issues; nothing to auto-fix.

---

## 🔴 Items for Brady to review manually

1. **Dead-code growth (net-new, worth a look):** 4 files went orphaned since last week —
   `DealDetail/narrative.helpers.js`, `OverflowMenu.jsx`, `ScoreBadge.jsx`, `hooks/useStickyCollapse.js`.
   Each has zero import references. Safe deletion candidates in the next cleanup batch, alongside the
   3 stable orphans and the `d3` / `react-markdown` unused deps.

2. **Stale remote branches piling up.** `origin` still carries
   `chore/weekly-css-token-fallbacks-2026-06-08` (its fix has been on `main` since 2026-06-22) plus
   ~10 other feature/fix branches. Prune merged/dead ones.

3. **`/evolve`, `/harness-audit`, and `gh` PR creation remain unavailable in CI.** Loop steps 3–4
   reference skills that aren't installed; `gh` is not logged in (branch *push* works via the Actions
   token, PR *creation* does not). Install the skills or trim steps 3–4. Low priority since the loop
   commits straight to `main`.

4. **Stale hookify trigger (carryover).** `.claude/hookify.silent-zero-results.local.md` fires on
   `run_deal_feed.js` — marked LEGACY/unscheduled and living in the backend repo, so it can never
   fire here. Retire it or repoint at `matcher_clauses.py`.

5. **Carryover backend landmines (unchanged):** migration 049 may still be unapplied to the live DB
   (any new MVP field in a PATCH → HTTP 500), and the wizard create path (`POST /onboarding`) still
   silently drops the 35 migration-049 fields. Tracked under the `buy-box-mvp-rebuild` BMAD doc.

---

WEEKLY IMPROVEMENT COMPLETE.
