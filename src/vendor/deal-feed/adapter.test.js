import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cleanNull,
  assetClassLabel,
  humanizeOwnerType,
  categoryToPillClass,
  isoDate,
  fmtDate,
  yearsSince,
  computeLA,
  hashIdToColor,
  toNDDeal,
  toNDBox,
  buildCalendar,
} from './adapter.js';

const REF = new Date('2026-05-25T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(REF);
});
afterEach(() => {
  vi.useRealTimers();
});

// ──────────────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────────────

describe('cleanNull', () => {
  it('returns null for null and undefined', () => {
    expect(cleanNull(null)).toBe(null);
    expect(cleanNull(undefined)).toBe(null);
  });
  it('returns null for the literal strings "null" / "undefined" / ""', () => {
    expect(cleanNull('null')).toBe(null);
    expect(cleanNull('undefined')).toBe(null);
    expect(cleanNull('')).toBe(null);
  });
  it('passes through real values including 0 and false', () => {
    expect(cleanNull(0)).toBe(0);
    expect(cleanNull(false)).toBe(false);
    expect(cleanNull('hello')).toBe('hello');
  });
});

describe('assetClassLabel', () => {
  it('maps known slugs to their human label', () => {
    expect(assetClassLabel('self_storage')).toBe('Self Storage');
    expect(assetClassLabel('multifamily')).toBe('Multifamily');
  });
  it('normalizes legacy slugs (sfr → residential_sfr)', () => {
    expect(assetClassLabel('sfr')).toBe('Single Family Residential');
  });
  it('returns empty string for unknown / null / "null" string', () => {
    expect(assetClassLabel('not_a_class')).toBe('');
    expect(assetClassLabel(null)).toBe('');
    expect(assetClassLabel('null')).toBe('');
  });
});

describe('humanizeOwnerType', () => {
  it('maps known types', () => {
    expect(humanizeOwnerType('llc')).toBe('LLC');
    expect(humanizeOwnerType('trust')).toBe('Trust');
    expect(humanizeOwnerType('individual')).toBe('Individual');
  });
  it('returns "" for null-ish, falls back to raw string for unknown', () => {
    expect(humanizeOwnerType(null)).toBe('');
    expect(humanizeOwnerType('null')).toBe('');
    expect(humanizeOwnerType('weird')).toBe('weird');
  });
});

describe('categoryToPillClass', () => {
  it('maps red/amber/green and synonyms', () => {
    expect(categoryToPillClass('red')).toBe('pill-r');
    expect(categoryToPillClass('amber')).toBe('pill-a');
    expect(categoryToPillClass('yellow')).toBe('pill-a');
    expect(categoryToPillClass('warning')).toBe('pill-a');
    expect(categoryToPillClass('green')).toBe('pill-g');
    expect(categoryToPillClass('good')).toBe('pill-g');
  });
  it('case-insensitive, returns "" for unknown', () => {
    expect(categoryToPillClass('RED')).toBe('pill-r');
    expect(categoryToPillClass('purple')).toBe('');
    expect(categoryToPillClass(null)).toBe('');
  });
});

describe('isoDate', () => {
  it('returns YYYY-MM-DD for valid input', () => {
    // Mid-day UTC times stay on the same local-TZ Y-M-D across US and EU
    // CI runners (isoDate now uses local time per the 2026-05-26 isoDate fix).
    expect(isoDate('2026-05-25T12:00:00Z')).toBe('2026-05-25');
    expect(isoDate(new Date('2026-01-01T12:00:00Z'))).toBe('2026-01-01');
  });
  it('returns null for invalid / nullish / "null" string', () => {
    expect(isoDate(null)).toBe(null);
    expect(isoDate('null')).toBe(null);
    expect(isoDate('not a date')).toBe(null);
  });
});

describe('fmtDate', () => {
  it('weekday style produces "Mon · May 25" shape', () => {
    const s = fmtDate('2026-05-25T12:00:00Z', 'weekday');
    // Don't pin exact weekday across TZ — just shape.
    expect(s).toMatch(/^[A-Za-z]+ · [A-Za-z]+ \d{1,2}$/);
  });
  it('returns "" for null-ish or invalid', () => {
    expect(fmtDate(null)).toBe('');
    expect(fmtDate('null')).toBe('');
    expect(fmtDate('garbage')).toBe('');
  });
});

