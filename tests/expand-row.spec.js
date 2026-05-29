// Inline-expand row regression net (PR #14 follow-up).
//
// Brady's outcome spec on 2026-05-28:
//   "Double-click any deal → inline expand row appears with property image,
//    brief, AI narrative, thumbs/save/hot/flag, an 'Open Deal Room' link
//    that navigates to /deal/:id, and a chat discuss button."
//
// This spec locks the two regressions Brady caught during manual smoke:
//   1. The .sat-tile was a CSS placeholder (fixed in commit 07edd4e by
//      wiring Mapbox Static API — verified here by asserting an <img.sat-img>
//      element renders with a Mapbox URL when the deal has lat/lng).
//   2. The "Open Deal Room" link used a hash-routing href `#/deal-room/:id`
//      from the legacy single-page-bundle convention (queued audit item B3 —
//      fixed in this PR by changing to `/deal/:id` so React Router catches it).
//
// Requires `npm run dev` on localhost:5173.

import { test, expect } from '@playwright/test';

const SUBSCRIBER_ID = 'test-uuid-1';

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function todayNoonUTC() {
  // Mid-day UTC so the local-TZ Y-M-D matches the host's today across
  // US/EU CI runners. The bundle's calendar derives activeDay from
  // ND.todayISO (PR #13 dynamic-date fix), so a real-today fixture matches.
  return `${ymd(new Date())}T12:00:00Z`;
}

function makeDeal(overrides = {}) {
  return {
    id: '90bfc8c9-f93a-40d6-84e1-be120ace88c4',
    addr: '17101 HURON ST',
    address: '17101 HURON ST',
    property_city: 'BROOMFIELD',
    property_state: 'CO',
    property_zip: '80023',
    score: 92,
    sf: 164372,
    value: 6170330,
    asset: 'Self Storage / Mini-Warehouse',
    lat: 40.005138,
    lng: -104.991611,
    sentAt: todayNoonUTC(),
    buyBoxId: 'bb-1',
    entityType: 'LLC/Corp',
    feedback: null,
    saved: false,
    notes: '',
    stage: 'New',
    signals: [
      { tag: 'LLC Absentee Owner', category: 'ownership' },
    ],
    briefJson: {
      bullets: [
        { label: 'Owner:', body: 'LLC absentee.' },
      ],
      summary: 'Self-storage facility.',
    },
    ...overrides,
  };
}

async function authAndOpenWithDeal(page, deal = makeDeal()) {
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
        buy_boxes: [{ id: 'bb-1', name: 'self storage', asset_classes: ['self_storage'] }],
      }),
    })
  );
  await page.route('**/api/dealfeed/deals', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ deals: [deal] }),
    })
  );
  await page.route('**/api/dealfeed/deals/dashboard/kpis', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        unread_count: 0, new_this_week: 0, response_rate: 0, hot_deals: 0,
      }),
    })
  );
  // Write-path stubs so PATCH/POST inside the expanded row don't 4xx
  for (const path of ['feedback', 'notes', 'stage', 'status', 'save']) {
    await page.route(`**/api/dealfeed/deals/*/${path}`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
  }

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.evaluate(() => localStorage.setItem('nd_token', 'mock-test-token'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Deal Sheet/i }).click();
  await page.waitForTimeout(3000);
  await expect(page.locator('.nd-excel-shell')).toBeVisible();
}

test.describe('Inline expand row', () => {
  test('dbl-click row gutter toggles tr.xr beneath the deal row', async ({ page }) => {
    const deal = makeDeal();
    await authAndOpenWithDeal(page, deal);

    const shell = page.locator('.nd-excel-shell');
    await expect(shell.locator(`tr.dr[data-id="${deal.id}"]`)).toBeVisible();
    await expect(shell.locator('tr.xr')).toHaveCount(0);

    // Dblclick the gutter cell (the row number column)
    await shell.locator(`tr.dr[data-id="${deal.id}"] td.gutter`).dblclick();
    await expect(shell.locator('tr.xr')).toHaveCount(1);

    // Toggle off
    await shell.locator(`tr.dr[data-id="${deal.id}"] td.gutter`).dblclick();
    await expect(shell.locator('tr.xr')).toHaveCount(0);
  });

  test('expanded row "Open Deal Room" link points to /deal/:id (NOT legacy hash routing)', async ({ page }) => {
    const deal = makeDeal();
    await authAndOpenWithDeal(page, deal);

    const shell = page.locator('.nd-excel-shell');
    await shell.locator(`tr.dr[data-id="${deal.id}"] td.gutter`).dblclick();
    await expect(shell.locator('tr.xr')).toHaveCount(1);

    // The link should be a React-Router-compatible path, not a hash URL.
    const link = shell.locator('tr.xr a.act-btn.primary[href]');
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toBe(`/deal/${deal.id}`);
    expect(href).not.toMatch(/^#\/deal-room\//);
  });

  test('expanded row renders a real Mapbox satellite image for deals with lat/lng', async ({ page }) => {
    const deal = makeDeal();
    await authAndOpenWithDeal(page, deal);

    const shell = page.locator('.nd-excel-shell');
    await shell.locator(`tr.dr[data-id="${deal.id}"] td.gutter`).dblclick();

    const satTile = shell.locator('tr.xr .sat-tile');
    await expect(satTile).toBeVisible();
    await expect(satTile).toHaveClass(/has-img/);

    const img = satTile.locator('img.sat-img');
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).toContain('api.mapbox.com/styles/v1/mapbox/satellite');
    expect(src).toContain(`${deal.lng},${deal.lat}`);
  });

  test('expanded row falls back to CSS placeholder when deal has no coordinates', async ({ page }) => {
    const deal = makeDeal({ lat: null, lng: null, briefJson: { ...makeDeal().briefJson, lat: null, lng: null } });
    await authAndOpenWithDeal(page, deal);

    const shell = page.locator('.nd-excel-shell');
    await shell.locator(`tr.dr[data-id="${deal.id}"] td.gutter`).dblclick();

    const satTile = shell.locator('tr.xr .sat-tile');
    await expect(satTile).toBeVisible();
    await expect(satTile).not.toHaveClass(/has-img/);
    await expect(satTile.locator('img.sat-img')).toHaveCount(0);
  });

  test('expand row "Go to map" button (.aico.mp) navigates to /map?focus=:id', async ({ page }) => {
    const deal = makeDeal();
    await authAndOpenWithDeal(page, deal);

    const shell = page.locator('.nd-excel-shell');
    await shell.locator(`tr.dr[data-id="${deal.id}"] td.gutter`).dblclick();

    const mapBtn = shell.locator('tr.xr .aico.mp[data-act="mp"]');
    await expect(mapBtn).toBeVisible();
    await mapBtn.click();

    await expect(page).toHaveURL(new RegExp(`/map\\?focus=${deal.id}$`));
  });
});
