import { useEffect, useRef, useState } from 'react';

export function SectionNav({ sections }) {
  const [active, setActive] = useState(sections[0]?.id ?? null);
  const [expanded, setExpanded] = useState(false);
  const hoverTimer = useRef(null);

  useEffect(() => {
    if (!sections.length) return undefined;
    const elements = sections
      .map((s) => ({ id: s.id, el: document.getElementById(s.id) }))
      .filter((s) => s.el);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    elements.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  function jumpTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onKeyDown(e, index) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = sections[(index + 1) % sections.length];
      if (next) jumpTo(next.id);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = sections[(index - 1 + sections.length) % sections.length];
      if (prev) jumpTo(prev.id);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      jumpTo(sections[index].id);
    }
  }

  function handleMouseEnter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setExpanded(true);
  }
  function handleMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setExpanded(false), 200);
  }

  if (!sections.length) return null;

  return (
    <nav
      className={`dd-section-nav${expanded ? ' expanded' : ''}`}
      aria-label="Page sections"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ul className="dd-section-nav-list">
        {sections.map((s, i) => (
          <li key={s.id} className={`dd-section-nav-item${s.id === active ? ' active' : ''}`}>
            <button
              type="button"
              className="dd-section-nav-btn"
              onClick={() => jumpTo(s.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              aria-current={s.id === active ? 'location' : undefined}
              aria-label={s.label}
            >
              <span className="dd-section-nav-dot" aria-hidden="true" />
              <span className="dd-section-nav-label">{s.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
