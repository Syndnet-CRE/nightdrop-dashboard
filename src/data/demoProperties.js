// Seeded demo property dataset for the map demo (?demo=true on /map).
// Deterministic: same output every run.
// Distribution: weighted concentrations at real MSAs + diffuse scatter along
// highway corridors and small cities, deliberately avoiding the Gulf and
// empty desert. Asset mix is land-heavy.

// Tiny mulberry32 PRNG — deterministic, no deps.
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Major MSAs that DO NOT get a cluster bubble — render as individual scatter
// pins. Cities promoted to cluster bubbles (Miami, Phoenix, Dallas, Orlando,
// Tampa, San Antonio, Chicago) are excluded from this list and live in
// CLUSTER_CITIES below.
const MSAS = [
  // Mega
  { city: 'Atlanta',          state: 'GA', lat: 33.7490, lng:  -84.3880, weight: 14 },
  { city: 'Houston',          state: 'TX', lat: 29.7604, lng:  -95.3698, weight: 13 },
  // Large
  { city: 'Charlotte',        state: 'NC', lat: 35.2271, lng:  -80.8431, weight: 8 },
  { city: 'Austin',           state: 'TX', lat: 30.2672, lng:  -97.7431, weight: 7 },
  { city: 'Denver',           state: 'CO', lat: 39.7392, lng: -104.9903, weight: 7 },
  { city: 'Nashville',        state: 'TN', lat: 36.1627, lng:  -86.7816, weight: 7 },
  { city: 'Jacksonville',     state: 'FL', lat: 30.3322, lng:  -81.6557, weight: 6 },
  { city: 'Indianapolis',     state: 'IN', lat: 39.7684, lng:  -86.1581, weight: 6 },
  { city: 'Memphis',          state: 'TN', lat: 35.1495, lng:  -90.0490, weight: 6 },
  // Medium
  { city: 'Raleigh',          state: 'NC', lat: 35.7796, lng:  -78.6382, weight: 5 },
  { city: 'St. Louis',        state: 'MO', lat: 38.6270, lng:  -90.1994, weight: 5 },
  { city: 'Kansas City',      state: 'MO', lat: 39.0997, lng:  -94.5786, weight: 5 },
  { city: 'New Orleans',      state: 'LA', lat: 29.9511, lng:  -90.0715, weight: 5 },
  { city: 'Birmingham',       state: 'AL', lat: 33.5186, lng:  -86.8104, weight: 5 },
  { city: 'Charleston',       state: 'SC', lat: 32.7765, lng:  -79.9311, weight: 4 },
  { city: 'Knoxville',        state: 'TN', lat: 35.9606, lng:  -83.9207, weight: 4 },
  { city: 'Tucson',           state: 'AZ', lat: 32.2226, lng: -110.9747, weight: 4 },
  { city: 'Colorado Springs', state: 'CO', lat: 38.8339, lng: -104.8214, weight: 4 },
  // Small
  { city: 'El Paso',          state: 'TX', lat: 31.7619, lng: -106.4850, weight: 3 },
  { city: 'Baton Rouge',      state: 'LA', lat: 30.4515, lng:  -91.1871, weight: 3 },
  { city: 'Jackson',          state: 'MS', lat: 32.2988, lng:  -90.1848, weight: 3 },
  { city: 'Mobile',           state: 'AL', lat: 30.6954, lng:  -88.0399, weight: 3 },
  { city: 'Savannah',         state: 'GA', lat: 32.0809, lng:  -81.0912, weight: 3 },
  { city: 'Columbia',         state: 'SC', lat: 34.0007, lng:  -81.0348, weight: 3 },
  { city: 'Chattanooga',      state: 'TN', lat: 35.0456, lng:  -85.3097, weight: 3 },
  { city: 'Tallahassee',      state: 'FL', lat: 30.4383, lng:  -84.2807, weight: 3 },
];

