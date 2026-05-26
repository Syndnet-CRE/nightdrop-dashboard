/* eslint-disable react-refresh/only-export-components */
// File exports the PipelineTimeline component plus helpers
// (getStage, getMarkerPct, nextHLabel, pad, getSimulatedBoxCount,
// getSimulatedBoxTotal) that PipelineTimeline.test.js imports.
// Fast Refresh's "only-export-components" rule is purely an HMR
// optimization hint, not a correctness issue. Splitting helpers
// to a sibling file is tracked separately.
import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import PipelineTrack from './PipelineTrack.jsx';
import { useDeals } from '../contexts/DealsContext';

const TZ = 'America/Chicago';

function getCTSeconds() {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
  return get('hour') * 3600 + get('minute') * 60 + get('second');
}

function secsUntilCTHour(targetH) {
  const nowSecs = getCTSeconds();
  const targetSecs = targetH * 3600;
  const delta = targetSecs - nowSecs;
  return delta > 0 ? delta : delta + 86400;
}

export function pad(n) { return String(Math.max(0, Math.floor(n))).padStart(2, '0'); }

export function nextHLabel(h) {
  if (h === 0) return '12:00 AM CT';
  if (h === 2) return '2:00 AM CT';
  if (h === 4) return '4:00 AM CT';
  return '6:00 AM CT';
}

// Visual 50/50 split: dead zone (18h) = left half, active pipeline (6h) = right half.
// Clock timing is preserved — rocket reaches each gate at the correct CT time.
const PIPELINE_NODES = [
  { id: 'boxes',     label: 'Boxes',     pos: 0.50 },
  { id: 'queue',     label: 'Queue',     pos: 0.50 + (2 / 6) * 0.50 },  // 0.6667
  { id: 'briefs',    label: 'Briefs',    pos: 0.50 + (4 / 6) * 0.50 },  // 0.8333
  { id: 'delivered', label: 'Delivered', pos: 1.00 },
];

export function getStage(nowSecs) {
  const h = Math.floor(nowSecs / 3600);
  if (h < 2)  return { nodeIdx: 1, nextH: 2 }; // Queue processing
  if (h < 4)  return { nodeIdx: 2, nextH: 4 }; // Briefs generating
  if (h < 6)  return { nodeIdx: 3, nextH: 6 }; // Deals delivering
  return        { nodeIdx: 0, nextH: 0 };        // Dead zone: Boxes gate glows, countdown to midnight
}

// Rocket position: 50/50 visual split.
// Dead zone (6am→midnight, 18h) maps to 0→50%. Active run (midnight→6am, 6h) maps to 50→100%.
export function getMarkerPct(nowSecs) {
  const secsSince6AM = (nowSecs - 21600 + 86400) % 86400;
  if (secsSince6AM < 64800) {
    return (secsSince6AM / 64800) * 50;
  }
  return 50 + ((secsSince6AM - 64800) / 21600) * 50;
}

// Seeded LCG — consistent 15-min increments for the same calendar day
export function getSimulatedBoxCount(nowSecs) {
  const secsSince6AM = (nowSecs - 21600 + 86400) % 86400;
  if (secsSince6AM >= 64800) return null; // active run window, hide counter
  const quartersElapsed = Math.floor(secsSince6AM / 900); // 15-min buckets
  if (quartersElapsed === 0) return 0;
  const dateSeed = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date()).replace(/\//g, ''),
    10
  ) || 20260513;
  let seed = dateSeed >>> 0;
  let total = 0;
  for (let i = 0; i < quartersElapsed; i++) {
    seed = ((seed * 1664525 + 1013904223) >>> 0);
    total += seed % 8; // 0–7 per 15-min window
  }
  return total;
}

// Seeded LCG — platform-wide buy box total, grows ~1/hour during dead zone
export function getSimulatedBoxTotal(nowSecs) {
  const secsSince6AM = (nowSecs - 21600 + 86400) % 86400;
  if (secsSince6AM >= 64800) return null; // active run: fall back to real data
  const quartersElapsed = Math.floor(secsSince6AM / 900);
  const dateSeed = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date()).replace(/\//g, ''),
    10
  ) || 20260513;
  let seed = (dateSeed ^ 0xA5A5A5A5) >>> 0; // offset from submitted counter seed
  let total = 45;
  for (let i = 0; i < quartersElapsed; i++) {
    seed = ((seed * 1664525 + 1013904223) >>> 0);
    if (seed % 4 === 0) total += 1; // ~25% → ~1 new box/hour on average
  }
  return total;
}

function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark'
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

// countdown size tokens
const CD = {
  xl:     { num: 44, sep: 28 },
  header: { num: 28, sep: 18 },
  rail:   { num: 28, sep: 20 },
};

