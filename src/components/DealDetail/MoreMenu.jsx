import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, X, Link2 } from 'lucide-react';

export function MoreMenu({ onNotRelevant, isNotRelevant, onCopyLink }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="dd-more-menu">
      <button
        type="button"
        className="dd-more-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
      >
        <MoreHorizontal size={16} strokeWidth={2.2} />
      </button>
      {open && (
        <div className="dd-more-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className={`dd-more-item${isNotRelevant ? ' active' : ''}`}
            onClick={() => { setOpen(false); onNotRelevant(); }}
          >
            <X size={14} strokeWidth={2.2} />
            <span>{isNotRelevant ? 'Marked Not Relevant' : 'Not Relevant'}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="dd-more-item"
            onClick={() => { setOpen(false); onCopyLink(); }}
          >
            <Link2 size={14} strokeWidth={2.2} />
            <span>Copy link</span>
          </button>
        </div>
      )}
    </div>
  );
}
