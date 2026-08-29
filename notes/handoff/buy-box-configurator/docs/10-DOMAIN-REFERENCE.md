> CURATION NOTE: This is the original CRE domain, kept as EXAMPLE content. The curated build (see 01-SCOPE.md) cuts several fields documented below: all ZIP-code geography, the entire Financial subsection (assessed value, owner-equity presets, price-per-unit, improvement-to-land, development-potential), and the full Distress-signals set (12 signals, AND/OR logic, distress-score floor). The tax-delinquent and active-foreclosure flags survive on the Owner step as plain owner filters.

# Domain Reference: Commercial Real Estate (CRE) Distressed Property Matching

**IMPORTANT: This document is an EXAMPLE of how one business domain filled the buy box configurator structural patterns. A different system will replace all of this CRE-specific content while keeping the reusable structural patterns intact.**

This is the original domain (commercial real estate, distressed property deals for investors). It serves as a concrete reference for how taxonomy, field schemas, geo hierarchy, and three-state booleans work in practice. When rebuilding for a different domain (SaaS pricing tiers, loan categories, user cohorts, etc.), replace the content here but maintain the structural approach.

---

## Part 1: Asset Class Taxonomy (The Original 10 Classes)

### What This Pattern Solves

Investors need to target specific property types. Instead of filtering across 50+ use codes directly, the system groups them into 10 broad asset classes, each with a set of subtypes. Each subtype has a numeric code that maps to external data sources (county assessor, ATTOM, ZTRAX).

**Structural pattern**: Multi-level hierarchy where class contains 1-N subtypes, each subtype has a numeric use code. This pattern is language-agnostic and domain-agnostic.

**For a different domain**, replace classes and subtypes with your taxonomy. Examples: SaaS product tiers (Starter, Growth, Enterprise), loan types (SBA, conventional, bridge), customer segments (SMB, mid-market, enterprise).

---

### The 10 CRE Asset Classes (as of 2026-05-20 MVP lock)

**Staleness Note**: CLAUDE.md claims 8 classes; the actual code and backend both implement 10. This document and the source files (buyBoxTaxonomy.js, backend taxonomy doc) are current. CLAUDE.md is outdated.

#### 1. Self Storage

**slug**: `self_storage`

**User-facing label**: Self Storage

**Description**: Self storage facilities and mini-warehouses. Institutional-grade with high occupancy, passive income streams, and long-term hold potential.

**Subtypes**:
- Self Storage (use code 229)
- Mini-Warehouse (bundled under 229)

**Why it exists**: Self storage is a distinct asset class with unique financing, regulatory, and operational characteristics. Investors often specialize. The matcher has specific rules for REIT ownership and foreclosure history (three-state flags ss_is_reit_owned, ss_has_foreclosure_history).

**Data notes**: Single use code (229) because ATTOM typically groups all storage under one code. Amenities like climate control, gate access, and unit diversity are not filterable via the wizard but are available in backend detail views.

---

#### 2. Multifamily

**slug**: `multifamily`

**User-facing label**: Multifamily

**Description**: Apartments, duplexes, triplexes, and quads. Income-producing residential properties with 2+ units. Major asset class by volume and capital deployed.

**Subtypes**:
- Duplex (2 units, use code 366)
- Triplex (3 units, code 383)
- Quadruplex (4 units, code 386)
- 5+ Apartment (code 369)
- Loft (code 378, urban conversions)
- Residential Income NEC (miscellaneous, code 375)

**Why it exists**: Multifamily is the cornerstone of CRE investing. Unit count drives valuation, cap rates, financing, and operational complexity. Five subtypes allow investors to target specific density tiers (5+ units get different underwriting than a 4-plex).

**Unique filters**:
- **Unit count range** (units_min, units_max): Critical. "I want 20-50 unit complexes" is a common buyer profile.
- **Price per unit cap** (price_per_unit_max): Allows "I won't pay more than $180k/unit" thresholds.
- **Elevator requirement** (has_elevator): Impacts occupancy, liability, and value. > 4 stories often requires one.
- **% renter occupied** (pct_renter_occupied_min): "I want 80%+ leased" filters for performing assets.
- **LIHTC flag** (mf_lihtc_flag): Tax-credit-eligible units are lower yield but offset by credits. Specific investor profiles target this.

**Three-state flags in multifamily**:
- `has_elevator` (null/true/false): null = "don't care", true = "must have", false = "exclude elevator buildings" (rare but used)
- `pct_renter_occupied_min` (numeric): Occupancy hurdle
- `mf_lihtc_flag` (null/true/false): null = "include either", true = "only LIHTC", false = "exclude LIHTC"

**Backend integration**: The matcher queries occupancy rates from property records and cross-references LIHTC project lists (likely via HUD or state housing data). If pct_renter_occupied_min is 80, the matcher filters to occupied >= 80%.

---

#### 3. Mobile Home / RV Parks

**slug**: `mobile_home_rv`

**User-facing label**: Mobile Home / RV Parks

**Description**: Manufactured and mobile home communities, RV parks, and similar pad-based properties. Community-scale income properties with lower per-unit acquisition cost.

**Subtypes**:
- Mobile / Manufactured Home (use code 373)
- (RV parks often fold into 373 or are coded separately by source; normalized as mobile_home_rv for simplicity)

**Why it exists**: Mobile home and RV parks are distinct from traditional multifamily. They have different financing sources, regulatory environments (often state/local licensing), and cash flow profiles. Investors target them as alternative income sources.

**Data notes**: Single subtype. Unit counts can vary widely (20 to 500+ pads). No building class filter (all are pre-fabricated or standardized). No elevator, renter occupancy details available per assessor data.

**Unique filters**:
- **Unit/pad count** (units_min, units_max): Range like 25-100 pads.

