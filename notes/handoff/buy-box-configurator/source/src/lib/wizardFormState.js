// Buy Box Wizard form state, payload builder, and backend → form deserializer.
// Aligned with ~/nightdrop-api migration 049 + buyboxes.js PATCHABLE_FIELDS (locked 2026-05-20).
//
// Three-state booleans: null = "no filter", true / false = explicit.
// Numeric fields with empty string serialize to null.

import { normalizeAssetClassSlug, getAssetClass } from './buyBoxTaxonomy';

export const EMPTY_FORM = {
  // Asset
  assets: [],            // single-element array carrying the asset_class slug
  subtypes: [],          // INTEGER[] use codes (asset_use_codes)
  sub_assets: [],        // string[] of land slugs ('urban_infill' | 'suburban_fringe' | 'agricultural_rural' | 'path_of_growth')

  // Geography
  geo: {
    states: [],
    counties: [],        // 'TX:Travis' format
    metros: [],          // 'Austin, TX'
    zips: [],
  },

  // Physical envelope
  phys: {
    sf_min: '', sf_max: '',
    acres_min: '', acres_max: '',
    lot_sf_min: '', lot_sf_max: '',
    year_min: '', year_max: '',
    stories_min: '', stories_max: '',
    units_min: '', units_max: '',
    beds_min: '', beds_max: '',
    baths_min: '', baths_max: '',
    lot_width_min: '', lot_depth_min: '',
    building_classes: [],           // subset of ['A','B','C']
    construction_types: [],
    foundation_types: [],
    roof_types: [],
    garage_types: [],
  },

  // Financial
  fin: {
    price_min: '', price_max: '',   // → value_min / value_max
    equity_preset: '',              // '25%' chip → backend min_equity_dollar (computed from value_min)
    price_per_unit_max: '',
    improvement_to_land_max: '',
    development_potential_min: '',
  },

  // Owner
  owner: {
    entity: '',                     // 'individual' | 'llc' | 'trust' | 'corporate' | 'any' | ''
    out_of_state: false,
    absentee: false,
    hold_min: '', hold_max: '',
    // Page 3's "tax delinquent" and "active foreclosure" toggles operate directly
    // on form.signals[] — no duplicate state. See togglers in BuyBoxPage23.jsx.
  },

  // Distress
  signals: [],
  logic: 'OR',
  distress_floor: '',               // → distress_score_min

  // Utilities (4 toggles)
  utils: { water: false, sewer: false, electricity: false, gas: false },

  // Location / risk
  location: {
    flood_exclude: false,
    opportunity_zone: null,         // tri-state
    wetlands_exclude: false,
    tif_district: null,             // tri-state
    in_etj: null,                   // tri-state
    corner_lot: false,
    assemblage_potential: false,
    aadt_min: '',
    road_frontage_min: '',
    road_frontage_max: '',
    zoning_codes: [],
    future_land_use_codes: [],
  },

  // Class-specific flags
  flags: {
    has_pool: null,                 // tri-state
    has_elevator: null,             // tri-state
    pct_renter_occupied_min: '',
    mf_lihtc_flag: null,            // tri-state
    ss_is_reit_owned: null,         // tri-state
    ss_has_foreclosure_history: null, // tri-state
  },

  // Threshold + delivery
  threshold: 'balanced',
  delivery: { cadence: 'daily', max: 5 },

  // Wizard meta
  name: '',
  matchCount: 0,
};

// Backward-compat for old import name
export const NATIVE_FORM = EMPTY_FORM;

export const EQUITY_MAP = { '25%': 0.25, '40%': 0.40, '50%': 0.50, '60%': 0.60, '75%': 0.75 };
export const THRESHOLD_MAP = { volume: 0.70, balanced: 0.80, precision: 0.90 };
export const ENTITY_MAP = {
  individual: ['individual'],
  llc: ['llc'],
  trust: ['trust'],
  corporate: ['corporate'],
};

