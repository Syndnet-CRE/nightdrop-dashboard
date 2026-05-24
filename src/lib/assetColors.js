// Single source of truth for asset-class → color and land-acres → bucket.
// Used by DealMap (cluster layer paint expressions) and MapLegend (swatches).

export const CATEGORIES = [
  { id: 'land_small',   label: 'Land 0–25 ac',    color: '#5BCC48' },
  { id: 'land_med',     label: 'Land 25–100 ac',  color: '#38A226' },
  { id: 'land_large',   label: 'Land 100–200 ac', color: '#D4A934' },
  { id: 'land_xlarge',  label: 'Land 200+ ac',    color: '#E07A1F' },
  { id: 'self_storage', label: 'Self-Storage',    color: '#3F87E5' },
  { id: 'multifamily',  label: 'Multifamily',     color: '#9E6CDA' },
  { id: 'industrial',   label: 'Industrial',      color: '#5B6E84' },
  { id: 'retail',       label: 'Retail',          color: '#E5484D' },
  { id: 'office',       label: 'Office',          color: '#3FAFA5' },
  { id: 'other',        label: 'Other',           color: '#8A8F9C' },
];

const COLOR_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c.color]));

// Mapbox `match` expression for the cluster unclustered-point layer paint.
// Flattens into ['match', ['get', 'category'], 'land_small', '#…', …, defaultColor].
export const CATEGORY_PAINT_EXPRESSION = [
  'match',
  ['get', 'category'],
  ...CATEGORIES.flatMap(c => [c.id, c.color]),
  COLOR_BY_ID.other,
];

// Resolve a property to its asset-class color (for tinting MapPinSVG).
export function colorFor(prop) {
  return COLOR_BY_ID[categorize(prop)] || COLOR_BY_ID.other;
}

// Map a property record { asset, acres } to a category id.
export function categorize(prop) {
  const asset = String(prop?.asset || prop?.asset_class || '').toLowerCase();
  if (asset === 'land' || asset.includes('land')) {
    const ac = Number(prop?.acres) || 0;
    if (ac < 25)  return 'land_small';
    if (ac < 100) return 'land_med';
    if (ac < 200) return 'land_large';
    return 'land_xlarge';
  }
  if (asset.includes('self') || asset.includes('storage')) return 'self_storage';
  if (asset.includes('multifamily') || asset.includes('apartment'))  return 'multifamily';
  if (asset.includes('industrial') || asset.includes('warehouse') || asset.includes('flex')) return 'industrial';
  if (asset.includes('retail') || asset.includes('shopping')) return 'retail';
  if (asset.includes('office')) return 'office';
  return 'other';
}
