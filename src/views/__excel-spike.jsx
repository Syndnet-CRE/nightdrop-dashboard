// THROWAWAY SPIKE — deleted after Brady eyeballs the screenshot.
// Phase 0.1 of notes/bmad/deal-feed-excel/stories.md.
// Renders the vendor bundle with one-way publishing of real useDeals() data.
// Brady-gated: route returns 404 for any other subscriber.

import { useEffect, useRef, useState } from 'react';
import { useDeals } from '../contexts/DealsContext';
import { useAuth } from '../hooks/useAuth';
import * as lucide from 'lucide';

import '../vendor/deal-feed/styles.css';
import '../vendor/deal-feed/light-theme.css';

// ─── adapter (spike-minimal — full version lands in Phase 2 as adapter.js) ──
function toNDDeal(d) {
  const isReadStub = false;
  const sfNum = d.sf || d.building_sf || 0;
  const psf = d.value && sfNum ? Math.round(d.value / sfNum) : 0;
  const yearsHeld = d.last_sale_date
    ? Math.max(0, Math.floor((Date.now() - new Date(d.last_sale_date).getTime()) / (365 * 24 * 3600 * 1000)))
    : null;
  const sentAt = d.sent_at || d.sentAt || d.created_at;
  const sentISO = sentAt ? new Date(sentAt).toISOString().slice(0, 10) : '';
  const sentLabel = sentAt
    ? new Date(sentAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';
  const sig0 = (d.signals || [])[0];
  const sigText = typeof sig0 === 'string' ? sig0 : (sig0?.tag || sig0?.label || '');
  const sigCat = typeof sig0 === 'object' ? (sig0?.category || '') : sigText;
  const cat = sigCat.toLowerCase();
  let sc = 'pill-g';
  if (cat.includes('foreclos') || cat.includes('tax') || cat.includes('lien') || cat.includes('delinq')) sc = 'pill-r';
  else if (cat.includes('vacan') || cat.includes('code') || cat.includes('absentee')) sc = 'pill-a';
  const scoreRaw = d.score ?? d.match_score ?? 0;
  const score = scoreRaw <= 10 ? Math.round(scoreRaw * 10) : Math.round(scoreRaw);
  return {
    id: d.id,
    bx: d.buy_box_id || d.buyBoxId || d.box || 'unknown',
    score,
    addr: d.address || d.addr || '',
    city: d.city || `${d.property_city || ''}${d.property_state ? ', ' + d.property_state : ''}${d.property_zip ? ' ' + d.property_zip : ''}`.trim(),
    brief: (d.briefJson && d.briefJson.bullets && d.briefJson.bullets[0]?.body)
        || (d.brief_json && d.brief_json.bullets && d.brief_json.bullets[0]?.body)
        || (typeof sig0 === 'object' ? sig0?.description : '') || '',
    date: sentLabel,
    deliveredOn: sentISO,
    asset: d.asset || d.asset_class || '',
    psf,
    sf: d.sf || d.building_sf || 0,
    owner: d.owner_type || '—',
    hold: yearsHeld !== null ? `${yearsHeld} yr` : '—',
    sig: sigText,
    sc,
    stage: d.stage || 'New',
    notes: d.notes || '',
    unread: !isReadStub && !d.is_read,
    saved: !!d.saved,
    hot: d.feedback === 'hot',
    up: d.feedback === 'hot',
    la: null,
    ext: {
      parcel: d.apn || d.parcel_id || '—',
      county: d.county || '—',
      zoning: d.zoning || '—',
      yearBuilt: d.year_built || '—',
      lotSF: d.acres ? Math.round(d.acres * 43560).toLocaleString() : '—',
      assessed: d.assessed_value ? `$${(d.assessed_value / 1000).toFixed(0)}K` : '—',
      landVal: '—', bldgVal: '—', deed: '—', mortAmt: '—', mortLender: '—', mortDate: '—',
      lastSale: d.last_sale_date || '—',
      lastPrice: d.last_sale_price ? `$${(d.last_sale_price / 1000).toFixed(0)}K` : '—',
    },
    bullets: (d.brief_json && d.brief_json.bullets) || [],
    narr: (d.brief_json && (d.brief_json.summary || d.brief_json.narrative)) || '',
  };
}

const BOX_PALETTE = ['#2da200', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#10b981'];
function hashIdToColor(id) {
  let h = 0;
  for (const ch of String(id || '')) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return BOX_PALETTE[Math.abs(h) % BOX_PALETTE.length];
}
function toNDBox(b) {
  return {
    id: b.id,
    name: b.name || b.label || 'Buy box',
    asset: (b.asset_classes || []).join(' / ') || '',
    color: b.color || hashIdToColor(b.id),
    depth: b.deals || b.deals_sent_total || 0,
    mr: 0,
  };
}

function buildCalendar(deals, today) {
  const map = new Map();
  for (const d of deals) {
    if (d.sent_at) {
      const k = new Date(d.sent_at).toISOString().slice(0, 10);
      map.set(k, (map.get(k) || 0) + 1);
    }
  }
  const todayISO = today.toISOString().slice(0, 10);
  const months = [];
  for (let mOff = -5; mOff <= 1; mOff++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + mOff, 1);
    const weeks = [];
    let week = [];
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    for (let dd = 1; dd <= daysInMonth; dd++) {
      const day = new Date(monthDate.getFullYear(), monthDate.getMonth(), dd);
      const key = day.toISOString().slice(0, 10);
      week.push({
        key,
        count: map.get(key) || 0,
        isFuture: key > todayISO,
        isToday: key === todayISO,
      });
      if (day.getDay() === 6 || dd === daysInMonth) {
        weeks.push({ days: week });
        week = [];
      }
    }
    months.push({ weeks });
  }
  return months;
}

// ─── bundle module loader ──────────────────────────────────────────────────
async function loadBundle() {
  // Order matters; matches HANDOFF.md.
  await import('../vendor/deal-feed/data.js');
  await import('../vendor/deal-feed/tabs.js');
  await import('../vendor/deal-feed/selection.js');
  await import('../vendor/deal-feed/context-menu.js');
  await import('../vendor/deal-feed/row-resize.js');
  await import('../vendor/deal-feed/filter-popover.js');
  await import('../vendor/deal-feed/sidebar.js');
  // sidebar-tweaks.js skipped per locked decision.
  await import('../vendor/deal-feed/feed.js');
}

// ─── spike component ───────────────────────────────────────────────────────
export default function ExcelSpike() {
  const { subscriber } = useAuth();
  const { deals, buyBoxes, loading } = useDeals();
  const [bundleReady, setBundleReady] = useState(false);
  const mountedRef = useRef(false);

  // Make lucide visible to the bundle. lucide v1.x changed the API: createIcons
  // now requires `{ icons }`. Bundle calls `lucide.createIcons()` no-arg, so we
  // shim it.
  useEffect(() => {
    window.lucide = {
      ...lucide,
      createIcons: (opts = {}) =>
        lucide.createIcons({ icons: lucide.icons, ...opts }),
    };
  }, []);

  // Load bundle JS once — only after the real JSX has rendered (i.e. user is
  // brady@parcyl.ai and deals have loaded). Otherwise we'd load the bundle
  // against the login-stub DOM, where #bss / #tbody etc don't exist yet.
  const ready = subscriber?.email === 'brady@parcyl.ai' && !loading;
  useEffect(() => {
    if (!ready) return;
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadBundle().then(() => setBundleReady(true)).catch(err => {
      console.error('[spike] bundle load failed', err);
    });
  }, [ready]);

  // Publish host data into ND.deals once bundle is ready.
  useEffect(() => {
    if (!bundleReady) return;
    if (!window.ND) return;
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const ndDeals = (deals || []).map(toNDDeal);
    window.ND.deals = ndDeals;
    window.ND.boxes = (buyBoxes || []).map(toNDBox);
    window.ND.calendar = buildCalendar(deals || [], today);
    window.ND.todayISO = todayISO;
    // Spike: pick the most recent day that has deals as active, so the
    // screenshot shows real rows instead of the empty-day message.
    if (window.ND.state) {
      const dayCounts = new Map();
      for (const d of ndDeals) {
        if (d.deliveredOn) dayCounts.set(d.deliveredOn, (dayCounts.get(d.deliveredOn) || 0) + 1);
      }
      const mostRecent = Array.from(dayCounts.keys()).sort().pop();
      window.ND.state.activeDay = mostRecent || todayISO;
    }
    if (typeof window.ND._rr === 'function') {
      window.ND._rr();
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }, [bundleReady, deals, buyBoxes]);

  // Brady-only gate.
  if (!subscriber) return <div style={{ padding: 24 }}>Spike requires login.</div>;
  if (subscriber.email !== 'brady@parcyl.ai') return <div style={{ padding: 24 }}>Not found.</div>;
  if (loading) return <div style={{ padding: 24 }}>Loading deals…</div>;

  return (
    <div className="nd-excel-shell" style={{ height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Spike override: the bundle's CSS at .app has orphan properties
          (malformed source) so height/width never apply. Inline-fix here;
          Phase 2 cleans this up properly. */}
      <style>{`
        .nd-excel-shell .app { height: 100vh !important; width: 100% !important; grid-template-rows: 100vh !important; }
        .nd-excel-shell .main { height: 100vh; display: flex; flex-direction: column; min-height: 0; }
        .nd-excel-shell .feed { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
        .nd-excel-shell .feed-main { flex: 1 1 auto; min-height: 0; position: relative; display: flex; }
        .nd-excel-shell .tw { flex: 1 1 auto; min-height: 0; overflow: auto; position: relative; }
      `}</style>
      {/* Vestigial bundle run-clock stubs (bundle's tick() runs on setInterval and
          expects these ids — they belong to its removed top bar). Hidden. */}
      <span id="rcHr" style={{ display: 'none' }} />
      <span id="rcMn" style={{ display: 'none' }} />
      <span id="rcSc" style={{ display: 'none' }} />
      <div
        className="app"
        id="app"
        style={{ gridTemplateColumns: '1fr', height: '100vh', width: '100%' }}
      >
        <main className="main">
          <section className="feed sheet-light" data-screen-label="deal-feed">
            <div className="toolbar">
              <div className="chips">
                <button className="chip active" data-f="all">All <span className="chip-n">0</span></button>
                <button className="chip" data-f="unread">Unread <span className="chip-n">0</span></button>
                <button className="chip" data-f="saved">Saved <span className="chip-n">0</span></button>
                <button className="chip" data-f="hot">Hot <span className="chip-n">0</span></button>
              </div>
              <div className="spacer" />
              <button className="tbtn warn" id="exportBtn" style={{ display: 'none' }}>
                <i className="ti ti-download" /> Export (<span id="selCount">0</span>)
              </button>
              <div className="tbtn warn" id="bulkBtn" style={{ display: 'none' }}>
                <i className="ti ti-tag" />
                <select id="bss" className="tbtn-sel" defaultValue="">
                  <option value="">Set Stage</option>
                  <option>New</option><option>Researching</option><option>Contacted</option>
                  <option>Negotiating</option><option>Passed</option><option>Closed</option>
                </select>
              </div>
              <button className="tbtn" id="fcBtn" style={{ display: 'none' }}>
                <i className="ti ti-filter" /> <span id="fca">0</span> filters
              </button>
              <button className="tbtn"><i className="ti ti-columns" /> Columns</button>
              <div className="density-toggle" role="tablist" aria-label="Density">
                <button className="dbtn" data-d="compact" title="Compact"><i className="ti ti-baseline-density-large" /></button>
                <button className="dbtn active" data-d="normal" title="Normal"><i className="ti ti-baseline-density-medium" /></button>
                <button className="dbtn" data-d="comfortable" title="Comfortable"><i className="ti ti-baseline-density-small" /></button>
              </div>
              <div className="sort">
                <span className="sort-l">Sort:</span>
                <select className="sort-sel" defaultValue="Score">
                  <option>Score</option><option>Recency</option><option>Distress</option><option>Value</option>
                </select>
              </div>
              <div className="view-toggle">
                <button className="vbtn"><i className="ti ti-list" /> List</button>
                <button className="vbtn"><i className="ti ti-layout-grid" /> Grid</button>
                <button className="vbtn active"><i className="ti ti-table" /> Table</button>
              </div>
            </div>

            <div className="statsbar">
              <div className="stat"><span className="sl">Tonight</span><span className="sv g" id="stTotal">0</span></div>
              <div className="sdiv" />
              <div className="stat"><span className="sl">Avg Score</span><span className="sv" id="stAvg">0</span></div>
              <div className="sdiv" />
              <div className="stat"><span className="sl">Unread</span><span className="sv a">0</span></div>
              <div className="sdiv" />
              <div className="stat"><span className="sl">Hot</span><span className="sv r">0</span></div>
              <div className="sdiv" />
              <div className="stat"><span className="sl">Saved</span><span className="sv">0</span></div>
              <div className="sdiv" />
              <span className="rc" id="rc">Showing 0 of 0</span>
            </div>

            <div className="fbar" id="fbar" style={{ display: 'none' }} />

            <div className="feed-main">
              <div className="tw" id="tw">
                <table id="grid">
                  <colgroup id="cg" />
                  <thead>
                    <tr className="colhdr">
                      <th className="gutter-corner gutter"><span id="cellAddr" className="cell-addr-box" /></th>
                      <th data-letter="A">A</th><th data-letter="B">B</th><th data-letter="C">C</th>
                      <th data-letter="D">D</th><th data-letter="E">E</th><th data-letter="F">F</th>
                      <th data-letter="G">G</th><th data-letter="H">H</th><th data-letter="I">I</th>
                      <th data-letter="J">J</th><th data-letter="K">K</th><th data-letter="L">L</th>
                    </tr>
                    <tr>
                      <th className="gutter gutter-corner" title="Row" />
                      <th data-col="score"><div className="thi">Score<div className="tri on" data-key="score" /></div><div className="col-resize" data-col="score" /></th>
                      <th data-col="address"><div className="thi">Address<div className="tri" data-key="addr" /></div><div className="col-resize" data-col="address" /></th>
                      <th data-col="date"><div className="thi">Date<div className="tri" data-key="date" /></div><div className="col-resize" data-col="date" /></th>
                      <th data-col="asset"><div className="thi">Asset<div className="tri" data-key="asset" /></div><div className="col-resize" data-col="asset" /></th>
                      <th data-col="psf"><div className="thi">$/SF<div className="tri" data-key="psf" /></div><div className="col-resize" data-col="psf" /></th>
                      <th data-col="sf"><div className="thi">SF<div className="tri" data-key="sf" /></div><div className="col-resize" data-col="sf" /></th>
                      <th data-col="owner"><div className="thi">Owner<div className="tri" data-key="owner" /></div><div className="col-resize" data-col="owner" /></th>
                      <th data-col="hold"><div className="thi">Hold<div className="tri" data-key="hold" /></div><div className="col-resize" data-col="hold" /></th>
                      <th data-col="signal"><div className="thi">Top Signal<div className="tri" data-key="signal" /></div><div className="col-resize" data-col="signal" /></th>
                      <th data-col="stage"><div className="thi">Stage<div className="tri" data-key="stage" /></div><div className="col-resize" data-col="stage" /></th>
                      <th data-col="notes"><div className="thi">Notes</div><div className="col-resize" data-col="notes" /></th>
                      <th data-col="quick"><div className="thi">Quick</div></th>
                    </tr>
                  </thead>
                  <tbody id="tbody" />
                </table>
                <div id="fpop" className="fpop" style={{ display: 'none' }} />
              </div>

              <aside className="chat-drawer" id="drawer">
                <div className="dh2">
                  <div className="dh2-info">
                    <div className="dtitle">Ask Nightdrop</div>
                    <div className="ddeal" id="ddeal">—</div>
                  </div>
                  <button className="dclose" id="dclose" title="Close chat"><i className="ti ti-x" /></button>
                </div>
                <div className="dctx"><i className="ti ti-shield-lock" /> Deal context preloaded</div>
                <div className="dmsgs" id="dmsgs" />
                <div className="dinp">
                  <input type="text" id="ci" placeholder="Ask about this deal, market, or buy box…" />
                  <button className="dsend" id="cs"><i className="ti ti-send" /></button>
                </div>
              </aside>
            </div>

            <div className="tabbar" id="tabbar" />
          </section>
        </main>
      </div>
    </div>
  );
}
