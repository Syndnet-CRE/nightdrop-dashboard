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

/**
 * ISO date YYYY-MM-DD using the user's local time-zone. null on invalid.
 *
 * Previously this used `toISOString()` which is UTC. That caused deals created
 * in the evening US Central Time (after 7pm CT in summer / 6pm CT in winter)
 * to land on the next calendar day in the dashboard's day filter, because UTC
 * had already rolled over. The calendar's "today" was also UTC-based, so on
 * busy late-evening sessions deals would silently disappear into "tomorrow".
 * Always treat dates from the user's local clock, not UTC.
 */
export function isoDate(input) {
  if (!hasVal(input)) return null;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

  // Backend `/api/dealfeed/deals` rebuilt 2026-05-20 returns camelCase + shorter
  // field names (sentAt, buyBoxId, briefJson, addr, sf, entityType, yearBuilt,
  // attomId). Older fixtures and tests use snake_case (sent_at, buy_box_id,
  // brief_json, address, building_sf, owner_type, year_built). Read camelCase
  // FIRST, then fall back to snake_case so the adapter is robust to both shapes.
  const id = hostDeal.id;
  const briefJson = hostDeal.briefJson ?? hostDeal.brief_json ?? null;
  const bx =
    cleanNull(hostDeal.buyBoxId) ??
    cleanNull(hostDeal.buy_box_id) ??
    cleanNull(hostDeal.box) ??
    null;

  const rawScore =
    cleanNull(hostDeal.score) ??
    (hasVal(hostDeal.match_score) ? Number(hostDeal.match_score) * 10 : null);
  const score = hasVal(rawScore) ? Number(rawScore) : 0;

  const addr =
    cleanNull(hostDeal.addr) ??
    cleanNull(hostDeal.address) ??
    cleanNull(briefJson?.address) ??
    '';

  const cityPart = cleanNull(hostDeal.property_city) ?? cleanNull(briefJson?.city);
  const statePart = cleanNull(hostDeal.property_state) ?? cleanNull(briefJson?.state);
  const zipPart = cleanNull(hostDeal.property_zip) ?? cleanNull(briefJson?.zip);
  const cityStr = [
    cityPart ? `${cityPart},` : '',
    statePart || '',
    zipPart || '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const brief =
    cleanNull(briefJson?.bullets?.[0]?.body) ??
    cleanNull(hostDeal.signals?.[0]?.description) ??
    cleanNull(hostDeal.signals?.[0]?.tag) ??
    cleanNull(hostDeal.headline) ??
    '';

  const sentRaw =
    cleanNull(hostDeal.sentAt) ??
    cleanNull(hostDeal.sent_at) ??
    cleanNull(hostDeal.created_at);
  const date = fmtDate(sentRaw, 'weekday');
  const deliveredOn = isoDate(sentRaw);

  // Backend may return `asset` as either a slug ('self_storage') or a formatted
  // label ('Self Storage / Mini-Warehouse'). assetClassLabel returns '' for
  // anything that isn't a known slug — when that happens, fall through to the
  // raw value so the label still displays.
  const assetRaw =
    cleanNull(hostDeal.asset_class) ??
    cleanNull(hostDeal.asset) ??
    cleanNull(briefJson?.asset_class) ??
    cleanNull(briefJson?.resolved_asset_type);
  const slugLabel = assetClassLabel(assetRaw);
  const asset = slugLabel || (assetRaw ? String(assetRaw) : '');

  const value = cleanNull(hostDeal.value) ?? cleanNull(briefJson?.assessed_value);
  const buildingSf =
    cleanNull(hostDeal.sf) ??
    cleanNull(hostDeal.building_sf) ??
    cleanNull(briefJson?.sf) ??
    cleanNull(briefJson?.building_sf);
  const psf =
    hasVal(value) && hasVal(buildingSf) && Number(buildingSf) > 0
      ? Math.round(Number(value) / Number(buildingSf))
      : null;

  // Backend's `entityType` is already a human label ('LLC/Corp', 'Trust'); the
  // legacy `owner_type` is a slug that humanizeOwnerType resolves. Prefer the
  // labelled value when present.
  const owner =
    cleanNull(hostDeal.entityType) ??
    humanizeOwnerType(hostDeal.owner_type) ??
    '';
  const lastSaleRaw =
    cleanNull(hostDeal.last_sale_date) ??
    cleanNull(briefJson?.last_sale_date);
  const hold = yearsSince(lastSaleRaw);

  const sig =
    cleanNull(hostDeal.signals?.[0]?.tag) ??
    cleanNull(hostDeal.signals?.[0]?.label) ??
    '';
  const sc = categoryToPillClass(hostDeal.signals?.[0]?.category);

  const stage = cleanNull(hostDeal.stage) ?? 'New';
  const notes = cleanNull(hostDeal.notes) ?? '';

  const feedback = cleanNull(hostDeal.feedback) ?? cleanNull(hostDeal.fb);
  const hot = feedback === 'hot';

  // `updated_at` isn't returned by the rebuilt backend; sent_at is the best
  // proxy for "last activity" until a real updated_at column lands.
  const updatedAtRaw =
    cleanNull(hostDeal.updated_at) ??
    cleanNull(hostDeal.sentAt) ??
    cleanNull(hostDeal.sent_at);
  const la = computeLA(updatedAtRaw);

  // lat/lng are not used by the bundle's table renderer today, but the
  // expanded-row view + the in-bundle detail handoff both need them, and
  // future consumers shouldn't have to round-trip through useDeals() for
  // coordinates. Pass through camelCase first (current backend), then
  // legacy latitude/longitude.
  const lat = cleanNull(hostDeal.lat) ?? cleanNull(hostDeal.latitude) ?? cleanNull(briefJson?.lat) ?? null;
  const lng = cleanNull(hostDeal.lng) ?? cleanNull(hostDeal.longitude) ?? cleanNull(briefJson?.lng) ?? null;

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
    lat: hasVal(lat) ? Number(lat) : null,
    lng: hasVal(lng) ? Number(lng) : null,
    owner,
    hold,
    sig,
    sc,
    stage,
    notes,
    unread: !isRead(id),
    saved:
      !!cleanNull(hostDeal.saved) ||
      !!cleanNull(hostDeal.saved_at),
    hot,
    up: hot,
    la,
    ext: {
      parcel:
        cleanNull(hostDeal.parcel_id) ??
        cleanNull(hostDeal.apn) ??
        cleanNull(briefJson?.parcel_id) ??
        cleanNull(briefJson?.apn) ??
        '—',
      county:
        cleanNull(hostDeal.property_county) ??
        cleanNull(hostDeal.county) ??
        cleanNull(briefJson?.county) ??
        '—',
      zoning:
        cleanNull(hostDeal.zoning) ??
        cleanNull(briefJson?.zoning) ??
        '—',
      yearBuilt:
        cleanNull(hostDeal.yearBuilt) ??
        cleanNull(hostDeal.year_built) ??
        cleanNull(briefJson?.year_built) ??
        '—',
      lotSF:
        cleanNull(hostDeal.lot_sf) ??
        cleanNull(briefJson?.lot_sf) ??
        '—',
      assessed:
        cleanNull(hostDeal.assessed_value) ??
        cleanNull(briefJson?.assessed_value) ??
        '—',
      lastSale: lastSaleRaw ?? '—',
      lastPrice:
        cleanNull(hostDeal.last_sale_price) ??
        cleanNull(briefJson?.last_sale_price) ??
        '—',
      landVal: '—',
      bldgVal: '—',
      deed: '—',
      // Mortgage principal — backend's normalizeDeal returns this as
      // `original_loan_amount` (confirmed in the 2026-05-27 ALL_KEYS dump
      // for brady@parcyl.ai). briefJson.mortgage_amount is a legacy fallback.
      mortAmt:
        cleanNull(hostDeal.original_loan_amount) ??
        cleanNull(briefJson?.mortgage_amount) ??
        '—',
      // Standardized lender name from backend; briefJson.lender_name is the
      // pre-normalization free-text field.
      mortLender:
        cleanNull(hostDeal.lender_name_standardized) ??
        cleanNull(briefJson?.lender_name) ??
        '—',
      mortDate:
        cleanNull(hostDeal.foreclosure_recording_date) ??
        cleanNull(briefJson?.mortgage_date) ??
        '—',
    },
    bullets: Array.isArray(briefJson?.bullets) ? briefJson.bullets : [],
    narr:
      cleanNull(briefJson?.summary) ??
      cleanNull(briefJson?.narrative) ??
      cleanNull(hostDeal.narrative) ??
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
      // Match the toNDDeal date preference: backend uses camelCase `sentAt`.
      const sent =
        cleanNull(d.sentAt) ??
        cleanNull(d.sent_at) ??
        cleanNull(d.created_at);
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
