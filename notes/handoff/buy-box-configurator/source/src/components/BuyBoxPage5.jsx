import { classSchema } from '../lib/buyBoxFieldSchema'
import { RangeInputs, SingleInput } from './buyBoxInputs'

// ── Shared atoms ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <div className={`toggle${checked ? ' on' : ''}`} style={{ cursor: 'pointer' }} onClick={onChange} />
  )
}

// Tri-state control. Value is null | true | false.
function TriToggle({ value, onChange }) {
  return (
    <div className="preset-row" style={{ gap: 4 }}>
      <button
        className={`preset-chip${value === null ? ' on' : ''}`}
        onClick={() => onChange(null)}
        style={{ minWidth: 48 }}
      >Any</button>
      <button
        className={`preset-chip${value === true ? ' on' : ''}`}
        onClick={() => onChange(true)}
        style={{ minWidth: 48 }}
      >Yes</button>
      <button
        className={`preset-chip${value === false ? ' on' : ''}`}
        onClick={() => onChange(false)}
        style={{ minWidth: 48 }}
      >No</button>
    </div>
  )
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-sub)', gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>{desc}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

function TriRow({ label, desc, value, onChange }) {
  return (
    <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-sub)', gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>{desc}</div>}
      </div>
      <TriToggle value={value} onChange={onChange} />
    </div>
  )
}

function FieldRow({ label, hint, children }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-sub)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: 'var(--fg-mute)', fontFamily: 'var(--font-secondary)' }}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

// Heat-map AADT slider: filled track interpolates blue → yellow → red
// with the end color and length both tied to the thumb position.
function lerp(a, b, t) { return Math.round(a + (b - a) * t) }
function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}
function lerpHex(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return `rgb(${lerp(r1, r2, t)}, ${lerp(g1, g2, t)}, ${lerp(b1, b2, t)})`
}
function heatColor(pct) {
  if (pct <= 50) return lerpHex('#3b82f6', '#fbbf24', pct / 50)
  return lerpHex('#fbbf24', '#ef4444', (pct - 50) / 50)
}