// eslint-disable-next-line no-unused-vars
export function PipelineTimeline({ mode = 'full', size = 'xl', showLabels = false, showPhase = true } = {}) {
  const theme      = useTheme();
  const isLight    = theme === 'light';
  const { deals = [], buyBoxes = [] } = useDeals() || {};

  const cdHRef     = useRef(null);
  const cdMRef     = useRef(null);
  const cdSRef     = useRef(null);
  const cdFootRef  = useRef(null);

  const [trackProgress, setTrackProgress] = useState(
    () => getMarkerPct(getCTSeconds()) / 100
  );

  const lastBoxQuarterRef = useRef(-1);
  const [submittedCount, setSubmittedCount] = useState(
    () => getSimulatedBoxCount(getCTSeconds())
  );
  const [boxesCount, setBoxesCount] = useState(
    () => getSimulatedBoxTotal(getCTSeconds())
  );

  // ── Theme-aware countdown style tokens ─────────────────────────
  const s = {
    cdLabel: {
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      color: isLight ? '#0D0D0D' : '#FFFFFF', fontFamily: 'Manrope, system-ui, sans-serif',
    },
    cdClock: {
      display: 'flex', alignItems: 'baseline', gap: 4,
      fontFamily: 'Manrope, system-ui, sans-serif',
      fontWeight: 800, color: isLight ? '#0D0D0D' : '#FFFFFF', letterSpacing: '0.01em',
      fontVariantNumeric: 'tabular-nums', lineHeight: 0.95,
    },
    cdFoot: {
      fontSize: 10, color: isLight ? '#40424D' : 'var(--muted-foreground)', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.07em',
      fontFamily: 'Manrope, system-ui, sans-serif',
    },
  };

  useEffect(() => {
    function tick() {
      const nowSecs = getCTSeconds();
      const { nextH } = getStage(nowSecs);
      const pct = getMarkerPct(nowSecs);

      // countdown clock (DOM refs — avoids re-render)
      const total = secsUntilCTHour(nextH ?? 0);
      if (cdHRef.current)   cdHRef.current.textContent   = pad(Math.floor(total / 3600));
      if (cdMRef.current)   cdMRef.current.textContent   = pad(Math.floor((total % 3600) / 60));
      if (cdSRef.current)   cdSRef.current.textContent   = pad(total % 60);
      if (cdFootRef.current) cdFootRef.current.textContent = nextHLabel(nextH);

      // track progress (drives PipelineTrack re-render)
      setTrackProgress(pct / 100);

      // dead zone counters — update every 15 minutes
      const secsSince6AM = (nowSecs - 21600 + 86400) % 86400;
      const currentQuarter = Math.floor(secsSince6AM / 900);
      if (currentQuarter !== lastBoxQuarterRef.current) {
        lastBoxQuarterRef.current = currentQuarter;
        setSubmittedCount(getSimulatedBoxCount(nowSecs));
        setBoxesCount(getSimulatedBoxTotal(nowSecs));
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Renderers ──────────────────────────────────────────────────

  const numSz = CD[size]?.num ?? CD.xl.num;
  const sepSz = CD[size]?.sep ?? CD.xl.sep;
  const sepColor = isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.45)';

  const renderCountdown = () => (
    <div className="pipeline-cd-panel">
      <div className="pipeline-cd-container">
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={s.cdLabel}>NEXT</span>
            <span style={s.cdLabel}>RUN</span>
          </div>
          <Timer size={13} color="var(--primary)" />
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(91,204,72,0.18)', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
          <div style={s.cdClock} className="pipeline-cd-clock">
            <span className="pipeline-cd-num" style={{ fontSize: numSz, lineHeight: 0.95 }} ref={cdHRef}>00</span>
            <span style={{ fontSize: sepSz, color: sepColor, margin: '0 1px', position: 'relative', top: -2 }}>:</span>
            <span className="pipeline-cd-num" style={{ fontSize: numSz, lineHeight: 0.95 }} ref={cdMRef}>00</span>
            <span style={{ fontSize: sepSz, color: sepColor, margin: '0 1px', position: 'relative', top: -2 }}>:</span>
            <span className="pipeline-cd-num" style={{ fontSize: numSz, lineHeight: 0.95, color: 'var(--primary)' }} ref={cdSRef}>00</span>
          </div>
          <div style={s.cdFoot} ref={cdFootRef}>{nextHLabel(getStage(getCTSeconds()).nextH)}</div>
        </div>
      </div>
    </div>
  );

  // ── Mode routing ───────────────────────────────────────────────

  if (mode === 'countdown') {
    return <div className="pipeline-countdown-only">{renderCountdown()}</div>;
  }

  if (mode === 'track') {
    const { nodeIdx } = getStage(getCTSeconds());
    const eta = ['06:00 CT', '06:00 CT', '06:00 CT', '06:00 CT'][nodeIdx];
    const activeBoxes = buyBoxes.filter(b => b.status === 'Active').length;
    const queueCount  = deals.length;
    const briefsCount = Math.round(queueCount * 0.72);
    return (
      <div className="pipeline-track-only" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <PipelineTrack
          progress={trackProgress}
          activeIndexOverride={nodeIdx}
          nodes={PIPELINE_NODES}
          submittedCount={submittedCount}
          telemetry={{
            boxes:  boxesCount ?? activeBoxes,
            queue:  queueCount,
            briefs: briefsCount,
            eta,
          }}
        />
      </div>
    );
  }

  // legacy full grid (not actively used)
  return (
    <div className="pipeline-timeline pipeline-timeline-grid" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      {renderCountdown()}
      <div className="pipeline-track-only" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <PipelineTrack
          progress={trackProgress}
          telemetry={{ boxes: 1, queue: 21, capacity: Math.round(trackProgress * 100), briefs: 0, eta: '02:00 CT' }}
        />
      </div>
    </div>
  );
}
