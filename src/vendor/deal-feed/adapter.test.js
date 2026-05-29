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
// toNDDeal — backend camelCase contract (post 2026-05-20 rebuild)
// ──────────────────────────────────────────────────────────────────────────────
//
// The backend `/api/dealfeed/deals` route's normalizeDeal returns camelCase
// + shorter field names (sentAt, buyBoxId, briefJson, addr, sf, entityType,
// yearBuilt, attomId, apn). This block freezes the adapter's behavior against
// that shape so the next contract drift surfaces as a test failure rather
// than silently empty UI in production.

describe('toNDDeal — backend camelCase shape', () => {
  function backendDeal(overrides = {}) {
    // Shape mirrors what /api/dealfeed/deals returned for brady@parcyl.ai
    // on 2026-05-27 (verified via DevTools fetch).
    return {
      id: '90bfc8c9-f93a-40d6-84e1-be120ace88c4',
      addr: '17101 HURON ST',
      property_city: 'BROOMFIELD',
      property_state: 'CO',
      property_zip: '80023',
      city: 'BROOMFIELD',
      asset: 'Self Storage / Mini-Warehouse',
      score: 6,
      value: 6170330,
      sf: 164372,
      yearBuilt: 2012,
      lat: 40.005138,
      lng: -104.991611,
      box: 'Self storage CO',
      buyBoxId: '91fd3243-c6c4-47ca-942f-8919df5deb79',
      sentAt: '2026-05-27T07:03:21.978Z',
      entityType: 'LLC/Corp',
      owner: 'EGP 17101 BROOMFIELD LLC',
      absentee: true,
      stage: 'New',
      status: 'new',
      is_read: false,
      deal_state: 'active',
      attomId: '216254725',
      apn: '',
      narrative: 'Self-storage facility...',
      signals: [
        { tag: 'LLC Absentee Owner — Potential Liquidity Event', category: 'ownership' },
        { tag: 'No Mortgage Data — Possible Free & Clear Asset', category: 'financial' },
      ],
      briefJson: {
        bullets: [
          { label: 'Owner:', body: 'EGP 17101 BROOMFIELD LLC, LLC/Corp absentee owner.' },
          { label: 'Asset:', body: '164k SF self-storage on 11.58 acres.' },
        ],
        summary: 'EGP 17101 BROOMFIELD LLC holds a purpose-built self-storage.',
        last_sale_date: '2018-05-25T00:00:00Z',
        last_sale_price: 4500000,
        parcel_id: 'R12345',
        county: 'Broomfield',
        zoning: 'C-2',
      },
      notes: '',
      feedback: null,
      saved_at: null,
      ...overrides,
    };
  }

  it('extracts identity + addr from backend camelCase', () => {
    const out = toNDDeal(backendDeal(), { isRead: () => false });
    expect(out.id).toBe('90bfc8c9-f93a-40d6-84e1-be120ace88c4');
    expect(out.addr).toBe('17101 HURON ST');
    expect(out.city).toBe('BROOMFIELD, CO 80023');
  });

  it('prefers camelCase buyBoxId over legacy box/buy_box_id', () => {
    const out = toNDDeal(backendDeal());
    expect(out.bx).toBe('91fd3243-c6c4-47ca-942f-8919df5deb79');
  });

  it('reads sentAt and computes local-TZ deliveredOn', () => {
    const out = toNDDeal(backendDeal());
    // 2026-05-27T07:03:21.978Z is May 27 in UTC and remains May 27 in any
    // North American TZ where CI typically runs.
    expect(out.deliveredOn).toBe('2026-05-27');
  });

  it('passes through asset label when backend returns a formatted string', () => {
    const out = toNDDeal(backendDeal());
    expect(out.asset).toBe('Self Storage / Mini-Warehouse');
  });

  it('reads sf for building square footage; computes psf', () => {
    const out = toNDDeal(backendDeal());
    expect(out.sf).toBe(164372);
    // 6170330 / 164372 = 37.54 → rounds to 38
    expect(out.psf).toBe(38);
  });

  it('passes lat/lng through from backend camelCase to bundle output', () => {
    const out = toNDDeal(backendDeal());
    expect(out.lat).toBe(40.005138);
    expect(out.lng).toBe(-104.991611);
  });

  it('falls back to briefJson.lat/lng when top-level coords are missing', () => {
    const out = toNDDeal(backendDeal({
      lat: null,
      lng: null,
      briefJson: { ...backendDeal().briefJson, lat: 39.7, lng: -104.9 },
    }));
    expect(out.lat).toBe(39.7);
    expect(out.lng).toBe(-104.9);
  });

  it('coerces lat/lng to numbers when backend sends strings', () => {
    const out = toNDDeal(backendDeal({ lat: '40.5', lng: '-105.0' }));
    expect(out.lat).toBe(40.5);
    expect(out.lng).toBe(-105.0);
  });

  it('returns null lat/lng when backend omits coordinates', () => {
    const out = toNDDeal(backendDeal({ lat: null, lng: null, briefJson: {} }));
    expect(out.lat).toBe(null);
    expect(out.lng).toBe(null);
  });

  it('reads entityType as the owner label (skips humanizeOwnerType slug path)', () => {
    const out = toNDDeal(backendDeal());
    expect(out.owner).toBe('LLC/Corp');
  });

  it('reads briefJson.bullets and surfaces first bullet body in brief', () => {
    const out = toNDDeal(backendDeal());
    expect(out.bullets).toHaveLength(2);
    expect(out.brief).toBe('EGP 17101 BROOMFIELD LLC, LLC/Corp absentee owner.');
  });

  it('reads briefJson.summary into narr', () => {
    const out = toNDDeal(backendDeal());
    expect(out.narr).toBe('EGP 17101 BROOMFIELD LLC holds a purpose-built self-storage.');
  });

  it('reads briefJson.last_sale_date into ext.lastSale and computes hold', () => {
    const out = toNDDeal(backendDeal());
    expect(out.ext.lastSale).toBe('2018-05-25T00:00:00Z');
    expect(out.ext.lastPrice).toBe(4500000);
    // 2018-05-25 is ~8 years before 2026 — yearsSince floors at 7 or 8 depending
    // on the exact date of the test run; assert a sensible range.
    expect(out.hold).toMatch(/^[67] yr$|^8 yr$/);
  });

  it('treats saved_at-present as saved=true even when no `saved` boolean is on the row', () => {
    const out = toNDDeal(backendDeal({ saved_at: '2026-05-27T08:00:00Z' }));
    expect(out.saved).toBe(true);
  });

  it('reads original_loan_amount into ext.mortAmt (formerly hardcoded "—")', () => {
    // Backend's normalizeDeal returns the loan principal as
    // `original_loan_amount` — confirmed in the 2026-05-27 ALL_KEYS dump
    // for brady@parcyl.ai.
    const out = toNDDeal(backendDeal({ original_loan_amount: 2_400_000 }));
    expect(out.ext.mortAmt).toBe(2_400_000);
  });

  it('reads lender_name_standardized into ext.mortLender (formerly hardcoded "—")', () => {
    const out = toNDDeal(backendDeal({ lender_name_standardized: 'Wells Fargo Bank, N.A.' }));
    expect(out.ext.mortLender).toBe('Wells Fargo Bank, N.A.');
  });

  it('falls back to briefJson.mortgage_amount when top-level original_loan_amount is missing', () => {
    const out = toNDDeal(backendDeal({
      original_loan_amount: null,
      briefJson: { ...backendDeal().briefJson, mortgage_amount: 1_750_000 },
    }));
    expect(out.ext.mortAmt).toBe(1_750_000);
  });

  it('falls back to briefJson.lender_name when top-level lender_name_standardized is missing', () => {
    const out = toNDDeal(backendDeal({
      lender_name_standardized: null,
      briefJson: { ...backendDeal().briefJson, lender_name: 'Local Credit Union' },
    }));
    expect(out.ext.mortLender).toBe('Local Credit Union');
  });

  it('keeps ext.mortAmt / mortLender as "—" placeholder when no mortgage data is available', () => {
    const out = toNDDeal(backendDeal());
    // Default backendDeal fixture has no mortgage fields.
    expect(out.ext.mortAmt).toBe('—');
    expect(out.ext.mortLender).toBe('—');
  });

  it('reads briefJson.land_value into ext.landVal (formerly hardcoded "—")', () => {
    // Backend deal_writer.py writes brief_json.land_value from the source
    // financial field `assessed_value_land`. normalizeDeal does NOT surface
    // it as a top-level field, so the adapter reads it from briefJson.
    const out = toNDDeal(backendDeal({
      briefJson: { ...backendDeal().briefJson, land_value: 1_250_000 },
    }));
    expect(out.ext.landVal).toBe(1_250_000);
  });

  it('falls back to briefJson.assessed_value_land for ext.landVal', () => {
    // deal_writer.py writes both `land_value` and the alt spelling
    // `assessed_value_land`; the adapter accepts either.
    const out = toNDDeal(backendDeal({
      briefJson: { ...backendDeal().briefJson, assessed_value_land: 980_000 },
    }));
    expect(out.ext.landVal).toBe(980_000);
  });

  it('reads briefJson.improvement_value into ext.bldgVal (formerly hardcoded "—")', () => {
    // In CRE, "building value" == improvement value. deal_writer.py writes
    // brief_json.improvement_value from `assessed_value_improvements`.
    const out = toNDDeal(backendDeal({
      briefJson: { ...backendDeal().briefJson, improvement_value: 4_920_000 },
    }));
    expect(out.ext.bldgVal).toBe(4_920_000);
  });

  it('falls back to briefJson.assessed_value_improvements for ext.bldgVal', () => {
    const out = toNDDeal(backendDeal({
      briefJson: { ...backendDeal().briefJson, assessed_value_improvements: 3_100_000 },
    }));
    expect(out.ext.bldgVal).toBe(3_100_000);
  });

  it('keeps ext.landVal / bldgVal as "—" placeholder when no assessment split is available', () => {
    const out = toNDDeal(backendDeal());
    // Default backendDeal fixture has no land/improvement split.
    expect(out.ext.landVal).toBe('—');
    expect(out.ext.bldgVal).toBe('—');
  });

  it('keeps ext.deed as "—" — no backend source exists in brief_json or normalizeDeal', () => {
    // `deed`/document_type lives only on the sales-transaction table in the
    // backend (st.document_type); it is never written to brief_json nor
    // surfaced by normalizeDeal. Until the backend adds it, deed stays "—".
    const out = toNDDeal(backendDeal({
      briefJson: { ...backendDeal().briefJson, deed_type: 'Warranty Deed' },
    }));
    expect(out.ext.deed).toBe('—');
  });

  it('reads first signal tag and category into sig + sc', () => {
    const out = toNDDeal(backendDeal());
    expect(out.sig).toBe('LLC Absentee Owner — Potential Liquidity Event');
    // 'ownership' is not in PILL_CLASS_BY_CATEGORY → returns ''
    expect(out.sc).toBe('');
  });

  it('falls back to hostDeal.narrative when briefJson.summary is empty', () => {
    const out = toNDDeal(backendDeal({ briefJson: { ...backendDeal().briefJson, summary: '' } }));
    expect(out.narr).toBe('Self-storage facility...');
  });

  it('legacy snake_case still works alongside camelCase (mixed fixture)', () => {
    // The pre-2026-05-20 backend response style — must keep working until all
    // call sites are confirmed camelCase.
    const out = toNDDeal({
      id: 'legacy-1',
      address: '500 Legacy St',
      sent_at: '2026-05-27T12:00:00Z',
      asset_class: 'self_storage',
      building_sf: 9000,
      value: 1_350_000,
      owner_type: 'llc',
      buy_box_id: 'legacy-uuid',
      brief_json: { bullets: [{ body: 'legacy bullet' }], summary: 'legacy summary' },
      stage: 'New',
      feedback: null,
      signals: [],
      notes: '',
    });
    expect(out.addr).toBe('500 Legacy St');
    expect(out.deliveredOn).toBe('2026-05-27');
    expect(out.asset).toBe('Self Storage');
    expect(out.sf).toBe(9000);
    expect(out.psf).toBe(150);
    expect(out.owner).toBe('LLC');
    expect(out.bx).toBe('legacy-uuid');
    expect(out.brief).toBe('legacy bullet');
    expect(out.narr).toBe('legacy summary');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildCalendar — backend camelCase contract
// ──────────────────────────────────────────────────────────────────────────────

describe('buildCalendar — backend camelCase sentAt', () => {
  it('counts deals by sentAt (camelCase) into the correct day bucket', () => {
    const { days } = buildCalendar(
      [
        { sentAt: '2026-05-25T12:00:00Z' },
        { sentAt: '2026-05-25T15:00:00Z' },
        { sentAt: '2026-05-24T12:00:00Z' },
      ],
      REF
    );
    expect(days.find((d) => d.key === '2026-05-25').count).toBe(2);
    expect(days.find((d) => d.key === '2026-05-24').count).toBe(1);
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
