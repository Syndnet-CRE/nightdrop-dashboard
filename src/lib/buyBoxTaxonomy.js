// Buy Box taxonomy — 10-class MVP. Locked 2026-05-20.
// MIRRORS ~/nightdrop-api/services/assetUseCodes.js exactly.
// Drift between this file and the three backend taxonomy files breaks the nightly matcher.

// 10 asset classes, order matters for UI display.
export const ASSET_CLASSES = [
  {
    id: 'self_storage',
    label: 'Self Storage',
    description: 'Self storage and mini-warehouse facilities',
    subtypes: [
      { label: 'Self Storage / Mini-Warehouse', code: 229 },
    ],
  },
  {
    id: 'multifamily',
    label: 'Multifamily',
    description: 'Duplex, triplex, quadruplex, apartments, and residential income',
    subtypes: [
      { label: 'Duplex (2 Units)',           code: 366 },
      { label: 'Triplex (3 Units)',          code: 383 },
      { label: 'Quadruplex (4 Units)',       code: 386 },
      { label: 'Apartment / Multifamily 5+', code: 369 },
      { label: 'Loft / Live-Work',           code: 378 },
      { label: 'Residential Income (NEC)',   code: 375 },
    ],
  },
  {
    id: 'mobile_home_rv',
    label: 'Mobile Home / RV Parks',
    description: 'Mobile home and RV park communities',
    subtypes: [
      { label: 'Mobile / Manufactured Home', code: 373 },
    ],
  },
  {
    id: 'residential_sfr',
    label: 'Single Family Residential',
    description: 'Single family, condos, townhouses, PUDs, cabins, zero-lot-line',
    subtypes: [
      { label: 'Single Family Residential', code: 385 },
      { label: 'Condominium',               code: 401 },
      { label: 'Townhouse',                 code: 360 },
      { label: 'Planned Unit Development',  code: 380 },
      { label: 'Cabin / Cottage',           code: 388 },
      { label: 'Zero Lot Line',             code: 381 },
    ],
  },
  {
    id: 'land',
    label: 'Land',
    description: 'Vacant land, agricultural, ranch, timberland, transitional parcels',
    subtypes: [
      { label: 'Vacant Land (General)',      code: 389 },
      { label: 'Vacant Land (Agricultural)', code: 120 },
      { label: 'Agricultural (General)',     code: 392 },
      { label: 'Ranch / Range Land',         code: 117 },
      { label: 'Cropland / Row Crops',       code: 105 },
      { label: 'Pastureland / Grazing',      code: 109 },
      { label: 'Timberland / Forestry',      code: 118 },
    ],
  },
  {
    id: 'industrial',
    label: 'Industrial',
    description: 'Warehouse, distribution, manufacturing, flex, processing',
    subtypes: [
      { label: 'Warehouse / Distribution',         code: 238 },
      { label: 'Light Industrial',                 code: 212 },
      { label: 'Heavy Industrial / Manufacturing', code: 220 },
      { label: 'Flex Industrial',                  code: 222 },
      { label: 'Processing / Packaging',           code: 210 },
      { label: 'Truck Terminal / Freight',         code: 231 },
      { label: 'Industrial Park',                  code: 280 },
      { label: 'Commercial Warehouse (Small)',     code: 184 },
    ],
  },
  {
    id: 'retail',
    label: 'Retail',
    description: 'Storefronts, shopping centers, restaurants, service retail',
    subtypes: [
      { label: 'Retail (General)',                code: 135 },
      { label: 'Strip Mall',                      code: 393 },
      { label: 'Neighborhood Shopping Center',    code: 126 },
      { label: 'Community Retail',                code: 361 },
      { label: 'Supermarket / Grocery',           code: 148 },
      { label: 'Convenience Store',               code: 124 },
      { label: 'Restaurant / Food Service',       code: 169 },
      { label: 'Fast Food / QSR',                 code: 146 },
      { label: 'Auto Dealership',                 code: 171 },
      { label: 'Auto Repair',                     code: 172 },
      { label: 'Drugstore / Pharmacy',            code: 127 },
      { label: 'Laundromat / Car Wash',           code: 186 },
    ],
  },
  {
    id: 'gas_station_c_store',
    label: 'Gas Station / C-Store',
    description: 'Service stations, convenience stores',
    subtypes: [
      { label: 'Service Station / Gas Station', code: 167 },
      { label: 'Convenience Store',             code: 124 },
    ],
  },
  {
    id: 'office',
    label: 'Office',
    description: 'Professional, medical, mixed-use office',
    subtypes: [
      { label: 'Office Building (General)',    code: 178 },
      { label: 'Professional Office',          code: 160 },
      { label: 'Medical Office',               code: 139 },
      { label: 'Office Park',                  code: 193 },
      { label: 'Mixed-Use Commercial',         code: 194 },
      { label: 'Commercial Loft / Mixed-Use',  code: 183 },
    ],
  },
  {
    id: 'special_purpose',
    label: 'Special Purpose',
    description: 'Banks, parking, recreation, theaters, healthcare, day care',
    subtypes: [
      { label: 'Bank / Savings Institution',          code: 150 },
      { label: 'Parking Lot / Garage',                code: 339 },
      { label: 'Bowling Alley / Recreation',          code: 151 },
      { label: 'Theater / Cinema',                    code: 348 },
      { label: 'Funeral Home',                        code: 133 },
      { label: 'Rehabilitation / Skilled Nursing',    code: 155 },
      { label: 'Healthcare / Medical Clinic',         code: 296 },
      { label: 'Day Care / Child Care',               code: 175 },
    ],
  },
];

