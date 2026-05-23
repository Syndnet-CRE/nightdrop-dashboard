import { AlertCircle, AlertTriangle, Flag } from 'lucide-react';
import { ScoreScale } from './ScoreScale.jsx';

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

function IconForTier({ tier }) {
  if (tier === 'urgent') return <AlertCircle size={14} strokeWidth={2.4} />;
  if (tier === 'pressure') return <AlertTriangle size={14} strokeWidth={2.4} />;
  return <Flag size={14} strokeWidth={2.4} />;
}

function signalRow(sig, i) {
  const tier = tierFor(sig);
  if (typeof sig === 'string') {
    return { id: i, tier, name: sig, value: '' };
  }
  const name = sig.tag || sig.label || sig.description || sig.type || '';
  const value = sig.value || sig.detail || sig.description || '';
  return { id: i, tier, name, value: value && value !== name ? value : '' };
}

export function WhyFlaggedCard({ deal, signals }) {
  const bj = deal.briefJson || deal.brief_json || {};
  const rows = (signals || []).map(signalRow).filter((r) => r.name && typeof r.name === 'string');
  if (deal.absentee_owner && !rows.some((r) => /absentee/i.test(r.name))) {
    rows.unshift({ id: '__absentee', tier: 'pressure', name: 'Absentee Owner', value: '' });
  }
  const thesis = bj.headline || bj.summary_one_line || bj.thesis || null;
  const hasNarrative = !!(bj.narrative || bj.summary);
  const score = deal.distress_score ?? deal.score;

  return (
    <section className="dd-why-flagged" aria-label="Why Nightdrop flagged this deal">
      <header className="dd-why-flagged-head">
        <h2 className="dd-why-flagged-title">Why Nightdrop Flagged This Deal</h2>
        <ScoreScale score={score} compact={false} />
      </header>

      {thesis && (
        <p className="dd-why-flagged-thesis">{thesis}</p>
      )}

      {rows.length > 0 ? (
        <ul className="dd-why-flagged-list" role="list">
          {rows.map((r) => (
            <li key={r.id} className={`dd-why-flagged-row tier-${r.tier}`}>
              <span className="dd-why-flagged-icon" aria-hidden="true"><IconForTier tier={r.tier} /></span>
              <span className="dd-why-flagged-name">{r.name}</span>
              {r.value && <span className="dd-why-flagged-value">{r.value}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="dd-why-flagged-empty">No specific distress signals flagged for this property.</p>
      )}

      {hasNarrative && (
        <a className="dd-why-flagged-link" href="#dd-narrative">View AI Analysis →</a>
      )}
    </section>
  );
}