describe('yearsSince', () => {
  it('returns "N yr" for past dates', () => {
    expect(yearsSince('2018-05-25T00:00:00Z')).toBe('8 yr');
    expect(yearsSince('2025-05-25T00:00:00Z')).toBe('1 yr');
  });
  it('returns "" for null-ish / invalid / future dates', () => {
    expect(yearsSince(null)).toBe('');
    expect(yearsSince('null')).toBe('');
    expect(yearsSince('2030-01-01T00:00:00Z')).toBe('');
  });
});

describe('computeLA', () => {
  it('today → "today", 1d, w, mo, y buckets', () => {
    expect(computeLA(new Date(REF.getTime()))).toBe('today');
    expect(computeLA(new Date(REF.getTime() - 24 * 3600 * 1000))).toBe('1d');
    expect(computeLA(new Date(REF.getTime() - 3 * 24 * 3600 * 1000))).toBe('3d');
    expect(computeLA(new Date(REF.getTime() - 10 * 24 * 3600 * 1000))).toBe('1w');
    expect(computeLA(new Date(REF.getTime() - 60 * 24 * 3600 * 1000))).toBe('2mo');
    expect(computeLA(new Date(REF.getTime() - 400 * 24 * 3600 * 1000))).toBe('1y');
  });
  it('"" for null-ish / invalid / future', () => {
    expect(computeLA(null)).toBe('');
    expect(computeLA('null')).toBe('');
    expect(computeLA(new Date(REF.getTime() + 86400000))).toBe('');
  });
});

