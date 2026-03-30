# UI Design

This document captures UI/UX decisions, navigation patterns, and design system conventions for the Eczema Tracker PWA. Created during Phase 1 after testing the app shell on a real iPhone.

## Navigation Architecture

### Primary Navigation: Bottom Tab Bar

Five tabs, always visible at the bottom of the screen. **Icons only, no labels** for a cleaner, more compact look.

| Tab | Route | Icon Component |
|-----|-------|----------------|
| Calendar | `/calendar` | `CalendarIcon` |
| Food | `/food` | `FoodIcon` |
| Photos | `/photos` | `CameraIcon` |
| Trends | `/trends` | `TrendsIcon` |
| Settings | `/settings` | `SettingsIcon` |

**Icon components** are stored in `src/lib/components/icons/` as Svelte components. All use Heroicons outline style (stroke-based, 24x24 viewBox, stroke-width 1.5).

**Design decisions:**
- SVG icons only (no labels) — cleaner, avoids text truncation issues
- Bottom placement for thumb-zone accessibility
- Active tab highlighted with primary color via `currentColor`
- Icons sized at 24×24px (`w-6 h-6`)
- Safe area padding applied for notched iPhones

### Header

**No global header.** The app uses a headerless design — each page manages its own title/header if needed. This maximizes vertical space on mobile and avoids redundant UI for a single-child app.

Page-specific headers (if needed) are implemented within individual page components.

### Secondary Navigation: Bottom Sheets

For contextual detail views that relate to the current screen, use draggable bottom sheets instead of full page navigation.

**When to use bottom sheets:**
- Day detail view (tapping a calendar day)
- Quick actions that don't require full context switch
- Forms with 1-3 fields

**When to use full page navigation:**
- Multi-step flows
- Content requiring full screen (photo capture, full gallery)
- Deep detail views with extensive scrolling

**Bottom sheet snap points:**
- **Half-height (~50%):** Overview/summary content
- **Full-height (~90%):** Complete detail with tabs or scrollable content
- **Dismissed (0%):** Swipe down to close

---

## Phase 2 UI Decisions

These decisions were deferred from Phase 2 planning and resolved after phone testing.

### 1. Day Detail View

**Decision:** Bottom sheet with two snap points.

- **Half-height:** Shows food category icons with elimination status badges (quick glance)
- **Full-height:** Tabs for "Eliminace" and "Jídla" with full food grid and meal list

**Rationale:** Keeps calendar visible for context. User can see neighboring days while reviewing a specific day's data. Matches iOS Maps/Music patterns.

### 2. Meal Composer

**Decision:** Inline expandable section within the day detail sheet.

- Meal type selector (snídaně/oběd/večeře/svačina) as horizontal buttons
- Food item picker appears below when adding items
- Chips/tags for added items with remove button

**Rationale:** Most meals are quick to log (3-5 items). Separate route adds unnecessary navigation. If the picker proves too cramped, we can revisit.

### 3. Food Grid + Meal List Layout

**Decision:** Tabs within the full-height sheet.

- Tab 1: "Eliminace" — food category grid with expandable sub-items
- Tab 2: "Jídla" — meal list with inline composer

**Rationale:** Clean separation of concerns. User focuses on one task at a time. Accordion pattern tested confusing (too many expand/collapse states).

---

## Design System

### Colors

Burgundy/wine color scheme — rich, mature, confident. Chosen for the primary female user base.

Defined in `src/app.css` as CSS custom properties:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#8B4557` | Interactive elements, active states, links |
| `--color-primary-light` | `#C4A4AB` | Hover backgrounds, secondary accents |
| `--color-surface` | `#FAF8F8` | Page background |
| `--color-surface-dark` | `#EDE8E9` | Borders, dividers, card backgrounds |
| `--color-danger` | `#B84444` | Destructive actions, errors, eliminated foods |
| `--color-success` | `#5A8B5A` | Success states, reintroduced foods |
| `--color-warning` | `#C9A227` | Warnings, pending states |
| `--color-text` | `#3D2B2F` | Primary text |
| `--color-text-muted` | `#7A6468` | Secondary text, placeholders, inactive states |

### Typography

- **Base font size:** 16px (prevents iOS zoom on input focus)
- **Font stack:** System fonts (SF Pro on iOS, Roboto on Android)
- **Scale:** Tailwind defaults (text-xs, text-sm, text-base, text-lg, text-xl)

| Element | Class | Size |
|---------|-------|------|
| Page title | `text-xl font-bold` | 20px |
| Section heading | `text-base font-semibold` | 16px |
| Body text | `text-sm` | 14px |
| Labels, captions | `text-xs` | 12px |

### Spacing

4px base unit. Use Tailwind spacing scale:

| Token | Value | Usage |
|-------|-------|-------|
| `p-1` | 4px | Tight padding (icon buttons) |
| `p-2` | 8px | Compact elements |
| `p-3` | 12px | Form fields |
| `p-4` | 16px | Card padding, page margins |
| `gap-2` | 8px | List items, button groups |
| `gap-3` | 12px | Form field spacing |
| `mb-6` | 24px | Section separation |

### Border Radius

| Element | Class | Radius |
|---------|-------|--------|
| Buttons, inputs | `rounded-lg` | 8px |
| Cards | `rounded-xl` | 12px |
| Pills, chips | `rounded-full` | 9999px |

### Shadows

Minimal shadow usage. Cards use borders (`border border-surface-dark`) instead of shadows for a flatter, cleaner look. Shadows reserved for:

- Dropdowns/popovers: `shadow-lg`
- Bottom sheets: `shadow-xl` on the sheet edge

---

## Component Patterns

### Buttons

