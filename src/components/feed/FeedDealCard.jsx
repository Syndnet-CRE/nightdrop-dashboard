import { useState, useEffect, useRef, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Star, Download, Link2, EyeOff, Flag, MessageCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ScoreBadge from '../ScoreBadge';
import OverflowMenu from '../OverflowMenu';
import DealChatThread from './DealChatThread';
import { anchorMetric } from '../../lib/anchorMetric';
import { api } from '../../lib/api';
import { useDeals } from '../../contexts/DealsContext.jsx';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

function fmtTimestamp(sentAt) {
  if (!sentAt) return '';
  const d = new Date(sentAt);
  const now = new Date();
  const diffMs = now - d;
  const diffH = diffMs / 3600000;
  const diffDays = diffMs / 86400000;
  if (diffH < 1) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  if (diffDays < 2) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function normalizeAssetClass(raw) {
  const s = (raw || '').toLowerCase();
  if (!s) return '';
  if (s.includes('self storage') || s.includes('mini-warehouse') || s.includes('mini warehouse')) return 'self_storage';
  if (s.includes('mobile') || s.includes('manufactured home') || s.includes('rv park')) return 'mobile_home_rv';
  if (s.includes('multifamily') || s.includes('duplex') || s.includes('triplex') || s.includes('quadruplex') || s.includes('apartment') || s.includes('residential income') || s.includes('loft')) return 'multifamily';
  if (s.includes('single family') || s.includes('condominium') || s.includes('townhouse') || s.includes('cabin') || s.includes('cottage') || s.includes('zero lot') || s === 'sfr' || s === 'residential_sfr') return 'residential_sfr';
  if (s.includes('vacant land') || s.includes('agricultural') || s.includes('ranch') || s.includes('cropland') || s.includes('pastureland') || s.includes('timberland') || s === 'land') return 'land';
  if (s.includes('industrial') || s.includes('warehouse') || s.includes('manufacturing') || s.includes('flex') || s.includes('truck terminal')) return 'industrial';
  if (s.includes('gas station') || s.includes('service station')) return 'gas_station_c_store';
  if (s.includes('retail') || s.includes('shopping') || s.includes('storefront') || s.includes('restaurant') || s.includes('grocery') || s.includes('strip mall') || s.includes('drugstore') || s.includes('pharmacy') || s.includes('laundromat') || s.includes('car wash') || s.includes('auto dealership') || s.includes('auto repair') || s.includes('convenience store') || s.includes('fast food') || s.includes('qsr')) return 'retail';
  if (s.includes('office') || s.includes('mixed-use commercial') || s.includes('professional office') || s.includes('medical office')) return 'office';
  if (s.includes('bank') || s.includes('parking') || s.includes('bowling') || s.includes('theater') || s.includes('funeral') || s.includes('rehabilitation') || s.includes('skilled nursing') || s.includes('healthcare') || s.includes('medical clinic') || s.includes('day care') || s.includes('child care') || s.includes('special purpose')) return 'special_purpose';
  return s.replace(/\s+/g, '_');
}

const ASSET_CLASS_LABEL = {
  self_storage: 'Self Storage',
  multifamily: 'Multifamily',
  mobile_home_rv: 'Mobile Home / RV',
  residential_sfr: 'SFR',
  land: 'Land',
  industrial: 'Industrial',
  retail: 'Retail',
  gas_station_c_store: 'Gas Station',
  office: 'Office',
  special_purpose: 'Special Purpose',
};

function humanizeOwnerType(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  if (!t) return null;
  if (t.toLowerCase().includes('llc')) return 'LLC';
  if (t.toLowerCase().includes('trust')) return 'Trust';
  if (t.toLowerCase().includes('corp') || t.toLowerCase().includes('inc')) return 'Corporate';
  if (t.toLowerCase() === 'individual') return 'Individual';
  return t.length > 14 ? `${t.slice(0, 12)}…` : t;
}

function signalColor(sig) {
  const raw = typeof sig === 'string' ? sig : (sig.type || sig.category || sig.label || '');
  const t = raw.toLowerCase();
  if (t.includes('tax') || t.includes('lien') || t.includes('delinq') || t.includes('forecl')) return 'red';
  if (t.includes('vacan') || t.includes('code') || t.includes('rising') || t.includes('absentee')) return 'amber';
  return 'green';
}

function signalLabel(s) {
  if (typeof s === 'string') return s.trim() || null;
  if (!s || typeof s !== 'object') return null;
  const v = s.tag || s.label || s.description || s.type;
  return (typeof v === 'string' && v.trim()) ? v : null;
}

export default function FeedDealCard({ deal, onHide, isRead: isReadProp, onNavigateAway }) {
  const navigate = useNavigate();
  const { postFeedback } = useDeals();
  const [isRead, setIsRead] = useState(deal.is_read || isReadProp || false);
  const [saved, setSaved] = useState(deal.saved || false);
  const [hidden, setHidden] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notRelevantUndo, setNotRelevantUndo] = useState(deal.feedback === 'not_relevant');
  const cardRef = useRef(null);
  const readTimerRef = useRef(null);
  const hasTracked = useRef(isRead);

  const fb = deal.feedback || null;

  const markRead = useCallback(async () => {
    if (hasTracked.current) return;
    hasTracked.current = true;
    setIsRead(true);
    try {
      await api.patch(`/api/dealfeed/deals/${deal.id}/read`, {});
    } catch { /* silent — read tracking is best-effort */ }
  }, [deal.id]);

  useEffect(() => {
    if (hasTracked.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          readTimerRef.current = setTimeout(markRead, 2000);
        } else {
          clearTimeout(readTimerRef.current);
        }
      },
      { threshold: 0.5 }
    );
    if (cardRef.current) obs.observe(cardRef.current);
    return () => { obs.disconnect(); clearTimeout(readTimerRef.current); };
  }, [markRead]);

  async function handleFeedback(val) {
    const next = fb === val ? null : val;
    if (next === 'not_relevant') setNotRelevantUndo(true);
    await postFeedback(deal.id, next);
  }

  async function handleSave() {
    setSaved(s => !s);
    try {
      await api.patch(`/api/dealfeed/deals/${deal.id}/save`, {});
    } catch { setSaved(s => !s); }
  }

  function handleHide() {
    setHidden(true);
    onHide?.(deal.id);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/deal/${deal.id}`);
  }

  function openDetail() {
    onNavigateAway?.();
    navigate(`/deal/${deal.id}`);
  }

  const overflowItems = [
    { label: 'Save Deal',    icon: <Star size={14} />,     onClick: handleSave },
    { label: 'Export PDF',   icon: <Download size={14} />, disabled: true, disabledTip: 'Coming soon — deal export' },
    { label: 'Share Link',   icon: <Link2 size={14} />,    onClick: handleCopyLink },
    { label: 'Hide Deal',    icon: <EyeOff size={14} />,   onClick: handleHide },
    { label: 'Report Issue', icon: <Flag size={14} />,     onClick: () => api.post(`/api/dealfeed/deals/${deal.id}/feedback`, { feedback: 'flagged' }).catch(() => {}) },
  ];

  if (hidden) return null;

  const notRelevant = fb === 'not_relevant';
  const assetClassKey = normalizeAssetClass(deal.asset_class || deal.asset);
  const assetClassLabel = ASSET_CLASS_LABEL[assetClassKey] || (deal.asset_class || deal.asset || '');
  const metric = anchorMetric(deal, assetClassKey);
  const cityLine = deal.city || [deal.property_city, deal.property_state, deal.property_zip].filter(Boolean).join(', ');
  const ownerType = humanizeOwnerType(deal.owner_type);
  const bj = deal.briefJson || deal.brief_json || {};
  const rawSignals = bj.signal_tags || deal.signals || [];
  const resolvedSignals = rawSignals
    .map(s => ({ signal: s, label: signalLabel(s) }))
    .filter(x => x.label);
  const visibleSignals = resolvedSignals.slice(0, 3);
  const overflowCount = Math.max(0, resolvedSignals.length - 3);
  const headline = bj.headline || null;
  const score = deal.score || deal.match_score;

  const imageUrl = (MAPBOX_TOKEN && deal.lat && deal.lng)
    ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${deal.lng},${deal.lat},16/320x320@2x?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`
    : null;

  return (
    <article
      ref={cardRef}
      className={`feed-deal-card horizontal${!isRead ? ' unread' : ''}${notRelevant ? ' dimmed' : ''}`}
    >
      <div className="feed-deal-image-wrap" onClick={openDetail}>
        {imageUrl ? (
          <img
            className="feed-deal-image"
            src={imageUrl}
            alt={deal.addr || deal.address}
            loading="lazy"
            onError={e => {
              e.target.style.display = 'none';
              const fb = e.target.nextElementSibling;
              if (fb) fb.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="feed-deal-image-fallback"
          style={{ display: imageUrl ? 'none' : 'flex' }}
        >
          <span className="feed-deal-image-placeholder">{assetClassLabel || 'Property'}</span>
        </div>
      </div>

      <div className="feed-deal-content">
        <div className="feed-deal-header">
          <div className="feed-deal-header-text">
            <div className="feed-deal-address">{deal.addr || deal.address}</div>
            <div className="feed-deal-meta">
              <span>{cityLine}</span>
              {assetClassLabel && <span className="feed-deal-meta-dot">·</span>}
              {assetClassLabel && <span>{assetClassLabel}</span>}
              {deal.sentAt && <span className="feed-deal-meta-dot">·</span>}
              {deal.sentAt && <span>{fmtTimestamp(deal.sentAt)}</span>}
            </div>
          </div>
          <div className="feed-deal-header-right">
            {score != null && <ScoreBadge score={score} className="feed-deal-score-inline" />}
            <OverflowMenu items={overflowItems} className="feed-deal-overflow" />
          </div>
        </div>

        <div className="feed-deal-anchor">
          <span className="feed-deal-anchor-primary">{metric.primary}</span>
          {metric.secondary && (
            <>
              <span className="feed-deal-anchor-dot">·</span>
              <span className="feed-deal-anchor-secondary">{metric.secondary}</span>
            </>
          )}
        </div>

        {(ownerType || visibleSignals.length > 0) && (
          <div className="feed-deal-pills">
            {ownerType && <span className="feed-deal-owner-pill">{ownerType}</span>}
            {visibleSignals.map(({ signal, label }, i) => (
              <span key={i} className={`feed-deal-signal-pill ${signalColor(signal)}`}>{label}</span>
            ))}
            {overflowCount > 0 && (
              <button
                type="button"
                className="feed-deal-signal-pill more"
                onClick={openDetail}
                title="See all signals"
              >
                +{overflowCount}
              </button>
            )}
          </div>
        )}

        {headline && (
          <p className="feed-deal-headline">{headline}</p>
        )}

        {notRelevant && notRelevantUndo ? (
          <div className="feed-deal-not-relevant">
            <span>Not Relevant</span>
            <button className="link-btn" onClick={() => { handleFeedback('not_relevant'); setNotRelevantUndo(false); }}>Undo</button>
            <span className="muted" style={{ fontSize: 12 }}>Got it. This shapes tonight&apos;s run.</span>
          </div>
        ) : (
          <div className="feed-deal-actions">
            <div className="feed-deal-reactions">
              <button
                className={`feed-deal-reaction-btn ${fb === 'hot' ? 'active-hot' : ''}`}
                onClick={() => handleFeedback('hot')}
                title="Hot deal"
              >
                <ThumbsUp size={16} />
              </button>
              <button
                className={`feed-deal-reaction-btn ${fb === 'not_relevant' ? 'active-cold' : ''}`}
                onClick={() => handleFeedback('not_relevant')}
                title="Not relevant"
              >
                <ThumbsDown size={16} />
              </button>
              <button
                className={`feed-deal-reaction-btn ${chatOpen ? 'active-chat' : ''}`}
                onClick={() => setChatOpen(o => !o)}
                title="Discuss this deal"
              >
                <MessageCircle size={16} />
              </button>
              <button
                className={`feed-deal-reaction-btn ${saved ? 'active-saved' : ''}`}
                onClick={handleSave}
                title={saved ? 'Saved' : 'Save deal'}
              >
                <Star size={16} fill={saved ? 'currentColor' : 'none'} />
              </button>
            </div>
            {(deal.box || deal.buy_box_name) && (
              <span className="feed-deal-box-pill">Box: {deal.box || deal.buy_box_name}</span>
            )}
            <button
              className="feed-deal-detail-btn"
              onClick={openDetail}
            >
              View Details <ArrowRight size={14} />
            </button>
          </div>
        )}

        {chatOpen && (
          <DealChatThread
            dealId={deal.id}
            dealAddress={deal.addr || deal.address || ''}
            autoFocus
          />
        )}
      </div>
    </article>
  );
}
