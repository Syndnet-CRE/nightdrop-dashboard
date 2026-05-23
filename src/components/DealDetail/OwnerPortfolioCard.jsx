import { useState } from 'react';
import { useDeals } from '../../contexts/DealsContext.jsx';
import { OwnerPortfolio } from '../OwnerPortfolio.jsx';
import { fmtMoney, hasVal } from '../../lib/format.js';

function initialsOf(name) {
  if (!name) return '?';
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

function locationLabel(portfolio, deal) {
  const m = portfolio?.owner_vectors?.mailing_address;
  if (m) {
    const match = m.match(/,\s*([A-Z]{2})\s*\d{5}/);
    if (match) return match[1];
    return m;
  }
  return [deal.city, deal.state].filter(Boolean).join(', ') || null;
}

function avgYearsOwned(properties) {
  if (!properties || !properties.length) return null;
  const vals = properties.map((p) => Number(p.years_owned)).filter((n) => isFinite(n));
  if (!vals.length) return null;
  const avg = vals.reduce((s, n) => s + n, 0) / vals.length;
  return Math.round(avg);
}

export function OwnerPortfolioCard({ deal }) {
  const { portfolios } = useDeals();
  const [showFull, setShowFull] = useState(false);
  const attomId = deal.attomId || deal.attom_id;
  if (!attomId) return null;

  const portfolio = portfolios[attomId];
  const totals = portfolio?.totals || {};
  const properties = portfolio?.properties || [];
  const ownerName = deal.owner_name || portfolio?.owner_vectors?.owner_name || 'Unknown Owner';
  const ownerType = deal.owner_type || 'individual';
  const isInstitutional = /(llc|trust|corp|inc|lp|partner)/i.test(ownerType);
  const location = locationLabel(portfolio, deal);
  const years = avgYearsOwned(properties);

  return (
    <section className="dd-portfolio-card" aria-label="Owner and portfolio">
      <header className="dd-portfolio-card-head">
        <div className="dd-portfolio-card-owner">
          <div className="dd-portfolio-avatar" aria-hidden="true">{initialsOf(ownerName)}</div>
          <div className="dd-portfolio-owner-meta">
            <span className="dd-portfolio-owner-name">{ownerName}</span>
            {location && <span className="dd-portfolio-owner-loc">{location}</span>}
            <span className={`dd-portfolio-owner-badge ${isInstitutional ? 'institutional' : 'individual'}`}>
              {String(ownerType).replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </header>

      <div className="dd-portfolio-summary">
        {totals.property_count > 0 && (
          <div className="dd-portfolio-summary-stat">
            <span className="dd-portfolio-summary-value">{totals.property_count}</span>
            <span className="dd-portfolio-summary-label">Properties</span>
          </div>
        )}
        {hasVal(totals.total_estimated_equity ?? totals.total_assessed_value) && (
          <div className="dd-portfolio-summary-stat">
            <span className="dd-portfolio-summary-value">
              {fmtMoney(totals.total_estimated_equity ?? totals.total_assessed_value)}
            </span>
            <span className="dd-portfolio-summary-label">
              {hasVal(totals.total_estimated_equity) ? 'Total Equity' : 'Total Value'}
            </span>
          </div>
        )}
        {hasVal(years) && (
          <div className="dd-portfolio-summary-stat">
            <span className="dd-portfolio-summary-value">{years}<small>yrs</small></span>
            <span className="dd-portfolio-summary-label">Avg Held</span>
          </div>
        )}
      </div>

      <div className={`dd-portfolio-card-body${showFull ? ' expanded' : ''}`}>
        <OwnerPortfolio deal={deal} />
      </div>

      {properties.length > 0 && (
        <button
          type="button"
          className="dd-expand-toggle"
          onClick={() => setShowFull((v) => !v)}
          aria-expanded={showFull}
        >
          {showFull ? 'Show less ↑' : `View Full Portfolio (${properties.length}) →`}
        </button>
      )}
    </section>
  );
}