| Type | Usage | Classes |
|------|-------|---------|
| Primary | Main actions (Save, Add) | `bg-primary text-white rounded-lg py-2 px-4` |
| Secondary | Alternative actions | `border border-surface-dark text-text rounded-lg py-2 px-4` |
| Ghost | Inline actions (Edit, Cancel) | `text-primary hover:bg-surface rounded-lg py-1 px-2` |
| Destructive | Delete, Logout | `text-red-600 border-red-200 hover:bg-red-50 rounded-lg` |

### Cards

```html
<div class="bg-white rounded-xl border border-surface-dark p-4">
  <!-- content -->
</div>
```

### Form Fields

```html
<div>
  <label class="block text-xs font-medium text-text-muted mb-1">Label</label>
  <input
    type="text"
    class="w-full border border-surface-dark rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
  />
</div>
```

### Lists

```html
<ul class="flex flex-col gap-2">
  <li class="bg-white rounded-xl border border-surface-dark p-4">
    <!-- item content -->
  </li>
</ul>
```

---

## Mobile UX Conventions

### Touch Targets

- **Minimum size:** 44×44px for all interactive elements
- **Spacing:** At least 8px between adjacent touch targets
- Buttons use `py-2 px-3` minimum for adequate tap area

### Safe Areas (PWA)

For notched iPhones, the app uses CSS environment variables:

```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
}
```

The `viewport-fit=cover` meta tag is required in `app.html`. Bottom nav applies these as padding.

### Gestures

| Gesture | Action |
|---------|--------|
| Swipe left/right | Navigate months in calendar |
| Swipe down | Dismiss bottom sheet |
| Tap outside | Close dropdowns/popovers |
| Long press | Reserved for future (e.g., quick actions on photos) |

### Form Behavior

- **Input zoom prevention:** All inputs use `font-size: 16px` minimum
- **Form state:** Resets on navigation (standard for short forms)
- **Date picker:** Native iOS/Android picker via `type="date"`. Known iOS limitation: may require two interactions to select exact date.

### Child Age Input

Instead of exact birth date, use a **week/month roller picker**:

- User selects age from roller: "1 týden", "2 týdny", ... "1 měsíc", "2 měsíce", etc.
- App calculates approximate birth date (today minus selected age)
- Birth date is stored internally for accurate age tracking over time
- UI displays current age: "Albert (10 týdnů)" — auto-updates as time passes

This approach reduces input friction while maintaining accurate age display.

### Loading States

- Buttons show "Načítání..." text and `disabled:opacity-50`
- No skeleton screens for Phase 1-2 (content loads fast enough)
- Future: Consider skeleton for photo gallery

### Error Display

- Inline error messages below forms: `text-sm text-red-600 mb-2`
- Toast notifications for async errors (Phase 2+)

---

## Screen Wireframes

### Calendar Page

```
┌─────────────────────────────────────┐
│     ◀  Březen 2026  ▶               │  ← Month navigation
├─────────────────────────────────────┤
│ Po  Út  St  Čt  Pá  So  Ne          │
│ 23  24  25  26  27  28   1          │
│  2   3   4   5   6   7   8          │
│  9  10  11  12  13  14  15          │
│ 16  17  18 [19] 20  21  22          │  ← Today highlighted
│ 23  24  25  26  27  28  29          │
│ 30  31   1   2   3   4   5          │
│  •       ••      •                  │  ← Elimination dots
├─────────────────────────────────────┤
│   📅      🍽      📷      📊      ⚙   │  ← Bottom nav (icons only)
└─────────────────────────────────────┘
```

### Day Detail (Bottom Sheet - Half Height)

```
┌─────────────────────────────────────┐
│         (Calendar visible)          │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ ─────────  19. března  ───────────  │  ← Drag handle + date
│                                     │
│  🥛   🥚   🌾   🥜   🐟   🦐        │  ← Category icons
│   ✕         ✕                       │  ← Elimination badges
│  🫘   🍎   🧅   🥩   🧈   🍫        │
│                                     │
└─────────────────────────────────────┘
```

### Day Detail (Bottom Sheet - Full Height)

```
┌─────────────────────────────────────┐
│ ─────────  19. března  ───────────  │
├─────────────────────────────────────┤
│  [ Eliminace ]  [ Jídla ]           │  ← Tabs
├─────────────────────────────────────┤
│                                     │
│  🥛 Mléčné výrobky              [▾] │  ← Expandable category
│     ├─ Mléko               [✕]      │  ← Eliminated
│     ├─ Sýr                 [ ]      │
│     └─ Jogurt              [✓]      │  ← Reintroduced
│                                     │
│  🥚 Vejce                       [▾] │
│                                     │
│  [Zkopírovat ze včerejška]          │  ← Copy action
│                                     │
├─────────────────────────────────────┤
│   📅      🍽      📷      📊      ⚙   │  ← Bottom nav (icons only)
└─────────────────────────────────────┘
```

### Settings Page

```
┌─────────────────────────────────────┐
│ Nastavení                           │  ← Page title
├─────────────────────────────────────┤
│                                     │
│ Děti                                │
│ ┌─────────────────────────────────┐ │
│ │ Albert                          │ │
│ │ Narozen: 15.1.2026              │ │
│ │              [Upravit] [Smazat] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Přidat dítě                     │ │
│ │ Jméno: [_______________]        │ │
│ │ Datum: [_______________]        │ │
│ │ [      Přidat dítě      ]       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │        Odhlásit se              │ │  ← Red destructive style
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│   📅      🍽      📷      📊      ⚙   │  ← Bottom nav (icons only)
└─────────────────────────────────────┘
```

---

## Revision History

| Date | Change |
|------|--------|
| 2026-03-30 | Initial version after Phase 1 phone testing |