// Land sub-asset slugs — passed via `sub_assets[]` on the buy box payload.
// Backend matcher in matcher_clauses.py routes path_of_growth through the
// Land Transitional rule (additive AND conditions configurable per buy box).
// acres_min / acres_max mirror the hard bounds in matcher_clauses.py and buyboxes.js /preview.
// Keep in sync if backend SQL changes.
export const LAND_SUB_ASSETS = [
  { slug: 'urban_infill',       label: 'Infill & Urban Lots',           acres_max: 3 },
  { slug: 'suburban_fringe',    label: 'Suburban Fringe',                acres_min: 3, acres_max: 40 },
  { slug: 'agricultural_rural', label: 'Rural & Agricultural Acreage' },
  { slug: 'path_of_growth',     label: 'Transitional / Path of Growth' },
];

// Building class A/B/C — multi-select. Each translates to a year_built range
// in the matcher (A >= 2010, B 1985..2009, C <= 1984). Year built min/max
// can be ANDed manually on top.
export const VALID_BUILDING_CLASSES = ['A', 'B', 'C'];

export const BUILDING_CLASS_YEAR_DEFAULTS = {
  A: { year_built_min: 2010, year_built_max: '' },
  B: { year_built_min: 1985, year_built_max: 2009 },
  C: { year_built_min: '',   year_built_max: 1984 },
};

// Schedule + distress + owner enums — unchanged from prior taxonomy
export const SCHEDULE_DAYS = [
  { abbr: 'mon', label: 'Mon' },
  { abbr: 'tue', label: 'Tue' },
  { abbr: 'wed', label: 'Wed' },
  { abbr: 'thu', label: 'Thu' },
  { abbr: 'fri', label: 'Fri' },
  { abbr: 'sat', label: 'Sat' },
  { abbr: 'sun', label: 'Sun' },
];

export const ALL_DAYS = SCHEDULE_DAYS.map(d => d.abbr);

export const DISTRESS_SIGNAL_OPTIONS = [
  { value: 'active-foreclosure',     label: 'Active foreclosure record' },
  { value: 'tax-delinquent',         label: 'Tax delinquent' },
  { value: 'absentee-owner',         label: 'Absentee owner' },
  { value: 'long-term-hold',         label: 'Long-term hold' },
  { value: 'quit-claim-deed',        label: 'Quit claim deed in history' },
  { value: 'non-arms-length',        label: 'Non-arms-length prior sale' },
  { value: 'investor-buyer',         label: 'Investor buyer at last purchase' },
  { value: 'arm-mortgage',           label: 'ARM mortgage' },
  { value: 'high-ltv',               label: 'High LTV (>80%)' },
  { value: 'free-and-clear',         label: 'Free and clear (no mortgage)' },
];

export const OWNER_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'llc',        label: 'LLC / Entity' },
  { value: 'trust',      label: 'Trust' },
  { value: 'corporate',  label: 'Corporate' },
];

