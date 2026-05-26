/* ============================================
   ROW RESIZE — drag the bottom edge of any row's
   gutter cell to change that row's height.
   Per-row min/max; persisted to localStorage.

   Limits:
     .dr (buy-box deals): 36..120 px
     .empty-row:          28..200 px
   ============================================ */

(function() {
  const ND = window.ND = window.ND || {};

  const LIMITS = {
    dr:    { min: 36, max: 120 },
    empty: { min: 28, max: 200 },
  };
  const STORE_KEY = 'nd:rowheights:v1';

  let heights = {};
  try { heights = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (_) { heights = {}; }

  function rowKind(tr) {
    if (tr.classList.contains('dr')) return 'dr';
    if (tr.classList.contains('empty-row')) return 'empty';
    return null;
  }
  function rowKey(tr) {
    const kind = rowKind(tr);
    if (kind === 'dr')    return 'dr:' + tr.dataset.id;
    if (kind === 'empty') return 'empty:' + (ND.state?.activeDay || 'x') + ':' + tr.dataset.empty;
    return null;
  }

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(heights)); } catch (_) {}
  }

  function applyHeight(tr, h) {
    tr.style.height = h + 'px';
    tr.querySelectorAll('td').forEach(td => { td.style.height = h + 'px'; });
    tr.querySelectorAll('.cell-edit').forEach(s => { s.style.lineHeight = h + 'px'; });
  }

  function applyAll() {
    const tbody = document.getElementById('tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr.dr, tr.empty-row').forEach(tr => {
      const key = rowKey(tr);
      if (!key) return;
      const h = heights[key];
      if (h) applyHeight(tr, h);
      ensureHandle(tr);
    });
  }

  function ensureHandle(tr) {
    const g = tr.querySelector('td.gutter');
    if (!g) return;
    if (g.querySelector('.row-resize')) return;
    const h = document.createElement('div');
    h.className = 'row-resize';
    g.style.position = g.style.position || 'sticky'; // keep sticky if already set
    g.appendChild(h);
  }

  ND.rowResize = { apply: applyAll, heights };

  // --- Drag handling -----------------------------------------------------
  let drag = null;

  document.addEventListener('mousedown', e => {
    const h = e.target.closest?.('.row-resize');
    if (!h) return;
    const tr = h.closest('tr');
    const td = h.closest('td');
    if (!tr || !td) return;
    const kind = rowKind(tr);
    if (!kind) return;

    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startH = tr.getBoundingClientRect().height;
    drag = { tr, td, startY, startH, kind };
    document.body.classList.add('is-row-resizing');
  }, true);

  document.addEventListener('mousemove', e => {
    if (!drag) return;
    const lim = LIMITS[drag.kind];
    let h = Math.round(drag.startH + (e.clientY - drag.startY));
    h = Math.max(lim.min, Math.min(lim.max, h));
    applyHeight(drag.tr, h);
    // keep selection overlay aligned while dragging
    ND.sheet?.paint?.();
  });

  document.addEventListener('mouseup', () => {
    if (!drag) return;
    const { tr } = drag;
    const newH = parseInt(tr.style.height, 10);
    const key = rowKey(tr);
    if (key && newH) { heights[key] = newH; persist(); }
    document.body.classList.remove('is-row-resizing');
    drag = null;
    // Re-paint selection overlay after final commit
    ND.sheet?.paint?.();
  });

  // --- Hook into render --------------------------------------------------
  // After each main render, re-attach handles + reapply persisted heights.
  function wireAfterRender() {
    const orig = ND.sheet?.afterRender;
    if (orig && !ND.sheet._rowResizeWired) {
      ND.sheet.afterRender = function() {
        orig.apply(this, arguments);
        applyAll();
      };
      ND.sheet._rowResizeWired = true;
    }
    // also fire on first install in case render already happened
    applyAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAfterRender);
  } else {
    wireAfterRender();
  }
})();
