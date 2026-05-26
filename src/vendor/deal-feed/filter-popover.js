/* ============================================
   FILTER POPOVER — Google Sheets style
   Search + Sort A→Z / Z→A (or smallest→largest for numeric)
   + per-value checkboxes + Clear filter.
   Pinned to the trigger element via viewport coords;
   detached from #tw so it never scrolls away.
   ============================================ */

(function() {
  const ND = window.ND = window.ND || {};

  // Column meta — which deal field, label, numeric?
  const COL_META = {
    score:   { field: 'score', label: 'Score',     numeric: true  },
    address: { field: 'addr',  label: 'Address',   numeric: false },
    date:    { field: 'date',  label: 'Date',      numeric: false },
    asset:   { field: 'asset', label: 'Asset',     numeric: false },
    psf:     { field: 'psf',   label: '$/SF',      numeric: true  },
    sf:      { field: 'sf',    label: 'SF',        numeric: true  },
    owner:   { field: 'owner', label: 'Owner',     numeric: false },
    hold:    { field: 'hold',  label: 'Hold',      numeric: false },
    signal:  { field: 'sig',   label: 'Top signal',numeric: false },
    stage:   { field: 'stage', label: 'Stage',     numeric: false },
    notes:   { field: 'notes', label: 'Notes',     numeric: false },
  };
  // Legacy key aliases used by the old filter system
  const KEY_ALIAS = { addr: 'address' };

  // ---------------------------------------------------------------------
  // STATE
  //   ND.colFilter[key]  = Set<string> | null     (allowed values; null = all)
  //   ND.colSort         = { key, dir } | null
  // ---------------------------------------------------------------------
  ND.colFilter = ND.colFilter || {};
  ND.colSort   = ND.colSort   || null;

  function uniqueValues(field) {
    const seen = new Set();
    (ND.deals || []).forEach(d => {
      const v = d[field];
      if (v === undefined || v === null || v === '') seen.add('(Blank)');
      else seen.add(String(v));
    });
    // also pull from active-day stubs if present
    const activeDeals = ND._activeDayDeals?.() || [];
    activeDeals.forEach(d => {
      const v = d[field];
      if (v === undefined || v === null || v === '') seen.add('(Blank)');
      else seen.add(String(v));
    });
    return [...seen];
  }

  // ---------------------------------------------------------------------
  // POPOVER DOM
  // ---------------------------------------------------------------------
  let popEl = null;
  let activeKey = null;

  function ensureEl() {
    if (popEl) return popEl;
    popEl = document.createElement('div');
    popEl.className = 'filter-pop';
    popEl.style.display = 'none';
    document.body.appendChild(popEl);

    document.addEventListener('mousedown', e => {
      if (!popEl) return;
      if (popEl.style.display === 'none') return;
      if (popEl.contains(e.target)) return;
      if (e.target.closest?.('.tri')) return; // re-toggling
      hide();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && popEl?.style.display === 'block') hide();
    });
    window.addEventListener('resize', () => {
      if (popEl?.style.display === 'block' && activeKey) reposition();
    });
    // close on horizontal scroll of the table (column has moved)
    document.getElementById('tw')?.addEventListener('scroll', () => {
      if (popEl?.style.display === 'block') reposition();
    });
    return popEl;
  }

  // ---------------------------------------------------------------------
  // BUILD + RENDER
  // ---------------------------------------------------------------------
  function show(key, triggerEl) {
    activeKey = KEY_ALIAS[key] || key;
    const meta = COL_META[activeKey];
    if (!meta) return;
    const el = ensureEl();

    const allValues = uniqueValues(meta.field).sort((a, b) =>
      meta.numeric ? parseFloat(a) - parseFloat(b) : a.localeCompare(b)
    );
    const filter = ND.colFilter[activeKey];

    const isChecked = v => !filter || filter.has(v);
    const totalChecked = allValues.filter(isChecked).length;
    const allOn  = totalChecked === allValues.length;
    const someOn = totalChecked > 0 && !allOn;

    el.innerHTML = `
      <div class="fp-head">
        <div class="fp-title">${meta.label}</div>
        <button class="fp-close" aria-label="Close">×</button>
      </div>
      <div class="fp-sort">
        <button class="fp-sortbtn" data-dir="asc">
          <i class="ti ti-${meta.numeric ? 'sort-ascending-numbers' : 'sort-a-z'}"></i>
          ${meta.numeric ? 'Sort A → Z (smallest first)' : 'Sort A → Z'}
        </button>
        <button class="fp-sortbtn" data-dir="desc">
          <i class="ti ti-${meta.numeric ? 'sort-descending-numbers' : 'sort-z-a'}"></i>
          ${meta.numeric ? 'Sort Z → A (largest first)' : 'Sort Z → A'}
        </button>
      </div>
      <div class="fp-search">
        <i class="ti ti-search"></i>
        <input class="fp-search-input" type="text" placeholder="Search…" autocomplete="off" />
      </div>
      <div class="fp-list">
        <label class="fp-all">
          <input type="checkbox" class="fp-all-cb" ${allOn ? 'checked' : ''} ${someOn ? 'data-indeterminate="1"' : ''}/>
          <span>(Select all)</span>
          <span class="fp-count">${totalChecked} / ${allValues.length}</span>
        </label>
        <div class="fp-options">
          ${allValues.map(v => `
            <label class="fp-opt" data-val="${escAttr(v)}">
              <input type="checkbox" ${isChecked(v) ? 'checked' : ''} />
              <span class="fp-opt-text">${escHtml(v)}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="fp-foot">
        <button class="fp-btn fp-clear-btn">Clear filter</button>
        <button class="fp-btn fp-done primary">Done</button>
      </div>
    `;
    el.style.display = 'block';
    reposition(triggerEl);
    wireHandlers(allValues);

    // set indeterminate state of the (Select all) checkbox
    const allCb = el.querySelector('.fp-all-cb');
    if (allCb) allCb.indeterminate = someOn;

    // focus search after render
    setTimeout(() => el.querySelector('.fp-search-input')?.focus({ preventScroll: true }), 0);
  }
  ND.filterPopover = { show, hide };

  function reposition(triggerEl) {
    if (!popEl || !activeKey) return;
    const trig = triggerEl || document.querySelector(`.tri[data-key="${activeKey}"], .tri[data-key="${aliasReverse(activeKey)}"]`);
    if (!trig) { hide(); return; }
    const tr = trig.getBoundingClientRect();
    const pr = popEl.getBoundingClientRect();
    const margin = 6;
    let left = tr.left;
    let top  = tr.bottom + margin;
    // clamp inside viewport
    if (left + pr.width > window.innerWidth - 8) left = window.innerWidth - pr.width - 8;
    if (left < 8) left = 8;
    if (top + pr.height > window.innerHeight - 8) {
      // flip above the trigger
      top = tr.top - pr.height - margin;
      if (top < 8) top = 8;
    }
    popEl.style.position = 'fixed';
    popEl.style.left = left + 'px';
    popEl.style.top  = top  + 'px';
  }

  function aliasReverse(longKey) {
    // map 'address' -> 'addr' for the old tri data-key on the Address column
    return longKey === 'address' ? 'addr' : longKey;
  }

  function hide() {
    if (!popEl) return;
    popEl.style.display = 'none';
    activeKey = null;
  }

  function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }
  function escHtml(s) { return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  // ---------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------
  function wireHandlers(allValues) {
    const el = popEl;
    el.querySelector('.fp-close').addEventListener('click', hide);
    el.querySelector('.fp-done').addEventListener('click', hide);

    el.querySelectorAll('.fp-sortbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        ND.colSort = { key: activeKey, dir: btn.dataset.dir };
        ND._rr?.();
        // re-paint the trigger as "on" via existing class
        markTriOn(activeKey, true);
        hide();
      });
    });

    el.querySelector('.fp-clear-btn').addEventListener('click', () => {
      delete ND.colFilter[activeKey];
      markTriOn(activeKey, false);
      ND._rr?.();
      hide();
    });

    // Search filters the visible options
    const search = el.querySelector('.fp-search-input');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      el.querySelectorAll('.fp-opt').forEach(opt => {
        const v = opt.dataset.val.toLowerCase();
        opt.style.display = (!q || v.includes(q)) ? 'flex' : 'none';
      });
    });

    // (Select all) toggles ALL options that are currently visible
    const allCb = el.querySelector('.fp-all-cb');
    allCb.addEventListener('change', () => {
      const visible = [...el.querySelectorAll('.fp-opt')].filter(o => o.style.display !== 'none');
      visible.forEach(opt => {
        opt.querySelector('input').checked = allCb.checked;
      });
      applyFilter();
    });

    // Individual checkbox change
    el.querySelectorAll('.fp-opt input').forEach(cb => {
      cb.addEventListener('change', applyFilter);
    });

    function applyFilter() {
      const checkedVals = [...el.querySelectorAll('.fp-opt input:checked')]
        .map(cb => cb.closest('.fp-opt').dataset.val);
      if (checkedVals.length === allValues.length) {
        delete ND.colFilter[activeKey];
        markTriOn(activeKey, false);
      } else {
        ND.colFilter[activeKey] = new Set(checkedVals);
        markTriOn(activeKey, true);
      }
      // refresh (Select all) state
      const total = el.querySelectorAll('.fp-opt input').length;
      const checked = checkedVals.length;
      allCb.checked = checked === total;
      allCb.indeterminate = checked > 0 && checked < total;
      el.querySelector('.fp-count').textContent = `${checked} / ${total}`;
      ND._rr?.();
    }
  }

  // Refresh a column's triangle: green if filter OR sort is active,
  // and adopt asc/desc direction if the column is the active sort.
  function refreshTri(key) {
    const aliases = [key, aliasReverse(key)].filter(Boolean);
    const hasFilter = !!(ND.colFilter[key] || ND.colFilter[aliasReverse(key)]);
    const sortMatches = !!(ND.colSort && (ND.colSort.key === key || aliasReverse(ND.colSort.key) === key));
    aliases.forEach(k => {
      document.querySelectorAll(`.tri[data-key="${k}"]`).forEach(t => {
        t.classList.remove('asc', 'desc');
        if (hasFilter || sortMatches) t.classList.add('on');
        else                          t.classList.remove('on');
        if (sortMatches) t.classList.add(ND.colSort.dir === 'asc' ? 'asc' : 'desc');
      });
    });
  }
  function refreshAllTris() {
    document.querySelectorAll('.tri[data-key]').forEach(t => refreshTri(t.dataset.key));
  }
  function markTriOn(key /*, on*/) { refreshTri(key); refreshAllTris(); }
  ND.markTriOn = markTriOn;
  ND.refreshAllTris = refreshAllTris;

  // ---------------------------------------------------------------------
  // FILTER + SORT APPLIED INSIDE gf() VIA HOOK
  // feed.js's gf() reads ND.colFilter / ND.colSort if present.
  // ---------------------------------------------------------------------
  ND.applyColFilters = function(deals) {
    let out = deals;
    Object.entries(ND.colFilter || {}).forEach(([key, set]) => {
      const meta = COL_META[KEY_ALIAS[key] || key];
      if (!meta || !set) return;
      out = out.filter(d => {
        const v = d[meta.field];
        const sv = (v === undefined || v === null || v === '') ? '(Blank)' : String(v);
        return set.has(sv);
      });
    });
    return out;
  };

  ND.applyColSort = function(deals) {
    if (!ND.colSort) return deals;
    const meta = COL_META[KEY_ALIAS[ND.colSort.key] || ND.colSort.key];
    if (!meta) return deals;
    const dir = ND.colSort.dir === 'desc' ? -1 : 1;
    const copy = deals.slice();
    copy.sort((a, b) => {
      const va = a[meta.field], vb = b[meta.field];
      if (meta.numeric) return dir * ((parseFloat(va) || 0) - (parseFloat(vb) || 0));
      return dir * String(va || '').localeCompare(String(vb || ''));
    });
    return copy;
  };
})();