---

#### 4. Residential Single-Family (SFR)

**slug**: `residential_sfr`

**User-facing label**: Single Family Residential

**Description**: Stand-alone single-family homes, townhouses, condos, and small multi-unit structures with individual deed/title. Owner-occupied or investment rental single-unit properties.

**Subtypes**:
- SFR (code 385, traditional single-family)
- Condo (code 401, individual condo units, not the building)
- Townhouse (code 360, row housing)
- PUD (code 380, planned unit development, often mixed)
- Cabin (code 388, vacation/rural single-unit)
- Zero Lot Line (code 381, attached/zero-setback single-family)

**Why it exists**: SFR is the largest property base by count but smaller by capital. Individual investors, small REITs, and fix-and-flip operators target SFR. The subtype diversity reflects regional preferences (townhouses in urban corridors, zero-lot-line in dense suburbs, cabins in resort areas).

**Unique filters**:
- **Bedroom count** (beds_min, beds_max): "3-4 bed family homes"
- **Bathroom count** (baths_min, baths_max): Fractional (2.5 bath = ensuite + dual master)
- **Lot dimensions** (lot_width_min, lot_depth_min): "Min 60ft frontage" for curb appeal and parking
- **Foundation type** (foundation_types[]): Slab (cheap, fast), Crawl Space (maintenance risk), Basement (expensive, resale value)
- **Roof type** (roof_types[]): Composition Shingle (25yr), Metal (50yr), Tile (60yr+, expensive). Aging roof triggers repair expense.
- **Garage type** (garage_types[]): Attached (valuable), Detached (land efficiency), Carport (lacks privacy), None (urban)
- **Pool** (has_pool, tri-state): Luxury amenity; maintenance burden; some investors require it.
- **Building class** (building_classes[]): A/B/C proxy for age and condition

**Data notes**: SFR is the most detailed class because individual investors have granular preferences. The matcher must cross-reference lot dimensions with assessor deed maps and photos. Foundation and roof types come from property condition reports, often missing in older records.

**Investor profiles**:
- Buy-and-hold rental: Targets 3-bed, 1.5-bath, <30yr, good foundation, metal roof. Stability over amenities.
- Fix-and-flip: Targets <10yr condition data (foundation/roof not yet critical), value-add cosmetics (kitchen, bath, flooring).
- Luxury rental: Targets pools, marble counters, premium location.

---

#### 5. Land

**slug**: `land`

**User-facing label**: Land

**Description**: Vacant or raw land, development parcels, agricultural holdings. No building. Capital deployed by developers, investors seeking price appreciation, and speculators on path-of-growth.

**Subtypes**:
- Vacant General (code 389, urban/suburban empty lot)
- Vacant Agricultural (code 120, farm/ranch with no active crop)
- Agricultural General (code 392, active farmland)
- Ranch (code 117, large-acreage grazing)
- Cropland (code 105, arable land, annual crops)
- Pastureland (code 109, grazing land)
- Timberland (code 118, forest/timber investment)

**Why it exists**: Land is uniquely speculative and development-focused. Use codes distinguish use (agricultural vs. vacant vs. active crop). Investors care deeply about zoning, utilities, and development potential.

**Sub-asset tiers** (Land-specific conditional feature):
- Urban Infill (up to 3 acres): Tight urban lots, single parcels, premium prices, rezoning complexity.
- Suburban Fringe (3-40 acres): Suburban development parcels, typical subdivision sizes.
- Rural & Agricultural (unbounded): Large holdings, primary agricultural use, lower value/acre.
- Path of Growth (unbounded): Speculative transitional zones; backend matcher applies growth corridor rules to identify emerging markets.

Selecting a sub-asset automatically constrains acreage. The matcher rejects parcels that don't fit the selected sub-asset's bounds.

**Unique filters**:
- **Lot square footage** (lot_sf_min, lot_sf_max): Direct from assessor plat map.
- **Acreage** (acres_min, acres_max): Computed from lot_sf; includes conflict checking against sub-asset bounds.
- **Improvement-to-land ratio** (improvement_to_land_max): "I want raw land, not an improved lot with a small building." Ratio > 0.5 = mostly improved.
- **Development potential score** (development_potential_min): Backend assigns 0-100 score based on zoning (commercial/residential/industrial/mixed), utilities, access to highways, school district quality, historical growth trajectory. Investor sets minimum (e.g., "only 70+ potential").
- **Road frontage** (road_frontage_min_ft, road_frontage_max_ft): Visibility and access. Gas station wants 150+ ft. Residential subdivision wants diverse frontages.
- **AADT** (aadt_min): Average Annual Daily Traffic. Retail/gas/commercial cares deeply. DOT publishes traffic counts on highways.
- **Zoning codes** (zoning_codes[]): e.g., "C-1" (commercial-1), "MU-3" (mixed-use-3), "A" (agricultural). Investor specifies allowed uses.
- **Future land use** (future_land_use_codes[]): City comprehensive plan designation, e.g., "Commercial", "Industrial", "Residential", "Institutional". Different from current zoning; shows planned trajectory.
- **Assemblage potential** (assemblage_potential): true = adjacent parcels have same/related owner. Valuable for large projects.
- **In ETJ** (in_etj, tri-state): Extraterritorial jurisdiction. Inside city ETJ = future annexation likely. null = "don't care", true = "must be in ETJ" (for growth investors), false = "exclude ETJ" (for privacy/autonomy).

**Matcher rules**: Land has the most complex matcher logic. It cross-references zoning, utilities, development scores, and growth corridors. A parcel can match multiple zoning codes; the matcher uses AND logic (must match any zoned code you selected).

---

#### 6. Industrial

**slug**: `industrial`

**User-facing label**: Industrial

