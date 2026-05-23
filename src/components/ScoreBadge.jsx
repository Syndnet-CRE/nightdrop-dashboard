import { useState, useRef, useEffect } from 'react';

function scoreColor(score) {
  const n = Number(score);
  if (!isFinite(n)) return { bg: '#374151', fg: 'var(--muted-foreground)' };
  if (n >= 8) return { bg: 'var(--primary)', fg: '#fff' };
  if (n >= 5) return { bg: '#D97706', fg: '#fff' };
  return { bg: 'var(--destructive)', fg: '#fff' };
}

export default function ScoreBadge({ score, className = '' }) {
  const [tip, setTip] = useState(false);
  const timerRef = useRef(null);
  const { bg, fg } = scoreColor(score);
  const display = score != null ? Number(score).toFixed(1) : '—';

  function handleEnter() {
    timerRef.current = setTimeout(() => setTip(true), 500);
  }
  function handleLeave() {
    clearTimeout(timerRef.current);
    setTip(false);
  }
  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <span
      className={`score-badge ${className}`}
      style={{ background: bg, color: fg }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {display}
      {tip && (
        <span className="score-badge-tip">
          Match score based on distress signals, buy box criteria alignment, and ownership profile.
        </span>
      )}
    </span>
  );
}
