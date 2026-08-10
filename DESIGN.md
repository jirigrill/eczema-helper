---
version: alpha
name: Atopic Helper
description: "A warm, clinical mobile-app design system for tracking a breastfed newborn's atopic eczema through an elimination diet. Built around a wine-rose primary (#8B4557) and a soft taupe-pink canvas (#E8E4E5), with FAF8F8 surface panels lifted on hairline borders. The system reads as healthcare-craft documentation: editorial tone, generous whitespace, evidence-first cards. Display type uses the system sans (San Francisco / Segoe UI) at 600–700 with no decorative weight. Phone mockups live as black-bezel iPhone shells (320×680) on the canvas; insight cards live as charcoal-rose-tinted panels with 16px corners. The primary wine accent appears on bottom-nav active state, FAB, and progress fills — never decoratively. Page rhythm leans on phone screenshots framed in monospace `▸ FRAME-TAG` annotations rather than atmospheric color. Czech-language UI: dates as `5. 5.`, abbreviations like `Po · Út · St`."

colors:
  primary: "#8B4557"
  on-primary: "#FFFFFF"
  primary-light: "#C4A4AB"
  ink: "#3D2B2F"
  ink-muted: "#7A6468"
  canvas: "#E8E4E5"
  surface: "#FAF8F8"
  surface-dark: "#EDE8E9"
  hairline: "#EDE8E9"
  device-bezel: "#000000"
  semantic-success: "#5A8B5A"
  semantic-warning: "#C9A227"
  semantic-danger: "#B84444"
  reintro-accent: "#4A7C6F"
  sev-1: "#5A8B5A"
  sev-2: "#8B9B5A"
  sev-3: "#C9A227"
  sev-4: "#C97027"
  sev-5: "#B84444"

typography:
  display:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.4px
  page-heading:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 24px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: -0.2px
  screen-heading:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.2px
  card-title:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.1px
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  micro:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  eyebrow:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.6px
  insight-tag:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 10px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.4px
  status-numeric:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0
  frame-tag:
    fontFamily: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.8px
  variant-label:
    fontFamily: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.4px

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 20px
  device-screen: 34px
  device-bezel: 44px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 6px
  md: 8px
  base: 12px
  lg: 16px
  xl: 20px
  xxl: 28px
  section: 48px

components:
  device-bezel:
    backgroundColor: "{colors.device-bezel}"
    rounded: "{rounded.device-bezel}"
    padding: 10px
    width: 320px
    height: 680px
  device-screen:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.device-screen}"
    width: 100%
    height: 100%
  status-bar:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.status-numeric}"
    height: 52px
    padding: 0 28px
  dynamic-island:
    backgroundColor: "{colors.device-bezel}"
    rounded: "{rounded.pill}"
    width: 110px
    height: 32px
  home-indicator:
    backgroundColor: "{colors.device-bezel}"
    rounded: "{rounded.xs}"
    width: 120px
    height: 4px
  card-default:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    borderColor: "{colors.surface-dark}"
    borderWidth: 1px
    rounded: "{rounded.xl}"
    padding: 16px
  card-empty-state:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    borderColor: "{colors.surface-dark}"
    borderStyle: dashed
    borderWidth: 2px
    rounded: "{rounded.xl}"
    padding: 16px
  card-empty-cta:
    backgroundColor: "rgba(139,69,87,0.05)"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    borderColor: "rgba(139,69,87,0.30)"
    borderStyle: dashed
    borderWidth: 2px
    rounded: "{rounded.xl}"
    padding: 16px
  task-tile-pending:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    captionColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
    borderColor: "{colors.surface-dark}"
    borderWidth: 1px
    rounded: "{rounded.lg}"
    padding: 8px
  task-tile-done:
    backgroundColor: "rgba(90,139,90,0.05)"
    textColor: "{colors.ink}"
    captionColor: "{colors.semantic-success}"
    typography: "{typography.micro}"
    borderColor: "rgba(90,139,90,0.30)"
    borderWidth: 1px
    rounded: "{rounded.lg}"
    padding: 8px
  insight-card-trigger:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    borderColor: "{colors.surface-dark}"
    borderWidth: 1px
    rounded: "{rounded.xl}"
    headerBackground: "rgba(184,68,68,0.08)"
    headerTagBackground: "rgba(184,68,68,0.15)"
    headerTagColor: "{colors.semantic-danger}"
  insight-card-progress:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    borderColor: "{colors.surface-dark}"
    borderWidth: 1px
    rounded: "{rounded.xl}"
    headerBackground: "rgba(90,139,90,0.08)"
    headerTagBackground: "rgba(90,139,90,0.15)"
    headerTagColor: "{colors.semantic-success}"
  insight-card-pattern:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    borderColor: "{colors.surface-dark}"
    borderWidth: 1px
    rounded: "{rounded.xl}"
    headerBackground: "rgba(201,162,39,0.10)"
    headerTagBackground: "rgba(201,162,39,0.20)"
    headerTagColor: "{colors.semantic-warning}"
  evidence-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: 6px 10px
  insight-tag:
    backgroundColor: "rgba(0,0,0,0.04)"
    textColor: "{colors.ink-muted}"
    typography: "{typography.insight-tag}"
    rounded: "{rounded.pill}"
    padding: 2px 8px
  chip-success:
    backgroundColor: "rgba(90,139,90,0.10)"
    textColor: "{colors.semantic-success}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 8px
  chip-warning:
    backgroundColor: "rgba(201,162,39,0.10)"
    textColor: "{colors.semantic-warning}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 8px
  chip-neutral:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 8px
  photo-thumb:
    backgroundColor: "linear-gradient(135deg, #C4A4AB, rgba(139,69,87,0.4))"
    rounded: "{rounded.md}"
    aspectRatio: 1
  photo-thumb-evidence:
    backgroundColor: "linear-gradient(135deg, #C4A4AB, rgba(139,69,87,0.4))"
    rounded: "{rounded.md}"
    width: 28px
    height: 28px
    borderColor: "{colors.surface-dark}"
    borderWidth: 1px
  fab-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display}"
    rounded: "{rounded.full}"
    width: 56px
    height: 56px
    elevation: shadow-lg
  fab-primary-onboard:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display}"
    rounded: "{rounded.full}"
    width: 56px
    height: 56px
    elevation: shadow-lg
    ringColor: "rgba(139,69,87,0.20)"
    ringWidth: 4px
  bottom-nav-2col:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
    borderTopColor: "{colors.surface-dark}"
    borderTopWidth: 1px
    paddingTop: 8px
    paddingBottom: 20px
  bottom-nav-3col-fab:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
    borderTopColor: "{colors.surface-dark}"
    borderTopWidth: 1px
    paddingTop: 8px
    paddingBottom: 20px
  nav-item-active:
    textColor: "{colors.primary}"
    typography: "{typography.micro}"
  nav-item-inactive:
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
  week-strip-cell:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 8px 0
  week-strip-cell-today:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 8px 0
  meal-row:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: 12px
  meal-avatar:
    backgroundColor: "rgba(90,139,90,0.15)"
    textColor: "{colors.semantic-success}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    width: 32px
    height: 32px
  program-strip:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    progressTrack: "{colors.surface-dark}"
    progressFill: "{colors.primary}"
    progressHeight: 4px
  frame-tag-annotation:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    typography: "{typography.frame-tag}"
    padding: 0 0 8px 0
  document-eyebrow:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    typography: "{typography.variant-label}"
    padding: 0