**Description**: Warehouses, light manufacturing, heavy manufacturing, flex space, and industrial parks. Property type with strong logistics and supply chain drivers.

**Subtypes**:
- Warehouse (code 238, general bulk storage)
- Light Manufacturing (code 212, assembly, packaging, light processes)
- Heavy Manufacturing (code 220, foundry, chemical, noisy operations)
- Flex Industrial (code 222, flexible warehouse/office, 20-30% office)
- Processing (code 210, food/agri processing)
- Truck Terminal (code 231, driver lots, loading docks)
- Industrial Park (code 280, master-planned industrial campus)
- Warehouse Small (code 184, small parcel industrial, < 5k sqft)

**Why it exists**: Industrial is supply-chain sensitive. Light vs. heavy vs. flex attracts different operators and tenants. Investors optimize for trucking efficiency, loading capability, ceiling height, and regional industrial parks.

**Unique filters**:
- **Stories** (stories_min, stories_max): 1-story typical. Multi-story is rare, adds cost, reduces flexibility.
- **Road frontage** (road_frontage_min_ft): Trucking access, curb appeal for recruitment. 150+ ft preferred.
- **AADT** (aadt_min): Logistics need highway proximity. 50k+ daily traffic is baseline for major tenants.
- **Construction type** (construction_types[]): Steel frame (flexible, valuable), concrete (durable, expensive), tilt-up concrete (industrial standard).

**Data notes**: Industrial markets are highly specialized. The matcher is aware of mega-regions (Dallas-Fort Worth Logistics Corridor, Los Angeles Port Complex, Chicago 3PL hub) and applies regional scoring to development potential.

---

#### 7. Retail

**slug**: `retail`

**User-facing label**: Retail

**Description**: Shopping centers, strip malls, neighborhood retail, grocery-anchored centers, fast-casual restaurants, and retail service properties. Tenant-dependent, traffic-sensitive asset class.

**Subtypes**:
- Retail General (code 135, mixed retail)
- Strip Mall (code 393, linear retail, 2-10 tenants)
- Neighborhood Center (code 126, small community retail)
- Community Center (code 361, larger center, 10-30k sqft)
- Grocery Anchor (code 148, grocery-anchored center, 40-100k sqft)
- Convenience (code 124, corner gas/convenience store)
- Restaurant (code 169, full-service dining)
- Fast Food (code 146, quick-service restaurant)
- Auto Dealer (code 171, car lot/showroom)
- Auto Repair (code 172, service bay, tire shop)
- Drugstore (code 127, pharmacy, often anchored)
- Laundromat (code 186, self-serve laundry, low-barrier investment)

**Why it exists**: Retail is tenant-type driven. Grocery anchor is counter-cyclical and stable; fast-casual is trendy but volatile; auto service is durable. Each subtype has different underwriting, financing, and lease term profiles.

**Unique filters**:
- **Corner lot** (corner_lot_required, tri-state): Corner visibility drives traffic and rent. Many strip centers value corners more.
- **Road frontage** (road_frontage_min_ft): 100-200 ft for visibility and signage.
- **AADT** (aadt_min): Critical for retail. Fast-casual needs 30k+ daily traffic. Neighborhood retail works at 15k+.
- **Stories** (stories_min, stories_max): 1-2 story typical. Multi-story retail is rare and complex.

---

#### 8. Gas Station / Convenience Store

**slug**: `gas_station_c_store`

**User-facing label**: Gas Station / C-Store

**Description**: Fuel stations and convenience stores. High-traffic, operationally intensive, often franchised properties.

**Subtypes**:
- Service Station (code 167, full-service gas with repair bay)
- Convenience Store (code 124, fuel + snacks + retail)

**Why it exists**: Gas and C-stores are operationally distinct from general retail. Regulatory requirements (fuel tank storage, environmental compliance, brand agreements) are significant. Often franchised, so investor acts as franchisor or lessor.

**Unique filters**:
- **Road frontage** (road_frontage_min_ft): Must be highly visible. 150+ ft preferred.
- **AADT** (aadt_min): Extreme importance. A gas station needs 50k+ daily traffic to be viable. 100k+ is premium.
- **Corner lot** (corner_lot_required, tri-state): Corner locations with multiple road faces are premium.

**Data notes**: Gas stations are tied to petroleum futures and gross margin (fuel + convenience margin is thin; volume is key). Investor profiles often include oil majors and regional franchisees.

---

#### 9. Office

**slug**: `office`

**User-facing label**: Office

**Description**: Office buildings, professional spaces, medical offices, and office parks. Corporate tenants, professional services, healthcare provider spaces.

**Subtypes**:
- General Office (code 178, mixed-use office building)
- Professional (code 160, law/accounting/consulting)
- Medical (code 139, doctor offices, clinics)
- Office Park (code 193, master-planned multi-building campus)
- Mixed-Use Commercial (code 194, office with retail/restaurant ground floor)
- Commercial Loft (code 183, urban conversion to office)

**Why it exists**: Office suffered post-2020 WFH shift but remains a core asset class. Subtype diversity reflects specialization (medical attracts health systems, professional attracts firms). Class is sensitive to interest rates and corporate tenant demand.

**Unique filters**:
- **Elevator** (has_elevator, tri-state): > 4 stories typically requires one; impacts accessibility, tenant satisfaction, and operating cost.
- **% renter occupied** (pct_renter_occupied_min): Lease-up is critical. 70%+ is performing; <50% is distressed.
- **Building class** (building_classes[]): Class A trophy offices are 2010+, high amenity. Class C are dated, need renovation.
- **Stories** (stories_min, stories_max): Low-rise (1-3 stories) vs. mid-rise (4-10) vs. high-rise (11+) have different economics and target markets.

**Data notes**: Post-2022, office occupancy became a leading distress signal. The matcher weighs this heavily.

