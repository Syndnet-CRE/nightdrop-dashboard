# TYPES.md — `window.ND` Data Shape

The Deal Feed renderer reads from a global `window.ND` namespace. To wire real
data, edit `data.js` to populate these structures from your backend. Preserve
the shapes exactly — the renderer is brittle to missing fields.

## Top-level

```ts
interface ND {
  deals: Deal[];
  boxes: BuyBox[];
  calendar: Month[];
  stages: string[];                  // dropdown values for the Stage column
  state: { activeDay: string };      // currently-selected day ISO ("2026-05-24")
  todayISO: string;                  // today's ISO date

  // Set by feed.js — do not overwrite
  onDayChange?: () => void;
  _rr?: () => void;                  // request a re-render
  _toggleExpand?: (id: number) => void;
  _activeDayDeals?: () => Deal[];

  // Set by selection.js / context-menu.js
  sheet?: SelectionAPI;
  contextMenu?: { show, hide };
  confirmEdit?: (tr, td) => boolean | Promise<boolean>;
  confirmClear?: (n) => boolean | Promise<boolean>;
  toast?: (msg: string) => void;
}
```

## Deal

```ts
interface Deal {
  id: number;                        // unique
  bx: string;                        // buy-box id; matches BuyBox.id

  // Scoring
  score: number;                     // 0-100, drives the ring + color

  // Address
  addr: string;                      // street line
  city: string;                      // "Austin, TX 78749"
  brief: string;                     // 1-line subtitle under the address

  // Delivery
  date: string;                      // human "Sat May 24"
  deliveredOn: string;               // ISO "2026-05-24" — filters by ND.state.activeDay

  // Property facts (shown in the row and detail view)
  asset: 'Self Storage' | 'Industrial' | 'Land' | string;
  psf: number;                       // $ per SF
  sf: number;                        // square feet
  owner: 'LLC' | 'Trust' | 'Individual' | string;
  hold: string;                      // "8 yr"

  // Signal
  sig: string;                       // top signal text
  sc: 'pill-r' | 'pill-a' | 'pill-g';  // red / amber / green pill color

  // Stage and notes
  stage: 'New' | 'Researching' | 'Contacted' | 'Negotiating' | 'Passed' | 'Closed';
  notes: string;

  // Status flags (mutable, set via right-click / quick actions)
  unread: boolean;
  saved: boolean;
  hot: boolean;
  up: boolean;                       // thumbs-up
  la: 'r' | 'm' | null;              // last-activity dot

  // Detail panel
  ext: {
    parcel: string;
    county: string;
    zoning: string;
    yearBuilt: string;
    lotSF: string;
    assessed: string;
    landVal: string;
    bldgVal: string;
    lastSale: string;
    lastPrice: string;
    deed: string;
    mortAmt: string;
    mortLender: string;
    mortDate: string;
  };

  // AI narrative
  bullets: Array<{ label: string; body: string }>;
  narr: string;
}
```

## BuyBox

```ts
interface BuyBox {
  id: string;                        // matches Deal.bx
  name: string;                      // "WPG Rural Land Search"
  asset: string;                     // "INDUSTRIAL / LAND"
  color: string;                     // hex, drives the dot in the group header
  mr: number;                        // match rate %
  depth: number;                     // total pipeline depth
}
```

## Calendar

```ts
interface Month {
  weeks: Week[];
}
interface Week {
  days: Day[];
}
interface Day {
  key: string;                       // ISO date
  count: number;                     // deals delivered that day
  isFuture: boolean;
  isToday: boolean;
}
```

## Notes

- Filters `ND.deals` by `deliveredOn === ND.state.activeDay`. If the active
  day has no deals, the renderer falls back to synthesized stub rows via
  `stubsFor(day, count)` in `feed.js`. Remove that fallback if you want
  real-data-only.
- User edits (notes, stage, deletions, mark-as-hot) mutate `ND.deals` in
  place. Wire writes through your own data layer.
- localStorage keys: `nd:sidebar-collapsed:v1`, `nd:sidebar-tweaks:v2`,
  `nd:rowheights:v1`. Namespace if collisions exist.