export const GEO_TYPES = [
  { id: 'state',  label: 'State' },
  { id: 'metro',  label: 'Metro / CBSA' },
  { id: 'zip',    label: 'Zip Code List' },
  { id: 'radius', label: 'Radius Around Address' },
];

export const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
  ['DC','District of Columbia'],
];

export const MAJOR_METROS = [
  'Atlanta, GA','Austin, TX','Baltimore, MD','Boston, MA','Charlotte, NC',
  'Chicago, IL','Cincinnati, OH','Cleveland, OH','Columbus, OH','Dallas, TX',
  'Denver, CO','Detroit, MI','Fort Worth, TX','Houston, TX','Indianapolis, IN',
  'Jacksonville, FL','Kansas City, MO','Las Vegas, NV','Los Angeles, CA','Louisville, KY',
  'Memphis, TN','Miami, FL','Milwaukee, WI','Minneapolis, MN','Nashville, TN',
  'New Orleans, LA','New York, NY','Oklahoma City, OK','Orlando, FL','Philadelphia, PA',
  'Phoenix, AZ','Pittsburgh, PA','Portland, OR','Raleigh, NC','Richmond, VA',
  'Riverside, CA','Sacramento, CA','Salt Lake City, UT','San Antonio, TX','San Diego, CA',
  'San Francisco, CA','San Jose, CA','Seattle, WA','St. Louis, MO','Tampa, FL',
  'Virginia Beach, VA','Washington, DC',
];

// Back-compat shim: legacy buy boxes may have asset_class strings like 'sfr',
// 'hospitality', 'gas_station'. Map them to the new 10-class set on load.
const LEGACY_CLASS_ALIASES = {
  sfr: 'residential_sfr',
  hospitality: 'special_purpose',
  gas_station: 'gas_station_c_store',
  rv_park: 'mobile_home_rv',
  mixed_use: 'office',
  medical_office: 'office',
  hotel: 'special_purpose',
};

export function normalizeAssetClassSlug(slug) {
  if (!slug) return slug;
  return LEGACY_CLASS_ALIASES[slug] || slug;
}

export function getAssetClass(id) {
  const normalized = normalizeAssetClassSlug(id);
  return ASSET_CLASSES.find(c => c.id === normalized) || null;
}

// Asset class palette — distinct hues per MVP class for graphs, badges, legends.
// Greys for unknown / unresolved classes so they read as secondary.
const ASSET_CLASS_COLORS = {
  self_storage:        '#F4B73E',
  multifamily:         '#6366F1',
  mobile_home_rv:      '#14B8A6',
  residential_sfr:     '#3E7BFA',
  land:                '#5BCC48',
  industrial:          '#475569',
  retail:              '#F97316',
  gas_station_c_store: '#EAB308',
  office:              '#A855F7',
  special_purpose:     '#EC4899',
};

export function getAssetClassColor(id) {
  const normalized = normalizeAssetClassSlug(id);
  return ASSET_CLASS_COLORS[normalized] || '#9DA2B3';
}

export function formatUseCodes(asset_class, asset_use_codes) {
  if (!asset_class || !asset_use_codes?.length) return '';
  const cls = getAssetClass(asset_class);
  if (!cls) return asset_class;
  const labels = asset_use_codes
    .map(code => cls.subtypes.find(s => s.code === code)?.label)
    .filter(Boolean);
  return labels.join(', ') || asset_class;
}

export function formatSchedule(run_schedule) {
  if (!run_schedule?.days?.length) return 'Runs daily';
  if (run_schedule.days.length === 7) return 'Runs daily';
  const labels = SCHEDULE_DAYS
    .filter(d => run_schedule.days.includes(d.abbr))
    .map(d => d.label);
  return `Runs ${labels.join(' / ')}`;
}

export function formatGeo(box) {
  if (box.geo_states?.length) return box.geo_states.join(', ');
  if (box.geo_cities?.length) {
    const n = box.geo_cities.length;
    return n === 1 ? `${box.geo_cities[0]} metro` : `${n} metros`;
  }
  if (box.geo_zips?.length) {
    const n = box.geo_zips.length;
    return n === 1 ? `ZIP ${box.geo_zips[0]}` : `${n} zip codes`;
  }
  if (box.geo_radius_miles && box.geo_radius_address) {
    return `${box.geo_radius_miles}mi radius — ${box.geo_radius_address}`;
  }
  return 'No geography set';
}