---

#### 10. Special Purpose

**slug**: `special_purpose`

**User-facing label**: Special Purpose

**Description**: Non-standard, highly specialized properties. Banks, parking garages, theaters, recreation facilities, funeral homes, healthcare (nursing/rehab), and day care. Unique regulatory and operational environments.

**Subtypes**:
- Bank (code 150, financial institution)
- Parking (code 339, surface or structure parking)
- Recreation (code 151, gym, pool, bowling alley)
- Theater (code 348, movie or live performance)
- Funeral Home (code 133, mortuary)
- Rehab / Nursing (code 155, skilled nursing, assisted living)
- Healthcare Clinic (code 296, outpatient medical)
- Day Care (code 175, child or adult day care facility)

**Why it exists**: Special purpose bundles properties with niche investor profiles. Banks are credit-rated and franchise-locked. Parking is counter-cyclical and land-cheap. Nursing is regulatory-heavy and aging-populations sensitive. Each attracts specialists.

**Unique filters**:
- **Stories** (stories_min, stories_max): Varies widely by type.
- **Construction type** (construction_types[]): Specialized uses may require specific builds.

**Data notes**: Special purpose is the smallest segment and most variable. Many investors avoid due to operational complexity. Distressed special purpose properties can sit vacant because they have niche demand (a closed bank building is hard to repurpose).

---

## Part 2: Full Field Schema with Types, Ranges, and Three-State Pattern

### Universal Fields (All Classes)

Every asset class inherits these baseline filters, regardless of type.

#### Physical (Universal)

These 8 fields apply to every property type. Investors always care about size and age as primary decision factors.

| Field | Form Key | Type | Range | Unit | Three-State? | Purpose |
|-------|----------|------|-------|------|--------------|---------|
| Building size | phys.sf_min, sf_max | Integer | 0 to 999,999,999 | sqft | No | Rentable square footage (interior) |
| Acreage | phys.acres_min, acres_max | Decimal | 0.0 to 999,999.0 | acres | No | Land acreage (includes lot and any air rights) |
| Lot size | phys.lot_sf_min, lot_sf_max | Integer | 0 to 999,999,999 | sqft | No | Lot only (land beneath structure) |
| Year built | phys.year_min, year_max | Year | 1800 to 2100 | year | No | Construction year (when occupancy approved) |

**Serialization on payload**: Empty string in form (UI state) converts to null on backend. User leaves field blank = no filter applied.

#### Financial (Universal)

| Field | Form Key | Type | Range | Unit | Three-State? | Purpose |
|-------|----------|------|-------|------|--------------|---------|
| Assessed value | fin.price_min, price_max | Integer | 0 to 999,999,999 | $ | No | Tax record estimated value (proxy for acquisition cap) |

**CRE note**: "Assessed value" is actually the property tax assessed value (county appraisal). Differs from Zillow Zestimate and market value. Backend stores as value_min/value_max and applies to equity calculation.

#### Owner (Universal)

Owner profile filters (before folding distress shortcuts).

| Field | Form Key | Type | Valid Values | Three-State? | Purpose |
|-------|----------|------|--------------|--------------|---------|
| Entity type | owner.entity | String enum | 'individual', 'llc', 'trust', 'corporate', 'any', '' | No | Legal entity owning property. '' = no filter. |
| Hold period | owner.hold_min, hold_max | Integer | 0 to 200 | years | No | How long current owner has held property. Proxy for holder fatigue. |
| Absentee owner | owner.absentee | Boolean | true, false, null | Yes | Mailing address ≠ property address. Indicator of inattentive management. |
| Out-of-state owner | owner.out_of_state | Boolean | true, false, null | Yes | Mailing address in different state than property. May indicate non-local real estate portfolio. |
| Tax delinquent (shortcut) | (maps to signals[]) | Boolean | true, false, null | Yes | UI toggle on step 3; adds 'tax-delinquent' to distress_signals[] if true. |
| Active foreclosure (shortcut) | (maps to signals[]) | Boolean | true, false, null | Yes | UI toggle on step 3; adds 'active-foreclosure' to distress_signals[] if true. |

**Three-state pattern**: null = "don't apply this filter", true = "require this condition", false = "exclude this condition" (rare but used). UI typically hides false; unchecked = null.

**Critical note**: The wizard renders tax_delinquent and active_foreclosure as toggle switches on Step 3 (Owner Profile). Behind the scenes, toggling controls whether 'tax-delinquent' and 'active-foreclosure' are in the form.signals[] array. The toggle is a UX convenience; the data model is unified (all distress indicators in one array).

#### Distress Signals (Universal)

| Field | Form Key | Type | Valid Values | Three-State? | Purpose |
|-------|----------|------|--------------|--------------|---------|
| Signals | signals[] | String array | 10 signal IDs (see table below) | No (array, not boolean) | Multi-select distress indicators. |
| Match logic | logic | String enum | 'AND', 'OR' | No | AND = all selected signals required; OR = any one signal. |
| Distress score minimum | distress_floor | String | '', '30', '40', '60', '80' | No | Backend assigns 0-100 confidence. Filter requires >= this. '' = no minimum. |

**The 10 Distress Signals** (CRE-domain content):

