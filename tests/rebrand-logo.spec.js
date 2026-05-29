// Logo rebrand: nightdrop → propcloud, with theme-aware swap.
//
// Brady's spec on 2026-05-28: "We are removing nightdrop logo and updating
// it with the propcloud logo." Plus Step 0 visual audit showed the current
// nightdrop-logo.png renders poorly in light theme (white-fill brand text
// invisible on white header background).
//
// This spec locks two regressions:
//   1. TopHeader renders the propcloud logo (not nightdrop)
//   2. The logo image source swaps between light and dark theme variants

import { test, expect } from '@playwright/test';

async function authAndOpenWithTheme(page, theme = 'dark') {
  await page.route('**/api/dealfeed/auth/me', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ subscriber: { id: 'test-uuid-1', email: 'test@test.com', full_name: 'Tester' } }) })
  );
  await page.route('**/api/dealfeed/buy-boxes', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ buy_boxes: [] }) })
  );
  await page.route('**/api/dealfeed/deals', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deals: [] }) })
  );
  await page.route('**/api/dealfeed/deals/dashboard/kpis', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unread_count: 0, new_this_week: 0, response_rate: 0, hot_deals: 0 }) })
  );
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('nd_token', 'mock-test-token');
    localStorage.setItem('nightdrop-theme', t);
  }, theme);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
}

test.describe('Logo rebrand to propcloud (theme-aware)', () => {
  test('TopHeader logo alt text is "propcloud.ai" (not Nightdrop)', async ({ page }) => {
    await authAndOpenWithTheme(page, 'dark');
    const logo = page.locator('.top-header-logo').first();
    await expect(logo).toBeVisible();
    const alt = await logo.getAttribute('alt');
    expect(alt).toMatch(/propcloud/i);
    expect(alt).not.toMatch(/nightdrop/i);
  });

  test('TopHeader logo source in DARK theme uses the dark-bg variant', async ({ page }) => {
    await authAndOpenWithTheme(page, 'dark');
    const logo = page.locator('.top-header-logo').first();
    const src = await logo.getAttribute('src');
    expect(src).toMatch(/propcloud-logo-dark/);
    expect(src).not.toMatch(/nightdrop/);
  });

  test('TopHeader logo source in LIGHT theme uses the light-bg variant', async ({ page }) => {
    await authAndOpenWithTheme(page, 'light');
    const logo = page.locator('.top-header-logo').first();
    const src = await logo.getAttribute('src');
    expect(src).toMatch(/propcloud-logo-light/);
    expect(src).not.toMatch(/nightdrop/);
  });

  test('HTML title is "propcloud.ai"', async ({ page }) => {
    await authAndOpenWithTheme(page);
    await expect(page).toHaveTitle(/propcloud/i);
  });
});
