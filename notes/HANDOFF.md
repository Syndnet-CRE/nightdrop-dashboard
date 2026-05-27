HANDOFF
Date: 2026-05-26 (session 3 — continued from session 2 via /resume-session)
Repo: nightdrop-dashboard
Session objective: Phase 4 prep — refresh codemaps, run instinct analysis, save the css-scope-guard skill, audit existing Playwright specs, and ship the Story 4.3 HIGH cleanup as a prerequisite for the Phase 4 spec.
Status: PARTIAL — codemaps refresh merged to main as `474bd53`; PR #9 (`chore/smoke-spec-cleanup`, commit `8fdd637`) open and awaiting Brady's merge call. Phase 4 spec itself not yet started.

---

## What was done

### Ship A — Codemaps refresh (merged on main as `474bd53`)

Single commit. 5 codemap files + 1 .reports file, +183/−121 lines.

- `docs/CODEMAPS/architecture.md` — added vendor bundle integration section, updated LANDING_PATHS to `{/map, /dealsheet}`, reflected `/dashboard` + `/calendar` redirects, bumped test floor to 220.
- `docs/CODEMAPS/frontend.md` — replaced stale "Deal Feed (Phase 1 horizontal card layout)" section with the Excel cutover surface (`DealFeedExcelView` + `src/vendor/deal-feed/` bundle layout), updated routes table for `/dealsheet`, refreshed persisted-UI state table (sessionStorage → localStorage keys owned by the bundle), removed stale DashboardView references.
- `docs/CODEMAPS/data.md` + `backend.md` — verified-current notes (no contract changes from cutover).
- `docs/CODEMAPS/dependencies.md` — listed components removed by the cutover, in-repo orphans flagged for follow-up.
- `.reports/codemap-diff.txt` — regenerated full diff summary 2026-05-22 → 2026-05-26.

### Ship B — Story 4.3 HIGH cleanup (PR #9, branch `chore/smoke-spec-cleanup`, commit `8fdd637`, **OPEN — NOT YET MERGED**)

Single commit. 1 file, −484/+0 lines (pure deletion).

Deleted from `tests/smoke.spec.js`:
- `openWizard()` helper (lines 1-265 pre-cleanup) that injected ~250 lines of synthesized HTML representing the **OLD 7-step wizard** (`.modal`, `.check-card`, `.wizard-current-step` classes).
- `Buy Box Wizard Tests` describe block (lines 622-840 pre-cleanup) containing 6 tests that exercised the fake fixture end-to-end. Provided zero coverage; the production wizard is 10 steps using `.bbwiz-*` classes.

Surface preserved in `smoke.spec.js`:
- `Nightdrop Dashboard Smoke Test` — 3 tests (homepage, deal detail, multi-deal)
- `Buy Box Command Center` — BB-1 through BB-6 (current `.bbwiz-*` selectors, mocked API — flagged separately for Story 4.3 MEDIUM rewrite to fix skip-on-not-found anti-pattern)

Full gate before push: lint clean, vitest 211/211, build clean (525ms), Playwright `dealsheet-persistence.spec.js` 9/9 (test floor preserved). 10 pre-existing Playwright failures across `critical-flows.spec.js` (9 tests) and `smoke.spec.js` BB-1 — confirmed pre-existing by switching to main and re-running the canary `unauthenticated root shows login form` test; same `<div class="page-fade">` overlay interception failure exists on main HEAD. NOT regressions from this PR.

### Side-quest — context-watch hook fix

Discovered the `[CTX] N% of 180000` reported by the UserPromptSubmit hook was wrong for Opus 4.7 (1M context). Root cause: `~/.claude/scripts/ctx-watch.sh` faithfully echoed Claude Code's `effectiveWindow=180000` from its debug log — Claude Code's autocompact logger doesn't know about the 1M tier.

Fix:
- `~/.claude/scripts/ctx-watch.sh` — added user-override layer. Order of precedence: `$CLAUDE_CTX_WINDOW` env var → `~/.claude/ctx-window.conf` (first numeric line) → Claude Code's reported window.
- `~/.claude/ctx-window.conf` — new file, pinned to `1000000`.

Verified by re-running the hook: now reports `[CTX] N% of 1000000`. Not git-tracked (lives in `~/.claude`).

### Skill saved — `playwright-css-scope-guard`

Written to `~/.claude/skills/learned/playwright-css-scope-guard.md`. Captures the synthetic-DOM-injection scope-boundary pattern that locked the PR #8 empty-row caret test. Pattern reference: `tests/dealsheet-persistence.spec.js:388`. Not git-tracked.

