# Stories — Deal Detail V1

Each story is sized to fit one focused task. Estimates are upper bounds.

## Story 1 — v1-tokens (Phase 1)

**Estimate:** ~45 min

**Deliverables:**
- `src/styles/v1-deal-tokens.css` — all V1 tokens scoped to `.deal-shell`, with two Brady overrides (page bg `#171717`, card border `#404040` dark)
- `src/index.css` — add `@import './styles/v1-deal-tokens.css';`
- `src/App.jsx` — add theme-flush MutationObserver IIFE after existing theme-init IIFE

**Done when:**
- `npm run build` succeeds
- New CSS file lints clean
- DevTools confirms `.deal-shell { --bg: #171717 }` resolves correctly when the class is applied to any element
- Toggling `<html data-theme>` between dark/light does NOT animate stuck colors

## Story 2 — v1-scaffold (Phase 2)

**Estimate:** ~3 hr (4 workers × 45 min each parallel)

**Deliverables:** 9 component files under `src/components/DealDetail/`:
- DealShell.jsx, DealTopbar.jsx — Worker A
- DealHero.jsx, DealNarrative.jsx — Worker B
- DealIntel.jsx, DealTimeline.jsx — Worker C
- DealOwnerGraph.jsx, DealCalculator.jsx, DealActivityRail.jsx — Worker D

**Each component:**
- Ported from V1 source `.jsx` (or HTML for Shell/Topbar)
- ESM imports (no `/* global */`, no `window.*` exports)
- `lucide-react` direct imports
- Inline styles preserved verbatim
- Reads from `props.deal` + `useDeals()` directly (no internal data fetch except OwnerGraph + ActivityRail)
- Honors the locked decisions: POV tab dropped, Task button dropped, empty intel groups hidden, Timeline empty state

**Done when:**
- All 9 files exist and lint clean
- `<DealShell>` renders without runtime error when mounted with a real `deal` object
- `npm run build` succeeds

## Story 3 — v1-wire-data + tdd-calculator (Phase 3)

**Estimate:** ~2 hr

**Deliverables:**
- Real-data wiring per `architecture.md` data table (done as part of Story 2 by each worker, so this story is mostly verification + TDD)
- `src/components/DealDetail/calculator.math.js` — extracted pure math functions (computeHold, computeWholesale, computeFlip, computeLand)
- `src/components/DealDetail/__tests__/calculator.math.test.js` — vitest with known-answer tests for IRR, EM, DSCR, CoC across all 4 strategies + edge cases (zero NOI, 100% LTV, negative equity, divergent IRR seed)
- `src/components/DealDetail/__tests__/feedback-mapping.test.js` — Buy Box Match → feedback mapping (hot ↔ Matches, not_relevant ↔ Doesn't Match, null ↔ unchosen, Need More Info ↔ local-only)

**Done when:**
- `npm test` passes with ≥80% coverage on calculator.math.js
- Manual visual check: real deal renders all 9 components with real data, no `"null"` string leaks, no console errors

## Story 4 — v1-mount-swap (Phase 4)

**Estimate:** ~30 min

**Deliverables:**
- `src/App.jsx` — update `DealDetailPage` to mount `<DealShell embedded={false}/>`, update `DealDetailModal` to mount `<DealShell embedded={true}/>`
- Delete 9 files per `architecture.md` "Files deleted" list
- Verify zero stale imports remain

**Done when:**
- `grep -r "DealDetail\.helpers\|OwnerPortfolio\|ContactLogModal\|MarketNewsfeed\|deal-detail\.css" src/` returns zero hits
- `npm run lint` clean
- `npm run build` succeeds

## Story 5 — v1-verify (Phase 5)

**Estimate:** ~1 hr

**Deliverables:**
- `tests/smoke.spec.js` extended with deal-detail flow (navigate, render check, theme toggle, modal close)
- `/quality-gate` skill run end-to-end clean

**Done when:**
- `npm run lint && npm run build && npm test` all pass
- Playwright smoke test passes against `npm run dev` instance
- No console errors or warnings on a real deal

## Story 6 — v1-review-handoff (Phase 6)

**Estimate:** ~30 min

**Deliverables:**
- `code-reviewer` agent run on full diff. Address CRITICAL + HIGH only.
- `security-reviewer` agent run on full diff. Address CRITICAL only.
- `notes/audit/FRONTEND-WIRING-CONTRACT-2026-05-24.md` Section 13 updated: append "and `src/components/DealDetail/*`" to lucide-react exception list
- `notes/HANDOFF.md` written
- Single conventional commit: `feat(deal-detail): replace /deal/:id with V1 design package`

**Done when:**
- Commit landed on `main` (per repo policy — no PR for solo work)
- HANDOFF.md captures what shipped + what's deferred + next session objective

## Sequencing notes

- Stories 1, 2 run sequentially (Story 1 must complete before Story 2 starts so workers can use the tokens)
- Stories 2's 4 workers run in parallel
- Stories 3, 4, 5, 6 strictly sequential
- Each story sets HANDOFF state if interrupted — never leave half-done
