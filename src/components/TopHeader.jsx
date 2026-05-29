import { PipelineTimeline } from './PipelineTimeline';
import HeaderSearch from './HeaderSearch';

// The header shows the PropCloud mark only (no wordmark), sized to sit centered
// over the collapsed left-panel width. The mark is the theme-independent
// cloud+pin favicon, so no theme swap is needed. Removing the wordmark frees
// the space the smart search bar now occupies.
export default function TopHeader({ onSearchDeal, onSearchCoords }) {
  return (
    <header className="top-header">
      <div className="top-header-left">
        <img src="/favicon.svg" alt="propcloud" className="top-header-logo-mark" width="32" height="32" />
      </div>

      <div className="top-header-search-zone">
        <HeaderSearch onSearchDeal={onSearchDeal} onSearchCoords={onSearchCoords} />
      </div>

      <div className="top-header-center">
        <PipelineTimeline mode="track" showLabels showPhase={false} />
      </div>

      <div className="top-header-right">
        <PipelineTimeline mode="countdown" size="header" />
      </div>
    </header>
  );
}
