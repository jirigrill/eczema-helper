# Descaled app — UX & navigation spec

> Resolution asset for wayfinder map #613 (Descale to logging-only), ticket #615.
> Prototype: `docs/design/descaled-nav-615.html` (variant **A** is the settled shape).
> Depends on the inventory (#614) and the actor-split decision (#618).
> **This is a design spec, not an execution plan.** It says what the descaled app looks like;
> the strip itself is handed off.

## Overview

Once the protocol engine parks, the app is a **pure logging tool**: meals (food/time/day/slot,
dual-actor) and skin status with photos. It stays **day-centric** and **day-scoped** — one day at a
time, navigated by the day strip. Everything the protocol contributed to the UI — the second nav
tab, phase framing, eliminated/conflict surfaces, evaluation entry points, the questionnaire —
is removed. What remains is a single surface plus two detail screens.

---

## 1. Navigation shell

**The bottom nav bar is removed entirely.**

Today it is a 3-cell grid: `Dnes` · FAB · `Týden`. `Týden` (`/week`) parks with the protocol
views, which would leave one tab beside a FAB — a bar that navigates nowhere. A bar with a single
destination is not navigation, it is decoration, so it goes.

**Resulting shell:**

| Element | Descaled behaviour |
|---|---|
| Bottom nav bar | **Removed.** `showNav` and its `ctx.status === 'ready'` gate disappear with it. |
| FAB | **Kept**, repositioned as a floating button (bottom-right) since it no longer sits in a bar. Sole global add affordance. |
| Routes | `/day/[date]` (home) · `/meal` · `/skin` · `/settings` · `/` (first run). `/week`, `/program`, `/evaluation` are removed. |
| Detail screens | Unchanged pattern: `/meal`, `/skin`, `/settings` are full-screen with their own back affordance (`isDetailScreen` already suppressed nav for these). |

There is **no second destination.** A standalone all-photos gallery (`Snímky`) was considered and
rejected: photos are reached through the day that owns them. Revisit only if browsing photos
across time becomes a real need.

## 2. Home / today view (`/day/[date]`)

Structure, top to bottom:

1. **Header** — date eyebrow + heading, settings gear on the right. The heading already swaps by
   `isToday`: `Dnes` on today, the formatted date otherwise. **This swap is load-bearing — see §3.**
2. **Day strip** — horizontal day cells, selection drives the page.
3. **Meal slots** — the four `MealCard`s (Snídaně / Oběd / Svačina / Večeře), dual-actor rows per
   #618, chevron into `/meal`, `+` on empty slots.
4. **Skin section** — `SkinObservationCard` + photo thumbnails.

**Removed from this screen:** phase badge + progress bar, the `Vyhýbej se` / eliminated
two-column card, tolerance-building reminder cards, evaluation prompts, the "no program" empty
state pointing at onboarding, and the day-preview ("Naplánováno") card for future days.

### Day strip range

The strip is currently bounded by `protocolStart … estimatedEnd`. With no protocol, **redefine it
as `earliest logged day … today`**, with `today` as the last cell and **no future days**.

Consequences: future days become unreachable rather than read-only, so the `isFutureDay` FAB
suppression in `+layout.svelte` is deleted along with the preview card. On first run, when nothing
is logged, the strip is the single cell `today`.

## 3. Jump to today  *(the decision this ticket turned on)*

Removing the nav bar removes the `Dnes` tab, which was the way to snap the strip back to today
(`pulseRecentreDayStrip()` → `DayStrip.recentre()`).

**Decision: an "↩ Dnes" chip on the header, shown only when off-today.** Tapping it recentres the
strip and navigates to `/day/<today>`. `DayStrip.recentre()` and the signal store survive unchanged;
only the trigger moves from the nav to the header.

**Why this one.** The affordance is meaningless on today, so it *should* be conditional — the goal
is not to avoid conditionality but to avoid inventing a *new* one. The header already swaps
`Dnes` ↔ date on `isToday`; the chip extends that existing conditional, so no new visibility rule
enters the code or the user's model. It also puts the state ("you are on 26. 7.") and its remedy in
the same object.

Build it as an **explicit chip**, not tappable bare text — headings are read, not tapped.

**Rejected:** a permanently docked "Dnes" cell on the strip (duplicates today's cell when today is
in view, and breaks the strip's continuous-timeline reading — see prototype variant `D2`); a
floating pill over the strip (occludes a day, new rule); a mini-pill above the FAB (crowds the FAB,
new rule); a date-picker sheet (over-built for current history depth — a good *later* addition,
hangs off this same header without invalidating the chip); nothing at all (iOS PWA back is an
edge-swipe; "stranded in the past" is a real failure mode).

## 4. Meal logging (`/meal`)

Reached from: an empty slot's `+`, a logged row's `›`, or FAB → Přidat jídlo → meal-type submenu.
Flow and the dual-actor model are **unchanged**.

**Removed:** allergen chips and the eliminated-food surface, conflict detection and its warnings,
the save-with-conflict confirm path, and the `eliminatedToday` plumbing (`meal-editor.svelte.ts`
loses the field, its setter, and the derived conflict getters). The editor becomes a pure
food/portion/preparation/note composer.

## 5. Skin logging (`/skin`)

**Essentially untouched** — it is the least protocol-coupled screen. Status, regions, note, photos,
and the observation timeline all stay.

**Removed:** the out-of-loggable-window `InfoBanner`, its only engine coupling. With the
loggable-window guard cut, any day on the strip is writable.

## 6. FAB / action sheet

The FAB stays; `FabActionSheet` keeps its two rows — **Přidat jídlo** (→ meal-type submenu with
already-logged ✓) and **Přidat stav kůže** — plus Cancel.

**Removed:** the contextual `Vyhodnotit test` fourth row and its `showEvaluate` /
`evaluatePhaseId` props, which existed only for phase-end evaluation.

The FAB writes to the **selected** day, not to today. That is existing behaviour, but see §9.

## 7. First run / onboarding (`/`)

The 5-step questionnaire parks. Steps 3–5 (mother's allergies, baby's confirmed allergies,
summary) are protocol input with nothing to seed in a logging app.

**The descaled first run is a single screen:** short welcome copy + the **feeding-stage picker**
(`breastfed` / `mixed` / `solids`) + a confirm button, which writes `feedingStage` to settings and
lands on `/day/<today>`. Per #618 this is required, not optional: `feedingStage` gates which actor
pills appear via `getEligibleActors`.

Baby birth date is dropped — it lives in `QuestionnaireAnswers`, which parks, and nothing in the
live app reads it once the strip no longer starts at a protocol date (§2).

Feeding stage remains changeable in `/settings`, whose picker stays (with `setFeedingStage`
relocated out of the parked `protocol-session.ts` into the new live settings store, per #618).

### The "is seeded" signal

`+layout.svelte` currently redirects on `ctx.status`: `empty` → `/`, `ready` → `/day/<today>`.
With the schedule gone, **`settings.feedingStage != null` becomes the seeded signal.** Unset →
first-run screen; set → the day view. This also answers the inventory's open caveat that
`resolveDay` needs a live replacement for `rawStore.current`.

## 8. Summary of UI surfaces removed

| Surface | Fate |
|---|---|
| `/week`, `/program`, `/evaluation` | Removed (park) |
| Bottom nav bar + `Týden` tab | Removed |
| Onboarding steps 3–5 (allergies, summary) | Removed (park) |
| Phase badge, progress bar | Removed (park) |
| `Vyhýbej se` / eliminated card, conflict UI | Removed (park) |
| Tolerance-building reminders | Removed (park) |
| Evaluation FAB row | Removed (park) |
| Day-preview "Naplánováno" card + future days | Removed |
| Out-of-window skin banner | Removed |

Components parking with them: `PhaseBadge`, `ProgressBar`, `AllergenChip`, `AllergenDrillIn`,
`FamilyGrid`, `FamilyDrillIn`, `QuestionnaireSummaryRow`. `InfoBanner` stays live (still used
elsewhere); `CalendarIcon` and `TrendsIcon` park with the views that used them.

## 9. Flagged for execution — not decided here

- **Wrong-day logging.** The FAB writes to the *selected* day. With phase framing gone the day
  context is thinner than it was, so a mis-log onto a past day is marginally easier. The header
  date (§3) is the signal; a history banner was prototyped (variant `F`) and **not** adopted.
  Revisit only if this shows up in real use — do not pre-build it.
- **One-handed reach.** Day navigation lives at the top of the screen while the mother is likely
  holding a baby. This is a pre-existing property of the day strip, unchanged by descaling, so it is
  out of scope here — but it is the reason to resist scattering day-navigation controls to the
  bottom of the screen piecemeal. If it matters, it deserves its own effort.
