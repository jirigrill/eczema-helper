# UI Design

This document captures UI/UX decisions, navigation patterns, and design system conventions for the Eczema Tracker PWA. Created during Phase 1 after testing the app shell on a real iPhone.

## Target Users

See [user-personas.md](user-personas.md) for full persona definitions. Key UX drivers:

| Persona | Primary Need | Design Implication |
|---------|--------------|-------------------|
| **Markéta** (mother) | One-handed, 10-second logging while holding baby | Thumb-zone actions, quick shortcuts, forgiving UI |
| **Tomáš** (father) | Photo capture, understand state without context | Ghost overlay, clear current status display |
| **Dr. Nováková** (pediatrician) | 30-second scan of exported PDF | Export-first design, summary at top |

**Core UX principles derived from personas:**
- **Speed over precision** — "Today" / "Yesterday" shortcuts, copy-from-yesterday, auto-save
- **Forgiving interactions** — Undo instead of confirmation dialogs, state preserved on interruption
- **Glanceable status** — Color-coded dots, emoji icons, minimal text to read
- **One-handed thumb zone** — Primary actions at bottom, avoid top corners
- **Offline-first** — All mutations work without network, sync transparently

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

The app uses a **minimal sticky header** showing only the current page title. This helps less-frequent users (Tomáš) orient themselves while preserving most vertical space for content.

```
┌─────────────────────────────────────┐
│ Kalendář                            │  ← Sticky header with page title
├─────────────────────────────────────┤
│                                     │
│         (page content)              │
│                                     │
```

**Header styling:**
- Sticky (`sticky top-0`)
- White background with bottom border (`bg-white border-b border-surface-dark`)
- Page title: `text-lg font-semibold text-text`
- Padding: `px-4 py-3`
- Z-index: `z-40` (below modals, above content)

**Why not headerless?** User testing showed that Tomáš (secondary persona, less frequent use) needed orientation when opening the app. The minimal header costs ~48px of vertical space but significantly improves wayfinding.

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

Burgundy/wine color scheme — rich, mature, confident. Chosen for the primary female user base (see [user-personas.md](user-personas.md)).

Defined in `src/app.css` as CSS custom properties:

**Core palette:**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#8B4557` | Interactive elements, active states, links |
| `--color-primary-light` | `#C4A4AB` | Hover backgrounds, secondary accents |
| `--color-surface` | `#FAF8F8` | Page background |
| `--color-surface-dark` | `#EDE8E9` | Borders, dividers, card backgrounds |
| `--color-danger` | `#B84444` | Destructive actions, errors |
| `--color-success` | `#5A8B5A` | Success states |
| `--color-warning` | `#C9A227` | Warnings, pending states |
| `--color-text` | `#3D2B2F` | Primary text |
| `--color-text-muted` | `#7A6468` | Secondary text, placeholders, inactive states |

**Semantic colors (food tracking):**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-eliminated` | `#B84444` (danger) | Eliminated food badge, crossed-out items |
| `--color-reintroduced` | `#5A8B5A` (success) | Reintroduced food badge, checkmark items |
| `--color-neutral` | `#7A6468` (text-muted) | Neutral food state (not tracked) |

**Semantic colors (severity scale):**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-severity-1` | `#5A8B5A` | Mírný (mild) — green |
| `--color-severity-2` | `#8B9B5A` | Lehký (light) — yellow-green |
| `--color-severity-3` | `#C9A227` | Střední (moderate) — yellow |
| `--color-severity-4` | `#C97027` | Těžký (severe) — orange |
| `--color-severity-5` | `#B84444` | Velmi těžký (very severe) — red |

**Semantic colors (sync status):**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-sync-synced` | `#5A8B5A` (success) | Synced — green cloud |
| `--color-sync-syncing` | `#C9A227` (warning) | Syncing — orange cloud |
| `--color-sync-offline` | `#7A6468` (text-muted) | Offline — grey cloud with slash |

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

All buttons must meet the 44×44px minimum touch target. Use `min-h-[44px]` when needed.