---

## Overview

Atopic Helper's design system is a **warm clinical mobile-app canvas**. It is built for high-fidelity iPhone mockups — every surface in the system lives inside a black-bezel device shell, photographed against a soft taupe-pink page (`{colors.canvas}` #E8E4E5). On top of `{colors.surface}` (#FAF8F8) inside the device, white panels (`#FFFFFF`) lifted on `{colors.surface-dark}` hairlines carry content blocks. The single brand accent is **wine-rose** `{colors.primary}` (#8B4557) — used scarcely on the active bottom-nav state, the FAB, primary CTAs, and progress fills.

The system avoids decorative gradients and AI-generated imagery. Where photos appear (eczema documentation), they sit as `{components.photo-thumb}` rectangles with the brand-tinted gradient placeholder until real medical photos are loaded — the gradient is functional, not atmospheric.

Display type runs the system sans stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto`) at weights 600–800 with subtle negative tracking. The voice is editorial: insights read like tiny investigative articles, not dashboard tiles. A monospace cut (`ui-monospace, SFMono-Regular, "SF Mono"`) appears only on **document chrome** — frame annotations like `▸ DNES`, page eyebrows like `docs/design / redesign-v1` — never inside the app screens themselves.

The page rhythm is **phone-as-protagonist**: 320×680 black-bezel devices in a horizontal row, each annotated above with a `▸ NAME` frame tag in monospace and a short caption below in muted body text. The canvas behind is a single quiet field, never broken by section dividers within a row.

**Key Characteristics:**

- **Wine-rose primary** (`{colors.primary}` #8B4557) — single chromatic accent, used on FAB / active nav / primary CTA only.
- **Five-step severity scale** (`{colors.sev-1}` green → `{colors.sev-5}` red) — the only multi-hue palette, exclusive to skin-state visualization.
- **Three semantic colors** (`{colors.semantic-success}` / `{colors.semantic-warning}` / `{colors.semantic-danger}`) for state pills and insight headers — saturation kept low (8–20% alpha) so they never compete with content.
- **`{colors.canvas}` #E8E4E5** is the document background; **`{colors.surface}` #FAF8F8** is the in-device background. The contrast is gentle but always present — no flat-on-flat.
- **Cards are 16px-cornered** (`{rounded.xl}`) with 1px hairline borders; pills are full-rounded; phone-screen corners are 34px (`{rounded.device-screen}`).
- **Insights have three header variants** (trigger / progress / pattern) — each with its own tinted header strip, never the body.
- **Photos are evidence, not decoration** — they appear inside insight cards next to case rows (28×28) or as 4-up grids proving streak continuity. They do not appear as hero imagery.
- **Frame annotations use monospace** with a `▸` chevron prefix — this is signage for the design document, not part of the app UI.
- **Czech-first content**: dates as `5. 5.`, day abbreviations `Po Út St Čt Pá So Ne`, severity vocabulary `klidný · mírný · podrážděný · zhoršený · akutní`.

## Colors

> Source: `docs/design/redesign.html` `<style>` block + Tailwind extension; see `src/app.css` for runtime token names.

### Brand & Accent

- **Primary Wine** (`{colors.primary}`): Single brand accent — FAB, primary CTA, active nav state, progress fill, link emphasis. Wine-rose #8B4557.
- **Primary Light** (`{colors.primary-light}`): Soft photo-thumbnail gradient start; rare hover backdrop. #C4A4AB.

### Surface

- **Canvas** (`{colors.canvas}`): Document background outside the phone — #E8E4E5, soft taupe-pink. Never used inside an app screen.
- **Surface** (`{colors.surface}`): In-device background — #FAF8F8, near-white with the faintest pink. Carries every screen.
- **Surface Dark** (`{colors.surface-dark}`): Hairline borders, dividers, dim chips, week-strip empty pills. #EDE8E9.
- **Hairline** (alias of surface-dark): All 1px card borders, divider lines.
- **Device Bezel** (`{colors.device-bezel}`): #000000 — only the iPhone shell + dynamic island + home indicator. Not used as a foreground color.

### Text

- **Ink** (`{colors.ink}`): All headlines and body type — #3D2B2F. Warm dark plum, never pure black.
- **Ink Muted** (`{colors.ink-muted}`): Secondary type, captions, eyebrows, frame tags — #7A6468.

### Severity Scale (5-Step Skin State)

The only multi-hue palette in the system. Always cited by token, never by name. Maps to the eczema severity score (1=calm, 5=acute).

- **Sev 1** (`{colors.sev-1}`): #5A8B5A · `klidná` (calm)
- **Sev 2** (`{colors.sev-2}`): #8B9B5A · `mírná` (mild)
- **Sev 3** (`{colors.sev-3}`): #C9A227 · `podrážděná` (irritated)
- **Sev 4** (`{colors.sev-4}`): #C97027 · `zhoršená` (worsened)
- **Sev 5** (`{colors.sev-5}`): #B84444 · `akutní` (acute)

The severity scale is reserved for **skin-state representation** — week-strip dots, photo overlay markers, severity pills next to evidence rows. It must not be used decoratively on chips or buttons that are unrelated to skin state.

### Semantic

- **Success** (`{colors.semantic-success}`): #5A8B5A — same hex as sev-1; used for "✓ pokrok" insight headers, success chips, meal-avatar dish-OK state.
- **Warning** (`{colors.semantic-warning}`): #C9A227 — same hex as sev-3; used for "↻ vzorec" insight headers and intermediate states.
- **Danger** (`{colors.semantic-danger}`): #B84444 — same hex as sev-5; used for "⚠ spouštěč" insight headers, dietary-error counters, allergen avoid markers.
- **Reintro Accent** (`{colors.reintro-accent}`): #4A7C6F teal — exclusive to the Test phase of the elimination protocol (reserved by the system; not yet used in any prototype).

The convergence between severity colors and semantic colors is **intentional**: a danger state in the system *means* the same thing as a sev-5 skin reading. Reusing the hex prevents the user from learning two parallel red palettes.

### Color Usage Rules

- The **wine primary** never appears as a fill on more than one element per screen. If the FAB is wine, the active nav can be wine, but a third wine fill (e.g., a chip) breaks the hierarchy.
- **Pure black** never appears as text. Only on the device bezel and dynamic island.
- **Pure white** (`#FFFFFF`) is reserved for **card surfaces inside the device**. The page canvas and the in-device backdrop both use off-whites.

