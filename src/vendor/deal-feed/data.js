/* ============================================
   DATA: bundle bootstrap state — KEPT EMPTY ON PURPOSE.

   The React host (DealFeedExcelView.jsx → publishToBundle in sync.js)
   is the single source of truth for ND.deals, ND.boxes, and ND.calendar.
   This module:
     1. Initializes the bundle's mutable globals to empty values so the
        IIFEs in feed.js / tabs.js / selection.js can safely access them
        before publishToBundle runs (prevents undefined.forEach crashes).
     2. Defines ND.buildCalendar — a pure function that builds the 6-month
        nested months→weeks→days structure tabs.js iterates. publishToBundle
        re-invokes it on every host update so the calendar reflects the
        current ND.deals and ND.todayISO.
     3. Anchors today to the user's local wall-clock at module-load time,
        with a placeholder that publishToBundle immediately overwrites.

   What this module USED to do (removed 2026-05-27 in fix/bundle-adapter-and-mock-data):
     - Shipped 8 hardcoded `ND.deals` rows mirroring the original product's
       demo data. After publishToBundle these were overwritten, but if the
       host failed to push (auth error, network blip), users saw the demos
       as if they were their own deals.
     - Hardcoded `ND.todayISO = '2026-05-24'`. tabs.js IIFE captured the
       resulting calendar, pinning the visible week to May 18–24 2026
       indefinitely. After the production rebuild on 2026-05-20 this began
       silently hiding all real deals.
     - Synthesized fake historical day counts via a seeded RNG so prior
       dates "felt populated." Real users saw 50+ deals/month counts in
       the hamburger calendar that didn't correspond to any deliveries.
   ============================================ */

window.ND = window.ND || {};

ND.stages = ['New', 'Researching', 'Contacted', 'Negotiating', 'Passed', 'Closed'];

// Host owns deals + boxes. Initialized empty so module IIFEs are safe;
// publishToBundle replaces these atomically on every host data update.
ND.boxes = [];
ND.deals = [];

/* ============================================
   CALENDAR
   ============================================ */

function iso(d) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function mondayOf(d) {
  const dt = new Date(d);
  const dow = dt.getDay(); // 0=Sun..6=Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0,0,0,0);
  return dt;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['S','M','T','W','T','F','S']; // Sun..Sat
const DAY_NAMES_LONG = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Placeholder. publishToBundle (sync.js:85) immediately overwrites with
// isoDate(new Date()) — the user's local wall-clock day. This module-load
// value is only visible during the ~50ms window between bundle script
// execution and the first host publish.
ND.todayISO = iso(new Date());

/**
 * Build the months→weeks→days nested calendar structure tabs.js iterates.
 * Reads ND.todayISO and ND.deals at invocation time, so the host's
 * publishToBundle must set both before calling this.
 *
 * Window: 5 months back to 1 month forward from ND.todayISO.
 * Day counts: ONLY come from real ND.deals[*].deliveredOn matches. No
 *   fake historical synthesis.
 */
ND.buildCalendar = function() {
  // Anchor to the host's todayISO when present; fall back to local now()
  // for safety during the bootstrap window.
  const todayKey = ND.todayISO || iso(new Date());
  const todayParts = todayKey.split('-').map(Number);
  const today = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);

  const start = new Date(today);
  start.setMonth(start.getMonth() - 5);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setMonth(end.getMonth() + 1);
  end.setDate(1);
  end.setHours(0, 0, 0, 0);

  // Count deals per ISO day from the current host-supplied dataset.
  const deliveredByDay = {};
  (Array.isArray(ND.deals) ? ND.deals : []).forEach(d => {
    if (d && d.deliveredOn) {
      deliveredByDay[d.deliveredOn] = (deliveredByDay[d.deliveredOn] || 0) + 1;
    }
  });

  // months → weeks → days
  const months = [];
  let cursor = new Date(start);
  while (cursor < end) {
    const m = cursor.getMonth(), y = cursor.getFullYear();
    const monthKey = `${y}-${String(m+1).padStart(2,'0')}`;
    const month = {
      key: monthKey,
      label: MONTH_NAMES[m],
      labelFull: `${MONTH_NAMES[m]} ${y}`,
      year: y, month: m,
      isCurrent: m === today.getMonth() && y === today.getFullYear(),
      weeks: [],
      total: 0
    };
    // weeks: from the Monday on/before the 1st, to the Sunday on/after the last day
    const first = new Date(y, m, 1);
    const last  = new Date(y, m+1, 0);
    let wcur = mondayOf(first);
    while (wcur <= last) {
      const wkey = iso(wcur);
      const wEnd = addDays(wcur, 6);
      const week = {
        key: wkey,
        labelShort: `${MONTH_NAMES[wcur.getMonth()]} ${wcur.getDate()}`,
        labelFull: `Wk of ${MONTH_NAMES[wcur.getMonth()]} ${wcur.getDate()}`,
        start: new Date(wcur), end: new Date(wEnd),
        isCurrent: today >= wcur && today <= wEnd,
        days: [],
        total: 0,
      };
      for (let i = 0; i < 7; i++) {
        const d = addDays(wcur, i);
        const inMonth = d.getMonth() === m && d.getFullYear() === y;
        const dKey = iso(d);
        const count = deliveredByDay[dKey] || 0;
        const day = {
          key: dKey,
          date: new Date(d),
          dayShortLetter: DAY_NAMES[d.getDay()],
          dayShort: DAY_NAMES_LONG[d.getDay()],
          dn: d.getDate(),
          inMonth,
          inRange: d >= start && d <= end,
          isToday: dKey === ND.todayISO,
          isFuture: d > today,
          count,
        };
        if (inMonth) {
          week.days.push(day);
          week.total += count;
        }
      }
      if (week.days.length) {
        month.weeks.push(week);
        month.total += week.total;
      }
      wcur = addDays(wcur, 7);
    }
    months.push(month);
    cursor = new Date(y, m+1, 1);
  }
  return months;
};

ND.calendar = ND.buildCalendar();