| Type | Usage | Classes |
|------|-------|---------|
| Primary | Main actions (Save, Add) | `bg-primary text-white rounded-lg py-2.5 px-4 min-h-[44px]` |
| Secondary | Alternative actions | `border border-surface-dark text-text rounded-lg py-2.5 px-4 min-h-[44px]` |
| Ghost | Inline actions (Edit, Cancel) | `text-primary hover:bg-surface rounded-lg py-2 px-3 min-h-[44px]` |
| Destructive | Delete, Logout | `text-danger border border-danger/30 hover:bg-danger/10 rounded-lg py-2.5 px-4 min-h-[44px]` |
| Icon-only | Tab bar, close buttons | `p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center` |

**Note:** Ghost buttons updated to `py-2 px-3` (from `py-1 px-2`) to meet touch target requirements. Destructive buttons use semantic `text-danger` instead of hardcoded `text-red-600`.

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

### Toast Notifications

Toasts display feedback for async operations. Position at bottom, above the tab bar.

```
┌─────────────────────────────────────┐
│                                     │
│         (page content)              │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ ✓ Změny uloženy                 │ │  ← Success toast
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│   📅      🍽      📷      📊      ⚙   │
└─────────────────────────────────────┘
```

**Toast types:**

| Type | Icon | Background | Duration |
|------|------|------------|----------|
| Success | ✓ | `bg-success/90 text-white` | 2s, auto-dismiss |
| Error | ✕ | `bg-danger/90 text-white` | 5s, tap to dismiss |
| Info | ℹ | `bg-primary/90 text-white` | 3s, auto-dismiss |
| Sync | ☁ | `bg-surface-dark text-text` | Until complete |

**Behavior:**
- Appear with slide-up animation (200ms ease-out)
- Stack if multiple (max 2 visible, queue others)
- Tap anywhere on toast to dismiss early
- Do not block interactions — user can continue working

```html
<div class="fixed bottom-20 left-4 right-4 z-50">
  <div class="bg-success/90 text-white rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg">
    <span>✓</span>
    <span class="text-sm">Změny uloženy</span>
  </div>
</div>
```

### Confirmation Patterns

Two patterns exist: **inline confirmation** (preferred) and **modal confirmation** (for high-stakes actions only).

#### Inline Confirmation (Preferred)

Replaces the item content in place. Less disruptive, keeps user in context.

**When to use:**
- Deleting list items (child, meal, photo)
- Any action where the context is a specific item

```
┌─────────────────────────────────────┐
│ Opravdu smazat Albert?              │
│ Tato akce je nevratná.              │
│                                     │
│          [Zrušit]  [Smazat]         │
└─────────────────────────────────────┘
```

**Design:**
- Replaces card content (same card, different state)
- Question + warning text
- Two buttons: ghost cancel, destructive confirm
- No backdrop or overlay

#### Modal Confirmation (High-Stakes Only)

Full overlay that demands attention. Use only when the action affects the entire session or account.

**When to use:**
- Logout (ends session)
- Delete account (if implemented)
- Discard significant unsaved work

**When NOT to use:**
- Deleting individual items (use inline instead)
- Food toggle (reversible — just tap again)
- "Copy from yesterday" overwrite (show undo toast instead)
- Navigation away from forms (auto-save or preserve state)

```
┌─────────────────────────────────────┐
│                                     │
│     ┌───────────────────────┐       │
│     │                       │       │
│     │  Odhlásit se?         │       │  ← Title
│     │                       │       │
│     │  Budete muset znovu   │       │  ← Description
│     │  zadat heslo.         │       │
│     │                       │       │
│     │  [Zrušit]  [Odhlásit] │       │  ← Secondary + Destructive
│     │                       │       │
│     └───────────────────────┘       │
│                                     │
│         (dimmed background)         │
│                                     │
└─────────────────────────────────────┘
```

**Design:**
- Centered modal with `rounded-xl`, `shadow-xl`
- Dimmed backdrop (`bg-black/50`), tap outside to cancel
- Two buttons: secondary (cancel) on left, destructive on right
- Destructive actions use `bg-danger text-white`
- Keep text short — one sentence max