#### Semantic Opacity Tiers

Three opacity tiers exist for semantic-colour backgrounds. Each has a distinct role; do not substitute one for another:

| Tier | Tailwind suffix | Role | Examples |
|------|----------------|------|---------|
| **Subtle tint** | `/5` | Surface is *associated* with a colour but passive — not selected, not alarming. Background only; no border/text change. | Not-selected severity choice card, training-band background, `card-empty-cta` background, `task-tile-done` surface |
| **Icon / selection background** | `/15` | Element *actively represents* the colour's meaning. Two sub-patterns: (a) **icon container** — circular/avatar, background only, text at full semantic opacity; (b) **selection chip** — inline pill, background `/15` + text at full semantic opacity + border `/50`. | Phase step-number circles, meal-type avatars (sub-pattern a); selected allergen chips, insight tag pills (sub-pattern b) |
| **Banner scale** | `/10`–`/40` | Banner-level component — background + border + text are set together via `[data-state]`. | InfoBanner, status chips, alert cards |

#### Border Opacity Formula

Border opacity = background opacity × 3, rounded to the nearest 10:

| Background | Border |
|-----------|--------|
| `/5` | `/20` (minimum) |
| `/10` | `/30` |
| `/12` | `/40` |
| `/15` | `/50` |

Structural decorative borders with no semantic background (dividers, container outlines) use `/20` flat.

## Typography

### Font Family

