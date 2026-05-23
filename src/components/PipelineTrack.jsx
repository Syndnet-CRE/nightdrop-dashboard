/**
 * PipelineTrack — the new dashboard header timeline (3A · Data HUD · Telemetry Row)
 *
 * Drop this in to replace the existing markup INSIDE `.pipeline-track-only` in your
 * `.top-header-center`. The left-side wordmark and right-side countdown chrome stay
 * exactly as they are today.
 *
 * Data contract — your existing Chicago-time tick passes these props in every second:
 *
 *   <PipelineTrack
 *     progress={pipelineProgress}    // 0..1   — rocket position
 *     telemetry={{
 *       boxes:    1,
 *       queue:    21,
 *       capacity: 47,                // percent (number, no `%`)
 *       briefs:   0,
 *       eta:      '02:00 CT',
 *     }}
 *     // Optional — defaults match the existing 18/50/75/100% station positions:
 *     nodes={[
 *       { id: 'submit',    label: 'Submit',    pos: 0.18 },
 *       { id: 'agents',    label: 'Agents',    pos: 0.50 },
 *       { id: 'briefs',    label: 'Briefs',    pos: 0.75 },
 *       { id: 'delivered', label: 'Delivered', pos: 1.00 },
 *     ]}
 *     // Optional — Nightdrop greens are the default. Override for theming.
 *     palette={{
 *       primary:   'var(--primary)',
 *       light:     'var(--chart-1)',
 *       lightest:  'var(--chart-1)',
 *     }}
 *   />
 *
 * Requires the keyframes in `pipeline-track.css` to be loaded once in the page.
 *
 * The component derives the active station from `progress` (it does NOT need a
 * separate `activeNodeIndex` prop). If you have to override it, pass `activeIndexOverride`.
 */
import React from 'react';

const DEFAULT_NODES = [
  { id: 'boxes',     label: 'Boxes',     pos: 0.50 },
  { id: 'queue',     label: 'Queue',     pos: 0.50 + (2 / 6) * 0.50 },
  { id: 'briefs',    label: 'Briefs',    pos: 0.50 + (4 / 6) * 0.50 },
  { id: 'delivered', label: 'Delivered', pos: 1.00 },
];

const DEFAULT_PALETTE = {
  primary:  'var(--primary)',
  light:    'var(--chart-1)',
  lightest: 'var(--chart-1)',
};

function activeIndex(progress, nodes) {
  let ai = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (progress >= nodes[i].pos) ai = i;
  }
  return ai;
}

// ── Telemetry stat ──────────────────────────────────────────────────────────
function StatBlock({ k, v, accent, palette, align = 'left' }) {
  const alignItems = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems,
      lineHeight: 1,
      fontFamily: 'Manrope, system-ui, sans-serif',
      gap: 1,
    }}>
      <div style={{
        fontSize: 7, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: '#5C6070',
      }}>{k}</div>
      <div style={{
        fontSize: 9, fontWeight: 700,
        letterSpacing: '0.02em',
        color: accent ? palette.light : '#C9CCD6',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}>{v}</div>
    </div>
  );
}

