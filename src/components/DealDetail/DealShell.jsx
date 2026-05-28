import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { fmt } from '../../lib/format';
import { DealTopbar } from './DealTopbar';
import { DealHero } from './DealHero';
import { DealNarrative } from './DealNarrative';
import { DealIntel } from './DealIntel';
import { DealTimeline } from './DealTimeline';
import { DealOwnerGraph } from './DealOwnerGraph';
import { DealCalculator } from './DealCalculator';
import { DealActivityRail } from './DealActivityRail';
import './deal-shell.css';

export function DealShell({
  deal,
  onClose,
  deals = [],
  dealIndex = 0,
  onNavigateDeal,
  embedded = false,
}) {
  // Pipeline bar visibility — kept on in production; V1's tweaks panel
  // (which used to toggle this) is dropped here.
  const showPipeline = true;

  // Keyboard navigation: J/K/←/→ only in non-embedded mode
  useEffect(() => {
    if (embedded || !deals || deals.length < 2) return;

    const handleKeydown = (e) => {
      // Skip if focus is on input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const currentDeal = deals[dealIndex];
      if (!currentDeal) return;

      if (e.key === 'j' || e.key === 'ArrowRight') {
        if (dealIndex < deals.length - 1 && onNavigateDeal) {
          onNavigateDeal(deals[dealIndex + 1]);
        }
      }
      if (e.key === 'k' || e.key === 'ArrowLeft') {
        if (dealIndex > 0 && onNavigateDeal) {
          onNavigateDeal(deals[dealIndex - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [deals, dealIndex, embedded, onNavigateDeal]);

  // Safety check
  if (!deal) {
    return null;
  }

  const status = deal.status || 'Underwriting';
  const nextStep = deal.brief_json?.next_step || 'Review and underwrite';
  const tags = deal.brief_json?.tags || [];

  return (
    <div
      className={`deal-shell${embedded ? ' deal-shell--embedded' : ''}`}
    >
      {/* Topbar (hidden in embedded mode by CSS) */}
      {!embedded && (
        <DealTopbar
          deal={deal}
          deals={deals}
          dealIndex={dealIndex}
          onClose={onClose}
          onNavigateDeal={onNavigateDeal}
        />
      )}

      {/* Body: 2-column grid (main / rail) */}
      <div
        className="deal-body"
        style={{
          gridTemplateColumns: '1fr 300px',
        }}
      >
        {/* Main content area */}
        <main className="deal-main">
          {/* Pipeline bar (only in non-embedded mode) */}
          {!embedded && showPipeline && (
            <div className="pipeline-bar" style={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
              <AlertCircle
                size={13}
                color="var(--warning)"
                strokeWidth={2}
                style={{ flexShrink: 0 }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--warning)',
                  flexShrink: 0,
                }}
              >
                {fmt(status)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  color: 'var(--border-strong)',
                  flexShrink: 0,
                }}
              >
                ·
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  color: 'var(--muted-foreground)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                Next:{' '}
                <strong
                  style={{
                    color: 'var(--fg)',
                    fontWeight: 600,
                  }}
                >
                  {fmt(nextStep)}
                </strong>
              </span>
              <div
                style={{
                  display: 'flex',
                  gap: 5,
                  alignItems: 'center',
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: 10,
                      fontWeight: 600,
                      color: tag.color || 'var(--warning)',
                      background: 'var(--warn-tint)',
                      borderRadius: 4,
                      padding: '2px 7px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fmt(tag.label)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hero section */}
          <DealHero deal={deal} />
          <div style={{ height: 14 }} />

          {/* Narrative section */}
          <DealNarrative deal={deal} />
          <div style={{ height: 14 }} />

          {/* Intel section */}
          <DealIntel deal={deal} />
          <div style={{ height: 14 }} />

          {/* Timeline section */}
          <DealTimeline deal={deal} />
          <div style={{ height: 14 }} />

          {/* Owner Portfolio Graph section */}
          <DealOwnerGraph deal={deal} />
          <div style={{ height: 14 }} />

          {/* Calculator section */}
          <DealCalculator deal={deal} />

          {/* Bottom spacing */}
          <div style={{ height: 56 }} />
        </main>

        {/* Activity rail */}
        <aside className="deal-rail">
          <DealActivityRail deal={deal} />
        </aside>
      </div>
    </div>
  );
}
