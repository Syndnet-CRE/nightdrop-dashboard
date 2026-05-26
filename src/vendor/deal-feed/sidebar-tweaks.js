/* ============================================
   SIDEBAR TWEAKS PANEL
   Live preview of collapsed-sidebar design styles
   and brand logo variants.

   Style A — Minimal (default)
   Style B — Pill-style active
   Style C — Side accent bar

   Logo 1 — current download arrow
   Logo 2 — bold "N" monogram
   Logo 3 — filled moon glyph
   Logo 4 — green dot only (no inner glyph)
   Logo 5 — outlined moon

   Selection persists to localStorage.
   ============================================ */

(function() {
  const STORE_KEY = 'nd:sidebar-tweaks:v2';
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const DEFAULTS = /*EDITMODE-BEGIN*/{
    "sidebarStyle": "C",
    "sidebarLogo": "1"
  }/*EDITMODE-END*/;

  let state = { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    state = { ...state, ...saved };
  } catch (_) {}

  const STYLE_LABEL = { C: 'Side accent bar (locked in)' };
  const LOGO_LABEL  = { '1': 'Current download arrow', '2': '"N" monogram', '3': 'Filled moon', '4': 'Green dot only', '5': 'Outlined moon' };

  function apply() {
    sidebar.dataset.style = state.sidebarStyle;
    sidebar.dataset.logo  = state.sidebarLogo;
    const brandMark = sidebar.querySelector('.brand-mark');
    if (!brandMark) return;
    // Inject the right inner mark for the selected logo.
    const logo = String(state.sidebarLogo);
    if (logo === '1') {
      brandMark.innerHTML = '<i class="ti ti-download"></i>';
    } else if (logo === '2') {
      brandMark.innerHTML = '<span class="brand-mono">N</span>';
    } else if (logo === '3') {
      brandMark.innerHTML = '<i class="ti ti-moon"></i>';
    } else if (logo === '4') {
      brandMark.innerHTML = '';
    } else if (logo === '5') {
      brandMark.innerHTML = '<i class="ti ti-moon"></i>';
    }
    if (window.lucide?.createIcons) {
      try { window.lucide.createIcons({ attrs: { 'stroke-width': '1.75', class: 'lucide' } }, brandMark); } catch (_) {}
    }
  }

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function setTweak(key, val) {
    state[key] = val;
    persist();
    apply();
    renderPanel();
  }

  // ---------------------------------------------------------------------
  // Tweaks panel UI — floating, opens via host's __activate_edit_mode.
  // ---------------------------------------------------------------------
  let panel;
  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'sidebar-tweaks';
    panel.className = 'sb-tweaks';
    document.body.appendChild(panel);
    return panel;
  }

  function renderPanel() {
    const el = ensurePanel();
    el.innerHTML = `
      <div class="sbt-head">
        <div class="sbt-title">Sidebar tweaks</div>
        <button class="sbt-close" type="button" aria-label="Close">\u00d7</button>
      </div>
      <div class="sbt-section">
        <div class="sbt-label">Design style</div>
        <div class="sbt-row">
          ${['C'].map(s => `<button class="sbt-opt ${state.sidebarStyle === s ? 'on' : ''}" data-set-style="${s}">${s}</button>`).join('')}
        </div>
        <div class="sbt-sub">${STYLE_LABEL[state.sidebarStyle] || STYLE_LABEL.C}</div>
      </div>
      <div class="sbt-section">
        <div class="sbt-label">Brand logo</div>
        <div class="sbt-row">
          ${['1','2','3','4','5'].map(n => `<button class="sbt-opt ${String(state.sidebarLogo) === n ? 'on' : ''}" data-set-logo="${n}">${n}</button>`).join('')}
        </div>
        <div class="sbt-sub">${LOGO_LABEL[String(state.sidebarLogo)]}</div>
      </div>
      <div class="sbt-foot">
        <span class="sbt-hint">Persists across reloads</span>
      </div>
    `;
    el.querySelector('.sbt-close').addEventListener('click', hide);
    el.querySelectorAll('[data-set-style]').forEach(b =>
      b.addEventListener('click', () => setTweak('sidebarStyle', b.dataset.setStyle)));
    el.querySelectorAll('[data-set-logo]').forEach(b =>
      b.addEventListener('click', () => setTweak('sidebarLogo', b.dataset.setLogo)));
  }

  function show() {
    renderPanel();
    panel.classList.add('open');
  }
  function hide() {
    panel?.classList.remove('open');
    try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (_) {}
  }

  // Register listener FIRST, then announce availability.
  window.addEventListener('message', e => {
    const t = e.data?.type;
    if (t === '__activate_edit_mode')   show();
    if (t === '__deactivate_edit_mode') hide();
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (_) {}

  // Apply initial state immediately so the page reflects saved selections.
  apply();
})();
