// src/components/BuyBoxActivatedDialog.jsx
//
// Full-screen "Buy box activated" confirmation overlay.
//
// Props:
//   box                 — shape: { label, run_schedule: { days }, delivery_max_per_run }
//   matchCount          — number from last /preview call (or null)
//   cadenceOverride?    — 'daily' | 'weekly' | 'realtime' (skips derivation from run_schedule)
//   onBuildAnother()    — caller resets wizard to step 1 blank
//   onClose()           — Esc / backdrop click / "Return to dashboard"

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import '../styles/buyBoxActivated.css';

function deriveCadence(box, override) {
  if (override) return override;
  const days = box?.run_schedule?.days ?? [];
  if (days.length === 7) return 'daily';
  if (days.length === 1) return 'weekly';
  if (days.length === 0) return 'realtime';
  return 'custom';
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function formatFirstDrop(box) {
  const days = box?.run_schedule?.days ?? [];
  if (days.length === 0) return { time: '06:00 EST', sub: 'first match available' };
  if (days.length === 7) return { time: '06:00 EST', sub: 'tomorrow morning' };

  const now = new Date();
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    if (days.includes(DAY_KEYS[d.getDay()])) {
      const label = d.toLocaleDateString('en-US', { weekday: 'long' });
      return { time: '06:00 EST', sub: `${label} morning` };
    }
  }
  return { time: '06:00 EST', sub: 'next scheduled day' };
}

export default function BuyBoxActivatedDialog({
  box,
  matchCount,
  cadenceOverride,
  onBuildAnother,
  onClose,
}) {
  const primaryRef = useRef(null);
  const secondaryRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    primaryRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === 'Tab') {
        const active = document.activeElement;
        if (e.shiftKey && active === secondaryRef.current) {
          e.preventDefault();
          primaryRef.current?.focus();
        } else if (!e.shiftKey && active === primaryRef.current) {
          e.preventDefault();
          secondaryRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [onClose]);

  if (!box) return null;

  const cadence = deriveCadence(box, cadenceOverride);
  const drop = formatFirstDrop(box);
  const max = box.delivery_max_per_run ?? '—';

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <div
      className="bba"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bb-activated-title"
      onMouseDown={onBackdropClick}
    >
      <div className="bba-card">
        <div className="bba-check" aria-hidden="true">
          <Check size={32} strokeWidth={2} />
        </div>

        <div id="bb-activated-title" className="bba-eyebrow">
          Buy box activated
        </div>
        <h1 className="bba-title">You&rsquo;re hunting.</h1>

        <div className="bba-name" title={box.label}>{box.label}</div>

        <div className="bba-grid">
          <div className="bba-cell">
            <div className="bba-cell__label">Match pool</div>
            <div className="bba-cell__val bba-cell__val--accent">
              {typeof matchCount === 'number'
                ? matchCount.toLocaleString('en-US')
                : '—'}
            </div>
            <div className="bba-cell__sub">properties tracked</div>
          </div>

          <div className="bba-cell">
            <div className="bba-cell__label">First drop</div>
            <div className="bba-cell__val">{drop.time}</div>
            <div className="bba-cell__sub">{drop.sub}</div>
          </div>

          <div className="bba-cell">
            <div className="bba-cell__label">Cadence</div>
            <div className="bba-cell__val" style={{ textTransform: 'capitalize' }}>
              {cadence}
            </div>
            <div className="bba-cell__sub">up to {max} per drop</div>
          </div>
        </div>

        <div className="bba-foot">
          <button
            ref={secondaryRef}
            type="button"
            className="bba-btn bba-btn--secondary"
            onClick={onClose}
          >
            Return to dashboard
          </button>
          <button
            ref={primaryRef}
            type="button"
            className="bba-btn bba-btn--primary"
            onClick={onBuildAnother}
          >
            Build another &rarr;
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
