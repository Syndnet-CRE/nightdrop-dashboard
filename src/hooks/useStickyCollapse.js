import { useEffect, useState } from 'react';

export function useStickyCollapse(threshold = 120) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let rafId = null;
    let lastY = window.scrollY;

    function tick() {
      rafId = null;
      const next = lastY >= threshold;
      setCollapsed((prev) => (prev === next ? prev : next));
    }
    function onScroll() {
      lastY = window.scrollY;
      if (rafId == null) rafId = requestAnimationFrame(tick);
    }

    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [threshold]);

  return collapsed;
}