- **Display / Body** — System sans stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto`. One family for all in-app type.
- **Mono** — System mono stack: `ui-monospace, SFMono-Regular, "SF Mono", Menlo`. Used **only** on the document chrome (frame tags `▸ DNES`, version eyebrows `docs/design / redesign-v1`). Never inside the simulated app screens.

The marketing/document layer and the in-device layer use the **same primary stack**, so when you screenshot a phone the type looks native — no foreign weight or family slips into the app.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display}` | 32px | 600 | 1.15 | -0.4px | Document hero (rare) |
| `{typography.page-heading}` | 24px | 800 | 1.20 | -0.2px | Document section heading (`Finální návrh /program stránky`) |
| `{typography.screen-heading}` | 24px | 700 | 1.20 | -0.2px | In-device screen title (`Dnes`, `Týden`, `Postup`) |
| `{typography.card-title}` | 16px | 600 | 1.25 | -0.1px | Insight card title (`Mléčné výrobky → zhoršení`) |
| `{typography.body}` | 14px | 400 | 1.50 | 0 | Insight card body, evidence rows |
| `{typography.body-sm}` | 13px | 400 | 1.50 | 0 | Smaller body, week-strip numbers |
| `{typography.caption}` | 11px | 400 | 1.40 | 0 | Captions under devices, meta lines |
| `{typography.micro}` | 10px | 500 | 1.30 | 0 | Bottom-nav labels, frame chips, week strip day-letters |
| `{typography.eyebrow}` | 12px | 600 | 1.30 | 0.6px (uppercase) | In-device section eyebrows (`STAV EKZÉMU`, `DNEŠNÍ JÍDLA`) |
| `{typography.insight-tag}` | 10px | 600 | 1.0 | 0.4px (uppercase) | `⚠ SPOUŠTĚČ` / `✓ POKROK` / `↻ VZOREC` pill labels |
| `{typography.frame-tag}` | 10px | 500 | 1.0 | 0.8px (uppercase, mono) | `▸ DNES`, `▸ TÝDEN` document annotations |
| `{typography.variant-label}` | 12px | 400 | 1.30 | 0.4px (mono) | Document version eyebrow (`docs/design / redesign-v1`) |

### Principles

- **Single voice from screen-heading to body.** All in-device type uses one family — only weight and size change.
- **Eyebrows are uppercase with positive tracking** (+0.4 to +0.8px). They mark *taxonomy* not *content*.
- **Mono is taxonomy, not content.** Every monospace string in the system is **chrome around** the design (frame tags, version labels) — never type inside the app. This silently signals "you are looking at a design artifact".
- **Bold is reserved for emphasis inside flowing prose.** A sentence like "stav byl **zhoršený** ve **3 ze 4** případů" uses bold to surface the testable claim. Headers don't need bold — they're already heavy via weight 600/700.
- **No italics for tone.** Italic appears only for citations (`*latte*`) or rare disclaimers. Tone is carried by word choice, not by slant.

### Component Utilities

The CSS layer in `src/app.css` exposes a small set of `@layer components` utilities mapping to the table above:

