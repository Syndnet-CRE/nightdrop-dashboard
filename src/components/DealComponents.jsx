import { useState } from 'react';
import { AerialThumb } from './AerialThumb';
import { I } from './Icons';
import { fmtMoney, scoreClass, agingColor } from '../lib/format';
import { useReadState } from '../contexts/ReadStateContext';
import { useDealState } from '../contexts/DealStateContext';

function getAssetChipStyle(asset) {
  const dark = (document.documentElement.dataset.theme || 'dark') !== 'light';
  const a = (asset || '').toLowerCase();
  if (a.includes('storage'))
    return { background: dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.10)', color: dark ? '#F59E0B' : '#B45309', borderColor: dark ? 'rgba(245,158,11,0.3)' : 'rgba(180,83,9,0.3)', accent: '#F59E0B' };
  if (a.includes('industrial') || a.includes('flex') || a.includes('warehouse'))
    return { background: dark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.10)', color: dark ? '#60A5FA' : '#1D4ED8', borderColor: dark ? 'rgba(59,130,246,0.3)' : 'rgba(37,99,235,0.3)', accent: '#3B82F6' };
  if (a.includes('multifamily'))
    return { background: dark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.10)', color: dark ? '#A78BFA' : '#6D28D9', borderColor: dark ? 'rgba(139,92,246,0.3)' : 'rgba(109,40,217,0.3)', accent: '#8B5CF6' };
  if (a.includes('land'))
    return { background: dark ? 'rgba(91,204,72,0.15)' : 'rgba(29,175,41,0.10)', color: dark ? '#5BCC48' : '#1B7A2A', borderColor: dark ? 'rgba(91,204,72,0.3)' : 'rgba(29,175,41,0.3)', accent: '#1DAF29' };
  if (a.includes('retail'))
    return { background: dark ? 'rgba(249,115,22,0.15)' : 'rgba(234,88,12,0.10)', color: dark ? '#FB923C' : '#C2410C', borderColor: dark ? 'rgba(249,115,22,0.3)' : 'rgba(234,88,12,0.3)', accent: '#F97316' };
  if (a.includes('mixed'))
    return { background: dark ? 'rgba(20,184,166,0.15)' : 'rgba(15,118,110,0.10)', color: dark ? '#2DD4BF' : '#0F766E', borderColor: dark ? 'rgba(20,184,166,0.3)' : 'rgba(15,118,110,0.3)', accent: '#14B8A6' };
  return { background: dark ? 'rgba(100,100,120,0.15)' : 'rgba(100,100,120,0.08)', color: dark ? '#9DA2B3' : '#6E7180', borderColor: dark ? 'rgba(100,100,120,0.3)' : 'rgba(110,113,128,0.3)', accent: '#9DA2B3' };
}

export function ScoreRing({ score }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const size = 44;
  const r = 17;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  const sc = scoreClass(score);
  const fillColor = sc === 'hi' ? '#1DAF29' : sc === 'md' ? '#F4B73E' : '#E5484D';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(229,72,77,0.22)" strokeWidth="3"/>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={fillColor}
        strokeWidth="3"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="butt"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontFamily="Manrope" fontSize="9" fontWeight="800" fill={fillColor}>
        {pct}%
      </text>
    </svg>
  );
}

export function ScoreBubble({ score, size = "md" }) {
  return (
    <div className={`score-bubble ${scoreClass(score)}`} style={size === "sm" ? { width: 30, height: 30, fontSize: 12 } : size === "lg" ? { width: 56, height: 56, fontSize: 20, borderWidth: 2 } : null}>
      {score}
    </div>
  );
}

export function FactRow({ deal }) {
  return (
    <div className="deal-row">
      <span className="tag" style={getAssetChipStyle(deal.asset)}>{deal.asset}</span>
      <span className="fact"><span className="k">Lot</span> <span className="v">{deal.acres.toFixed(2)} ac</span></span>
      <span className="dot-sep">•</span>
      <span className="fact"><span className="k">Assessed</span> <span className="v">{fmtMoney(deal.value)}</span></span>
      <span className="dot-sep">•</span>
      <span className="fact"><span className="k">Box</span> <span className="v">{deal.box}</span></span>
    </div>
  );
}