```html
<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
    <h3 class="text-lg font-semibold text-text mb-2">Odhlásit se?</h3>
    <p class="text-sm text-text-muted mb-6">Budete muset znovu zadat heslo.</p>
    <div class="flex gap-3">
      <button class="flex-1 py-2.5 px-4 min-h-[44px] rounded-lg border border-surface-dark text-text">
        Zrušit
      </button>
      <button class="flex-1 py-2.5 px-4 min-h-[44px] rounded-lg bg-danger text-white">
        Odhlásit
      </button>
    </div>
  </div>
</div>
```

### Bottom Sheets

Draggable sheets for contextual detail views. Used for day detail, meal composer, photo metadata.

**Snap points:**

| Point | Height | Use case |
|-------|--------|----------|
| Peek | ~30% | Quick summary, drag hint visible |
| Half | ~50% | Overview content, calendar still visible |
| Full | ~90% | Complete detail with tabs/scrolling |
| Dismissed | 0% | Swipe down to close |

**Behavior:**
- Drag handle at top (40px wide, 4px tall, `bg-surface-dark rounded-full`)
- Swipe down to dismiss (velocity-based)
- Swipe up to expand
- Tap outside (on visible calendar) to dismiss
- Keyboard pushes sheet up, does not cover input
- Preserve scroll position when changing snap points

```
┌─────────────────────────────────────┐
│         (Calendar visible)          │  ← Tap here to dismiss
│                                     │
├─────────────────────────────────────┤
│            ─────────                │  ← Drag handle
│                                     │
│  Sheet content here                 │
│                                     │
│                                     │
├─────────────────────────────────────┤
│   📅      🍽      📷      📊      ⚙   │
└─────────────────────────────────────┘
```

### Empty States

Display when a list or view has no data. Include illustration (optional), message, and action.

**Pattern:**

```
┌─────────────────────────────────────┐
│                                     │
│              (icon)                 │  ← Muted emoji or illustration
│                                     │
│     Zatím žádné fotky              │  ← Message (text-text-muted)
│                                     │
│     [  Vyfotit kůži  ]             │  ← Primary action button
│                                     │
└─────────────────────────────────────┘
```

**Empty states by screen:**

| Screen | Icon | Message | Action |
|--------|------|---------|--------|
| Calendar (no eliminations) | 🥗 | Žádné eliminace | — (implicit, just start tapping) |
| Photos gallery | 📷 | Zatím žádné fotky | Vyfotit kůži |
| Meals for day | 🍽 | Žádná jídla | Přidat jídlo |
| Trends (insufficient data) | 📊 | Potřebujeme více dat | Pokračujte v trackování |

### Undo Pattern

Preferred over confirmation dialogs for reversible actions. Shows toast with undo action.

```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ Eliminace zrušena     [Zpět]   │ │  ← Toast with undo button
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│   📅      🍽      📷      📊      ⚙   │
└─────────────────────────────────────┘
```

**Behavior:**
- Toast shows for 5 seconds
- "Zpět" button reverts the action
- If user taps elsewhere or timeout, action is committed
- Works offline — undo before sync commits locally

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
| Swipe down (on scrollable list at top) | Pull-to-refresh — triggers manual sync |
| Tap outside | Close dropdowns/popovers |
| Long press | Reserved for future (e.g., quick actions on photos) |
| Pinch | Zoom on photos in detail view |

### Pull-to-Refresh

For an offline-first app, pull-to-refresh provides user control over sync timing.

**Behavior:**
- Available on scrollable lists: photo gallery, calendar (when scrolled to top)
- Pull distance: 60px threshold to trigger
- Visual: spinner appears at top, pulls down with content
- Action: triggers immediate sync (push local changes, pull server changes)
- Feedback: toast shows sync result ("Synchronizováno" or "Offline — zkuste později")

**Implementation:**
- Use native `overscroll-behavior` where supported
- Fallback: touch event handler with translateY transform
- Spinner: `animate-spin` on circular icon

### Form Behavior

- **Input zoom prevention:** All inputs use `font-size: 16px` minimum
- **Form state:** Resets on navigation (standard for short forms)
- **Date picker:** Native iOS/Android picker via `type="date"`. Known iOS limitation: may require two interactions to select exact date.

