import { Fragment } from 'react';
import { fmt, hasVal } from '../lib/format.js';

function nv(v) {
  if (v === null || v === undefined || v === '' || v === 'null' || v === 'undefined' || v === '—') return null;
  return v;
}

export function Rows({ data, wide }) {
  const visible = data.filter(([, v]) => nv(v) !== null && hasVal(v));
  if (!visible.length) {
    return <span style={{ color: 'var(--fg-4)', fontSize: 'var(--t-cap)' }}>No data available</span>;
  }
  return (
    <div className={`dd-rows${wide ? ' wide' : ''}`}>
      {visible.map(([label, val], i) => (
        <Fragment key={i}>
          <span className="dd-row-label">{label}</span>
          <span className="dd-row-val">{val}</span>
        </Fragment>
      ))}
    </div>
  );
}

export function SecHead({ title, date }) {
  return (
    <div className="dd-sec-head">
      <span className="dd-sec-title">{title}</span>
      {date && <span className="dd-sec-updated">Updated {fmt(date)} »</span>}
    </div>
  );
}

export function Chip({ color = 'gray', children }) {
  return <span className={`dd-pill ${color}`}>{children}</span>;
}

export function ConfBadge({ conf }) {
  if (!conf) return null;
  const color = conf === 'high' ? 'green' : conf === 'medium' ? 'amber' : 'gray';
  return <span className={`dd-conf-badge ${color}`}>{conf}</span>;
}