const STATE_ACTIONS = [
  { state: 'active',    label: 'Move to Active Feed' },
  { state: 'loi',      label: 'Mark Under LOI' },
  { state: 'archived',  label: 'Move to Pipeline' },
  { state: 'dead',     label: 'Mark Dead' },
];

export function DealCard({ deal, onClick, selected }) {
  const { isRead } = useReadState();
  const { getDealState, setDealState } = useDealState();
  const [menuOpen, setMenuOpen] = useState(false);

  const dealState = getDealState(deal.id);
  const isDead = dealState === 'dead';
  const isLOI = dealState === 'loi';
  const isArchived = dealState === 'archived';
  const unread = !isRead(deal.id);
  const chipStyle = getAssetChipStyle(deal.asset);
  const signals = deal.signals || [];

  return (
    <div
      className={`deal-card${selected ? ' selected' : ''}${isDead ? ' deal-card-dead' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{ position: 'relative', '--dc-accent': chipStyle.accent }}
    >
      {unread && <span className="deal-unread-dot" aria-label="Unread"/>}

      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <div className="deal-addr" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {deal.addr}
              {deal.notes && <I.Doc size={11} style={{ marginLeft: 5, color: "var(--ink-4)", verticalAlign: "middle", flexShrink: 0 }} title="Has notes"/>}
            </div>
            <div className="deal-loc">{deal.city}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {isDead     && <span className="deal-state-badge danger">Dead</span>}
            {isLOI      && <span className="deal-state-badge amber">LOI</span>}
            {isArchived && <span className="deal-state-badge neutral">Pipeline</span>}
            <ScoreRing score={deal.score}/>
          </div>
        </div>
        <FactRow deal={deal}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 1 }}>
          {deal.days != null && (
            <span className="aging-chip" style={{ color: agingColor(deal.days) }}>
              {deal.days === 0 ? 'Today' : `${deal.days}d ago`}
            </span>
          )}
          {signals.length > 0 && (
            <span className="deal-signals">
              ⚠ {signals[0]}{signals.length > 1 && <span className="deal-signals-count"> +{signals.length - 1}</span>}
            </span>
          )}
        </div>
        <span className="deal-open-hint">Open Details →</span>
      </div>

      <div className="deal-thumb"><AerialThumb id={deal.id} lat={deal.lat} lng={deal.lng}/></div>

      <div className="deal-menu-wrap" onClick={e => e.stopPropagation()}>
        <button
          className="deal-menu-trigger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Deal actions"
          aria-expanded={menuOpen}
        >
          ···
        </button>
        {menuOpen && (
          <div className="deal-menu-dropdown">
            {STATE_ACTIONS.filter(a => a.state !== dealState).map(({ state, label }) => (
              <button
                key={state}
                className={`deal-menu-item${state === 'dead' ? ' danger' : ''}`}
                onClick={() => { setDealState(deal.id, state); setMenuOpen(false); }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MapPinSVG({ num, selected, tint }) {
  // tint (asset-class color) overrides the default green; selected always wins.
  const fill = selected ? '#F4B73E' : (tint || '#5BCC48');
  const stroke = "#06270A";
  return (
    <svg width="26" height="32" viewBox="0 0 26 32" style={{ filter: `drop-shadow(0 ${selected ? 4 : 2}px ${selected ? 8 : 4}px rgba(0,0,0,0.55))` }}>
      <path d="M13 0 C 5.8 0 0 5.5 0 12.5 C 0 22 13 32 13 32 S 26 22 26 12.5 C 26 5.5 20.2 0 13 0 Z"
        fill={fill} stroke={stroke} strokeWidth="1.5"/>
      <circle cx="13" cy="12" r="8" fill={stroke}/>
      <text x="13" y="12" textAnchor="middle" dominantBaseline="central" fontFamily="Manrope" fontSize="9" fontWeight="800" fill={fill}>{num != null ? num : ""}</text>
    </svg>
  );
}

export function MapPin({ deal, x, y, num, selected, onClick }) {
  return (
    <div className={`map-pin numbered ${selected ? "selected" : ""}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(deal); }}>
      <MapPinSVG score={deal.score} num={num} selected={selected} asset={deal.asset}/>
    </div>
  );
}

export function ClusterPin({ count, x, y }) {
  return (
    <div className="map-pin cluster" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
      <div className="pin-circle">{count}</div>
    </div>
  );
}
