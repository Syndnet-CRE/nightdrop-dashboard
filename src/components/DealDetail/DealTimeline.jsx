import { useState } from 'react';
import { FileText, TrendingUp, AlertTriangle, CheckSquare, X, Database } from 'lucide-react';
import { fmt, hasVal } from '../../lib/format';

const LANES = [
  { id: 'deeds', label: 'Deed Transfers', Icon: FileText, color: 'var(--accent)', types: ['deed'] },
  { id: 'loans', label: 'Loans & Refinances', Icon: TrendingUp, color: 'var(--info-color)', types: ['loan'] },
  { id: 'permits', label: 'Permits & Improvements', Icon: CheckSquare, color: 'var(--warning)', types: ['permit'] },
  { id: 'distress', label: 'Financial Distress', Icon: AlertTriangle, color: 'var(--destructive)', types: ['lien', 'lien-clear', 'violation', 'violation-clear'] }
];

function fmtDate(d) {
  if (!d) return '';
  const parts = String(d).split('-');
  if (parts.length < 2) return '';
  const [y, m] = parts;
  const mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(m) - 1;
  if (monthIdx < 0 || monthIdx >= 12) return '';
  return `${mo[monthIdx]} ${y}`;
}

function fmtMoney(n) {
  if (!hasVal(n)) return '—';
  const num = Number(n);
  if (!isFinite(num)) return '—';
  return num >= 1e6 ? '$' + (num / 1e6).toFixed(2) + 'M' : '$' + num.toLocaleString();
}

// Build events from deal data
// eslint-disable-next-line react-refresh/only-export-components
export function buildTimelineEvents(deal) {
  const events = [];

  if (!deal) return events;

  const briefJson = deal.briefJson || deal.brief_json || {};

  // Deed from last_sale_date
  if (hasVal(briefJson.last_sale_date)) {
    events.push({
      type: 'deed',
      label: 'Deed Transfer',
      date: String(briefJson.last_sale_date).slice(0, 7), // YYYY-MM
      owner: briefJson.last_sale_grantor || 'Unknown',
      price: briefJson.last_sale_price
    });
  }

  // Lien from foreclosure_recording_date
  if (hasVal(deal.foreclosure_recording_date)) {
    events.push({
      type: 'lien',
      label: 'Lien Recorded',
      date: String(deal.foreclosure_recording_date).slice(0, 7), // YYYY-MM
      amt: null,
      owner: 'Foreclosure'
    });
  }

  // Permit from last_permit_date
  if (hasVal(deal.last_permit_date)) {
    events.push({
      type: 'permit',
      label: fmt(deal.last_permit_type || 'Permit'),
      date: String(deal.last_permit_date).slice(0, 7), // YYYY-MM
      owner: 'Permit Filed'
    });
  }

  // Violations (if array)
  if (Array.isArray(deal.code_violations) && deal.code_violations.length > 0) {
    deal.code_violations.forEach((v) => {
      if (hasVal(v.date)) {
        events.push({
          type: 'violation',
          label: 'Code Violation',
          date: String(v.date).slice(0, 7),
          owner: fmt(v.description || 'Violation'),
          amt: null
        });
      }
    });
  }

  // Sort by date ascending
  events.sort((a, b) => a.date.localeCompare(b.date));

  return events;
}

function DotRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '7px 0', borderBottom: '1px solid var(--border-faint)' }}>
      <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 400, flexShrink: 0, whiteSpace: 'nowrap', minWidth: 90 }}>{label}</span>
      <span style={{ flex: 1, height: 1, borderBottom: '1px dotted var(--border-strong)', marginBottom: 3, minWidth: 12, opacity: 0.4 }} />
      <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 12, fontWeight: 700, color: valueColor || 'var(--fg)', flexShrink: 0, textAlign: 'right', fontFeatureSettings: "'tnum','zero'", whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function ExpandedDetail({ ev, color, onClose }) {
  const rows = [
    ev.owner && { label: 'Owner / Entity', value: ev.owner },
    ev.price && { label: 'Sale Price', value: fmtMoney(ev.price), accent: true },
    ev.amt && !ev.price && { label: 'Amount', value: fmtMoney(ev.amt), accent: true },
    ev.lender && { label: 'Lender', value: ev.lender },
    ev.notes && { label: 'Notes', value: ev.notes },
    { label: 'Event Date', value: fmtDate(ev.date) },
    { label: 'Instrument', value: ev.type.replace('-', ' → ').toUpperCase() }
  ].filter(Boolean);

  return (
    <div
      style={{
        margin: '10px 0 4px',
        background: 'var(--secondary)',
        border: `1px solid ${color}30`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: '14px 18px',
        position: 'relative',
        animation: 'expandIn 0.15s cubic-bezier(.22,1,.36,1)'
      }}>
      <style>{`@keyframes expandIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <button
        aria-label="Close detail panel"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 2 }}>
        <X size={13} />
      </button>

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ev.label}</span>
        <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 11, color: 'var(--muted-foreground)', fontFeatureSettings: "'tnum','zero'" }}>{fmtDate(ev.date)}</span>
        {(ev.price || ev.amt) && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-secondary)', fontSize: 16, fontWeight: 800, color, fontFeatureSettings: "'tnum','zero'" }}>
            {fmtMoney(ev.price || ev.amt)}
          </span>
        )}
      </div>

      {/* Dot-leader rows — 2 column layout for more rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
        {rows.map((r) => (
          <DotRow key={r.label} label={r.label} value={r.value} valueColor={r.accent ? color : undefined} />
        ))}
      </div>
    </div>
  );
}

function EventCell({ ev, isExpanded, onClick, color }) {
  const [hov, setHov] = useState(false);
  const active = isExpanded || hov;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '0 6px 4px'
      }}
      onClick={onClick}
      onMouseOver={() => setHov(true)}
      onMouseOut={() => setHov(false)}>
      {/* Date */}
      <div
        style={{
          fontFamily: 'var(--font-secondary)',
          fontSize: 9,
          fontWeight: 600,
          color: active ? 'var(--fg)' : 'var(--muted-foreground)',
          marginBottom: 5,
          letterSpacing: '0.06em',
          fontFeatureSettings: "'tnum','zero'",
          transition: 'color 0.12s'
        }}>
        {fmtDate(ev.date)}
      </div>

      {/* Marker */}
      <div
        style={{
          width: 11,
          height: 11,
          borderRadius: '50%',
          zIndex: 2,
          flexShrink: 0,
          background: isExpanded ? color : hov ? color : color + '44',
          border: `2px solid ${color}`,
          boxShadow: isExpanded ? `0 0 0 4px ${color}22` : hov ? `0 0 0 3px ${color}18` : 'none',
          transform: isExpanded ? 'scale(1.5)' : hov ? 'scale(1.25)' : 'scale(1)',
          transition: 'all 0.15s cubic-bezier(.22,1,.36,1)'
        }}
      />

      {/* Stem */}
      <div style={{ width: 1, height: 8, background: isExpanded ? color : color + '30', transition: 'background-color 0.15s' }} />

      {/* Card — chip rests on lighter surface, hover boundary turns green */}
      <div
        style={{
          width: 'calc(100% - 10px)',
          padding: '9px 11px',
          background: isExpanded ? `${color}12` : 'var(--btn-rest)',
          border: `1px solid ${isExpanded ? color + '70' : hov ? 'var(--accent)' : 'var(--btn-border)'}`,
          borderRadius: 7,
          transition: 'background-color 0.15s var(--ease-fast), border-color 0.15s var(--ease-fast), box-shadow 0.15s var(--ease-fast)',
          boxShadow: active ? `0 2px 8px ${color}14` : 'none'
        }}>
        {/* Primary: label */}
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: isExpanded ? color : 'var(--fg)', lineHeight: 1.3, marginBottom: 3 }}>{ev.label}</div>
        {/* Secondary: owner */}
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: ev.price || ev.amt ? 5 : 0 }}>
          {ev.owner.split(' ').slice(0, 3).join(' ')}
        </div>
        {/* Tertiary: amount */}
        {ev.price && <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 13, fontWeight: 700, color: isExpanded ? color : 'var(--fg)', fontFeatureSettings: "'tnum','zero'", letterSpacing: '-0.01em' }}>{fmtMoney(ev.price)}</div>}
        {ev.amt && !ev.price && <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 12, fontWeight: 700, color: ev.type === 'lien' ? 'var(--destructive)' : isExpanded ? color : 'var(--fg)', fontFeatureSettings: "'tnum','zero'" }}>{fmtMoney(ev.amt)}</div>}
        {ev.lender && <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 9, color: 'var(--muted-foreground)', marginTop: 2 }}>{ev.lender}</div>}
      </div>
    </div>
  );
}

function TimelineLane({ lane, events }) {
  const [expanded, setExpanded] = useState(null);
  const { label, color } = lane;
  const Icon = lane.Icon;
  const n = events.length;
  const toggle = (i) => setExpanded(expanded === i ? null : i);
  const leftPct = n > 0 ? 50 / n : 50;
  const rightPct = n > 0 ? 50 / n : 50;

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Lane header — 2px bottom accent rule + stronger visual weight */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '11px 20px 10px',
          background: 'var(--secondary)',
          borderBottom: `2px solid ${color}30`
        }}>
        <Icon size={13} color={color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        {n > 0 && (
          <>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border-strong)', display: 'block', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 11, color: 'var(--muted-foreground)', fontFeatureSettings: "'tnum','zero'" }}>
              {n} event{n > 1 ? 's' : ''} · {fmtDate(events[0].date)} – {fmtDate(events[n - 1].date)}
            </span>
          </>
        )}
        {expanded !== null && (
          <button
            aria-label="Close event detail"
            onClick={() => setExpanded(null)}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-ui)',
              fontSize: 10,
              color: 'var(--muted-foreground)',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 4,
              cursor: 'pointer',
              padding: '2px 8px',
              transition: 'background-color 0.12s, border-color 0.12s, color 0.12s'
            }}>
            <X size={10} /> Close
          </button>
        )}
      </div>

      {/* Lane body */}
      <div
        style={{
          padding: '16px 20px 12px',
          overflowX: 'auto',
          background: 'var(--card)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent'
        }}>
        {n === 0 ? (
          <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 11, color: 'var(--muted-foreground)', padding: '4px 0', fontStyle: 'italic' }}>No events</div>
        ) : (
          <div style={{ minWidth: n * 148 }}>
            {/* Rail */}
            <div style={{ position: 'relative', height: 16, marginBottom: 2 }}>
              <div style={{ position: 'absolute', top: '50%', left: `${leftPct}%`, right: `${rightPct}%`, height: 2, marginTop: -1, background: `linear-gradient(90deg,${color}40,${color}90,${color}40)`, borderRadius: 2 }} />
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n},1fr)`, height: '100%' }}>
                {events.map((_, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: 2, height: 6, background: `${color}50`, borderRadius: 1 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Events */}
            <div style={{ display: 'flex' }}>
              {events.map((ev, i) => (
                <EventCell key={i} ev={ev} color={color} isExpanded={expanded === i} onClick={() => toggle(i)} />
              ))}
            </div>

            {/* Expanded detail */}
            {expanded !== null && events[expanded] && <ExpandedDetail ev={events[expanded]} color={color} onClose={() => setExpanded(null)} />}
          </div>
        )}
      </div>
    </div>
  );
}

