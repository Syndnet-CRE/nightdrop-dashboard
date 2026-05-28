/* ============================================
   FEED: table, expand, chat, keyboard, columns
   ============================================ */

(function() {
  // ----- Icons: Tabler class names → Lucide -----
  const ICON_MAP = {
    'ti-download': 'download', 'ti-layout-grid': 'layout-grid', 'ti-map-2': 'map',
    'ti-box': 'box', 'ti-calendar': 'calendar', 'ti-users': 'users',
    'ti-bookmark': 'bookmark', 'ti-trending-up': 'trending-up', 'ti-database': 'database',
    'ti-chart-line': 'line-chart', 'ti-flame': 'flame', 'ti-activity': 'activity',
    'ti-clock': 'clock', 'ti-plus': 'plus', 'ti-user-circle': 'circle-user',
    'ti-settings': 'settings', 'ti-tag': 'tag', 'ti-filter': 'filter',
    'ti-columns': 'columns-3', 'ti-baseline-density-large': 'rows-3',
    'ti-baseline-density-medium': 'menu', 'ti-baseline-density-small': 'rows-2',
    'ti-list': 'list', 'ti-table': 'table', 'ti-refresh': 'refresh-cw',
    'ti-shield-lock': 'shield', 'ti-send': 'send', 'ti-x': 'x',
    'ti-map-pin': 'map-pin', 'ti-minus': 'minus', 'ti-list-details': 'clipboard-list',
    'ti-file-text': 'file-text', 'ti-sparkles': 'sparkles', 'ti-point-filled': 'dot',
    'ti-chevron-right': 'chevron-right', 'ti-chevron-left': 'chevron-left',
    'ti-chevron-down': 'chevron-down', 'ti-thumb-up': 'thumbs-up',
    'ti-thumb-down': 'thumbs-down', 'ti-star': 'star', 'ti-share': 'share-2',
    'ti-message-circle': 'message-circle', 'ti-external-link': 'external-link',
    'ti-grip-vertical': 'grip-vertical', 'ti-moon-stars': 'moon',
    'ti-clock-hour-12': 'clock', 'ti-menu-2': 'menu',
  };

  function renderIcons(root) {
    root = root || document;
    root.querySelectorAll('i.ti').forEach(el => {
      if (el.firstChild && el.firstChild.tagName === 'svg') return; // already rendered
      const cls = [...el.classList].find(c => c.startsWith('ti-'));
      if (!cls) return;
      const name = ICON_MAP[cls] || cls.replace(/^ti-/, '');
      el.setAttribute('data-lucide', name);
    });
    if (window.lucide) {
      try { window.lucide.createIcons({ attrs: { 'stroke-width': '1.75', class: 'lucide' } }); } catch(_) {}
    }
  }
  ND._renderIcons = renderIcons;

  // ----- column spec / widths -----
  // 13 columns total: gutter + 12 data
  // Max widths: generous (~3× default, capped at 600px) so users can really stretch columns.
  const COLS = [
    { key: 'gutter',  letter: '',   width: 44,  min: 36,  max: 60,  resizable: false },
    { key: 'score',   letter: 'A',  width: 64,  min: 54,  max: 240, resizable: true,  filter: 'score'  },
    { key: 'address', letter: 'B',  width: 248, min: 140, max: 600, resizable: true,  filter: 'addr',  editable: true },
    { key: 'date',    letter: 'C',  width: 86,  min: 70,  max: 280, resizable: true,  filter: 'date',  editable: true },
    { key: 'asset',   letter: 'D',  width: 104, min: 80,  max: 320, resizable: true,  filter: 'asset', editable: true },
    { key: 'psf',     letter: 'E',  width: 64,  min: 52,  max: 200, resizable: true,  filter: 'psf',   editable: true },
    { key: 'sf',      letter: 'F',  width: 80,  min: 60,  max: 240, resizable: true,  filter: 'sf',    editable: true },
    { key: 'owner',   letter: 'G',  width: 88,  min: 72,  max: 260, resizable: true,  filter: 'owner', editable: true },
    { key: 'hold',    letter: 'H',  width: 64,  min: 52,  max: 200, resizable: true,  filter: 'hold',  editable: true },
    { key: 'signal',  letter: 'I',  width: 168, min: 110, max: 500, resizable: true,  filter: 'signal',editable: true },
    { key: 'stage',   letter: 'J',  width: 116, min: 90,  max: 340, resizable: true,  filter: 'stage' },
    { key: 'notes',   letter: 'K',  width: 168, min: 110, max: 600, resizable: true,                  editable: true },
    { key: 'quick',   letter: 'L',  width: 76,  min: 64,  max: 220, resizable: false },
  ];
  const COLSPAN = COLS.length;
  // Mutable widths (in px)
  const colW = {};
  COLS.forEach(c => colW[c.key] = c.width);

  function applyColWidths() {
    const cg = document.getElementById('cg');
    if (!cg) return;
    cg.innerHTML = COLS.map(c => `<col style="width:${colW[c.key]}px">`).join('');
    // also update table min-width
    const total = COLS.reduce((a,c) => a + colW[c.key], 0);
    document.getElementById('grid').style.minWidth = total + 'px';
  }

  // ----- runtime state -----
  let activeRowId = null;             // single-click highlight
  let xId = null;                     // double-click expand
  let sel = new Set();                // checkbox/multi-select
  let cf = {};                        // column filters
  let chipFilter = 'all';             // toolbar chip
  let density = 'normal';
  let cDeal = null;
  const ch = {};
  const coll = {};
  const proseOpen = new Set();
  const editBuf = {};                 // per-day empty-row cell text {dayISO: {rIdx_colKey: text}}
  let kbIdx = -1;
  const rh = { compact: 36, normal: 44, comfortable: 56 };

  // ----- helpers -----
  function sc2(s) { return s>=80?'#2da200':s>=70?'#f59e0b':'#ef4444'; }

  function ring(s) {
    const sz=30, r=11, circ=2*Math.PI*r;
    const pct = Math.max(0, (s-60)/40 * 100);
    const dash = (circ*pct/100).toFixed(1);
    const c = sc2(s);
    return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">
      <circle cx="15" cy="15" r="${r}" fill="none" stroke="#222" stroke-width="2.5"/>
      <circle cx="15" cy="15" r="${r}" fill="none" stroke="${c}" stroke-width="2.5"
              stroke-dasharray="${dash} ${circ.toFixed(1)}"
              stroke-linecap="round" transform="rotate(-90 15 15)"/>
      <text x="15" y="16.5" text-anchor="middle" dominant-baseline="middle"
            font-size="8.5" font-weight="700" fill="${c}" font-family="DM Mono, monospace">${s}</text>
    </svg>`;
  }

  // ----- which deals belong to activeDay -----
  const ADDR_POOL = [
    { addr: '8240 Burnet Rd',        city: 'Austin, TX 78758',  asset: 'Self Storage', owner: 'LLC',        bx: 'ss' },
    { addr: '12500 Hwy 71 W',        city: 'Bee Cave, TX 78738', asset: 'Self Storage', owner: 'Individual', bx: 'ss' },
    { addr: '4417 E Saint Elmo Rd',  city: 'Austin, TX 78744',  asset: 'Self Storage', owner: 'Trust',      bx: 'ss' },
    { addr: '11005 Manchaca Rd',     city: 'Austin, TX 78748',  asset: 'Industrial',   owner: 'LLC',        bx: 'wpg' },
    { addr: '6701 Burleson Rd',      city: 'Austin, TX 78744',  asset: 'Industrial',   owner: 'LLC',        bx: 'wpg' },
    { addr: 'CR 271 — 168 Acres',    city: 'Manor, TX 78653',   asset: 'Land',         owner: 'Individual', bx: 'land' },
    { addr: '901 W Slaughter Ln',    city: 'Austin, TX 78748',  asset: 'Self Storage', owner: 'LLC',        bx: 'ss' },
    { addr: '7100 N IH-35',          city: 'Austin, TX 78752',  asset: 'Industrial',   owner: 'LLC',        bx: 'wpg' },
    { addr: 'FM 973 — 124 Acres',    city: 'Pflugerville, TX',  asset: 'Land',         owner: 'Trust',      bx: 'land' },
    { addr: '2902 Manor Rd',         city: 'Austin, TX 78722',  asset: 'Self Storage', owner: 'Individual', bx: 'ss' },
    { addr: '5301 Industrial Oaks',  city: 'Austin, TX 78735',  asset: 'Industrial',   owner: 'LLC',        bx: 'wpg' },
    { addr: 'SH 130 — 96 Acres',     city: 'Mustang Ridge, TX', asset: 'Land',         owner: 'Individual', bx: 'land' },
  ];
  const SIG_POOL = [
    { t: '29-Yr Trust Hold',           sc: 'pill-r' },
    { t: 'High distress (70)',         sc: 'pill-r' },
    { t: 'Absentee owner',             sc: 'pill-a' },
    { t: 'No mortgage surfaced',       sc: 'pill-g' },
    { t: 'Free-and-clear possible',    sc: 'pill-g' },
    { t: 'Out-of-state LLC owner',     sc: 'pill-a' },
    { t: 'Corporate LLC fatigue',      sc: 'pill-a' },
    { t: 'Raw land — no debt',         sc: 'pill-g' },
    { t: 'Tax lien — 2024',            sc: 'pill-r' },
    { t: 'Recent deed transfer',       sc: 'pill-a' },
  ];

  function hash(s) { let h=0; for(let i=0;i<s.length;i++){h=(h*31 + s.charCodeAt(i)) >>> 0;} return h; }
  function rngOf(seed) { let v = hash(seed); return () => { v = (v*2654435761 + 1) >>> 0; return v / 0xffffffff; }; }

  const stubCache = {};
  function stubsFor(dayISO, count) {
    if (stubCache[dayISO]) return stubCache[dayISO];
    const rng = rngOf(dayISO);
    const out = [];
    for (let i = 0; i < count; i++) {
      const tmpl = ADDR_POOL[Math.floor(rng()*ADDR_POOL.length)];
      const sig = SIG_POOL[Math.floor(rng()*SIG_POOL.length)];
      const score = 65 + Math.floor(rng()*30);
      const sf = Math.floor(rng()*40000) + 4000;
      const psf = Math.floor(rng()*200) + 40;
      const holdYrs = Math.floor(rng()*25) + 4;
      out.push({
        id: 10000 + hash(dayISO + ':' + i) % 90000,
        bx: tmpl.bx, score, addr: tmpl.addr, city: tmpl.city,
        brief: `Delivered ${dayISO} — historical entry`,
        date: dayISO, deliveredOn: dayISO,
        asset: tmpl.asset, psf, sf, owner: tmpl.owner, hold: holdYrs + ' yr',
        sig: sig.t, sc: sig.sc, stage: ['New','Researching','Contacted','Passed'][Math.floor(rng()*4)],
        notes: '', unread: false, saved: false, hot: false, up: false, la: null,
        ext: {
          parcel: ('0000' + Math.floor(rng()*9999)).slice(-4) + '-' + ('0000' + Math.floor(rng()*9999)).slice(-4) + '-X',
          county: 'Travis', lastSale: '—', lastPrice: '—',
          assessed: '$' + (Math.floor(rng()*9)+1) + '.' + Math.floor(rng()*9) + 'M',
          landVal: '—', bldgVal: '—', zoning: '—', lotSF: '—', yearBuilt: '—',
          deed: 'Warranty', mortAmt: '—', mortLender: '—', mortDate: '—',
        },
        bullets: [
          { label: 'Archive:', body: 'Historical delivery — full underwriting context preserved in the deal room.' },
          { label: 'Signal:',  body: sig.t + '.' },
        ],
        narr: 'Historical entry delivered ' + dayISO + '. Click Open Deal Room for full diligence record.',
        _stub: true,
      });
    }
    stubCache[dayISO] = out;
    return out;
  }

  function dealsForActiveDay() {
    const day = ND.state.activeDay;
    const fromData = ND.deals.filter(d => d.deliveredOn === day);
    if (fromData.length) return fromData;
    let calDay = null;
    for (const m of ND.calendar) for (const w of m.weeks) for (const d of w.days)
      if (d.key === day) { calDay = d; break; }
    if (calDay && calDay.count > 0) return stubsFor(day, calDay.count);
    return [];
  }

  function gf() {
    let list = dealsForActiveDay().filter(d => {
      if (chipFilter === 'unread' && !d.unread) return false;
      if (chipFilter === 'saved'  && !d.saved)  return false;
      if (chipFilter === 'hot'    && !d.hot)    return false;
      for (const [k, v] of Object.entries(cf)) {
        if (!v) continue;
        const vl = String(v).toLowerCase();
        if (k === 'asset'  && !d.asset.toLowerCase().includes(vl)) return false;
        if (k === 'owner'  && !d.owner.toLowerCase().includes(vl)) return false;
        if (k === 'stage'  && d.stage.toLowerCase() !== vl) return false;
        if (k === 'score'  && d.score < parseInt(v)) return false;
        if (k === 'signal' && !d.sig.toLowerCase().includes(vl)) return false;
        if (k === 'addr'   && !d.addr.toLowerCase().includes(vl) && !d.city.toLowerCase().includes(vl)) return false;
        if (k === 'psf'    && parseFloat(d.psf) < parseFloat(v)) return false;
      }
      return true;
    });
    if (ND.applyColFilters) list = ND.applyColFilters(list);
    if (ND.applyColSort)    list = ND.applyColSort(list);
    return list;
  }

  // Expose active-day dataset for the filter popover (unique values)
  ND._activeDayDeals = dealsForActiveDay;

  function ufb() {
    const fb = document.getElementById('fbar');
    const fcb = document.getElementById('fcBtn');
    const fca = document.getElementById('fca');
    const active = Object.entries(cf).filter(([,v]) => v);
    if (!active.length) { fb.style.display='none'; fcb.style.display='none'; return; }
    fcb.style.display='inline-flex';
    fca.textContent = active.length;
    fb.style.display='flex';
    fb.innerHTML = active.map(([k,v]) =>
      `<div class="ftag"><span>${k}: <b>${v}</b></span><span class="rm" data-key="${k}"><i class="ti ti-x"></i></span></div>`
    ).join('');
    fb.querySelectorAll('.rm').forEach(r => r.addEventListener('click', e => {
      e.stopPropagation();
      delete cf[e.currentTarget.dataset.key];
      document.querySelectorAll('.tri').forEach(t => { if (t.dataset.key === e.currentTarget.dataset.key) t.classList.remove('on'); });
      ufb(); rr();
    }));
    renderIcons(fb);
  }

  function sfp(key, el) {
    const pop = document.getElementById('fpop');
    const tw = document.getElementById('tw');
    const tr = el.closest('th').getBoundingClientRect();
    const wr = tw.getBoundingClientRect();
    let inn = '';
    if (key === 'asset')      inn = `<label>Asset class</label><select id="fpi"><option value="">All</option>${['Self Storage','Industrial','Land'].map(o=>`<option ${cf[key]===o?'selected':''}>${o}</option>`).join('')}</select>`;
    else if (key === 'stage') inn = `<label>Stage</label><select id="fpi"><option value="">All</option>${ND.stages.map(s=>`<option ${cf[key]===s?'selected':''}>${s}</option>`).join('')}</select>`;
    else if (key === 'owner') inn = `<label>Owner type</label><select id="fpi"><option value="">All</option>${['Trust','Individual','LLC'].map(s=>`<option ${cf[key]===s?'selected':''}>${s}</option>`).join('')}</select>`;
    else if (key === 'score') inn = `<label>Min score</label><input id="fpi" type="number" min="60" max="100" value="${cf[key]||70}">`;
    else if (key === 'psf')   inn = `<label>Min $/SF</label><input id="fpi" type="number" min="0" max="500" value="${cf[key]||0}">`;
    else                      inn = `<label>${key}</label><input id="fpi" type="text" placeholder="Filter…" value="${cf[key]||''}">`;

    pop.innerHTML = `<div class="cfp" style="left:${tr.left - wr.left}px;top:${tr.bottom - wr.top + tw.scrollTop + 4}px">${inn}
      <div class="fp-btns"><button class="fp-a" id="fpa">Apply</button><button class="fp-c" id="fpc">Clear</button></div></div>`;
    pop.style.display = 'block';
    document.getElementById('fpa').addEventListener('click', () => {
      const v = document.getElementById('fpi').value;
      if (v) { cf[key] = v; el.classList.add('on'); } else { delete cf[key]; el.classList.remove('on'); }
      pop.style.display = 'none'; ufb(); rr();
    });
    document.getElementById('fpc').addEventListener('click', () => {
      delete cf[key]; el.classList.remove('on'); pop.style.display = 'none'; ufb(); rr();
    });
    setTimeout(() => document.getElementById('fpi').focus(), 0);
  }

  // ----- chat -----
  function openChat(d) {
    cDeal = d;
    document.getElementById('ddeal').textContent = d.addr;
    if (!ch[d.id]) ch[d.id] = [{ r:'a', t:`Context loaded for <b>${d.addr}</b>. I have the full deal brief, owner profile, signal analysis and property data. What do you want to know?` }];
    rcm();
    document.getElementById('drawer').classList.add('open');
    document.getElementById('tw').classList.add('drawer-open');
  }
  function rcm() {
    if (!cDeal) return;
    const el = document.getElementById('dmsgs');
    el.innerHTML = (ch[cDeal.id] || []).map(m => `<div class="msg ${m.r==='u'?'u':'a'}">${m.t}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }
  function sendMsg() {
    if (!cDeal) return;
    const inp = document.getElementById('ci');
    const txt = inp.value.trim();
    if (!txt) return;
    if (!ch[cDeal.id]) ch[cDeal.id] = [];
    ch[cDeal.id].push({ r:'u', t: txt });
    inp.value = '';
    rcm();
    setTimeout(() => {
      const rep = [
        'The trust structure here is a strong motivation signal — heirs rarely want to manage real assets long-term.',
        'No mortgage combined with long tenure puts this in the top tier for direct outreach.',
        'Distress score of 70+ with absentee ownership is your cleanest approach window this week.',
        'Owner distance from the asset is a classic passive-hold fatigue indicator.',
        'Free-and-clear with no debt service pressure means the owner has full flexibility to transact on their own timeline.',
      ];
      ch[cDeal.id].push({ r:'a', t: rep[Math.floor(Math.random()*rep.length)] });
      rcm();
    }, 700);
  }

  // ----- expanded row -----
  // Build a Mapbox Static-Image URL for the deal's coordinates. The Mapbox
  // token is set on ND.mapboxToken by publishToBundle in sync.js. Returns
  // null when either coords or token is missing — the caller falls back to
  // the CSS-only placeholder (multi-layer gradient + pseudo-element roads).
  function mapboxSatUrl(lat, lng, zoom = 18, w = 380, h = 240) {
    const token = ND.mapboxToken;
    if (!token || lat == null || lng == null) return null;
    const z = Math.max(0, Math.min(22, Number(zoom) || 18));
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${z},0/${w}x${h}@2x?access_token=${token}&attribution=false&logo=false`;
  }

  function buildExpandedRow(d) {
    const ex = d.ext;
    // React Router path (NOT the legacy bundle's hash-routing `#/deal-room/:id`
    // — that was a single-page-bundle convention that never matched any host
    // route after the React integration). Matches App.jsx's /deal/:id route.
    const dealRoomUrl = `/deal/${d.id}`;
    const initialZoom = 18;
    const satUrl = mapboxSatUrl(d.lat, d.lng, initialZoom);
    const hasImg = !!satUrl;
    return `<td colspan="${COLSPAN}"><div class="xi">
      <div class="xi-body">
        <div class="xi-img-wrap">
          <div class="sat-tile${hasImg ? ' has-img' : ''}" title="${d.addr}" data-lat="${d.lat ?? ''}" data-lng="${d.lng ?? ''}" data-zoom="${initialZoom}">
            ${hasImg ? `<img class="sat-img" alt="Satellite view of ${d.addr}" src="${satUrl}" loading="lazy" onerror="this.parentElement.classList.remove('has-img'); this.remove();"/>` : ''}
            <div class="sat-meta"><i class="ti ti-map-pin"></i> Satellite · <span class="sat-zoom-label">${initialZoom}z</span></div>
            <div class="sat-pulse"></div>
            <div class="sat-pin">
              <div class="sat-pin-mark"><i class="ti ti-map-pin"></i></div>
              <div class="sat-pin-stem"></div>
            </div>
            <div class="sat-foot"><span>${d.city.split(',')[0]}</span><b>${d.ext.parcel}</b></div>
            <div class="sat-zoom">
              <button title="Zoom out" data-z="-1"><i class="ti ti-minus"></i></button>
              <button title="Zoom in" data-z="+1"><i class="ti ti-plus"></i></button>
            </div>
          </div>
        </div>
        <div class="xi-data">
          <div class="sec-label"><i class="ti ti-list-details"></i> Property data</div>
          <div class="fact-grid">
            <div class="fact"><span class="fl">Parcel ID</span><span class="fv">${ex.parcel}</span></div>
            <div class="fact"><span class="fl">County</span><span class="fv text">${ex.county}</span></div>
            <div class="fact"><span class="fl">Zoning</span><span class="fv">${ex.zoning}</span></div>
            <div class="fact"><span class="fl">Year built</span><span class="fv">${ex.yearBuilt}</span></div>
            <div class="fact"><span class="fl">Lot SF</span><span class="fv">${ex.lotSF}</span></div>
            <div class="fact"><span class="fl">Assessed</span><span class="fv hi">${ex.assessed}</span></div>
            <div class="fact"><span class="fl">Land value</span><span class="fv">${ex.landVal}</span></div>
            <div class="fact"><span class="fl">Bldg value</span><span class="fv">${ex.bldgVal}</span></div>
            <div class="fact"><span class="fl">Last sale</span><span class="fv">${ex.lastSale}</span></div>
            <div class="fact"><span class="fl">Last price</span><span class="fv hi">${ex.lastPrice}</span></div>
          </div>
          <div class="sec-label"><i class="ti ti-file-text"></i> Debt &amp; title</div>
          <div class="fact-grid">
            <div class="fact"><span class="fl">Deed type</span><span class="fv text">${ex.deed}</span></div>
            <div class="fact"><span class="fl">Match score</span><span class="fv hi">${d.score}%</span></div>
            <div class="fact"><span class="fl">Mortgage</span><span class="fv">${ex.mortAmt}</span></div>
            <div class="fact"><span class="fl">Lender</span><span class="fv text">${ex.mortLender}</span></div>
          </div>
        </div>
        <div class="xi-narr">
          <div class="sec-label accent"><i class="ti ti-sparkles"></i> Agent briefing</div>
          <div class="narr-scroll">
            <div class="narr-bullets">
              ${(d.bullets || []).map(b => `<div class="narr-bullet"><i class="ti ti-point-filled"></i><span><b>${b.label}</b> ${b.body}</span></div>`).join('')}
            </div>
            <div class="narr-prose">${d.narr}</div>
          </div>
          <div class="narr-more" aria-hidden="true"><i class="ti ti-chevron-down"></i></div>
        </div>
      </div>
      <div class="xi-actions">
        <button class="aico up ${d.up?'on':''}" data-act="up" title="Interested (Y)"><i class="ti ti-thumb-up"></i></button>
        <button class="aico dn" data-act="dn" title="Pass (N)"><i class="ti ti-thumb-down"></i></button>
        <button class="aico sv ${d.saved?'on':''}" data-act="sv" title="Save (S)"><i class="ti ti-star"></i></button>
        <button class="aico hot ${d.hot?'on':''}" data-act="hot" title="Mark hot"><i class="ti ti-flame"></i></button>
        <div class="act-divider"></div>
        <button class="aico mp" title="Go to map"><i class="ti ti-map-pin"></i></button>
        <button class="aico sh" title="Share brief"><i class="ti ti-share"></i></button>
        <div class="act-space"></div>
        <button class="act-btn secondary disc-open" title="Quick chat"><i class="ti ti-message-circle"></i> Discuss</button>
        <a class="act-btn primary" href="${dealRoomUrl}" title="Open the full deal room (D)"><i class="ti ti-external-link"></i> Open Deal Room</a>
      </div>
    </div></td>`;
  }

  // ----- data row cells -----
  function cellHTML(colKey, d) {
    switch (colKey) {
      case 'score': return `<div class="score-wrap">${ring(d.score)}<div class="la ${d.la||''}" title="${d.la==='r'?'Recently viewed':d.la==='m'?'Viewed this week':'Not yet viewed'}"></div></div>`;
      case 'address': return `<div style="display:flex;flex-direction:column;gap:1px;min-width:0">
        <span class="am" data-edit="addr" data-id="${d.id}">${d.addr}</span>
        <span class="as">${d.city}</span>
        ${density!=='compact' ? `<span class="ab">${d.brief}</span>` : ''}
      </div>`;
      case 'date':   return `<span class="cell-val mono" data-edit="date" data-id="${d.id}" style="color:${d.deliveredOn===ND.todayISO?'var(--accent)':'var(--fg-dim)'}">${d.date}</span>`;
      case 'asset':  return `<span class="cell-val text" data-edit="asset" data-id="${d.id}">${d.asset}</span>`;
      case 'psf':    return `<span class="cell-val mono bold" data-edit="psf" data-id="${d.id}">$${d.psf}</span>`;
      case 'sf':     return `<span class="cell-val mono" data-edit="sf" data-id="${d.id}">${d.sf.toLocaleString()}</span>`;
      case 'owner':  return `<span class="pill pill-gray" data-edit="owner" data-id="${d.id}">${d.owner}</span>`;
      case 'hold':   return `<span class="cell-val mono" data-edit="hold" data-id="${d.id}">${d.hold}</span>`;
      case 'signal': return `<span class="pill ${d.sc}" data-edit="sig" data-id="${d.id}">${d.sig}</span>`;
      case 'stage':  return `<select class="stsel" data-id="${d.id}">${ND.stages.map(s => `<option ${s===d.stage?'selected':''}>${s}</option>`).join('')}</select>`;
      case 'notes':  return `<input class="ni" value="${(d.notes||'').replace(/"/g,'&quot;')}" placeholder="Add note…" data-id="${d.id}"/>`;
      case 'quick':  return `<div style="display:flex;gap:4px;align-items:center;justify-content:center">
        <button class="qrow-trig up ${d.up?'on':''}" data-id="${d.id}" data-act="up" title="Interested (Y)"><i class="ti ti-thumb-up"></i></button>
        <button class="qrow-trig dn" data-id="${d.id}" data-act="dn" title="Pass (N)"><i class="ti ti-thumb-down"></i></button>
      </div>`;
      default: return '';
    }
  }

  // ----- main render -----
  function rr() {
    applyColWidths();
    const tb = document.getElementById('tbody');
    tb.innerHTML = '';
    const h = rh[density];
    const filtered = gf();

    document.getElementById('exportBtn').style.display = sel.size > 0 ? 'inline-flex' : 'none';
    document.getElementById('bulkBtn').style.display   = sel.size > 0 ? 'inline-flex' : 'none';
    document.getElementById('selCount').textContent = sel.size;

    const totalToday = dealsForActiveDay().length;
    document.getElementById('rc').textContent = `Showing ${filtered.length} of ${totalToday || filtered.length}`;
    document.getElementById('stTotal').textContent = totalToday;
    const avg = filtered.length ? Math.round(filtered.reduce((a,d) => a+d.score, 0) / filtered.length) : 0;
    document.getElementById('stAvg').textContent = avg || '—';

    const kbRows = [];
    let rowNumber = 0;

    // (a) Render group rows + data rows when we have data
    if (filtered.length) {
      ND.boxes.forEach((box, bi) => {
        const bd = filtered.filter(d => d.bx === box.id);
        if (!bd.length) return;
        const isc = !!coll[box.id];

        if (bi > 0) {
          const sep = document.createElement('tr');
          sep.className = 'gsep';
          sep.innerHTML = `<td colspan="${COLSPAN}"></td>`;
          tb.appendChild(sep);
        }

        const gr = document.createElement('tr');
        gr.className = 'gr';
        const avgBx = Math.round(bd.reduce((a,d) => a+d.score, 0) / bd.length);
        gr.innerHTML = `<td colspan="${COLSPAN}"><div class="gi">
          <div class="gtog">${isc ? '+' : '−'}</div>
          <div class="gn-dot" style="color:${box.color};background:${box.color}"></div>
          <span class="gn">${box.name}</span>
          <span class="ga">${box.asset}</span>
          <div class="gdiv"></div>
          <div class="gstat"><span class="gsl">Tonight</span><span class="gsv g">${bd.length}</span></div>
          <div class="gstat-div"></div>
          <div class="gstat"><span class="gsl">Avg score</span><span class="gsv">${avgBx}%</span></div>
          <div class="gstat-div"></div>
          <div class="gstat"><span class="gsl">Match rate</span><span class="gsv p">${box.mr}%</span></div>
          <div class="gstat-div"></div>
          <div class="gstat"><span class="gsl">Pipeline</span><span class="gsv d">${box.depth.toLocaleString()}</span></div>
          <div class="gstat-div"></div>
          <div class="gstat"><span class="gsl">Remaining</span><span class="gsv d">${(box.depth - bd.length).toLocaleString()}</span></div>
        </div></td>`;
        gr.addEventListener('click', () => { coll[box.id] = !coll[box.id]; rr(); });
        tb.appendChild(gr);
        if (isc) return;

        bd.forEach(d => {
          rowNumber++;
          const rIdx = kbRows.length;
          kbRows.push(d.id);
          const isFocus = kbIdx === rIdx;
          const tr = document.createElement('tr');
          tr.className = 'dr'
            + (d.unread ? ' unread' : '')
            + (activeRowId === d.id ? ' active' : '')
            + (xId === d.id ? ' exp' : '')
            + (sel.has(d.id) ? ' sel' : '')
            + (isFocus ? ' kb-focus' : '');
          tr.dataset.id = d.id;
          tr.dataset.idx = rIdx;

          let inner = `<td class="gutter" data-row-num>${rowNumber}</td>`;
          for (let i = 1; i < COLS.length; i++) {
            const c = COLS[i];
            inner += `<td style="height:${h}px" data-col="${c.key}">${cellHTML(c.key, d)}</td>`;
          }
          tr.innerHTML = inner;
          tb.appendChild(tr);

          if (xId === d.id) {
            const xtr = document.createElement('tr');
            xtr.className = 'xr';
            xtr.innerHTML = buildExpandedRow(d);
            tb.appendChild(xtr);
            // wire expanded row interactions
            xtr.querySelectorAll('.aico[data-act]').forEach(b => {
              b.addEventListener('click', e => {
                e.stopPropagation();
                const act = e.currentTarget.dataset.act;
                const cur = d.hot ? 'hot' : null;
                if (act === 'up')  ND.actions?.toggleHot?.(d.id, cur);
                if (act === 'dn') {
                  ND.actions?.setStage?.(d.id, 'Passed');
                  if (d.hot) ND.actions?.toggleHot?.(d.id, 'hot');
                }
                if (act === 'sv')  ND.actions?.toggleSave?.(d.id, d.saved);
                if (act === 'hot') ND.actions?.toggleHot?.(d.id, cur);
              });
            });
            xtr.querySelector('.disc-open').addEventListener('click', e => { e.stopPropagation(); openChat(d); });
            // Wire the satellite-tile zoom buttons. Clamp 14–20 (city block to
            // close street). Swaps the <img src> in place; no remount.
            xtr.querySelectorAll('.sat-zoom button[data-z]').forEach(btn => {
              btn.addEventListener('click', e => {
                e.stopPropagation();
                const tile = xtr.querySelector('.sat-tile');
                const img = tile?.querySelector('.sat-img');
                const label = tile?.querySelector('.sat-zoom-label');
                if (!tile || !img) return;
                const lat = parseFloat(tile.dataset.lat);
                const lng = parseFloat(tile.dataset.lng);
                if (!isFinite(lat) || !isFinite(lng)) return;
                const cur = parseInt(tile.dataset.zoom, 10) || 18;
                const delta = parseInt(e.currentTarget.dataset.z, 10) || 0;
                const next = Math.max(14, Math.min(20, cur + delta));
                if (next === cur) return;
                tile.dataset.zoom = String(next);
                if (label) label.textContent = next + 'z';
                const url = mapboxSatUrl(lat, lng, next);
                if (url) img.src = url;
              });
            });
            // Agent briefing scroll indicator — hide the chevron once the user
            // reaches the bottom; show it again when they scroll back up.
            const scrollEl = xtr.querySelector('.narr-scroll');
            const moreEl   = xtr.querySelector('.narr-more');
            if (scrollEl && moreEl) {
              const updateMore = () => {
                const hasOverflow = scrollEl.scrollHeight > scrollEl.clientHeight + 2;
                const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 4;
                moreEl.classList.toggle('hidden', !hasOverflow || atBottom);
              };
              scrollEl.addEventListener('scroll', updateMore);
              // Watch the panel for layout/size changes so the chevron
              // recalculates after the row finishes laying out.
              if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(updateMore).observe(scrollEl);
              }
              requestAnimationFrame(updateMore);
              setTimeout(updateMore, 80);
              setTimeout(updateMore, 300);
              moreEl.addEventListener('click', () => {
                scrollEl.scrollBy({ top: 80, behavior: 'smooth' });
              });
            }
          }
        });
      });
    } else {
      // No data: still show the empty-state copy at the top, plus empty rows below
      const isFuture = (() => {
        let target = null;
        for (const m of ND.calendar) for (const w of m.weeks) for (const d of w.days)
          if (d.key === ND.state.activeDay) target = d;
        return target?.isFuture;
      })();
      const tr = document.createElement('tr');
      tr.className = 'feed-empty-row';
      tr.innerHTML = `<td colspan="${COLSPAN}">
        <div class="feed-empty">
          <i class="ti ti-${isFuture?'clock-hour-12':'moon-stars'}"></i>
          <h3>${isFuture ? 'Nothing yet — that day hasn’t happened.' : 'No deals delivered this day.'}</h3>
          <p>${isFuture ? 'Nightdrop runs at 12:00 AM CT. Check back after the next run completes.' : 'Try a different day or clear filters to widen the view.'}</p>
        </div>
      </td>`;
      tb.appendChild(tr);
    }

    // (b) Fill remaining viewport with empty rows
    appendEmptyRows(tb, rowNumber, h);

    // wire all row interactions
    wireRowEvents(kbRows);
    renderIcons(tb);
    ND._kbRows = kbRows;
    // Hand off to the spreadsheet selection layer for indexing + repaint
    if (ND.sheet?.afterRender) ND.sheet.afterRender();
  }

  function appendEmptyRows(tb, startNum, rowH) {
    const tw = document.getElementById('tw');
    if (!tw) return;
    const used = tb.getBoundingClientRect().height;
    const have = tw.clientHeight;
    const need = Math.max(0, have - used);
    const count = Math.ceil(need / rowH) + 2;
    const day = ND.state.activeDay;
    if (!editBuf[day]) editBuf[day] = {};
    const buf = editBuf[day];

    for (let i = 0; i < count; i++) {
      const num = startNum + i + 1;
      const tr = document.createElement('tr');
      tr.className = 'empty-row';
      tr.dataset.empty = num;
      let inner = `<td class="gutter" data-row-num>${num}</td>`;
      for (let j = 1; j < COLS.length; j++) {
        const c = COLS[j];
        const k = num + '_' + c.key;
        const v = buf[k] || '';
        inner += `<td style="height:${rowH}px" data-col="${c.key}"><span class="cell-edit" data-row="${num}" data-col-key="${c.key}" contenteditable="true" style="line-height:${rowH}px">${v}</span></td>`;
      }
      tr.innerHTML = inner;
      tb.appendChild(tr);
    }

    // persist edits
    tb.querySelectorAll('tr.empty-row .cell-edit').forEach(span => {
      span.addEventListener('focus', e => e.target.closest('td').classList.add('editing'));
      span.addEventListener('blur',  e => {
        e.target.closest('td').classList.remove('editing');
        const r = e.target.dataset.row, ck = e.target.dataset.colKey;
        const k = r + '_' + ck;
        buf[k] = e.target.textContent.trim();
      });
      span.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); }
        if (e.key === 'Escape') { e.target.textContent = buf[e.target.dataset.row + '_' + e.target.dataset.colKey] || ''; e.target.blur(); }
      });
    });
    // selection.js handles gutter clicks → row selection (Sheets-style)
  }

  // ----- row click & double-click handling -----
  // NOTE: most click behavior now lives in selection.js (Google Sheets-style).
  // This handler just preserves dbl-click-on-gutter → expand-detail.
  function onRowClick(tr, d, rIdx) {
    return e => {
      // ignore clicks on widgets
      if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
      if (e.target.closest('button')) return;
      if (e.target.closest('.dh')) return;
      if (e.target.closest('[contenteditable]')) return;
      // selection layer handles everything else
    };
  }

  function wireRowEvents(kbRows) {
    const ds = currentDataset();
    document.querySelectorAll('tr.dr').forEach(tr => {
      const id = tr.dataset.id;
      const d = ds.find(x => String(x.id) === String(id));
      if (!d) return;
      const rIdx = parseInt(tr.dataset.idx);
      tr.addEventListener('click', onRowClick(tr, d, rIdx));
      // dbl-click on gutter = toggle inline expand row (xId machinery in this
      // file). The expanded row renders the property image card, brief data,
      // AI narrative panel, thumbs/save/hot/flag action icons, the "Open
      // Deal Room" link (which still navigates to /deal/:id), and the chat
      // discuss button. Wiring was inadvertently changed to openDetail
      // during the actions-routing refactor on 2026-05-26 (PR #6); restored
      // here so the original Deal Feed Excel design behavior works again.
      const g = tr.querySelector('td.gutter');
      if (g) g.addEventListener('dblclick', e => {
        e.stopPropagation();
        ND._toggleExpand(d.id);
      });
    });
    document.querySelectorAll('.stsel').forEach(s => s.addEventListener('change', e => {
      const d = ds.find(x => x.id == e.target.dataset.id);
      if (d) ND.actions?.setStage?.(d.id, e.target.value);
    }));
    document.querySelectorAll('.ni').forEach(i => {
      i.addEventListener('change', e => {
        const d = ds.find(x => x.id == e.target.dataset.id);
        if (d) ND.actions?.saveNote?.(d.id, e.target.value);
      });
      i.addEventListener('focus', e => e.target.closest('td')?.classList.add('editing'));
      i.addEventListener('blur',  e => e.target.closest('td')?.classList.remove('editing'));
    });
    document.querySelectorAll('.qrow-trig').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const d = ds.find(x => x.id == e.currentTarget.dataset.id);
      if (!d) return;
      const act = e.currentTarget.dataset.act;
      const cur = d.hot ? 'hot' : null;
      if (act === 'up') ND.actions?.toggleHot?.(d.id, cur);
      if (act === 'dn') {
        ND.actions?.setStage?.(d.id, 'Passed');
        if (d.hot) ND.actions?.toggleHot?.(d.id, 'hot');
        ND.actions?.markRead?.(d.id);
      }
    }));
    // editable spans on real rows
    document.querySelectorAll('tr.dr [data-edit]').forEach(span => {
      span.setAttribute('contenteditable', 'true');
      span.addEventListener('focus', e => e.target.closest('td')?.classList.add('editing'));
      span.addEventListener('blur',  e => {
        e.target.closest('td')?.classList.remove('editing');
        const d = ds.find(x => x.id == e.target.dataset.id);
        if (!d) return;
        const field = e.target.dataset.edit;
        const text = e.target.textContent.trim();
        if (field === 'addr')   d.addr = text;
        if (field === 'date')   d.date = text;
        if (field === 'asset')  d.asset = text;
        if (field === 'owner')  d.owner = text;
        if (field === 'hold')   d.hold = text;
        if (field === 'sig')    d.sig = text;
        if (field === 'psf')    d.psf = parseFloat(text.replace(/[^0-9.]/g,'')) || d.psf;
        if (field === 'sf')     d.sf  = parseInt(text.replace(/[^0-9]/g,''))  || d.sf;
      });
      span.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
        if (e.key === 'Escape') { e.target.blur(); }
      });
    });
  }

  function currentDataset() {
    const day = ND.state.activeDay;
    const real = ND.deals.filter(d => d.deliveredOn === day);
    const stubs = stubCache[day] || [];
    return real.concat(stubs);
  }

  // ----- Column resize -----
  function initColResize() {
    document.querySelectorAll('th .col-resize').forEach(h => {
      h.addEventListener('mousedown', e => {
        e.preventDefault();
        const colKey = h.dataset.col;
        const spec = COLS.find(c => c.key === colKey);
        if (!spec || !spec.resizable) return;
        h.classList.add('dragging');
        const startX = e.clientX;
        const startW = colW[colKey];
        const onMove = ev => {
          const dx = ev.clientX - startX;
          let w = Math.round(startW + dx);
          w = Math.max(spec.min, Math.min(spec.max, w));
          colW[colKey] = w;
          applyColWidths();
        };
        const onUp = () => {
          h.classList.remove('dragging');
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          document.body.style.cursor = '';
        };
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }

  // ----- bulk + chips + toolbar -----
  document.getElementById('bss').addEventListener('change', e => {
    const v = e.target.value; if (!v) return;
    sel.forEach(id => {
      const d = currentDataset().find(x => x.id === id);
      if (d) ND.actions?.setStage?.(d.id, v);
    });
    sel.clear();
    e.target.value = '';
  });
  document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    chipFilter = c.dataset.f;
    rr();
  }));
  document.querySelectorAll('.dbtn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.dbtn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    density = b.dataset.d; rr();
  }));
  document.querySelectorAll('.tri').forEach(tri => tri.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    if (ND.filterPopover) {
      ND.filterPopover.show(tri.dataset.key, tri);
      return;
    }
    const pop = document.getElementById('fpop');
    if (pop && pop.style.display === 'block') { pop.style.display = 'none'; return; }
    sfp(tri.dataset.key, tri);
  }));
  document.addEventListener('click', e => {
    if (!e.target.closest('#fpop') && !e.target.closest('.tri')) {
      const pop = document.getElementById('fpop'); if (pop) pop.style.display = 'none';
    }
  });
  document.getElementById('dclose').addEventListener('click', () => {
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('tw').classList.remove('drawer-open');
  });
  document.getElementById('cs').addEventListener('click', sendMsg);
  document.getElementById('ci').addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });

  // ----- keyboard nav (action hotkeys; arrow/edit nav lives in selection.js) -----
  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (e.target.isContentEditable) return;
    // Skip if the user is holding cmd/ctrl (let browser shortcuts / selection.js win)
    if (e.metaKey || e.ctrlKey) return;

    // Resolve the row under the active selection (selection.js owns nav)
    const r = ND.sheet?.a?.r;
    const row = (r !== undefined && r !== null) ? ND.sheet.rowAt(r) : null;
    const id = row?.dataset?.id ? parseInt(row.dataset.id) : null;
    const d  = id ? currentDataset().find(x => x.id === id) : null;

    if (e.key === 't' || e.key === 'T') {
      ND.jumpToday(); e.preventDefault();
    } else if (e.key === 'ArrowLeft' && e.altKey) { ND.stepDay(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight' && e.altKey) { ND.stepDay(1); e.preventDefault(); }
    else if (e.key === 'y' || e.key === 'Y') {
      if (d) {
        ND.actions?.toggleHot?.(d.id, d.hot ? 'hot' : null);
        e.preventDefault();
      }
    } else if (e.key === 'n' || e.key === 'N') {
      if (d) {
        ND.actions?.setStage?.(d.id, 'Passed');
        if (d.hot) ND.actions?.toggleHot?.(d.id, 'hot');
        ND.actions?.markRead?.(d.id);
        e.preventDefault();
      }
    } else if (e.key === 's' || e.key === 'S') {
      if (d) {
        ND.actions?.toggleSave?.(d.id, d.saved);
        e.preventDefault();
      }
    }
  });

  // ----- viewport resize → re-fill empty rows -----
  let rzTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(rzTimer); rzTimer = setTimeout(rr, 100);
  });

  // ----- wire tabs callback -----
  ND.onDayChange = () => {
    xId = null;
    activeRowId = null;
    sel.clear();
    kbIdx = -1;
    ND.sheet?.clear?.();
    rr();
  };

  // Expose for context-menu / selection helpers
  ND._rr = rr;
  ND._toggleExpand = id => { xId = (xId === id) ? null : id; rr(); };

  // ----- initial -----
  applyColWidths();
  initColResize();
  ND.renderTabs();
  rr();
  renderIcons(document);
})();
