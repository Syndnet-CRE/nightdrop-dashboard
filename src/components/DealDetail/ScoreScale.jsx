function scoreVariant(score) {
  if (score == null || isNaN(score)) return 'none';
  if (score >= 70) return 'hi';
  if (score >= 40) return 'md';
  return 'lo';
}

export function ScoreScale({ score, compact = false }) {
  const hasScore = score != null && !isNaN(score);
  const n = hasScore ? Math.round(Number(score)) : null;
  const variant = scoreVariant(hasScore ? Number(score) : null);
  const pct = hasScore ? Math.max(0, Math.min(100, Number(score))) : 0;

  return (
    <div className={`dd-score-scale ${variant}${compact ? ' compact' : ''}`}>
      <div className="dd-score-scale-row">
        <span className="dd-score-scale-num">{hasScore ? n : '—'}</span>
        {!compact && <span className="dd-score-scale-label">{hasScore ? 'Score' : 'No Score'}</span>}
      </div>
      <div className="dd-score-scale-track" aria-hidden="true">
        <div className="dd-score-scale-fill" style={{ width: `${pct}%` }} />
      </div>
      {!compact && (
        <div className="dd-score-scale-ends" aria-hidden="true">
          <span>0</span>
          <span>100</span>
        </div>
      )}
    </div>
  );
}
