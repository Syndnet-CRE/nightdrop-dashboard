// Phase 4 Playwright coverage of the Deal Feed Excel cutover (PRD flows F1–F14).
//
// This spec ships in STAGES because each PRD flow needs different fixture work:
//
//   Stage 1 (landed in PR #10): F1, F3, F14
//     Chrome flows that pass with an empty deals mock. Shell renders, toolbar
//     is wired, density toggle re-renders rows. No backend mutation routes.
//
//   Stage 2 (THIS PR): F2, F5, F8, F9, F11, F12, F13
//     Adds `buildFixtureDeals()` (4 deals across today + a sibling-day in the
//     same calendar week, host-shape) and registers the write-path routes
//     (POST /feedback, PATCH /notes, PATCH /stage, PATCH /status) as 200 OK
//     handlers. Individual tests use `page.waitForRequest` to capture call
//     payloads. F11 is exercised against the bundle's `ND._toggleExpand`
//     primitive — see the F11 test for why no UI trigger exists yet.
//
//   Stage 3 (later): F4 per-column filter, F6 range-copy-as-TSV,
//     F7 bulk-set-stage, F10 stage dropdown.
//     Clipboard permissions, drag-mouse choreography, PATCH sequencing.
//
// Why split: writing all 14 in one PR would either flake on data-flow setup
// or balloon scope past one clean review. Stages keep each PR reviewable.
//
// Requires: `npm run dev` on localhost:5173. `playwright.config.js` sets
// `webServer: null` per project convention.

import { test, expect } from '@playwright/test';

// Subscriber id baked into the auth/me mock below; tests reference this for
// read-state localStorage keys (`dealfeed.read.${SUBSCRIBER_ID}:${dealId}`).
const SUBSCRIBER_ID = 'test-uuid-1';

