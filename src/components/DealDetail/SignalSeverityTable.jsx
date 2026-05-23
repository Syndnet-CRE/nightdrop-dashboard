const URGENT_PATTERNS = ['foreclos', 'tax', 'delinq', 'lien', 'auction', 'maturity', 'default'];
const PRESSURE_PATTERNS = ['absentee', 'investor', 'long_term', 'hold', 'arm', 'high_ltv', 'free_clear', 'deed', 'distant'];

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

function tierLabel(tier) {
  if (tier === 'urgent') return 'Urgent';
  if (tier === 'pressure') return 'Pressure';
  return 'Flag';
}

function humanize(s) {
  return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function rowFor(sig, i) {
  const tier = tierFor(sig);
  if (typeof sig === 'string') {
    return { id: i, tier, name: sig, category: '', description: '' };
  }
  const name = sig.tag || sig.label || sig.description || sig.type || '';
  const category = humanize(sig.category || sig.type || '');
  const description = sig.description && sig.description !== name ? sig.description : '';
  return { id: i, tier, name, category, description };
}

export function SignalSeverityTable({ signals = [], absenteeOwner }) {
  const rows = signals.map(rowFor).filter((r) => r.name && typeof r.name === 'string');
  if (absenteeOwner && !rows.some((r) => /absentee/i.test(r.name))) {
    rows.unshift({ id: '__absentee', tier: 'pressure', name: 'Absentee Owner', category: 'Ownership', description: '' });
  }
  if (!rows.length) return null;

  return (
    <div className="dd-severity-table" role="table" aria-label="Distress signals by severity">
      <div className="dd-severity-head" role="row">
        <span role="columnheader">Signal</span>
        <span role="columnheader">Category</span>
        <span role="columnheader">Tier</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} className={`dd-severity-row tier-${r.tier}`} role="row">
          <span className="dd-severity-name" role="cell">
            <span className="dd-severity-label">{r.name}</span>
            {r.description && <span className="dd-severity-desc">{r.description}</span>}
          </span>
          <span className="dd-severity-category" role="cell">{r.category || '—'}</span>
          <span className="dd-severity-tier" role="cell">{tierLabel(r.tier)}</span>
        </div>
      ))}
    </div>
  );
}
