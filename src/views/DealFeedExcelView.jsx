/* ============================================
   DEAL FEED EXCEL VIEW — host wrapper around the vendor spreadsheet
   bundle. Mounts at /dealsheet. Bundle markup is rendered as JSX
   inside .nd-excel-shell; bundle JS modules are side-effect-imported
   once and attach their own listeners. Host data flows in via
   publishToBundle; bundle mutations are routed back through
   installActionAdapters.

   AppShell keeps a single instance of this wrapper mounted across view
   switches (toggled via display:none) so the bundle's element-scoped
   listeners survive navigate-away-and-back.

   Story 2.10 of notes/bmad/deal-feed-excel/stories.md.
   ============================================ */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeals } from '../contexts/DealsContext';
import { useReadState } from '../contexts/ReadStateContext';

import { installLucideShim } from '../vendor/deal-feed/lucide-shim';
import { installActionAdapters } from '../vendor/deal-feed/actions';
import { createRrThrottle, publishToBundle } from '../vendor/deal-feed/sync';

// Side-effect CSS imports — Vite will bundle into the lazy chunk.
import '../vendor/deal-feed/styles.css';
import '../vendor/deal-feed/light-theme.css';
// Host overrides — load AFTER vendor CSS so cascade wins.
import './DealFeedExcelView.css';

// Module-scoped: bundle JS modules are IIFEs that attach document-level
// listeners. They should run exactly once for the page lifetime, not per
// component mount. A promise ref ensures concurrent first-mount races also
// resolve to the same load.
let bundleLoadPromise = null;
function loadBundleOnce() {
  if (bundleLoadPromise) return bundleLoadPromise;
  bundleLoadPromise = (async () => {
    // Load order matches the original index.html script order.
    // sidebar-tweaks.js is intentionally NOT loaded (sidebar hidden;
    // locked decision 4).
    await import('../vendor/deal-feed/data.js');
    await import('../vendor/deal-feed/tabs.js');
    await import('../vendor/deal-feed/selection.js');
    await import('../vendor/deal-feed/context-menu.js');
    await import('../vendor/deal-feed/row-resize.js');
    await import('../vendor/deal-feed/filter-popover.js');
    await import('../vendor/deal-feed/sidebar.js');
    await import('../vendor/deal-feed/feed.js');
  })();
  return bundleLoadPromise;
}

