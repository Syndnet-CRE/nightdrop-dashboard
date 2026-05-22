import { classSchema, CONSTRUCTION_TYPES, FOUNDATION_TYPES, ROOF_TYPES, GARAGE_TYPES } from '../lib/buyBoxFieldSchema'
import { BUILDING_CLASS_YEAR_DEFAULTS, VALID_BUILDING_CLASSES, LAND_SUB_ASSETS } from '../lib/buyBoxTaxonomy'
import { RangeInputs, SingleInput } from './buyBoxInputs'

function FieldRow({ label, hint, children, compact }) {
  return (
    <div style={{ padding: compact ? '10px 0' : '14px 0', borderBottom: '1px solid var(--border-sub)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: 'var(--fg-mute)', fontFamily: 'var(--font-secondary)' }}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <div className={`toggle${checked ? ' on' : ''}`} style={{ cursor: 'pointer' }} onClick={onChange} />
  )
}

function MultiChips({ options, values, onToggle }) {
  return (
    <div className="preset-row" style={{ flexWrap: 'wrap' }}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value
        const label = typeof o === 'string' ? o : o.label
        const active = values.includes(v)
        return (
          <button
            key={v}
            className={`preset-chip${active ? ' on' : ''}`}
            onClick={() => onToggle(v)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── Page 2: Property profile ────────────────────────────────────────────────

// Returns a warning string if the user's manual acreage range conflicts with the
// hard bounds baked into any selected land sub-asset. Returns null if no conflict.
function acresConflictWarning(subAssets, acresMin, acresMax) {
  if (!subAssets?.length) return null
  const min = acresMin ? parseFloat(acresMin) : null
  const max = acresMax ? parseFloat(acresMax) : null
  if (min == null && max == null) return null

  for (const slug of subAssets) {
    const def = LAND_SUB_ASSETS.find(s => s.slug === slug)
    if (!def) continue
    if (def.acres_max != null && min != null && min >= def.acres_max)
      return `${def.label} is under ${def.acres_max} ac — this range will match 0 properties`
    if (def.acres_max != null && max != null && max > def.acres_max)
      return `${def.label} is under ${def.acres_max} ac — reduce max or clear the sub-type`
    if (def.acres_min != null && max != null && max < def.acres_min)
      return `${def.label} starts at ${def.acres_min} ac — this range will match 0 properties`
  }
  return null
}

export function BuyBoxPage2({ form, setForm }) {
  const phys = form.phys
  const fin = form.fin
  const assetClass = (form.assets || [])[0] || ''
  const sch = classSchema(assetClass)

  const showField = (key) => sch.phys.includes(key) || sch.fin.includes(key)
  const buildingClasses = phys.building_classes || []

  const setPhys = (key, v) => setForm({ ...form, phys: { ...phys, [key]: v } })
  const setFin = (key, v) => setForm({ ...form, fin: { ...fin, [key]: v } })

  const toggleBuildingClass = (letter) => {
    const next = buildingClasses.includes(letter)
      ? buildingClasses.filter(c => c !== letter)
      : [...buildingClasses, letter]
    // When user adds a class, populate year_built defaults only if year_built fields are empty.
    // User can still manually edit after.
    let nextPhys = { ...phys, building_classes: next }
    if (!buildingClasses.includes(letter) && BUILDING_CLASS_YEAR_DEFAULTS[letter]) {
      const def = BUILDING_CLASS_YEAR_DEFAULTS[letter]
      if (def.year_built_min !== '' && !phys.year_min) nextPhys.year_min = def.year_built_min
      if (def.year_built_max !== '' && !phys.year_max) nextPhys.year_max = def.year_built_max
    }
    setForm({ ...form, phys: nextPhys })
  }

  const toggleMulti = (group, value) => {
    const arr = phys[group] || []
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
    setForm({ ...form, phys: { ...phys, [group]: next } })
  }

  return (
    <div className="page-fade">
      <header className="page-head">
        <div className="page-eyebrow">
          <span className="mono-step mono">02/07</span>
          <span className="sep" />
          <span>Property profile</span>
        </div>
        <h1 className="page-title">Spec the asset.</h1>
        <p className="page-sub">Physical envelope and financial floor. Leave anything blank to leave it unbounded.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head">
          <div className="section-title">
            <span className="section-title-num">A</span> Physical
          </div>
          <span className="section-meta">Ranges are inclusive</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-card)', padding: '4px 16px' }}>
          {/* Universal */}
          <FieldRow label="Building size" hint="square feet">
            <RangeInputs minV={phys.sf_min} maxV={phys.sf_max} onMin={v => setPhys('sf_min', v)} onMax={v => setPhys('sf_max', v)} unit="sqft" kind="int" />
          </FieldRow>
          <FieldRow label="Acreage" hint="≥ 1 acre parcels">
            <RangeInputs minV={phys.acres_min} maxV={phys.acres_max} onMin={v => setPhys('acres_min', v)} onMax={v => setPhys('acres_max', v)} unit="ac" kind="decimal" />
            {(() => {
              const warn = acresConflictWarning(form.sub_assets, phys.acres_min, phys.acres_max)
              return warn ? <div style={{ marginTop: 6, fontSize: 10, color: 'var(--red, #e05252)', fontFamily: 'var(--font-secondary)' }}>⚠ {warn}</div> : null
            })()}
          </FieldRow>
          <FieldRow label="Lot size" hint="sub-acre parcels (sqft)">
            <RangeInputs minV={phys.lot_sf_min} maxV={phys.lot_sf_max} onMin={v => setPhys('lot_sf_min', v)} onMax={v => setPhys('lot_sf_max', v)} unit="sqft" kind="int" />
          </FieldRow>
          <FieldRow label="Year built" hint="construction year">
            <RangeInputs minV={phys.year_min} maxV={phys.year_max} onMin={v => setPhys('year_min', v)} onMax={v => setPhys('year_max', v)} unit="yr" kind="year" />
          </FieldRow>

          {/* Building class chips */}
          {sch.phys.includes('building_classes') && (
            <FieldRow label="Building class" hint="A/B/C — sets year_built defaults">
              <div className="preset-row">
                {VALID_BUILDING_CLASSES.map(c => {
                  const active = buildingClasses.includes(c)
                  return (
                    <button key={c} className={`preset-chip${active ? ' on' : ''}`} onClick={() => toggleBuildingClass(c)}>
                      Class {c}
                    </button>
                  )
                })}
                {buildingClasses.length > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--fg-mute)', marginLeft: 8, fontFamily: 'var(--font-secondary)' }}>
                    {buildingClasses.join(' / ')} → year defaults populated, edit above
                  </span>
                )}
              </div>
            </FieldRow>
          )}

          {/* Stories */}
          {showField('stories_min') && (
            <FieldRow label="Stories" hint="range">
              <RangeInputs minV={phys.stories_min} maxV={phys.stories_max} onMin={v => setPhys('stories_min', v)} onMax={v => setPhys('stories_max', v)} unit="" kind="int" />
            </FieldRow>
          )}

          {/* Units */}
          {showField('units_min') && (
            <FieldRow label={assetClass === 'mobile_home_rv' ? 'Pads / units' : assetClass === 'self_storage' ? 'Unit count' : 'Unit count'} hint="range">
              <RangeInputs minV={phys.units_min} maxV={phys.units_max} onMin={v => setPhys('units_min', v)} onMax={v => setPhys('units_max', v)} unit="units" kind="int" />
            </FieldRow>
          )}

          {/* Beds */}
          {showField('bedrooms_count_min') && (
            <FieldRow label="Bedrooms" hint="SFR">
              <RangeInputs minV={phys.beds_min} maxV={phys.beds_max} onMin={v => setPhys('beds_min', v)} onMax={v => setPhys('beds_max', v)} unit="bd" kind="int" />
            </FieldRow>
          )}

          {/* Baths */}
          {showField('bath_count_min') && (
            <FieldRow label="Bathrooms" hint="SFR">
              <RangeInputs minV={phys.baths_min} maxV={phys.baths_max} onMin={v => setPhys('baths_min', v)} onMax={v => setPhys('baths_max', v)} unit="ba" kind="decimal" />
            </FieldRow>
          )}

          {/* Lot width/depth (SFR) */}
          {sch.phys.includes('lot_width_min') && (
            <FieldRow label="Lot dimensions" hint="min only">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <SingleInput value={phys.lot_width_min} onChange={v => setPhys('lot_width_min', v)} unit="ft wide" placeholder="Width" kind="int" />
                <SingleInput value={phys.lot_depth_min} onChange={v => setPhys('lot_depth_min', v)} unit="ft deep" placeholder="Depth" kind="int" />
              </div>
            </FieldRow>
          )}

          {/* Construction / foundation / roof / garage */}
          {sch.phys.includes('construction_types') && (
            <FieldRow label="Construction type" hint="multi-select">
              <MultiChips options={CONSTRUCTION_TYPES} values={phys.construction_types || []} onToggle={v => toggleMulti('construction_types', v)} />
            </FieldRow>
          )}
          {sch.phys.includes('foundation_types') && (
            <FieldRow label="Foundation" hint="multi-select">
              <MultiChips options={FOUNDATION_TYPES} values={phys.foundation_types || []} onToggle={v => toggleMulti('foundation_types', v)} />
            </FieldRow>
          )}
          {sch.phys.includes('roof_types') && (
            <FieldRow label="Roof" hint="multi-select">
              <MultiChips options={ROOF_TYPES} values={phys.roof_types || []} onToggle={v => toggleMulti('roof_types', v)} />
            </FieldRow>
          )}
          {sch.phys.includes('garage_types') && (
            <FieldRow label="Garage" hint="multi-select">
              <MultiChips options={GARAGE_TYPES} values={phys.garage_types || []} onToggle={v => toggleMulti('garage_types', v)} />
            </FieldRow>
          )}
        </div>
      </section>

      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head">
          <div className="section-title">
            <span className="section-title-num">B</span> Financial
          </div>
          <span className="section-meta">Public records + V1 valuation</span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-card)', padding: '4px 16px' }}>
          <FieldRow label="Assessed value" hint="tax record">
            <RangeInputs minV={fin.price_min} maxV={fin.price_max} onMin={v => setFin('price_min', v)} onMax={v => setFin('price_max', v)} unit="$" kind="money" />
          </FieldRow>
          <FieldRow label="Minimum owner equity" hint="percent">
            <div className="preset-row">
              {['25%', '40%', '50%', '60%', '75%'].map(s => (
                <button
                  key={s}
                  className={`preset-chip${fin.equity_preset === s ? ' on' : ''}`}
                  onClick={() => setFin('equity_preset', fin.equity_preset === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
            </div>
            {fin.equity_preset && !fin.price_min && (
              <div style={{ marginTop: 6, fontSize: 10, color: '#9DA2B3', fontFamily: 'var(--font-secondary)' }}>
                Set an assessed value floor above to apply this equity filter.
              </div>
            )}
          </FieldRow>

          {/* Class-specific */}
          {sch.fin.includes('price_per_unit_max') && (
            <FieldRow label="Price per unit max" hint="multifamily">
              <SingleInput value={fin.price_per_unit_max} onChange={v => setFin('price_per_unit_max', v)} unit="$/unit" kind="money" />
            </FieldRow>
          )}
          {sch.fin.includes('improvement_to_land_max') && (
            <FieldRow label="Improvement-to-land ratio max" hint="land">
              <SingleInput value={fin.improvement_to_land_max} onChange={v => setFin('improvement_to_land_max', v)} unit="ratio" kind="decimal" placeholder="e.g. 0.25" />
            </FieldRow>
          )}
          {sch.fin.includes('development_potential_min') && (
            <FieldRow label="Development potential score min" hint="land · 0–100">
              <SingleInput value={fin.development_potential_min} onChange={v => setFin('development_potential_min', v)} unit="score" kind="int" />
            </FieldRow>
          )}

        </div>
      </section>
      </div>
    </div>
  )
}

// ── Page 3: Owner profile ───────────────────────────────────────────────────

function OwnerChips({ label, options, value, onChange }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border-sub)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>{label}</div>
      <div className="preset-row">
        {options.map(o => (
          <button
            key={o.v}
            className={`preset-chip${value === o.v ? ' on' : ''}`}
            onClick={() => onChange(o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-sub)' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>{desc}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

export function BuyBoxPage3({ form, setForm }) {
  const owner = form.owner
  const signals = form.signals || []
  const setOwner = (key, v) => setForm({ ...form, owner: { ...owner, [key]: v } })

  const taxDelinquent = signals.includes('tax-delinquent')
  const activeForeclosure = signals.includes('active-foreclosure')

  const toggleSignal = (sig) => {
    const next = signals.includes(sig) ? signals.filter(s => s !== sig) : [...signals, sig]
    setForm({ ...form, signals: next })
  }

  return (
    <div className="page-fade">
      <header className="page-head">
        <div className="page-eyebrow">
          <span className="mono-step mono">03/07</span>
          <span className="sep" />
          <span>Owner profile</span>
        </div>
        <h1 className="page-title">Who owns it?</h1>
        <p className="page-sub">Owner profile + hold + distress shortcuts. Tax delinquent and active foreclosure persist into your distress signals.</p>
      </header>

      <section className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="section-title-num">A</span> Ownership
          </div>
          <span className="section-meta">Public record + parcel inference</span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-card)', padding: '4px 20px' }}>
          <OwnerChips
            label="Entity type"
            value={owner.entity}
            onChange={v => setOwner('entity', v)}
            options={[
              { v: 'any',        label: 'Any' },
              { v: 'individual', label: 'Individual' },
              { v: 'llc',        label: 'LLC / Entity' },
              { v: 'trust',      label: 'Trust' },
              { v: 'corporate',  label: 'Corporate' },
            ]}
          />

          <FieldRow label="Hold period" hint="years">
            <RangeInputs minV={owner.hold_min} maxV={owner.hold_max} onMin={v => setOwner('hold_min', v)} onMax={v => setOwner('hold_max', v)} unit="yr" />
          </FieldRow>

          <ToggleRow
            label="Out-of-state owner"
            desc="Mailing address in a different state than the property"
            checked={owner.out_of_state}
            onChange={() => setOwner('out_of_state', !owner.out_of_state)}
          />
          <ToggleRow
            label="Absentee owner"
            desc="Mailing address does not match the property address"
            checked={owner.absentee}
            onChange={() => setOwner('absentee', !owner.absentee)}
          />
          <ToggleRow
            label="Tax delinquent"
            desc="Outstanding property tax balance — adds 'tax-delinquent' to your distress signals"
            checked={taxDelinquent}
            onChange={() => toggleSignal('tax-delinquent')}
          />
          <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 600 }}>Active foreclosure</div>
              <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>Notice of default / lis pendens — adds 'active-foreclosure' to your distress signals</div>
            </div>
            <Toggle
              checked={activeForeclosure}
              onChange={() => toggleSignal('active-foreclosure')}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
