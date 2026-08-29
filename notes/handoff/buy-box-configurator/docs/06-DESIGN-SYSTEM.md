# Buy Box Configurator Design System

## Overview

This document specifies the visual and interaction design for the Buy Box Configurator. It covers two integrated surfaces: (1) a Management page with a Kanban board view and (2) a Configurator Wizard for creating and editing buy boxes. Both are designed for embedding into another platform.

The system is organized by:
- **Design tokens** (color, type, spacing, motion)
- **Layout architecture** (wizard layout, Kanban structure)
- **Component patterns** (cards, pills, chips, interactive controls)
- **Interaction states** (hover, focus, active, selected, disabled)
- **Dialog and overlay systems**

All components use a single source-of-truth token set (tokens.css). When rebuilding in another framework, consume the token system directly rather than hardcoding values.

---

## Design Tokens

### Color Palette

All color tokens are defined in `src/styles/tokens.css` and respond to theme via `[data-theme="light"]` / `[data-theme="dark"]` attributes on the root element.

#### Semantic Colors (Light Mode)

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#359625` | Primary action, active states, brand green |
| `--primary-foreground` | `#ffffff` | Text on primary (always white) |
| `--background` | `#F5F7FA` | Page background (warm off-white) |
| `--card` | `#ffffff` | Card surfaces |
| `--foreground` | `#1F2937` | Primary text (zinc-800, strong contrast) |
| `--secondary-foreground` | `#374151` | Secondary text (zinc-700) |
| `--muted-foreground` | `#6B7280` | Disabled text, captions (zinc-500) |
| `--border` | `#e5e7eb` | Light borders and dividers |
| `--border-1` | `#d4d4d8` | Card and field outlines (darker than border for contrast) |
| `--secondary` | `#f3f4f6` | Subtle background, hover state |
| `--success` | `--primary` | Positive action (aliased to primary green) |
| `--warning` | `#F4B73E` | Warnings, caution states (amber) |
| `--danger` | `#ef4444` | Destructive actions, errors, gaps |
| `--info` | `#3E7BFA` | Informational states (blue) |

#### Dark Mode Overrides

Dark mode uses `[data-theme="dark"]` on the root element. Key shifts:
- Background darkens to `#171717`
- Cards to `#262626`
- Text lightens to `#e5e5e5`
- Primary green shifts to `#2da200` (recognizable, less aggressive)
- Borders adjust to `#404040` for visibility on dark surfaces

#### Brand Green Aliases

```css
--green: var(--primary);                    /* = #359625 (light) / #2da200 (dark) */
--green-deep: var(--primary);               /* Same as --green */
--green-bright: var(--chart-1);             /* = #4FA634 (light) / #7af74d (dark) */
```

Never hardcode green; always use `--green` or `--green-bright` to respect theme and token updates.

#### Pill / Badge Colors

Semantic pill backgrounds (on light surfaces):

| Token | Background | Foreground | Use |
|-------|------------|-----------|-----|
| `--pill-green-bg` | 14% primary blend | `--primary` | Active filters, selected chips |
| `--pill-amber-bg` | `#FDF1D5` | `#8a5a00` | Warnings |
| `--pill-red-bg` | 14% destructive blend | `--destructive` | Error states |
| `--pill-blue-bg` | `#D9E8FB` | `#0F4A99` | Informational |
| `--pill-gray-bg` | `--secondary` | `--muted-foreground` | Neutral/disabled |

### Typography

#### Font Families

```css
--font-sans: 'Manrope', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
--font-display: var(--font-sans);  /* Manrope */
```

- **Manrope** is the only font face used across the entire system.
- **Never use em dashes.** Use a comma, period, or rewrite the sentence.
- **No JetBrains Mono** anywhere in the codebase.

#### Type Scale

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `--t-h1` | 64px | 800 (extrabold) | Page hero |
| `--t-h2` | 48px | 700 (bold) | Major section head |
| `--t-sh1` | 32px | 600 (semibold) | Subheader, emphasis |
| `--t-sh2` | 24px | 600 (semibold) | Card title, step title |
| `--t-p1` | 18px | 400 (regular) | Large paragraph |
| `--t-p2` | 16px | 400 (regular) | Body text |
| `--t-cap` | 13px | 400 (regular) | Caption, small labels |
| `--t-micro` | 11px | 700 (bold) | Eyebrow, uppercase labels |

#### Font Weights

```css
--w-light:     300   /* Rarely used; avoid for small text */
--w-regular:   400   /* Default body weight */
--w-medium:    500   /* Labels, emphasis */
--w-semibold:  600   /* Headers, bold labels */
--w-bold:      700   /* Strong headers, CTA buttons */
--w-extrabold: 800   /* Page title */
```

#### Line Heights

```css
--lh-tight:  1.05   /* Hero title (maximum density) */
--lh-snug:   1.2    /* Subheaders, tight spacing */
--lh-normal: 1.45   /* Body text, form labels */
--lh-loose:  1.6    /* Paragraph, long-form copy */
```

#### Tracking (Letter Spacing)

```css
--track-tight:     -0.02em   /* Headlines (pulls closer) */
--track-normal:     0        /* Body (default) */
--track-wide:       0.04em   /* Emphasis, sparse */
--track-eyebrow:    0.12em   /* Uppercase labels (open) */
```

### Spacing Scale (4px Base)