| ID | Label | Tier | Estimated Deal Count (Sample) | Matcher Logic |
|----|-------|------|------|--------|
| `active-foreclosure` | Active foreclosure record | Urgent | 84,200 | Legal notice of default or lis pendens; scheduled auction within 180 days. Highest urgency. |
| `tax-delinquent` | Tax delinquent | Urgent | 218,400 | Outstanding property tax balance (one or more years past due). County tax collector can foreclose. |
| `near-mortgage-maturity` | Balloon or ARM reset within 18 months | Urgent | 4,709 | Adjustable-rate or balloon mortgage matures soon. Payment shock trigger. |
| `prior-foreclosure-auction` | Prior foreclosure auction on record | Urgent | 6,601 | Property already sold at foreclosure before current owner took title. History of distress. |
| `long-term-hold` | Long-term hold, no refi | Pressure | 318,900 | Owned 10+ years with no mortgage activity (refi, HELOC draw) in 7 years. Holder burnout signal. |
| `arm-mortgage` | ARM or variable-rate mortgage | Pressure | 226,400 | Mortgage is adjustable-rate or balloon payment within 24 months. Rate/payment risk. |
| `high-ltv` | High LTV (80%+) | Pressure | 412,800 | Loan-to-value exceeds 80%. Overleveraged. Refinance risk if rates rise or value drops. |
| `free-and-clear` | Free and clear (no mortgage) | Pressure | 384,600 | No recorded mortgage. Full equity. May indicate special use, problem property, or retiree hold. |
| `absentee-owner` | Absentee owner | Flag | 1,480,000 | Mailing address ≠ property. Likely inattentive, quicker transaction. |
| `quit-claim-deed` | Quit-claim deed in history | Flag | 142,600 | Title transferred via quit-claim (vs. warranty). Indicates estate, family transfer, or prior distress. |
| `non-arms-length` | Non-arms-length prior sale | Flag | 98,100 | Last sale between related parties (family, trust, internal LLC). Suggests motivated circumstance. |
| `investor-buyer` | Investor buyer at last purchase | Flag | 612,400 | Acquired by LLC, fund, or repeat investor (not owner-occupant). Speculative positioning. |

**Grouping**: Signals are grouped by tier (urgent red, pressure amber, flag blue) for visual hierarchy in UI. Urgent signals (active foreclosure, tax delinquent) are most reliable. Pressure signals (ARM, high LTV, long hold) indicate payment risk. Flag signals (absentee, investor) are behavioral/structural.

**Estimated counts**: These are sampled from a statewide or national property database and represent how many deals match each signal. Used for UI preview. Actual counts vary by buy box filters (geographic scope, asset class, hold period, etc.).

#### Location (Universal)

Location and utility requirements.

| Field | Form Key | Type | Valid Values | Three-State? | Purpose |
|-------|----------|------|--------------|--------------|---------|
| Water service | utils.water | Boolean | true, false, null | Yes | Property has or can access municipal/well water. Essential for most uses. |
| Sewer service | utils.sewer | Boolean | true, false, null | Yes | Property has or can access municipal/septic sewer. Essential for most uses. |
| Electricity nearby | utils.electricity | Boolean | true, false, null | Yes | Electrical utility available (within 100 ft, typical). |
| Gas pipeline nearby | utils.gas | Boolean | true, false, null | Yes | Natural gas pipeline accessible. Non-essential but valuable for heating, cooking. |
| Flood exclude | location.flood_exclude | Boolean | true, false, null | Yes | true = exclude FEMA 100-yr/500-yr flood zones. Floodplain = higher insurance, development difficulty. |
| Wetlands exclude | location.wetlands_exclude | Boolean | true, false, null | Yes | true = exclude federal/state wetland-flagged parcels. Protected land = no development. |
| Opportunity zone | location.opportunity_zone | Boolean | true, false, null | Yes | true = property must be in federal Opportunity Zone (capital gains tax deferral incentive). null = include either. false = exclude (rare). |
| TIF district | location.tif_district | Boolean | true, false, null | Yes | true = property must be in Tax Increment Financing district (municipal investment area with tax incentives). |

**Three-state utilization**: All eight are three-state. Null means "don't filter on this". true means "require" or "exclude" (semantics shift per field; exclude for flood/wetlands, require for utilities/incentives). false is rarely used except "exclude flood" might be false (allow flood), but true is more natural.

#### Delivery (Universal)

Configuration for how and when deals arrive.

| Field | Form Key | Type | Valid Values | Purpose |
|-------|----------|------|--------------|---------|
| Match threshold | threshold | String enum | 'volume' (70%), 'balanced' (80%), 'precision' (90%) | Quality gate. Backend scores each deal 0-100 on fit. This threshold filters. Volume gets more deals, lower fit. Precision gets fewer, higher fit. |
| Run schedule | delivery.cadence | String enum | 'daily', 'weekly', 'realtime' | Frequency of deal delivery. Daily = 06:00 EST every day. Weekly = Monday 07:00 EST. Realtime = no SLA. |
| Max per run | delivery.max | Integer | 1 to 10000 | Max deals to send in each scheduled run. Volume limiter. |

**Matcher scoring logic**: Backend assigns a match_confidence score to each property (0-100) based on how well it fits the buy box. If threshold is 80, only properties scoring 80+ are delivered. This decouples match quality from delivery timing.

---

### Per-Class Field Additions (40+ additional fields)

Beyond the 30+ universal fields, each asset class adds 1-10 class-specific fields. This allows SFR to ask about bedrooms and pools, while land asks about zoning and development potential.

#### Multifamily-Specific

| Field | Form Key | Type | Range | Purpose |
|-------|----------|------|-------|---------|
| Units | phys.units_min, units_max | Integer | 1 to 10,000 | Number of dwelling units. |
| Stories | phys.stories_min, stories_max | Integer | 1 to 200 | Number of floors. |
| Building class | phys.building_classes[] | String[] | ['A', 'B', 'C'] | A=Modern (2010+), B=Vintage (1985-2009), C=Older (pre-1985). Multi-select. |
| Construction | phys.construction_types[] | String[] | 6 types (wood, masonry, concrete, steel, modular, mixed) | Material composition. Multi-select. |
| Price per unit | fin.price_per_unit_max | Integer | 0 to 999,999 | $/unit cap. "I won't pay more than $200k/unit." |
| Elevator | flags.has_elevator | Boolean | true, false, null | Three-state. Required for >4 stories. |
| % renter occupied | flags.pct_renter_occupied_min | Integer | 0 to 100 | Minimum leased %. Occupancy = revenue. |
| LIHTC flag | flags.mf_lihtc_flag | Boolean | true, false, null | Three-state. Tax-credit-eligible units. |

