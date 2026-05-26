// Acceptance for /dealsheet route + persistence (PR A).
//
// Verifies:
//  - Legacy /dashboard and /calendar URLs redirect to /dealsheet.
//  - Deal Sheet nav navigates to /dealsheet and mounts the vendor shell.
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

  test('Deal Sheet nav navigates to /dealsheet and mounts the shell', async ({ page }) => {
    await authAndOpenApp(page);
    await page.getByRole('button', { name: /Deal Sheet/i }).click();
    await page.waitForTimeout(3000); // lazy chunk + bundle IIFEs
    expect(page.url()).toContain('/dealsheet');
    await expect(page.locator('.nd-excel-shell')).toBeVisible();
  });

  test('#tw DOM node + listeners survive navigate-away-and-back x2', async ({ page }) => {
    await authAndOpenApp(page);

    // First visit — bundle IIFEs run, listeners attach to #tw.
    await page.getByRole('button', { name: /Deal Sheet/i }).click();
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

      await page.getByRole('button', { name: /Deal Sheet/i }).click();
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

  test('right-click shows context menu at click coords with fixed positioning', async ({ page }) => {
    await authAndOpenApp(page);
    await page.getByRole('button', { name: /Deal Sheet/i }).click();
    await page.waitForTimeout(3000);

    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /^Map$/i }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: /Deal Sheet/i }).click();
      await page.waitForTimeout(400);
    }

    // Pick a stable cell that's safely inside the viewport (avoid the empty-
    // state row whose single colspan'd td can be anywhere). Use cell (2, 3).
    const cell = page.locator(
      '.nd-excel-shell table#grid tbody tr[data-r="2"] td[data-c="3"]'
    );
    const cellBox = await cell.boundingBox();
    expect(cellBox).not.toBeNull();
    const clickX = cellBox.x + cellBox.width / 2;
    const clickY = cellBox.y + cellBox.height / 2;

    await page.mouse.move(clickX, clickY);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });

    const menu = page.locator('.ctx-menu');
    await expect(menu).toBeVisible({ timeout: 2000 });

    // The toBeVisible() check alone is not sufficient — a portaled element
    // missing its scoped CSS rules would still pass it (non-zero size, not
    // display:none) while rendering as a static block at the bottom of the
    // page. Verify the menu actually adopted its position:fixed style AND
    // is rendered at the click coordinates.
    const menuInfo = await menu.evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        position: cs.position,
        zIndex: cs.zIndex,
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
      };
    });
    expect(menuInfo.position, '.ctx-menu must be position: fixed').toBe('fixed');
    expect(Number(menuInfo.zIndex), '.ctx-menu must have stacking context').toBeGreaterThan(0);
    expect(menuInfo.w, '.ctx-menu must have non-trivial width').toBeGreaterThan(150);
    expect(menuInfo.h, '.ctx-menu must have non-trivial height').toBeGreaterThan(50);
    // Menu should be positioned within ~40px of the click coords. Clamping
    // inside the viewport may shift the box slightly but should still land
    // inside the cell's row neighbourhood.
    expect(
      Math.abs(menuInfo.x - clickX),
      '.ctx-menu x must be near click coord'
    ).toBeLessThan(40);
    expect(
      Math.abs(menuInfo.y - clickY),
      '.ctx-menu y must be near click coord'
    ).toBeLessThan(40);
  });

  test('column-header filter triangle opens popover after two cycles', async ({ page }) => {
    await authAndOpenApp(page);
    await page.getByRole('button', { name: /Deal Sheet/i }).click();
    await page.waitForTimeout(3000);

    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /^Map$/i }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: /Deal Sheet/i }).click();
      await page.waitForTimeout(400);
    }

    const tri = page.locator('.nd-excel-shell .tri').first();
    await tri.click();
    await expect(page.locator('.nd-filter-pop')).toBeVisible({ timeout: 2000 });
  });

  test('Calendar nav item is removed from the LeftPanel', async ({ page }) => {
    await authAndOpenApp(page);
    // The nav button that used to navigate to the calendar view should be gone.
    // Deal Sheet remains.
    await expect(page.getByRole('button', { name: /^Calendar$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Deal Sheet/i })).toBeVisible();
  });

  // Sheets-parity regression lock. After PR `fix/cell-selection-vs-edit-indicators`:
  //   - left-click on a cell shows exactly one rectangle (the outer .sel-rect),
  //     no inner rectangle, no green wash on the single-cell anchor.
  //   - right-click opens the context menu without focusing the contenteditable
  //     span and without adding `td.editing`.
  //   - dblclick enters edit mode (state-tracking `td.editing` still set), but
  //     the cell renders no extra visual indicator. Caret lands at the END of
  //     existing content (Sheets-exact).
  test('Sheets parity: cell selection and edit-mode visuals', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const targetCellSel = '.nd-excel-shell table#grid tbody tr[data-r="2"] td[data-c="3"]';
    const TINT = 'rgba(45, 162, 0, 0.1)';

    async function open(page) {
      await page.route('**/api/dealfeed/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ subscriber: { id: 'u', email: 't@t.com', full_name: 'T' } }) }));
      await page.route('**/api/dealfeed/buy-boxes', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ buy_boxes: [{ id: 'b', name: 'b', asset_classes: ['self_storage'] }] }) }));
      await page.route('**/api/dealfeed/deals', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deals: [] }) }));
      await page.route('**/api/dealfeed/deals/dashboard/kpis', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unread_count: 0, new_this_week: 0, response_rate: 0 }) }));

      await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.setItem('nd_token', 'mock'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: /Deal Sheet/i }).click();
      await page.waitForTimeout(3000);
    }

    // --- Phase A: left-click → exactly one rectangle, no inner indicator, no wash on anchor. ---
    {
      const page = await ctx.newPage();
      await open(page);
      await page.locator(targetCellSel).click();
      await page.waitForTimeout(200);

      const state = await page.evaluate(({ TINT }) => {
        const rects = document.querySelectorAll('#sel-overlay > .sel-rect').length;
        const editing = document.querySelectorAll('td.editing').length;
        const anchor = document.querySelector('td.sel-anchor');
        const cs = anchor ? getComputedStyle(anchor) : null;
        return {
          rects,
          editingCount: editing,
          tdBoxShadow: cs?.boxShadow,
          tdBgIsTint: cs ? cs.backgroundColor === TINT : null,
        };
      }, { TINT });

      expect(state.rects, 'exactly one selection rectangle after left-click').toBe(1);
      expect(state.editingCount, 'left-click must not add td.editing anywhere').toBe(0);
      expect(state.tdBoxShadow, 'anchor td must have no inset box-shadow').toBe('none');
      expect(state.tdBgIsTint, 'single-cell anchor must NOT have the green wash tint').toBe(false);

      await page.close();
    }

    // --- Phase B: right-click → menu opens, no editing class, span not focused. ---
    {
      const page = await ctx.newPage();
      await open(page);
      const box = await page.locator(targetCellSel).boundingBox();
      await page.mouse.move(box.x + 30, box.y + 15);
      await page.mouse.down({ button: 'right' });
      await page.mouse.up({ button: 'right' });
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => {
        const td = document.querySelector('tr[data-r="2"] td[data-c="3"]');
        const span = td?.querySelector('.cell-edit');
        return {
          ctxVisible: !!document.querySelector('.ctx-menu') &&
                      getComputedStyle(document.querySelector('.ctx-menu')).display !== 'none',
          editingCount: document.querySelectorAll('td.editing').length,
          activeIsCellEdit: document.activeElement === span,
          rects: document.querySelectorAll('#sel-overlay > .sel-rect').length,
        };
      });

      expect(state.ctxVisible, 'right-click still opens the context menu').toBe(true);
      expect(state.editingCount, 'right-click must NOT add td.editing').toBe(0);
      expect(state.activeIsCellEdit, 'right-click must NOT focus the .cell-edit span').toBe(false);
      expect(state.rects, 'exactly one selection rectangle after right-click').toBe(1);

      await page.close();
    }

    // --- Phase C: dblclick → enters edit mode. ONE rectangle. No extra visual on td.
    //              activeElement is the span. Caret at end of content (G regression lock). ---
    {
      const page = await ctx.newPage();
      await open(page);
      // Seed the cell with content so the caret-at-end assertion is meaningful.
      // We use direct DOM manipulation because the cell is an empty filler row.
      await page.evaluate(() => {
        const td = document.querySelector('tr[data-r="2"] td[data-c="3"]');
        const span = td?.querySelector('.cell-edit');
        if (span) span.textContent = 'seeded';
      });
      await page.locator(targetCellSel).dblclick();
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => {
        const td = document.querySelector('tr[data-r="2"] td[data-c="3"]');
        const span = td?.querySelector('.cell-edit');
        const sel = window.getSelection();
        const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
        const tdShadow = td ? getComputedStyle(td).boxShadow : null;
        const spanShadow = span ? getComputedStyle(span).boxShadow : null;
        // Determining "caret at end" depends on what node the range is anchored
        // to. When the span has a text child, selectNodeContents(span) +
        // collapse(false) leaves the range with endContainer === span and
        // endOffset === span.childNodes.length (i.e. "after the last child").
        // If a normalize ever folded the range into the text node, endOffset
        // would equal the text length instead. Cover both.
        let caretAtEnd = false;
        if (range && range.collapsed && span) {
          if (range.endContainer === span) {
            caretAtEnd = range.endOffset === span.childNodes.length;
          } else if (range.endContainer.nodeType === 3 /* TEXT_NODE */) {
            caretAtEnd = range.endOffset === range.endContainer.textContent.length;
          }
        }
        return {
          rects: document.querySelectorAll('#sel-overlay > .sel-rect').length,
          tdHasEditing: td?.classList.contains('editing') || false,
          tdBoxShadow: tdShadow,
          spanBoxShadow: spanShadow,
          activeIsCellEdit: document.activeElement === span,
          textContent: span?.textContent || '',
          caretAtEnd,
        };
      });

      expect(state.rects, 'exactly one selection rectangle after dblclick').toBe(1);
      expect(state.tdHasEditing, 'td.editing state is still tracked').toBe(true);
      expect(state.tdBoxShadow, 'td.editing must NOT render an inset box-shadow').toBe('none');
      // The host has a universal :focus-visible { box-shadow: var(--ring-shadow) }
      // rule (styles.css:1450). Without explicit suppression on .cell-edit, the
      // span's focus ring paints a 3px green ring inside the cell on dblclick —
      // visually a second concentric rectangle. This assertion locks that the
      // bundle's .cell-edit suppression covers box-shadow as well as outline.
      expect(state.spanBoxShadow, '.cell-edit span must have no focus box-shadow').toBe('none');
      expect(state.activeIsCellEdit, 'dblclick focuses the .cell-edit span').toBe(true);
      expect(state.textContent, 'seeded content survived dblclick').toBe('seeded');
      expect(state.caretAtEnd, 'caret lands at END of existing content (Sheets-exact, G lock)').toBe(true);

      await page.close();
    }

    await ctx.close();
  });

  // Sheets/Excel parity for caret placement when clicking into an empty filler
  // cell of a numeric column. The column-level right-align rules at
  // styles.css:1847-1855 cascade onto the `.cell-edit` span inside empty filler
  // rows, so the caret renders at the right edge — visually wrong (Sheets puts
  // the caret on the left for empty cells regardless of the column's text-align).
  //
  // The fix is one CSS rule scoped to `tr.empty-row .cell-edit` that forces
  // left-align. This test locks two invariants:
  //   1. Empty filler row `.cell-edit` in psf/sf/hold columns renders LEFT.
  //   2. dr-row `.cell-edit` in psf/sf/hold columns still renders RIGHT
  //      (scope boundary guard — the fix must not bleed into populated rows).
  //
  // The dr-row guard injects a synthetic dr row into the DOM. This intentionally
  // tests the CSS cascade against the selector itself rather than the data
  // pipeline — no deal fixture needed, and the assertion is deterministic.
  test('empty filler row caret: psf/sf/hold .cell-edit left-aligns; dr-row .cell-edit still right-aligns', async ({ page }) => {
    await authAndOpenApp(page);
    await page.getByRole('button', { name: /Deal Sheet/i }).click();
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const numericCols = ['psf', 'sf', 'hold'];

      // (1) Empty filler row assertions on the real DOM.
      const emptyRow = document.querySelector('.nd-excel-shell table#grid tbody tr.empty-row');
      const emptyAligns = {};
      if (emptyRow) {
        for (const key of numericCols) {
          const td = emptyRow.querySelector(`td[data-col="${key}"]`);
          const span = td?.querySelector('.cell-edit');
          emptyAligns[key] = span ? getComputedStyle(span).textAlign : 'NO-SPAN';
        }
      }

      // (2) Synthetic dr row guard — inject a row that mirrors what feed.js
      // would render for a populated deal in the editable numeric columns. If
      // the empty-row left-align rule were too broad (e.g. matched `.cell-edit`
      // unconditionally), this row would also report 'left'.
      const tbody = document.querySelector('.nd-excel-shell table#grid tbody');
      const drTr = document.createElement('tr');
      drTr.className = 'dr';
      drTr.dataset.probeDr = '1';
      drTr.innerHTML = `
        <td class="gutter"></td>
        <td data-col="psf"><span class="cell-edit" contenteditable="true">$10</span></td>
        <td data-col="sf"><span class="cell-edit" contenteditable="true">10000</span></td>
        <td data-col="hold"><span class="cell-edit" contenteditable="true">5y</span></td>
      `;
      tbody.appendChild(drTr);

      const drAligns = {};
      for (const key of numericCols) {
        const span = drTr.querySelector(`td[data-col="${key}"] .cell-edit`);
        drAligns[key] = span ? getComputedStyle(span).textAlign : 'NO-SPAN';
      }

      tbody.removeChild(drTr);

      return {
        emptyRowFound: !!emptyRow,
        emptyAligns,
        drAligns,
      };
    });

    expect(result.emptyRowFound, 'an empty filler row must exist for the test to be meaningful').toBe(true);

    // (1) Empty filler row: psf, sf, hold all left-aligned.
    expect(result.emptyAligns.psf, 'empty-row psf .cell-edit must be left-aligned').toBe('left');
    expect(result.emptyAligns.sf, 'empty-row sf .cell-edit must be left-aligned').toBe('left');
    expect(result.emptyAligns.hold, 'empty-row hold .cell-edit must be left-aligned').toBe('left');

    // (2) Scope boundary guard: dr-row right-align unchanged.
    expect(result.drAligns.psf, 'dr-row psf .cell-edit must STILL be right-aligned').toBe('right');
    expect(result.drAligns.sf, 'dr-row sf .cell-edit must STILL be right-aligned').toBe('right');
    expect(result.drAligns.hold, 'dr-row hold .cell-edit must STILL be right-aligned').toBe('right');
  });
});