- `.eyebrow` → `{typography.eyebrow}` (12px / 600 / uppercase / tracking-wide / muted). Use for **all** in-device section headers and banner labels. Supersedes the previous `.micro-label` and `.section-label` utilities, which were two near-duplicate tokens for the same role; both have been removed.
- `.body` → `{typography.body}` (14px / text). Food names, primary content, evidence rows.
- `.body-muted` → `{typography.body}` at muted colour (14px / muted). The in-device **header date** (e.g. `/meal` top-right): bumped here from `.caption` so the logging day stays legible rather than reading as tiny meta (#307).
- `.caption` → `{typography.caption}` (11px / muted). Porce/preparation suffixes and secondary banner text — quiet meta that must not compete with body content. (No longer used for the header date — see `.body-muted`.)

These three together form the unified typography rhythm on the meal screen (issue #302); they are also the recommended starting set for any new screen.

### Note on Czech Diacritics

All in-app type renders Czech diacritics — `š ž č ř ě á í ó ú ý ě ů`. The chosen system stack handles these correctly on macOS, iOS, Windows, and Android. Never substitute (e.g., `zhorseny` for `zhoršený`).

## Layout

### Spacing System

- **Base unit**: 4px.
- **Tokens**: `{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 6px · `{spacing.md}` 8px · `{spacing.base}` 12px · `{spacing.lg}` 16px · `{spacing.xl}` 20px · `{spacing.xxl}` 28px · `{spacing.section}` 48px.
- **Card interior**: `{spacing.lg}` 16px on default cards; `{spacing.xl}` 20px on hero/insight cards.
- **Screen horizontal padding**: `{spacing.xl}` 20px (`px-5` Tailwind) — every screen content block aligns to this gutter.
- **Inter-card gap**: `{spacing.base}` 12px (`mb-3` Tailwind) — vertical rhythm between stacked cards.
- **Status bar height**: 52px (notched); content starts immediately below.
- **Floating-FAB clearance**: 80–96px from bottom — `pb-20` to `pb-24` on screen-content, so the last card is not covered by the FAB.

### Grid & Container

- **Document grid**: `max-w-[1700px]` centered; row of phones in `flex flex-wrap gap-12 items-start justify-center`.
- **Phone canvas**: 320×680 device bezel · 300×660 inner screen · screen-content scrolls vertically.
- **Week strip**: 7-column grid, `grid-cols-7 gap-1`, each cell ≈40px tall.
- **Insight evidence**: stacked rows, full-width inside the card padding.
- **Photo grids**: 4-up `grid-cols-4 gap-1.5` for streak proof; horizontal `flex gap-1.5 overflow-x-auto` for galleries.

### Whitespace Philosophy

The taupe canvas (`{colors.canvas}`) IS the whitespace between phones. **Within a screen**, whitespace is generous: 12–16px between cards, 20px screen gutter, 28px between sections inside scrolling content. **Within a card**, density rises: 6–10px between evidence rows, because density there *is the point* (this is data, not decoration).

Sections never separate by horizontal rules within a screen. Hierarchy comes from card boundaries + uppercase eyebrows + vertical gap — not from lines.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | No border, no shadow | Body type, plain text on screen |
| 1 (paper card) | `#FFFFFF` background on `{colors.surface}`, 1px `{colors.surface-dark}` border, `{rounded.xl}` corners | Default cards (eczema status, meal list, insight, week summary) |
| 2 (tinted insight header) | Insight card body at level 1, but the **header strip** uses 8% alpha tint of the matching semantic color | `⚠ spouštěč` (danger tint), `✓ pokrok` (success tint), `↻ vzorec` (warning tint) |
| 3 (device bezel) | `{colors.device-bezel}` black with `{rounded.device-bezel}` 44px corners, inner `{rounded.device-screen}` 34px screen, soft drop shadow `0 30px 60px -20px rgba(0,0,0,0.3), 0 8px 20px -8px rgba(0,0,0,0.15)` | Phone mockup container |
| 4 (FAB) | `{colors.primary}` background, full-rounded, `shadow-lg` drop shadow, optional 4px `rgba(139,69,87,0.20)` ring on onboarding state | The plus button on `Dnes` |
| 5 (focus ring on FAB) | 4px ring at 20% primary alpha around the FAB | Empty-state hint (the screen is asking the user to start) |

The system **resists shadow elsewhere**. Inside the device, every elevation is carried by surface change + 1px hairline. Drop shadow appears only on the device bezel itself and the FAB — both of which simulate physical objects.

### Decorative Depth

- **Subtle inner highlight** on the device bezel: `inset 0 0 0 1px rgba(255,255,255,0.06)` — gives the black bezel a faint pixel-rendered edge so it doesn't read as flat-fill.
- **No atmospheric gradients on screen backgrounds.** The only gradients in the system are: (a) photo-thumb placeholder, (b) FAB shadow falloff. That's it.

### Stacking Scale

Z-index values across the app follow a fixed ladder. New surfaces pick the matching layer rather than inventing a value, so the FAB's overhanging top edge never gets covered by something arbitrarily set to `z-50` (issue #324).

| Layer | Tailwind | Use |
|---|---|---|
| Base | (none) | Page content in normal flow |
| Sticky chrome | `z-20` | Sticky page headers (`PageHeader`) |
| Page CTA overlay | `z-30` | Bottom-anchored CTA gradients (e.g. meal page) |
| Transient notification | `z-40` | Toasts that float above page content |
| FAB | `z-50` | The "+" button — must outrank toast and any page-level overlay so its edge is always visible |
| Modal scrim | `z-[60]` | Backdrop behind a sheet/dialog |
| Modal content | `z-[70]` | Bottom sheets, action sheets, confirm dialogs — intentionally cover the FAB |

Rules:
- Anything that uses `z-index` must also have a non-static `position` (use `relative` if no other positioning is needed).
- A surface that pops up *above* the FAB must reach the modal layer (`z-[60]` / `z-[70]`); halfway values cover the FAB by accident.
- Toast-style notifications stay below the FAB, not above it. Keep them at `z-40` and use `bottom-[…]` to clear the FAB vertically.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Home indicator, narrow chips, small thumbnails |
| `{rounded.sm}` | 6px | Inline tags |
| `{rounded.md}` | 8px | Evidence rows, week-strip cells, photo evidence thumbs (28×28), small buttons |
| `{rounded.lg}` | 12px | Mid-size cards, secondary buttons |
| `{rounded.xl}` | 16px | All default content cards (eczema status, meals list, insights, week summary, program card) |
| `{rounded.xxl}` | 20px | Dynamic Island |
| `{rounded.device-screen}` | 34px | Inner phone screen |
| `{rounded.device-bezel}` | 44px | Outer phone bezel |
| `{rounded.pill}` / `{rounded.full}` | 9999px | Severity dots, photo overlay markers, status chips, FAB, dynamic island ends, meal avatar |

### Shape Principles

- **Cards default to `{rounded.xl}` 16px.** Going lower feels jagged for medical/wellness content; going higher feels toy-like.
- **Pills are full-rounded** (`{rounded.pill}`) regardless of size. A sev-dot at 6×6 and a chip at 80×24 both use the same radius rule.
- **Phone-screen corners (34px) and bezel corners (44px) are exact iPhone proportions** — they should not be tweaked for visual taste; they reflect device truth.
- **Square corners are not used.** Even icons within cards (severity dots, photo markers) round to a full circle.

## Iconography

The system uses **stroke-based outline SVG icons** at `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="2"`, no fill. Icons inherit color from their parent element (e.g., bottom-nav active state).

Standard sizes:
- Bottom-nav: 22×22px
- Status-bar chrome (cogwheel on screen header): 20×20px
- Inline accent (hint arrow under empty-state cards): 14×14px

**Emojis are not navigation icons.** Earlier iterations used 📅 / 🍽️ / 📋 / ⚙️ for nav — these were replaced with SVG paths. Emojis remain acceptable inside content cards as **content** (a meal item showing 🥛 to indicate dairy, an evidence row labeling the food group). The distinction: emoji-as-content is information; emoji-as-chrome is slop.

The single decorative glyph is **▸** (BLACK RIGHT-POINTING SMALL TRIANGLE U+25B8) — used as the prefix on every frame tag. It is not a navigation cue inside the app, only a chrome marker on the design document.

## Components

### Phone Bezel & Screen

- `{components.device-bezel}` — 320×680 black shell with 44px outer corners, 10px padding inset, soft drop shadow. Holds exactly one screen.
- `{components.device-screen}` — 100% inside the bezel, `{colors.surface}` background, 34px corners, `overflow: hidden`. Status bar absolute at top, screen-content scrollable below, optional bottom-nav docked absolute.
- `{components.dynamic-island}` — 110×32px black pill at top-center, `top: 10px`, z-index above content. Always present on every device frame.
- `{components.home-indicator}` — 120×4px black bar at bottom-center, `bottom: 8px`, opacity 0.85.

### Status Bar

- `{components.status-bar}` — 52px tall, transparent background (sits on screen surface), 28px horizontal padding. Time on left (`9:41`, weight 600), three dots + battery glyph on right (`●●● ◐`).
- The status bar is **always rendered** even on internal screens. It is part of the iPhone illusion, not the app UI.

### Cards

- `{components.card-default}` — White surface, 1px hairline, 16px corners, 16px padding. Default container for any content block (eczema status, meals list, week summary, program details).
- `{components.card-empty-state}` — Same dimensions as default but with **dashed** 2px hairline border. Used when the user has not yet entered data (`Zatím nic — první záznam přidej tlačítkem dole`).
- `{components.card-empty-cta}` — Variant with primary-tinted background (5% alpha) and primary dashed border (30% alpha) — used for **inviting input** (`Klepni a zapiš dnešní stav`). The empty CTA color is louder than the empty-state because it's asking for action.

### Task Tiles (Dnes udělej)

The `Dnes udělej` block stacks 3 daily tasks side-by-side. Tiles share identical geometry (`{rounded.lg}` 12px corners, 1px hairline, 8px padding, centered icon · label · sub-label). Only **state** changes the surface and caption color — never the border weight, dashes, or border color hue.

- `{components.task-tile-pending}` — White surface, `{colors.surface-dark}` 1px hairline. Sub-label `čeká` in `{colors.ink-muted}`. **Never** primary-dashed, never warning-tinted, never severity-colored — pending is the quiet default.
- `{components.task-tile-done}` — Success-tinted surface (5% alpha), success-tinted hairline (30% alpha). Sub-label `✓ ok` / `✓ pořízeno` in `{colors.semantic-success}`.

Why one neutral pending style: the wine primary is reserved for FAB / active-nav / progress fill (see Color Usage Rules). Dashing a single pending tile in primary visually competes with the FAB and breaks the "one wine fill per screen" rule. A pending reintro evaluation is still a pending task — it uses the same neutral surface; the **header counter** carries any urgency, not the tile.

### Insight Cards (Three Variants)

Insight cards have a **two-zone layout**: tinted header (8% alpha of semantic color) + white body. The tag pill in the header uses 15–20% alpha; the body holds the explanation, evidence rows, and any nuance.

- `{components.insight-card-trigger}` — Header tinted with `rgba(184,68,68,0.08)` (danger). Used for findings of the form *X causes Y* (e.g., dairy → flare).
- `{components.insight-card-progress}` — Header tinted with `rgba(90,139,90,0.08)` (success). Used for streak / improvement findings.
- `{components.insight-card-pattern}` — Header tinted with `rgba(201,162,39,0.10)` (warning). Used for cyclical / temporal patterns (e.g., morning vs evening severity).

The body of every insight card is the same: 14px text paragraph, then evidence rows (or a 7-day matrix, or a 4-photo grid — the body adapts to the type of pattern), then a small italic nuance line at 11px.

### Evidence Row

- `{components.evidence-row}` — Single horizontal bar inside an insight card. Layout: 6px severity dot · 40px date · flexible food/cause text · 10px sev marker · 28×28 photo thumb. Background `{colors.surface}`, 8px corners.
- A row marked `opacity: 0.60` denotes a counter-example (the date that *doesn't* fit the pattern, kept visible to prove falsifiability).

### Tags & Chips

- `{components.insight-tag}` — Uppercase pill at 10px / weight 600 / +0.4px tracking. Sits in the insight header. Always paired with a glyph: `⚠`, `✓`, `↻`.
- `{components.chip-success}` / `{components.chip-warning}` / `{components.chip-neutral}` — Pill shape, semantic-tinted background, semantic-tinted text. Used in the week-summary card (`3 klidné dny`, `2 zhoršené`, `21 jídel`, `6 fotek`).

### Photo Components

- `{components.photo-thumb}` — Generic full-bleed photo placeholder, 1:1 aspect, brand-tinted gradient until real photo loads. 8px corners.
- `{components.photo-thumb-evidence}` — 28×28 inline thumb with 1px hairline border, sits at the end of an evidence row.
- A photo carries a severity dot in the top-right (`w-2 h-2 rounded-full` in sev-N color, 1px white ring) when the photo represents a documented skin state.

### Bottom Navigation

> **Prototype-only since the descaling (PRD #623).** The shipped app has no bottom nav bar — `Týden` parked, leaving a one-destination bar beside a FAB, so the bar was removed and the FAB became a floating button (`fixed right-5 bottom-6 z-50`). The tokens below still describe `docs/design/redesign-prototype.html`, which depicts the pre-descaling screens. Don't reintroduce a nav bar from this section.

- `{components.bottom-nav-2col}` — Two-column grid (Dnes / Týden), no FAB. Active item uses `{components.nav-item-active}` — wine text, weight 600. Inactive uses `{components.nav-item-inactive}` — muted text, weight 400. Each item: 22×22 SVG icon above 10px label.
- `{components.bottom-nav-3col-fab}` — Three-column grid: nav · FAB · nav. The FAB is positioned with `-mt-7` to lift above the nav baseline. Used on `Dnes` (where input is the primary action). Optional 4px ring on first-launch / empty state to invite first tap.
- `{components.fab-primary}` — 56×56px, full-rounded, primary fill, white plus glyph. Standard FAB.
- `{components.fab-primary-onboard}` — Same FAB with a 4px primary-at-20%-alpha ring, used only when the screen is empty and the FAB is the next action.

### Week Strip

- 7-column grid; each cell is `{components.week-strip-cell}`. Day-letter at 10px uppercase + day-number at 14px weight 600 + a 6×6 sev-N dot below.
- The current day uses `{components.week-strip-cell-today}` — primary fill, white text. If today's data is **not yet recorded**, the dot below is hollow (`bg-white/30 ring-1 ring-white`) — a quiet "still waiting on you" signal.

### Meal Row

- `{components.meal-row}` — Horizontal: 32×32 avatar · meal name (14px weight 500) · meta line (11px muted) · optional trailing icon.
- `{components.meal-avatar}` — 32×32 full-rounded, success-tinted background, success-tinted single-character label (`S` snídaně, `O` oběd, `SV` svačina, `V` večeře).

### Program Strip

- `{components.program-strip}` — Single-row meta + 4px progress bar. Sits beneath the week strip on `Dnes`, and also at the top of `Týden` as context.
- Format: `Eliminace mléčných · Den 12 / 28` left, `›` right, then a 4px track with primary fill.
- This is the **only** place in the system where a long-running phase appears as inline chrome. Everywhere else (e.g., the `/program` page), the phase is full-card content.

### Document Chrome (Outside the Phone)

- `{components.document-eyebrow}` — Top-of-page label like `Atopic Helper · Redesign` — uppercase, monospace, muted, +0.4px tracking.
- `{components.frame-tag-annotation}` — `▸ DNES` style annotation that sits **directly above each phone**. Monospace 10px / weight 500 / +0.8px tracking / muted color.
- The frame-tag and the eyebrow are the only **monospace** elements in the entire system. Their job is to mark "this is design documentation, not the app".

## Voice & Content

### Tone

- **Editorial, not dashboard.** Insights are framed as short articles: *type → claim → body → evidence → nuance*. They are not labeled tiles.
- **Falsifiable, not authoritative.** Every claim shows the cases that support it AND the cases that contradict it (the dimmed exception row in evidence). The user is being trusted to evaluate, not told what to believe.
- **Czech-first.** All in-product copy is Czech. English appears only in code, file names, and design-doc captions.

### Vocabulary

The system uses a fixed severity vocabulary mapped to the 5-point scale:

| Sev | Czech | English (notes only) |
|---|---|---|
| 1 | klidná | calm |
| 2 | mírná | mild |
| 3 | podrážděná | irritated |
| 4 | zhoršená | worsened |
| 5 | akutní | acute |

These words are never substituted (no `okay / fine / bad / very bad`). The user trains on this vocabulary, and the system honors it.

### Date Format

- Czech: `5. 5.` (day, period, non-breaking space, month, period).
- Range: `1. – 4. května` (with day names spelled out only at the document chrome level).
- ISO dates are not used in UI copy.

### Primary CTA Verbs

The single primary CTA per screen carries the wine-rose accent. Its verb signals whether pressing it **commits data** or just **closes the session**. The four verbs below cover every primary CTA in the app — do not introduce new ones.

| Verb | Meaning | When to use | Example screens |
|---|---|---|---|
| **`Uložit`** | **Single-commit save.** Without pressing it, the user's input is lost. Modal / blocking semantics. | One-shot decision per session (status, score, evaluation). May add object: `Uložit hodnocení`, `Uložit stav`, `Uložit změny`, `Uložit {jídlo}`. | Stav kůže · Vyhodnocení testu · Přidat jídlo |
| **`Hotovo`** | **Session closure.** Data is already autosaved per-action; the button only returns to the caller. | Builder / list / multi-item editor where each tap persists immediately. Optionally suffix with count: `Hotovo · 3 položky`. | Onboarding final step |
| **`Pokračovat`** / **`Další`** | **Flow navigation.** Moves to the next step of a wizard. Not a commit. | Multi-step flows (onboarding). Prefer `Další` for short wizards; `Pokračovat` only when the next step is conceptually distinct. | Onboarding intermediate steps |
| **`Potvrdit X`** | **Explicit acknowledgment.** Reserved for irreversible or high-stakes confirmations. Always carries the object: `Potvrdit datum`, `Potvrdit smazání`. | Date pickers, destructive actions. | Date selector |

**Rules:**

1. Choose by data semantics, not aesthetics. If the screen autosaves per tap, use `Hotovo` even if it feels less weighty — `Uložit` would be a lie.
2. Disabled state: same label, muted background (`#D4CBCC` bg, `#7A6468` text). Never change the verb based on enabled state.
3. Object suffix (`Uložit hodnocení`, `Hotovo · 3 položky`, `Potvrdit datum`) is allowed and encouraged when it adds clarity. Keep ≤24 characters total.
4. Never combine: no `Uložit a pokračovat`, no `Hotovo · uložit`. One semantic per CTA.

## Examples (Reference Compositions)

> **The three compositions below describe `docs/design/redesign-prototype.html`, not the shipped app.** Since the descaling (PRD #623) the app has no program strip, no `Týden` screen and no bottom nav; the day view is header + day strip + skin card + meal cards + floating FAB.

### Composition 1 — `Dnes` (filled state)

A 320×680 device. Inside, top to bottom:
1. Status bar (52px, `9:41 ●●● ◐`).
2. Header row: `Pondělí · 5. května` eyebrow + `Dnes` 24/700 heading; right-aligned 20×20 cog icon.
3. Week strip (7 cells, today filled wine, others muted with sev dots).
4. Program strip (`Eliminace mléčných · Den 12 / 28` + 4px progress).
5. Stav ekzému card — white, 16px corners, sev-3 dot + label + `upravit` button.
6. Dnešní jídla card — divided rows, success-avatar each.
7. Bottom nav (3-col with FAB).

### Composition 2 — `Dnes` (empty state, morning)

Same layout as Composition 1, but cards 5 and 6 use `{components.card-empty-state}` and `{components.card-empty-cta}`. Status bar shows `7:12`. The week-strip "today" cell shows a hollow ring instead of a filled dot. The FAB carries a 4px ring to invite first-tap. A 14×14 chevron + "Klepni na **+** a vyber: foto · jídlo · stav" hint sits between the empty cards and the nav.

### Composition 3 — `Týden`

Same device frame; inside:
1. Header: `29. 4. – 5. 5. · Eliška, 4 měsíce` eyebrow + `Týden` heading.
2. Program strip (now repeated as context).
3. Week-summary card — narrative line + 4 chips.
4. Souvislosti eyebrow + count.
5. **Three insight cards in sequence** — trigger / progress / pattern. Each header uses its semantic tint; each body adapts visualization to the pattern type.
6. Photo gallery strip (horizontal scroll, 56×56 thumbs).
7. Bottom nav (2-col, no FAB — Týden is read-only).

## Alignment Checklist (for Reusing This System)

When pulling a new screen into this system, verify:

1. **Canvas**: page background is `{colors.canvas}` #E8E4E5. Not white, not pure surface.
2. **Phone shell**: black bezel 44px / inner screen 34px / 10px padding / drop shadow as specified. No white "slab phone" without a bezel.
3. **Frame tag**: every phone is annotated with `▸ NAME` in monospace 10px / +0.8px tracking / muted color, sitting 8px above the bezel.
4. **Status bar**: 52px, 28px gutters, `9:41` + `●●● ◐`. No emoji battery (`🔋`).
5. **Bottom nav**: SVG icons at 22×22 with `stroke-width=2`, never emoji. Active state in primary wine.
6. **Cards**: white fill, 1px `{colors.surface-dark}` hairline, 16px corners (`{rounded.xl}`), 16px padding.
7. **Eyebrows**: uppercase, +0.6px tracking, 12px / weight 600, ink-muted color. Not bold body text.
8. **Insight cards**: tinted header strip + white body. Header tint = 8% alpha; tag pill = 15–20% alpha.
9. **Severity colors**: only on skin-state representations. Not on chips that mean something else.
10. **Mono**: only on document chrome (frame tags, version eyebrow). Never inside the simulated app screen.
11. **Dates**: Czech format `5. 5.` with non-breaking spaces. Day-letters `Po Út St Čt Pá So Ne` always two-character.
12. **Empty states**: dashed border (default empty) or primary-tinted dashed border (empty-CTA). Never solid borders for empty states.
13. **Task tiles in `Dnes udělej`**: pending tiles use `{components.task-tile-pending}` (neutral white + hairline) — never primary-dashed, never warning-tinted. Done tiles use `{components.task-tile-done}` (success-tinted). All three tiles in the row share one geometry; only state changes color.

A screen is "in-system" when **all thirteen** are satisfied.

**Before implementing any new UI element**, also apply the Component Reuse & Extraction Rule in `AGENTS.md → Design System`: check `src/lib/components/` first; extract to a named component before use if the element is not a one-off singleton.

**Snippet before component:** If a repeated template block is file-local (used only within one `.svelte` file), prefer a `{#snippet}` over a new component. Only extract a component when the pattern appears in more than one file or has independent test value.
