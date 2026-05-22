import { useState, useRef, useEffect } from 'react';
import { Inbox, Mail, Star, Flame, ChevronDown } from 'lucide-react';

const FILTERS = [
  { id: 'all',    label: 'All',    Icon: Inbox },
  { id: 'unread', label: 'Unread', Icon: Mail },
  { id: 'saved',  label: 'Saved',  Icon: Star },
  { id: 'hot',    label: 'Hot',    Icon: Flame },
];

const SORTS = [
  { id: 'recency',  label: 'Recency' },
  { id: 'score',    label: 'Score' },
  { id: 'distress', label: 'Distress' },
  { id: 'value',    label: 'Value' },
];

export default function FeedToolbar({ filter, setFilter, counts, sort, setSort }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const activeSort = SORTS.find(s => s.id === sort) || SORTS[0];

  return (
    <div className="feed-toolbar">
      <div className="feed-toolbar-filters">
        {FILTERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`feed-filter-chip${filter === id ? ' active' : ''}`}
            onClick={() => setFilter(id)}
          >
            <Icon size={13} />
            <span>{label}</span>
            <span className="feed-filter-chip-count">{counts?.[id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="feed-toolbar-sort" ref={wrapRef}>
        <button
          className="feed-sort-btn"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <span className="feed-sort-label">Sort:</span>
          <span className="feed-sort-value">{activeSort.label}</span>
          <ChevronDown size={14} />
        </button>
        {open && (
          <div className="feed-sort-menu" role="menu">
            {SORTS.map(({ id, label }) => (
              <button
                key={id}
                role="menuitem"
                className={`feed-sort-item${sort === id ? ' active' : ''}`}
                onClick={() => { setSort(id); setOpen(false); }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
