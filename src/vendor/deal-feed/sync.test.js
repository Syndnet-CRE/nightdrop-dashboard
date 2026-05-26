import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRrThrottle, publishToBundle } from './sync.js';

// ──────────────────────────────────────────────────────────────────────────────
// createRrThrottle
// ──────────────────────────────────────────────────────────────────────────────

function makeFrameRunner() {
  const queue = [];
  const raf = (cb) => {
    queue.push(cb);
    return queue.length; // 1-based handle
  };
  const caf = (handle) => {
    queue[handle - 1] = null;
  };
  function tick() {
    const snapshot = queue.splice(0);
    snapshot.forEach((cb) => cb && cb());
  }
  return { raf, caf, tick, queueLength: () => queue.length };
}

describe('createRrThrottle', () => {
  it('calls ND._rr at most once per frame even with multiple requests', () => {
    const ND = { _rr: vi.fn() };
    const { raf, caf, tick } = makeFrameRunner();
    const t = createRrThrottle(ND, raf, caf);

    t.request();
    t.request();
    t.request();
    t.request();
    t.request();
    expect(ND._rr).not.toHaveBeenCalled();
    tick();
    expect(ND._rr).toHaveBeenCalledTimes(1);
  });

  it('after a fire, a subsequent request schedules a new frame', () => {
    const ND = { _rr: vi.fn() };
    const { raf, caf, tick } = makeFrameRunner();
    const t = createRrThrottle(ND, raf, caf);

    t.request();
    tick();
    expect(ND._rr).toHaveBeenCalledTimes(1);

    t.request();
    t.request();
    tick();
    expect(ND._rr).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when ND._rr is missing', () => {
    const ND = {};
    const { raf, caf, tick } = makeFrameRunner();
    const t = createRrThrottle(ND, raf, caf);
    t.request();
    expect(() => tick()).not.toThrow();
  });

  it('is a no-op when ND itself is null', () => {
    const { raf, caf, tick } = makeFrameRunner();
    const t = createRrThrottle(null, raf, caf);
    t.request();
    expect(() => tick()).not.toThrow();
  });

  it('cancel() drops a pending fire', () => {
    const ND = { _rr: vi.fn() };
    const { raf, caf, tick } = makeFrameRunner();
    const t = createRrThrottle(ND, raf, caf);

    t.request();
    t.cancel();
    tick();
    expect(ND._rr).not.toHaveBeenCalled();
  });

  it('flush() fires immediately and clears the pending frame', () => {
    const ND = { _rr: vi.fn() };
    const { raf, caf, tick } = makeFrameRunner();
    const t = createRrThrottle(ND, raf, caf);

    t.request();
    t.flush();
    expect(ND._rr).toHaveBeenCalledTimes(1);

    // The pending frame should be cleared, so a tick must not re-fire.
    tick();
    expect(ND._rr).toHaveBeenCalledTimes(1);
  });

  it('falls back to setTimeout when no raf/caf provided', () => {
    vi.useFakeTimers();
    try {
      const ND = { _rr: vi.fn() };
      const t = createRrThrottle(ND);
      t.request();
      expect(ND._rr).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(ND._rr).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// publishToBundle
// ──────────────────────────────────────────────────────────────────────────────

function baseDeal(overrides = {}) {
  return {
    id: 'deal-1',
    buy_box_id: 'box-1',
    score: 50,
    address: '1 A',
    property_city: 'Austin',
    property_state: 'TX',
    property_zip: '78701',
    sent_at: '2026-05-25T00:00:00Z',
    asset_class: 'self_storage',
    value: 100,
    building_sf: 10,
    owner_type: 'llc',
    last_sale_date: '2020-01-01T00:00:00Z',
    updated_at: '2026-05-25T00:00:00Z',
    stage: 'New',
    feedback: null,
    saved: false,
    signals: [],
    brief_json: null,
    notes: '',
    ...overrides,
  };
}

describe('publishToBundle', () => {
  let ND;
  let requestRr;

  beforeEach(() => {
    ND = {};
    requestRr = { request: vi.fn() };
  });

  it('mirrors deals and boxes onto ND and triggers requestRr', () => {
    publishToBundle({
      ND,
      deals: [baseDeal()],
      buyBoxes: [{ id: 'box-1', name: 'B1', asset_classes: ['self_storage'] }],
      isRead: () => false,
      today: '2026-05-25T12:00:00Z',
      requestRr,
    });

    expect(ND.deals).toHaveLength(1);
    expect(ND.deals[0].id).toBe('deal-1');
    expect(ND.boxes).toHaveLength(1);
    expect(ND.boxes[0].id).toBe('box-1');
    expect(Array.isArray(ND.calendar)).toBe(true);
    expect(requestRr.request).toHaveBeenCalledTimes(1);
  });

  it('handles missing deals/buyBoxes by writing empty arrays', () => {
    publishToBundle({ ND, deals: null, buyBoxes: undefined, isRead: () => false, requestRr });
    expect(ND.deals).toEqual([]);
    expect(ND.boxes).toEqual([]);
    expect(Array.isArray(ND.calendar)).toBe(true);
  });

  it('sets ND.todayISO from the today arg as YYYY-MM-DD before invoking ND.buildCalendar', () => {
    const ND2 = {
      buildCalendar: vi.fn(function () {
        // captured at call time
        expect(this.todayISO).toBe('2026-05-25');
        return [{ key: '2026-05', weeks: [] }];
      }),
    };
    publishToBundle({
      ND: ND2,
      deals: [baseDeal()],
      buyBoxes: [],
      isRead: () => false,
      today: '2026-05-25T18:30:00Z',
      requestRr,
    });
    expect(ND2.buildCalendar).toHaveBeenCalledTimes(1);
    expect(ND2.todayISO).toBe('2026-05-25');
  });

  it('uses current date for ND.todayISO when today arg is missing', () => {
    publishToBundle({ ND, deals: [baseDeal()], buyBoxes: [], isRead: () => false, requestRr });
    expect(ND.todayISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('calls ND.buildCalendar after ND.deals is populated and assigns its return to ND.calendar', () => {
    const sentinel = [{ key: '2026-05', weeks: [{ key: 'w1', days: [{ key: '2026-05-25', count: 3 }] }] }];
    const ND2 = {
      buildCalendar: vi.fn(function () {
        // verify deals are already on ND when buildCalendar runs
        expect(Array.isArray(this.deals)).toBe(true);
        expect(this.deals).toHaveLength(1);
        return sentinel;
      }),
    };
    publishToBundle({
      ND: ND2,
      deals: [baseDeal()],
      buyBoxes: [],
      isRead: () => false,
      requestRr,
    });
    expect(ND2.calendar).toBe(sentinel);
    expect(Array.isArray(ND2.calendar)).toBe(true);
  });

  it('falls back to an iterable empty array when ND.buildCalendar is not a function', () => {
    publishToBundle({ ND, deals: [baseDeal()], buyBoxes: [], isRead: () => false, requestRr });
    expect(ND.calendar).toEqual([]);
    // The bundle's feed.js does `for (const m of ND.calendar)`. The fallback
    // must be iterable so the feed renders the empty-state row instead of
    // throwing TypeError: ND.calendar is not iterable.
    expect(() => {
      for (const _ of ND.calendar) {
        void _;
      }
    }).not.toThrow();
  });

  it('filters out adapter-rejected null deals', () => {
    publishToBundle({
      ND,
      deals: [null, baseDeal(), null, baseDeal({ id: 'deal-2' })],
      buyBoxes: [],
      isRead: () => false,
      requestRr,
    });
    expect(ND.deals).toHaveLength(2);
    expect(ND.deals.map((d) => d.id)).toEqual(['deal-1', 'deal-2']);
  });

  it('is a no-op when ND is null', () => {
    expect(() =>
      publishToBundle({
        ND: null,
        deals: [],
        buyBoxes: [],
        isRead: () => false,
        requestRr,
      })
    ).not.toThrow();
    expect(requestRr.request).not.toHaveBeenCalled();
  });

  it('does not invoke requestRr if it lacks .request', () => {
    publishToBundle({
      ND,
      deals: [],
      buyBoxes: [],
      isRead: () => false,
      requestRr: {},
    });
    expect(ND.deals).toEqual([]);
  });

  it('integrates with createRrThrottle — 5 publishes in one tick coalesce to one _rr', () => {
    const ND2 = { _rr: vi.fn() };
    const { raf, caf, tick } = makeFrameRunner();
    const throttle = createRrThrottle(ND2, raf, caf);

    for (let i = 0; i < 5; i++) {
      publishToBundle({
        ND: ND2,
        deals: [baseDeal({ id: `d-${i}` })],
        buyBoxes: [],
        isRead: () => false,
        requestRr: throttle,
      });
    }

    expect(ND2._rr).not.toHaveBeenCalled();
    tick();
    expect(ND2._rr).toHaveBeenCalledTimes(1);
    expect(ND2.deals).toHaveLength(1); // last one wins
    expect(ND2.deals[0].id).toBe('d-4');
  });
});