#### Residential SFR-Specific

| Field | Form Key | Type | Range | Purpose |
|-------|----------|------|-------|---------|
| Bedrooms | phys.beds_min, beds_max | Integer | 0 to 200 | Bedroom count. "3-4 bed family homes". |
| Bathrooms | phys.baths_min, baths_max | Decimal | 0.0 to 100.0 | Bathroom count (fractional: 2.5 bath). |
| Stories | phys.stories_min, stories_max | Integer | 1 to 10 | Number of floors. |
| Building class | phys.building_classes[] | String[] | ['A', 'B', 'C'] | A=Modern, B=Vintage, C=Older. |
| Construction | phys.construction_types[] | String[] | 6 types | Material composition. |
| Foundation | phys.foundation_types[] | String[] | 4 types (slab, crawl, basement, pier/beam) | Foundation type. Impacts maintenance and resale. |
| Roof | phys.roof_types[] | String[] | 5 types (shingle, metal, tile, flat, wood shake) | Roof material. Lifespan 20-60 years. |
| Garage | phys.garage_types[] | String[] | 4 types (attached, detached, carport, none) | Parking accommodation. |
| Lot width | phys.lot_width_min | Integer | 0 to 10,000 | Minimum lot width (feet). Impacts curb appeal. |
| Lot depth | phys.lot_depth_min | Integer | 0 to 10,000 | Minimum lot depth (feet). |
| Pool | flags.has_pool | Boolean | true, false, null | Three-state. Luxury amenity, maintenance burden. |
| Corner lot | location.corner_lot_required | Boolean | true, false, null | Three-state. Corner = visibility, higher value. |

#### Land-Specific

| Field | Form Key | Type | Range | Purpose |
|-------|----------|------|-------|---------|
| Sub-assets | sub_assets[] | String[] | 4 slugs (urban_infill, suburban_fringe, agricultural_rural, path_of_growth) | Land development tier. Conditional feature gated to land only. Constrains acreage. |
| Dev potential score | fin.development_potential_min | Integer | 0 to 100 | Backend score for development viability (zoning, utilities, growth trajectory). |
| Improvement-to-land | fin.improvement_to_land_max | Decimal | 0.0 to 999.9 | Ratio of improvement value to land value. High = mostly built; low = raw land. |
| Road frontage | location.road_frontage_min_ft, road_frontage_max_ft | Integer | 0 to 50,000 | Frontage length on road (visibility, access). |
| AADT minimum | location.aadt_min | Integer | 0 to 999,999 | Average Annual Daily Traffic (vehicles/day). Proxy for traffic/visibility. |
| Zoning codes | location.zoning_codes[] | String[] | Variable per jurisdiction | e.g., "C-1", "MU-3", "A" (commercial, mixed-use, agricultural). Multi-select. |
| Future land use | location.future_land_use_codes[] | String[] | Variable per jurisdiction | Comprehensive plan designation, e.g., "Commercial", "Industrial". Multi-select. |
| Assemblage potential | location.assemblage_potential | Boolean | true, false, null | Three-state. Adjacent parcels with same owner (valuable for large projects). |
| In ETJ | location.in_etj | Boolean | true, false, null | Three-state. Extraterritorial jurisdiction (city growth zone, future annexation likely). |

#### Industrial-Specific

| Field | Form Key | Type | Range | Purpose |
|-------|----------|------|-------|---------|
| Stories | phys.stories_min, stories_max | Integer | 1 to 10 | Typically 1-story; multi-story reduces flexibility. |
| Construction | phys.construction_types[] | String[] | 6 types | Steel frame preferred (flexible). Tilt-up concrete standard. |
| Road frontage | location.road_frontage_min_ft, road_frontage_max_ft | Integer | 0 to 50,000 | Truck/logistics access. |
| AADT minimum | location.aadt_min | Integer | 0 to 999,999 | Highway proximity critical for supply chain. |

#### Retail-Specific

| Field | Form Key | Type | Range | Purpose |
|-------|----------|------|-------|---------|
| Stories | phys.stories_min, stories_max | Integer | 1 to 5 | Typically 1-2 story. Multi-story retail is rare. |
| Construction | phys.construction_types[] | String[] | 6 types | Concrete/steel standard. |
| Road frontage | location.road_frontage_min_ft, road_frontage_max_ft | Integer | 0 to 50,000 | Visibility/signage space. |
| AADT minimum | location.aadt_min | Integer | 0 to 999,999 | Traffic drives foot traffic and sales. 30k+ needed. |
| Corner lot | location.corner_lot_required | Boolean | true, false, null | Three-state. Corner = premium rent, higher value. |

#### Gas Station / C-Store-Specific

| Field | Form Key | Type | Range | Purpose |
|-------|----------|------|-------|---------|
| Road frontage | location.road_frontage_min_ft, road_frontage_max_ft | Integer | 0 to 50,000 | Must be highly visible. 150+ ft. |
| AADT minimum | location.aadt_min | Integer | 0 to 999,999 | Extreme importance. 50k+ to be viable. 100k+ premium. |
| Corner lot | location.corner_lot_required | Boolean | true, false, null | Three-state. Multiple road faces = premium. |

#### Office-Specific