// Scatter anchors — small cities, highway corridors, rural development pockets.
// Larger jitter (~28 mi) so pins spread between MSAs along plausible
// development paths. Deliberately avoids the Gulf and empty Western desert.
const SCATTER_ANCHORS = [
  // I-35 corridor TX
  { city: 'Waco',          state: 'TX', lat: 31.5494, lng:  -97.1467 },
  { city: 'Temple',        state: 'TX', lat: 31.0982, lng:  -97.3428 },
  { city: 'San Marcos',    state: 'TX', lat: 29.8833, lng:  -97.9414 },
  // TX Gulf coast (inland, not in water)
  { city: 'Corpus Christi',state: 'TX', lat: 27.8006, lng:  -97.3964 },
  { city: 'Victoria',      state: 'TX', lat: 28.8053, lng:  -97.0036 },
  // East TX / LA / MS / AL coast (inland)
  { city: 'Beaumont',      state: 'TX', lat: 30.0860, lng:  -94.1018 },
  { city: 'Lake Charles',  state: 'LA', lat: 30.2266, lng:  -93.2174 },
  { city: 'Lafayette',     state: 'LA', lat: 30.2241, lng:  -92.0198 },
  { city: 'Gulfport',      state: 'MS', lat: 30.3674, lng:  -89.0928 },
  { city: 'Pensacola',     state: 'FL', lat: 30.4213, lng:  -87.2169 },
  // East TX rural
  { city: 'Tyler',         state: 'TX', lat: 32.3513, lng:  -95.3011 },
  { city: 'Lufkin',        state: 'TX', lat: 31.3382, lng:  -94.7291 },
  { city: 'Texarkana',     state: 'TX', lat: 33.4251, lng:  -94.0477 },
  // AR / TN corridor
  { city: 'Little Rock',   state: 'AR', lat: 34.7465, lng:  -92.2896 },
  { city: 'Marion',        state: 'AR', lat: 35.2148, lng:  -90.1979 },
  { city: 'Fayetteville',  state: 'AR', lat: 36.0626, lng:  -94.1574 },
  { city: 'Jackson',       state: 'TN', lat: 35.6145, lng:  -88.8139 },
  // AL / GA piedmont rural
  { city: 'Tuscaloosa',    state: 'AL', lat: 33.2098, lng:  -87.5692 },
  { city: 'Montgomery',    state: 'AL', lat: 32.3792, lng:  -86.3077 },
  { city: 'Auburn',        state: 'AL', lat: 32.6099, lng:  -85.4808 },
  { city: 'Columbus',      state: 'GA', lat: 32.4609, lng:  -84.9877 },
  { city: 'Macon',         state: 'GA', lat: 32.8407, lng:  -83.6324 },
  { city: 'Augusta',       state: 'GA', lat: 33.4735, lng:  -82.0105 },
  // SC / NC piedmont
  { city: 'Greenville',    state: 'SC', lat: 34.8526, lng:  -82.3940 },
  { city: 'Florence',      state: 'SC', lat: 34.1954, lng:  -79.7626 },
  { city: 'Wilmington',    state: 'NC', lat: 34.2257, lng:  -77.9447 },
  { city: 'Greensboro',    state: 'NC', lat: 36.0726, lng:  -79.7920 },
  { city: 'Asheville',     state: 'NC', lat: 35.5951, lng:  -82.5515 },
  // North FL
  { city: 'Gainesville',   state: 'FL', lat: 29.6516, lng:  -82.3248 },
  { city: 'Ocala',         state: 'FL', lat: 29.1872, lng:  -82.1401 },
  // AZ near Phoenix (developable, not desert)
  { city: 'Casa Grande',   state: 'AZ', lat: 32.8795, lng: -111.7574 },
  { city: 'Prescott',      state: 'AZ', lat: 34.5400, lng: -112.4685 },
  // CO front range (not Rockies interior)
  { city: 'Pueblo',        state: 'CO', lat: 38.2544, lng: -104.6091 },
  { city: 'Fort Collins',  state: 'CO', lat: 40.5853, lng: -105.0844 },
  // MO / IN / IL secondary
  { city: 'Springfield',   state: 'MO', lat: 37.2089, lng:  -93.2923 },
  { city: 'Branson',       state: 'MO', lat: 36.6437, lng:  -93.2185 },
  { city: 'Bloomington',   state: 'IN', lat: 39.1653, lng:  -86.5264 },
  { city: 'Fort Wayne',    state: 'IN', lat: 41.0793, lng:  -85.1394 },
  { city: 'Peoria',        state: 'IL', lat: 40.6936, lng:  -89.5890 },
];