export function DealTimeline({ deal }) {
  const events = buildTimelineEvents(deal);
  const hasMinimalEvents = events.length < 2;

  return (
    <section style={{ margin: '0 24px', marginTop: 14 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>Chain of Title</span>
          {!hasMinimalEvents && (
            <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 10, color: 'var(--muted-foreground)', fontFeatureSettings: "'tnum','zero'" }}>
              {events.length} recorded events · {fmtDate(events[0].date)} – present
            </span>
          )}
          {!hasMinimalEvents && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
              {LANES.map((l) => {
                const cnt = events.filter((ev) => l.types.includes(ev.type)).length;
                if (!cnt) return null;
                const Icon = l.Icon;
                return (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon size={11} color={l.color} strokeWidth={2} />
                    <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 10, color: 'var(--muted-foreground)', fontFeatureSettings: "'tnum','zero'" }}>{cnt}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lanes */}
        {hasMinimalEvents ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
            <div style={{ marginBottom: 8, opacity: 0.6, display: 'flex', justifyContent: 'center' }}>
              <Database size={28} />
            </div>
            <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>Title history coming soon</div>
            <div>Chain of title requires multi-year records enrichment. {events.length === 1 ? 'One event on record.' : 'No events on record.'}</div>
          </div>
        ) : (
          <>
            {LANES.map((lane) => {
              const laneEvents = events.filter((ev) => lane.types.includes(ev.type));
              return <TimelineLane key={lane.id} lane={lane} events={laneEvents} />;
            })}
          </>
        )}
      </div>
    </section>
  );
}
