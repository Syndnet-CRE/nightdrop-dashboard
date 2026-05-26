# CLAUDE.md — Nightdrop Deal Feed Bundle

You are integrating this bundle into an existing application. Always:

1. **Read `HANDOFF.md` first** before making any code changes. It contains the
   full integration spec, risks, and a done-checklist.
2. **Read `TYPES.md`** to understand the data shape the renderer expects.
3. **Audit for collisions before merging.** This bundle defines unscoped CSS
   class names and CSS custom properties (`--accent`, `--surf`, etc.).
   Grep the host repo for these names and refactor any conflicts BEFORE pasting
   files in.
4. **Preserve the `window.ND` namespace.** Every JS module reads from / writes
   to `window.ND`. Do not rename, scope, or remove it without a refactor pass.
5. **Do NOT modify the host app's top header** (pipeline timeline + countdown
   clock). It already exists and works. `index.html` shows the bundle's layout
   with that header removed — you slot the host's header back in afterwards.
6. **Ask the user before doing anything irreversible:**
   • Renaming localStorage keys
   • Refactoring `window.ND` to scoped state
   • Porting from vanilla JS to a framework
   • Removing any of the features listed in HANDOFF.md's checklist
7. **After integration, verify against HANDOFF.md's checklist.** Every box must
   pass before opening a PR.

## File map

- `HANDOFF.md` — integration spec
- `TYPES.md` — `window.ND` data shape
- `README.md` — quick reference
- `index.html` — reference layout (topbar removed)
- `styles.css`, `light-theme.css` — styles (light theme scoped to `.sheet-light`)
- `*.js` files — vanilla JS modules; see HANDOFF.md for load order

## Working with the user

When integrating, surface decisions with concrete options:
- "Found class collisions in: X, Y, Z. Want me to (a) scope-prefix new styles,
  (b) refactor old ones, or (c) namespace under `.nd-deal-feed`?"
- "Tweaks panel uses iframe postMessage. We are not in an iframe. Switch to a
  local toggle? Or keep iframe-friendly?"

Never make these calls silently.