// Cluster bubble cities — render as Mapbox cluster bubbles instead of
// individual pins. Each city seeds N points at the cluster source so a single
// aggregated bubble (count badge) forms over the metro.
export const CLUSTER_CITIES = [
  { city: 'Miami',       state: 'FL', lat: 25.7617, lng:  -80.1918, count: 22 },
  { city: 'Phoenix',     state: 'AZ', lat: 33.4484, lng: -112.0740, count: 24 },
  { city: 'Dallas',      state: 'TX', lat: 32.7767, lng:  -96.7970, count: 26 },
  { city: 'Orlando',     state: 'FL', lat: 28.5383, lng:  -81.3792, count: 18 },
  { city: 'Tampa',       state: 'FL', lat: 27.9506, lng:  -82.4572, count: 20 },
  { city: 'San Antonio', state: 'TX', lat: 29.4241, lng:  -98.4936, count: 18 },
  { city: 'Chicago',     state: 'IL', lat: 41.8781, lng:  -87.6298, count: 28 },
];

// Land-heavy: green dominates the map.
const ASSET_MIX = [
  { asset: 'Land',         p: 0.65 },
  { asset: 'Self-Storage', p: 0.08 },
  { asset: 'Multifamily',  p: 0.07 },
  { asset: 'Industrial',   p: 0.06 },
  { asset: 'Retail',       p: 0.06 },
  { asset: 'Office',       p: 0.04 },
  { asset: 'Mixed-Use',    p: 0.04 },
];

const LAND_ACRE_BUCKETS = [
  { min: 1,   max: 25,   p: 0.30 },
  { min: 25,  max: 100,  p: 0.35 },
  { min: 100, max: 200,  p: 0.20 },
  { min: 200, max: 1000, p: 0.15 },
];

const STREET_NAMES = [
  'Industrial', 'Park', 'Commerce', 'Oak', 'Cedar', 'Maple', 'Lakeshore',
  'Hillcrest', 'Riverside', 'Sunset', 'Highland', 'Pine', 'Magnolia',
  'Cypress', 'Birch', 'Walnut', 'Old Mill', 'Cobb', 'Marietta', 'Buford',
  'Powder Springs', 'Macland', 'Cuernavaca', 'Spicewood', 'Andrew',
];
const STREET_SUFFIXES = ['Rd', 'Dr', 'Blvd', 'Ave', 'St', 'Way', 'Pkwy', 'Ln', 'Ct', 'Hwy'];

const ZIP_BASE = {
  TX: 75, LA: 70, MS: 39, AL: 35, FL: 33, GA: 30, SC: 29, NC: 28,
  CO: 80, AZ: 85, MO: 64, IN: 46, IL: 60, TN: 37, AR: 72,
};

const VALUE_RANGES = {
  'Land':         { min:    200_000, max:  3_000_000 },
  'Self-Storage': { min:    900_000, max:  8_500_000 },
  'Multifamily':  { min:  1_200_000, max: 15_000_000 },
  'Industrial':   { min:  1_000_000, max: 20_000_000 },
  'Retail':       { min:    750_000, max: 12_000_000 },
  'Office':       { min:  1_500_000, max: 18_000_000 },
  'Mixed-Use':    { min:    900_000, max:  9_500_000 },
};

function pickWeighted(rand, table) {
  const r = rand();
  let acc = 0;
  for (const row of table) {
    acc += row.p;
    if (r <= acc) return row;
  }
  return table[table.length - 1];
}

