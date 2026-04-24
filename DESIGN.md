# DESIGN.md

Visual identity spec for the Atopic Helper PWA. Read this before generating or modifying any UI component or page.

---

## Brand

Health-tech app for tracking a newborn's eczema during an elimination diet. Tone: warm, clinical, trustworthy. Czech UI. Mobile-first PWA.

---

## Color Tokens

Defined in `src/app.css` via Tailwind v4 `@theme {}`. Always use token names, not raw hex values.

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#8B4557` | Brand, CTAs, active states |
| `--color-primary-light` | `#C4A4AB` | Soft highlights |
| `--color-surface` | `#FAF8F8` | Page background |
| `--color-surface-dark` | `#EDE8E9` | Borders, dividers |
| `--color-text` | `#3D2B2F` | Body text |
| `--color-text-muted` | `#7A6468` | Secondary text, labels |
| `--color-danger` | `#B84444` | Elimination, alerts |
| `--color-success` | `#5A8B5A` | Reintroduction, positive states |
| `--color-warning` | `#C9A227` | Caution states |
| `--color-reintro-accent` | `#4A7C6F` | Teal accent |

**Severity scale** (maps to 1–5 eczema score):

| Token | Value |
|---|---|
| `--color-severity-1` | `#5A8B5A` (green) |
| `--color-severity-2` | `#8B9B5A` |
| `--color-severity-3` | `#C9A227` (amber) |
| `--color-severity-4` | `#C97027` (orange) |
| `--color-severity-5` | `#B84444` (red) |

**Opacity scale** (applied as Tailwind `/N` modifiers):

| Modifier | Use |
|---|---|
| `/5` | Very light background (info panels) |
| `/10` | Light background (card variants) |
| `/20` | Subtle border |
| `/30` | Prominent border |
| `/40–/50` | Focus rings, interaction states |
| `/60` | Muted text, secondary elements |

---

## Typography

- **Font family**: System default (no custom fonts)
- **All inputs/selects**: minimum `16px` to prevent iOS zoom

| Size | Tailwind | Use |
|---|---|---|
| 72px | `text-7xl` | Hero emoji/icons |
| 24px | `text-2xl` | Major page headings |
| 20px | `text-xl` | Section headers |
| 18px | `text-lg` | Page sub-headers |
| 16px | `text-base` | Body, form labels |
| 14px | `text-sm` | Secondary content |
| 12px | `text-xs` | Captions, badges, tags |
| 10–11px | `text-[10px]` / `text-[11px]` | Micro labels only |

| Weight | Use |
|---|---|
| `font-bold` | Major headings |
| `font-semibold` | Section headers, primary buttons |
| `font-medium` | Labels, secondary headings |
| `font-normal` | Body text |

---

## Spacing

Base unit: Tailwind default (1 = 4px).

**Page containers:** `px-4 pt-4 pb-8` or `px-5 pt-6 pb-8`, always `max-w-lg mx-auto`

**Section spacing:** `space-y-4` (standard), `space-y-5`/`space-y-6` (generous)

**Card internal:** `p-3` (compact) or `p-4` (standard)

**Button padding:** `px-4 py-3.5` (primary), `px-3 py-2` (secondary), `px-2.5 py-1` (small)

**Input padding:** `px-4 py-3` (standard), `px-3 py-2` (compact)

**Gap:** `gap-2` (standard flex/grid), `gap-3`/`gap-4` (sections)

---

## Border Radius

| Class | Use |
|---|---|
| `rounded-full` | Pills, badges, circular nodes |
| `rounded-2xl` | Major cards, containers |
| `rounded-xl` | Buttons, inputs, regular cards, alerts |
| `rounded-lg` | Small buttons, minor elements |
| `rounded-md` | Very minor elements |

---

## Shadows & Elevation

| Class | Use |
|---|---|
| none | Default flat cards |
| `shadow-sm` | Active buttons, floating panels |
| `shadow-lg` | Toasts, elevated modals |

Focus states: `focus:outline-none focus:ring-2 focus:ring-primary/40` (inputs), `ring-4 ring-primary/20` (selected nodes)

---

## Layout

- **Max width:** `max-w-lg mx-auto` on every page and header — never full bleed on large screens
- **Grid:** `grid-cols-3 gap-2` (categories), `grid-cols-4 gap-2` (meal types), `grid-cols-2 gap-2` (evaluation pairs)
- **Dynamic height:** `h-[calc(100dvh-3.5rem)]` for full-screen sections below a header
- **Safe areas (PWA):** `env(safe-area-inset-bottom, 0px)` on all fixed bottom elements

**Z-index layers:**

| Layer | z-index | Use |
|---|---|---|
| Content | `z-10` | Timeline nodes, inline elevated elements |
| Sticky sub-headers | `z-20` | Date strips |
| Header / save bar | `z-30` | Top header, fixed bottom bar |
| Overlays | `z-50` | Toasts, floating panels, dialogs |

---

## Component Patterns

### Card
```
bg-white rounded-2xl border border-surface-dark p-4 space-y-3
```

**Semantic variants** (replace `{color}` with `primary` / `danger` / `success` / `warning`):
```
bg-{color}/5 border border-{color}/20 rounded-xl px-4 py-3
```
Warning uses `/10` background and `/30` border.

### Primary Button
```
w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-base
```

### Secondary Button
```
py-2 px-3 rounded-xl text-sm font-medium border border-surface-dark bg-white text-text
```

### Small / Pill Button
```
text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary
```

### Disabled State
```
opacity-50 cursor-not-allowed bg-surface-dark text-text-muted
```

### Input / Textarea
```
w-full rounded-xl border border-surface-dark px-4 py-3 text-base text-text
focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white
```
Textarea adds `resize-none bg-surface`.

### Badge / Tag
```
inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1
```
Fill with semantic color pair: `bg-success/10 text-success`, `bg-warning/15 text-warning border border-warning/30`, `bg-surface text-text-muted`.

### Header (sticky)
```
sticky top-0 z-30 bg-white border-b border-surface-dark px-4 py-2.5 max-w-lg mx-auto
```

### Segmented Tab Control
```
flex bg-surface rounded-lg p-0.5 gap-0.5
  active tab:  px-3 py-1.5 rounded-md text-xs font-medium bg-white text-primary shadow-sm
  inactive tab: px-3 py-1.5 rounded-md text-xs font-medium text-text-muted
```

### Timeline Node
```
shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10
  completed: bg-success text-white
  current:   bg-primary text-white ring-4 ring-primary/20
  upcoming:  bg-white border-2 border-surface-dark text-text-muted
```

### Toast
```
fixed bottom-28 left-1/2 -translate-x-1/2 bg-success text-white text-sm rounded-xl px-5 py-3 shadow-lg z-50
```

---

## Animation

- `transition-all duration-300` — general transitions
- `transition-opacity` — show/hide
- SVG progress ring: `stroke-dashoffset` animated over `0.6s ease`
