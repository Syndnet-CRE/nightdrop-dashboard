HANDOFF
Date: 2026-05-25
Repo: nightdrop-dashboard
Session objective: Replace card-based Deal Feed at /dashboard with the vendor spreadsheet bundle (Deal Feed Excel). Phase 0 (audit + screenshot spike + BMAD scaffolds) and Phase 1 (backend `stage` column + pre-MVP wipe) complete. Phase 2 (frontend integration scaffold) is next.
Status: COMPLETE for Phase 0 + Phase 1. Stopping for fresh session before Phase 2 (~5-6 sessions of work remaining).

---

## What was done

### Branches created
- `feat/deal-detail-v1` — Phase 0a side-effect. The Deal Detail V1 rebuild from the prior session was uncommitted on main. Moved cleanly to its own branch (one commit, code-reviewer + security-reviewer pre-approved, ready for separate merge). HEAD: `fa4a4bf`.
- `feat/deal-feed-excel-cutover` — active Phase 0-5 branch for this work. 3 commits ahead of main. NOT pushed yet.

### main (clean now — 2 commits ahead of origin/main)
- `9ac1dee chore: gitignore noise, track project config, archive V1-era audits` — .gitignore for coverage/, .playwright-mcp/, screenshot dumps, audit-runtime*.{mjs,js}, /*.png; commit .env.development + .claude/settings.json + 2 wiring-contract notes/audit/ docs.
- `c9d0490 chore: untrack coverage/` — removed auto-gen coverage files from git tracking.

### feat/deal-feed-excel-cutover branch (3 commits)
- `6341c53 docs(bmad): scaffold deal-feed-excel planning package` — 7 BMAD docs at `notes/bmad/deal-feed-excel/` (requirements.md, PRD.md, architecture.md, stories.md, qa-plan.md, data-gaps.md, deal-state-counts.md, orphan-routes.md). All locked decisions and audit findings captured.
- `eef39b1 spike(deal-feed-excel): Phase 0.1 — bundle renders with real Neon data` — throwaway /__excel-spike route, vendor bundle moved to src/vendor/deal-feed/, scope-prefixed under .nd-excel-shell, lucide@1.14.0 pinned locally, screenshot captured at notes/bmad/deal-feed-excel/spike-2026-05-25-{theme,grid-crop}.png. Brady approved contrast 2026-05-25.

### Backend (~/nightdrop-api) — Phase 1 SHIPPED
- Branch `feat/df-stage-and-wipe`, PR #1 at https://github.com/Syndnet-CRE/nightdrop-api/pull/1 — **MERGED 2026-05-25, Render deployed, verified by Brady.**
- Migration 051 applied to prod DB (`DELETE 647, UPDATE 25, ALTER TABLE, CREATE INDEX, COMMIT`).
- New `stage` column on df_deals_sent (TEXT NOT NULL DEFAULT 'New', CHECK over 6 values: New/Researching/Contacted/Negotiating/Passed/Closed).
- `df_buy_boxes.deals_sent_total = 0` and `last_run_at = NULL` for all 25 rows.
- Routes: normalizeDeal returns stage; GET /deals + GET /deals/:id SELECTs include ds.stage; new PATCH /api/dealfeed/deals/:id/stage live (subscriber-scoped, whitelist-validated); admin.js SELECT also returns stage.
- Production `GET /api/dealfeed/deals` returns `stage` on every row + empty deals array (post-wipe).

---

## Locked decisions (from Brady's session message + AskUserQuestion answers)

1. **Theme:** App stays dark; spreadsheet renders with light grid inside dark chrome, scoped under `.nd-excel-shell`. Brady eyeballed contrast on 2026-05-25 screenshot, approved.
2. **Stage column:** Six values, backend column added. Existing `deal_state` (active/pipeline/archived) untouched — pipeline view + matcher continue to read it.
3. **Read state:** Switch from in-view dwell to mark-on-row-select (single click). Idempotent via `useReadState().markRead`. Reasoning: row-select is intentional, dwell-on-visibility false-positives in dense spreadsheet.
4. **Sidebar:** Hide bundle's `<aside class="sidebar">`. Host's `LeftPanel` stays as the only nav.
5. **TopHeader:** Untouched. Pipeline timeline + countdown clock stay exactly where they are.
6. **Right rail:** Gone from this view. `TonightsRunCard` + AI agent message card go away with it.
7. **Fonts:** DM Sans + DM Mono inside `.nd-excel-shell` only. Manrope + Inter everywhere else. JetBrains Mono banned (removed from bundle's fallback chain).
8. **Icons:** `npm install lucide@1.14.0` (matches lucide-react@1.14.0 release date). CDN script tag killed. Lucide v1.x `createIcons` API mismatch worked around with a wrapper-installed shim.
9. **Vendor code loading:** Bundle JS+CSS moved into `src/vendor/deal-feed/`. Side-effect imports in the wrapper. No runtime `<script>` injection.
10. **Rollback:** Single squashed commit. `git revert <sha>` if it breaks. No env flag, no in-app toggle.
11. **A11y:** Ship at parity with current feed (which is near-zero). Improvements deferred to a separate sprint.
12. **Cascade scope:** Just `df_deals_sent` + automatic FK cascades. No subscribers wiped. No buy-box pause. First nightly after deploy re-sends to active boxes — accepted.
13. **Migration number:** 051 (verified, not assumed).
14. **normalizeDeal location:** Confirmed single-file serializer in `routes/dealfeed/deals.js:7`. Stage added there.

---

## What was NOT done

- **Phase 2 (frontend integration scaffold)** — full wrapper, adapter, sync, action interceptors. The spike is throwaway and does NOT obey the integration pattern (no bidirectional sync, no action adapters, in-place mutations still in bundle source).
- **Phase 3** — old feed deletion (DashboardView, components/feed/*, RightRail).
- **Phase 4** — Vitest adapter/sync/actions tests + Playwright tests/excel-feed.spec.js + existing Playwright suite selector updates.
- **Phase 5** — local verify, code-review, security-review, /quality-gate, squashed merge, Netlify deploy.
- **`feat/deal-detail-v1` branch merge** — still on its own branch, awaiting separate merge decision by Brady.
- **Backend orphan endpoint cleanup** — `GET /api/dealfeed/agent/messages` becomes orphan after Phase 3. Flagged for separate ticket in notes/bmad/deal-feed-excel/orphan-routes.md.

---

## Next session

### Phase 2 — Frontend Integration Scaffold

**Branch to resume on:** `feat/deal-feed-excel-cutover` (already current).

**Resume command:**
```
cd ~/nightdrop-dashboard && claude --dangerously-skip-permissions
```

**First actions on session start:**
1. `/init` to load HANDOFF + verify CLAUDE.md + check BMAD state.
2. Read `notes/bmad/deal-feed-excel/architecture.md` for the integration pattern spec.
3. Read `notes/bmad/deal-feed-excel/stories.md` Stories 2.1 through 2.12 — each is sized under 2h.
4. Delete the throwaway spike route `/__excel-spike` (and its component, screenshot scripts) FIRST before building the real wrapper. The spike taught us what works; the real wrapper rebuilds against the locked design.

**Specific Phase 2 stories to execute in order (from stories.md):**
- 2.1 — Vendor code into build graph (already partly done: src/vendor/deal-feed/ exists with bundle JS+CSS scope-prefixed).
- 2.2 — Confirm CSS scope-prefixing (already applied in spike commit; verify still clean).
- 2.3 — Rename `id="app"` → `id="nd-excel-app"` in all bundle JS files.
- 2.4 — Lucide already pinned; wire `window.lucide.createIcons` shim into the real wrapper.
- 2.5 — Write `src/vendor/deal-feed/adapter.js` + `adapter.test.js` (Vitest, 20+ cases).
- 2.6 — Write `src/vendor/deal-feed/sync.js` + `sync.test.js`.
- 2.7 — Write `src/vendor/deal-feed/actions.js` + `actions.test.js`.
- 2.8 — Patch bundle's `feed.js` to call `ND.actions.*` at 9 surgical sites instead of mutating `ND.deals[i].*` directly.
- 2.9 — Patch `context-menu.js` + `selection.js` for read-state hook + detail open.
- 2.10 — Build `DealFeedExcelView.jsx` (real component, NOT the spike).
- 2.11 — Mount in `App.jsx` (replace `<DashboardView>` references with `<DealFeedExcelView>`, lazy-load via `React.lazy`).
- 2.12 — Decide on `deleteDeal` semantics (recommended: alias to `updateStatus(id, 'archived')`).

**Backend already exposes:**
- `stage` field on every deal row in `GET /api/dealfeed/deals` and `GET /api/dealfeed/deals/:id`.
- `PATCH /api/dealfeed/deals/:id/stage` — body `{ stage }`, returns `{ id, stage }`. Adapter should expose as `ND.actions.setStage`.

**Known Phase-2 fixes to apply (surfaced by spike):**
- Bundle `styles.css` line 65-69: malformed orphan property block under `.app` rule. Worked around with inline `<style>` in spike; fix at source by removing the orphan lines (they're between `.app` rule close `}` and `.app.sidebar-collapsed`).
- Bundle `feed.js` lines 778-789: dead run-clock code references `#rcHr/Mn/Sc`. Delete the `tick()` function and the `setInterval`.
- Bundle `feed.js` calls `lucide.createIcons()` no-arg. Patch to `lucide.createIcons({ icons: lucide.icons })` directly OR keep the wrapper shim.

**Files that DO NOT exist on this branch yet (Phase 2 creates them):**
- `src/views/DealFeedExcelView.jsx` (the real one — spike was `__excel-spike.jsx`)
- `src/vendor/deal-feed/adapter.js` + `.test.js`
- `src/vendor/deal-feed/sync.js` + `.test.js`
- `src/vendor/deal-feed/actions.js` + `.test.js`

**Files to delete first thing in Phase 2:**
- `src/views/__excel-spike.jsx` (throwaway)
- `scripts/spike-screenshot.mjs` (throwaway)
- `scripts/scope-prefix-bundle-css.py` (one-shot, output already committed)
- The `<Route path="/__excel-spike">` line and the `ExcelSpike` import in `src/App.jsx`

The screenshot files at `notes/bmad/deal-feed-excel/spike-*.png` can stay as historical reference.

---

## Blockers for Brady

None for Phase 2 entry. Backend is shipped + verified. Frontend branch is clean. BMAD docs locked.

Optional decisions Brady may want to make BEFORE Phase 2 starts (none are blocking):
- Merge `feat/deal-detail-v1` to main now (Deal Detail V1 has been QA'd + reviewer-approved) or hold? If merged, Phase 2 starts off a main that includes V1.
- Push main to origin (currently 2 commits ahead: gitignore + coverage untrack).

---

## Key reference paths

- BMAD planning: `notes/bmad/deal-feed-excel/` (8 docs, all committed)
- Bundle vendor source: `src/vendor/deal-feed/` (scope-prefixed under `.nd-excel-shell`)
- Bundle reference docs (HANDOFF/TYPES/etc from the zip): `notes/bmad/deal-feed-excel/vendor-ref/`
- Wiring contract: `notes/audit/FRONTEND-WIRING-CONTRACT-2026-05-24.md` (committed on main)
- Spike screenshots (historical): `notes/bmad/deal-feed-excel/spike-2026-05-25-{theme,grid-crop}.png`
- Backend repo: `~/nightdrop-api` — `main` carries the Phase 1 work; PR #1 merged
- Production API: `https://nightdrop-api.onrender.com` — `stage` field live, 0 deals (wiped)
