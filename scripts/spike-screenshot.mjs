// One-shot screenshot capture for the Phase 0.1 spike.
// Logs in via /__dev_login, navigates to /__excel-spike, screenshots, exits.

import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const APP = 'http://localhost:5173';
const ROUTE = `${APP}/__excel-spike`;
const OUT = 'notes/bmad/deal-feed-excel/spike-2026-05-25-theme.png';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));

console.log('[1] Hit /__dev_login to get a token…');
const loginResp = await page.request.post(`${APP}/__dev_login`);
if (!loginResp.ok()) {
  console.error('[!] /__dev_login failed:', loginResp.status(), await loginResp.text());
  process.exit(2);
}
const { token, subscriber } = await loginResp.json();
console.log('[1] Got token for:', subscriber?.email);

console.log('[2] Goto /login first (no auth check), set token, then nav to spike…');
await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
await page.evaluate(t => localStorage.setItem('nd_token', t), token);
const tokenAfterSet = await page.evaluate(() => localStorage.getItem('nd_token')?.slice(0, 20));
console.log('   token set →', tokenAfterSet);

console.log('[3] Now boot at root so AuthProvider re-runs with token present…');
await page.goto(APP, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const debugAfterBoot = await page.evaluate(() => ({
  ndToken: localStorage.getItem('nd_token')?.slice(0, 20),
  url: location.href,
}));
console.log('   after boot:', debugAfterBoot);

console.log('[4] Now navigate to the spike route…');
await page.goto(ROUTE, { waitUntil: 'networkidle' });
await page.waitForTimeout(4000); // let DealsContext fetch + bundle load + publish
const debugAfterRoute = await page.evaluate(() => {
  const days = {};
  for (const d of window.ND?.deals || []) {
    if (d.deliveredOn) days[d.deliveredOn] = (days[d.deliveredOn] || 0) + 1;
  }
  return {
    ndDealsLen: window.ND?.deals?.length ?? -1,
    ndActiveDay: window.ND?.state?.activeDay,
    todayISO: window.ND?.todayISO,
    topDays: Object.entries(days).sort().slice(-5),
    tbodyRows: document.querySelectorAll('#tbody tr').length,
  };
});
console.log('   after route:', JSON.stringify(debugAfterRoute, null, 2));

console.log('[5] Capture full-frame screenshot to', OUT);
await page.screenshot({ path: OUT, fullPage: false });

const CROP = 'notes/bmad/deal-feed-excel/spike-2026-05-25-grid-crop.png';
console.log('[6] Capture spreadsheet crop to', CROP);
const sheetBox = await page.locator('.feed.sheet-light').boundingBox();
if (sheetBox) {
  await page.screenshot({
    path: CROP,
    clip: { x: sheetBox.x, y: sheetBox.y, width: sheetBox.width, height: Math.min(sheetBox.height, 750) },
  });
}

if (consoleErrors.length) {
  console.log('\n[!] console errors during render:');
  for (const e of consoleErrors) console.log('   ', e);
}

await browser.close();
console.log('\nDone. Screenshot at', OUT);