### Child Age Input

> **Status: Deferred to Phase 2.** Current implementation uses standard `<input type="date">`. The roller picker is a UX enhancement to be evaluated after core food tracking is complete.

**Current (Phase 1):** Standard date input for birth date.

**Future enhancement:** Week/month roller picker for reduced input friction:

- User selects age from roller: "1 týden", "2 týdny", ... "1 měsíc", "2 měsíce", etc.
- App calculates approximate birth date (today minus selected age)
- Birth date is stored internally for accurate age tracking over time
- UI displays current age: "Albert (10 týdnů)" — auto-updates as time passes

This approach would reduce input friction while maintaining accurate age display. Requires custom component development.

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

The app enforces a **single-child constraint** — one family, one tracked child. The Settings page shows child info in edit mode, not a list with "add" capability.

```
┌─────────────────────────────────────┐
│ Nastavení                           │  ← Page title
├─────────────────────────────────────┤
│                                     │
│ Dítě                                │  ← Section header (singular)
│ ┌─────────────────────────────────┐ │
│ │ Jméno                           │ │
│ │ [Albert__________________]      │ │
│ │                                 │ │
│ │ Věk při založení                │ │
│ │ [⟲ 10 týdnů ⟲]                 │ │  ← Roller picker (see Child Age Input)
│ │                                 │ │
│ │ Narozen: 15.1.2026              │ │  ← Calculated, read-only
│ │                                 │ │
│ │ [      Uložit změny      ]      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Účet                                │
│ ┌─────────────────────────────────┐ │
│ │ jiri@example.com                │ │
│ │ [Změnit heslo]                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │        Odhlásit se              │ │  ← Destructive style
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│   📅      🍽      📷      📊      ⚙   │
└─────────────────────────────────────┘
```

**First-time user (no child yet):**

```
┌─────────────────────────────────────┐
│ Nastavení                           │
├─────────────────────────────────────┤
│                                     │
│ Dítě                                │
│ ┌─────────────────────────────────┐ │
│ │ Zatím nemáte přidané dítě.      │ │  ← Empty state message
│ │                                 │ │
│ │ Jméno                           │ │
│ │ [_________________________]     │ │
│ │                                 │ │
│ │ Věk                             │ │
│ │ [⟲ Vyberte věk ⟲]              │ │
│ │                                 │ │
│ │ [      Přidat dítě       ]      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ...                                 │
└─────────────────────────────────────┘
```

### Photos Tab — Gallery

The Photos tab (`/photos`) shows a filterable grid of encrypted photos. Thumbnails decrypt on-demand as they scroll into view.

```
┌─────────────────────────────────────┐
│ Fotky                               │  ← Page title
├─────────────────────────────────────┤
│ [ Vše ] [ Kůže ] [ Stolice ]        │  ← Filter tabs
├─────────────────────────────────────┤
│                                     │
│ 19. března                          │  ← Date header
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ 📷  │ │ 📷  │ │ 📷  │            │  ← Thumbnail grid (3 col)
│ │kůže │ │kůže │ │stol.│            │  ← Type badge
│ └─────┘ └─────┘ └─────┘            │
│                                     │
│ 17. března                          │
│ ┌─────┐ ┌─────┐                    │
│ │ 📷  │ │ 📷  │                    │
│ │stol.│ │kůže │                    │
│ └─────┘ └─────┘                    │
│                                     │
│         (scroll for more)           │
│                                     │
├─────────────────────────────────────┤
│ [+]                                 │  ← FAB: New photo
├─────────────────────────────────────┤
│   📅      🍽      📷      📊      ⚙   │
└─────────────────────────────────────┘
```

**Filter tabs:**
- "Vše" — All photos
- "Kůže" — Skin photos only (with body area badge)
- "Stolice" — Stool photos only

**Thumbnail behavior:**
- Square aspect ratio, `rounded-lg`
- Type badge in corner: "K" (kůže) or "S" (stolice), `text-xs`
- Skin photos show severity dot (color: green/yellow/orange/red based on 1-5)
- Loading state: `bg-surface-dark` placeholder with shimmer
- Tap opens detail view

