import { useState } from 'react';
import { fmt, hasVal } from '../../lib/format.js';
import { ExpandToggle } from './Expandable.jsx';

function sfLabel(v) {
  if (!hasVal(v)) return null;
  return Number(v).toLocaleString() + ' sf';
}
function acresLabel(v) {
  if (!hasVal(v)) return null;
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ac';
}
function dateLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function moneyLabel(v) {
  if (!hasVal(v)) return null;
  const n = Number(v);
  if (!isFinite(n)) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function Row({ label, value }) {
  if (!hasVal(value) || value === '—') return null;
  return (
    <div className="dd-data-row">
      <span className="dd-data-row-label">{label}</span>
      <span className="dd-data-row-value">{value}</span>
    </div>
  );
}

export function PropertyIntelligenceCard({ deal }) {
  const bj = deal.briefJson || deal.brief_json || {};
  const [open, setOpen] = useState(false);

  const lotDimensions = (() => {
    const w = bj.lot_width;
    const d = bj.lot_depth;
    if (hasVal(w) && hasVal(d)) return `${w}' × ${d}'`;
    const sf = sfLabel(deal.lot_sf ?? bj.lot_sf);
    const ac = acresLabel(bj.lot_ac ?? deal.acres);
    return [sf, ac].filter(Boolean).join(' · ') || null;
  })();

  const lastSale = (() => {
    const price = moneyLabel(deal.last_sale_price);
    const date = dateLabel(deal.last_sale_date);
    if (price && date) return `${price} · ${date}`;
    return price || date || null;
  })();

  const daysOnMarket = hasVal(deal.days) ? `${deal.days} day${deal.days === 1 ? '' : 's'}` : null;

  // Summary set (default visible — top 6)
  const summary = [
    ['APN',              fmt(deal.apn ?? bj.apn)],
    ['County',           fmt(deal.county)],
    ['Zoning',           fmt(bj.zoning_code || deal.zoning)],
    ['Lot Dimensions',   lotDimensions],
    ['Last Sale',        lastSale],
    ['Days On Market',   daysOnMarket],
  ].filter(([, v]) => hasVal(v) && v !== '—');

  // Expanded extras
  const extras = [
    ['Asset Class',      fmt(deal.asset_class)],
    ['Use Type',         fmt(deal.use_type)],
    ['Year Built',       fmt(deal.year_built)],
    ['Stories',          fmt(deal.stories)],
    ['Units',            fmt(deal.units)],
    ['Building SF',      sfLabel(deal.building_sf)],
    ['Construction',     fmt(bj.construction_type)],
    ['Exterior Walls',   fmt(bj.exterior_walls)],
    ['Roof Type',        fmt(bj.roof_type)],
    ['Foundation',       fmt(bj.foundation)],
    ['HVAC Cooling',     fmt(bj.hvac_cooling)],
    ['HVAC Heating',     fmt(bj.hvac_heating)],
    ['Parking',          fmt(bj.parking_spaces)],
    ['Submarket',        fmt(deal.submarket)],
    ['MSA',              fmt(deal.msa)],
    ['Census Tract',     fmt(deal.census_tract ?? bj.census_tract)],
    ['Jurisdiction',     fmt(deal.city_jurisdiction)],
    ['In ETJ',           deal.in_etj == null ? null : (deal.in_etj ? 'Yes' : 'No')],
  ].filter(([, v]) => hasVal(v) && v !== '—');

  if (!summary.length && !extras.length) return null;

  return (
    <section className="dd-panel" aria-label="Property intelligence">
      <header className="dd-panel-head">
        <h3 className="dd-panel-title">Property Intelligence</h3>
      </header>
      <div className="dd-data-rows">
        {summary.map(([l, v]) => <Row key={l} label={l} value={v} />)}
        {open && extras.map(([l, v]) => <Row key={l} label={l} value={v} />)}
      </div>
      {extras.length > 0 && (
        <ExpandToggle
          open={open}
          onToggle={() => setOpen((v) => !v)}
          summaryLabel="View Full Property Report"
        />
      )}
    </section>
  );
}