function buildOne(rand, anchor, jitterDeg, idx) {
  const lat = anchor.lat + (rand() - 0.5) * jitterDeg * 2;
  const lng = anchor.lng + (rand() - 0.5) * jitterDeg * 2;

  const assetRow = pickWeighted(rand, ASSET_MIX);
  const asset = assetRow.asset;

  let acres;
  if (asset === 'Land') {
    const bucket = pickWeighted(rand, LAND_ACRE_BUCKETS);
    acres = +(bucket.min + rand() * (bucket.max - bucket.min)).toFixed(2);
  } else {
    acres = +(0.3 + rand() * 4).toFixed(2);
  }

  const range = VALUE_RANGES[asset] || VALUE_RANGES['Land'];
  const value = Math.round((range.min + rand() * (range.max - range.min)) / 1000) * 1000;
  const score = 60 + Math.floor(rand() * 36);

  const streetNum = 100 + Math.floor(rand() * 9900);
  const streetName = STREET_NAMES[Math.floor(rand() * STREET_NAMES.length)];
  const streetSuffix = STREET_SUFFIXES[Math.floor(rand() * STREET_SUFFIXES.length)];
  const addr = `${streetNum} ${streetName} ${streetSuffix}`;
  const zipPrefix = ZIP_BASE[anchor.state] ?? 50;
  const zip = `${zipPrefix}${String(100 + Math.floor(rand() * 900)).slice(-3)}`;

  return {
    id: `demo-${idx}`,
    addr,
    city: `${anchor.city}, ${anchor.state} ${zip}`,
    state: anchor.state,
    asset,
    acres,
    value,
    score,
    lat,
    lng,
    box: `${anchor.city} — ${asset}`,
  };
}

// MSA pin count derived from weight. Total MSA pins ~190.
// Scatter pin count = constant per anchor. Total scatter ~160.
// Grand total ~350.
const MSA_JITTER_DEG = 0.15;        // ~10 miles
const SCATTER_JITTER_DEG = 0.40;    // ~28 miles
const PINS_PER_SCATTER_ANCHOR = 4;

function generate() {
  const rand = mulberry32(20260523);
  const out = [];
  let id = 0;

  // MSA-concentrated pins, weighted by city size.
  for (const msa of MSAS) {
    for (let i = 0; i < msa.weight; i++) {
      out.push(buildOne(rand, msa, MSA_JITTER_DEG, id++));
    }
  }

  // Scatter pins along corridors / small cities.
  for (const anchor of SCATTER_ANCHORS) {
    for (let i = 0; i < PINS_PER_SCATTER_ANCHOR; i++) {
      out.push(buildOne(rand, anchor, SCATTER_JITTER_DEG, id++));
    }
  }

  return out;
}

export const DEMO_PROPERTIES = generate();

// Tight cluster source for the cluster-bubble cities. Points are heavily
// concentrated so Mapbox's cluster algorithm aggregates them into one big
// numbered bubble at typical zoom.
function generateClusterPoints() {
  const rand = mulberry32(20260524);
  const out = [];
  let id = 0;
  for (const city of CLUSTER_CITIES) {
    for (let i = 0; i < city.count; i++) {
      // ~3 mi tight jitter so points stay inside the cluster radius.
      const lat = city.lat + (rand() - 0.5) * 0.08;
      const lng = city.lng + (rand() - 0.5) * 0.08;
      // Asset class still drives the unclustered-point color at high zoom.
      const assetRow = pickWeighted(rand, ASSET_MIX);
      const asset = assetRow.asset;
      let acres;
      if (asset === 'Land') {
        const bucket = pickWeighted(rand, LAND_ACRE_BUCKETS);
        acres = +(bucket.min + rand() * (bucket.max - bucket.min)).toFixed(2);
      } else {
        acres = +(0.3 + rand() * 4).toFixed(2);
      }
      out.push({
        id: `demo-cluster-${id++}`,
        lat, lng, asset, acres,
        city: `${city.city}, ${city.state}`,
      });
    }
  }
  return out;
}

export const DEMO_CLUSTER_POINTS = generateClusterPoints();