**Empty state:**
```
┌─────────────────────────────────────┐
│                                     │
│              📷                     │
│                                     │
│     Zatím žádné fotky              │
│                                     │
│   Začněte fotit stav kůže          │
│   nebo stolice vašeho dítěte.      │
│                                     │
│     [  Vyfotit kůži  ]             │
│     [  Vyfotit stolici  ]          │
│                                     │
└─────────────────────────────────────┘
```

### Photos Tab — Capture Flow

Streamlined for one-handed, time-pressured use (diaper changes, fussy baby).

**Step 1: Type Selection (from FAB or empty state)**

```
┌─────────────────────────────────────┐
│                                     │
│     Co chcete vyfotit?              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │      🩹  Kůži                   │ │  ← Large tap target
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │      💩  Stolici                │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Step 2: Camera with Ghost Overlay**

```
┌─────────────────────────────────────┐
│ ╔═══════════════════════════════╗   │
│ ║                               ║   │
│ ║    (live camera feed)         ║   │
│ ║                               ║   │
│ ║      ┌ ─ ─ ─ ─ ─ ┐           ║   │  ← Ghost overlay (30% opacity)
│ ║      │  previous  │           ║   │     or SVG silhouette
│ ║      │   photo    │           ║   │
│ ║      └ ─ ─ ─ ─ ─ ┘           ║   │
│ ║                               ║   │
│ ╚═══════════════════════════════╝   │
│                                     │
│ [👻 Překryv: ═══○═══ 30%]          │  ← Ghost toggle + opacity slider
│                                     │
│        [ ◉ Vyfotit ]               │  ← Large capture button (thumb zone)
│                                     │
└─────────────────────────────────────┘
```

**Ghost overlay behavior:**
- Loads asynchronously — camera usable immediately
- Default 30% opacity, adjustable 10%–50% via slider
- Toggle on/off with ghost icon button
- Falls back to SVG silhouette if no previous photo exists
- First-use tooltip: "Porovnejte polohu s předchozí fotkou"

**Step 3a: Quick Save — Skin Photo**

```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │     (captured photo preview)    │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Oblast: [Obličej ▾]                 │  ← Body area dropdown (defaults to last)
│                                     │
│ Závažnost:                          │
│ ○───○───●───○───○                   │  ← Severity slider 1-5
│ 1   2   3   4   5                   │
│       Střední                       │  ← Dynamic label
│                                     │
│ [       Uložit       ]              │  ← Primary action
│ [Zahodit]                           │  ← Ghost/text link
│                                     │
└─────────────────────────────────────┘
```

**Body areas (skin):**
- Obličej (face)
- Paže (arms)
- Nohy (legs)
- Trup (torso)
- Ruce (hands)
- Krk (neck)
- Temeno (scalp)

**Severity scale with labels:**

| Score | Label | Visual |
|-------|-------|--------|
| 1 | Mírný | Green dot |
| 2 | Lehký | Yellow-green dot |
| 3 | Střední | Yellow dot |
| 4 | Těžký | Orange dot |
| 5 | Velmi těžký | Red dot |

**Step 3b: Quick Save — Stool Photo**

Defaults to most common values for quick save. Expand for details only when needed.

```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │     (captured photo preview)    │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Výchozí: žlutá, měkká, bez příměsí │  ← Default summary
│                                     │
│ [       Potvrdit       ]            │  ← Quick save with defaults
│                                     │
│ [Upravit detaily ▾]                 │  ← Expand for full form
│                                     │
└─────────────────────────────────────┘
```

**Expanded stool metadata form:**

```
┌─────────────────────────────────────┐
│ Barva:                              │
│ [🟡][🟢][🟤][🔴][⚫][⚪]            │  ← Color buttons
│  žl  zel hnědá čer černá bílá      │
│                                     │
│ Konzistence:                        │
│ [Řídká] [Měkká] [Tuhá] [Tvrdá]     │  ← Segmented control
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Hlen                    [ ○ ]   │ │  ← Toggle switch
│ ├─────────────────────────────────┤ │
│ │ Krev                    [ ○ ]   │ │  ← Toggle switch
│ └─────────────────────────────────┘ │
│                                     │
│ [       Uložit       ]              │
└─────────────────────────────────────┘
```

**Stool color options:**
- 🟡 Žlutá (yellow) — normal
- 🟢 Zelená (green) — possible intolerance
- 🟤 Hnědá (brown) — normal for older babies
- 🔴 Červená (red) — blood, urgent
- ⚫ Černá (black) — old blood, urgent
- ⚪ Bílá (white) — bile duct issue, urgent

### Photos Tab — Detail View

Full-screen overlay showing decrypted photo with metadata.

```
┌─────────────────────────────────────┐
│ [✕]                    [⋮]         │  ← Close + menu (edit/delete)
├─────────────────────────────────────┤
│                                     │
│                                     │
│                                     │
│     (full-size decrypted photo)     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ 19. března 2026, 14:32              │  ← Date/time
│ Kůže — Obličej                      │  ← Type + area
│ Závažnost: ●●●○○ Střední           │  ← Severity with dots
│                                     │
│ [  Porovnat s jinou  ]              │  ← Opens comparison picker
└─────────────────────────────────────┘
```

**For stool photos:**
```
│ 19. března 2026, 14:32              │
│ Stolice                             │
│ Barva: 🟢 Zelená                    │
│ Konzistence: Měkká                  │
│ Hlen: Ne  •  Krev: Ne               │
```

### Photos Tab — Comparison View

Side-by-side view for tracking progression. Only same-type photos can be compared.

```
┌─────────────────────────────────────┐
│ [✕] Porovnání                       │
├─────────────────────────────────────┤
│ ┌───────────┐   ┌───────────┐      │
│ │           │   │           │      │
│ │  Photo 1  │   │  Photo 2  │      │
│ │           │   │           │      │
│ └───────────┘   └───────────┘      │
│  5. března       19. března         │
│  Střední (3)     Lehký (2)          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Trend: 📈 Zlepšení              │ │  ← AI analysis summary
│ │                                 │ │     (after Phase 4)
│ │ Zarudnutí se snížilo, postižená │ │
│ │ oblast je menší.                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [  Požádat o AI analýzu  ]          │  ← Triggers Claude analysis
└─────────────────────────────────────┘
```

### Photos Tab — Passphrase Flow

First-time users must set an encryption passphrase. Deferred until first photo attempt.

```
┌─────────────────────────────────────┐
│                                     │
│     🔐                              │
│                                     │
│  Ochrana fotek                      │
│                                     │
│  Fotky vašeho dítěte budou          │
│  šifrovány heslem, které            │
│  znáte jen vy.                      │
│                                     │
│  ⚠️ Heslo nelze obnovit!            │  ← Warning (text-danger)
│                                     │
│ Heslo:                              │
│ [_________________________]         │
│                                     │
│ ████████░░░░ Silné                  │  ← Strength indicator (zxcvbn)
│ Odhadovaný čas prolomení: 3 roky   │
│                                     │
│ Heslo znovu:                        │
│ [_________________________]         │
│                                     │
│ [       Nastavit heslo       ]      │
│                                     │
└─────────────────────────────────────┘
```

**Returning user unlock:**
```
┌─────────────────────────────────────┐
│                                     │
│     🔐                              │
│                                     │
│  Odemknout fotky                    │
│                                     │
│  Zadejte heslo pro přístup          │
│  k šifrovaným fotkám.               │
│                                     │
│ Heslo:                              │
│ [_________________________]         │
│                                     │
│ [       Odemknout       ]           │
│                                     │
└─────────────────────────────────────┘
```

### Trends Tab

The Trends tab (`/trends`) visualizes eczema progression and food correlations over time.

```
┌─────────────────────────────────────┐
│ Přehled                             │  ← Page title
├─────────────────────────────────────┤
│ [Týden] [Měsíc] [3 měsíce]          │  ← Time range selector
├─────────────────────────────────────┤
│                                     │
│ Závažnost kůže                      │  ← Section header
│ ┌─────────────────────────────────┐ │
│ │     ╭─╮                         │ │
│ │   ╭─╯ ╰─╮     ╭╮               │ │  ← Line chart (severity 1-5)
│ │ ──╯      ╰───╯  ╰──            │ │
│ │ Po  Út  St  Čt  Pá  So  Ne     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Eliminace                           │  ← Section header
│ ┌─────────────────────────────────┐ │
│ │ 🥛 ████████████████░░░░  12d   │ │  ← Timeline bars
│ │ 🥚 ░░░░░████████░░░░░░░   6d   │ │
│ │ 🌾 ████████████████████  20d   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Možné korelace                      │
│ ┌─────────────────────────────────┐ │
│ │ 🥛 Mléko → zlepšení po 5 dnech │ │  ← AI-detected correlations
│ │ 🥚 Vejce → bez zjevného vlivu  │ │     (Phase 5)
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│   📅      🍽      📷      📊      ⚙   │
└─────────────────────────────────────┘
```

**Time range behavior:**
- Default: "Měsíc" (last 30 days)
- "Týden" shows daily data points
- "3 měsíce" shows weekly averages

**Severity chart:**
- Y-axis: 1–5 severity scale
- X-axis: dates
- Photo markers on chart where photos were taken
- Tap photo marker → opens photo detail

**Elimination timeline:**
- Horizontal bars showing elimination periods
- Filled = eliminated, empty = eating normally
- Duration label at end

**Insufficient data state:**
```
┌─────────────────────────────────────┐
│                                     │
│              📊                     │
│                                     │
│     Potřebujeme více dat           │
│                                     │
│   Pro zobrazení trendů              │
│   pokračujte v trackování           │
│   alespoň 7 dní.                    │
│                                     │
│   Zatím máte: 3 dny dat            │
│                                     │
└─────────────────────────────────────┘
```

### Food Tab

The Food tab (`/food`) provides a direct shortcut to today's food tracking without navigating through the calendar.

```
┌─────────────────────────────────────┐
│ Dnes (19. března)                   │  ← Page title with date
├─────────────────────────────────────┤
│  [ Eliminace ]  [ Jídla ]           │  ← Same tabs as day detail
├─────────────────────────────────────┤
│                                     │
│  (Same content as Day Detail        │
│   full-height sheet)                │
│                                     │
│  🥛 Mléčné výrobky              [▾] │
│     ├─ Mléko               [✕]      │
│     ├─ Sýr                 [ ]      │
│     └─ Jogurt              [✓]      │
│                                     │
│  🥚 Vejce                       [▾] │
│                                     │
│  [Zkopírovat ze včerejška]          │
│                                     │
├─────────────────────────────────────┤
│   📅      🍽      📷      📊      ⚙   │
└─────────────────────────────────────┘
```

**Purpose:** Quick access for the most common flow — logging today's eliminations and meals. Users don't need to tap Calendar → tap Today → expand sheet.

**Behavior:**
- Always shows today's date
- Identical functionality to the day detail sheet
- Tapping the date opens a date picker to view other days (navigates to calendar)

---

## Revision History

| Date | Change |
|------|--------|
| 2026-03-30 | Initial version after Phase 1 phone testing |
| 2026-03-30 | Added user personas reference and UX principles summary |
| 2026-03-30 | Fixed Settings wireframe for single-child constraint |
| 2026-03-30 | Added component patterns: toasts, modals, confirmation dialogs, bottom sheets, empty states, undo pattern |
| 2026-03-30 | Added Photos tab wireframes: gallery, capture flow, detail view, comparison, passphrase |
| 2026-03-30 | Added Trends tab wireframe with charts and correlation display |
| 2026-03-30 | Added Food tab wireframe (shortcut to today) |
| 2026-03-30 | Added semantic color tokens for food states, severity scale, sync status |
| 2026-03-30 | Fixed button touch targets to meet 44×44px minimum |
| 2026-03-30 | Added pull-to-refresh documentation |
| 2026-03-30 | Updated header section: documented sticky header pattern (was incorrectly marked as headerless) |
| 2026-03-30 | Split confirmation patterns into inline (preferred for list items) and modal (for session-level actions) |
| 2026-03-30 | Deferred age roller picker to Phase 2 |