```css
--s-1:  4px
--s-2:  8px
--s-3:  12px
--s-4:  16px    /* Standard component padding */
--s-5:  20px    /* Section top margin */
--s-6:  24px    /* Page horizontal padding */
--s-7:  32px    /* Tall section gap */
--s-8:  40px    /* Large section gap */
--s-9:  48px
--s-10: 64px
--s-11: 80px
--s-12: 120px   /* Hero spacing */
```

All padding, margin, and gap values use this scale. Never use arbitrary values like `15px` or `27px`.

### Border Radii

```css
--r-xs:    4px      /* Small inputs, chips */
--r-sm:    6px      /* Button, segmented control */
--r-md:    10px     /* Standard card, modal */
--r-lg:    14px     /* Large card, hero card */
--r-xl:    20px     /* Oversized container */
--r-2xl:   28px     /* Maximum */
--r-pill:  999px    /* Circular (pill button, avatar) */
```

### Shadows

All shadows are soft and neutral (dark ink at low opacity):

```css
--shadow-xs: 0 1px 2px rgba(13, 13, 13, 0.05);
--shadow-sm: 0 2px 6px rgba(13, 13, 13, 0.06), 0 1px 2px rgba(13, 13, 13, 0.04);
--shadow-md: 0 8px 24px rgba(13, 13, 13, 0.08), 0 2px 6px rgba(13, 13, 13, 0.04);
--shadow-lg: 0 24px 48px rgba(13, 13, 13, 0.12), 0 4px 12px rgba(13, 13, 13, 0.06);
--shadow-glow: 0 0 0 6px color-mix(in srgb, var(--ring) 18%, transparent);
```

Used sparingly. Most surfaces rely on border + background contrast, not shadow depth.

### Focus / Selection Rings

```css
--ring: #359625  /* Primary green (light) or #2da200 (dark) */
--ring-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 35%, transparent);
--ring-danger: 0 0 0 3px color-mix(in srgb, var(--destructive) 35%, transparent);
```

Focus indicators are an outline + offset outline, not a box-shadow halo. See **Interaction States / Focus**.

### Motion

```css
--ease-out: cubic-bezier(.22, 1, .36, 1)      /* Snappy exit motion */
--ease-in-out: cubic-bezier(.65, 0, .35, 1)   /* Smooth bi-directional */
--dur-fast: 120ms   /* Quick feedback (hover, toggle) */
--dur-base: 200ms   /* Standard transition (color, position) */
--dur-slow: 360ms   /* Deliberate (page fade, complex animation) */
```

All transitions use one of these three durations with one of the easing curves. Do not invent custom easing or timing.

---

## Layout Architecture

### Wizard Layout (buy-box-wizard.css)

The wizard is a full-screen overlay (fixed positioning) with a dark dot-grid backdrop. It implements a three-column layout: topbar, content + right rail, and footer.

#### Structure

```
.buy-box-wizard (fixed, inset: 0, z-index 200)
  ├─ .backdrop (dot-grid, with radial vignette)
  └─ .app (flex column, z-index 1)
      ├─ .topbar (56px height, flex 0 0)
      │   ├─ .brand (logo + context label)
      │   ├─ .stepper (centered step pills)
      │   └─ .topbar-right (keyboard hint + close btn)
      ├─ .main (flex 1, grid 2-col: content | rail)
      │   ├─ .content-col
      │   │   ├─ .content (flex 1, overflow-y auto)
      │   │   │   └─ .content-inner (max-width 1000px)
      │   │   └─ .scroll-hint (animated bounce, 120ms cycle)
      │   └─ .rail (400px, scrollable flex col)
      └─ .footer (flex 0 0 auto, justify-between)
```

#### Topbar (56px)

- **Background**: Blurred dark backdrop (blur 12px, saturate 140%), semi-transparent (rgba 0.72)
- **Padding**: 0 24px
- **Border-bottom**: 1px solid `--border-sub` (faint divider)
- **Vertical align**: center (flex align-items center)

The topbar houses three elements:
1. **Brand** (left): Logo mark (40x32px) + "Nightdrop" text + "/" separator + feature context ("Buy Box Configurator")
2. **Stepper** (center): 6 step pills after [CUT] of Distress step
3. **Topbar-right** (right): Keyboard hint (Escape key icon) + close button icon

#### Stepper Pill Anatomy

`.step` is a button-like pill with states:

- **Inactive**: bg transparent, border transparent, fg mute, cursor pointer
- **Hover**: bg `--surface-hi`, color `--fg-2` (slight highlight)
- **Active**: bg `--surface`, border `--border-sub`, color `--fg`, bold text
- **Done**: bg `--surface`, checkmark replaces number

Inside each step:
- `.step-num`: 20x20px circle, centered number/checkmark. Active = filled green with white text. Done = light green bg with checkmark.
- `.step-bar`: 28px horizontal line. Inactive = `--border` (gray). Done = `--green` (filled).

Stepper uses 6 pills in layout: flex gap 6px, justify-content center.

#### Content Column

- **Flex 1**: Takes remaining vertical space
- **Overflow-y auto**: Hidden scrollbar (scrollbar-width none, webkit display none)
- **Padding**: 28px 48px 20px (top-right-bottom, 48px for horizontal)
- **Max-width inner**: 1000px, centered via margin 0 auto

Each step is a vertical flex column. **No step scrolls.** If content overflows, the content-density is a bug; compact field rows or split the step further.

#### Right Rail (400px)

