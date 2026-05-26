// Acceptance for /dealsheet route + persistence (PR A).
//
// Verifies:
//  - Legacy /dashboard and /calendar URLs redirect to /dealsheet.
//  - Deal Feed nav navigates to /dealsheet and mounts the vendor shell.
//  - After two navigate-away-and-back cycles, the same #tw DOM node persists
//    with its `selWired='1'` flag — proving the bundle's element-level
//    listeners (contextmenu, mousedown, dblclick, mousemove) were never
//    re-attached because the wrapper was never unmounted.
//  - Right-click on a cell shows .ctx-menu (was bug #1).
//  - Clicking a column-header .tri shows .nd-filter-pop (was bug #2).
//
// Requires: `npm run dev` running on localhost:5173. `playwright.config.js`
// sets `webServer: null` per project convention.

import { test, expect } from '@playwright/test';

async function authAndOpenApp(page, startPath = '/') {
  // Mock the small set of API endpoints the wrapper hits on first mount.
  // Empty deals + a single buy box keep the UI in a deterministic shape
  // (table renders the empty-state row + 10 numbered filler rows).
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
      body: JSON.stringify({ deals: [] }),
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

  await page.goto(`http://localhost:5173${startPath}`, {
    waitUntil: 'domcontentloaded',
    timeout: 10000,
  });
  await page.evaluate(() => localStorage.setItem('nd_token', 'mock-test-token'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(800);
}

test.describe('Dealsheet route + persistence', () => {
  test('legacy /dashboard redirects to /dealsheet', async ({ page }) => {
    await authAndOpenApp(page, '/dashboard');
    await page.waitForTimeout(600);
    expect(page.url()).toContain('/dealsheet');
  });

  test('legacy /calendar redirects to /dealsheet', async ({ page }) => {
    await authAndOpenApp(page, '/calendar');
    await page.waitForTimeout(600);
    expect(page.url()).toContain('/dealsheet');
  });

  test('Deal Feed nav navigates to /dealsheet and mounts the shell', async ({ page }) => {
    await authAndOpenApp(page);
    await page.getByRole('button', { name: /Deal Feed/i }).click();
    await page.waitForTimeout(3000); // lazy chunk + bundle IIFEs
    expect(page.url()).toContain('/dealsheet');
    await expect(page.locator('.nd-excel-shell')).toBeVisible();
  });

  test('#tw DOM node + listeners survive navigate-away-and-back x2', async ({ page }) => {
    await authAndOpenApp(page);

    // First visit — bundle IIFEs run, listeners attach to #tw.
    await page.getByRole('button', { name: /Deal Feed/i }).click();
    await page.waitForTimeout(3000);

    // Tag the initial #tw node so we can detect a remount.
    await page.evaluate(() => {
      const tw = document.getElementById('tw');
      if (tw) tw.dataset.probeTag = 'INITIAL_MOUNT';
    });

    // Two away-and-back cycles. Verify the URL actually leaves /dealsheet
    // and the shell hides on the away step — otherwise the sync effect would
    // be silently snapping the view back.
    for (let i = 1; i <= 2; i++) {
      await page.getByRole('button', { name: /^Map$/i }).click();
      await page.waitForTimeout(600);
      expect(page.url(), `cycle ${i}: URL leaves /dealsheet`).not.toContain('/dealsheet');
      // Shell host is rendered but display:none — check it's hidden.
      const hostHidden = await page.locator('[data-dealsheet-host]').evaluate(
        (el) => getComputedStyle(el).display === 'none'
      );
      expect(hostHidden, `cycle ${i}: dealsheet host is hidden on Map`).toBe(true);

      await page.getByRole('button', { name: /Deal Feed/i }).click();
      await page.waitForTimeout(500);

      const persist = await page.evaluate(() => {
        const tw = document.getElementById('tw');
        return tw
          ? { probeTag: tw.dataset.probeTag, selWired: tw.dataset.selWired }
          : null;
      });
      expect(persist, `cycle ${i}: #tw must persist`).not.toBeNull();
      expect(persist.probeTag, `cycle ${i}: same DOM node`).toBe('INITIAL_MOUNT');
      expect(persist.selWired, `cycle ${i}: bundle listeners stay wired`).toBe('1');
      expect(page.url()).toContain('/dealsheet');
    }
  });

  test('right-click shows context menu after two cycles', async ({ page }) => {
    await authAndOpenApp(page);
    await page.getByRole('button', { name: /Deal Feed/i }).click();
    await page.waitForTimeout(3000);

    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /^Map$/i }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: /Deal Feed/i }).click();
      await page.waitForTimeout(400);
    }

    const firstRow = page.locator('.nd-excel-shell table#grid tbody tr').first();
    await firstRow.click({ button: 'right' });
    await expect(page.locator('.ctx-menu')).toBeVisible({ timeout: 2000 });
  });

  test('column-header filter triangle opens popover after two cycles', async ({ page }) => {
    await authAndOpenApp(page);
    await page.getByRole('button', { name: /Deal Feed/i }).click();
    await page.waitForTimeout(3000);

    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /^Map$/i }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: /Deal Feed/i }).click();
      await page.waitForTimeout(400);
    }

    const tri = page.locator('.nd-excel-shell .tri').first();
    await tri.click();
    await expect(page.locator('.nd-filter-pop')).toBeVisible({ timeout: 2000 });
  });

  test('Calendar nav item is removed from the LeftPanel', async ({ page }) => {
    await authAndOpenApp(page);
    // The nav button that used to navigate to the calendar view should be gone.
    // Deal Feed remains.
    await expect(page.getByRole('button', { name: /^Calendar$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Deal Feed/i })).toBeVisible();
  });
});
