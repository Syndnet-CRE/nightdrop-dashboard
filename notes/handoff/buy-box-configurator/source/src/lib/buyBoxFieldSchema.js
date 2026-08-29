// Per-class field visibility schema.
// Wizard pages read this to decide which fields to render for the selected asset class.
// Universal fields (appear on every class) are listed in UNIVERSAL_*.

// ── Universal fields on every asset class ───────────────────────────────────
export const UNIVERSAL_PHYS = [
  'sf_min', 'sf_max',
  'acres_min', 'acres_max',
  'lot_sf_min', 'lot_sf_max',
  'year_built_min', 'year_built_max',
];

export const UNIVERSAL_FIN = [
  'value_min', 'value_max',
];

export const UNIVERSAL_OWNER = [
  'owner_types',
  'absentee_only',
  'out_of_state_only',
  'hold_period_min', 'hold_period_max',
  // tax_delinquent and active_foreclosure surface as standalone toggles in Step 3
  // but persist into distress_signals[] on the payload — not separate columns.
  'tax_delinquent_toggle',
  'active_foreclosure_toggle',
];

export const UNIVERSAL_DISTRESS = [
  'distress_signals',
  'distress_match_mode',
  'distress_score_min',
];

export const UNIVERSAL_LOCATION = [
  'water_service_required',
  'sewer_service_required',
  'electricity_nearby_required',
  'gas_pipeline_nearby_required',
  'flood_exclude',
  'opportunity_zone',
  'wetlands_exclude',
  'tif_district',
];

export const UNIVERSAL_DELIVERY = [
  'match_threshold',
  'run_schedule',
  'delivery_max_per_run',
];

// ── Per-class additions ─────────────────────────────────────────────────────
// Each key lists fields to render BEYOND the universal set.
// Page 2 (profile) reads CLASS_PHYS / CLASS_FIN.
// Page 5 (location) reads CLASS_LOCATION.
// Page 3 (owner) reads CLASS_OWNER (most classes empty here).
// CLASS_FLAGS holds class-specific boolean filters that surface in Page 5's
// class-specific section.

export const CLASS_SCHEMA = {
  self_storage: {
    phys: ['units_min', 'units_max', 'construction_types'],
    fin: [],
    location: [],
    flags: ['ss_is_reit_owned', 'ss_has_foreclosure_history'],
  },
  multifamily: {
    phys: [
      'units_min', 'units_max',
      'stories_min', 'stories_max',
      'building_classes',
      'construction_types',
    ],
    fin: ['price_per_unit_max'],
    location: [],
    flags: ['has_elevator', 'pct_renter_occupied_min', 'mf_lihtc_flag'],
  },
  mobile_home_rv: {
    // Spec: "pad and unit count min/max". Backend has no `pads_*` column —
    // both pad and unit count map to units_min/max for MVP.
    phys: ['units_min', 'units_max'],
    fin: [],
    location: [],
    flags: [],
  },
  residential_sfr: {
    phys: [
      'bedrooms_count_min', 'bedrooms_count_max',
      'bath_count_min', 'bath_count_max',
      'stories_min', 'stories_max',
      'building_classes',
      'construction_types',
      'foundation_types',
      'roof_types',
      'garage_types',
      'lot_width_min', 'lot_depth_min',
    ],
    fin: [],
    location: [],
    flags: ['corner_lot_required', 'has_pool'],
  },
  land: {
    phys: [],
    fin: ['improvement_to_land_max', 'development_potential_min'],
    location: [
      'road_frontage_min_ft', 'road_frontage_max_ft',
      'aadt_min',
      'future_land_use_codes',
      'zoning_codes',
    ],
    flags: ['corner_lot_required', 'assemblage_potential', 'in_etj'],
  },
  industrial: {
    phys: ['stories_min', 'stories_max', 'construction_types'],
    fin: [],
    location: ['road_frontage_min_ft', 'road_frontage_max_ft', 'aadt_min'],
    flags: [],
  },
  retail: {
    phys: ['stories_min', 'stories_max', 'construction_types'],
    fin: [],
    location: ['road_frontage_min_ft', 'road_frontage_max_ft', 'aadt_min'],
    flags: ['corner_lot_required'],
  },
  gas_station_c_store: {
    phys: [],
    fin: [],
    location: ['road_frontage_min_ft', 'road_frontage_max_ft', 'aadt_min'],
    flags: ['corner_lot_required'],
  },
  office: {
    phys: [
      'stories_min', 'stories_max',
      'building_classes',
      'construction_types',
    ],
    fin: [],
    location: [],
    flags: ['has_elevator', 'pct_renter_occupied_min'],
  },
  special_purpose: {
    phys: ['stories_min', 'stories_max', 'construction_types'],
    fin: [],
    location: [],
    flags: [],
  },
};

export function classSchema(assetClass) {
  return CLASS_SCHEMA[assetClass] || { phys: [], fin: [], location: [], flags: [] };
}

// Convenience: does a given asset class show the building class A/B/C chips?
export function showsBuildingClass(assetClass) {
  return classSchema(assetClass).phys.includes('building_classes');
}

// Convenience: is this an AADT-relevant class?
export function showsAadt(assetClass) {
  return classSchema(assetClass).location.includes('aadt_min');
}

// Convenience: enums for construction / foundation / roof / garage
// (small lists — backend stores as TEXT[] without enum constraint).
export const CONSTRUCTION_TYPES = [
  'Frame / Wood',
  'Masonry / Brick',
  'Concrete / Block',
  'Steel',
  'Modular / Prefab',
  'Mixed',
];

export const FOUNDATION_TYPES = [
  'Slab',
  'Crawl Space',
  'Basement',
  'Pier & Beam',
];

export const ROOF_TYPES = [
  'Composition Shingle',
  'Metal',
  'Tile',
  'Flat / Built-Up',
  'Wood Shake',
];

export const GARAGE_TYPES = [
  'Attached',
  'Detached',
  'Carport',
  'None',
];
