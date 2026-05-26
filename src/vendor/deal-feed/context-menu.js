/* ============================================
   CONTEXT MENU + CONFIRM MODAL + CSV EXPORT
   Right-click anywhere in the table.
   Edit-confirmation gate for deal-row cells.
   ============================================ */

(function() {
  const ND = window.ND = window.ND || {};

  // ---------------------------------------------------------------------
  // CONFIRM MODAL — generic gate for destructive deal-row edits
  // ---------------------------------------------------------------------
  let confirmEl = null;
  let alwaysAllowEdit = false; // session-scoped "don't ask again"

  function ensureConfirmEl() {
    if (confirmEl) return confirmEl;
    confirmEl = document.createElement('div');
    confirmEl.className = 'cf-back';
    confirmEl.innerHTML = `
      <div class="cf-box">
        <h3 class="cf-title"></h3>
        <p class="cf-body"></p>
        <div class="cf-row">
          <label class="cf-remember" style="display:none">
            <input type="checkbox"/> Don't ask again this session
          </label>
          <button class="cf-btn cf-cancel">Cancel</button>
          <button class="cf-btn cf-confirm primary">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(confirmEl);
    return confirmEl;
  }

  function showConfirm({ title, body, confirmLabel = 'Confirm', danger = false, remember = false }) {
    const el = ensureConfirmEl();
    el.querySelector('.cf-title').textContent = title;
    el.querySelector('.cf-body').innerHTML = body;
    const ok = el.querySelector('.cf-confirm');
    ok.textContent = confirmLabel;
    ok.classList.toggle('danger', danger);
    ok.classList.toggle('primary', !danger);
    const remLabel = el.querySelector('.cf-remember');
    remLabel.style.display = remember ? 'flex' : 'none';
    const remCheckbox = remLabel.querySelector('input');
    remCheckbox.checked = false;
    el.classList.add('open');

    return new Promise(resolve => {
      const onCancel = () => { cleanup(); resolve(false); };
      const onConfirm = () => {
        if (remember && remCheckbox.checked) alwaysAllowEdit = true;
        cleanup(); resolve(true);
      };
      const onBack = e => { if (e.target === el) onCancel(); };
      const onKey  = e => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter') onConfirm(); };
      el.querySelector('.cf-cancel').addEventListener('click', onCancel);
      el.querySelector('.cf-confirm').addEventListener('click', onConfirm);
      el.addEventListener('click', onBack);
      document.addEventListener('keydown', onKey);
      function cleanup() {
        el.classList.remove('open');
        el.querySelector('.cf-cancel').removeEventListener('click', onCancel);
        el.querySelector('.cf-confirm').removeEventListener('click', onConfirm);
        el.removeEventListener('click', onBack);
        document.removeEventListener('keydown', onKey);
      }
    });
  }
  ND.showConfirm = showConfirm;

  // Hook called by selection.js when user tries to edit a .dr (buy-box) row cell
  ND.confirmEdit = function(tr, td) {
    if (alwaysAllowEdit) return true;
    const colKey = td.dataset.col;
    // notes / stage are designed to be edited; don't gate them
    if (colKey === 'notes' || colKey === 'stage' || colKey === 'quick') return true;

    const span = td.querySelector('[data-edit]');
    const current = span ? span.textContent.trim() : '';
    const colLabel = colLabelFor(colKey);
    const dealAddr = tr.querySelector('.am')?.textContent || 'this deal';
    return showConfirm({
      title: 'Edit buy-box data?',
      body: `You're about to edit <b>${colLabel}</b> on <b>${dealAddr}</b>.<br><br>
             Current value: <code>${current || '—'}</code><br><br>
             This row was generated from your buy-box criteria. Manual edits won't be
             reverted if the source data changes upstream.`,
      confirmLabel: 'Edit anyway',
      remember: true,
    });
  };

  // Hook called by selection.js when bulk-clearing a multi-cell selection that
  // touches deal rows.
  ND.confirmClear = function(n) {
    if (alwaysAllowEdit) return true;
    return showConfirm({
      title: `Clear ${n} cell${n === 1 ? '' : 's'} on buy-box deals?`,
      body: `You're clearing data on rows generated from your buy-box criteria.
             You won't be able to undo this once the buy box refreshes.`,
      confirmLabel: 'Clear',
      danger: true,
      remember: true,
    });
  };

  function colLabelFor(k) {
    const m = { score:'Score', address:'Address', date:'Date', asset:'Asset',
                psf:'$/SF', sf:'SF', owner:'Owner', hold:'Hold', signal:'Top signal',
                stage:'Stage', notes:'Notes', quick:'Quick actions' };
    return m[k] || k;
  }

  // ---------------------------------------------------------------------
  // CONTEXT MENU
  // ---------------------------------------------------------------------
  let menuEl = null;
  function ensureMenuEl() {
    if (menuEl) return menuEl;
    menuEl = document.createElement('div');
    menuEl.className = 'ctx-menu';
    menuEl.style.display = 'none';
    document.body.appendChild(menuEl);
    document.addEventListener('mousedown', e => {
      if (!menuEl.contains(e.target)) hide();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') hide();
    });
    return menuEl;
  }

  function show(x, y, target) {
    const el = ensureMenuEl();
    const items = buildItems(target);
    el.innerHTML = items.map(renderItem).join('');
    el.style.display = 'block';
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    // clamp inside viewport
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth - 8) el.style.left = (window.innerWidth - r.width - 8) + 'px';
      if (r.bottom > window.innerHeight - 8) el.style.top = (window.innerHeight - r.height - 8) + 'px';
    });
    // wire item handlers
    el.querySelectorAll('.ctx-item[data-act]').forEach(node => {
      if (node.classList.contains('disabled')) return;
      node.addEventListener('click', () => {
        const act = node.dataset.act;
        hide();
        ACTIONS[act]?.();
      });
    });
  }
  function hide() {
    if (!menuEl) return;
    menuEl.style.display = 'none';
  }
  ND.contextMenu = { show, hide };

  function renderItem(it) {
    if (it.divider) return '<div class="ctx-divider"></div>';
    const cls = ['ctx-item'];
    if (it.danger)   cls.push('danger');
    if (it.disabled) cls.push('disabled');
    return `<div class="${cls.join(' ')}" data-act="${it.act}">
      ${it.icon ? `<i class="ti ti-${it.icon}"></i>` : '<span style="width:16px"></span>'}
      <span>${it.label}</span>
      ${it.kbd ? `<span class="ctx-kbd">${it.kbd}</span>` : ''}
    </div>`;
  }

  // Build menu items based on current selection state
  function buildItems(target) {
    const S = ND.sheet;
    const rows = S?.selectedRows?.() || [];
    const realDealRows = rows.filter(r => {
      const row = S.rowAt(r);
      return row?.classList.contains('dr');
    });
    const nDeals = realDealRows.length;
    const singleDeal = nDeals === 1;
    const haveSel = rows.length > 0;

    const items = [];
    items.push({ act: 'export_sel', icon: 'download', label: `Export selected (${nDeals} ${nDeals === 1 ? 'deal' : 'deals'})`, disabled: nDeals === 0 });
    items.push({ act: 'export_all', icon: 'file-text', label: 'Export entire table (CSV)' });
    items.push({ divider: true });
    items.push({ act: 'copy_row', icon: 'copy', label: 'Copy', kbd: '⌘C', disabled: !haveSel });
    items.push({ divider: true });
    items.push({ act: 'mark_hot',   icon: 'flame',    label: 'Toggle hot',   disabled: nDeals === 0 });
    items.push({ act: 'mark_saved', icon: 'bookmark', label: 'Toggle saved', disabled: nDeals === 0 });
    items.push({ act: 'mark_read',  icon: 'check',    label: 'Mark as read', disabled: nDeals === 0 });
    items.push({ divider: true });
    items.push({ act: 'open_detail', icon: 'external-link', label: 'Open deal detail', disabled: !singleDeal });
    items.push({ divider: true });
    items.push({ act: 'delete_row', icon: 'trash', label: `Delete ${nDeals === 1 ? 'deal' : 'deals'}`, danger: true, disabled: nDeals === 0 });
    return items;
  }

  // ---------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------
  function selectedDeals() {
    const S = ND.sheet;
    if (!S?.selectedRows) return [];
    const rows = S.selectedRows();
    const ds = ND.deals || [];
    return rows.map(r => {
      const tr = S.rowAt(r);
      if (!tr?.classList.contains('dr')) return null;
      const id = tr.dataset.id;
      return ds.find(x => String(x.id) === String(id));
    }).filter(Boolean);
  }

  function todayDeals() {
    const day = ND.state?.activeDay;
    return (ND.deals || []).filter(d => d.deliveredOn === day);
  }

  const CSV_COLS = [
    { key: 'score',   label: 'Score' },
    { key: 'addr',    label: 'Address' },
    { key: 'city',    label: 'City' },
    { key: 'date',    label: 'Delivered' },
    { key: 'asset',   label: 'Asset type' },
    { key: 'psf',     label: '$/SF' },
    { key: 'sf',      label: 'SF' },
    { key: 'owner',   label: 'Owner type' },
    { key: 'hold',    label: 'Hold (yrs)' },
    { key: 'sig',     label: 'Top signal' },
    { key: 'stage',   label: 'Stage' },
    { key: 'notes',   label: 'Notes' },
    { key: 'saved',   label: 'Saved' },
    { key: 'hot',     label: 'Hot' },
    { key: 'up',      label: 'Interested' },
  ];

  function csvCell(v) {
    if (v === undefined || v === null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }

  function dealsToCSV(deals) {
    const header = CSV_COLS.map(c => csvCell(c.label)).join(',');
    const rows = deals.map(d => CSV_COLS.map(c => {
      const v = d[c.key];
      if (typeof v === 'boolean') return v ? 'Yes' : 'No';
      return csvCell(v);
    }).join(','));
    return [header, ...rows].join('\r\n');
  }

  function download(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  function toast(msg) {
    let t = document.getElementById('cm-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'cm-toast';
      t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:var(--surf-hi-2,#1c1d1f);border:1px solid var(--accent);color:var(--fg);
        padding:9px 16px;border-radius:6px;font-size:12px;z-index:9999;
        box-shadow:0 8px 28px rgba(0,0,0,.6);transition:opacity .2s ease,transform .2s ease;
        opacity:0;`;
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2400);
  }
  ND.toast = toast;

  const ACTIONS = {
    export_sel() {
      const deals = selectedDeals();
      if (!deals.length) return;
      const day = (ND.state?.activeDay || 'feed').replace(/[^\w-]/g, '');
      download(`nightdrop-${day}-selected.csv`, dealsToCSV(deals));
      toast(`Exported ${deals.length} deal${deals.length===1?'':'s'} to CSV`);
    },
    export_all() {
      const deals = todayDeals();
      if (!deals.length) { toast('Nothing to export for this day'); return; }
      const day = (ND.state?.activeDay || 'feed').replace(/[^\w-]/g, '');
      download(`nightdrop-${day}-all.csv`, dealsToCSV(deals));
      toast(`Exported ${deals.length} deal${deals.length===1?'':'s'} to CSV`);
    },
    copy_row() {
      // Build a TSV (tab-separated) blob from currently-selected cells.
      const S = ND.sheet;
      if (!S?.a) return;
      const rows = S.selectedRows();
      if (!rows.length) return;
      const lines = rows.map(r => {
        const tr = S.rowAt(r);
        if (!tr) return '';
        if (tr.classList.contains('dr')) {
          const id = tr.dataset.id;
          const d = (ND.deals||[]).find(x => String(x.id) === String(id));
          if (!d) return '';
          return CSV_COLS.map(c => d[c.key] ?? '').join('\t');
        }
        // empty rows: read raw text
        return [...tr.querySelectorAll('td[data-c]')].map(td => td.textContent.trim()).join('\t');
      });
      navigator.clipboard?.writeText(lines.join('\n'));
      toast(`Copied ${rows.length} row${rows.length===1?'':'s'}`);
    },
    mark_hot()   {
      selectedDeals().forEach(d => ND.actions?.toggleHot?.(d.id, d.hot ? 'hot' : null));
      toast('Toggled hot');
    },
    mark_saved() {
      selectedDeals().forEach(d => ND.actions?.toggleSave?.(d.id, d.saved));
      toast('Toggled saved');
    },
    mark_read()  {
      selectedDeals().forEach(d => ND.actions?.markRead?.(d.id));
      toast('Marked as read');
    },
    open_detail() {
      const deals = selectedDeals();
      if (deals.length !== 1) return;
      ND.actions?.openDetail?.(deals[0].id);
    },
    async delete_row() {
      const deals = selectedDeals();
      if (!deals.length) return;
      const ok = await showConfirm({
        title: `Delete ${deals.length} deal${deals.length===1?'':'s'}?`,
        body: `These deals will be removed from your feed. You can restore them from your buy-box archive.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;
      deals.forEach(d => ND.actions?.deleteDeal?.(d.id));
      ND.sheet?.clear?.();
      toast(`Deleted ${deals.length} deal${deals.length===1?'':'s'}`);
    },
  };
})();
