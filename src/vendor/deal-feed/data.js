/* ============================================
   DATA: deals, buy boxes, calendar (6 months)
   ============================================ */

window.ND = window.ND || {};

ND.stages = ['New', 'Researching', 'Contacted', 'Negotiating', 'Passed', 'Closed'];

ND.boxes = [
  { id: 'ss',   name: 'self storage',                asset: 'Self Storage',          color: '#2da200', depth: 1247, mr: 80 },
  { id: 'wpg',  name: 'WPG Rural Land Search',       asset: 'Industrial / Land',     color: '#3b82f6', depth: 389,  mr: 70 },
  { id: 'land', name: 'Land Search: 100-200 acres',  asset: 'Land',                  color: '#a855f7', depth: 203,  mr: 65 },
];

/* Bullets are an array of {label, body} pairs. label is bolded, body is the rest of the sentence. */
ND.deals = [
  { id: 1, bx: 'ss', score: 83, addr: '3717 Ranch Road 620 N', city: 'Austin, TX 78734',
    brief: '29-yr trust hold — high distress, land value dominates',
    date: 'Wed May 13', deliveredOn: '2026-05-13', asset: 'Self Storage', psf: 76, sf: 8292, owner: 'Trust', hold: '29 yr',
    sig: '29-Yr Trust Hold', sc: 'pill-r', stage: 'New', notes: '',
    unread: true, saved: false, hot: true, up: false, la: 'r',
    ext: { parcel: '4217-0001-A', county: 'Travis', lastSale: '03/14/1997', lastPrice: '$420K',
           assessed: '$1.2M', landVal: '$890K', bldgVal: '$310K', zoning: 'CS-MU', lotSF: '36,200',
           yearBuilt: '1994', deed: 'Warranty', mortAmt: 'None', mortLender: '—', mortDate: '—' },
    bullets: [
      { label: 'Hold:',   body: '29 years since 1997 — well past the typical 7–10 year hold window for individual operators.' },
      { label: 'Owner:',  body: 'Trust structure with absentee trustees. Heirs are the real decision-makers.' },
      { label: 'Debt:',   body: 'No mortgage surfaced. Likely free-and-clear with maximum equity-extraction headroom.' },
      { label: 'Angle:',  body: 'Estate-liquidity outreach — frame around tax-efficient exit, not market price.' },
    ],
    narr: '29-year hold since 1997, absentee, trust-held. Trust structure suggests estate planning — heirs or trustees are the real decision-makers. No mortgage surfaced, pointing to likely free-and-clear ownership with maximum equity extraction potential. Land value dominates the assessed valuation, which means the box-by-box self-storage operation is functionally a placeholder use. Likely below-market rents on the storage side make an as-is acquisition unattractive on cash flow alone — the play is land basis with optionality.'
  },
  { id: 2, bx: 'ss', score: 80, addr: '2201 Kinney Rd', city: 'Austin, TX 78704',
    brief: 'South Austin 43K-SF, 16-yr LLC distress signals',
    date: 'Wed May 13', deliveredOn: '2026-05-13', asset: 'Self Storage', psf: 244, sf: 43060, owner: 'Individual', hold: '16 yr',
    sig: 'High distress (70)', sc: 'pill-r', stage: 'Researching', notes: 'South Austin corridor',
    unread: true, saved: false, hot: false, up: false, la: 'm',
    ext: { parcel: '0318-0045-B', county: 'Travis', lastSale: '07/22/2009', lastPrice: '$3.1M',
           assessed: '$10.5M', landVal: '$4.2M', bldgVal: '$6.3M', zoning: 'CS', lotSF: '89,400',
           yearBuilt: '2001', deed: 'Warranty', mortAmt: 'None surfaced', mortLender: '—', mortDate: '—' },
    bullets: [
      { label: 'Distress:', body: 'Score of 70 — elevated. Multiple legal and tax-lien indicators across the past 18 months.' },
      { label: 'Hold:',     body: '16-year LLC hold; ownership tenure fatigue typical of the 12-yr+ band.' },
      { label: 'Owner:',    body: 'San Antonio individual — limited Austin operational bandwidth.' },
      { label: 'Comps:',    body: '$244/SF basis is rich on paper but the underlying corridor has cleared $310+ for stabilized stock.' },
    ],
    narr: 'South Austin 43K-SF storage on a high-traffic corridor. 16-year LLC hold with elevated distress score of 70. Absentee San Antonio owner — limited local management bandwidth and tenure fatigue signals present. Corridor comp set is healthy; stabilized stock has cleared above the in-place per-SF basis. Approach is conventional acquisitions outreach with a soft anchor on operational lift potential.'
  },
  { id: 3, bx: 'ss', score: 74, addr: '15200 Debba Dr', city: 'Austin, TX 78734',
    brief: '28-yr individual, absentee in Horseshoe Bay',
    date: 'Fri May 15', deliveredOn: '2026-05-15', asset: 'Self Storage', psf: 55, sf: 5616, owner: 'Individual', hold: '28 yr',
    sig: 'Absentee — Horseshoe Bay', sc: 'pill-a', stage: 'New', notes: '',
    unread: false, saved: true, hot: false, up: false, la: 'm',
    ext: { parcel: '1104-0022-C', county: 'Travis', lastSale: '11/03/1998', lastPrice: '$185K',
           assessed: '$308K', landVal: '$220K', bldgVal: '$88K', zoning: 'LI', lotSF: '56,200',
           yearBuilt: '1991', deed: 'Warranty', mortAmt: 'None', mortLender: '—', mortDate: '—' },
    bullets: [
      { label: 'Hold:',  body: '28-year individual hold, no transfers since 1998.' },
      { label: 'Owner:', body: 'Absentee — Horseshoe Bay residence, ~50 miles west.' },
      { label: 'Size:',  body: 'Sub-5K-SF — below our typical floor for the buy box but priced cheap.' },
      { label: 'Debt:',  body: 'No mortgage surfaced; assessed value sits well above last sale price.' },
    ],
    narr: '28-year individual hold with absentee owner in Horseshoe Bay. Sub-5K-SF Lakeway storage with low price per SF suggesting below-market rents. Possible free-and-clear given no mortgage data surfaced. Asset size is below the buy box floor but the basis is small enough that a roll-up or land-banking play is on the table.'
  },
  { id: 4, bx: 'ss', score: 71, addr: '2809 Pearce Rd', city: 'Austin, TX 78730',
    brief: 'No mortgage surfaced — possible free and clear',
    date: 'Thu May 14', deliveredOn: '2026-05-14', asset: 'Self Storage', psf: 91, sf: 12480, owner: 'LLC', hold: '11 yr',
    sig: 'No mortgage surfaced', sc: 'pill-g', stage: 'Contacted', notes: 'Follow up Mon',
    unread: false, saved: false, hot: false, up: true, la: 'r',
    ext: { parcel: '2201-0087-D', county: 'Travis', lastSale: '04/17/2015', lastPrice: '$1.1M',
           assessed: '$1.14M', landVal: '$520K', bldgVal: '$620K', zoning: 'GR', lotSF: '43,100',
           yearBuilt: '2008', deed: 'Special Warranty', mortAmt: 'None surfaced', mortLender: '—', mortDate: '—' },
    bullets: [
      { label: 'Debt:',   body: 'No mortgage data surfaced — likely free-and-clear with strong equity position.' },
      { label: 'Hold:',   body: '11 years on this LLC, just past the typical refi/exit window.' },
      { label: 'Owner:',  body: 'Out-of-state LLC with limited Austin presence.' },
      { label: 'Angle:',  body: 'Equity-liquidity play, not distress. Frame as principal-to-principal liquidity event.' },
    ],
    narr: 'No mortgage data surfaced on this LLC-held asset — likely free and clear with strong equity position. 11-year hold with out-of-state ownership indicators. Approach angle: equity liquidity play, not distress. The asset is mid-tenure but the ownership profile suggests appetite for a clean exit at the right number.'
  },
  { id: 5, bx: 'ss', score: 70, addr: '1802 E 51st St', city: 'Austin, TX 78723',
    brief: 'Free-and-clear possible, sub-10K-SF no debt pressure',
    date: 'Fri May 23', deliveredOn: '2026-05-23', asset: 'Self Storage', psf: 148, sf: 9200, owner: 'Individual', hold: '19 yr',
    sig: 'Free-and-clear possible', sc: 'pill-g', stage: 'Passed', notes: 'Too small',
    unread: false, saved: false, hot: false, up: false, la: null,
    ext: { parcel: '0506-0031-E', county: 'Travis', lastSale: '09/12/2007', lastPrice: '$620K',
           assessed: '$1.36M', landVal: '$900K', bldgVal: '$460K', zoning: 'CS-MU', lotSF: '18,900',
           yearBuilt: '2003', deed: 'Warranty', mortAmt: 'None', mortLender: '—', mortDate: '—' },
    bullets: [
      { label: 'Hold:', body: '19-year individual hold — well into the late-tenure band.' },
      { label: 'Debt:', body: 'No mortgage surfaced; no debt-service pressure.' },
      { label: 'Size:', body: 'Sub-10K-SF — below threshold for this buy box.' },
      { label: 'Note:', body: 'Passed — asset size below threshold.' },
    ],
    narr: '19-year individual hold, no mortgage surfaced. Sub-10K-SF with no debt service pressure. Passed — asset size below threshold for this buy box.'
  },
  { id: 6, bx: 'wpg', score: 77, addr: '4501 Metric Blvd', city: 'Austin, TX 78749',
    brief: 'Out-of-state LLC, 8-yr industrial corridor hold',
    date: 'Sat May 24', deliveredOn: '2026-05-24', asset: 'Industrial', psf: 112, sf: 22000, owner: 'LLC', hold: '8 yr',
    sig: 'Out-of-state LLC owner', sc: 'pill-a', stage: 'New', notes: '',
    unread: true, saved: false, hot: true, up: false, la: null,
    ext: { parcel: '3301-0055-F', county: 'Travis', lastSale: '02/28/2018', lastPrice: '$2.4M',
           assessed: '$2.46M', landVal: '$980K', bldgVal: '$1.48M', zoning: 'LI', lotSF: '62,000',
           yearBuilt: '2002', deed: 'Warranty', mortAmt: '$1.6M', mortLender: 'Frost Bank', mortDate: '03/2018' },
    bullets: [
      { label: 'Owner:', body: 'Out-of-state LLC, limited Austin operational footprint.' },
      { label: 'Hold:',  body: '8 years — past the typical investor refi window.' },
      { label: 'Debt:',  body: '$1.6M Frost Bank mortgage from 2018, likely near recast.' },
      { label: 'Angle:', body: 'Motivated-exit outreach; offer assumes refi optionality is closing.' },
    ],
    narr: 'Out-of-state LLC on a 22K-SF industrial corridor asset. 8-year hold with limited local management. Mortgage in place with Frost Bank — not free and clear but motivated exit signals present. The 2018 vintage debt is approaching the natural recast window, which is typically a strong precursor to an off-market sale.'
  },
  { id: 7, bx: 'wpg', score: 71, addr: '9200 Research Blvd', city: 'Austin, TX 78758',
    brief: 'Corporate LLC, 14-yr tenure, fatigue signals',
    date: 'Sat May 24', deliveredOn: '2026-05-24', asset: 'Industrial', psf: 88, sf: 18500, owner: 'LLC', hold: '14 yr',
    sig: 'Corporate LLC fatigue', sc: 'pill-a', stage: 'New', notes: '',
    unread: true, saved: false, hot: false, up: false, la: null,
    ext: { parcel: '4102-0018-G', county: 'Travis', lastSale: '06/14/2012', lastPrice: '$1.6M',
           assessed: '$1.63M', landVal: '$710K', bldgVal: '$920K', zoning: 'LI-PDA', lotSF: '54,800',
           yearBuilt: '1998', deed: 'Special Warranty', mortAmt: 'None surfaced', mortLender: '—', mortDate: '—' },
    bullets: [
      { label: 'Hold:',  body: '14 years — well past the corporate investor window.' },
      { label: 'Owner:', body: 'Multi-layer LLC structure suggests estate or trust planning.' },
      { label: 'Debt:',  body: 'No mortgage surfaced.' },
      { label: 'Risk:',  body: 'Deed history shows fatigue signals consistent with a passive long-tenure hold.' },
    ],
    narr: '14-year corporate LLC hold on an 18.5K-SF industrial asset. Multiple ownership layer indicators suggest estate or trust planning. Deed history shows fatigue signals consistent with passive hold approaching exit window. Approach should be deliberate and slow — corporate LLCs at this tenure tend to require multiple touches before responding.'
  },
  { id: 8, bx: 'land', score: 71, addr: 'FM 812 Tract — 140 Acres', city: 'Del Valle, TX 78617',
    brief: 'Raw land, absentee individual, no debt surfaced',
    date: 'Sat May 24', deliveredOn: '2026-05-24', asset: 'Land', psf: 12, sf: 6098400, owner: 'Individual', hold: '22 yr',
    sig: 'Raw land — no debt', sc: 'pill-g', stage: 'New', notes: '',
    unread: true, saved: false, hot: false, up: false, la: null,
    ext: { parcel: '8801-0001-H', county: 'Travis', lastSale: '01/08/2004', lastPrice: '$73K',
           assessed: '$731K', landVal: '$731K', bldgVal: '—', zoning: 'AG', lotSF: '6,098,400',
           yearBuilt: '—', deed: 'Warranty', mortAmt: 'None', mortLender: '—', mortDate: '—' },
    bullets: [
      { label: 'Land:',   body: '140 acres of raw AG-zoned land in the Del Valle growth corridor.' },
      { label: 'Owner:',  body: '22-year individual hold — likely inherited or long-term passive.' },
      { label: 'Debt:',   body: 'No mortgage surfaced. Free and clear.' },
      { label: 'Upside:', body: 'Proximity to Austin-Bergstrom growth path; entitlement upside on a 5–7 yr horizon.' },
    ],
    narr: '22-year individual hold on 140 acres of raw land in Del Valle corridor. No debt surfaced. Absentee owner — likely inherited or long-term passive hold. High development potential given proximity to Austin-Bergstrom growth path. Conservative underwriting still pencils given the basis, and AG-to-light-industrial entitlement paths have been clearing in the corridor.'
  },
];

