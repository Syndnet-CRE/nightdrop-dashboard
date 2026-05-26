/* ============================================
   ADAPTER — host Deal/BuyBox shapes → bundle shapes.
   Pure functions only. No React, no DOM, no window.
   Tested in adapter.test.js. Used by sync.js.
   See notes/bmad/deal-feed-excel/architecture.md §"Data shape adapter".
   ============================================ */

import { ASSET_CLASSES, normalizeAssetClassSlug } from '../../lib/buyBoxTaxonomy.js';

// ──────────────────────────────────────────────────────────────────────────────
// Tiny helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Backend serializes nullish columns as the literal string 'null'. Coerce. */
export function cleanNull(val) {
  if (val == null) return null;
  if (val === 'null' || val === 'undefined' || val === '') return null;
  return val;
}

/** True iff value is something the user would consider present. */
function hasVal(val) {
  return cleanNull(val) != null;
}

/** Map an asset_class slug (legacy or new) to a human label, or '' if unknown. */
export const ASSET_CLASS_LABEL = ASSET_CLASSES.reduce((acc, c) => {
  acc[c.id] = c.label;
  return acc;
}, {});

export function assetClassLabel(slugLike) {
  const slug = normalizeAssetClassSlug(cleanNull(slugLike));
  if (!slug) return '';
  return ASSET_CLASS_LABEL[slug] || '';
}

const OWNER_TYPE_LABELS = {
  individual: 'Individual',
  llc: 'LLC',
  trust: 'Trust',
  corporate: 'Corporate',
};
export function humanizeOwnerType(type) {
  const t = cleanNull(type);
  if (!t) return '';
  return OWNER_TYPE_LABELS[t] || String(t);
}

const PILL_CLASS_BY_CATEGORY = {
  red: 'pill-r',
  amber: 'pill-a',
  yellow: 'pill-a',
  warning: 'pill-a',
  green: 'pill-g',
  good: 'pill-g',
};
export function categoryToPillClass(category) {
  const c = cleanNull(category);
  if (!c) return '';
  return PILL_CLASS_BY_CATEGORY[String(c).toLowerCase()] || '';
}

/** ISO date YYYY-MM-DD, time-zone-stable (UTC). null on invalid. */
export function isoDate(input) {
  if (!hasVal(input)) return null;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_FMT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
/** 'weekday' style: "Mon · Apr 14". null on invalid. */
export function fmtDate(input, style = 'weekday') {
  if (!hasVal(input)) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  if (style === 'weekday') {
    // Intl gives "Mon, Apr 14" → swap comma for ND's middot.
    return WEEKDAY_FMT.format(d).replace(', ', ' · ');
  }
  return d.toLocaleDateString('en-US');
}

/** "8 yr" / "1 yr" / "" if unknown. */
export function yearsSince(input) {
  if (!hasVal(input)) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  if (years < 0) return '';
  return `${years} yr`;
}

/** "Last Activity" — humanized recency from updated_at; "" if unknown. */
export function computeLA(input) {
  if (!hasVal(input)) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 3600 * 1000));
  if (days < 0) return '';
  if (days === 0) return 'today';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

