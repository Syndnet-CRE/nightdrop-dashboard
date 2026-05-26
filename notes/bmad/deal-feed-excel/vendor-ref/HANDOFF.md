# HANDOFF.md — Deal Feed Integration

## Goal
Replace the existing Deal Feed view with the **vanilla-JS** bundle in this
folder. Collapsible sidebar + Google Sheets-style spreadsheet + chat drawer +
day-tab strip, all light-themed. The host's top-status header (pipeline
timeline + countdown clock) must remain untouched.

## ⚠️ Read this first

**This is vanilla JS, no framework.** Modules attach to `window.ND` and use
plain DOM APIs. If the host app is React/Vue/Svelte, you must:
- Wrap each script's IIFE in a component lifecycle hook (`useEffect` /
  `mounted`) so it runs once, OR
- Port to declarative components (larger task — surface to user first)
- Either way, preserve `window.ND`. See TYPES.md.

## Known integration risks (audit before merging)

### CSS class-name collisions
`styles.css` defines unscoped class names. Grep the host repo for these and
refactor or scope-prefix:
```
.app, .main, .sidebar, .brand, .brand-mark, .brand-name, .nav, .nav-item, .badge
.feed, .feed-main, .toolbar, .statsbar, .fbar, .tabbar
.tw, .gutter, .gutter-corner, .colhdr
.chip, .tbtn, .vbtn, .dbtn, .sort, .sort-sel
.pill, .pill-r, .pill-a, .pill-g, .pill-gray
.chat-drawer, .dh2, .dmsgs, .msg, .dinp, .dsend
```
CSS custom properties (in `:root`):
```
--accent, --bg, --surf, --fg, --border, --gridline, --nav-w, --topbar-h,
--gutter-w, --colhdr-h, --font-sans, --font-mono, --ease, --r-md, --s-2, ...
```
**Quickest fix if collisions:** wrap all new markup in
`<div class="nd-component">` and prepend `.nd-component ` to every selector
in both CSS files.

### Tweaks panel postMessage
`sidebar-tweaks.js` posts `__edit_mode_available` to `window.parent` on
init, expecting an iframe host. In a non-iframe deploy this no-ops. Either:
- Wire a host listener that toggles `__activate_edit_mode` /
  `__deactivate_edit_mode` messages, OR
- Replace the `window.parent.postMessage(...)` calls with a local toggle wired
  to a toolbar button

### Chat drawer placement
`<aside class="chat-drawer">` is positioned absolutely inside
`<section class="feed">`. If the host has its own drawer/overlay system,
coordinate stacking; consider portaling to a root.

### localStorage keys
- `nd:sidebar-collapsed:v1` — sidebar state
- `nd:sidebar-tweaks:v2` — logo selection
- `nd:rowheights:v1` — row height overrides

Namespace-prefix if collisions exist.

## Load order

```html
<head>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="light-theme.css">
  <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
</head>
<body>
  <!-- markup: <aside.sidebar>, host topbar, <section.feed sheet-light> -->

  <script src="data.js"></script>
  <script src="tabs.js"></script>
  <script src="selection.js"></script>
  <script src="context-menu.js"></script>
  <script src="row-resize.js"></script>
  <script src="filter-popover.js"></script>
  <script src="sidebar.js"></script>
  <script src="sidebar-tweaks.js"></script>
  <script src="feed.js"></script>
</body>
```

`feed.js` must load LAST — its IIFE calls `rr()` to bootstrap rendering.

## Integration steps

1. **Audit** host codebase for collisions (CSS classes + custom properties).
   Surface findings to user before merging.
2. **Drop CSS** in the load order above.
3. **Drop JS** in the load order above.
4. **Replace the existing Deal Feed markup** with the `<aside class="sidebar">`
   and `<section class="feed sheet-light">` blocks from `index.html`. Both
   sit inside `<div class="app" id="app">` grid:
   `grid-template-columns: var(--nav-w) 1fr`.
5. **Slot host topbar** inside `<main class="main">`, immediately before
   `<section class="feed">`.
6. **Wire real data** in `data.js` per TYPES.md.
7. **Resolve Tweaks-panel postMessage** per the caveat above.
8. **Verify the checklist below.**

## Feature checklist

- [ ] Sidebar collapses to 64px on chevron click; state survives reload
- [ ] Cmd/Ctrl+\\ toggles the sidebar
- [ ] 99+ badge renders as iPhone-style red dot on Deal Feed icon when collapsed
- [ ] Click cell → green 2px active border; click row gutter / column letter → row/column tinted
- [ ] Drag range-select; Shift+click extends; Cmd+click adds non-contiguous
- [ ] Cmd/Ctrl+Arrow jumps to data edge; +Shift extends
- [ ] F2 / typing enters edit; dbl-click on `$/SF`/`SF`/`Hold` enters edit with confirmation modal
- [ ] Dbl-click on any other deal-row cell opens deal detail
- [ ] Cmd/Ctrl+C copies as TSV
- [ ] Right-click menu: export selected, export table, copy, mark hot/saved/read, delete, open detail
- [ ] Column filter popover opens from each header triangle
- [ ] Column resize from headers; row resize from gutter bottom edge
- [ ] Name Box (top-left) shows current cell address; updates live during drag
- [ ] Hover crosshair: row gutter + column letter tint
- [ ] Numeric columns right-aligned
- [ ] Internal cell gridlines visible inside selected ranges
- [ ] Statsbar has 2px bottom border separator
- [ ] Chat drawer opens from "Discuss" on expanded row; invisible scroll
- [ ] Agent briefing panel: chevron when content overflows
- [ ] Day-tab strip navigates between days
- [ ] Host topbar (pipeline + countdown) unchanged above the new component
- [ ] No console errors

## Definition of done
All checklist items pass + no regressions in the existing topbar +
localStorage keys don't collide.