/* ============================================
   CALENDAR
   Today = Sun May 24, 2026
   Generate 6 months back + current + 1 forward
   ============================================ */

ND.todayISO = '2026-05-24';

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

ND.buildCalendar = function() {
  const today = new Date('2026-05-24T00:00:00');
  const start = new Date('2025-12-01T00:00:00');
  const end   = new Date('2026-06-30T00:00:00');

  // count deals per ISO day
  const deliveredByDay = {};
  ND.deals.forEach(d => {
    deliveredByDay[d.deliveredOn] = (deliveredByDay[d.deliveredOn] || 0) + 1;
  });
  // generate fake historical counts for prior dates so tabs feel populated
  // seedable so it's stable across reloads
  function seed(s) { let h = 0; for (let i=0;i<s.length;i++){h = (h*31 + s.charCodeAt(i)) >>> 0;} return h; }
  function rng(s) { const h = seed(s); return ((h*2654435761) >>> 0) / 0xffffffff; }

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
        let count = deliveredByDay[dKey] || 0;
        // synthesize historical counts for past days only
        if (!count && d < today && d >= start) {
          const r = rng(dKey);
          // ~60% of past days have deals, mostly 1-12, occasional zeros
          if (r < 0.6) count = 1 + Math.floor(r * 12);
        }
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
