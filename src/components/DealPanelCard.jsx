import { forwardRef } from 'react';
import { AerialThumb } from './AerialThumb';
import { ScoreBubble } from './DealComponents';
import { fmt, fmtMoney, hasVal } from '../lib/format';
import { I } from './Icons';

const SIGNAL_SEVERITY = {
  'Absentee Owner':     'hi',
  'Out-of-State Owner': 'md',
  'No Permits':         'md',
  'Entity Owner':       'lo',
  'Opp Zone':           'md',
};

function deliveryLabel(days) {
  if (days == null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days <= 7) return `${days} days ago`;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const DealPanelCard = forwardRef(function DealPanelCard(
  { deal, index, expanded, onExpand, onOpenDeal, selected, onSelect, onHover, onHoverEnd },
  ref
) {
  const signals = deal.signals || [];

  return (
    <div
      ref={ref}
      className={`dpc${expanded ? ' expanded' : ''}${selected ? ' selected' : ''}`}
      onMouseEnter={() => onHover?.(deal.id)}
      onMouseLeave={() => onHoverEnd?.()}
    >
      <div
        className="dpc-header"
        onClick={() => onExpand(expanded ? null : deal.id)}
      >
        <input
          type="checkbox"
          className="dpc-checkbox"
          checked={!!selected}
          onChange={() => {}}
          onClick={e => { e.stopPropagation(); onSelect(deal.id); }}
        />
        <div className="dpc-pin-badge">{index + 1}</div>
        <div className="dpc-thumb">
          <AerialThumb id={deal.id} lat={deal.lat} lng={deal.lng} />
        </div>
        <div className="dpc-info">
          <div className="dpc-addr1">{deal.addr || '—'}</div>
          <div className="dpc-addr2">{[deal.city, deal.zip].filter(Boolean).join(', ') || '—'}</div>
          <div className="dpc-meta-row">
            {hasVal(deal.asset) && <span className="tag green">{fmt(deal.asset)}</span>}
            {deal.acres != null && <span className="dpc-meta-item">{deal.acres.toFixed(1)} ac</span>}
            {hasVal(deal.value) && <span className="dpc-meta-item">{fmtMoney(deal.value)}</span>}
          </div>
        </div>
        <div className="dpc-right">
          <ScoreBubble score={deal.score} size="sm" />
          <div className="dpc-date">{deliveryLabel(deal.days)}</div>
          {deal.days != null && deal.days <= 1 && (
            <span className="pill green" style={{ fontSize: 9, padding: '1px 5px' }}>New</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="dpc-expanded">
          {signals.length > 0 && (
            <div className="dpc-signals">
              {signals.map((s, i) => {
                const label = typeof s === 'string'
                  ? s
                  : (s?.tag || s?.label || s?.description || s?.type);
                if (!label || typeof label !== 'string') return null;
                return (
                  <span key={i} className={`signal-pill ${SIGNAL_SEVERITY[label] || 'lo'}`}>{label}</span>
                );
              })}
            </div>
          )}

          <div className="dpc-facts">
            <div className="dpc-fact-cell">
              <div className="dpc-fact-label">Lot Size</div>
              <div className="dpc-fact-value">{deal.gisAcres != null ? `${deal.gisAcres.toFixed(2)} ac` : fmt(null)}</div>
            </div>
            <div className="dpc-fact-cell">
              <div className="dpc-fact-label">Property Use</div>
              <div className="dpc-fact-value">{fmt(deal.asset)}</div>
            </div>
            <div className="dpc-fact-cell">
              <div className="dpc-fact-label">Assessed Value</div>
              <div className="dpc-fact-value">{fmtMoney(deal.value)}</div>
            </div>
            <div className="dpc-fact-cell">
              <div className="dpc-fact-label">Owner Type</div>
              <div className="dpc-fact-value">{fmt(deal.entityType)}</div>
            </div>
            <div className="dpc-fact-cell">
              <div className="dpc-fact-label">Buy Box</div>
              <div className="dpc-fact-value">{fmt(deal.box)}</div>
            </div>
            <div className="dpc-fact-cell">
              <div className="dpc-fact-label">Days Old</div>
              <div className="dpc-fact-value">{deal.days != null ? deal.days : '—'}</div>
            </div>
          </div>

          {(hasVal(deal.owner) || hasVal(deal.mailing)) && (
            <div className="dpc-owner">
              {hasVal(deal.owner) && <div className="dpc-owner-name">{deal.owner}</div>}
              <div className="dpc-owner-sub">
                {fmt(deal.mailing)}
                {deal.absentee && <span className="dpc-owner-badge">Absentee</span>}
              </div>
            </div>
          )}

          <button
            className="btn primary"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => onOpenDeal(deal)}
          >
            Open Deal <I.Chevron size={12} />
          </button>
        </div>
      )}
    </div>
  );
});