function AadtSlider({ value, onChange }) {
  const isSet = !(value === '' || value == null)
  const numeric = isSet ? Number(value) : 10000
  const pct = isSet ? Math.max(0, Math.min(100, ((numeric - 10000) / 140000) * 100)) : 0
  const fillEnd = heatColor(pct)
  const background = !isSet || pct === 0
    ? 'var(--border-sub)'
    : `linear-gradient(to right, #3b82f6 0%, ${fillEnd} ${pct}%, var(--border-sub) ${pct}%, var(--border-sub) 100%)`
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--fg-mute)' }}>10K</span>
        <span style={{ fontSize: 13, color: 'var(--fg)', fontFamily: 'var(--font-secondary)', fontWeight: 600 }}>
          {isSet ? `≥ ${numeric.toLocaleString('en-US')} vpd` : 'No floor'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--fg-mute)' }}>150K</span>
      </div>
      <input
        type="range"
        min={10000}
        max={150000}
        step={5000}
        value={numeric}
        onChange={e => onChange(e.target.value)}
        className="bb-aadt-slider"
        style={{ background }}
      />
      <div style={{ marginTop: 6 }}>
        <button
          className="preset-chip"
          onClick={() => onChange('')}
          style={{ fontSize: 10 }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

// ── Page 5 ──────────────────────────────────────────────────────────────────

export function BuyBoxPage5({ form, setForm }) {
  const utils = form.utils
  const location = form.location
  const flags = form.flags
  const assetClass = (form.assets || [])[0] || ''
  const sch = classSchema(assetClass)

  const setUtil = (key, v) => setForm({ ...form, utils: { ...utils, [key]: v } })
  const setLoc = (key, v) => setForm({ ...form, location: { ...location, [key]: v } })
  const setFlag = (key, v) => setForm({ ...form, flags: { ...flags, [key]: v } })

  const hasClassLocation = sch.location.length > 0 || sch.flags.length > 0

  return (
    <div className="page-fade">
      <header className="page-head">
        <div className="page-eyebrow">
          <span className="mono-step mono">05/07</span>
          <span className="sep" />
          <span>Location & risk</span>
        </div>
        <h1 className="page-title">Where, and what kind of dirt?</h1>
        <p className="page-sub">Utilities, land-use risk filters, and asset-class-specific location rules.</p>
      </header>

      <section className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="section-title-num">A</span> Available utilities
          </div>
          <span className="section-meta">Required within proximity</span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-card)', padding: '4px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
            <ToggleRow label="Water" desc="Within utility proximity" checked={utils.water} onChange={() => setUtil('water', !utils.water)} />
            <ToggleRow label="Sewer" desc="Within utility proximity" checked={utils.sewer} onChange={() => setUtil('sewer', !utils.sewer)} />
            <ToggleRow label="Electricity" desc="Within utility proximity" checked={utils.electricity} onChange={() => setUtil('electricity', !utils.electricity)} />
            <ToggleRow label="Gas pipeline" desc="Within utility proximity" checked={utils.gas} onChange={() => setUtil('gas', !utils.gas)} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="section-title-num">B</span> Risk & overlay filters
          </div>
          <span className="section-meta">Universal — apply to every asset class</span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-card)', padding: '4px 20px' }}>
          <ToggleRow
            label="Exclude floodplain"
            desc="Filter out FEMA-designated flood zones"
            checked={location.flood_exclude}
            onChange={() => setLoc('flood_exclude', !location.flood_exclude)}
          />
          <ToggleRow
            label="Exclude wetlands"
            desc="Filter out wetland-flagged parcels"
            checked={location.wetlands_exclude}
            onChange={() => setLoc('wetlands_exclude', !location.wetlands_exclude)}
          />
          <TriRow
            label="Opportunity zone"
            desc="Tax-advantaged designation"
            value={location.opportunity_zone}
            onChange={v => setLoc('opportunity_zone', v)}
          />
          <TriRow
            label="TIF district"
            desc="Tax increment financing district"
            value={location.tif_district}
            onChange={v => setLoc('tif_district', v)}
          />
        </div>
      </section>

      {hasClassLocation && assetClass && (
        <section className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="section-title-num">C</span> Class-specific
            </div>
            <span className="section-meta">{assetClass.replace(/_/g, ' ')}</span>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-card)', padding: '4px 20px' }}>
            {sch.location.includes('road_frontage_min_ft') && (
              <FieldRow label="Road frontage" hint="linear feet">
                <RangeInputs
                  minV={location.road_frontage_min}
                  maxV={location.road_frontage_max}
                  onMin={v => setLoc('road_frontage_min', v)}
                  onMax={v => setLoc('road_frontage_max', v)}
                  unit="ft"
                  kind="int"
                />
              </FieldRow>
            )}
            {sch.location.includes('aadt_min') && (
              <FieldRow label="AADT minimum" hint="vehicles per day">
                <AadtSlider value={location.aadt_min} onChange={v => setLoc('aadt_min', v)} />
              </FieldRow>
            )}
            {sch.flags.includes('corner_lot_required') && (
              <ToggleRow
                label="Corner lot only"
                checked={location.corner_lot}
                onChange={() => setLoc('corner_lot', !location.corner_lot)}
              />
            )}
            {sch.flags.includes('has_pool') && (
              <TriRow
                label="Pool"
                desc="On-site pool"
                value={flags.has_pool}
                onChange={v => setFlag('has_pool', v)}
              />
            )}
            {sch.flags.includes('has_elevator') && (
              <TriRow
                label="Elevator"
                desc="Building has an elevator"
                value={flags.has_elevator}
                onChange={v => setFlag('has_elevator', v)}
              />
            )}
            {sch.flags.includes('pct_renter_occupied_min') && (
              <FieldRow label="% renter occupied minimum" hint="0–100">
                <SingleInput
                  value={flags.pct_renter_occupied_min}
                  onChange={v => setFlag('pct_renter_occupied_min', v)}
                  unit="%"
                  kind="int"
                  placeholder="e.g. 60"
                />
              </FieldRow>
            )}
            {sch.flags.includes('mf_lihtc_flag') && (
              <TriRow
                label="LIHTC proximity"
                desc="Within proximity of a LIHTC project (Yes) / exclude (No) / any"
                value={flags.mf_lihtc_flag}
                onChange={v => setFlag('mf_lihtc_flag', v)}
              />
            )}
            {sch.flags.includes('ss_is_reit_owned') && (
              <TriRow
                label="REIT owned"
                desc="Self storage REIT operator"
                value={flags.ss_is_reit_owned}
                onChange={v => setFlag('ss_is_reit_owned', v)}
              />
            )}
            {sch.flags.includes('ss_has_foreclosure_history') && (
              <TriRow
                label="Foreclosure history"
                desc="Property previously involved in foreclosure"
                value={flags.ss_has_foreclosure_history}
                onChange={v => setFlag('ss_has_foreclosure_history', v)}
              />
            )}
            {sch.flags.includes('assemblage_potential') && (
              <ToggleRow
                label="Assemblage potential"
                desc="Adjacent parcels with same/related owner"
                checked={location.assemblage_potential}
                onChange={() => setLoc('assemblage_potential', !location.assemblage_potential)}
              />
            )}
            {sch.flags.includes('in_etj') && (
              <TriRow
                label="In ETJ"
                desc="Extraterritorial jurisdiction"
                value={location.in_etj}
                onChange={v => setLoc('in_etj', v)}
              />
            )}
            {sch.location.includes('zoning_codes') && (
              <FieldRow label="Zoning codes" hint="comma-separated">
                <input
                  type="text"
                  value={(location.zoning_codes || []).join(', ')}
                  onChange={e => setLoc('zoning_codes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="e.g. C-1, MU-3, A"
                  style={{ width: '100%', background: 'var(--surface-sub)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-input)', padding: '8px 12px', color: 'var(--fg)', fontFamily: 'var(--font-secondary)', fontSize: 13 }}
                />
              </FieldRow>
            )}
            {sch.location.includes('future_land_use_codes') && (
              <FieldRow label="Future land use" hint="comma-separated">
                <input
                  type="text"
                  value={(location.future_land_use_codes || []).join(', ')}
                  onChange={e => setLoc('future_land_use_codes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="e.g. Commercial, Residential"
                  style={{ width: '100%', background: 'var(--surface-sub)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-input)', padding: '8px 12px', color: 'var(--fg)', fontFamily: 'var(--font-secondary)', fontSize: 13 }}
                />
              </FieldRow>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