`.rail` is a bordered flex column (border-left 1px `--border`). Contains:

1. **Rail head** (tight): "Live" status dot + clock displaying HH:MM:SS (updated per tick)
2. **Live match pool** (headline + value): Animated counter + delta (green or red) + status text
3. **Stat trio** (3-cell grid): Hold period / Occupancy / (third varies by form state). Each cell has label (10px uppercase) + value (18px tabular) + optional delta.
4. **Geographic concentration** (flex row wrap): Dot badges for top counties/metros
5. **Active filters** (flex wrap): Removable filter chips showing applied constraints

The stat trio after [CUT] of Financial section drops from 3 to 2 cells. Layout remains grid, but only 2 columns visible.

#### Footer (auto height)

- **Flex 0 0 auto**: Does not flex
- **Padding**: 16px 64px
- **Border-top**: 1px solid `--border-sub`
- **Justify-content**: space-between
- **Align-items**: center
- **Fade-in gradient** (::before pseudo): 32px tall fade-in from transparent to background color

Footer contains:
- **Left**: Secondary button (< Back, ghost style)
- **Right**: Primary button (Next >, filled green)

Both buttons disabled during API calls.

### Management Page Layout (buyBoxes.css)

The Kanban board is a 5-column grid (exactly 5 lanes, no more). Lanes are not scrollable horizontally; the entire frame (`.bb-frame`) contains the board.

#### Structure

```
.bb-shell (padding 6px 28px 80px, transparent bg)
  ├─ .bb-pagehead (flex space-between)
  │   ├─ (left) .bb-pagehead__title + .bb-pagehead__sub
  │   └─ (right) .bb-pagehead__actions (flex gap 8px)
  │       ├─ "New buyer search" button (stub, coming soon)
  │       └─ "New buy box" button (primary, green)
  └─ .bb-frame (border, rounded 12px, padding 24px, shadow)
      └─ .bb-board (grid 5 columns, gap 16px)
          ├─ .bb-col (pending)
          ├─ .bb-col (validating)
          ├─ .bb-col (active)
          ├─ .bb-col (paused)
          └─ .bb-col (gap, does not accept drops)
```

#### Page Head

- **Flex space-between**: Title on left, action buttons on right
- **Align-items flex-end**: Baseline alignment for title + sub text
- **Title**: 26px weight 600
- **Sub**: 11px uppercase, muted gray, letter-spacing 0.14em

#### Frame