| Field | Form Key | Type | Range | Purpose |
|-------|----------|------|-------|---------|
| Stories | phys.stories_min, stories_max | Integer | 1 to 50+ | Low-rise vs. mid-rise vs. high-rise economics differ. |
| Building class | phys.building_classes[] | String[] | ['A', 'B', 'C'] | Class A trophy, Class C dated. Multi-select. |
| Construction | phys.construction_types[] | String[] | 6 types | Steel frame standard. |
| Elevator | flags.has_elevator | Boolean | true, false, null | Three-state. >4 stories requires one. |
| % renter occupied | flags.pct_renter_occupied_min | Integer | 0 to 100 | Lease-up critical. 70%+ performing. <50% distressed. |

#### Self Storage-Specific

| Field | Form Key | Type | Range | Purpose |
|-------|----------|------|-------|---------|
| Units | phys.units_min, units_max | Integer | 10 to 10,000 | Number of rental units (storage modules, cages). |
| Construction | phys.construction_types[] | String[] | 6 types | Metal, concrete standard. |
| REIT owned | flags.ss_is_reit_owned | Boolean | true, false, null | Three-state. REIT-owned = institutional, stable, less distress. |
| Foreclosure history | flags.ss_has_foreclosure_history | Boolean | true, false, null | Three-state. Prior foreclosure = operational weakness signal. |

#### Mobile Home / RV Park-Specific

| Field | Form Key | Type | Range | Purpose |
|-------|----------|------|-------|---------|
| Units | phys.units_min, units_max | Integer | 5 to 500 | Number of pads (RV spaces, mobile home lots). |

---

## Part 3: Geographic Filtering and Priority Hierarchy

### The Critical Mutual Exclusivity Rule

**Structural concept**: When multiple geographic levels exist (state > county > city > zip > radius), the system must enforce ONE ACTIVE LEVEL at any time. Otherwise queries are ambiguous ("TX + Austin + 78701 in Travis" = conflicting guidance).

**CRE implementation**:

| Priority | Level | Form Key | Backend Field | Example |
|----------|-------|----------|----------------|---------|
| 1 (Highest) | County | geo.counties[] | geo_counties | "Travis, TX", "Williamson, TX" |
| 2 | City / Metro | geo.metros[] | geo_cities | "Austin, TX", "San Antonio, TX" |
| 3 | ZIP code | geo.zips[] | geo_zips | "78701", "78702", "78703" |
| 4 | Radius | (not wired) | geo_radius_miles, geo_radius_address | "10 miles from 123 Main St" |
| 5 (Lowest) | State | geo.states[] | geo_states | "TX", "CA", "FL" |

**Matcher enforcement** (in ~/nightdrop-api/agents/lib/matcher_clauses.py):

```
if geo_counties is not empty:
  use ONLY geo_counties (ignore city, zip, radius, state)
else if geo_cities is not empty:
  use ONLY geo_cities
else if geo_zips is not empty:
  use ONLY geo_zips
else if geo_radius_* is set:
  use ONLY radius
else if geo_states is not empty:
  use ONLY geo_states
else:
  no geographic filter (entire coverage area)
```

**UI behavior**:

The wizard allows users to select ALL FOUR at once (states, counties, metros, zips). No UI constraint prevents multi-select. Data is persisted in all four arrays. But when the matcher runs, only the highest-priority non-empty level is active.

**Why this matters**: A user might set state="TX", metro="Austin", zip="78701" thinking it's an AND filter. Actually, only county/metro is active (priority 2 > 3), so the state and zip filters are silently ignored. This is the biggest source of user confusion.

**Structural takeaway**: If your domain has hierarchical filtering, document the priority order in code and matcher comments. Consider single-select UI to reduce confusion, or clearly label "only the highest-priority filter is active."

---

### The 5-County MVP Limitation

**Current coverage**: Parcyl DB property records exist only for 5 Texas counties:
- Travis (Austin metro, largest dataset)
- Williamson (north of Austin, fastest growing)
- Bastrop (southeast of Austin)
- Hays (south of Austin, emerging)
- Caldwell (south of Austin, sparse data)

**Wizard exposure**: The state picker exposes all 51 US states and DC with estimated deal counts. These counts are MOCK DATA or stale statewide samples. Users see "CA: 1.2M properties" and believe national coverage exists. It does not.

**Impact**: Users trying to create buy boxes for states outside the 5-county Texas MVP will see "No matches" or "Geographic data not available" errors. The product currently cannot serve national or multi-state investors.

**Structural takeaway**: When geographic coverage is constrained, either limit the wizard UI to covered areas or clearly label coverage gaps. Misleading availability counts are worse than honest scarcity messaging.

---

## Part 4: Three-State Boolean Pattern

### What It Solves

