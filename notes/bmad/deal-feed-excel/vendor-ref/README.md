# Nightdrop Deal Feed — Handoff Package

This bundle contains the full Deal Feed component (collapsible sidebar + Google
Sheets-style Excel grid) ready to drop into the existing application.

## What's NOT included

The top-status header / pipeline timeline / countdown clock is **not** in this
bundle — your existing implementation of that header should stay intact. The
`handoff/index.html` file has that section removed so you can see the layout
without it.

## File tree

```
handoff/
├── index.html             ← Reference HTML (sidebar + sheet, no topbar)
├── styles.css             ← All visual tokens, sidebar, sheet, drawer, etc.
├── light-theme.css        ← Light theme scoped to .sheet-light
├── data.js                ← Deal + calendar data
├── tabs.js                ← Day-tab strip at the bottom
├── selection.js           ← Sheets-style cell/row/col selection engine
├── context-menu.js        ← Right-click menu + confirm modal + CSV export
├── row-resize.js          ← Drag the gutter bottom edge to resize rows
├── filter-popover.js      ← Column filter popover (Sheets style)
├── sidebar.js             ← Sidebar collapse/expand + localStorage persistence
├── sidebar-tweaks.js      ← Sidebar style/logo Tweaks panel
└── feed.js                ← Main feed renderer + table layout
```

## Integration steps for Claude Code

1. **Copy assets** — drop `styles.css` and `light-theme.css` into the project's
   styles directory. Add them to the page in that order (styles → light-theme).
   The light theme is scoped to the `.sheet-light` class so it won't bleed into
   other parts of the app.

2. **Copy scripts** — drop the JS files into the scripts directory. Load order
   must be:
   ```html
   <script src="data.js"></script>
   <script src="tabs.js"></script>
   <script src="selection.js"></script>
   <script src="context-menu.js"></script>
   <script src="row-resize.js"></script>
   <script src="filter-popover.js"></script>
   <script src="sidebar.js"></script>
   <script src="sidebar-tweaks.js"></script>
   <script src="feed.js"></script>
   ```
   Plus Lucide for icons in the `<head>`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
   ```

3. **Insert the markup** — paste the `<aside class="sidebar">` (sidebar) and
   the `<section class="feed sheet-light">` (deal feed / sheet) blocks from
   `index.html` into the existing layout. They sit side-by-side inside a
   `<div class="app" id="app">` grid container with two columns:
   `grid-template-columns: var(--nav-w) 1fr`.

4. **Keep your existing topbar** — slot the existing pipeline-timeline /
   countdown clock header element where the `<!-- TOP HEADER -->` comment used
   to be in this file (right after `<main class="main">` opens, before
   `<section class="feed">`).

## Features included

### Collapsible sidebar
- Chevron toggle between brand and first nav item (Cmd/Ctrl + \\ shortcut)
- Collapses to 64px-wide icon rail with red notification dot on Deal Feed icon
- Style C (left accent bar) locked in as the active-row indicator
- localStorage-persisted state (key: `nd:sidebar-collapsed:v1`)

### Tweaks panel
- Opens via host's `__activate_edit_mode` postMessage
- Lets the user pick the brand logo (5 variants); design style is locked to C
- localStorage-persisted (key: `nd:sidebar-tweaks:v2`)

### Google Sheets-style spreadsheet
- Click cell → 2px green active border
- Click row gutter / column letter → row or column select with light tint
- Drag to range-select; Shift+click extend; Cmd+click multi-range
- Cmd/Ctrl+Arrow jump-to-edge; Cmd/Ctrl+Shift+Arrow extend-to-edge
- F2 / typing / dbl-click on $/SF, SF, Hold cells enter edit mode
- Dbl-click on other deal-row cells opens the deal detail
- Cmd/Ctrl+C copies selection as TSV
- Right-click menu: export selected rows, export table, copy, mark hot/saved/read,
  delete, open detail
- Confirmation modal for editing buy-box-driven cells
- Filter popover (Sheets-style: search + sort + checkboxes) on every column
- Column resize from headers; row resize from gutter bottom edge
- Name Box in top-left corner shows current selection address (C3, C3:E5,
  3R × 3C while dragging, etc.)
- Numeric columns ($/SF, SF, Hold) right-aligned
- Hover crosshair highlights the corresponding row gutter + column letter
- Light theme (white sheet, gray headers, accent green) scoped to `.sheet-light`
- Chat drawer ("Discuss") light-themed; invisible scrollbar inside chat
- Agent briefing panel with invisible scroll + chevron indicator
- Day-tab strip at the bottom with month/week/day navigation

### Persisted state keys (localStorage)
- `nd:sidebar-collapsed:v1` — collapsed/expanded
- `nd:sidebar-tweaks:v2` — logo selection
- `nd:rowheights:v1` — per-row height overrides

## Notes
- All deal data is in-memory only (`data.js`); wire your real data source by
  replacing the `ND.deals`, `ND.boxes`, `ND.calendar`, etc. exports.
- The pipeline-timeline / countdown clock CSS classes (`.topbar`, `.tl-*`,
  `.run-clock`, etc.) are still defined in `styles.css` so your existing
  header keeps working when you paste it back in.
