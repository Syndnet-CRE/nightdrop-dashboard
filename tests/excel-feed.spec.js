// Phase 4 Playwright coverage of the Deal Feed Excel cutover (PRD flows F1–F14).
//
// This spec ships in STAGES because each PRD flow needs different fixture work:
//
//   Stage 1 (THIS FILE, today): F1, F3, F14
//     Chrome flows that pass with an empty deals mock. The shell renders, the
//     toolbar is wired, the density toggle re-renders rows. No backend
//     mutation routes needed.
//
//   Stage 2 (next session): F2, F5, F8, F9, F11, F12, F13
//     Need a non-empty deals fixture flowing through publishToBundle so the
//     grid renders real `tr.dr` rows. Stage 2 will add a fixture helper
//     (3–5 deals across 2 days, host-shape) and the PATCH route mocks for
//     hot/notes/stage feedback.
//
//   Stage 3 (later): F4 per-column filter, F6 range-copy-as-TSV,
//     F7 bulk-set-stage, F10 stage dropdown.
//     Clipboard permissions, drag-mouse choreography, PATCH sequencing.
//
// Why split: writing all 14 in one PR would either flake on data-flow setup
// or balloon scope past one clean review. Stage 1 locks the chrome surface
// first; Stage 2/3 extend with confidence the harness works.
//
// Requires: `npm run dev` on localhost:5173. `playwright.config.js` sets
// `webServer: null` per project convention.

import { test, expect } from '@playwright/test';

async function authAndOpenSheet(page, { deals = [] } = {}) {
  await page.route('**/api/dealfeed/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        subscriber: { id: 'test-uuid-1', email: 'test@test.com', full_name: 'Tester' },
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
