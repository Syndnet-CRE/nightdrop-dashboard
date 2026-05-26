/* ============================================
   SYNC — publish host state into the bundle's window.ND mirror
   and coalesce repaints to one per animation frame.
   See notes/bmad/deal-feed-excel/architecture.md
   §"Integration pattern — the sync contract".
   ============================================ */

import { toNDDeal, toNDBox, isoDate } from './adapter.js';

/**
 * Create a throttler that calls `ND._rr` at most once per animation frame,
 * regardless of how many times the caller invokes the returned function in
 * a single tick. Safe to call when ND._rr is not yet defined.
 *
 * @param {object} ND
 * @param {(cb: FrameRequestCallback) => number} [raf]
 * @param {(handle: number) => void} [caf]
 * @returns {{ request: () => void, cancel: () => void, flush: () => void }}
 */
export function createRrThrottle(ND, raf, caf) {
  const _raf =
    raf || (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);
  const _caf =
    caf || (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : null);

  let handle = null;

  function fire() {
    handle = null;
    if (ND && typeof ND._rr === 'function') {
      ND._rr();
    }
  }

  return {
    request() {
      if (handle !== null) return;
      if (_raf) {
        handle = _raf(fire);
      } else {
        handle = setTimeout(fire, 0);
      }
    },
    cancel() {
      if (handle === null) return;
      if (_caf) _caf(handle);
      else clearTimeout(handle);
      handle = null;
    },
    flush() {
      if (handle === null) return;
      if (_caf) _caf(handle);
      else clearTimeout(handle);
      handle = null;
      fire();
    },
  };
}

/**
 * Mirror host state into ND and queue a repaint.
 *
 * @param {object} args
 * @param {object} args.ND                 window.ND from the bundle
 * @param {Array}  args.deals              host useDeals().deals
 * @param {Array}  args.buyBoxes           host useDeals().buyBoxes
 * @param {(id: string) => boolean} args.isRead host useReadState().isRead
 * @param {Date|string} [args.today]
 * @param {{ request: () => void }} args.requestRr from createRrThrottle
 */
export function publishToBundle({ ND, deals, buyBoxes, isRead, today, requestRr }) {
  if (!ND) return;
  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeBoxes = Array.isArray(buyBoxes) ? buyBoxes : [];

  ND.deals = safeDeals.map((d) => toNDDeal(d, { isRead })).filter(Boolean);
  ND.boxes = safeBoxes.map(toNDBox).filter(Boolean);

  // The bundle's data.js defines ND.buildCalendar(), which produces the
  // Array<Month{ weeks: Array<Week{ days: Array<Day> }> }> shape that
  // feed.js and tabs.js iterate. It reads ND.deals[*].deliveredOn and
  // ND.todayISO, so both must be set first. Fall back to an iterable
  // empty array when the bundle's builder is absent (e.g. unit tests).
  const todayKey = isoDate(today) || isoDate(new Date());
  ND.todayISO = todayKey;
  ND.calendar = typeof ND.buildCalendar === 'function' ? ND.buildCalendar() : [];

  if (requestRr && typeof requestRr.request === 'function') {
    requestRr.request();
  }
}