- **Border**: 1px `--border` (light mode: #d4d4d8; dark: #404040)
- **Border-radius**: 12px
- **Padding**: 24px (all sides)
- **Background**: `--bg-page` (transparent, inherits page grid)
- **Shadow** (light mode only): `--shadow-md` (soft lift)
- **Shadow** (dark mode only): Inset highlight (1px top white 2% opacity) + dark shadow

#### Board Grid

- **Grid**: 5 columns equal width (`repeat(5, minmax(0, 1fr))`)
- **Gap**: 16px between columns
- **Align-items start**: Columns align to top

##### Column Head

Each column has:
- **Dot** (8x8px): Color indicates status (pending gray, validating blue, active green glow, paused amber, gap red)
- **Title** (13px weight 600): "Pending", "Validating", "Active", "Paused", "Coverage gap"
- **Count badge** (11px, tabular, right-aligned): Pill with count inside
- **Sub text** (10px uppercase): "Awaiting first run", "Coverage check in progress", etc.

##### Column Body

Vertical flex column with 10px gap. Minimum height 80px (even when empty). Accepts native HTML5 drag-and-drop (ondragover + ondrop). Gap column rejects drops via event.preventDefault() on dragover.

When empty, shows `.bb-col__empty` (dashed border, center text, uppercase letter-spacing).

#### Card (in column)

`.bb-card` is draggable. Structure:

```
.bb-card (position relative, flex col, gap 12px, padding 14px)
  ├─ .bb-card__head (flex, gap 8px)
  │   ├─ .bb-card__dot (6x6px status dot, flex-shrink 0)
  │   ├─ .bb-card__title (text ellipsis)
  │   └─ .bb-card__menu (24x24px icon button, three-dot)
  ├─ .bb-card__hero (grid 2-col, gap 12px, padding 10px 12px)
  │   ├─ (left flex 1)
  │   │   ├─ .bb-card__big (32px, delivered count, tabular, weight 600)
  │   │   ├─ .bb-card__lbl (10px uppercase, "Delivered")
  │   │   └─ .bb-card__delta (green +N this week)
  │   └─ (right auto) .bb-spark (inline-block 72x36px SVG)
  ├─ .bb-card__chiprow (flex wrap, gap 6px)
  │   ├─ .bb-chip (asset class)
  │   └─ .bb-chip--geo (geo summary + MapPin icon)
  ├─ .bb-card__nextrun (flex space-between)
  │   ├─ .bb-card__k "Last run"
  │   └─ .bb-card__v (timestamp)
  ├─ .bb-week (7-column grid for Mon-Sun)
  └─ (gap cards only) .bb-alert (danger alert with edit-geo action)
```

Card states:
- **Default**: border `--border`, bg `--surface`
- **Hover**: bg `--surface-hi`, border accents to green glow, shadow lift
- **Paused**: opacity 0.85
- **Gap**: border danger-tint, dot danger color

The week strip is read-only in the management view. Each day is a 24x24px button (disabled, visual-only). Filled days (run enabled) have bg `--green` + border `--green` + white text.

---

## Component Patterns

### Asset Class Cards (Page 1, Wizard) [PORT]

`.asset-card` is a single-select button.

```
.asset-card (relative, 4-col grid on page 1)
  ├─ .asset-card-check (top-right, 18x18px)
  ├─ .asset-card-icon (36x36px, soft bg, icon center)
  ├─ .asset-card-title (font-size 15px, weight 600)
  ├─ .asset-card-sub (font-size 12px, muted)
  └─ .asset-card-stat (flex space-between, border-top sep)
```

States:
- **Unselected**: border `--border-sub`, bg `--surface`, icon bg muted
- **Hover**: bg `--surface-2`, border `--border`, lift transform -1px
- **Selected**: border `--green`, bg gradient (green tint 6% to transparent), checkmark visible, icon tinted green

Behavior:
- Radio-button semantics: exactly one asset class selected at a time
- No multi-select (despite potentially confusing UI language; the form enforces single selection)
- Clicking a selected card keeps it selected

### Sub-Asset Chips (Page 1, Wizard) [PORT]

`.subtype-chip` is a multi-select pill. Max 3 selected per asset class (except Land, which has no cap).

```
.subtype-chip (inline-flex, gap 5px, padding 6px 13px, pill radius)
  ├─ .subtype-chip-icon (optional, left-aligned)
  ├─ .subtype-chip-check (conditional checkmark, green)
  └─ .subtype-chip-hint (10px gray, "1/3")
```

States:
- **Inactive**: border `--border`, bg `--surface-2`, fg `--fg-2`
- **Hover**: border `--green`, fg `--fg` (brighten)
- **Active** (selected): border `--green`, bg `--green-tint`, fg-color = `--fg` (highlight)
- **Dim** (max reached, cannot add): opacity 0.35, cursor default, hover no effect

The cap (3 selected, or land unlimited) is enforced in JS; CSS dim state prevents accidental click feedback.

### Geography Segmented Controls (Page 1, Wizard) [PORT]

`.geo-seg` is a toggle button group (States / Counties / Metros).

```
.geo-seg (flex, bg --surface, border --border-sub, radius --r-sm)
  └─ .geo-seg-btn (flex 1, padding 7px 0, text-center)
```

States (per button):
- **Inactive**: color `--fg-mute`, bg transparent
- **Hover**: bg `--surface-hi`, color `--fg` (brighten)
- **Active**: bg `--green`, color white, bold text

Only one mode active at a time. Clicking triggers a re-render of the combo below (states, counties, or metros).

### Combo Box (Geography, Taxonomy) [PORT]

`.combo` is a dropdown-list input for multi-select items (e.g., states, counties, metros, zoning).

```
.combo (bg --surface, border --border-sub, radius --r-card)
  ├─ .combo-search (flex, gap 8px, padding 10px 14px)
  │   ├─ SearchIcon
  │   └─ input[type=text]
  ├─ .combo-list (max-height 220px, overflow-y auto)
  │   ├─ .combo-item (flex justify-between, padding 9px 14px)
  │   │   ├─ .combo-item-label (flex gap 12px)
  │   │   │   └─ .combo-item-count (11px, muted)
  │   │   └─ .check (16x16px checkbox, border --border-hi, bg --bg)
  │   └─ ...
  └─ (groups) .combo-group-header (uppercase label, bg --surface-hi)
```

States:
- **Default**: border `--border-sub`
- **Focus-within**: box-shadow `0 0 0 2px var(--green)` (focus ring)
- **Item hover**: bg `--surface-hi`
- **Item checked**: check bg `--green`, check border `--green`, text `--fg-2`, item count text green

Behavior:
- Typed text filters list in real-time
- Multiple selections allowed (exception: geography state is mutually exclusive if moving to counties)
- Empty state shows "No results" or "Type to search"
- Loading state shows spinner (2px border, top-border green, spinning animation)

### Chip Input (ZIP codes, legacy) [CUT]

`.chip-input` is a multi-value text input that converts strings into `.chip` pills.

This entire component and the ZIP-code geography section are [CUT] from the new build. The form still carries `form.geo.zips` in state for backwards compatibility, but the UI does not expose it.

### Pills and Badges [PORT]

#### Filter Chips (Right Rail, Active Filters)

`.f-chip` displays applied filters with removable X button.

```
.f-chip (flex gap 6px, padding 4px 4px 4px 10px, border --border-sub)
  ├─ .label (fg-mute, capital letter, "A:" or "S:")
  ├─ .val (fg-2, small font, value text)
  └─ .f-chip-x (18x18px button, remove icon)
```

States:
- **Normal**: bg `--surface`, border `--border-sub`, fg `--fg-2`
- **Inactive** (greyed out, e.g., contradicted filter): border-style dashed, opacity 0.72, val color `--warning`
- **Hover**: .f-chip-x bg `--surface-hi`, fg `--fg`

Remove button is always visible, clickable even in inactive state. Click removes the filter.

#### Threshold Delivery Cards (Page 6, Wizard) [PORT]

`.threshold` is a radio-button card with percentage display.

```
.threshold (position relative, flex col, gap 6px, padding 22px 22px 26px)
  ├─ .threshold-radio (18x18px, top-right, border --border-hi)
  ├─ .threshold-pct (44px, weight 700, tabular, -0.03em tracking)
  │   └─ .threshold-pct-sym (22px weight 600, "%" symbol)
  ├─ .threshold-title (16px weight 700)
  ├─ .threshold-sub (12px uppercase, muted, letter-spacing 0.04em)
  └─ .threshold-desc (13px, fg-2, line-height 1.5)
```

Three cards side-by-side (3 columns, 12px gap):
- **70%** (balanced): 15-25 deals
- **80%** (balanced): 8-15 deals
- **90%** (precise): 2-6 deals

States:
- **Unselected**: border `--border-sub`, bg `--surface`, pct fg `--fg`
- **Hover**: bg `--surface-2`, border `--border`
- **Selected**: border `--green`, bg gradient (green tint 7% to surface), pct fg `--green`, radio filled green with dot

Behavior: Clicking selects; only one card is "on" at a time.

#### Delivery Cadence Cards (Page 6, Wizard) [PORT]

`.delivery` is similar to threshold but with time text.

```
.delivery (grid col, padding 16px 18px, border --border-sub)
  ├─ .delivery-head (flex justify-between)
  │   ├─ .delivery-title (14px weight 600)
  │   └─ .delivery-radio (16x16px)
  ├─ .delivery-sub (12px, muted, line-height 1.4)
  └─ .delivery-time (11px, fg-2, font-secondary, "06:00 AM EST")
```

Three cards: Daily (06:00 AM), Weekly (Mon 07:00 AM), Real-time (No SLA).

Same interaction as threshold: select one, visual feedback with green border + subtle gradient.

**[BUILD]** A new Mon-Sun schedule picker replaces the cadence radio in the Activate step. This allows per-day selection instead of three preset options. See "Per-Day Schedule Picker" section below.

#### Distress Signal Cards (Page 4, Wizard, [CUT]) 

This entire page is [CUT] from the new build. The signals grid, AND/OR logic toggle, and distress-score floor slider are removed. Ignore all `.signal` CSS classes.

### Input Fields

#### Number Field Shell [PORT]

`.bb-input-shell` wraps numeric inputs (building size, year built, etc.).

```
.bb-input-shell (flex gap 8px, padding 6px 12px, bg --surface-sub, border --border-sub)
  ├─ .bb-input-label (9px uppercase, "SQ FT")
  ├─ input[type=text] (flex 1, no bg, no border, text-align right)
  └─ .bb-input-unit (9px muted, "max", "min")
```

States:
- **Default**: border `--border-sub`, box-shadow none
- **Focus-within**: border `--border-hi`, box-shadow `0 0 0 2px var(--green)`
- **Input placeholder**: `--fg-mute`

Behavior: Never expose native spinner buttons. Styled as a unified input + unit label.

#### Range Input (Min - Max) [PORT]

`.bb-range` is a grid layout for paired number inputs.

```
.bb-range (grid 3-col: input | dash | input, gap 6px)
  ├─ .bb-input-shell (flex 1)
  ├─ .bb-range-dash (" - ", fg-mute)
  └─ .bb-input-shell (flex 1)
```

Example: "500 - 5000" square feet.

#### Slider (AADT Heat Map, Page 5) [PORT]

`.bb-aadt-slider` is a styled HTML5 `<input type="range">`.

```
<input type="range" class="bb-aadt-slider" style="background: linear-gradient(...)" />
```

Behavior:
- Browser default slider hidden (appearance none)
- Custom thumb: 16x16px circle, fg foreground, border 2px bg background
- Track background set inline via component (dynamic gradient from cool to hot)
- Thumb hover: box-shadow lift

No custom tick marks; the component renders a separate label row with min/max/range text.

### Toggle Switches [PORT]

`.toggle` is a custom checkbox replacement (width 36px, height 20px).

```
.toggle (position relative, radius pill, bg --surface-2, border --border-hi)
  └─ ::after (16x16px dot, position left: 1px, transition all 120ms)
```

States:
- **Off**: bg `--surface-2`, border `--border-hi`, ::after left 1px
- **On**: bg `--green`, border `--green`, ::after left 17px (slides right)
- **Focus**: outline 2px solid green, outline-offset 2px
- **Disabled**: opacity 0.4

Used for owner flags (out-of-state, absentee, tax-delinquent, active-foreclosure).

---

## Interaction States

### Button States

All buttons (`.bb-btn`, `.btn`, `.bba-btn`) follow the same interaction pattern:

#### Primary Button (Green Fill)

```css
/* Default */
background: var(--primary);
color: var(--primary-foreground);
border: 1px solid transparent;
font-weight: 700;

/* Hover */
background: var(--chart-1);  /* Brightens slightly */
transform: translateY(-1px);  /* Micro-lift for action CTA */

/* Active/Press */
transform: translateY(0);  /* Settle back down */

/* Disabled */
opacity: 0.4;
cursor: not-allowed;
```

#### Secondary Button (Surface with Border)

```css
/* Default */
background: var(--surface);
border: 1px solid var(--border-sub);
color: var(--fg);

/* Hover */
background: var(--surface-2);  /* Subtle darkening */
border-color: var(--border);

/* Focus */
outline: 2px solid var(--green);
outline-offset: 2px;
```

#### Ghost Button (Transparent, Text Only)

```css
/* Default */
background: transparent;
color: var(--fg-2);

/* Hover */
background: var(--surface-hi);
color: var(--fg);
```

#### Danger Button (Destructive)

```css
/* Default */
background: rgba(178, 100, 100, 0.14);  /* danger-tint */
border: 1px solid rgba(178, 100, 100, 0.35);
color: var(--danger-hi);

/* Hover */
background: rgba(178, 100, 100, 0.22);
```

### Card and Clickable Surface States

#### Card (Dashboard, Wizard Step Card)

```css
/* Default */
border: 1px solid var(--border-sub);
background: var(--surface);
box-shadow: var(--shadow-xs);

/* Hover */
background: var(--surface-2);
border-color: var(--accent);  /* Green on dark, primary on light */
box-shadow: 0 0 0 1px rgba(29,175,41,0.2), 0 4px 16px rgba(29,175,41,0.08);

/* Focus (keyboard nav) */
outline: 2px solid var(--green);
outline-offset: 2px;

/* Active/Selected (on selection cards) */
border-color: var(--green);
background: linear-gradient(180deg, rgba(91,204,72,0.06) 0%, var(--surface) 60%);
box-shadow: inset 0 0 0 1px rgba(91,204,72,0.4);
```

#### Draggable Card (Management Kanban)

Extends card above with:
- **Cursor grab** (default), **grabbing** (active drag)
- **Drop target**: Lane acceptance checked in JS (gap lane rejects)

### Focus States

**All interactive controls must have a visible focus indicator.** The system uses an outline approach:

```css
/* Outline focus (preferred for inputs, buttons, cards) */
:focus-visible {
  outline: 2px solid var(--primary);  /* Green */
  outline-offset: 2px;
}

/* Box-shadow focus (for containers, combo, input shells) */
:focus-within {
  box-shadow: 0 0 0 2px var(--primary);
  border-color: var(--border-hi);  /* Subtle inner glow */
}
```

Never use the browser default blue outline. Always use the green token.

### Disabled State

All disabled controls follow:

```css
opacity: 0.4;
cursor: not-allowed;
pointer-events: none;
```

Text inside disabled buttons uses `--fg-disabled` (zinc-600 light, zinc-700 dark).

---

## Per-Day Schedule Picker [BUILD]

This is a new feature not present in the source code. It replaces the three-cadence radio (Daily / Weekly / Real-time) with a true Monday-Sunday toggle grid.

### Structure

```
.schedule-picker
  ├─ .schedule-label (eyebrow, "Select delivery days")
  ├─ .schedule-grid (7 columns, Mon-Sun)
  │   └─ .schedule-day (button, 32x32px minimum)
  │       ├─ .day-label ("M", "T", "W", "T", "F", "S", "S")
  │       └─ (no second line; just the letter)
  └─ .schedule-meta (12px gray, "Runs on X selected days")
```

### Behavior

- **Default**: All 7 days available, none pre-selected
- **Click**: Toggle an individual day on/off
- **Visual feedback**: On-state bg `--green` + border `--green`, off-state border `--border`, text white on (on), muted on (off)
- **Persistence**: Selected days stored in `form.run_schedule.days` as array of booleans [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
- **Validation**: At least 1 day must be selected (button disabled if 0 days)
- **Writing**: PATCH updates `run_schedule.days` directly

### Quick-Edit Card Footer

Management card footer also exposes a minimal schedule picker (7 small buttons, 24px height). Inline in card, below the timestamp. Same toggle behavior, updates card state on click.

---

## Activation Dialog (buyBoxActivated.css)

[PORT] The success overlay appears after clicking "Activate". It is a modal with portal rendering.

### Structure

```
.bba (fixed, inset 0, z-index 1000, grid place-items center)
  └─ .bba-card (width min(720px, 92vw), text-align center)
      ├─ .bba-check (64x64px circle, green tint bg, animated pop-scale)
      ├─ .bba-eyebrow ("Buy box activated", green, uppercase)
      ├─ .bba-title ("You're hunting", 56px)
      ├─ .bba-name (buy box label, monospace, 18px, light bg, max-width ellipsis)
      ├─ .bba-grid (3 columns, 1px gap separators)
      │   ├─ .bba-cell (Match pool: "2,847 deals")
      │   ├─ .bba-cell (First drop: "Jan 15, 06:00 AM")
      │   └─ .bba-cell (Cadence: "Daily")
      └─ .bba-foot (flex justify-center, gap 12px)
          ├─ .bba-btn--secondary ("Return to dashboard")
          └─ .bba-btn--primary ("Build another ->", zap icon)
```

### Styling Details

- **Overlay background**: rgba(13, 13, 13, 0.96) (very dark, near-opaque)
- **Card**: bg `--surface`, border 1px `rgba(91,204,72,0.25)` (subtle green hint), radius `--r-card-lg`
- **Check icon animation**: Pops in via scale 0.5 → 1.1 → 1 over 600ms with 200ms delay, uses ease-out curve
- **Card slide-up**: Moves in from 20px below via translate over 200ms, 50ms stagger after fade
- **Grid cells**: Each cell 18px padding, font-mono for values, tabular-nums

The three stat cells derive their values from:
1. **Match pool**: Backend's live estimated count (from preview endpoint)
2. **First drop**: Calculated from `run_schedule.days` and current time (next scheduled run)
3. **Cadence**: Derived from `run_schedule.days` (7 days = daily, 1 day = weekly, 0 days = real-time, else "custom")

### Focus Management

Modal traps focus: Tab cycles through the two buttons. Escape closes (if onClose handler allows). First interactive element (secondary button) is focus-target on mount.

---

## Light / Dark Theme

All colors and surfaces are theme-aware via `[data-theme="light"]` and `[data-theme="dark"]` on the root `<html>` element.

### Light Mode (Default)

- **Background**: #F5F7FA (warm off-white, dot-grid visible)
- **Cards**: #ffffff (pure white)
- **Text**: #1F2937 (dark zinc)
- **Borders**: #d4d4d8 or #e5e7eb (light gray)
- **Primary (Green)**: #359625 (muted, less neon)
- **Shadows**: Subtle, dark ink at low opacity

### Dark Mode

- **Background**: #171717 (very dark gray)
- **Cards**: #262626 (slightly lighter gray)
- **Text**: #e5e5e5 (light gray)
- **Borders**: #404040 (dark gray)
- **Primary (Green)**: #2da200 (brighter, stands out on dark)
- **Shadows**: Minimal; dark mode relies on border contrast

### Switching

Theme is toggled via a button in the top header (outside the wizard). When switched, CSS variables re-evaluate per `[data-theme]` rules. No page reload required.

Both light and dark modes must be visually tested before shipping:
- Hierarchy remains clear
- Contrast ratios meet WCAG AA (4.5:1 minimum for text)
- No hardcoded colors (always use CSS variables)

---

## Motion and Animation

### Transitions

Use one of the three standard durations + easing combos:

```css
/* Quick feedback (interactive) */
transition: color 120ms cubic-bezier(.22, 1, .36, 1),
            background 120ms cubic-bezier(.22, 1, .36, 1),
            border-color 120ms cubic-bezier(.22, 1, .36, 1);

/* Standard change (default) */
transition: all 200ms cubic-bezier(.22, 1, .36, 1);

/* Deliberate motion (page transitions, complex animations) */
animation: slide-up 360ms cubic-bezier(.22, 1, .36, 1);
```

### Keyframe Animations

Common animations defined in CSS:

- **Pulse**: Scales and opacity cycle (2s loop), used on active dots and live counters
- **Bounce**: Vertical translate oscillates (1.6s, easing), used on scroll hints
- **Pop**: Scale 0 → 1.1 → 1 (0.4-0.6s), used on success check icons and state transitions
- **Fade**: Opacity 0 → 1 or 1 → 0 (200-320ms)
- **Slide-up**: TranslateY 20px → 0 (200-360ms)

All animations respect `prefers-reduced-motion: reduce`. When motion is disabled, animations either:
- Snap to the final state (fade becomes instant), or
- Use a 200ms linear transition as a minimal compromise

### Interaction Feedback

- **Hover**: Most interactive surfaces get a `transform: translateY(-1px)` micro-lift + background/border brightening
- **Press**: Release the lift (`translateY(0)`) to create a "button click" tactile feel
- **Focus**: Outline appears instantly (outline is not animated)
- **Drag**: Cursor changes from grab → grabbing; no transform feedback (visual cue alone)

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 200ms !important; }
  * { transition-duration: 200ms !important; }
}
```

All animated elements (overlay fades, check pops, etc.) degrade gracefully to 200ms linear motion.

---

## Responsive Behavior

### Breakpoints

The design is desktop-first (1024px+ is primary). Mobile and tablet responses are minimal because this is an embedded wizard/dashboard, not a standalone website.

- **Mobile** (max-width 560px): Activation dialog grid stacks to 1 column, buttons full-width
- **Tablet** (768-1023px): Asset card grid reduces to 2 columns, threshold grid stacks to 2 columns
- **Desktop** (1024px+): 4 asset columns, 3 threshold columns, full 5-lane Kanban

### Scroll Behavior

- **Wizard content**: Vertical scroll only on overflow (hidden scrollbar). Intended no-scroll: each step must fit viewport.
- **Management board**: No horizontal scroll; lanes scale within container.
- **Combo lists**: Max-height 220px, vertical scroll with hidden scrollbar.

---

## Accessibility Considerations

### Keyboard Navigation

- **Tab order**: Follows DOM order (top-to-bottom, left-to-right)
- **Focus trap** (modal only): Tab cycles within modal, does not escape to page
- **Escape**: Closes modal if allowed by handler
- **Enter**: Activates buttons, toggles checkboxes, selects from dropdowns
- **Arrow keys**: Not used; combos are click-only (no keyboard arrow filtering)

### Focus Indicators

Never hide outline. Always visible on all interactive elements. Green color (high contrast).

### Color Contrast

- Text on primary button: White on green (#ffffff on #359625) = WCAG AAA (7.5:1)
- Body text on card: #1F2937 on #ffffff = WCAG AAA (12.8:1)
- Muted text: #6B7280 on #ffffff = WCAG AA (5.2:1)
- Verify all custom color combinations in both light and dark mode

### ARIA Labels

- Modal: `role="alertdialog"` or `role="dialog"`, `aria-labelledby`, `aria-describedby`
- Buttons: Add `aria-pressed="true/false"` for toggle-like cards (asset selection)
- Forms: Labels associated via `<label for>` or wrapping
- Combobox: `role="combobox"`, `aria-expanded`, `aria-controls`
- Status updates: `aria-live="polite"` on match count, `aria-atomic="true"`

### Reduced Motion Compliance

See Motion section above. All animations have a non-motion fallback.

---

## Implementation Reference

### Importing Styles

When rebuilding, import tokens first, then component styles:

```jsx
import '../styles/tokens.css';         // Defines all --var tokens
import '../styles/buy-box-wizard.css'; // Wizard shell
import '../styles/buy-box-wizard-pages.css'; // Step-specific layouts
import '../styles/buyBoxes.css';       // Management Kanban
import '../styles/buyBoxActivated.css'; // Success dialog
```

Or consolidate into a single compiled stylesheet. The key is token re-use: do not hardcode any color or size values inline.

### Token Consumption

Always read from the CSS variable:

```css
/* WRONG */
color: #359625;
background-color: #F5F7FA;

