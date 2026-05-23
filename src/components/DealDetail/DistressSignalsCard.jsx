import { useState } from 'react';
import { ExpandToggle } from './Expandable.jsx';

const URGENT_PATTERNS = ['foreclos', 'tax', 'delinq', 'lien', 'auction', 'maturity', 'default'];
const PRESSURE_PATTERNS = ['absentee', 'investor', 'long_term', 'hold', 'arm', 'high_ltv', 'free_clear', 'deed', 'distant'];

const TIER_ORDER = { urgent: 0, pressure: 1, flag: 2 };
const SUMMARY_COUNT = 5;

function tierFor(sig) {
  const haystack = [
    typeof sig === 'string' ? sig : '',
    sig?.tag || '',
    sig?.category || '',
    sig?.type || '',
    sig?.label || '',
  ].join(' ').toLowerCase();
  if (URGENT_PATTERNS.some((p) => haystack.includes(p))) return 'urgent';
  if (PRESSURE_PATTERNS.some((p) => haystack.includes(p))) return 'pressure';
  return 'flag';
}

function rowFor(sig, i) {
  const tier = tierFor(sig);
  if (typeof sig === 'string') {
    return { id: i, tier, name: sig, value: '' };
  }
  const name = sig.tag || sig.label || sig.description || sig.type || '';
  const value = sig.value || sig.detail || '';
  return { id: i, tier, name, value: value && value !== name ? value : '' };
}

export function DistressSignalsCard({ deal, signals }) {
  const [open, setOpen] = useState(false);

  const rows = (signals || []).map(rowFor).filter((r) => r.name && typeof r.name === 'string');
  if (deal.absentee_owner && !rows.some((r) => /absentee/i.test(r.name))) {
    rows.unshift({ id: '__absentee', tier: 'pressure', name: 'Absentee Owner', value: '' });
  }
  if (!rows.length) return null;

  rows.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
  const visible = open ? rows : rows.slice(0, SUMMARY_COUNT);
  const hiddenCount = rows.length - SUMMARY_COUNT;

  return (
    <section className="dd-panel" aria-label="Distress signals">
      <header className="dd-panel-head">
        <h3 className="dd-panel-title">Distress Signals</h3>
        <span className="dd-panel-count">{rows.length}</span>
      </header>
      <ul className="dd-distress-list" role="list">
        {visible.map((r) => (
          <li key={r.id} className={`dd-distress-row tier-${r.tier}`}>
            <span className="dd-distress-name">{r.name}</span>
            {r.value && <span className="dd-distress-value">{r.value}</span>}
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <ExpandToggle
          open={open}
          onToggle={() => setOpen((v) => !v)}
          summaryLabel={`View All Distress Signals (${rows.length})`}
        />
      )}
    </section>
  );
}
