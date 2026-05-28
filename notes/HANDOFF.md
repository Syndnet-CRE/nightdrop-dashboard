HANDOFF
Date: 2026-05-28 (session 6 — bundle fixes + V1 deal-detail migration + satellite tile + queued audit follow-ups)
Repo: nightdrop-dashboard
Status: TWO PRs open (#13 stacked under #14). Satellite tile fix shipped on PR #14. Brady confirmed it works on localhost smoke. Queued follow-up audit items documented below. Waiting for Brady's next session to continue.

---

## PRs open

| PR | Branch | Status | What it does |
|---|---|---|---|
| **#13** | `fix/bundle-adapter-and-mock-data` | OPEN + MERGEABLE | P0 production bug fix (mock data leak, adapter contract drift, calendar freeze, StrictMode race, inline expand restoration). 8 commits. |
| **#14** | `feat/deal-detail-v1-migrate` | OPEN + MERGEABLE | V1 deal-detail page swap + Mapbox satellite tile in expand row. Branched off PR #13's tip; 2 commits on top. |

PR #14 will need rebase onto new main after PR #13 merges. The deltas are independent surfaces so the rebase should be trivial.

---

## What was done this session

### PR #13 final state (8 commits)
1. `5f5f7c7` fix(adapter): backend camelCase contract
2. `f14d617` fix(bundle): tabs.js live calendar re-sync
3. `3b8860e` chore(bundle): strip mock data from data.js
4. `f688851` fix(map): auto-fit + silent-drop warn
5. `15bbf21` fix(adapter): lat/lng passthrough
6. `eca6d8c` docs(handoff): session 5 record
7. `e0ebe86` fix(bundle): re-trigger selection install + renderTabs (StrictMode race fix)
8. `d788868` fix(bundle): restore inline expand on dbl-click

### PR #14 state (2 commits on top of PR #13)
1. `f9d4cd0` feat(deal-detail): swap /deal/:id route to V1 design package (DealShell)
2. `07edd4e` feat(bundle): wire real satellite image into expanded-row .sat-tile (Mapbox Static API)

Brady DevTools-verified the satellite tile works — actual Mapbox satellite imagery now appears in the expanded row at the deal's coordinates, with zoom buttons that swap zoom levels (clamp 14-20).

### Three post-mortems landed in chat this session
1. **Bundle calendar-freeze framed as test fixture quirk** — process changes: manual prod smoke before declaring cutover done; no "fixture workaround" framing; `data.js`-shaped files are release blockers; every test spec for data-bound surface needs non-empty fixture from day one; bugs found while doing X get own task.
2. **Inline expand regression + V1 orphan branch** — process changes: `git branch -a` and `gh pr list --state all` at session start in repos untouched 48+ hours; refactor PRs touching event handlers must state every preserved + intentionally-changed behavior; "used to work, now doesn't" framed as regression not feature gap; multi-file unmerged work without bmad/ is a discovery hazard.
3. **`.sat-tile` CSS placeholder shipped as final** — process changes: when restoring a previously-hidden UI surface, audit every visible element on it for "wired to real data vs. placeholder"; design package handoffs treat every visual element as a placeholder until proven otherwise; defensive data passthrough must immediately verify the consumer; categorize every element in vendor reference chunks as real / static / placeholder.

---

## QUEUED for next session — explicit audit follow-ups

Brady acknowledged the satellite image works and asked to finish "everything else." Items documented here so they don't get lost.

### A. Hardcoded "—" fields in toNDDeal output (5 items)
File: `src/vendor/deal-feed/adapter.js`, lines 230-244, inside the `ext: {...}` object.

| Field | Line | Current | Should read from |
|---|---|---|---|
| `landVal` | 240 | `'—'` literal | likely `briefJson.land_value` or `hostDeal.land_value` (need to verify backend) |
| `bldgVal` | 241 | `'—'` literal | likely `briefJson.building_value` or `hostDeal.building_value` |
| `deed` | 242 | `'—'` literal | likely `briefJson.deed_type` or `hostDeal.deed_type` |
| `mortAmt` | 243 | `'—'` literal | likely `briefJson.mortgage_amount` or `hostDeal.original_loan_amount` (latter IS in Brady's ALL_KEYS dump) |
| `mortLender` | 244 | `'—'` literal | likely `briefJson.lender_name` or `hostDeal.lender_name_standardized` (latter IS in ALL_KEYS) |
| `mortDate` | 245 | `'—'` literal | likely `briefJson.mortgage_date` (not in current UI, lower priority) |

**Action: query backend's `normalizeDeal` (`~/nightdrop-api/routes/dealfeed/deals.js`) to confirm exact field names, then wire camelCase-first reads with snake_case + briefJson fallbacks per the adapter's existing pattern.**

### B. Expand-row buttons + link with no/wrong wiring (3 items)
File: `src/vendor/deal-feed/feed.js`, lines 375-379

| Element | Current | Fix |
|---|---|---|
| `.aico.mp` "Go to map" (L375) | No click handler | Should `navigate('/map?focus=${d.id}')` via an ND.actions exposed handler (similar pattern to existing `openDetail`) |
| `.aico.sh` "Share brief" (L376) | No click handler | Should copy a shareable URL to clipboard + toast confirmation. Or open a share modal. Spec needed from Brady. |
| `<a class="act-btn primary" href="#/deal-room/${d.id}">` "Open Deal Room" (L379) | Hash-routing URL `#/deal-room/:id` (legacy single-page-bundle convention) | Change to `/deal/${d.id}` so React Router catches it. Or better: route through `ND.actions.openDetail(d.id)` to keep all navigation through the React layer. |

### C. V1 deal-detail components — placeholder audit pending
Per Agent B's earlier report, several V1 components include empty-state placeholders for fields not yet surfaced by backend:
- `DealTimeline` — needs `deal.timeline[]` (chain-of-title events)
- `DealOwnerGraph` — needs `deal.ownerPortfolio[]` (force-directed graph nodes)
- `DealNarrative` — needs `deal.narrative.briefing` and `deal.narrative.ownerPov`
- `DealHero` — needs `deal.confidence` (0-100 score) + `deal.distressSignals[]`
- `DealActivityRail` — needs `deal.activities[]` (notes/calls/tasks)
- `DealCalculator` — pure math, likely safe

**Action: read each V1 component file end-to-end. For every data binding, categorize: (a) real backend field, (b) computed from real fields, (c) empty-state placeholder waiting for backend. Document in `notes/bmad/deal-detail-v1/architecture.md` (or a new audit doc) so next-session-me knows exactly what's wired vs. waiting.**

### D. Stage 2 Playwright tests (PR #12) need rebase
PR #12 (`test/phase-4-stage-2`) uses a `BUNDLE_TODAY='2026-05-24'` workaround that's obsolete after PR #13 merges (the bundle calendar is no longer frozen). F12 also tests "dbl-click address → /deal/:id" — this needs to flip to "dbl-click row → tr.xr inline expand appears, click inner Open Deal Room link → /deal/:id" to match the restored design.

### E. Google Street View — needs Brady decision
File `src/lib/googleMapsLoader.js` exists (loader from reverted commit `f521fc7`) but no `VITE_GOOGLE_MAPS_API_KEY` provisioned. If Brady wants street view inside the expand-row sat-tile (toggle Satellite / Photo), provision the key and we can wire it. Otherwise the loader stays dead code that should be deleted.

---

## Decisions made this session

- **Two stacked PRs instead of one mega-PR** — PR #13 (bundle) and PR #14 (deal-detail) are independent surfaces. Cleaner review.
- **V1 migration cherry-picked surgically** instead of merging `feat/deal-detail-v1` branch — the V1 branch was based on pre-cutover main and its App.jsx changes would have undone the deal-feed-excel cutover.
- **DealsContext extended additively** — added `toggleSave` for V1 without removing `patchStage` / `deleteDeal` (bundle still needs them).
- **Mapbox token plumbed via `publishToBundle` arg** instead of window global — cleaner contract, vitest harness can pass omitted.
- **Satellite tile falls back to CSS gradient placeholder** when lat/lng or token missing, or when Mapbox HTTP errors. `onerror` handler removes the img + `.has-img` class.
- **Did NOT delete legacy `googleMapsLoader.js`** — keeping pending Brady's call on Google Street View.

---

## Blockers for Brady

1. Smoke-test PR #13 + PR #14 on the same branch (`feat/deal-detail-v1-migrate` has both stacked) before any merge.
2. Decide on the merge order: PR #13 first (bundle fixes go to production), then rebase PR #14, then merge V1.
3. Confirm backend field names for the 5 hardcoded "—" fields in adapter.js's `ext` object so the queued fix can wire them in next session.
4. Decide if `.aico.sh` "Share brief" should copy URL or open modal.
5. Decide on Google Street View — provision key + wire, or delete `googleMapsLoader.js`.

---

## Next session resume

```
cd ~/nightdrop-dashboard && claude --dangerously-skip-permissions
/resume-session 2026-05-28-ndsh-expand-and-v1-migrate
```

Or pick up directly from this HANDOFF — the queued items list (A-E above) is exhaustive.

Current branch: `feat/deal-detail-v1-migrate` at `07edd4e`.