function toNum(v) {
  if (v === '' || v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function nonEmpty(arr) {
  return Array.isArray(arr) && arr.length ? arr : null;
}

export function nativeToPayload(form) {
  const assetClass = form.assets?.[0] || null;
  const signals = form.signals?.length ? form.signals : null;

  // Backend validateAssetUseCodes() requires a non-empty array. If the user
  // picked an asset class but no subtype chips, fall back to every code in the
  // class so the payload is valid. Empty subtypes UI = "match every type" intent.
  let useCodes = form.subtypes?.length ? form.subtypes : null;
  if (assetClass && (!useCodes || useCodes.length === 0)) {
    const cls = getAssetClass(assetClass);
    useCodes = cls?.subtypes?.map(s => s.code) || null;
  }

  return {
    label: form.name || '',

    // Asset
    asset_class: assetClass,
    asset_use_codes: useCodes,
    asset_classes: assetClass ? [assetClass] : null,
    sub_assets: assetClass === 'land' ? nonEmpty(form.sub_assets) : null,

    // Geography
    geo_states: nonEmpty(form.geo.states),
    geo_counties: form.geo.counties?.length
      ? form.geo.counties.map(c => (c.includes(':') ? c.split(':')[1] : c))
      : null,
    geo_cities: nonEmpty(form.geo.metros),
    geo_zips: nonEmpty(form.geo.zips),

    // Physical envelope
    sf_min: toNum(form.phys.sf_min), sf_max: toNum(form.phys.sf_max),
    acres_min: toNum(form.phys.acres_min), acres_max: toNum(form.phys.acres_max),
    lot_sf_min: toNum(form.phys.lot_sf_min), lot_sf_max: toNum(form.phys.lot_sf_max),
    year_built_min: toNum(form.phys.year_min), year_built_max: toNum(form.phys.year_max),
    stories_min: toNum(form.phys.stories_min), stories_max: toNum(form.phys.stories_max),
    units_min: toNum(form.phys.units_min), units_max: toNum(form.phys.units_max),
    bedrooms_count_min: toNum(form.phys.beds_min),
    bedrooms_count_max: toNum(form.phys.beds_max),
    bath_count_min: toNum(form.phys.baths_min),
    bath_count_max: toNum(form.phys.baths_max),
    lot_width_min: toNum(form.phys.lot_width_min),
    lot_depth_min: toNum(form.phys.lot_depth_min),
    building_classes: nonEmpty(form.phys.building_classes),
    construction_types: nonEmpty(form.phys.construction_types),
    foundation_types: nonEmpty(form.phys.foundation_types),
    roof_types: nonEmpty(form.phys.roof_types),
    garage_types: nonEmpty(form.phys.garage_types),

    // Financial — equity preset is converted to absolute dollars (the matcher
    // doesn't support a pct filter directly). Requires a value_min floor; if the
    // user leaves value_min blank we omit the equity filter entirely and the
    // wizard shows a helper hint. min_equity_pct is also persisted so edit-mode
    // can reverse the preset chip cleanly (UI-only round-trip — matcher ignores it).
    value_min: toNum(form.fin.price_min), value_max: toNum(form.fin.price_max),
    min_equity_pct: (() => {
      const pct = form.fin.equity_preset ? EQUITY_MAP[form.fin.equity_preset] : null;
      return pct != null ? Math.round(pct * 100) : null;
    })(),
    min_equity_dollar: (() => {
      const pct = form.fin.equity_preset ? EQUITY_MAP[form.fin.equity_preset] : null;
      const floor = toNum(form.fin.price_min);
      return pct != null && floor != null ? Math.round(pct * floor) : null;
    })(),
    price_per_unit_max: toNum(form.fin.price_per_unit_max),
    improvement_to_land_max: toNum(form.fin.improvement_to_land_max),
    development_potential_min: toNum(form.fin.development_potential_min),

    // Owner
    owner_types: form.owner.entity && form.owner.entity !== 'any'
      ? (ENTITY_MAP[form.owner.entity] ?? null)
      : null,
    absentee_only: form.owner.absentee || false,
    out_of_state_only: form.owner.out_of_state || false,
    hold_period_min: toNum(form.owner.hold_min),
    hold_period_max: toNum(form.owner.hold_max),

    // Distress
    distress_signals: signals,
    distress_only: signals != null && signals.length > 0,
    distress_match_mode: (form.logic || 'OR').toLowerCase(),
    distress_score_min: toNum(form.distress_floor),

    // Utilities
    water_service_required: form.utils.water || false,
    sewer_service_required: form.utils.sewer || false,
    electricity_nearby_required: form.utils.electricity || false,
    gas_pipeline_nearby_required: form.utils.gas || false,

    // Location / risk
    flood_exclude: form.location.flood_exclude || false,
    opportunity_zone: form.location.opportunity_zone,        // tri-state passthrough
    wetlands_exclude: form.location.wetlands_exclude || false,
    tif_district: form.location.tif_district,                // tri-state passthrough
    in_etj: form.location.in_etj,                            // tri-state passthrough
    corner_lot_required: form.location.corner_lot || false,
    assemblage_potential: form.location.assemblage_potential || false,
    aadt_min: toNum(form.location.aadt_min),
    road_frontage_min_ft: toNum(form.location.road_frontage_min),
    road_frontage_max_ft: toNum(form.location.road_frontage_max),
    zoning_codes: nonEmpty(form.location.zoning_codes),
    future_land_use_codes: nonEmpty(form.location.future_land_use_codes),

    // Class-specific flags
    has_pool: form.flags.has_pool,                           // tri-state passthrough
    has_elevator: form.flags.has_elevator,                   // tri-state passthrough
    pct_renter_occupied_min: toNum(form.flags.pct_renter_occupied_min),
    mf_lihtc_flag: form.flags.mf_lihtc_flag,                 // tri-state passthrough
    ss_is_reit_owned: form.flags.ss_is_reit_owned,           // tri-state passthrough
    ss_has_foreclosure_history: form.flags.ss_has_foreclosure_history,  // tri-state passthrough

    // Threshold + delivery
    match_threshold: THRESHOLD_MAP[form.threshold] ?? 0.80,
    run_schedule: form.delivery.cadence === 'weekly'
      ? { days: ['mon'] }
      : { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    delivery_max_per_run: form.delivery.max || 5,
  };
}

export function toNativeForm(b) {
  if (!b) return { ...EMPTY_FORM };

  // Asset class: backend may give us asset_class (singular) or asset_classes[] (legacy).
  const rawClass = b.asset_class || (b.asset_classes && b.asset_classes[0]) || '';
  const normalizedClass = normalizeAssetClassSlug(rawClass);

  // Equity round-trip. We write both min_equity_pct (UI-only, 0–100 integer) and
  // min_equity_dollar (matcher-active) on POST/PATCH. On reload, try in order:
  //   1. min_equity_pct as a percent integer (e.g. 25 → '25%')
  //   2. min_equity_pct as a decimal fraction (legacy, e.g. 0.25 → '25%')
  //   3. min_equity_dollar / value_min → derived percent
  const reversedEquity = (() => {
    const pctRaw = b.min_equity_pct;
    if (pctRaw != null) {
      const asDecimalKey = Object.entries(EQUITY_MAP).find(([, v]) => v === pctRaw)?.[0];
      if (asDecimalKey) return asDecimalKey;
      const asPercentKey = Object.entries(EQUITY_MAP).find(([, v]) => Math.round(v * 100) === pctRaw)?.[0];
      if (asPercentKey) return asPercentKey;
    }
    if (b.min_equity_dollar != null && b.value_min != null && b.value_min > 0) {
      const derived = b.min_equity_dollar / b.value_min;
      const match = Object.entries(EQUITY_MAP).find(([, v]) => Math.abs(v - derived) < 0.01);
      if (match) return match[0];
    }
    return '';
  })();
  const reversedThreshold = Object.entries(THRESHOLD_MAP).find(([, v]) => v === b.match_threshold)?.[0] || 'balanced';

  const ownerTypes = b.owner_types;
  const reversedEntity = ownerTypes?.length === 1
    ? (Object.entries(ENTITY_MAP).find(([, v]) => v[0] === ownerTypes[0])?.[0] || 'any')
    : ownerTypes?.length > 1 ? 'any' : '';

  const signals = b.distress_signals || [];

  return {
    assets: normalizedClass ? [normalizedClass] : [],
    subtypes: b.asset_use_codes || [],
    sub_assets: b.sub_assets || [],

    geo: {
      states: b.geo_states || [],
      counties: b.geo_counties || [],
      metros: b.geo_cities || [],
      zips: b.geo_zips || [],
    },

    phys: {
      sf_min: b.sf_min ?? '', sf_max: b.sf_max ?? '',
      acres_min: b.acres_min ?? '', acres_max: b.acres_max ?? '',
      lot_sf_min: b.lot_sf_min ?? '', lot_sf_max: b.lot_sf_max ?? '',
      year_min: b.year_built_min ?? '', year_max: b.year_built_max ?? '',
      stories_min: b.stories_min ?? '', stories_max: b.stories_max ?? '',
      units_min: b.units_min ?? '', units_max: b.units_max ?? '',
      beds_min: b.bedrooms_count_min != null ? String(b.bedrooms_count_min) : '',
      beds_max: b.bedrooms_count_max != null ? String(b.bedrooms_count_max) : '',
      baths_min: b.bath_count_min != null ? String(b.bath_count_min) : '',
      baths_max: b.bath_count_max != null ? String(b.bath_count_max) : '',
      lot_width_min: b.lot_width_min ?? '',
      lot_depth_min: b.lot_depth_min ?? '',
      building_classes: b.building_classes || [],
      construction_types: b.construction_types || [],
      foundation_types: b.foundation_types || [],
      roof_types: b.roof_types || [],
      garage_types: b.garage_types || [],
    },

    fin: {
      price_min: b.value_min ?? '', price_max: b.value_max ?? '',
      equity_preset: reversedEquity,
      price_per_unit_max: b.price_per_unit_max ?? '',
      improvement_to_land_max: b.improvement_to_land_max ?? '',
      development_potential_min: b.development_potential_min ?? '',
    },

    owner: {
      entity: reversedEntity,
      out_of_state: b.out_of_state_only || false,
      absentee: b.absentee_only || false,
      hold_min: b.hold_period_min ?? '',
      hold_max: b.hold_period_max ?? '',
    },

    signals,
    logic: b.distress_match_mode ? b.distress_match_mode.toUpperCase() : 'OR',
    distress_floor: b.distress_score_min != null ? String(b.distress_score_min) : '',

    utils: {
      water: b.water_service_required || false,
      sewer: b.sewer_service_required || false,
      electricity: b.electricity_nearby_required || false,
      gas: b.gas_pipeline_nearby_required || false,
    },

    location: {
      flood_exclude: b.flood_exclude || false,
      opportunity_zone: b.opportunity_zone ?? null,
      wetlands_exclude: b.wetlands_exclude || false,
      tif_district: b.tif_district ?? null,
      in_etj: b.in_etj ?? null,
      corner_lot: b.corner_lot_required || false,
      assemblage_potential: b.assemblage_potential || false,
      aadt_min: b.aadt_min ?? '',
      road_frontage_min: b.road_frontage_min_ft ?? '',
      road_frontage_max: b.road_frontage_max_ft ?? '',
      zoning_codes: b.zoning_codes || [],
      future_land_use_codes: b.future_land_use_codes || [],
    },

    flags: {
      has_pool: b.has_pool ?? null,
      has_elevator: b.has_elevator ?? null,
      pct_renter_occupied_min: b.pct_renter_occupied_min ?? '',
      mf_lihtc_flag: b.mf_lihtc_flag ?? null,
      ss_is_reit_owned: b.ss_is_reit_owned ?? null,
      ss_has_foreclosure_history: b.ss_has_foreclosure_history ?? null,
    },

    threshold: reversedThreshold,
    delivery: {
      cadence: b.run_schedule?.days?.length === 1 ? 'weekly' : 'daily',
      max: b.delivery_max_per_run || 5,
    },

    name: b.label || '',
    matchCount: 0,
  };
}