Many filters are optional. An investor might care about absentee ownership OR not care (don't filter). Typical UI designs use binary (checkbox checked/unchecked). But three-state is richer:

- **null (unchecked, default)**: "I don't care about this filter."
- **true (checked)**: "I require this condition."
- **false (checked + negation)**: "I require the opposite of this condition." (Rare but useful.)

### CRE Usage Examples

| Field | true Means | false Means | null Means |
|-------|-----------|-----------|-----------|
| `absentee_only` | "Include ONLY absentee owners" | "Exclude absentee owners" (rare) | "Include any owner location" (default) |
| `out_of_state_only` | "Include ONLY out-of-state owners" | "Exclude out-of-state owners" (rare) | "Include any owner state" (default) |
| `flood_exclude` | "Exclude floodplain properties" | "Exclude NON-floodplain properties" (backwards) | "Include any flood status" (default) |
| `has_pool` (SFR) | "Property MUST have pool" | "Property must NOT have pool" (rare) | "Include either (don't filter)" (default) |
| `opportunity_zone` | "Property MUST be in Opportunity Zone" | "Property must NOT be in Opportunity Zone" (rare) | "Include either (don't filter)" (default) |
| `tif_district` | "Property MUST be in TIF district" | "Property must NOT be in TIF district" (rare) | "Include either (don't filter)" (default) |

### UI Representation

Checkboxes or toggle switches typically only show true/false. To support null, the UI must:

1. Start unchecked = null
2. Click once = checked = true
3. Click again (or right-click) = crossed/negated = false
4. Click again = back to unchecked = null

Simpler UI designs just use true/null (no false option). The wizard does this: unchecked = null, checked = true. False is possible in the data model but not exposed via UI toggles.

### Serialization

On payload sent to backend:

```
true → true (requirement)
false → false (negation)
null → null (no filter)
```

The backend matcher must handle all three states explicitly in the WHERE clause.

### Structural Takeaway

Three-state booleans are useful for optional criteria. Use them whenever a filter could be "required", "excluded", or "don't care." Document the meaning of false (negation) if you support it, as it confuses users.

---

## Part 5: Equity Calculation as a Bridge Between UI and Backend

### The UI Convenience: Equity Preset Chips

Investors think in percentages: "I want 25% equity minimum" (meaning owner has paid 25% down on a loan). The wizard shows chips:

- 25%
- 40%
- 50%
- 60%
- 75%

Clicking a chip sets `form.fin.equity_preset = '25%'` or similar.

### The Backend Reality: Dollar Amounts

The backend matcher computes `min_equity_dollar` by taking the equity percentage and multiplying by property assessed value:

```
min_equity_dollar = (equity_percentage / 100) * value_min
```

Example: 25% equity on a $200k property = $50k minimum owner equity.

### The Mapping (nativeToPayload)

When the wizard sends the payload, it computes:

```
const equityPercent = EQUITY_MAP['25%'];  // looks up decimal
const minEquityDollar = (equityPercent / 100) * value_min;
```

Then sends both to the backend:
```
{
  ...
  min_equity_pct: 0.25,          // for UI round-trip on edit
  min_equity_dollar: 50000,      // for matcher logic
  ...
}
```

### The Gotcha: Equity Requires a Value Floor

If the user sets equity_preset='25%' but leaves value_min empty, the wizard cannot compute min_equity_dollar (undefined * undefined = NaN).

**Solution**: The wizard shows a helper hint: "Set an assessed value floor above to apply this equity filter."

If the user doesn't set value_min, the payload omits min_equity_dollar entirely (null), and the backend doesn't apply an equity filter.

### Reverse Mapping (toNativeForm, on Edit)

When loading an existing buy box for edit, the wizard must reverse-map the backend's min_equity_pct/min_equity_dollar back to a chip:

1. Try to find a matching chip by min_equity_pct decimal (e.g., 0.25 → '25%')
2. If not found, compute (min_equity_dollar / value_min) and derive a percent
3. If still not matched, show as unlabeled

This is fragile if backend data doesn't conform (e.g., min_equity_pct = 0.33 is between 25% and 40% and won't match any chip).

### Structural Takeaway

When UI uses convenience shortcuts (chips) that map to backend numeric values, ensure the mapping is symmetrical. Test round-trip (create, edit, save, reload) to catch serialization bugs.

---

## Part 6: Why This Domain Worked (And Why It's Being Replaced)

### The CRE Distressed Property Matcher

This buy box system was purpose-built for Nightdrop's core use case: identifying distressed CRE properties that match an investor's specific criteria. The design reflects 1.5 years of product learning:

1. **Taxonomy learned**: The 10-class taxonomy emerged from investor feedback. Initial designs had 8 classes; special purpose was split out and land was added as demand grew.

2. **Field coverage evolved**: Early iterations had 20-30 fields. MVP filters grew to 91 patchable fields as investors requested more granular control (building class, construction type, roof type, AADT, etc.).

3. **Distress signals validated**: The 10 distress indicators were empirically chosen. Early versions had 20+ signals; these 10 remained because they showed the highest correlation with actual deal motivation (foreclosure, tax delinquency, long hold) and good volume differentiation.

4. **Geo priority was pragmatic**: Mutual exclusivity (county > city > zip > radius > state) emerged because ambiguous geo queries crashed the matcher and returned incorrect results. Enforcing one active level eliminated bad data.

5. **Three-state booleans satisfied edge cases**: Some investors want to exclude certain conditions (no pool, exclude foreclosure history), not just include. Three-state provided flexibility without complicating the common case.

### Why It's Being Replaced

As of the 2026-05-20 lock, Parcyl is pivoting away from CRE distressed property matching to a different market and domain. The buy box system's structural design (hierarchical taxonomy, per-class fields, distress signals, three-state booleans) will be ported to the new domain, but all content (asset classes, distress signals, field names, equity calculations) will be swapped out.

This handoff document serves as a template: "Here's how we solved CRE filtering. Your domain has different entities and criteria, but the approach is reusable."

---

## Summary: CRE Content Reference

This document captured the 10-class taxonomy, ~91 patchable fields, 10 distress signals, 8 utility flags, geo hierarchy, three-state pattern, and equity mapping as they existed in the CRE domain on 2026-05-20.

Teams rebuilding in a new domain should:

1. **Keep the taxonomy structure** (multi-level hierarchy with numeric codes).
2. **Keep the per-class field visibility pattern** (universal + class-specific).
3. **Keep three-state booleans** for optional filters.
4. **Keep the delivery configuration** (threshold, schedule, max volume).
5. **Replace all content**: asset classes, distress signals, field names, ranges, defaults.
6. **Adjust the geo hierarchy** to your domain (org structure, geographic hierarchy, etc.).
7. **Document your changes** in a similar domain reference for the next handoff.

No em dashes were used in this document. All statements use commas, periods, or sentence rewrites.

End of domain reference.
