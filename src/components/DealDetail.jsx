import { useState, useEffect } from 'react';
import { StageIndicator } from './DealDetail/StageIndicator.jsx';
import { BreadcrumbStrip } from './DealDetail/BreadcrumbStrip.jsx';
import { IdentityColumn } from './DealDetail/IdentityColumn.jsx';
import { WhyFlaggedCard } from './DealDetail/WhyFlaggedCard.jsx';
import { PipelineStatusCard } from './DealDetail/PipelineStatusCard.jsx';
import { NarrativeSection } from './DealDetail/NarrativeSection.jsx';
import { RecommendedAction } from './DealDetail/RecommendedAction.jsx';
import { PropertyIntelligenceCard } from './DealDetail/PropertyIntelligenceCard.jsx';
import { DistressSignalsCard } from './DealDetail/DistressSignalsCard.jsx';
import { OwnershipHistoryCard } from './DealDetail/OwnershipHistoryCard.jsx';
import { OwnerPortfolioCard } from './DealDetail/OwnerPortfolioCard.jsx';
import { useDeals } from '../contexts/DealsContext.jsx';
import { useReadState } from '../contexts/ReadStateContext';
import { useToast } from '../contexts/ToastContext';
import '../styles/deal-detail.css';

export function DealDetail({ deal, onClose, deals, dealIndex, onNavigateDeal }) {
  const { postFeedback, toggleSaved, updateStatus } = useDeals();
  const { markRead } = useReadState();
  const addToast = useToast();
  const [hotLoading, setHotLoading] = useState(false);

  useEffect(() => { markRead(deal.id); }, [deal.id, markRead]);

  const bj = deal.briefJson || deal.brief_json || {};
  const attomId = deal.attomId || deal.attom_id;
  const currentStatus = deal.status || 'new';
  const signals = bj.signal_tags || bj.distress_signals || deal.signals || [];

  async function handleMarkHot() {
    setHotLoading(true);
    try { await postFeedback(deal.id, deal.feedback === 'hot' ? null : 'hot'); }
    finally { setHotLoading(false); }
  }

  async function handleStatusChange(newStatus) {
    await updateStatus(deal.id, newStatus);
    addToast('Stage updated', 'success');
  }

  async function handleShare() {
    const url = `${window.location.origin}/deal/${deal.id}`;
    try {
      await navigator.clipboard.writeText(url);
      addToast('Link copied — recipient must be a Nightdrop subscriber.', 'success');
    } catch {
      addToast('Could not copy link', 'error');
    }
  }

  async function handleToggleSaved() {
    const next = !deal.saved;
    await toggleSaved(deal.id, next);
    addToast(next ? 'Added to your list' : 'Removed from your list', next ? 'success' : 'info');
  }

  async function handleToggleNotRelevant() {
    const isUndo = deal.feedback === 'not_relevant';
    await postFeedback(deal.id, isUndo ? null : 'not_relevant');
    addToast(
      isUndo ? 'Marked relevant again' : 'Marked as not relevant',
      isUndo ? 'info' : 'success'
    );
    if (!isUndo && onClose) onClose();
  }

  return (
    <div className="dd-root">
      <BreadcrumbStrip
        onBack={onClose}
        dealIndex={dealIndex ?? -1}
        totalDeals={deals?.length ?? 0}
        onPrev={() => onNavigateDeal && onNavigateDeal(deals[dealIndex - 1])}
        onNext={() => onNavigateDeal && onNavigateDeal(deals[dealIndex + 1])}
        onShare={handleShare}
        saved={!!deal.saved}
        onToggleSaved={handleToggleSaved}
        isHot={deal.feedback === 'hot'}
        onToggleHot={handleMarkHot}
        hotLoading={hotLoading}
        isNotRelevant={deal.feedback === 'not_relevant'}
        onToggleNotRelevant={handleToggleNotRelevant}
        onCopyLink={handleShare}
      />

      <StageIndicator status={currentStatus} onStageChange={handleStatusChange} />

      <div className="dd-upper-grid">
        <IdentityColumn deal={deal} />
        <WhyFlaggedCard deal={deal} signals={signals} />
        <PipelineStatusCard deal={deal} />
      </div>

      <div className="dd-narrative-wrap">
        <NarrativeSection deal={deal} />
        <RecommendedAction deal={deal} />
      </div>

      <div className="dd-data-grid">
        <div className="dd-panel-row">
          <PropertyIntelligenceCard deal={deal} />
          <DistressSignalsCard deal={deal} signals={signals} />
          <OwnershipHistoryCard deal={deal} />
        </div>
        {attomId && <OwnerPortfolioCard deal={deal} />}
      </div>
    </div>
  );
}