/* CORRECT */
color: var(--primary);
background-color: var(--background);
```

When a design system update occurs (e.g., shade of green changes), update tokens.css once and all consumers re-render automatically.

### Class Naming

All component classes use a prefix to avoid collision:
- `.buy-box-wizard-*` - Wizard-specific
- `.bb-*` - Management (buy box, Kanban)
- `.bba-*` - Activation dialog

Never nest styles outside their scope. Use explicit class names for portability.

---

## Summary: What to Rebuild

| Surface | Status | Notes |
|---------|--------|-------|
| **Wizard Shell** | [PORT] | Topbar, stepper, content, right rail, footer. 6 steps after Distress cut. |
| **Step 1: Target** | [PORT] | Asset class cards, sub-asset chips, geography (states/counties/metros). ZIP section [CUT]. |
| **Step 2: Profile** | [PORT] | Physical section (building class, stories, units, etc.). Financial section [CUT]. |
| **Step 3: Owner** | [PORT] | Entity type, hold period, out-of-state, absentee, tax-delinquent, active-foreclosure. |
| **Step 4: Distress** | [CUT] | Entire page removed. 12 signal cards, AND/OR logic, distress floor all deleted. |
| **Step 5: Location** | [PORT] | Utilities, risk, class-specific (AADT slider, floodplain, opportunity zone, etc.). |
| **Step 6: Threshold** | [PORT] | 3 threshold cards (70/80/90%). |
| **Step 7: Activate** | [PORT] with [BUILD] | Name input, filters review, cadence (now per-day picker [BUILD]), activation button. Success dialog. |
| **Management Kanban** | [PORT] | 5-lane board, drag-drop, card actions, metric boxes. Week strip read-only; quick-edit picker [BUILD]. |
| **Activation Dialog** | [PORT] | Success overlay, stats, two-button footer (return / build another). |

---

## Color Reference Quick Lookup

### Critical Brand Colors (Never Hardcode)

```
Primary Green:       use --primary            #359625 (light) / #2da200 (dark)
Green for Charts:    use --green-bright       #4FA634 (light) / #7af74d (dark)
Warning Amber:       use --warning            #F4B73E (light & dark)
Danger Red:          use --danger             #ef4444 (light & dark)
Info Blue:           use --info               #3E7BFA (light & dark)
```

### Background / Surface

```
Page BG:       use --background     #F5F7FA (light) / #171717 (dark)
Card BG:       use --card           #ffffff (light) / #262626 (dark)
Hover BG:      use --surface-hi     #f3f4f6 (light) / #2a2a2a (dark)
Disabled BG:   opacity 0.4 on above
```

### Text

```
Strong:        use --foreground        #1F2937 (light) / #e5e5e5 (dark)
Secondary:     use --secondary-foreground #374151 (light) / #e5e5e5 (dark)
Muted:         use --muted-foreground   #6B7280 (light) / #a3a3a3 (dark)
Disabled:      use --fg-disabled        #9ca3af (light) / #71717a (dark)
```

### Borders

```
Primary border:    use --border-1           #d4d4d8 (light) / #404040 (dark)
Faint border:      use --border             #e5e7eb (light) / #404040 (dark)
Strong border:     use --border-strong      #71717a (light) / muted-foreground (dark)
```

---

## Linting & Validation

Before finalizing, verify:

1. **No hardcoded colors**: Use grep for hex values (#xxx) or rgb(). All should be token refs or transparent.
2. **Typography**: All font-size, font-weight, line-height, letter-spacing use token variables.
3. **Spacing**: All padding, margin, gap use `--s-*` scale. No arbitrary pixel values.
4. **Border radius**: All radius values use `--r-*`. No magic numbers.
5. **Shadows**: Use `--shadow-*` or none. No custom shadow syntax.
6. **Motion**: All transitions/animations use `--dur-*` and `--ease-*`.
7. **Focus states**: All interactive elements have visible `:focus-visible` or `:focus-within`.
8. **Theme mode**: Both light and dark render correctly. CSS variables respond to `[data-theme]`.

---

## Handoff Checklist

When handing off to another team for rebuild:

- [ ] All design tokens are centralized and documented
- [ ] Wizard and management layouts are structurally clear (no hardcoded dimensions)
- [ ] Component patterns are replicable (cards, chips, buttons, inputs, etc.)
- [ ] Focus and interaction states are explicit and testable
- [ ] Light and dark themes both implemented and visually tested
- [ ] Responsive behavior defined (mobile, tablet, desktop)
- [ ] Per-day schedule picker [BUILD] is in scope with full spec
- [ ] Accessibility (keyboard, focus, ARIA, contrast) meets WCAG AA
- [ ] All [PORT], [CUT], [BUILD] callouts are clear and non-ambiguous

This spec is sufficient for a team to rebuild the entire system in any framework (React, Vue, Web Components, etc.) with visual and behavioral fidelity to the original.
