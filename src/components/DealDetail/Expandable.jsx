// "View Full X →" inline expand toggle used by every data panel on the
// deal detail page. Pure stateless component — each consuming card owns
// its own useState(false) for openness so this file stays component-only
// and doesn't trip the fast-refresh / hooks-from-component-file rule.

export function ExpandToggle({ open, onToggle, summaryLabel, expandedLabel = 'Show less' }) {
  return (
    <button
      type="button"
      className="dd-expand-toggle"
      onClick={onToggle}
      aria-expanded={open}
    >
      {open ? `${expandedLabel} ↑` : `${summaryLabel} →`}
    </button>
  );
}