// ── EQ ticker — the EQ-style bars under the rocket ─────────────────────────
function EQTicker({ progress, palette }) {
  const ref = React.useRef(null);
  const [tickCount, setTickCount] = React.useState(180);
  React.useEffect(() => {
    function measure() {
      if (!ref.current) return;
      const w = ref.current.offsetWidth;
      // N ticks × 2px + (N-1) gaps × 3px = 5N-3. Solve: N = (w+3)/5
      setTickCount(Math.max(30, Math.floor((w + 3) / 5)));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return (
    <div ref={ref} style={{
      position: 'absolute', left: 0, right: 0, top: '50%',
      height: 12, marginTop: -6,
      display: 'flex', alignItems: 'center', gap: 3,
      overflow: 'hidden',
    }}>
      {Array.from({ length: tickCount }).map((_, i) => {
        const pct = i / (tickCount - 1);
        // Signed distance from rocket head: <0 trailing, >0 ahead.
        // Leading band hugs the rocket so the bright cluster never trails behind.
        const dist = pct - progress;
        const isDone = dist < -0.005;
        const isLeading = dist >= -0.06 && dist <= 0.015;
        const leadH = Math.max(4, 11 - Math.abs(dist) * 130);
        const h = isLeading ? leadH : isDone ? 3 + (i % 2) : 2;
        const color = isLeading ? palette.lightest
                    : isDone   ? palette.primary
                                : 'rgba(255,255,255,0.10)';
        return (
          <div key={i} style={{
            width: 2, height: h,
            background: color,
            borderRadius: 1,
            boxShadow: isLeading ? `0 0 4px ${palette.primary}` : 'none',
            animation: isLeading
              ? `pt-tick-rise ${0.55 + (i % 5) * 0.08}s ease-in-out infinite ${(i % 7) * 0.05}s`
              : 'none',
            transformOrigin: 'center',
            flex: '0 0 auto',
            transition: 'background 0.18s, height 0.18s',
          }}/>
        );
      })}
    </div>
  );
}

// ── Diamond gate (Submit · Agents · Briefs · Delivered) ────────────────────
function DiamondGate({ node, state, palette }) {
  const SIZE_NORMAL = 8;
  const SIZE_ACTIVE = 10;
  const LABEL_TOP   = 16;
  return (
    <div style={{
      position: 'absolute', left: `${node.pos * 100}%`, top: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 3,
    }}>
      <div style={{
        position: 'relative',
        width:  state === 'active' ? SIZE_ACTIVE : SIZE_NORMAL,
        height: state === 'active' ? SIZE_ACTIVE : SIZE_NORMAL,
        background: state === 'pending' ? '#0D0D0D' : palette.primary,
        border: `1.5px solid ${state === 'pending' ? '#3a3d48' : palette.primary}`,
        transform: 'rotate(45deg)',
        boxShadow: state === 'active'
          ? `0 0 0 3px #0D0D0D, 0 0 12px ${palette.primary}`
          : `0 0 0 3px #0D0D0D`,
        transition: 'all 0.2s cubic-bezier(.2,0,0,1)',
      }}>
        {state === 'active' && (
          <div style={{
            position: 'absolute', inset: -4,
            border: `1px solid ${palette.primary}55`,
            animation: `pt-ring-pulse 2.4s ease-out infinite`,
          }}/>
        )}
      </div>
      <div style={{
        position: 'absolute', top: LABEL_TOP, left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: state === 'pending' ? '#5C6070'
             : state === 'active'  ? palette.light
                                    : '#C9CCD6',
        whiteSpace: 'nowrap',
        fontFamily: 'Manrope, system-ui, sans-serif',
      }}>{node.label}</div>
    </div>
  );
}

// ── Rocket ────────────────────────────────────────────────────────────────
// Wrapper is unrotated so the flame trail can be screen-aligned (horizontal).
// Only the SVG itself rotates so the rocket visually points along the track.
function Rocket({ size = 36, palette }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'block' }}>
      {/* Screen-aligned horizontal flame — exits from the rocket's exhaust */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: `calc(100% - ${size * 0.18}px)`,
        width: `${size * 1.7}px`,
        height: 3,
        marginTop: -1.5,
        background: `linear-gradient(90deg,
          transparent 0%,
          rgba(89,234,96,0) 6%,
          rgba(248,180,65,0.85) 60%,
          rgba(255,255,255,1) 100%)`,
        borderRadius: 2,
        filter: 'blur(1.2px)',
        pointerEvents: 'none',
      }}/>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
           strokeLinecap="round" strokeLinejoin="round"
           style={{ position: 'relative', zIndex: 2, display: 'block', transform: 'rotate(45deg)' }}>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" fill={palette.primary} stroke="#1A1A20" strokeWidth="1.2"/>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09" fill="#F97316" stroke="#EA580C" strokeWidth="1.4"/>
        <path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z" fill={palette.primary} stroke="#1A1A20" strokeWidth="1.2"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05" fill={palette.primary} stroke="#1A1A20" strokeWidth="1.2"/>
      </svg>
    </div>
  );
}

