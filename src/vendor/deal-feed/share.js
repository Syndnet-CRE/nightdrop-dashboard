/* Deal "Share brief" — native share sheet with desktop clipboard fallback.
   Wired to the .aico.sh button in feed.js. The payload builder is pure and
   tested in share.test.js; shareDeal accepts injected navigator/origin/toast
   so the imperative path is testable without a real browser. */

/**
 * Build the navigator.share payload for a deal.
 * @param {{ id?: string, addr?: string, address?: string }} deal
 * @param {string} origin e.g. location.origin
 * @returns {{ title: string, text: string, url: string }}
 */
export function buildDealSharePayload(deal, origin) {
  const addr = String(deal?.addr || deal?.address || 'Deal');
  const base = String(origin || '').replace(/\/+$/, '');
  return {
    title: addr,
    text: `Deal brief: ${addr}`,
    url: `${base}/deal/${deal?.id}`,
  };
}

/**
 * Share a deal via the OS share sheet, falling back to clipboard on desktop.
 * @param {object} deal
 * @param {{ origin?: string, navigator?: Navigator, toast?: (msg: string) => void }} [opts]
 */
export async function shareDeal(deal, opts = {}) {
  const nav = opts.navigator ?? (typeof navigator !== 'undefined' ? navigator : undefined);
  const origin = opts.origin ?? (typeof location !== 'undefined' ? location.origin : '');
  const toast = typeof opts.toast === 'function' ? opts.toast : () => {};
  const payload = buildDealSharePayload(deal, origin);

  if (nav?.share) {
    try {
      await nav.share(payload);
      return;
    } catch (err) {
      // User dismissed the sheet — not a failure, do nothing.
      if (err?.name === 'AbortError') return;
      // Genuine share failure — fall through to clipboard.
    }
  }
  await copyLink(payload.url, nav, toast);
}

async function copyLink(url, nav, toast) {
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(url);
      toast('Link copied');
    } else {
      toast('Sharing not supported on this device');
    }
  } catch {
    toast('Could not copy link');
  }
}
