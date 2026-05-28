/* ============================================
   SHEET SELECTION ENGINE
   Sheets/Excel-style: cell, row, column, range,
   multi-range (Cmd-click), keyboard nav, edit
   triggers, right-click integration hook.
   ============================================ */

(function() {
  const ND = window.ND = window.ND || {};

  // --- Selection state ---------------------------------------------------
  // Coords: r = 0..lastR (only .dr / .empty-row rows are addressable)
  //         c = 0..11   (data columns A..L; gutter is excluded)
  const S = {
    a:    null,  // anchor {r, c}
    f:    null,  // focus  {r, c}
    mode: 'cell',// 'cell' | 'row' | 'col' | 'all'
    extras: [],  // [{a, f, mode}]  -- additional Cmd-click ranges
    editing: null, // {r, c} when in edit mode
  };
  ND.sheet = S;

  // --- DOM helpers -------------------------------------------------------
  const $tw     = () => document.getElementById('tw');
  const $tbody  = () => document.getElementById('tbody');
  const $thead  = () => document.querySelector('#grid thead');
  const $overlay = () => document.getElementById('sel-overlay');

  function lastR() {
    const rows = $tbody().querySelectorAll('tr[data-r]');
    return rows.length - 1;
  }
  function lastC() { return 11; } // 12 data columns (A..L), 0-indexed

  function cellAt(r, c) {
    return $tbody().querySelector(`tr[data-r="${r}"] td[data-c="${c}"]`);
  }
  function rowAt(r) {
    return $tbody().querySelector(`tr[data-r="${r}"]`);
  }

  // Sort selection box: returns {r1,c1,r2,c2}
  function box({a, f}) {
    return {
      r1: Math.min(a.r, f.r), r2: Math.max(a.r, f.r),
      c1: Math.min(a.c, f.c), c2: Math.max(a.c, f.c),
    };
  }

  // Returns array of all (r,c) cells in current selection (anchor + extras)
  function cells() {
    const all = [];
    [{a:S.a,f:S.f}, ...S.extras].forEach(rng => {
      if (!rng.a) return;
      const b = box(rng);
      for (let r=b.r1; r<=b.r2; r++)
        for (let c=b.c1; c<=b.c2; c++)
          all.push({r, c});
    });
    return all;
  }

  // Returns array of unique selected row indices
  ND.sheet.selectedRows = function() {
    const set = new Set();
    [{a:S.a,f:S.f}, ...S.extras].forEach(rng => {
      if (!rng.a) return;
      const b = box(rng);
      for (let r=b.r1; r<=b.r2; r++) set.add(r);
    });
    return [...set].sort((x,y)=>x-y);
  };

  // --- Setters -----------------------------------------------------------
  function markReadAtRow(r) {
    const tr = rowAt(r);
    const id = tr?.dataset?.id;
    if (id && tr?.classList?.contains('dr')) {
      ND.actions?.markRead?.(id);
    }
  }
  function setCell(r, c)       { S.a = {r,c}; S.f = {r,c}; S.mode = 'cell'; S.extras = []; paint(); markReadAtRow(r); }
  function setRow(r)           { S.a = {r,c:0}; S.f = {r,c:lastC()}; S.mode = 'row'; S.extras = []; paint(); markReadAtRow(r); }
  function setRowRange(r1, r2) { S.a = {r:r1,c:0}; S.f = {r:r2,c:lastC()}; S.mode = 'row'; S.extras = []; paint(); }
  function setCol(c)           { S.a = {r:0,c}; S.f = {r:lastR(),c}; S.mode = 'col'; S.extras = []; paint(); }
  function setColRange(c1, c2) { S.a = {r:0,c:c1}; S.f = {r:lastR(),c:c2}; S.mode = 'col'; S.extras = []; paint(); }
  function setAll()            { S.a = {r:0,c:0}; S.f = {r:lastR(),c:lastC()}; S.mode = 'all'; S.extras = []; paint(); }
  function clear()             { S.a = null; S.f = null; S.extras = []; S.mode='cell'; paint(); }

  function extendTo(r, c) {
    if (!S.a) { setCell(r,c); return; }
    if (S.mode === 'row')      S.f = {r, c: lastC()};
    else if (S.mode === 'col') S.f = {r: lastR(), c};
    else                       S.f = {r, c};
    paint();
  }
  function addCell(r, c)       { S.extras.push({a:{r,c}, f:{r,c}, mode:'cell'}); paint(); }
  function addRow(r)           { S.extras.push({a:{r,c:0}, f:{r,c:lastC()}, mode:'row'}); paint(); }
  function addCol(c)           { S.extras.push({a:{r:0,c}, f:{r:lastR(),c}, mode:'col'}); paint(); }

  Object.assign(S, { setCell, setRow, setRowRange, setCol, setColRange, setAll, clear, extendTo, addCell, addRow, addCol, cellAt, rowAt, lastR, lastC });

  // --- Paint -------------------------------------------------------------
  function paint() {
    const ov = $overlay();
    if (!ov) return;
    ov.innerHTML = '';

    // remove cell/row/col flags
    $tbody().querySelectorAll('.sel-in, .sel-anchor').forEach(el => el.classList.remove('sel-in','sel-anchor'));
    document.querySelectorAll('.gutter-on, .col-on, .corner-on').forEach(el => el.classList.remove('gutter-on','col-on','corner-on'));

    if (!S.a) return;

    const ranges = [{a:S.a, f:S.f, mode:S.mode}, ...S.extras];

    ranges.forEach((rng, idx) => {
      const isPrimary = idx === 0;
      drawRange(ov, rng, isPrimary);
    });

    if (S.mode === 'all') document.querySelector('th.gutter-corner')?.classList.add('corner-on');

    updateCellAddr();
  }

  // --- Name Box (top-left corner cell address indicator) ---------------
  function updateCellAddr() {
    const el = document.getElementById('cellAddr');
    if (!el) return;
    if (!S.a) { el.textContent = ''; return; }

    const b = box({a: S.a, f: S.f});
    const letter = c => String.fromCharCode(65 + c);

    // While the user is mid-drag with at least one of dim > 1, show "NR x NC"
    if (mouseDown && dragOrigin && (b.r2 > b.r1 || b.c2 > b.c1)) {
      el.textContent = `${b.r2 - b.r1 + 1}R \u00d7 ${b.c2 - b.c1 + 1}C`;
      return;
    }

    if (S.mode === 'all') { el.textContent = ''; return; }
    if (S.mode === 'cell' && b.r1 === b.r2 && b.c1 === b.c2) {
      el.textContent = `${letter(b.c1)}${b.r1 + 1}`;
      return;
    }
    if (S.mode === 'row') {
      el.textContent = `${letter(0)}${b.r1 + 1}:${letter(lastC())}${b.r2 + 1}`;
      return;
    }
    if (S.mode === 'col') {
      el.textContent = `${letter(b.c1)}1:${letter(b.c2)}${lastR() + 1}`;
      return;
    }
    el.textContent = `${letter(b.c1)}${b.r1 + 1}:${letter(b.c2)}${b.r2 + 1}`;
  }
  ND.sheet.updateCellAddr = updateCellAddr;

  function drawRange(ov, rng, isPrimary) {
    const b = box(rng);
    const tl = cellAt(b.r1, b.c1);
    const br = cellAt(b.r2, b.c2);
    if (!tl || !br) return;

    // mark cells with .sel-in for fill + hide internal dividers
    for (let r=b.r1; r<=b.r2; r++) {
      for (let c=b.c1; c<=b.c2; c++) {
        cellAt(r, c)?.classList.add('sel-in');
      }
      rowAt(r)?.querySelector('td.gutter')?.classList.add('gutter-on');
    }
    for (let c=b.c1; c<=b.c2; c++) {
      const letter = String.fromCharCode(65 + c);
      document.querySelectorAll(`#grid thead th[data-letter="${letter}"], #grid thead th[data-col-c="${c}"]`)
        .forEach(th => th.classList.add('col-on'));
    }

    // anchor cell (only for primary range; non-cell modes don't get anchor dot)
    if (isPrimary && S.a && S.mode === 'cell') {
      cellAt(S.a.r, S.a.c)?.classList.add('sel-anchor');
    }

    // overlay rect — positioned relative to #tw, will scroll with content
    const twEl = $tw();
    const twR  = twEl.getBoundingClientRect();
    const tlR  = tl.getBoundingClientRect();
    const brR  = br.getBoundingClientRect();

    const top    = tlR.top - twR.top + twEl.scrollTop;
    const left   = tlR.left - twR.left + twEl.scrollLeft;
    const width  = (brR.right - tlR.left);
    const height = (brR.bottom - tlR.top);

    const single = (b.r1 === b.r2 && b.c1 === b.c2);

    const rect = document.createElement('div');
    rect.className = 'sel-rect' + (single && isPrimary && S.mode === 'cell' ? ' is-cell' : '') + (!isPrimary ? ' is-extra' : '');
    rect.style.cssText = `position:absolute;top:${top}px;left:${left}px;width:${width}px;height:${height}px;`;
    ov.appendChild(rect);
  }
  ND.sheet.paint = paint;

  // --- Index table after every render -----------------------------------
  function indexTable() {
    let r = 0;
    $tbody().querySelectorAll('tr').forEach(tr => {
      if (tr.classList.contains('dr') || tr.classList.contains('empty-row')) {
        tr.dataset.r = r++;
        let c = -1;
        tr.querySelectorAll('td').forEach(td => {
          if (td.classList.contains('gutter')) return;
          td.dataset.c = ++c;
        });
      } else {
        delete tr.dataset.r;
      }
    });
    // tag thead column letters with their c index for col-on highlighting
    document.querySelectorAll('#grid thead tr.colhdr th[data-letter]').forEach((th, i) => {
      // i counts incl. the gutter-corner if present, so use data-letter alphabet position
      const letter = th.getAttribute('data-letter');
      if (letter) th.dataset.colC = letter.charCodeAt(0) - 65;
    });
    document.querySelectorAll('#grid thead tr:not(.colhdr) th[data-col]').forEach((th, i) => {
      // 0..11 mapping (gutter not in this set since gutter has no data-col)
      th.dataset.colC = i;
    });
  }
  ND.sheet.indexTable = indexTable;

  // --- Mouse interactions ------------------------------------------------
  let mouseDown = false;
  let dragOrigin = null; // {r, c} or {mode:'row',r} or {mode:'col',c}
  let dragMoved = false;

  function withMods(e, fnPlain, fnShift, fnCmd) {
    if (e.shiftKey) return fnShift(e);
    if (e.metaKey || e.ctrlKey) return fnCmd(e);
    return fnPlain(e);
  }

  function onCellMouseDown(e) {
    // Don't interfere with interactive widgets (select, input, button, etc.)
    if (e.target.closest('button, select, input, .stsel, .ni, .qrow-trig, .aico, .col-resize, .tri, .narr-toggle, .disc-open')) return;
    // Skip group/separator rows AND any click outside a selectable row → deselect
    const tr = e.target.closest('tr');
    if (!tr || !tr.dataset.r) {
      // Click outside any addressable row (e.g. group row, empty area) → deselect
      if (e.button === 0) {
        if (S.editing) commitEdit();
        clear();
      }
      return;
    }
    if (e.button !== 0 && e.button !== 2) return; // left or right only

    const td = e.target.closest('td');
    if (!td || td.classList.contains('gutter')) return;

    const r = +tr.dataset.r;
    const c = +td.dataset.c;
    if (isNaN(r) || isNaN(c)) return;

    // Right-click: if click is inside current selection, leave it; else move.
    // Suppress the browser's default mousedown behavior of focusing an inner
    // contenteditable span — Sheets opens the context menu on right-click
    // without entering edit mode. preventDefault on mousedown does not
    // affect the subsequent contextmenu event.
    if (e.button === 2) {
      if (!isInSelection(r, c)) setCell(r, c);
      if (e.target.closest('[contenteditable], .cell-edit')) e.preventDefault();
      return;
    }

    // If clicking inside an active edit, let the contenteditable handle it
    if (S.editing && S.editing.r === r && S.editing.c === c) return;
    // If we're editing somewhere else, commit that edit
    if (S.editing) commitEdit();

    withMods(e,
      () => setCell(r, c),
      () => extendTo(r, c),
      () => addCell(r, c),
    );

    mouseDown = true;
    dragMoved = false;
    dragOrigin = { mode: 'cell', r, c };

    // Prevent the contenteditable from grabbing focus on single click
    if (e.target.closest('[contenteditable]') || e.target.closest('.cell-edit') || e.target.closest('.am') || e.target.closest('.pill') || e.target.closest('.cell-val')) {
      e.preventDefault();
    }
  }

  function onGutterMouseDown(e) {
    if (e.button !== 0 && e.button !== 2) return;
    const tr = e.target.closest('tr');
    if (!tr || !tr.dataset.r) return;
    const r = +tr.dataset.r;

    if (e.button === 2) {
      if (!isInSelection(r, 0)) setRow(r);
      return;
    }

    if (S.editing) commitEdit();

    withMods(e,
      () => setRow(r),
      () => {
        // shift+click: extend rows from anchor row to r
        if (S.a) S.f = {r, c: lastC()}, S.a = {r: S.a.r, c: 0}, S.mode = 'row', paint();
        else setRow(r);
      },
      () => addRow(r),
    );

    mouseDown = true;
    dragMoved = false;
    dragOrigin = { mode: 'row', r };
    e.preventDefault();
    e.stopPropagation();
  }

  function onColHdrMouseDown(e) {
    if (e.button !== 0 && e.button !== 2) return;
    if (e.target.closest('.col-resize, .tri')) return;
    const th = e.target.closest('th');
    if (!th) return;
    const cAttr = th.dataset.colC;
    if (cAttr === undefined) return;
    const c = +cAttr;

    if (e.button === 2) {
      if (!isInSelection(0, c)) setCol(c);
      return;
    }

    if (S.editing) commitEdit();

    withMods(e,
      () => setCol(c),
      () => {
        if (S.a) S.f = {r: lastR(), c}, S.a = {r: 0, c: S.a.c}, S.mode = 'col', paint();
        else setCol(c);
      },
      () => addCol(c),
    );

    mouseDown = true;
    dragMoved = false;
    dragOrigin = { mode: 'col', c };
    e.preventDefault();
  }

  function onCornerMouseDown(e) {
    if (e.button !== 0) return;
    if (S.editing) commitEdit();
    setAll();
    e.preventDefault();
  }

  function onDocMouseMove(e) {
    if (!mouseDown || !dragOrigin) return;
    dragMoved = true;

    // Auto-scroll if cursor is near viewport edge of #tw (Sheets behavior)
    autoScroll(e.clientX, e.clientY);

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const td = el.closest('td');
    const tr = el.closest('tr');
    if (!tr || !tr.dataset.r) return;
    const r = +tr.dataset.r;

    if (dragOrigin.mode === 'row') {
      setRowRange(Math.min(dragOrigin.r, r), Math.max(dragOrigin.r, r));
    } else if (dragOrigin.mode === 'col') {
      const c = td && td.dataset.c !== undefined ? +td.dataset.c : null;
      if (c === null || isNaN(c)) return;
      setColRange(Math.min(dragOrigin.c, c), Math.max(dragOrigin.c, c));
    } else if (dragOrigin.mode === 'cell') {
      if (!td || td.classList.contains('gutter')) return;
      const c = +td.dataset.c;
      if (isNaN(c)) return;
      S.f = {r, c};
      S.mode = (dragOrigin.r === r && dragOrigin.c === c) ? 'cell' : 'cell';
      paint();
    }
  }

  // Edge auto-scroll while drag-selecting
  function autoScroll(x, y) {
    const tw = $tw();
    if (!tw) return;
    const r = tw.getBoundingClientRect();
    const headerH = $thead()?.getBoundingClientRect().height || 50;
    const edge = 50;
    const speed = 12;
    if (y > r.bottom - edge)            tw.scrollTop  += speed;
    else if (y < r.top + headerH + 6)   tw.scrollTop  -= speed;
    if (x > r.right - edge)             tw.scrollLeft += speed;
    else if (x < r.left + 50)           tw.scrollLeft -= speed;
  }

  function onDocMouseUp() {
    mouseDown = false;
    dragOrigin = null;
    setTimeout(() => { dragMoved = false; }, 0);
    // Re-paint so Name Box snaps from "3R x 3C" to range address
    paint();
  }

  // --- Hover row/col crosshair --------------------------------------------
  let hoverR = -2, hoverC = -2;
  function onHoverMove(e) {
    const tr = e.target.closest?.('tr');
    const td = e.target.closest?.('td');
    if (!tr || !tr.dataset.r) {
      if (hoverR !== -1 || hoverC !== -1) { clearHoverHighlights(); hoverR = -1; hoverC = -1; }
      return;
    }
    const r = +tr.dataset.r;
    const c = (td && !td.classList.contains('gutter') && td.dataset.c !== undefined) ? +td.dataset.c : -1;
    if (r === hoverR && c === hoverC) return;
    hoverR = r; hoverC = c;
    clearHoverHighlights();
    document.querySelector(`tr[data-r="${r}"] td.gutter`)?.classList.add('gutter-hover');
    if (c >= 0) {
      const letter = String.fromCharCode(65 + c);
      document.querySelectorAll(`#grid thead th[data-letter="${letter}"], #grid thead th[data-col-c="${c}"]`)
        .forEach(th => th.classList.add('col-hover'));
    }
  }
  function clearHoverHighlights() {
    document.querySelectorAll('.gutter-hover').forEach(el => el.classList.remove('gutter-hover'));
    document.querySelectorAll('.col-hover').forEach(el => el.classList.remove('col-hover'));
  }

  function isInSelection(r, c) {
    return [{a:S.a,f:S.f}, ...S.extras].some(rng => {
      if (!rng.a) return false;
      const b = box(rng);
      return r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2;
    });
  }
  ND.sheet.isInSelection = isInSelection;

  // --- Double-click = edit mode (or open deal on deal rows) -----------
  // For buy-box deal rows: most columns open the deal detail panel
  // on dbl-click, like Sheets opens a hyperlink. A small whitelist of
  // user-refinable numeric columns enters edit mode instead.
  const EDITABLE_DR_COLS = new Set(['psf', 'sf', 'hold']);

  function onDblClick(e) {
    const td = e.target.closest('td');
    const tr = e.target.closest('tr');
    if (!td || !tr || !tr.dataset.r || td.classList.contains('gutter')) return;
    const r = +tr.dataset.r;
    const c = +td.dataset.c;
    if (isNaN(r) || isNaN(c)) return;

    // Deal rows: dbl-click anywhere on the row toggles the inline expand
    // (per the original Deal Feed Excel design — the expanded row hosts the
    // property image, brief data, AI narrative, thumbs/save/hot/flag, an
    // "Open Deal Room" link that navigates to /deal/:id, and the chat
    // discuss trigger). Refinable numeric columns ($/SF, SF, Hold) still
    // enter edit mode instead. The "Open Deal Room" affordance for
    // navigating to the full deal page lives inside the expanded row.
    if (tr.classList.contains('dr')) {
      const colKey = td.dataset.col;
      if (EDITABLE_DR_COLS.has(colKey)) {
        const ok = ND.confirmEdit ? ND.confirmEdit(tr, td) : true;
        if (ok === false) return;
        if (ok && ok.then) { ok.then(go => { if (go) startEdit(r, c, td); }); return; }
        startEdit(r, c, td);
        return;
      }
      // Non-editable column on a deal row → toggle the inline expand row.
      const id = tr.dataset.id;
      if (id && typeof ND._toggleExpand === 'function') {
        ND._toggleExpand(id);
      } else if (id) {
        // Fallback if feed.js hasn't exposed _toggleExpand yet (defensive;
        // shouldn't happen because feed.js is loaded last).
        ND.actions?.openDetail?.(id);
      }
      return;
    }

    // Empty / scratch rows: dbl-click always enters edit (Sheets behavior)
    startEdit(r, c, td);
  }

  function startEdit(r, c, td) {
    S.editing = {r, c};
    // Find the editable span inside the td
    const span = td.querySelector('.cell-edit, [data-edit], [contenteditable="true"]');
    const input = td.querySelector('input, select');
    if (input) { input.focus(); input.select?.(); return; }
    if (!span) return;
    span.setAttribute('contenteditable', 'true');
    span.focus();
    // place caret at end
    const range = document.createRange();
    range.selectNodeContents(span);
    range.collapse(false);
    const selObj = window.getSelection();
    selObj.removeAllRanges();
    selObj.addRange(range);
  }
  ND.sheet.startEdit = startEdit;

  function commitEdit() {
    if (!S.editing) return;
    const { r, c } = S.editing;
    const td = cellAt(r, c);
    const span = td?.querySelector('.cell-edit, [data-edit]');
    span?.blur();
    S.editing = null;
  }
  ND.sheet.commitEdit = commitEdit;

  // --- Keyboard nav ------------------------------------------------------
  function move(dr, dc, extend) {
    if (!S.a) { setCell(0, 0); return; }
    const ref = extend ? S.f : S.a;
    const r = Math.max(0, Math.min(lastR(), ref.r + dr));
    const c = Math.max(0, Math.min(lastC(), ref.c + dc));
    if (extend) extendTo(r, c);
    else setCell(r, c);
    ensureVisible(r, c);
  }

  function ensureVisible(r, c) {
    const td = cellAt(r, c);
    if (!td) return;
    const tw = $tw();
    const twR = tw.getBoundingClientRect();
    const tdR = td.getBoundingClientRect();
    const headerH = $thead().getBoundingClientRect().height;
    if (tdR.bottom > twR.bottom - 4)   tw.scrollTop  += (tdR.bottom - twR.bottom + 8);
    if (tdR.top    < twR.top + headerH) tw.scrollTop -= (twR.top + headerH - tdR.top + 4);
    if (tdR.right  > twR.right  - 4)   tw.scrollLeft += (tdR.right  - twR.right  + 8);
    if (tdR.left   < twR.left + 46)    tw.scrollLeft -= (twR.left + 46 - tdR.left + 4);
  }

  function onKeyDown(e) {
    // Ignore when inside chat input, etc.
    const t = e.target;
    const inForm = ['INPUT','TEXTAREA','SELECT'].includes(t.tagName);
    const inDeckChat = t.id === 'ci' || t.id === 'fpi';
    if (inDeckChat) return;

    // Edit mode: only Esc/Enter/Tab leave; everything else stays in editor
    if (t.isContentEditable && S.editing) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); move(1, 0); return; }
      if (e.key === 'Tab')   { e.preventDefault(); commitEdit(); move(0, e.shiftKey ? -1 : 1); return; }
      if (e.key === 'Escape'){ e.preventDefault(); cancelEdit(); return; }
      return;
    }
    if (inForm) return;

    const cmd = e.metaKey || e.ctrlKey;

    // Cmd/Ctrl+A — select all
    if (cmd && e.key.toLowerCase() === 'a') {
      e.preventDefault(); setAll(); return;
    }

    // Cmd/Ctrl+C — copy selection as TSV
    if (cmd && e.key.toLowerCase() === 'c') {
      if (!S.a) return;
      e.preventDefault();
      copySelectionTSV();
      return;
    }

    if (!S.a) return;

    // Cmd/Ctrl + Arrow — jump to data edge.  + Shift extends selection.
    if (cmd && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const ext = e.shiftKey;
      if (e.key === 'ArrowUp')    jumpEdge(-1, 0, ext);
      if (e.key === 'ArrowDown')  jumpEdge( 1, 0, ext);
      if (e.key === 'ArrowLeft')  jumpEdge( 0,-1, ext);
      if (e.key === 'ArrowRight') jumpEdge( 0, 1, ext);
      return;
    }

    const ext = e.shiftKey;
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); move(-1, 0, ext); return;
      case 'ArrowDown':  e.preventDefault(); move( 1, 0, ext); return;
      case 'ArrowLeft':  e.preventDefault(); move( 0,-1, ext); return;
      case 'ArrowRight': e.preventDefault(); move( 0, 1, ext); return;
      case 'Tab':        e.preventDefault(); move(0, e.shiftKey ? -1 : 1); return;
      case 'F2': {
        // Enter edit mode keeping current cell content
        e.preventDefault();
        const td = cellAt(S.a.r, S.a.c);
        if (!td) return;
        const tr = rowAt(S.a.r);
        if (tr?.classList.contains('dr')) {
          const ok = ND.confirmEdit ? ND.confirmEdit(tr, td) : true;
          if (ok === false) return;
          if (ok && ok.then) { ok.then(go => { if (go) startEdit(S.a.r, S.a.c, td); }); return; }
        }
        startEdit(S.a.r, S.a.c, td);
        return;
      }
      case 'Enter':      e.preventDefault();
                         // Start editing the anchor cell
                         const td = cellAt(S.a.r, S.a.c);
                         if (td) {
                           if (rowAt(S.a.r)?.classList.contains('dr')) {
                             const ok = ND.confirmEdit ? ND.confirmEdit(rowAt(S.a.r), td) : true;
                             if (ok === false) return;
                             if (ok && ok.then) { ok.then(go => { if (go) startEdit(S.a.r, S.a.c, td); }); return; }
                           }
                           startEdit(S.a.r, S.a.c, td);
                         }
                         return;
      case 'Escape':     e.preventDefault(); clear(); return;
      case 'Delete':
      case 'Backspace':  e.preventDefault(); clearSelection(); return;
    }

    // Printable character → start editing & replace contents
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const td = cellAt(S.a.r, S.a.c);
      const tr = rowAt(S.a.r);
      if (!td) return;
      const beginEdit = () => {
        const span = td.querySelector('.cell-edit, [data-edit]');
        if (span) span.textContent = '';
        startEdit(S.a.r, S.a.c, td);
        // browser will deliver the keypress to the focused contenteditable
      };
      if (tr?.classList.contains('dr')) {
        const ok = ND.confirmEdit ? ND.confirmEdit(tr, td) : true;
        if (ok === false) { e.preventDefault(); return; }
        if (ok && ok.then) { e.preventDefault(); ok.then(go => { if (go) beginEdit(); }); return; }
      }
      beginEdit();
    }
  }

  // --- Jump to data edge (Ctrl/Cmd + Arrow) -----------------------------
  function firstDataR() {
    const first = $tbody().querySelector('tr.dr');
    return first ? +first.dataset.r : 0;
  }
  function lastDataR() {
    const drRows = $tbody().querySelectorAll('tr.dr');
    const last = drRows[drRows.length - 1];
    return last ? +last.dataset.r : 0;
  }
  function jumpEdge(dr, dc, ext) {
    if (!S.a) return;
    let r = S.a.r, c = S.a.c;
    if (dr !== 0) {
      if (dr > 0) {
        const last = lastDataR();
        r = (r < last) ? last : lastR();
      } else {
        const first = firstDataR();
        r = (r > first) ? first : 0;
      }
    }
    if (dc !== 0) {
      c = (dc > 0) ? lastC() : 0;
    }
    if (ext) extendTo(r, c);
    else     setCell(r, c);
    ensureVisible(r, c);
  }

  // --- Copy selection as TSV (Cmd/Ctrl+C) -------------------------------
  function copySelectionTSV() {
    const rows = ND.sheet.selectedRows();
    if (!rows.length) return;
    const b = box({a: S.a, f: S.f});
    const lines = [];
    for (let r = b.r1; r <= b.r2; r++) {
      const tr = rowAt(r);
      if (!tr) continue;
      const parts = [];
      for (let c = b.c1; c <= b.c2; c++) {
        const td = cellAt(r, c);
        parts.push(td ? (td.textContent.trim().replace(/\s+/g, ' ')) : '');
      }
      lines.push(parts.join('\t'));
    }
    const tsv = lines.join('\n');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(tsv).then(() => ND.toast?.(`Copied ${lines.length} row${lines.length===1?'':'s'}`));
    }
  }

  function cancelEdit() {
    if (!S.editing) return;
    const { r, c } = S.editing;
    const td = cellAt(r, c);
    const span = td?.querySelector('.cell-edit, [data-edit]');
    if (span && span._origText !== undefined) {
      span.textContent = span._origText;
    }
    span?.blur();
    S.editing = null;
  }
  ND.sheet.cancelEdit = cancelEdit;

  function clearSelection() {
    // For each cell in selection, if it's in an empty-row (user-created), clear text.
    // If it's in a .dr row (buy-box driven), ask confirmation first.
    const cs = cells();
    const drCells = cs.filter(({r}) => rowAt(r)?.classList.contains('dr'));
    const emptyCells = cs.filter(({r}) => rowAt(r)?.classList.contains('empty-row'));

    // Clear empty-row cells unconditionally
    emptyCells.forEach(({r, c}) => {
      const td = cellAt(r, c);
      const span = td?.querySelector('.cell-edit');
      if (span) {
        span.textContent = '';
        span.dispatchEvent(new Event('blur'));
      }
    });

    if (drCells.length) {
      const ok = ND.confirmClear ? ND.confirmClear(drCells.length) : true;
      const doIt = () => drCells.forEach(({r, c}) => {
        const td = cellAt(r, c);
        const span = td?.querySelector('[data-edit]');
        if (span) {
          span.textContent = '';
          span.dispatchEvent(new Event('blur'));
        }
        const input = td?.querySelector('input.ni');
        if (input) { input.value = ''; input.dispatchEvent(new Event('change')); }
      });
      if (ok === false) return;
      if (ok && ok.then) ok.then(go => { if (go) doIt(); });
      else doIt();
    }
  }

  // --- Wire on body of #tw ----------------------------------------------
  function install() {
    const tw = $tw();
    if (!tw) return;
    if (tw.dataset.selWired === '1') return;
    tw.dataset.selWired = '1';

    // overlay container (positioned absolutely inside #tw)
    if (!document.getElementById('sel-overlay')) {
      const ov = document.createElement('div');
      ov.id = 'sel-overlay';
      ov.className = 'sel-overlay';
      tw.appendChild(ov);
    }

    // mousedown delegated to relevant zones
    tw.addEventListener('mousedown', e => {
      // top-left corner click → select all
      if (e.target.closest('th.gutter-corner')) { onCornerMouseDown(e); return; }
      // column header letter row OR column header row
      if (e.target.closest('#grid thead tr.colhdr th') || e.target.closest('#grid thead tr:not(.colhdr) th[data-col]')) {
        onColHdrMouseDown(e); return;
      }
      // row gutter
      if (e.target.closest('td.gutter')) { onGutterMouseDown(e); return; }
      // any other cell
      onCellMouseDown(e);
    });

    tw.addEventListener('dblclick', onDblClick);
    tw.addEventListener('mousemove', onHoverMove);
    tw.addEventListener('mouseleave', clearHoverHighlights);
    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup',   onDocMouseUp);
    document.addEventListener('keydown',   onKeyDown);

    // suppress browser context menu inside table; ND.contextMenu shows ours
    tw.addEventListener('contextmenu', e => {
      const inTable = e.target.closest('#grid');
      if (!inTable) return;
      e.preventDefault();
      if (ND.contextMenu?.show) ND.contextMenu.show(e.clientX, e.clientY, e.target);
    });

    // re-paint on horizontal scroll (vertical scroll keeps overlay aligned naturally)
    tw.addEventListener('scroll', () => {
      // overlay scrolls with content — no need to re-paint
    });
  }

  // Hook into rr() — re-index and re-paint on every render
  ND.sheet.afterRender = function() {
    indexTable();
    // Snap selection to in-bounds (rr may have removed rows that were selected)
    if (S.a) {
      const lr = lastR(), lc = lastC();
      const clamp = (p) => p && ({ r: Math.min(lr, Math.max(0, p.r)), c: Math.min(lc, Math.max(0, p.c)) });
      S.a = clamp(S.a); S.f = clamp(S.f);
      S.extras = S.extras.map(rng => ({ a: clamp(rng.a), f: clamp(rng.f), mode: rng.mode }));
    }
    paint();
  };

  // Expose install for the React host to call after JSX commit. The IIFE-time
  // install() below can race with React 18 StrictMode's mount/unmount cycle
  // (the bundle imports resolve while the DOM is briefly detached after
  // cleanup, so $tw() returns null and the wiring silently no-ops). The host
  // calls ND.sheet.install() after loadBundleOnce resolves; install is
  // idempotent (dataset.selWired guard) so the IIFE-time attempt + the
  // host-side re-trigger are safe.
  ND.sheet.install = install;

  // wait for DOM, then install
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