// ── PUBLIC COMPONENT ──────────────────────────────────────────────────────
export default function PipelineTrack({
  progress,
  telemetry,
  nodes = DEFAULT_NODES,
  palette: paletteOverride,
  activeIndexOverride,
  submittedCount,
}) {
  const palette = { ...DEFAULT_PALETTE, ...(paletteOverride || {}) };
  const ai = (typeof activeIndexOverride === 'number')
    ? activeIndexOverride
    : activeIndex(progress, nodes);

  // Coerce telemetry values to strings/padded numbers for display
  const t = telemetry || {};
  const pad = (n) => String(n).padStart(2, '0');
  const display = {
    boxes:  { k: 'BOXES',  v: pad(t.boxes ?? 0) },
    queue:  { k: 'QUEUE',  v: pad(t.queue ?? 0) },
    briefs: { k: 'BRIEFS', v: pad(t.briefs ?? 0) },
    eta:    { k: 'ETA',    v: t.eta || '—' },
  };

  return (
    <div className="pt-track" style={{
      position: 'relative',
      width: '100%',
      height: 48,
      paddingLeft: 28,
      paddingRight: 28,
      boxSizing: 'border-box',
    }}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Telemetry strip — stats aligned to gate positions, derived from nodes */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 18 }}>
          {(() => {
            const statMap = { boxes: display.boxes, queue: display.queue, briefs: display.briefs, delivered: display.eta };
            return nodes.map((n, i) => {
              const isLast = i === nodes.length - 1;
              const xform  = isLast ? 'translateX(-100%)' : 'translateX(-50%)';
              const align  = isLast ? 'right' : 'center';
              const data   = statMap[n.id] || { k: n.label.toUpperCase(), v: '—' };
              return (
                <div key={n.id} style={{ position: 'absolute', left: `${n.pos * 100}%`, top: 0, transform: xform }}>
                  <StatBlock {...data} palette={palette} accent={isLast} align={align}/>
                </div>
              );
            });
          })()}
          {/* Dead zone buy-box submission counter — single line: "221 SUBMITTED" */}
          {submittedCount != null && submittedCount > 0 && (
            <div style={{
              position: 'absolute',
              left: `${nodes[0].pos * 50}%`,
              top: 0,
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
              fontFamily: 'Manrope, system-ui, sans-serif',
            }}>
              <div key={submittedCount} style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.02em',
                color: palette.light,
                fontVariantNumeric: 'tabular-nums',
                animation: 'pt-count-pulse 0.6s cubic-bezier(0.2, 0, 0, 1)',
              }}>
                {submittedCount}
              </div>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6070' }}>
                SUBMITTED
              </div>
            </div>
          )}
        </div>
        {/* Hairline divider */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 20,
          height: 1, background: 'rgba(255,255,255,0.06)',
        }}/>
        {/* Ticker + diamonds + rocket */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 22, bottom: 0 }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, height: 26 }}>
              <EQTicker progress={progress} palette={palette}/>
              {nodes.map((n, i) => {
                const state = i < ai ? 'done' : i === ai ? 'active' : 'pending';
                return <DiamondGate key={n.id} node={n} state={state} palette={palette}/>;
              })}
              <div style={{
                position: 'absolute', left: `${progress * 100}%`, top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 4,
                filter: `drop-shadow(0 0 8px ${palette.primary}aa)`,
                transition: 'left 0.25s linear',
                willChange: 'left',
              }}>
                <Rocket size={36} palette={palette}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
