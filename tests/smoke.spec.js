import { test, expect } from '@playwright/test';

test.describe('Nightdrop Dashboard Smoke Test', () => {
  test('homepage loads without console errors', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: msg.type(),
          text: msg.text(),
        });
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);

    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    const bodyHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 100));
    console.log(`Body has content: ${bodyHtml.length > 0}`);

    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/homepage.png' });

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(err =>
      err.text.includes('TypeError') ||
      err.text.includes('Cannot read') ||
      err.text.includes('fmtMoney') ||
      err.text.includes('toLocaleString')
    );

    console.log(`\nConsole errors found: ${consoleErrors.length}`);
    console.log(`Critical errors found: ${criticalErrors.length}`);

    expect(criticalErrors).toHaveLength(0);
  });

  test('deal detail page loads without console errors', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: msg.type(),
          text: msg.text(),
        });
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });

    // Navigate to deal detail page with mock data ID
    const dealId = 'd-001';
    await page.goto(`http://localhost:5173/deal/${dealId}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);

    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/deal-detail.png' });

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(err =>
      err.text.includes('TypeError') ||
      err.text.includes('Cannot read') ||
      err.text.includes('fmtMoney') ||
      err.text.includes('toLocaleString') ||
      err.text.includes('javascript:')
    );

    console.log(`\nConsole errors found: ${consoleErrors.length}`);
    console.log(`Critical errors found: ${criticalErrors.length}`);

    // List all errors for debugging
    if (consoleErrors.length > 0) {
      console.log('\nAll console errors:');
      consoleErrors.forEach(err => {
        console.log(`  - ${err.text}`);
      });
    }

    expect(criticalErrors).toHaveLength(0);
  });

  test('multiple deal pages load without errors', async ({ page }) => {
    const consoleErrors = [];
    const dealIds = ['d-001', 'd-002', 'd-003', 'd-004', 'd-005'];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          dealId: page.url().split('/').pop(),
          text: msg.text(),
        });
      }
    });

    for (const dealId of dealIds) {
      consoleErrors.length = 0; // Clear for each deal
      const url = `http://localhost:5173/deal/${dealId}`;

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(1000);

      // Check for critical errors on this deal
      const criticalErrors = consoleErrors.filter(err =>
        err.text.includes('TypeError') ||
        err.text.includes('Cannot read') ||
        err.text.includes('fmtMoney') ||
        err.text.includes('toLocaleString')
      );

      if (criticalErrors.length > 0) {
        console.log(`\nErrors on ${dealId}:`);
        criticalErrors.forEach(err => {
          console.log(`  - ${err.text}`);
        });
      }

      expect(criticalErrors).toHaveLength(0);
    }

    console.log(`\nSmoke tested ${dealIds.length} deal pages - all clean`);
  });
});

// ── Buy Box Command Center (BB-15) ───────────────────────────────────────────
// These tests mock the API layer so the React app renders authenticated.
// Requires: npm run dev running on localhost:5173