async function authAndOpenSheet(page, { deals = [] } = {}) {
  await page.route('**/api/dealfeed/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        subscriber: { id: SUBSCRIBER_ID, email: 'test@test.com', full_name: 'Tester' },
      }),
    })
  );
  await page.route('**/api/dealfeed/buy-boxes', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        buy_boxes: [
          { id: 'bb-1', name: 'self storage', asset_classes: ['self_storage'] },
        ],
      }),
    })
  );
  await page.route('**/api/dealfeed/deals', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ deals }),
    })
  );
  await page.route('**/api/dealfeed/deals/dashboard/kpis', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        unread_count: 0,
        new_this_week: 0,
        response_rate: 0,
        hot_deals: 0,
      }),
    })
  );

  // Write-path routes for Stage 2 flows. All return 200 OK; individual tests
  // use `page.waitForRequest` to capture the actual call payload.
  await page.route('**/api/dealfeed/deals/*/feedback', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
  await page.route('**/api/dealfeed/deals/*/notes', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
  await page.route('**/api/dealfeed/deals/*/stage', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
  await page.route('**/api/dealfeed/deals/*/status', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  await page.goto('http://localhost:5173/', {
    waitUntil: 'domcontentloaded',
    timeout: 10000,
  });
  await page.evaluate(() => localStorage.setItem('nd_token', 'mock-test-token'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Deal Sheet/i }).click();
  await page.waitForTimeout(3000); // lazy chunk + bundle IIFEs
  await expect(page.locator('.nd-excel-shell')).toBeVisible();
}

// ── Stage 2 fixture helpers ────────────────────────────────────────────────
//
// Bundle calendar is FROZEN to 2026-05-24. data.js:153 hardcodes
// `ND.todayISO = '2026-05-24'` and immediately auto-builds ND.calendar from
// that anchor. tabs.js's IIFE then captures both `cal` and `ND.state.activeDay`
// at module-load time. The first publishToBundle from React updates
// ND.todayISO and rebuilds ND.calendar, but tabs.js doesn't re-init state, so
// the active day stays pinned at 2026-05-24 (a Sunday) and the visible week
// stays May 18–24. Fixtures MUST place deals inside this frozen week or they
// won't render in the current tab. siblings are picked from the same week
// (May 23 is the Saturday immediately before May 24 — both in the Mon–Sun
// May 18–24 slice).
//
// When the bundle's hardcoded today is bumped or replaced with a dynamic
// initializer, swap these constants accordingly and the rest of the tests
// continue to work.
const BUNDLE_TODAY = '2026-05-24';
const BUNDLE_SIBLING = '2026-05-23';

// `T12:00:00Z` is stable across US/EU TZs: isoDate (which uses local Y-M-D)
// returns the same date the YMD string encodes. Mid-day UTC avoids the
// midnight day-boundary trap (see PR #11 for full context).
function ymdNoonUTC(y) {
  return `${y}T12:00:00Z`;
}

// 4 deals in host (backend) shape: 2 on bundle-today, 2 on bundle-sibling.
// Mix of hot / not-hot and stages so the various Stage 2 flows have
// distinguishable rows. Property fields are minimal — Stage 2 assertions
// don't depend on computed fields like psf or hold.
function buildFixtureDeals() {
  const today = BUNDLE_TODAY;
  const sibling = BUNDLE_SIBLING;
  const baseUpdated = ymdNoonUTC(today);
  const common = {
    asset_class: 'self_storage',
    owner_type: 'llc',
    updated_at: baseUpdated,
    signals: [],
    brief_json: { summary: '' },
  };
  return [
    {
      ...common,
      id: 'deal-1', buy_box_id: 'bb-1', score: 92,
      address: '101 Today St', property_city: 'Austin', property_state: 'TX', property_zip: '78701',
      sent_at: ymdNoonUTC(today),
      value: 1_500_000, building_sf: 8000,
      stage: 'New', feedback: 'hot', saved: false, notes: '',
    },
    {
      ...common,
      id: 'deal-2', buy_box_id: 'bb-1', score: 84,
      address: '202 Today Ave', property_city: 'Austin', property_state: 'TX', property_zip: '78702',
      sent_at: ymdNoonUTC(today),
      value: 1_200_000, building_sf: 6000,
      stage: 'New', feedback: null, saved: false, notes: '',
    },
    {
      ...common,
      id: 'deal-3', buy_box_id: 'bb-1', score: 71,
      address: '303 Sibling Blvd', property_city: 'Austin', property_state: 'TX', property_zip: '78703',
      sent_at: ymdNoonUTC(sibling),
      value: 900_000, building_sf: 5000,
      stage: 'New', feedback: null, saved: false, notes: '',
    },
    {
      ...common,
      id: 'deal-4', buy_box_id: 'bb-1', score: 65,
      address: '404 Sibling Ln', property_city: 'Austin', property_state: 'TX', property_zip: '78704',
      sent_at: ymdNoonUTC(sibling),
      value: 800_000, building_sf: 4500,
      stage: 'Negotiating', feedback: 'hot', saved: true, notes: 'existing',
    },
  ];
}

test.describe('Deal Feed Excel — PRD flow coverage (Stage 1)', () => {
  // F1 — Load and orient.
  // PRD: "User logs in. /dashboard renders the spreadsheet inside dark Nightdrop
  //       chrome. Active day is today (or most recent day with deals if today is
  //       empty). Top of grid shows row count: `Showing N of M`."
  //
  // Stage 1 scope: shell mounts, the toolbar scaffolding is present (chips,
  // density toggle, sort dropdown), the stats bar renders, the row-count line
  // (#rc) populates with text. The empty-deals path produces "Showing 0 of 0"
  // because filtered/total both resolve to 0 (feed.js:408).
  test('F1: shell + toolbar chrome + stats + row count render on load', async ({ page }) => {
    await authAndOpenSheet(page);

    const shell = page.locator('.nd-excel-shell');
    await expect(shell).toBeVisible();

    // Toolbar surfaces.
    await expect(shell.locator('.toolbar')).toBeVisible();
    await expect(shell.locator('.toolbar .chips')).toBeVisible();
    await expect(shell.locator('.toolbar .density-toggle')).toBeVisible();
    await expect(shell.locator('.toolbar .sort .sort-sel')).toBeVisible();

    // Stats bar and row count.
    await expect(shell.locator('.statsbar')).toBeVisible();
    const rc = shell.locator('#rc');
    await expect(rc).toBeVisible();
    // Row-count text is set by rr() in feed.js:408 to `Showing N of M`. The
    // initial JSX default is "Loading…"; after bundle hydration with empty
    // deals it becomes "Showing 0 of 0". The `$` anchor locks the exact shape
    // (no trailing content from a partial hydrate state).
    await expect(rc).toHaveText(/^Showing \d+ of \d+$/);

    // Day tabbar exists (populated by tabs.js).
    await expect(shell.locator('#tabbar')).toBeAttached();

    // Grid scaffolding.
    await expect(shell.locator('table#grid')).toBeVisible();
    await expect(shell.locator('table#grid thead tr.colhdr')).toBeVisible();
  });

  // F3 — Sort dropdown.
  // PRD: "User clicks the `Sort` dropdown (Score / Recency / Distress / Value).
  //       Selection commits via the bundle's sort handler. Grid re-renders sorted."
  //
  // Stage 1 scope: dropdown scaffolding exists with the four canonical options
  // in the right order; selecting a value does not throw and is reflected back
  // in the select state. The actual sort-result assertion (first row >= last
  // row) requires real deal rows and lands in Stage 2.
  test('F3: sort dropdown lists Score/Recency/Distress/Value in order', async ({ page }) => {
    await authAndOpenSheet(page);

    const sortSel = page.locator('.nd-excel-shell .sort .sort-sel');
    await expect(sortSel).toBeVisible();

    const options = await sortSel.locator('option').allTextContents();
    expect(options).toEqual(['Score', 'Recency', 'Distress', 'Value']);

    // Default selection is Score (set via defaultValue in JSX).
    await expect(sortSel).toHaveValue('Score');

    // Switching commits cleanly to the select state.
    await sortSel.selectOption('Recency');
    await expect(sortSel).toHaveValue('Recency');

    await sortSel.selectOption('Distress');
    await expect(sortSel).toHaveValue('Distress');
  });

  // F14 — Density toggle.
  // PRD: "User clicks Compact / Normal / Comfortable in the toolbar. Row
  //       heights adjust. State persists in localStorage (`nd:rowheights:v1`)."
  //
  // Bundle reality: density is a JS variable in feed.js (let density = 'normal',
  // rh = { compact: 36, normal: 44, comfortable: 56 }). The `dbtn` click handler
  // updates `density` and calls rr(); rr() re-renders rows with the new height.
  //
  // The PRD's localStorage claim is incorrect: `nd:rowheights:v1` is populated
  // by row-resize.js (per-row drag handles), not by the density toggle. The
  // density itself is not persisted. Asserting that key here would be testing
  // a spec bug. Stage 1 locks the observable behavior — `.active` rotates
  // through the three buttons and the row height of any rendered row matches
  // the rh map (±1px tolerance for the bottom border that getBoundingClientRect
  // includes; bundle sets `tr.style.height = h + 'px'` which is the structural
  // height before border).
  test('F14: density toggle moves .active and re-renders row heights', async ({ page }) => {
    await authAndOpenSheet(page);

    const compactBtn = page.locator('.nd-excel-shell .density-toggle .dbtn[data-d="compact"]');
    const normalBtn = page.locator('.nd-excel-shell .density-toggle .dbtn[data-d="normal"]');
    const comfortableBtn = page.locator('.nd-excel-shell .density-toggle .dbtn[data-d="comfortable"]');

    // Initial state per JSX: normal is active.
    await expect(normalBtn).toHaveClass(/\bactive\b/);
    await expect(compactBtn).not.toHaveClass(/\bactive\b/);
    await expect(comfortableBtn).not.toHaveClass(/\bactive\b/);

    // Compact: active rotates, an empty-row height becomes 36px.
    // (Empty-row min is 28px per row-resize.js LIMITS; feed.js rh.compact=36
    // is the density-driven row height before any manual drag.)
    await compactBtn.click();
    await expect(compactBtn).toHaveClass(/\bactive\b/);
    await expect(normalBtn).not.toHaveClass(/\bactive\b/);
    {
      const h = await page.locator('.nd-excel-shell tr.empty-row').first().evaluate((el) =>
        Math.round(el.getBoundingClientRect().height)
      );
      expect(h, 'empty-row height under compact (36 ±1)').toBeGreaterThanOrEqual(35);
      expect(h, 'empty-row height under compact (36 ±1)').toBeLessThanOrEqual(37);
    }

    // Comfortable: active rotates, height becomes 56px.
    await comfortableBtn.click();
    await expect(comfortableBtn).toHaveClass(/\bactive\b/);
    await expect(compactBtn).not.toHaveClass(/\bactive\b/);
    {
      const h = await page.locator('.nd-excel-shell tr.empty-row').first().evaluate((el) =>
        Math.round(el.getBoundingClientRect().height)
      );
      expect(h, 'empty-row height under comfortable (56 ±1)').toBeGreaterThanOrEqual(55);
      expect(h, 'empty-row height under comfortable (56 ±1)').toBeLessThanOrEqual(57);
    }

    // Back to normal: 44px.
    await normalBtn.click();
    await expect(normalBtn).toHaveClass(/\bactive\b/);
    await expect(comfortableBtn).not.toHaveClass(/\bactive\b/);
    {
      const h = await page.locator('.nd-excel-shell tr.empty-row').first().evaluate((el) =>
        Math.round(el.getBoundingClientRect().height)
      );
      expect(h, 'empty-row height under normal (44 ±1)').toBeGreaterThanOrEqual(43);
      expect(h, 'empty-row height under normal (44 ±1)').toBeLessThanOrEqual(45);
    }
  });
});

test.describe('Deal Feed Excel — PRD flow coverage (Stage 2 — data-bound flows)', () => {
  // F2 — Hot chip filters tr.dr to hot deals.
  // PRD: "User clicks Hot chip → row count drops to hot-only deals; chip
  //       rotates active." The PRD's "all visible rows have .row-hot" line
  //       is wrong — there is no .row-hot CSS class on tr.dr (feed.js:459).
  //       The observable signal is the visible `tr.dr[data-id]` set shrinks
  //       to deals with d.hot === true (toNDDeal sets hot from feedback ===
  //       'hot'). Fixture: deal-1 is hot, deal-2 is not. Today tab is active.
  test('F2: clicking Hot chip filters tr.dr to hot deals only', async ({ page }) => {
    await authAndOpenSheet(page, { deals: buildFixtureDeals() });

    const shell = page.locator('.nd-excel-shell');
    const allChip = shell.locator('.chip[data-f="all"]');
    const hotChip = shell.locator('.chip[data-f="hot"]');

    // Initial: All chip active, both today deals visible.
    await expect(allChip).toHaveClass(/\bactive\b/);
    await expect(shell.locator('tr.dr')).toHaveCount(2);

    await hotChip.click();
    await expect(hotChip).toHaveClass(/\bactive\b/);
    await expect(allChip).not.toHaveClass(/\bactive\b/);
    await expect(shell.locator('tr.dr')).toHaveCount(1);
    await expect(shell.locator('tr.dr').first()).toHaveAttribute('data-id', 'deal-1');
  });

  // F5 — Single-row select → read tracking.
  // PRD: "Click row → #cellAddr shows new address; row's tr.unread class drops;
  //       localStorage key dealfeed.read.<sub>:<id> set." selection.js setCell
  //       calls markReadAtRow, which calls ND.actions.markRead, which calls
  //       host's useReadState().markRead. The host writes localStorage and the
  //       next publishToBundle re-renders the row without `.unread`.
  test('F5: clicking a deal row updates cellAddr, drops .unread, sets read-state localStorage', async ({ page }) => {
    await authAndOpenSheet(page, { deals: buildFixtureDeals() });

    const shell = page.locator('.nd-excel-shell');
    const cellAddr = shell.locator('#cellAddr');

    // Initial: cellAddr empty, both today deals are unread.
    await expect(cellAddr).toHaveText('');
    await expect(shell.locator('tr.dr.unread')).toHaveCount(2);

    // Click score cell (column A) of deal-1.
    await shell.locator('tr.dr[data-id="deal-1"] td[data-col="score"]').click();

    // cellAddr shows A1 (col A, row 1).
    await expect(cellAddr).toHaveText('A1');

    // Unread drops by 1.
    await expect(shell.locator('tr.dr.unread')).toHaveCount(1);
    await expect(shell.locator('tr.dr[data-id="deal-1"]')).not.toHaveClass(/\bunread\b/);

    // ReadStateContext key shape: dealfeed.read.<subscriberId>:<dealId>.
    const stored = await page.evaluate(
      ({ sub, dealId }) => localStorage.getItem(`dealfeed.read.${sub}:${dealId}`),
      { sub: SUBSCRIBER_ID, dealId: 'deal-1' }
    );
    expect(stored).toBe('true');
  });

  // F8 — Right-click → Mark Hot fires the feedback request.
  // PRD: "Right-click row → menu appears at click coords. Click Mark Hot →
  //       PATCH /feedback fires with 'hot'." Two corrections vs the PRD:
  //       (1) the endpoint is POST (not PATCH) — see DealsContext.postFeedback.
  //       (2) the menu item is labeled "Toggle hot" with act="mark_hot".
  //       Right-click on a deal cell selects that row before opening the menu
  //       (selection.js:270), so no separate setup click is needed.
  test('F8: right-click → Mark Hot fires POST /feedback with feedback:hot', async ({ page }) => {
    await authAndOpenSheet(page, { deals: buildFixtureDeals() });

    const shell = page.locator('.nd-excel-shell');

    // deal-2 is NOT hot → toggleHot(d.id, null) computes next='hot'.
    await shell
      .locator('tr.dr[data-id="deal-2"] td[data-col="score"]')
      .click({ button: 'right' });

    const menu = page.locator('.ctx-menu');
    await expect(menu).toBeVisible();
    const markHot = menu.locator('.ctx-item[data-act="mark_hot"]:not(.disabled)');
    await expect(markHot).toBeVisible();

    const [request] = await Promise.all([
      page.waitForRequest((req) =>
        req.method() === 'POST' &&
        req.url().includes('/api/dealfeed/deals/deal-2/feedback')
      ),
      markHot.click(),
    ]);
    // Re-assert method (the waitForRequest predicate already filtered POST,
    // but stating it again at the assertion site makes intent obvious to a
    // future reader who only sees the .postData() call).
    expect(request.method()).toBe('POST');
    expect(JSON.parse(request.postData() || '{}')).toEqual({ feedback: 'hot' });
  });

  // F9 — Notes inline edit fires PATCH /notes.
  // PRD: "Dbl-click notes → input appears; type + blur → PATCH /notes."
  //       Bundle reality: the notes cell renders <input class="ni"> directly
  //       (feed.js:386) — no dbl-click required to enter edit. Typing + blur
  //       fires `change`, which calls saveNote, which PATCHes /:id/notes.
  test('F9: editing notes input fires PATCH /notes with the typed text', async ({ page }) => {
    await authAndOpenSheet(page, { deals: buildFixtureDeals() });

    const shell = page.locator('.nd-excel-shell');
    const noteInput = shell.locator('tr.dr[data-id="deal-1"] td[data-col="notes"] .ni');
    await expect(noteInput).toBeVisible();

    const text = 'follow-up tuesday';
    await noteInput.fill(text);

    const [request] = await Promise.all([
      page.waitForRequest((req) =>
        req.method() === 'PATCH' &&
        req.url().includes('/api/dealfeed/deals/deal-1/notes')
      ),
      noteInput.blur(),
    ]);
    // Re-assert method at the use site: postData() works for any method with
    // a body, but its name suggests POST — the explicit method check keeps
    // the PATCH intent obvious next to the body assertion.
    expect(request.method()).toBe('PATCH');
    expect(JSON.parse(request.postData() || '{}')).toEqual({ notes: text });
  });

  // F11 — Inline expand machinery (no UI trigger yet — flagged in the PR body).
  // PRD: "Dbl-click row gutter → tr.xtr appears below; contains bullets + narr."
  //       Bundle reality: the expand infrastructure exists (ND._toggleExpand
  //       sets xId; rr() renders a sibling <tr class="xr">) but NO UI handler
  //       in the bundle calls it. The gutter's dbl-click is wired to
  //       ND.actions.openDetail (feed.js:622). Also, the rendered class is
  //       `tr.xr`, not `tr.xtr` as the PRD says.
  //
  //       This test exercises the bundle primitive directly so the underlying
  //       machinery stays regression-proof for when a UI trigger is added.
  test('F11: ND._toggleExpand toggles tr.xr presence (machinery-only — no UI trigger yet)', async ({ page }) => {
    await authAndOpenSheet(page, { deals: buildFixtureDeals() });

    const shell = page.locator('.nd-excel-shell');
    await expect(shell.locator('tr.xr')).toHaveCount(0);

    await page.evaluate(() => window.ND?._toggleExpand?.('deal-1'));
    await expect(shell.locator('tr.xr')).toHaveCount(1);
    // The expanded row pulls in details derived from the parent deal.
    await expect(shell.locator('tr.xr').first()).toBeVisible();

    await page.evaluate(() => window.ND?._toggleExpand?.('deal-1'));
    await expect(shell.locator('tr.xr')).toHaveCount(0);
  });

  // F12 — Dbl-click address → /deal/:id navigation.
  // PRD: "Dbl-click address cell → URL becomes /deal/<id>; deal detail page
  //       renders." Bundle reality: any non-editable column on a deal row
  //       routes to openDetail on dbl-click (selection.js:478). EDITABLE_DR_COLS
  //       is { psf, sf, hold } — the address column (data-col="address" per
  //       feed.js:49) is not in that set, so dbl-click goes to openDetail →
  //       navigate(`/deal/${id}`).
  test('F12: dbl-click address cell navigates to /deal/:id', async ({ page }) => {
    await authAndOpenSheet(page, { deals: buildFixtureDeals() });

    const addrCell = page
      .locator('.nd-excel-shell tr.dr[data-id="deal-1"] td[data-col="address"]');
    await expect(addrCell).toBeVisible();

    await addrCell.dblclick();
    await expect(page).toHaveURL(/\/deal\/deal-1$/);
  });

  // F13 — Day tab switch filters the grid.
  // PRD: "Click yesterday's tab in #tabbar → grid filters to yesterday's deals
  //       only." Bundle reality: tabs.js builds .sheet-tab[data-day=YYYY-MM-DD]
  //       buttons for every day in the active calendar week (Mon–Sun). The
  //       fixture's sibling-day stays inside the current week so the tab is
  //       always visible without first clicking prev/next-week.
  //       currentDataset() filters ND.deals to d.deliveredOn === activeDay.
  test('F13: clicking sibling-day tab filters the grid to that day deals only', async ({ page }) => {
    await authAndOpenSheet(page, { deals: buildFixtureDeals() });

    const shell = page.locator('.nd-excel-shell');
    const siblingKey = BUNDLE_SIBLING;

    // Initial: today's tab is active, deal-1 + deal-2 visible.
    await expect(shell.locator('tr.dr')).toHaveCount(2);
    const todayIds = await shell
      .locator('tr.dr')
      .evaluateAll((rows) => rows.map((r) => r.dataset.id).sort());
    expect(todayIds).toEqual(['deal-1', 'deal-2']);

    const siblingTab = shell.locator(`.sheet-tab[data-day="${siblingKey}"]`);
    await expect(siblingTab).toBeVisible();
    await siblingTab.click();

    await expect(shell.locator('tr.dr')).toHaveCount(2);
    const siblingIds = await shell
      .locator('tr.dr')
      .evaluateAll((rows) => rows.map((r) => r.dataset.id).sort());
    expect(siblingIds).toEqual(['deal-3', 'deal-4']);
  });
});
