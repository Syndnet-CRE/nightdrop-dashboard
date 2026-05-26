/* ============================================
   TABS: Excel sheet-tab strip + calendar popover
   ============================================ */

(function() {
  const cal = ND.calendar;
  const MONTH_NAMES_3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAY_NAMES_3 = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function findContaining(dayISO) {
    for (const m of cal) for (const w of m.weeks) for (const d of w.days)
      if (d.key === dayISO) return { month: m, week: w, day: d };
    return null;
  }

  // Initialize
  const initial = findContaining(ND.todayISO);
  ND.state = ND.state || {};
  ND.state.activeMonth = initial?.month?.key || cal[cal.length - 1].key;
  ND.state.activeWeek  = initial?.week?.key  || cal[cal.length - 1].weeks[0].key;
  ND.state.activeDay   = initial?.day?.key   || ND.state.activeWeek;
  let popOpen = false;

  function activeRefs() {
    const m = cal.find(x => x.key === ND.state.activeMonth);
    const w = m ? m.weeks.find(x => x.key === ND.state.activeWeek) : null;
    const d = w ? w.days.find(x => x.key === ND.state.activeDay) : null;
    return { month: m, week: w, day: d };
  }

  function fmtRange(week) {
    const s = week.start, e = week.end;
    if (s.getMonth() === e.getMonth()) return `${MONTH_NAMES_3[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
    return `${MONTH_NAMES_3[s.getMonth()]} ${s.getDate()} – ${MONTH_NAMES_3[e.getMonth()]} ${e.getDate()}`;
  }

  function setMonth(monthKey, opts = {}) {
    const m = cal.find(x => x.key === monthKey);
    if (!m) return;
    ND.state.activeMonth = monthKey;
    const todayInfo = findContaining(ND.todayISO);
    let pickW = (todayInfo && todayInfo.month.key === monthKey) ? todayInfo.week : m.weeks[m.weeks.length - 1];
    ND.state.activeWeek = pickW.key;
    if (!opts.skipDay) setDayForWeek(pickW.key, { silent: true });
    if (!opts.silent) { render(); fire(); }
  }

  function setWeek(weekKey, opts = {}) {
    const refs = activeRefs();
    if (!refs.month) return;
    const w = refs.month.weeks.find(x => x.key === weekKey);
    if (!w) {
      // weekKey might be in a different month — find it
      for (const m of cal) {
        const wk = m.weeks.find(x => x.key === weekKey);
        if (wk) { ND.state.activeMonth = m.key; break; }
      }
    }
    ND.state.activeWeek = weekKey;
    setDayForWeek(weekKey, { silent: true });
    if (!opts.silent) { render(); fire(); }
  }

  function setDayForWeek(weekKey, opts = {}) {
    const refs = activeRefs();
    if (!refs.month) return;
    const w = refs.month.weeks.find(x => x.key === weekKey) || refs.month.weeks.find(x => x.key === ND.state.activeWeek);
    if (!w) return;
    const todayInfo = findContaining(ND.todayISO);
    let pickD;
    if (todayInfo && todayInfo.week.key === weekKey) pickD = todayInfo.day;
    else {
      const withDeals = [...w.days].reverse().find(d => d.count > 0);
      pickD = withDeals || w.days[w.days.length - 1];
    }
    ND.state.activeDay = pickD.key;
    if (!opts.silent) { render(); fire(); }
  }

  function setDay(dayKey) {
    ND.state.activeDay = dayKey;
    render(); fire();
  }

  function fire() { if (typeof ND.onDayChange === 'function') ND.onDayChange(ND.state.activeDay); }

  function jumpToday() {
    const t = findContaining(ND.todayISO);
    if (!t) return;
    ND.state.activeMonth = t.month.key;
    ND.state.activeWeek  = t.week.key;
    ND.state.activeDay   = t.day.key;
    render(); fire();
  }

  function stepDay(delta) {
    const flat = [];
    cal.forEach(m => m.weeks.forEach(w => w.days.forEach(d => flat.push({ m, w, d }))));
    const idx = flat.findIndex(x => x.d.key === ND.state.activeDay);
    if (idx < 0) return;
    const next = flat[idx + delta];
    if (!next) return;
    ND.state.activeMonth = next.m.key;
    ND.state.activeWeek  = next.w.key;
    ND.state.activeDay   = next.d.key;
    render(); fire();
  }

  function stepWeek(delta) {
    const refs = activeRefs();
    if (!refs.month) return;
    // gather all weeks across cal
    const allWeeks = [];
    cal.forEach(m => m.weeks.forEach(w => allWeeks.push({ m, w })));
    const idx = allWeeks.findIndex(x => x.w.key === ND.state.activeWeek);
    if (idx < 0) return;
    const next = allWeeks[idx + delta];
    if (!next) return;
    ND.state.activeMonth = next.m.key;
    ND.state.activeWeek  = next.w.key;
    setDayForWeek(next.w.key, { silent: true });
    render(); fire();
  }

  function render() {
    const refs = activeRefs();
    if (!refs.month || !refs.week || !refs.day) return;
    const tb = document.getElementById('tabbar');
    if (!tb) return;

    // Week-of label
    const wkLabel = fmtRange(refs.week);

    const html = `
      <button class="tb-icon-btn" id="tb-menu" title="Browse weeks (M)"><i class="ti ti-menu-2"></i></button>
      <button class="tb-icon-btn" id="tb-prev-wk" title="Previous week (Alt+←)"><i class="ti ti-chevron-left"></i></button>

      ${refs.week.days.map(d => {
        const isActive = d.key === ND.state.activeDay;
        const hasDeals = d.count > 0;
        const classes = ['sheet-tab', isActive ? 'active' : '', hasDeals ? 'has-deals' : '', d.isToday ? 'is-today' : ''].join(' ');
        return `<button class="${classes}" data-day="${d.key}">
          <div class="sheet-tab-top">
            <span class="sheet-tab-day">${DAY_NAMES_3[d.date.getDay()]}</span>
            <span class="sheet-tab-date">${MONTH_NAMES_3[d.date.getMonth()]} ${d.dn}</span>
          </div>
          <div class="sheet-tab-bot">
            <span class="sheet-tab-dot"></span>
            <span class="sheet-tab-count">${d.count > 0 ? d.count + (d.count === 1 ? ' deal' : ' deals') : '—'}</span>
            ${d.isToday ? '<span style="color:var(--warn);font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:9px">Today</span>' : ''}
          </div>
        </button>`;
      }).join('')}

      <button class="tb-icon-btn" id="tb-next-wk" title="Next week (Alt+→)"><i class="ti ti-chevron-right"></i></button>
      <button class="tb-icon-btn today" id="tb-today" title="Jump to today (T)">Today</button>

      <div class="tabbar-spacer"></div>
      <div class="tabbar-meta">
        <span>Week: <b>${wkLabel}</b></span>
        <span>${refs.month.labelFull}: <b>${refs.month.total}</b> deals</span>
        ${refs.day.isToday ? '<span class="today-pill">Tonight\u2019s drop</span>' : ''}
      </div>

      <div class="cal-pop ${popOpen ? 'open' : ''}" id="cal-pop">
        <div class="cal-pop-hd">
          <div class="cal-pop-title">Browse drops</div>
          <button class="cal-pop-close" id="cal-close" title="Close"><i class="ti ti-x"></i></button>
        </div>
        <div class="cal-months">
          ${cal.map(m => `<button class="cal-month ${m.key===ND.state.activeMonth?'active':''}" data-mo="${m.key}">
            <span>${m.labelFull}</span>
            <span class="cal-month-count">${m.total}</span>
          </button>`).join('')}
        </div>
        <div class="cal-weeks">
          ${refs.month.weeks.map(w => {
            const isActive = w.key === ND.state.activeWeek;
            const hasToday = findContaining(ND.todayISO)?.week?.key === w.key;
            return `<div class="cal-week-row ${isActive?'active':''}" data-wk="${w.key}">
              <span class="cal-week-label">${fmtRange(w)} ${hasToday?'<span style="color:var(--warn);font-size:9px;margin-left:6px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">This week</span>':''}</span>
              <span class="cal-week-range">${w.start.getFullYear()}</span>
              <span class="cal-week-count ${w.total===0?'zero':''}">${w.total>0?w.total+' deals':'—'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
    tb.innerHTML = html;

    tb.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => setDay(b.dataset.day)));
    tb.querySelectorAll('[data-mo]').forEach(b => b.addEventListener('click', () => setMonth(b.dataset.mo)));
    tb.querySelectorAll('[data-wk]').forEach(b => b.addEventListener('click', () => {
      setWeek(b.dataset.wk);
      popOpen = false;
    }));
    tb.querySelector('#tb-menu')?.addEventListener('click', e => {
      e.stopPropagation();
      popOpen = !popOpen; render();
    });
    tb.querySelector('#cal-close')?.addEventListener('click', () => { popOpen = false; render(); });
    tb.querySelector('#tb-today')?.addEventListener('click', jumpToday);
    tb.querySelector('#tb-prev-wk')?.addEventListener('click', () => stepWeek(-1));
    tb.querySelector('#tb-next-wk')?.addEventListener('click', () => stepWeek(1));

    if (ND._renderIcons) ND._renderIcons(tb);
  }

  // close pop on outside click
  document.addEventListener('click', e => {
    if (!popOpen) return;
    if (e.target.closest('#cal-pop') || e.target.closest('#tb-menu')) return;
    popOpen = false; render();
  });

  ND.renderTabs = render;
  ND.jumpToday = jumpToday;
  ND.stepDay = stepDay;
  ND.stepWeek = stepWeek;
  ND.toggleCalPop = () => { popOpen = !popOpen; render(); };
})();