export default function DealFeedExcelView() {
  const {
    deals,
    buyBoxes,
    postFeedback,
    saveNote,
    updateStatus,
    patchStage,
    deleteDeal,
  } = useDeals();
  const { isRead, markRead } = useReadState();
  const navigate = useNavigate();

  // Carry the throttle across renders without retriggering the mount effect.
  const throttleRef = useRef(null);
  const readyRef = useRef(false);

  // Mount-once: install shim, load bundle, install action adapters.
  useEffect(() => {
    let cleanupActions = () => {};
    let cancelled = false;
    const cleanupLucide = installLucideShim(window);

    loadBundleOnce().then(() => {
      if (cancelled) return;
      const ND = (window.ND = window.ND || {});
      throttleRef.current = createRrThrottle(ND);
      cleanupActions = installActionAdapters(ND, {
        postFeedback,
        saveNote,
        updateStatus,
        patchStage,
        deleteDeal,
        markRead,
        navigate,
      });
      // Re-trigger bundle module init that may have run during a previous
      // detached DOM window (React 18 StrictMode mounts → cleans up → mounts
      // again, and bundle imports continue resolving in the background while
      // the DOM is briefly empty). All these are idempotent.
      //  - selection.js install: dataset.selWired guard prevents double-wiring
      //  - tabs.js renderTabs: re-paints from current state, no side effects
      //  - feed.js _rr: same — re-paints the grid from current state
      if (typeof ND.sheet?.install === 'function') ND.sheet.install();
      if (typeof ND.renderTabs === 'function') ND.renderTabs();
      if (typeof ND._rr === 'function') ND._rr();
      readyRef.current = true;
      // Initial publish — host state may have arrived before the bundle loaded.
      publishToBundle({
        ND,
        deals,
        buyBoxes,
        isRead,
        requestRr: throttleRef.current,
      });
    });

    return () => {
      cancelled = true;
      cleanupActions();
      cleanupLucide();
      throttleRef.current?.cancel?.();
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Publishing effect — fire on every host state change. No-op until the
  // bundle is loaded; the mount effect's initial publish handles the
  // post-load state.
  useEffect(() => {
    if (!readyRef.current) return;
    const ND = window.ND;
    if (!ND || !throttleRef.current) return;
    publishToBundle({
      ND,
      deals,
      buyBoxes,
      isRead,
      requestRr: throttleRef.current,
    });
  }, [deals, buyBoxes, isRead]);

  return (
    <div id="nd-excel-app" className="nd-excel-shell">
      <main className="main">
        <section className="feed sheet-light" data-screen-label="deal-feed">
          <div className="toolbar">
            <div className="chips">
              <button className="chip active" data-f="all">All <span className="chip-n">0</span></button>
              <button className="chip" data-f="unread">Unread <span className="chip-n">0</span></button>
              <button className="chip" data-f="saved">Saved <span className="chip-n">0</span></button>
              <button className="chip" data-f="hot">Hot <span className="chip-n">0</span></button>
            </div>
            <div className="spacer"></div>

            <button className="tbtn warn" id="exportBtn" style={{ display: 'none' }}>
              <i className="ti ti-download"></i> Export (<span id="selCount">0</span>)
            </button>
            <div className="tbtn warn" id="bulkBtn" style={{ display: 'none' }}>
              <i className="ti ti-tag"></i>
              <select id="bss" className="tbtn-sel" defaultValue="">
                <option value="">Set Stage</option>
                <option>New</option>
                <option>Researching</option>
                <option>Contacted</option>
                <option>Negotiating</option>
                <option>Passed</option>
                <option>Closed</option>
              </select>
            </div>
            <button className="tbtn" id="fcBtn" style={{ display: 'none' }}>
              <i className="ti ti-filter"></i> <span id="fca">0</span> filters
            </button>
            <button className="tbtn"><i className="ti ti-columns"></i> Columns</button>

            <div className="density-toggle" role="tablist" aria-label="Density">
              <button className="dbtn" data-d="compact" title="Compact"><i className="ti ti-baseline-density-large"></i></button>
              <button className="dbtn active" data-d="normal" title="Normal"><i className="ti ti-baseline-density-medium"></i></button>
              <button className="dbtn" data-d="comfortable" title="Comfortable"><i className="ti ti-baseline-density-small"></i></button>
            </div>

            <div className="sort">
              <span className="sort-l">Sort:</span>
              <select className="sort-sel" defaultValue="Score">
                <option>Score</option>
                <option>Recency</option>
                <option>Distress</option>
                <option>Value</option>
              </select>
            </div>

            <div className="view-toggle">
              <button className="vbtn"><i className="ti ti-list"></i> List</button>
              <button className="vbtn"><i className="ti ti-layout-grid"></i> Grid</button>
              <button className="vbtn active"><i className="ti ti-table"></i> Table</button>
            </div>
          </div>

          <div className="statsbar">
            <div className="stat"><span className="sl">Tonight</span><span className="sv g" id="stTotal">0</span></div>
            <div className="sdiv"></div>
            <div className="stat"><span className="sl">Avg Score</span><span className="sv" id="stAvg">—</span></div>
            <div className="sdiv"></div>
            <div className="stat"><span className="sl">Unread</span><span className="sv a">0</span></div>
            <div className="sdiv"></div>
            <div className="stat"><span className="sl">Hot</span><span className="sv r">0</span></div>
            <div className="sdiv"></div>
            <div className="stat"><span className="sl">Saved</span><span className="sv">0</span></div>
            <div className="sdiv"></div>
            <span className="rc" id="rc">Loading…</span>
          </div>

          <div className="fbar" id="fbar" style={{ display: 'none' }}></div>

          <div className="feed-main">
            <div className="tw" id="tw">
              <table id="grid">
                <colgroup id="cg"></colgroup>
                <thead>
                  <tr className="colhdr">
                    <th className="gutter-corner gutter"><span id="cellAddr" className="cell-addr-box"></span></th>
                    <th data-letter="A">A</th>
                    <th data-letter="B">B</th>
                    <th data-letter="C">C</th>
                    <th data-letter="D">D</th>
                    <th data-letter="E">E</th>
                    <th data-letter="F">F</th>
                    <th data-letter="G">G</th>
                    <th data-letter="H">H</th>
                    <th data-letter="I">I</th>
                    <th data-letter="J">J</th>
                    <th data-letter="K">K</th>
                    <th data-letter="L">L</th>
                  </tr>
                  <tr>
                    <th className="gutter gutter-corner" title="Row"></th>
                    <th data-col="score"><div className="thi">Score<div className="tri on" data-key="score"></div></div><div className="col-resize" data-col="score"></div></th>
                    <th data-col="address"><div className="thi">Address<div className="tri" data-key="addr"></div></div><div className="col-resize" data-col="address"></div></th>
                    <th data-col="date"><div className="thi">Date<div className="tri" data-key="date"></div></div><div className="col-resize" data-col="date"></div></th>
                    <th data-col="asset"><div className="thi">Asset<div className="tri" data-key="asset"></div></div><div className="col-resize" data-col="asset"></div></th>
                    <th data-col="psf"><div className="thi">$/SF<div className="tri" data-key="psf"></div></div><div className="col-resize" data-col="psf"></div></th>
                    <th data-col="sf"><div className="thi">SF<div className="tri" data-key="sf"></div></div><div className="col-resize" data-col="sf"></div></th>
                    <th data-col="owner"><div className="thi">Owner<div className="tri" data-key="owner"></div></div><div className="col-resize" data-col="owner"></div></th>
                    <th data-col="hold"><div className="thi">Hold<div className="tri" data-key="hold"></div></div><div className="col-resize" data-col="hold"></div></th>
                    <th data-col="signal"><div className="thi">Top Signal<div className="tri" data-key="signal"></div></div><div className="col-resize" data-col="signal"></div></th>
                    <th data-col="stage"><div className="thi">Stage<div className="tri" data-key="stage"></div></div><div className="col-resize" data-col="stage"></div></th>
                    <th data-col="notes"><div className="thi">Notes</div><div className="col-resize" data-col="notes"></div></th>
                    <th data-col="quick"><div className="thi">Quick</div></th>
                  </tr>
                </thead>
                <tbody id="tbody"></tbody>
              </table>
              <div id="fpop" className="fpop" style={{ display: 'none' }}></div>
            </div>

            <aside className="chat-drawer" id="drawer">
              <div className="dh2">
                <div className="dh2-info">
                  <div className="dtitle">Ask Nightdrop</div>
                  <div className="ddeal" id="ddeal">—</div>
                </div>
                <button className="dclose" id="dclose" title="Close chat"><i className="ti ti-x"></i></button>
              </div>
              <div className="dctx"><i className="ti ti-shield-lock"></i> Deal context preloaded</div>
              <div className="dmsgs" id="dmsgs"></div>
              <div className="dinp">
                <input type="text" id="ci" placeholder="Ask about this deal, market, or buy box…" />
                <button className="dsend" id="cs"><i className="ti ti-send"></i></button>
              </div>
            </aside>
          </div>

          <div className="tabbar" id="tabbar"></div>
        </section>
      </main>
    </div>
  );
}
