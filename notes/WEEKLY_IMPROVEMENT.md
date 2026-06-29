# Weekly Improvement Loop — Report

**Date:** 2026-06-29
**Branch:** main
**Last commit before run:** `24978c7` — fix(css): add fallbacks for 3 undefined custom props + weekly report
**Last HANDOFF:** 2026-06-01 (session 8) — invite delivery-status contract + post-mortem; merged to main.

---

## TL;DR — clean week. CSS deadlock stays resolved; fixed one stale doc; nothing else actionable to auto-apply

Last week broke the 4-week CSS-token deadlock by applying the fallback fixes directly to `main`.
This week confirms that **held**: the used-vs-defined token diff still surfaces the same 5 names,
but every one now carries a `var(--x, <fallback>)` — zero bare undefined tokens remain.

The one net-new finding this week was **documentation drift in `CLAUDE.md`**: its "Orphaned" file
list named 4 files/dirs that have already been deleted, while the 3 files knip actually flags as
orphaned weren't listed. Corrected directly (safe, factual — the deleted files provably don't exist).

Also seeded the (previously empty) project memory store with the loop's stable recurring findings,
so future runs don't re-derive them — the closest available substitute for the missing `/evolve`.

---

## Auto-fixes applied

1. **`CLAUDE.md` orphan-list correction.** The "Orphaned (zero imports)" subsection listed
   `src/components/BuyBoxConfigurator/`, `src/components/BuyBoxEditModal.jsx`,
   `src/lib/wizardHelpers.js`, and `wizardHelpers.test.js` — all four **already deleted** (verified
   absent on disk). Replaced with the 3 files `npm run knip` currently flags
   (`anchorMetric.js`, `taxonomy.js`, `vendor/deal-feed/sidebar-tweaks.js`) and a dated note that the
   old list was stale. Pure doc accuracy fix; no code touched.

2. **Seeded project memory store** (`~/.claude/.../memory/`): added `weekly-loop-stable-state.md` +
   `MEMORY.md` index capturing the settled recurring facts (CSS clean, no console.log/TODO, SPA so
   scripts/routes scans N/A, `/evolve`+`/harness-audit` absent, knip baseline, `npm ci` needed first).

No CSS, JS, or test changes were needed this week.

---

## Scan results

### Undefined CSS custom properties — full audit (computed, not trusted)
Rebuilt the defined-token set (263) and used-token set (214) across `src/` and diffed. 5 tokens are
used-but-undefined — **all 5 now carry fallbacks**, so none is a live bug:

| Token | Used in | Status |
|---|---|---|
| `--bg-1` | `feed-layout.css:540` — `var(--bg-1, var(--bg-card-hover))` | ✅ fallback |
| `--bg-input` | `accounts.css:32,124` + `InviteClaimView.jsx:194` — `var(--bg-input, var(--app-bg))` | ✅ fallback |
| `--dc-accent` | `styles.css:461` — `var(--dc-accent, transparent)` | ✅ fallback |
| `--fg-5` | `feed-layout.css:931` — `var(--fg-5, var(--fg-4))` | ✅ fallback |
| `--panel-1` | `styles.css:2984` — `var(--panel-1, var(--panel))` | ✅ fallback |

Last week's fixes (the `accounts.css`, `feed-layout.css`, `styles.css` bare sites) are intact. Clean.

### `console.log` in committed code
**None** in `src/`. Clean.

### TODO / FIXME / XXX / HACK
**None** in `src/` or `tests/`. Nothing to age via git blame.

### Orphaned scripts
**N/A** — no top-level `scripts/` dir (React SPA). The `hookify.orphaned-scripts.local.md` rule
targets the backend (`nightdrop-api`), which is not present here.

### Unregistered routes
**N/A** — React SPA; routing lives in `src/App.jsx` via `react-router-dom`. No Express `routes/` dir.

