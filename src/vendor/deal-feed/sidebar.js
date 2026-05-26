/* ============================================
   COLLAPSIBLE SIDEBAR
   Chevron toggle pinned to the right edge of the sidebar.
   Collapsed: 64px-wide rail with icon-only nav, stat icons,
   buy-box chip avatars, and a red dot for the 99+ badge.
   State persists in localStorage; sheet animates into freed space.
   ============================================ */

(function() {
  const STORE_KEY = 'nd:sidebar-collapsed:v1';
  const app    = document.getElementById('app');
  const toggle = document.getElementById('sb-toggle');
  if (!app || !toggle) return;

  function setCollapsed(collapsed) {
    app.classList.toggle('sidebar-collapsed', !!collapsed);
    toggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    try { localStorage.setItem(STORE_KEY, collapsed ? '1' : '0'); } catch (_) {}
    // After the grid-template-columns transition (220ms) settles, repaint
    // the selection overlay so its absolute rect aligns with the new column.
    setTimeout(() => { window.ND?.sheet?.paint?.(); }, 240);
  }

  // Restore on load
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch (_) {}
  if (saved === '1') setCollapsed(true);

  toggle.addEventListener('click', () => {
    setCollapsed(!app.classList.contains('sidebar-collapsed'));
  });

  // Keyboard shortcut: Cmd/Ctrl + \ to toggle (Notion convention)
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
      e.preventDefault();
      setCollapsed(!app.classList.contains('sidebar-collapsed'));
    }
  });
})();
