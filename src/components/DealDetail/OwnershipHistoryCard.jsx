import { useState } from 'react';
import { fmt, fmtMoney, hasVal } from '../../lib/format.js';
import { ExpandToggle } from './Expandable.jsx';

const SUMMARY_COUNT = 5;

function dateLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function normalizeTransactions(deal) {
  const bj = deal.briefJson || deal.brief_json || {};
  const list = Array.isArray(bj.sales_history) ? bj.sales_history : [];
  const normalized = list
    .map((t) => ({
      date: t.date ?? t.sale_date,
      price: t.price ?? t.sale_price,
      buyer: t.buyer ?? t.grantee,
      seller: t.seller ?? t.grantor,
      deedType: t.deed_type ?? t.deed ?? t.recording_type,
    }))
    .filter((t) => hasVal(t.date) || hasVal(t.price));

  // Fallback: synthesize a single transaction from last_sale_price / last_sale_date
  if (!normalized.length && (hasVal(deal.last_sale_price) || hasVal(deal.last_sale_date))) {
    normalized.push({
      date: deal.last_sale_date,
      price: deal.last_sale_price,
      buyer: deal.owner_name || null,
      seller: null,
      deedType: null,
    });
  }

  // Sort newest first
  normalized.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return normalized;
}

export function OwnershipHistoryCard({ deal }) {
  const [open, setOpen] = useState(false);
  const transactions = normalizeTransactions(deal);
  if (!transactions.length) return null;

  const visible = open ? transactions : transactions.slice(0, SUMMARY_COUNT);
  const hiddenCount = transactions.length - SUMMARY_COUNT;

  return (
    <section className="dd-panel" aria-label="Ownership history">
      <header className="dd-panel-head">
        <h3 className="dd-panel-title">Ownership History</h3>
        <span className="dd-panel-count">{transactions.length}</span>
      </header>
      <ul className="dd-ownership-list" role="list">
        {visible.map((t, i) => (
          <li key={i} className="dd-ownership-row">
            <div className="dd-ownership-row-head">
              <span className="dd-ownership-date">{dateLabel(t.date) || '—'}</span>
              <span className="dd-ownership-price">{hasVal(t.price) ? fmtMoney(t.price) : '—'}</span>
            </div>
            {(t.buyer || t.deedType) && (
              <div className="dd-ownership-row-meta">
                {t.buyer && <span className="dd-ownership-buyer">{fmt(t.buyer)}</span>}
                {t.deedType && <span className="dd-ownership-deed">{fmt(t.deedType)}</span>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <ExpandToggle
          open={open}
          onToggle={() => setOpen((v) => !v)}
          summaryLabel={`View Full Ownership History (${transactions.length})`}
        />
      )}
    </section>
  );
}
