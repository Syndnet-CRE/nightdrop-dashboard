// V1 deal-detail (/deal/:id) page regression net.
//
// Per the 2026-05-28 audit Brady triggered after seeing a large gray gap
// below the satellite map on a real-data deal: the DealHero left column
// (satellite/photo card) was rendering at 480px tall while the parent
// grid stretched the row to ~900px because the right column had 8
// distress signals. The hardcoded `height: 480` on the Mapbox mount
// point, the photo placeholder, and the satellite wrapper meant the
// inner content never filled the stretched container, leaving the card
// background showing through as empty gray space.
//
// This spec asserts the inverse — the Mapbox canvas's clientHeight is
// within a small tolerance of the outer container's clientHeight when
// the right column is tall enough to force the grid row to stretch.
//
// Requires `npm run dev` on localhost:5173.

import { test, expect } from '@playwright/test';

const SUBSCRIBER_ID = 'test-uuid-1';
const DEAL_ID = '92147b26-7ce9-4a8f-94b3-c66c7d7f77e6';

function tallDeal() {
  // 8 distress signals + owner card + confidence + KPI strip — mirrors the
  // shape that surfaced the bug on Brady's real account data.
  return {
    id: DEAL_ID,
    addr: '7581 E ACADEMY BLVD',
    address: '7581 E ACADEMY BLVD',
    property_city: 'DENVER',
    property_state: 'CO',
    property_zip: '80230',
    score: 7,
    sf: 124147,
    value: 5_190_000,
    asset: 'Self Storage / Mini-Warehouse',
    lat: 39.706,
    lng: -104.881,
    sentAt: new Date().toISOString(),
    buyBoxId: 'bb-1',
    entityType: 'LLC',
    owner: 'HANGAR 2 PARTNERS LLC',
    feedback: null,
    saved: false,
    notes: '',
    stage: 'New',
    signals: [
      { tag: '15-Year Hold — Natural Exit Window', category: 'distress' },
      { tag: 'No Visible Mortgage — Clean Capital Stack', category: 'financial' },
      { tag: 'C-MX-8 Zoning — Vertical Redevelopment Entitled', category: 'development' },
      { tag: 'Absentee Private LLC Owner', category: 'ownership' },
      { tag: 'High Annual Tax Burden ($411K) — Cash Flow Pressure', category: 'financial' },
      { tag: '1987 Vintage — CapEx Cycle Due', category: 'distress' },
      { tag: 'Anomalously Low Unit Count — Data Gap or Large-Format Asset', category: 'financial' },
      { tag: 'Lowry/Denver Infill Location — Land Value Premium', category: 'location' },
    ],
    briefJson: {
      bullets: [{ label: 'Owner:', body: 'LLC absentee.' }],
      summary: 'Self-storage facility.',
    },
  };
}

async function authAndOpenDealPage(page, deal = tallDeal()) {
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
  // V1 deal-detail uses these endpoints — stub them so the page doesn't error
  await page.route('**/api/dealfeed/owner-portfolio/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ totals: {}, properties: [] }) })
  );
  await page.route('**/api/dealfeed/deals/*/contacts', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contacts: [] }) })
  );
  await page.route('**/api/dealfeed/deals/*/notes', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  );

  // Auth via reload so the token's in storage
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.evaluate(() => localStorage.setItem('nd_token', 'mock-test-token'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(800);

  // Navigate to the V1 deal page directly
  await page.goto(`http://localhost:5173/deal/${deal.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(1500); // V1 components mount + Mapbox init
}

test.describe('Deal Detail V1 — Hero layout', () => {
  test('Mapbox canvas fills the full height of the Hero left column', async ({ page }) => {
    await authAndOpenDealPage(page);

    // Wait for the map container + canvas to exist with non-zero size
    const container = page.locator('[data-testid="hero-map-container"]');
    await expect(container).toBeVisible();
    const canvas = page.locator('.mapboxgl-canvas').first();
    await expect(canvas).toBeVisible();

    // Give Mapbox + ResizeObserver a moment to settle the post-stretch size
    await page.waitForTimeout(500);

    const sizes = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="hero-map-container"]');
      const m = document.querySelector('.mapboxgl-canvas');
      return {
        containerHeight: c ? c.clientHeight : null,
        canvasHeight: m ? m.clientHeight : null,
      };
    });
    expect(sizes.containerHeight).not.toBeNull();
    expect(sizes.canvasHeight).not.toBeNull();
    // Container should have stretched past 480 (the old hardcoded height)
    // because the 8 distress signals + owner card + confidence + KPI row push
    // the right column tall. ≥ 600 is a sensible floor that fails on bug, passes on fix.
    expect(sizes.containerHeight).toBeGreaterThan(600);
    // Canvas should fill the container within a small tolerance (1-2px borders
    // + sub-pixel rounding). The bug renders the canvas at 480 while the
    // container stretches to ~900 — fails by a wide margin.
    expect(sizes.canvasHeight).toBeGreaterThanOrEqual(sizes.containerHeight - 4);
  });
});