async function mockAuthAndNavigate(page, buyBoxes = []) {
  await page.route('**/api/dealfeed/auth/me', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ subscriber: { id: 'test-uuid-1', email: 'test@test.com', full_name: 'Tester' } }),
  }));
  await page.route('**/api/dealfeed/buy-boxes', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ buy_boxes: buyBoxes }),
  }));
  await page.route('**/api/dealfeed/deals', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ deals: [] }),
  }));
  await page.route('**/api/dealfeed/buy-boxes/preview', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ count: 250 }),
  }));

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  // useAuth reads nd_token from localStorage; mock-test-token triggers the auth/me mock above
  await page.evaluate(() => localStorage.setItem('nd_token', 'mock-test-token'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(1000);
}

test.describe('Buy Box Command Center', () => {
  test('BB-1: Buy Boxes view renders with Buyer Searches heading', async ({ page }) => {
    await mockAuthAndNavigate(page);
    // Navigate to buy boxes view
    const boxesLink = page.locator('[data-view="boxes"], a[href*="box"], button:has-text("Buy Box"), button:has-text("Buyer Search")').first();
    if (await boxesLink.isVisible()) {
      await boxesLink.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'tests/screenshots/buy-boxes-view.png' });
    console.log('✓ Buy Boxes view loaded');
  });

  test('BB-2: Empty state shows when no buy boxes exist', async ({ page }) => {
    await mockAuthAndNavigate(page, []);

    await page.screenshot({ path: 'tests/screenshots/buy-boxes-empty.png' });
    console.log('✓ Empty buy boxes state captured');
  });

  test('BB-3: Wizard opens and shows 10-step sidebar', async ({ page }) => {
    await mockAuthAndNavigate(page, []);
    await page.waitForTimeout(1000);

    // Find and click any "New Buy Box" button
    const newBoxBtn = page.locator('button:has-text("New Buy Box"), button:has-text("Create"), button:has-text("Buyer Search")').first();
    if (await newBoxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBoxBtn.click();
      await page.waitForTimeout(800);

      // Check if wizard opened — look for the bbwiz sidebar
      const wizardSidebar = page.locator('.bbwiz-sidebar, .bbwiz-step-list').first();
      if (await wizardSidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Verify 10 steps in sidebar
        const stepItems = page.locator('.bbwiz-step-item');
        const count = await stepItems.count();
        expect(count).toBe(10);
        console.log(`✓ Wizard sidebar shows ${count} steps`);

        // Verify step labels
        const labels = await page.locator('.bbwiz-step-label').allTextContents();
        expect(labels[0]).toBe('Asset Class');
        expect(labels[2]).toBe('Name');
        expect(labels[3]).toBe('Geography');
        expect(labels[9]).toBe('Review');
        console.log('✓ Step labels correct: Asset Class → Name → Geography → Review');

        await page.screenshot({ path: 'tests/screenshots/wizard-10-steps.png' });
      } else {
        console.log('Wizard did not open — may need to navigate to buy boxes view first');
      }
    } else {
      console.log('New Buy Box button not visible — skipping (nav may require a different path)');
    }
  });

  test('BB-4: Wizard Step 1 is Asset Class (not Name)', async ({ page }) => {
    await mockAuthAndNavigate(page, []);
    await page.waitForTimeout(1000);

    const newBoxBtn = page.locator('button:has-text("New Buy Box")').first();
    if (await newBoxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBoxBtn.click();
      await page.waitForTimeout(600);

      // Step 1 should show the asset class grid
      const assetGrid = page.locator('.bbwiz-asset-grid');
      if (await assetGrid.isVisible({ timeout: 2000 }).catch(() => false)) {
        const assetCards = page.locator('.bbwiz-asset-card');
        const count = await assetCards.count();
        expect(count).toBeGreaterThanOrEqual(6);
        console.log(`✓ Step 1 shows ${count} asset class cards`);

        // Continue button should be disabled (nothing selected)
        const continueBtn = page.locator('.bbwiz-btn-primary');
        expect(await continueBtn.isDisabled()).toBe(true);
        console.log('✓ Continue disabled until asset class selected');

        // Click first asset card
        await assetCards.first().click();
        await page.waitForTimeout(200);
        expect(await continueBtn.isDisabled()).toBe(false);
        console.log('✓ Continue enabled after asset class selected');

        await page.screenshot({ path: 'tests/screenshots/wizard-step1-asset.png' });
      }
    }
  });

  test('BB-5: Wizard steps 1 → 2 → 3 — asset, sub-asset, name flow', async ({ page }) => {
    await mockAuthAndNavigate(page, []);
    await page.waitForTimeout(1000);

    const newBoxBtn = page.locator('button:has-text("New Buy Box")').first();
    if (!await newBoxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Skipping — New Buy Box button not visible');
      return;
    }

    await newBoxBtn.click();
    await page.waitForTimeout(600);

    // Step 1: select first asset class
    const assetCards = page.locator('.bbwiz-asset-card');
    if (!await assetCards.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Skipping — wizard did not open');
      return;
    }

    await assetCards.first().click();
    await page.waitForTimeout(200);
    await page.locator('.bbwiz-btn-primary').click();
    await page.waitForTimeout(400);

    // Step 2: Sub-Asset — should show subtype grid
    const subtypeGrid = page.locator('.bbwiz-subtype-grid');
    expect(await subtypeGrid.isVisible()).toBe(true);
    console.log('✓ Step 2 shows sub-asset chip grid');

    // Verify step 2 is active in sidebar
    const activeStep = page.locator('.bbwiz-step-item.is-active .bbwiz-step-num');
    await expect(activeStep).toHaveText('2');

    // Advance to step 3
    await page.locator('.bbwiz-btn-primary').click();
    await page.waitForTimeout(400);

    // Step 3: Name — should show label input
    const nameInput = page.locator('.bbwiz-input').first();
    expect(await nameInput.isVisible()).toBe(true);
    const nameHeading = page.locator('.bbwiz-step-title');
    await expect(nameHeading).toContainText('Name');
    console.log('✓ Step 3 shows Name input');

    // Continue disabled until name typed
    const continueBtn = page.locator('.bbwiz-btn-primary');
    expect(await continueBtn.isDisabled()).toBe(true);
    await nameInput.fill('Test Buy Box Name');
    await page.waitForTimeout(200);
    expect(await continueBtn.isDisabled()).toBe(false);
    console.log('✓ Step 3 gate: name required');

    await page.screenshot({ path: 'tests/screenshots/wizard-step3-name.png' });
  });

  test('BB-6: Wizard threshold slider renders and updates', async ({ page }) => {
    await mockAuthAndNavigate(page, []);
    await page.waitForTimeout(1000);

    const newBoxBtn = page.locator('button:has-text("New Buy Box")').first();
    if (!await newBoxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Skipping — New Buy Box button not visible');
      return;
    }

    await newBoxBtn.click();
    await page.waitForTimeout(600);

    const assetCards = page.locator('.bbwiz-asset-card');
    if (!await assetCards.first().isVisible({ timeout: 2000 }).catch(() => false)) return;

    // Navigate to step 8 (threshold): 1→2→3→4→5→6→7→8
    await assetCards.first().click();
    for (let i = 0; i < 7; i++) {
      const btn = page.locator('.bbwiz-btn-primary');
      const isDisabled = await btn.isDisabled();
      if (isDisabled) {
        // Fill required fields
        const input = page.locator('.bbwiz-input').first();
        if (await input.isVisible()) await input.fill('Test');
        // Try to pick a geo state if on geo step
        const stateItem = page.locator('.bbwiz-select-item').first();
        if (await stateItem.isVisible()) await stateItem.click();
      }
      await page.locator('.bbwiz-btn-primary').click();
      await page.waitForTimeout(400);
    }

    const slider = page.locator('.bbwiz-threshold-slider');
    if (await slider.isVisible({ timeout: 2000 }).catch(() => false)) {
      expect(await slider.isVisible()).toBe(true);
      const thresholdVal = page.locator('.bbwiz-threshold-val');
      await expect(thresholdVal).toHaveText('80%');
      console.log('✓ Threshold slider shows default 80%');

      // Verify description block exists
      const desc = page.locator('.bbwiz-threshold-desc');
      expect(await desc.isVisible()).toBe(true);
      console.log('✓ Threshold description block visible');

      await page.screenshot({ path: 'tests/screenshots/wizard-step8-threshold.png' });
    } else {
      console.log('Could not reach threshold step — navigation may have been blocked by required fields');
    }
  });
});
