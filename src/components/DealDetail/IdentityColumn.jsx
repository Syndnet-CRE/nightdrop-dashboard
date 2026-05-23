import { AerialThumb } from '../AerialThumb.jsx';
import { fmt, fmtMoney, hasVal } from '../../lib/format.js';
import { getAssetClass } from '../../lib/buyBoxTaxonomy.js';

function Chip({ label, value }) {
  if (!hasVal(value)) return null;
  return (
    <span className="dd-identity-chip" title={label}>
      <span className="dd-identity-chip-label">{label}</span>
      <span className="dd-identity-chip-value">{value}</span>
    </span>
  );
}

function Stat({ label, value, primary }) {
  if (!hasVal(value)) return null;
  return (
    <div className={`dd-identity-stat${primary ? ' primary' : ''}`}>
      <span className="dd-identity-stat-label">{label}</span>
      <span className="dd-identity-stat-value">{value}</span>
    </div>
  );
}

function sfLabel(v) {
  if (!hasVal(v)) return null;
  return Number(v).toLocaleString() + ' sf';
}

function acresLabel(deal, bj) {
  const v = bj.lot_ac ?? deal.acres ?? (deal.lot_sf ? Number(deal.lot_sf) / 43560 : null);
  if (!hasVal(v)) return null;
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ac';
}

function dateLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function IdentityColumn({ deal }) {
  const bj = deal.briefJson || deal.brief_json || {};
  const assetClass = deal.asset_class || deal.use_type;
  const assetLabel = assetClass ? (getAssetClass(assetClass)?.label || String(assetClass).replace(/_/g, ' ')) : null;

  return (
    <aside className="dd-identity" aria-label="Property identity">
      <h1 className="dd-identity-address">{deal.address || 'Unknown Address'}</h1>
      {(deal.city || deal.state) && (
        <div className="dd-identity-citystate">
          {[deal.city, deal.state, deal.zip].filter(Boolean).join(', ')}
        </div>
      )}

      <div className="dd-identity-chips">
        <Chip label="Asset Class" value={assetLabel} />
        <Chip label="Year Built"  value={hasVal(deal.year_built) ? fmt(deal.year_built) : null} />
        <Chip label="Building"    value={sfLabel(deal.building_sf)} />
        <Chip label="Lot"         value={acresLabel(deal, bj)} />
      </div>

      <div className="dd-identity-thumbs">
        <div className="dd-identity-thumb">
          <AerialThumb id={deal.id} lat={deal.lat} lng={deal.lng} large={true} showParcel={false} />
          <span className="dd-identity-thumb-label">Satellite</span>
        </div>
        <div className="dd-identity-thumb">
          <AerialThumb id={deal.id} lat={deal.lat} lng={deal.lng} large={true} showParcel={true} />
          <span className="dd-identity-thumb-label">Parcel</span>
        </div>
      </div>

      <div className="dd-identity-stack">
        <Stat
          primary
          label="Assessed Value"
          value={hasVal(deal.assessed_value ?? bj.assessed_value) ? fmtMoney(deal.assessed_value ?? bj.assessed_value) : null}
        />
        <Stat
          label="Last Sale Price"
          value={hasVal(deal.last_sale_price) ? fmtMoney(deal.last_sale_price) : null}
        />
        <Stat
          label="Last Sale Date"
          value={dateLabel(deal.last_sale_date)}
        />
      </div>
    </aside>
  );
}
