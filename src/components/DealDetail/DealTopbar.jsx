import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Share2,
  Bookmark,
  Flame,
  MoreHorizontal,
  Sun,
  Moon,
  Copy,
  MapPin,
  Download,
  ExternalLink,
  Hash,
  Check,
} from 'lucide-react';
import { useDeals } from '../../contexts/DealsContext';
import { fmt } from '../../lib/format';

export function DealTopbar({
  deal,
  deals = [],
  dealIndex = 0,
  onClose,
  onNavigateDeal,
}) {
  const { postFeedback, toggleSave } = useDeals();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const moreRef = useRef(null);

  const isDark = theme === 'dark' || !theme;
  const hasMultipleDeals = deals.length > 1;

  // Close More menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close More menu on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowMore(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Watch for external theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Handle theme toggle
  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('nightdrop-theme', newTheme);
  };

  // Handle hot toggle
  const toggleHot = () => {
    const newFeedback = deal.feedback === 'hot' ? null : 'hot';
    postFeedback(deal.id, newFeedback);
  };

  // Handle prev/next in counter
  const handlePrevCounter = () => {
    if (dealIndex > 0 && onNavigateDeal && deals[dealIndex - 1]) {
      onNavigateDeal(deals[dealIndex - 1]);
    }
  };

  const handleNextCounter = () => {
    if (dealIndex < deals.length - 1 && onNavigateDeal && deals[dealIndex + 1]) {
      onNavigateDeal(deals[dealIndex + 1]);
    }
  };

  // Handle prev/next in nav group
  const handlePrevNav = () => {
    handlePrevCounter();
  };

  const handleNextNav = () => {
    handleNextCounter();
  };

  // Share link: silent copy with 1.5s visual confirmation.
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      // Clipboard write can reject in non-secure contexts; fail silent.
    }
  };

  const status = deal.status || 'Underwriting';
  const isDealHot = deal.feedback === 'hot';

  return (
    <header className="deal-topbar">
      {/* Back — green hyperlink anchor */}
      <button className="tb-back" onClick={onClose} aria-label="Back to deals">
        <ArrowLeft size={13} />
        Deals
      </button>

      {/* Deal counter (only if multiple deals) */}
      {hasMultipleDeals && (
        <>
          <div className="tb-counter">
            <button
              className="tb-nav-btn"
              onClick={handlePrevCounter}
              disabled={dealIndex === 0}
              aria-label="Previous deal"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="tb-count-label">
              {dealIndex + 1} / {deals.length}
            </span>
            <button
              className="tb-nav-btn"
              onClick={handleNextCounter}
              disabled={dealIndex === deals.length - 1}
              aria-label="Next deal"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="tb-divider" />
        </>
      )}

      {/* Address block */}
      <div className="tb-address-block">
        <span className="tb-address">{fmt(deal.address)}</span>
        <span className="tb-city">
          {fmt(deal.city)}, {fmt(deal.state)} {fmt(deal.zip)}
        </span>
        <span className="tb-deal-id">{fmt(deal.id)}</span>
      </div>

      <div className="tb-divider" />

      {/* Stage */}
      <div className="tb-stage">
        <span className="tb-stage-dot" />
        {fmt(status)}
      </div>

      {/* Actions */}
      <div className="tb-actions">
        {/* Share button — silent copy with 1.5s confirmation */}
        <button
          className="tb-btn"
          onClick={handleShare}
          aria-label={shareCopied ? 'Link copied to clipboard' : 'Share deal'}
        >
          {shareCopied ? <Check size={13} /> : <Share2 size={13} />}
          {shareCopied ? 'Copied!' : 'Share'}
        </button>

        {/* List button */}
        <button
          className="tb-btn"
          onClick={() => toggleSave(deal.id)}
          aria-label={deal.saved ? 'Remove from list' : 'Add to list'}
          style={deal.saved ? { color: 'var(--accent)' } : {}}
        >
          <Bookmark size={13} style={deal.saved ? { fill: 'var(--accent)' } : {}} />
          List
        </button>

        {/* Separator */}
        <div
          style={{
            width: 1,
            height: 18,
            background: 'var(--border)',
            margin: '0 3px',
            flexShrink: 0,
          }}
        />

        {/* Mark Hot toggle */}
        <button
          className={`tb-btn${isDealHot ? ' primary' : ''}`}
          onClick={toggleHot}
          aria-label={isDealHot ? 'Deal marked as hot' : 'Mark deal as hot'}
        >
          <Flame size={13} />
          {isDealHot ? 'Hot' : 'Mark Hot'}
        </button>

        {/* More button */}
        <div style={{ position: 'relative' }} ref={moreRef}>
          <button
            className="tb-btn-icon"
            onClick={() => setShowMore(!showMore)}
            aria-label="More options"
          >
            <MoreHorizontal size={14} />
          </button>
          {showMore && (
            <div className="tb-more-menu">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(deal.id);
                  setShowMore(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg)', cursor: 'pointer', textAlign: 'left', transition: 'background-color var(--t-fast) var(--ease-fast)' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--secondary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Hash size={13} /> Copy Deal ID
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${fmt(deal.address)}, ${fmt(deal.city)}, ${fmt(deal.state)} ${fmt(deal.zip)}`);
                  setShowMore(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg)', cursor: 'pointer', textAlign: 'left', transition: 'background-color var(--t-fast) var(--ease-fast)' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--secondary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Copy size={13} /> Copy Address
              </button>
              <button
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setShowMore(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg)', cursor: 'pointer', textAlign: 'left', transition: 'background-color var(--t-fast) var(--ease-fast)' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--secondary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <ExternalLink size={13} /> Open in New Tab
              </button>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(deal, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'deal.json';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  setShowMore(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg)', cursor: 'pointer', textAlign: 'left', transition: 'background-color var(--t-fast) var(--ease-fast)' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--secondary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Download size={13} /> Export as JSON
              </button>
              <button
                onClick={() => {
                  navigate('/map', { state: { focusDealId: deal.id } });
                  setShowMore(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg)', cursor: 'pointer', textAlign: 'left', transition: 'background-color var(--t-fast) var(--ease-fast)' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--secondary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <MapPin size={13} /> View on Map
              </button>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          className="tb-btn-icon"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Deal prev/next nav (only if multiple deals) — text-only, no decorative chevrons */}
        {hasMultipleDeals && (
          <div className="tb-deal-nav">
            <button
              className="tb-deal-nav-btn"
              onClick={handlePrevNav}
              disabled={dealIndex === 0}
              aria-label="Previous deal"
            >
              Prev
            </button>
            <button
              className="tb-deal-nav-btn"
              onClick={handleNextNav}
              disabled={dealIndex === deals.length - 1}
              aria-label="Next deal"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