### Instinct analysis

`/instinct-status` reported 16 global instincts, 0 project-scoped, all ≥88% confidence. `/evolve` analysis returned "Potential skill clusters found: 0" — each instinct is single-domain. Skipped `--generate` (would write empty files).

---

## Test count

- Vitest: 211/211 (unchanged).
- Playwright: **9/9** for `dealsheet-persistence.spec.js` (test floor preserved). Total suite is 31 tests post-cleanup (was 37; -6 from PR #9); 21 pass / 10 pre-existing flake.
- **Floor: 220 total** (211 vitest + 9 dealsheet-persistence).

---

## Architecture / process decisions locked this session

1. **Context-window display source of truth.** `~/.claude/ctx-window.conf` overrides Claude Code's stale `effectiveWindow` value. Edit that file (first numeric line) if Brady switches to a non-1M-tier model. The hook continues to write `~/.claude/ctx-status.txt` for the status line / other scripts.
2. **Codemap freshness pattern.** When the Deal Feed Excel cutover replaces a major surface, refresh both `architecture.md` and `frontend.md` heavily; touch others with verified-current notes only if contracts didn't change. `.reports/codemap-diff.txt` records the diff summary for the next refresh.
3. **Test cleanup separates from feature work.** Story 4.3 HIGH cleanup landed as its own PR (#9), not folded into the Phase 4 branch. Smaller diff to review, honest test-count baseline (220 → 214 → 228 after Phase 4 lands), reversible.
4. **Pre-existing Playwright failures get tracked, not fixed under unrelated PRs.** The 10 `page-fade` overlay failures are Story 4.3 MEDIUM scope. Confirmed pre-existing on main via canary test — never silently regress them, but don't expand scope to fix them mid-cleanup.

---

## What was NOT done

- **PR #9 not yet merged.** Awaiting Brady's call on (1) running code-reviewer + security-reviewer (deletion-only PR; security has nothing to review), (2) merge strategy (squash recommended), (3) immediate Path B kickoff.
- **Story 4.3 MEDIUM rewrite** — BB-1 through BB-6 in `smoke.spec.js` use `if (await ...isVisible({timeout:...}).catch(() => false))` skip-on-not-found anti-pattern. Rewrite to `expect(locator).toBeVisible({timeout})` fail-loud. ~3 hours. Separate PR. Would deterministically surface the `page-fade` overlay issue.
- **Story 4.3 LOW rewrite** — first 3 smoke tests use `waitForTimeout(2000)` after `page.goto`. Swap for deterministic visibility waits. ~30 min. Separate PR.
- **`page-fade` overlay investigation** — root cause of the 10 pre-existing Playwright failures. Likely a route transition or animation element not being awaited. Tied to Story 4.3 MEDIUM.
- **Phase 4 spec** — `tests/excel-feed.spec.js` covering PRD flows F1-F14. Branch `test/phase-4-playwright` not yet created. **THIS IS THE NEXT-SESSION OBJECTIVE.**
- **Dead `.app` rules** — vendor `styles.css:59` `.nd-excel-shell .app` and host `styles.css:96` bare `.app`. Both still present.
- **`buildCalendar` dead export** — still in `src/vendor/deal-feed/adapter.js`. Removal would drop ~46 tests.
- **`feat/deal-detail-v1` branch** — still unmerged on its own branch (carryover from prior sessions).
- **Post-merge verification of G=end caret placement** — open question from PR #7 / session 2 HANDOFF.

---

## Next session — finish Story 4.2 (Phase 4 spec)

**Objective:** write `tests/excel-feed.spec.js` covering PRD flows F1-F14 on branch `test/phase-4-playwright` off clean main. Land it with full gate green + reviewers.

Procedure:

1. `cd ~/nightdrop-dashboard && claude --dangerously-skip-permissions`
2. Read this HANDOFF.md (Read tool, not cat — see global rules).
3. `/resume-session 2026-05-26-ndsh-pr9-cleanup` (or just `/resume-session` for most-recent) to load full session context including the audit findings, Path B detail, and decisions log.
4. Check PR #9 status: `gh pr view 9`.
   - **If merged:** `git switch main && git pull --ff-only`. Confirm at the squash commit of #9 or newer. Proceed to step 5.
   - **If still open:** address any review comments. Run reviewers if not yet run (`code-reviewer` agent with PR diff; `security-reviewer` will return clean). Then `gh pr merge 9 --squash --delete-branch` (or `--merge` if Brady prefers). Then step 5.
5. `git switch -c test/phase-4-playwright` off the new main.
6. Read `notes/bmad/deal-feed-excel/PRD.md` flows F1-F14 (already in the resumed session context, but a fresh Read is fine).
7. Read `tests/dealsheet-persistence.spec.js` once more for the `authAndOpenApp` mock template (lines 18-65). The new spec follows the same pattern.
8. Create `tests/excel-feed.spec.js`. One test (or one logical group) per PRD flow:
   - **F1** Load and orient — `.nd-excel-shell` mounts, day row count visible (`Showing N of M`)
   - **F2** Filter — Hot chip → grid filters to `feedback === 'hot'`, All restores
   - **F3** Sort — Sort dropdown commits via bundle sort handler, grid re-renders
   - **F4** Per-column filter — `.tri` opens `.nd-filter-pop`; `N filters` chip in toolbar
   - **F5** Single-row select + read tracking — cell click fires `markRead(dealId)` once, unread style disappears
   - **F6** Range select + copy — drag C2:E5, name box shows `C2:E5 4R × 3C`, Cmd+C → clipboard TSV
   - **F7** Multi-range select + bulk action — Cmd-click adds, bulk toolbar `Export (4)`, `Set Stage → Researching` fires PATCH per row
   - **F8** Right-click context menu — `.ctx-menu` items; `Mark Hot` → `postFeedback(dealId, 'hot')`
   - **F9** Inline cell edit — dblclick notes cell, type, blur/Enter, `saveNote(dealId, text)` PATCH
   - **F10** Stage dropdown — click stage cell, dropdown opens, pick value, PATCH `/stage` optimistic
   - **F11** Inline expand — dblclick gutter, `xtr` row appears with AI narrative + ext (parcel/county/zoning/year built/last sale); dblclick again collapses
   - **F12** Open detail — dblclick non-editable cell, `navigate('/deal/:id')`
   - **F13** Day switching — `.tabbar` day click filters grid; empty days show stub rows per current behavior
   - **F14** Density toggle — Compact/Normal/Comfortable, row heights adjust, persist to localStorage `nd:rowheights:v1`
9. Mock API surface: `/api/dealfeed/auth/me`, `/buy-boxes`, `/deals` (with non-empty deal fixtures this time so F2-F12 have data), `/deals/dashboard/kpis`. Mock all PATCH endpoints (`/feedback`, `/notes`, `/status`, `/stage`) and assert they fire with correct payloads.
10. Vendor bundle attaches listeners outside React lifecycle — `await page.waitForTimeout(3000)` after `/dealsheet` navigation is acceptable here (same pattern locked in `dealsheet-persistence.spec.js`). Don't try to deterministically await bundle ready — there's no signal.
11. Full gate: `npm run lint`, `npm test -- --run` (211/211 floor), `npm run build`, dev server + `npx playwright test` (dealsheet-persistence 9/9 floor + new excel-feed.spec.js 14/14 = 23/23 floor for the cutover surface; full suite total ~45 with 10 pre-existing flakes from critical-flows and BB-1 unchanged).
12. Reviewers: `code-reviewer` agent + `security-reviewer` agent on the new spec. Report results, do not predict.
13. Push, PR, merge.

**Naming note:** Keep `tests/excel-feed.spec.js` per the original plan. Resist consolidating into `dealsheet-persistence.spec.js` — the persistence spec is about wrapper-survives-navigation invariants; F1-F14 are user flows. Different abstraction levels.

---

## Blockers for Brady

- **PR #9 needs your merge call.** Three decisions, all in the "ready to ship" buckets:
  - Run code-reviewer + security-reviewer first? (deletion-only PR; security has nothing; up to you whether time is worth it)
  - Squash or merge commit? (recommend squash)
  - Proceed straight to Path B / Phase 4 spec after merge?
- **Optional:** confirm whether to commit the 3 modified screenshot PNGs in `tests/screenshots/` (currently uncommitted on `chore/smoke-spec-cleanup`, stashed during this HANDOFF write). They're Playwright run artifacts; harmless either way.
- **Latent:** G=end caret placement in real authored usage (carryover from session 2 HANDOFF). No action required until you have an opinion.

---

## Saved session files

For `/resume-session` continuity:

- `~/.claude/session-data/2026-05-26-ndsh-pr78-session.tmp` — PRs #7 + #8 (session 2)
- `~/.claude/session-data/2026-05-26-ndsh-phase4-prep-session.tmp` — codemaps + instincts + audit (session 3 first half)
- `~/.claude/session-data/2026-05-26-ndsh-pr9-cleanup-session.tmp` — PR #9 cleanup (session 3 second half — most current)

`/resume-session` with no args picks the most recent — that's the right entry point.
