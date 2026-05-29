// Pipeline timeline (TopHeader strip) light-theme regression net.
//
// Brady called this out on 2026-05-28: "the pipeline timeline up there
// in the header obviously needs some updates for the light theme. I
// think that that was out, that was never done."
//
// Visual audit (Step 0) confirmed:
//   - Pipeline diamonds render stark black (#0D0D0D) on white in light mode
//   - The "DELIVERED" label is #5C6070 — barely visible on white
//   - Hairline divider rgba(255,255,255,0.06) is invisible on white
//   - EQ pending ticker rgba(255,255,255,0.10) is invisible on white
//
// This spec locks the inverse: in light theme the diamond uses a token
// that resolves to a non-black background and the hairline uses a
// token that resolves to a non-white-on-white color.

import { test, expect } from '@playwright/test';

async function authAndOpenWithTheme(page, theme = 'light') {
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

// Returns rgb tuple from a CSS color string like "rgb(13, 13, 13)"
function parseRgb(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3] };
}

test.describe('Pipeline timeline — light theme', () => {
  test('design tokens for pipeline timeline exist on documentElement', async ({ page }) => {
    await authAndOpenWithTheme(page, 'light');
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        diamondPendingBg: cs.getPropertyValue('--diamond-pending-bg').trim(),
        diamondShadowBg: cs.getPropertyValue('--diamond-shadow-bg').trim(),
        pipelineDivider: cs.getPropertyValue('--pipeline-divider').trim(),
        statLabelFg: cs.getPropertyValue('--stat-label-fg').trim(),
        eqPendingBar: cs.getPropertyValue('--eq-pending-bar').trim(),
      };
    });
    expect(tokens.diamondPendingBg).not.toBe('');
    expect(tokens.diamondShadowBg).not.toBe('');
    expect(tokens.pipelineDivider).not.toBe('');
    expect(tokens.statLabelFg).not.toBe('');
    expect(tokens.eqPendingBar).not.toBe('');
  });

  test('--diamond-pending-bg differs between dark and light themes', async ({ page }) => {
    await authAndOpenWithTheme(page, 'dark');
    const darkVal = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--diamond-pending-bg').trim()
    );

    await authAndOpenWithTheme(page, 'light');
    const lightVal = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--diamond-pending-bg').trim()
    );

    expect(darkVal).not.toBe('');
    expect(lightVal).not.toBe('');
    expect(darkVal).not.toBe(lightVal);
  });

  test('rendered diamond background-color in light theme is NOT stark black (#0D0D0D)', async ({ page }) => {
    await authAndOpenWithTheme(page, 'light');
    // The pipeline diamonds render inside .top-header-center .pipeline-track-only
    // structure. Grab the first pending diamond's parent element.
    const diamonds = page.locator('.top-header-center [style*="rotate(45deg)"]');
    await expect(diamonds.first()).toBeVisible();
    // Each diamond is the inner rotated element; its computed background-color
    // resolves the var() to a concrete color string.
    const bg = await diamonds.first().evaluate((el) => getComputedStyle(el).backgroundColor);
    const rgb = parseRgb(bg);
    expect(rgb).not.toBeNull();
    // In light mode the diamond should NOT be #0D0D0D (rgb(13, 13, 13))
    // A more permissive threshold: at least the green is darker than the
    // would-have-been pure dark; for non-active pending pending diamonds,
    // background should be substantially lighter than rgb(50, 50, 50).
    // The current dark value is rgb(13, 13, 13). The fix should produce
    // something noticeably non-black.
    const allLow = rgb.r < 50 && rgb.g < 50 && rgb.b < 50;
    expect(allLow, `Expected non-black diamond in light theme, got rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`).toBe(false);
  });

  test('hairline divider in light theme is visible (not white-on-white)', async ({ page }) => {
    await authAndOpenWithTheme(page, 'light');
    // The hairline is a div with height:1, background:var(--pipeline-divider)
    // sitting at top:20 inside the EQTicker container. Hard to select via
    // unique selector — verify via the CSS variable resolution instead.
    const dividerVal = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--pipeline-divider').trim()
    );
    expect(dividerVal).not.toBe('');
    // Should not resolve to a near-white value
    const isWhiteOnWhite = /rgba?\(\s*255\s*,\s*255\s*,\s*255/.test(dividerVal) ||
                           /#ff(f|ffff)/i.test(dividerVal);
    expect(isWhiteOnWhite, `Expected non-white divider in light theme, got "${dividerVal}"`).toBe(false);
  });
});
