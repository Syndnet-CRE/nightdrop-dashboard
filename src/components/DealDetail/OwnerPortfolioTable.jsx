import { useNavigate } from 'react-router-dom';
import { fmtMoney, hasVal } from '../../lib/format.js';
import { getAssetClass, getAssetClassColor } from '../../lib/buyBoxTaxonomy.js';

function sfLabel(v) {
  if (!hasVal(v)) return '—';
  return Number(v).toLocaleString() + ' sf';
}

function acresLabel(v) {
  if (!hasVal(v)) return '—';
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ac';
}

function AssetClassChip({ slug }) {
  if (!slug) return <span className="dd-portfolio-asset-chip dd-portfolio-asset-chip--empty">—</span>;
  const cls = getAssetClass(slug);
  const label = cls?.label || slug.replace(/_/g, ' ');
  const color = getAssetClassColor(slug);
  return (
    <span className="dd-portfolio-asset-chip" style={{ '--chip-color': color }} title={label}>
      <span className="dd-portfolio-asset-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export function OwnerPortfolioTable({ portfolio }) {
  const navigate = useNavigate();
  const properties = portfolio?.properties || [];
  const totals = portfolio?.totals || {};

  if (!properties.length) return null;

  function handleRowClick(p) {
    if (p.deal_id) {
      navigate(`/map?focus=${encodeURIComponent(p.deal_id)}`);
    }
  }
  function handleRowKey(e, p) {
    if (!p.deal_id) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(p);
    }
  }

  return (
    <div className="dd-portfolio-table-wrap">
      <table className="dd-table dd-portfolio-table">
        <thead>
          <tr>
            <th>Address</th>
            <th>Asset Class</th>
            <th className="num">Assessed</th>
            <th className="num">Bldg SF</th>
            <th className="num">Lot</th>
            <th>Match</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((p, i) => {
            const inFeed = !!p.deal_id;
            const slug = p.asset_class || p.resolved_asset_type;
            return (
              <tr
                key={p.attom_id || i}
                className={`dd-portfolio-row${inFeed ? ' clickable' : ' disabled'}`}
                onClick={() => handleRowClick(p)}
                onKeyDown={(e) => handleRowKey(e, p)}
                tabIndex={inFeed ? 0 : -1}
                title={inFeed ? 'View on map' : 'Not in your deal feed'}
              >
                <td className="dd-portfolio-address">
                  <span className="dd-portfolio-address-text">{p.address_full || p.address || '—'}</span>
                  {p.address_city && p.address_state && (
                    <span className="dd-portfolio-address-city">{p.address_city}, {p.address_state}</span>
                  )}
                </td>
                <td><AssetClassChip slug={slug} /></td>
                <td className="num">{fmtMoney(p.assessed_value ?? p.tax_assessed_total)}</td>
                <td className="num">{sfLabel(p.building_sf ?? p.area_building)}</td>
                <td className="num">{acresLabel(p.lot_acreage ?? p.acres ?? p.area_lot_acres)}</td>
                <td>
                  <span className={`dd-pill ${p.matched_by === 'both' ? 'green' : p.matched_by === 'name' ? 'blue' : 'amber'}`}>
                    {p.matched_by || '—'}
                  </span>
                </td>
              </tr>
            );
          })}
          {totals.property_count > 0 && (
            <tr className="dd-portfolio-totals">
              <td colSpan={2}><strong>Portfolio Total</strong></td>
              <td className="num">{fmtMoney(totals.total_assessed_value)}</td>
              <td className="num">{sfLabel(totals.total_building_sf)}</td>
              <td className="num">{acresLabel(totals.total_acreage)}</td>
              <td />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
