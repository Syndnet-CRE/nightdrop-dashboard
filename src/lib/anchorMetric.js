import { fmtMoney } from './format';

function moneyShort(v) {
  if (v == null || !Number.isFinite(Number(v))) return null;
  const n = Number(v);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return fmtMoney(n);
}

function safeNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function perUnit(value, units) {
  const v = safeNum(value);
  const u = safeNum(units);
  if (!v || !u || u <= 0) return null;
  return v / u;
}

const RESOLVERS = {
  multifamily: (d) => {
    const ppu = perUnit(d.assessed_value, d.units);
    if (ppu != null) {
      return { primary: `${moneyShort(ppu)} /unit`, secondary: d.units ? `${d.units} units` : null };
    }
    return { primary: moneyShort(d.assessed_value), secondary: d.units ? `${d.units} units` : null };
  },
  industrial: (d) => {
    const psf = perUnit(d.assessed_value, d.building_sf);
    if (psf != null) {
      return { primary: `$${psf.toFixed(0)} /SF`, secondary: d.building_sf ? `${Number(d.building_sf).toLocaleString()} SF` : null };
    }
    return { primary: moneyShort(d.assessed_value), secondary: d.building_sf ? `${Number(d.building_sf).toLocaleString()} SF` : null };
  },
  self_storage: (d) => {
    const psf = perUnit(d.assessed_value, d.building_sf);
    if (psf != null) {
      return { primary: `$${psf.toFixed(0)} /NRSF`, secondary: d.building_sf ? `${Number(d.building_sf).toLocaleString()} SF` : null };
    }
    return { primary: moneyShort(d.assessed_value), secondary: d.building_sf ? `${Number(d.building_sf).toLocaleString()} SF` : null };
  },
  retail: (d) => {
    const psf = perUnit(d.assessed_value, d.building_sf);
    if (psf != null) {
      return { primary: `$${psf.toFixed(0)} /GLA`, secondary: d.building_sf ? `${Number(d.building_sf).toLocaleString()} SF` : null };
    }
    return { primary: moneyShort(d.assessed_value), secondary: d.building_sf ? `${Number(d.building_sf).toLocaleString()} SF` : null };
  },
  office: (d) => {
    const psf = perUnit(d.assessed_value, d.building_sf);
    if (psf != null) {
      return { primary: `$${psf.toFixed(0)} /SF`, secondary: d.building_sf ? `${Number(d.building_sf).toLocaleString()} SF` : null };
    }
    return { primary: moneyShort(d.assessed_value), secondary: d.building_sf ? `${Number(d.building_sf).toLocaleString()} SF` : null };
  },
  land: (d) => {
    const ppa = perUnit(d.assessed_value, d.acres);
    if (ppa != null) {
      return { primary: `${moneyShort(ppa)} /acre`, secondary: d.acres ? `${Number(d.acres).toFixed(2)} ac` : null };
    }
    return { primary: moneyShort(d.assessed_value), secondary: d.acres ? `${Number(d.acres).toFixed(2)} ac` : null };
  },
};

const FALLBACK = (d) => ({
  primary: moneyShort(d.assessed_value) || '—',
  secondary: null,
});

export function anchorMetric(deal, assetClass) {
  const resolver = RESOLVERS[assetClass] || FALLBACK;
  const out = resolver(deal);
  if (!out.primary) return FALLBACK(deal);
  return out;
}