### Dead code (knip) — stable vs last week
`npm run knip` output unchanged from the 2026-06-22 run:
- **3 unused files:** `src/lib/anchorMetric.js`, `src/lib/taxonomy.js`, `src/vendor/deal-feed/sidebar-tweaks.js`
- **2 unused deps:** `d3`, `react-markdown`
- **31 unused exports** (notably the full `buyBoxFieldSchema.js` surface + several `buyBoxTaxonomy.js` formatters)
- **1 duplicate export:** `EMPTY_FORM|NATIVE_FORM` in `wizardFormState.js`

Not auto-deleted — knip false-positives on dynamic/lazy imports and intentional API surface. Brady's batch call.

### Doc drift (net-new this week)
`CLAUDE.md` listed 4 already-deleted files as "orphaned." Fixed (see Auto-fixes #1). The matching
orphan-cleanup items in prior reports referencing `BuyBoxConfigurator/`/`BuyBoxEditModal.jsx`/
`wizardHelpers.js` are therefore **done** — those files are gone.

### Build / lint / test health
`npm ci` clean → `npm run build` green (only the pre-existing chunk-size warning) → `npm run lint`
clean → `npm test` **391 passed (16 files)**.

---

## /evolve and /harness-audit

**Both skills remain unavailable in this runtime** (not in the available-skills list; no definitions
under `.claude/` or `~/.claude/`; `~/.claude/session-data/` does not exist — nothing to cluster).

- **Substitute for `/evolve`:** seeded the project memory store (previously empty) with
  `weekly-loop-stable-state.md` so future runs inherit the settled findings instead of re-deriving
  them. This is the durable-instinct mechanism actually available here.
- **Substitute for `/harness-audit`:** reviewed `.claude/settings.json` — clean. No hooks, no risky
  permission grants, all 5 MCP servers (pencil, cortex, parcyl, playwright, figma) disabled, all 3
  plugins disabled, `remoteControlAtStartup: false`, `ENABLE_TOOL_SEARCH=auto`. No reliability/cost
  issues; nothing to auto-fix.

---

## 🔴 Items for Brady to review manually

1. **Delete stale remote branch `chore/weekly-css-token-fallbacks-2026-06-08`** (still on `origin`).
   Its 3-line fix has been on `main` since 2026-06-22 — dead weight; close/delete it.

2. **Dead code from knip (needs a human call before deleting):**
   - 3 unused files: `anchorMetric.js`, `taxonomy.js`, `vendor/deal-feed/sidebar-tweaks.js`.
   - 2 unused deps: `d3`, `react-markdown` — trims install size if truly unused.
   - 1 duplicate export `EMPTY_FORM|NATIVE_FORM` in `wizardFormState.js`.
   - 31 unused exports — verify none are intended public API before pruning.
   Note: the *previous* batch (`BuyBoxConfigurator/`, `BuyBoxEditModal.jsx`, `wizardHelpers.js`) is
   now **done** — those files have been deleted; CLAUDE.md updated to match this run.

3. **`/evolve`, `/harness-audit`, and `gh` PR creation remain unavailable in CI.** Loop steps 3–4
   reference skills that aren't installed; `gh` is not logged in (branch *push* works via the Actions
   `contents: write` token; PR *creation* does not). To make the loop fully functional: install the
   skills (or trim steps 3–4 from the prompt). Less pressing since the loop commits straight to `main`.

4. **Stale hookify trigger (carryover).** `.claude/hookify.silent-zero-results.local.md` fires on
   `run_deal_feed.js` — marked LEGACY/unscheduled in CLAUDE.md and living in the backend repo, so it
   can never fire here. Retire it or repoint at `matcher_clauses.py`.

5. **Carryover backend landmines (unchanged):** migration 049 may still be unapplied to the live DB
   (any new MVP field in a PATCH → HTTP 500), and the wizard create path (`POST /onboarding`) still
   silently drops the 35 migration-049 fields. Tracked under the `buy-box-mvp-rebuild` BMAD doc.

---

WEEKLY IMPROVEMENT COMPLETE.
