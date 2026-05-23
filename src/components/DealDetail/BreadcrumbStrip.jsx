import { ArrowLeft, ChevronLeft, ChevronRight, Share2, Bookmark, Star } from 'lucide-react';
import { MoreMenu } from './MoreMenu.jsx';
import { ScoreScale } from './ScoreScale.jsx';

export function BreadcrumbStrip({
  onBack,
  dealIndex,
  totalDeals,
  onPrev,
  onNext,
  onShare,
  saved,
  onToggleSaved,
  isHot,
  onToggleHot,
  isNotRelevant,
  onToggleNotRelevant,
  onCopyLink,
  hotLoading,
  compactAddress,
  compactScore,
}) {
  const hasNav = totalDeals > 1 && dealIndex >= 0;
  const positionLabel = hasNav ? `Deal ${dealIndex + 1} of ${totalDeals}` : null;
  const canPrev = hasNav && dealIndex > 0;
  const canNext = hasNav && dealIndex < totalDeals - 1;

  const showCompact = !!compactAddress;

  return (
    <div className={`dd-breadcrumb${showCompact ? ' compact' : ''}`}>
      <div className="dd-breadcrumb-left">
        <button type="button" className="dd-breadcrumb-back" onClick={onBack}>
          <ArrowLeft size={14} strokeWidth={2.2} />
          <span>Back to Deals</span>
        </button>
        {hasNav && (
          <>
            <span className="dd-breadcrumb-divider" aria-hidden="true" />
            <button
              type="button"
              className="dd-breadcrumb-nav-btn"
              onClick={onPrev}
              disabled={!canPrev}
              aria-label="Previous deal"
            >
              <ChevronLeft size={16} strokeWidth={2.2} />
            </button>
            <span className="dd-breadcrumb-position">{positionLabel}</span>
            <button
              type="button"
              className="dd-breadcrumb-nav-btn"
              onClick={onNext}
              disabled={!canNext}
              aria-label="Next deal"
            >
              <ChevronRight size={16} strokeWidth={2.2} />
            </button>
          </>
        )}
      </div>

      {showCompact && (
        <div className="dd-breadcrumb-center" aria-live="polite">
          <span className="dd-breadcrumb-compact-address">{compactAddress}</span>
          {(compactScore != null && !Number.isNaN(Number(compactScore))) && (
            <ScoreScale score={compactScore} compact={true} />
          )}
        </div>
      )}

      <div className="dd-breadcrumb-right">
        <button
          type="button"
          className="dd-breadcrumb-action"
          onClick={onShare}
          title="Copy shareable link"
        >
          <Share2 size={14} strokeWidth={2.2} />
          <span>Share</span>
        </button>
        <button
          type="button"
          className={`dd-breadcrumb-action${saved ? ' active' : ''}`}
          onClick={onToggleSaved}
          title={saved ? 'Remove from your list' : 'Add to your list'}
        >
          <Bookmark size={14} strokeWidth={2.2} fill={saved ? 'currentColor' : 'none'} />
          <span>{saved ? 'Saved' : 'Add to List'}</span>
        </button>
        <button
          type="button"
          className={`dd-breadcrumb-action dd-breadcrumb-hot${isHot ? ' active' : ''}`}
          onClick={onToggleHot}
          disabled={hotLoading}
          title={isHot ? 'Unmark as Hot' : 'Mark as Hot'}
        >
          <Star size={14} strokeWidth={2.4} fill={isHot ? 'currentColor' : 'none'} />
          <span>{isHot ? 'Hot' : 'Mark as Hot'}</span>
        </button>
        <MoreMenu
          onNotRelevant={onToggleNotRelevant}
          isNotRelevant={isNotRelevant}
          onCopyLink={onCopyLink}
        />
      </div>
    </div>
  );
}