describe('hashIdToColor', () => {
  it('returns a deterministic hsl() string per id', () => {
    const a = hashIdToColor('abc-123');
    const b = hashIdToColor('abc-123');
    expect(a).toBe(b);
    expect(a).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });
  it('different ids produce different colors (high probability)', () => {
    const colors = new Set([
      hashIdToColor('a'),
      hashIdToColor('b'),
      hashIdToColor('c'),
      hashIdToColor('d'),
    ]);
    expect(colors.size).toBeGreaterThan(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// toNDDeal
// ──────────────────────────────────────────────────────────────────────────────

function baseDeal(overrides = {}) {
  return {
    id: 'deal-1',
    buy_box_id: 'box-1',
    score: 78,
    address: '123 Main St',
    property_city: 'Austin',
    property_state: 'TX',
    property_zip: '78701',
    sent_at: '2026-05-25T12:00:00Z',
    asset_class: 'self_storage',
    value: 1_200_000,
    building_sf: 8000,
    owner_type: 'llc',
    last_sale_date: '2018-05-25T12:00:00Z',
    updated_at: REF.toISOString(),
    stage: 'New',
    feedback: null,
    saved: false,
    signals: [{ tag: 'TAX_LIEN', label: 'Tax lien', category: 'red', description: 'Lien filed' }],
    brief_json: { bullets: [{ body: 'Strong cap rate' }], summary: 'Promising' },
    notes: '',
    ...overrides,
  };
}

describe('toNDDeal', () => {
  it('returns null for null input', () => {
    expect(toNDDeal(null)).toBe(null);
  });

  it('converts a happy-path deal with all fields', () => {
    const out = toNDDeal(baseDeal(), { isRead: () => false });
    expect(out.id).toBe('deal-1');
    expect(out.bx).toBe('box-1');
    expect(out.score).toBe(78);
    expect(out.addr).toBe('123 Main St');
    expect(out.city).toBe('Austin, TX 78701');
    expect(out.brief).toBe('Strong cap rate');
    expect(out.deliveredOn).toBe('2026-05-25');
    expect(out.asset).toBe('Self Storage');
    expect(out.psf).toBe(150);
    expect(out.sf).toBe(8000);
    expect(out.owner).toBe('LLC');
    expect(out.hold).toBe('8 yr');
    expect(out.sig).toBe('TAX_LIEN');
    expect(out.sc).toBe('pill-r');
    expect(out.stage).toBe('New');
    expect(out.unread).toBe(true);
    expect(out.hot).toBe(false);
    expect(out.up).toBe(false);
    expect(out.narr).toBe('Promising');
    expect(out.bullets).toEqual([{ body: 'Strong cap rate' }]);
  });

  it('handles literal "null" strings on every nullable field', () => {
    const out = toNDDeal(
      baseDeal({
        buy_box_id: 'null',
        score: 'null',
        match_score: 'null',
        address: 'null',
        property_city: 'null',
        property_state: 'null',
        property_zip: 'null',
        sent_at: 'null',
        created_at: 'null',
        asset_class: 'null',
        value: 'null',
        building_sf: 'null',
        owner_type: 'null',
        last_sale_date: 'null',
        updated_at: 'null',
        stage: 'null',
        feedback: 'null',
        saved: 'null',
        notes: 'null',
        signals: null,
        brief_json: null,
      }),
      { isRead: () => false }
    );
    expect(out.bx).toBe(null);
    expect(out.score).toBe(0);
    expect(out.addr).toBe('');
    expect(out.city).toBe('');
    expect(out.deliveredOn).toBe(null);
    expect(out.date).toBe('');
    expect(out.asset).toBe('');
    expect(out.psf).toBe(null);
    expect(out.sf).toBe(null);
    expect(out.owner).toBe('');
    expect(out.hold).toBe('');
    expect(out.sig).toBe('');
    expect(out.sc).toBe('');
    expect(out.stage).toBe('New');
    expect(out.notes).toBe('');
    expect(out.brief).toBe('');
    expect(out.narr).toBe('');
    expect(out.bullets).toEqual([]);
    expect(out.la).toBe('');
  });

  it('falls back to match_score * 10 when score is absent', () => {
    const out = toNDDeal(baseDeal({ score: null, match_score: 7.4 }));
    expect(out.score).toBe(74);
  });

  it('falls back to created_at when sent_at is missing', () => {
    const out = toNDDeal(
      baseDeal({ sent_at: null, created_at: '2026-04-01T12:00:00Z' })
    );
    expect(out.deliveredOn).toBe('2026-04-01');
  });

  it('falls back to addr when address is missing', () => {
    const out = toNDDeal(baseDeal({ address: null, addr: '500 Oak Rd' }));
    expect(out.addr).toBe('500 Oak Rd');
  });

  it('falls back to asset alias when asset_class is missing', () => {
    const out = toNDDeal(baseDeal({ asset_class: null, asset: 'multifamily' }));
    expect(out.asset).toBe('Multifamily');
  });

  it('falls back to box when buy_box_id is missing', () => {
    const out = toNDDeal(baseDeal({ buy_box_id: null, box: 'legacy-box' }));
    expect(out.bx).toBe('legacy-box');
  });

  it('psf null when building_sf is zero or missing', () => {
    expect(toNDDeal(baseDeal({ building_sf: 0 })).psf).toBe(null);
    expect(toNDDeal(baseDeal({ building_sf: null })).psf).toBe(null);
    expect(toNDDeal(baseDeal({ value: null })).psf).toBe(null);
  });

  it('hot/up flip when feedback === "hot"', () => {
    const out = toNDDeal(baseDeal({ feedback: 'hot' }));
    expect(out.hot).toBe(true);
    expect(out.up).toBe(true);
  });

  it('unread reflects isRead callback', () => {
    const readSet = new Set(['deal-1']);
    const out = toNDDeal(baseDeal(), { isRead: (id) => readSet.has(id) });
    expect(out.unread).toBe(false);
  });

  it('signals[0].description survives when no brief_json bullets present', () => {
    const out = toNDDeal(
      baseDeal({
        brief_json: null,
        signals: [{ description: 'fallback brief' }],
      })
    );
    expect(out.brief).toBe('fallback brief');
  });

  it('empty signals array produces empty sig + sc', () => {
    const out = toNDDeal(baseDeal({ signals: [] }));
    expect(out.sig).toBe('');
    expect(out.sc).toBe('');
  });

  it('returns ext placeholders ("—") when records are missing', () => {
    const out = toNDDeal(baseDeal({
      parcel_id: null,
      property_county: null,
      zoning: null,
      year_built: null,
      lot_sf: null,
    }));
    expect(out.ext.parcel).toBe('—');
    expect(out.ext.county).toBe('—');
    expect(out.ext.zoning).toBe('—');
    expect(out.ext.yearBuilt).toBe('—');
    expect(out.ext.lotSF).toBe('—');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// toNDBox
// ──────────────────────────────────────────────────────────────────────────────

describe('toNDBox', () => {
  it('returns null for null', () => {
    expect(toNDBox(null)).toBe(null);
  });

  it('joins asset_classes via " / " using human labels', () => {
    const out = toNDBox({
      id: 'box-9',
      name: 'Austin Storage',
      asset_classes: ['self_storage', 'industrial'],
      color: '#5BCC48',
      deals_sent_total: 12,
    });
    expect(out.name).toBe('Austin Storage');
    expect(out.asset).toBe('Self Storage / Industrial');
    expect(out.color).toBe('#5BCC48');
    expect(out.depth).toBe(12);
    expect(out.mr).toBe(0);
  });

  it('uses hashIdToColor when host color is missing', () => {
    const a = toNDBox({ id: 'same-id', asset_classes: [] });
    const b = toNDBox({ id: 'same-id', asset_classes: [] });
    expect(a.color).toBe(b.color);
    expect(a.color).toMatch(/^hsl\(/);
  });

  it('falls back to label when name is missing', () => {
    const out = toNDBox({ id: 'box-1', label: 'Legacy name', asset_classes: [] });
    expect(out.name).toBe('Legacy name');
  });

  it('coerces depth to a number, defaults to 0', () => {
    expect(toNDBox({ id: 'a', asset_classes: [], deals: '5' }).depth).toBe(5);
    expect(toNDBox({ id: 'a', asset_classes: [] }).depth).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildCalendar
// ──────────────────────────────────────────────────────────────────────────────

describe('buildCalendar', () => {
  it('spans 5 months back through 1 month forward, inclusive', () => {
    const { days } = buildCalendar([], REF);
    expect(days[0].key).toBe('2025-12-25');
    expect(days[days.length - 1].key).toBe('2026-06-25');
  });

  it('flags isToday for the reference date', () => {
    const { days } = buildCalendar([], REF);
    const today = days.find((d) => d.isToday);
    expect(today.key).toBe('2026-05-25');
  });

  it('flags isFuture for days after the reference', () => {
    const { days } = buildCalendar([], REF);
    const tomorrow = days.find((d) => d.key === '2026-05-26');
    expect(tomorrow.isFuture).toBe(true);
    const yesterday = days.find((d) => d.key === '2026-05-24');
    expect(yesterday.isFuture).toBe(false);
  });

  it('counts deals into ISO buckets via sent_at', () => {
    // Mid-day UTC so each timestamp buckets to its UTC Y-M-D across US and EU
    // CI runners (isoDate uses local time per the 2026-05-26 fix).
    const deals = [
      { sent_at: '2026-05-25T12:00:00Z' },
      { sent_at: '2026-05-25T13:00:00Z' },
      { sent_at: '2026-05-24T12:00:00Z' },
      { sent_at: null },
      { sent_at: '2026-05-26T12:00:00Z' },
    ];
    const { days } = buildCalendar(deals, REF);
    const may25 = days.find((d) => d.key === '2026-05-25');
    const may24 = days.find((d) => d.key === '2026-05-24');
    const may26 = days.find((d) => d.key === '2026-05-26');
    expect(may25.count).toBe(2);
    expect(may24.count).toBe(1);
    expect(may26.count).toBe(1);
  });

  it('falls back to created_at when sent_at is missing on a deal', () => {
    const { days } = buildCalendar(
      [{ sent_at: null, created_at: '2026-05-24T12:00:00Z' }],
      REF
    );
    const may24 = days.find((d) => d.key === '2026-05-24');
    expect(may24.count).toBe(1);
  });

  it('ignores deals whose dates are unparseable / "null" string', () => {
    const { days } = buildCalendar(
      [{ sent_at: 'null', created_at: 'null' }, { sent_at: 'garbage' }],
      REF
    );
    const totals = days.reduce((sum, d) => sum + d.count, 0);
    expect(totals).toBe(0);
  });

  it('tolerates a missing today and defaults to "now"', () => {
    const { days } = buildCalendar([]);
    expect(days.length).toBeGreaterThan(150);
    expect(days.length).toBeLessThan(220);
  });
});