/** Deterministic colour from a UUID-ish string. Used as a buy-box fallback. */
export function hashIdToColor(id) {
  const str = String(id || '');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main shape converters
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convert a host Deal (from useDeals().deals) to the bundle's expected row shape.
 *
 * @param {object} hostDeal
 * @param {{ isRead?: (id: string) => boolean }} [ctx]
 */
export function toNDDeal(hostDeal, ctx = {}) {
  if (!hostDeal) return null;
  const isRead = typeof ctx.isRead === 'function' ? ctx.isRead : () => false;

  const id = hostDeal.id;
  const bx = cleanNull(hostDeal.buy_box_id) ?? cleanNull(hostDeal.box) ?? null;

  const rawScore =
    cleanNull(hostDeal.score) ??
    (hasVal(hostDeal.match_score) ? Number(hostDeal.match_score) * 10 : null);
  const score = hasVal(rawScore) ? Number(rawScore) : 0;

  const addr = cleanNull(hostDeal.address) ?? cleanNull(hostDeal.addr) ?? '';

  const cityPart = cleanNull(hostDeal.property_city);
  const statePart = cleanNull(hostDeal.property_state);
  const zipPart = cleanNull(hostDeal.property_zip);
  const cityStr = [
    cityPart ? `${cityPart},` : '',
    statePart || '',
    zipPart || '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const brief =
    cleanNull(hostDeal.brief_json?.bullets?.[0]?.body) ??
    cleanNull(hostDeal.signals?.[0]?.description) ??
    '';

  const sentRaw = cleanNull(hostDeal.sent_at) ?? cleanNull(hostDeal.created_at);
  const date = fmtDate(sentRaw, 'weekday');
  const deliveredOn = isoDate(sentRaw);

  const assetSlug = cleanNull(hostDeal.asset) ?? cleanNull(hostDeal.asset_class);
  const asset = assetClassLabel(assetSlug);

  const value = cleanNull(hostDeal.value);
  const buildingSf = cleanNull(hostDeal.building_sf);
  const psf =
    hasVal(value) && hasVal(buildingSf) && Number(buildingSf) > 0
      ? Math.round(Number(value) / Number(buildingSf))
      : null;

  const owner = humanizeOwnerType(hostDeal.owner_type);
  const hold = yearsSince(hostDeal.last_sale_date);

  const sig =
    cleanNull(hostDeal.signals?.[0]?.tag) ??
    cleanNull(hostDeal.signals?.[0]?.label) ??
    '';
  const sc = categoryToPillClass(hostDeal.signals?.[0]?.category);

  const stage = cleanNull(hostDeal.stage) ?? 'New';
  const notes = cleanNull(hostDeal.notes) ?? '';

  const feedback = cleanNull(hostDeal.feedback);
  const hot = feedback === 'hot';

  return {
    id,
    bx,
    score,
    addr,
    city: cityStr,
    brief,
    date,
    deliveredOn,
    asset,
    psf,
    sf: hasVal(buildingSf) ? Number(buildingSf) : null,
    owner,
    hold,
    sig,
    sc,
    stage,
    notes,
    unread: !isRead(id),
    saved: !!cleanNull(hostDeal.saved),
    hot,
    up: hot,
    la: computeLA(hostDeal.updated_at),
    ext: {
      parcel: cleanNull(hostDeal.parcel_id) ?? '—',
      county: cleanNull(hostDeal.property_county) ?? '—',
      zoning: cleanNull(hostDeal.zoning) ?? '—',
      yearBuilt: cleanNull(hostDeal.year_built) ?? '—',
      lotSF: cleanNull(hostDeal.lot_sf) ?? '—',
      assessed: cleanNull(hostDeal.assessed_value) ?? '—',
      lastSale: cleanNull(hostDeal.last_sale_date) ?? '—',
      lastPrice: cleanNull(hostDeal.last_sale_price) ?? '—',
      landVal: '—',
      bldgVal: '—',
      deed: '—',
      mortAmt: '—',
      mortLender: '—',
      mortDate: '—',
    },
    bullets: Array.isArray(hostDeal.brief_json?.bullets)
      ? hostDeal.brief_json.bullets
      : [],
    narr:
      cleanNull(hostDeal.brief_json?.summary) ??
      cleanNull(hostDeal.brief_json?.narrative) ??
      '',
  };
}

/**
 * Convert a host BuyBox (from useDeals().buyBoxes) to bundle BuyBox shape.
 */
export function toNDBox(hostBox) {
  if (!hostBox) return null;
  const id = hostBox.id;
  const name = cleanNull(hostBox.name) ?? cleanNull(hostBox.label) ?? '';
  const classes = Array.isArray(hostBox.asset_classes) ? hostBox.asset_classes : [];
  const asset = classes
    .map(assetClassLabel)
    .filter(Boolean)
    .join(' / ');
  const color = cleanNull(hostBox.color) ?? hashIdToColor(id);
  const depth =
    cleanNull(hostBox.deals) ??
    cleanNull(hostBox.deals_sent_total) ??
    0;
  return {
    id,
    name,
    asset,
    color,
    depth: Number(depth) || 0,
    mr: 0,
  };
}

/**
 * Build a 6-month calendar window: today − 5mo → today + 1mo. Counts host deals
 * by their sent_at ISO date.
 *
 * @param {Array} hostDeals
 * @param {Date|string} [today]
 * @returns {{ days: Array<{ key: string, count: number, isFuture: boolean, isToday: boolean }> }}
 */
export function buildCalendar(hostDeals, today = new Date()) {
  const ref = today instanceof Date ? today : new Date(today);
  const refStable = isNaN(ref.getTime()) ? new Date() : ref;
  const todayKey = isoDate(refStable);

  const counts = new Map();
  if (Array.isArray(hostDeals)) {
    for (const d of hostDeals) {
      if (!d) continue;
      const sent = cleanNull(d.sent_at) ?? cleanNull(d.created_at);
      const key = isoDate(sent);
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  // Window: 5 months back to 1 month forward, inclusive of today.
  const start = new Date(refStable);
  start.setMonth(start.getMonth() - 5);
  start.setHours(0, 0, 0, 0);
  const end = new Date(refStable);
  end.setMonth(end.getMonth() + 1);
  end.setHours(0, 0, 0, 0);

  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = isoDate(cursor);
    days.push({
      key,
      count: counts.get(key) || 0,
      isFuture: key > todayKey,
      isToday: key === todayKey,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return { days };
}
