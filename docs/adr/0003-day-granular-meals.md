# 0003 — Meals are day-granular, not hour-granular

**Status:** Accepted
**Date:** 2026-05-11

## Context

The existing `Meal` model in `src/lib/domain/models.ts` carries `date:
ISO date` plus `savedAt: HH:MM` — a time without a date. That is broken
two ways: a meal eaten at 23:50 and saved at 00:05 is misleading, and
the model conflates "when I ate this" with "when I tapped save."

A real elimination-diet protocol could in principle care about
hour-level timing — breastmilk allergen transit is roughly 2–6 hours.
But the rest of the codebase already operates at day granularity:
`SchedulePhase`, `DailyAssessment`, and `ReintroductionEvaluation` are
all date-keyed.

Three shapes considered:

- **(a)** one full `eatenAt: ISO datetime` (lose save-vs-eat distinction)
- **(b)** two timestamps: `eatenAt` + `loggedAt` (most precise; demands a
  time-picker on every log)
- **(c)** `date` + `mealType: breakfast|lunch|snack|dinner` only, plus
  system-stamped `createdAt` / `updatedAt` for audit

## Decision

`Meal` is keyed by `date: ISO date` and `mealType`. There are no
user-facing timestamps. The system stamps `createdAt` and `updatedAt`
automatically for export integrity and future "edited" badges, but the
user never sees nor sets them.

## Decision (amendment — 2026-05-27)

**One `Meal` per `(date, mealType)` slot.** A given date + meal-type pair
maps to exactly one `Meal` record, upserted on commit. `Meal.id` is a
deterministic composite key `"${date}:${mealType}"` (e.g.
`"2026-05-27:lunch"`) rather than a random UUID.

The user assembles a basket of items in-memory; the basket commits to
Dexie as a single `put()` when the user taps "Hotovo" or switches the
meal-type pill (silent autosave). The pill-switch only commits if the
current basket is non-empty.

**Why one per slot, not multiple:** the elimination protocol reasons at
meal-type granularity ("had dairy at lunch") — multiple records per slot
would require the UI to merge or pick the "canonical" one when computing
the today view and day detail. The composite ID eliminates the need for a
compound unique index in Dexie and keeps query code simple.

## Consequences

- Reaction-attribution operates at day granularity. The app cannot say
  "you ate dairy at 22:00 and the baby flared at 02:00 — 4-hour window."
  It can only say "dairy on day N, flare on day N+1."
- The UI never asks for a time. A sleep-deprived parent's logging cost
  drops to: pick category, pick portion, save. No clock-spinner.
- If hour-level precision later turns out to matter (a possibility the
  user can challenge with real protocol observations), upgrading is
  additive: add `eatenAt?: ISO datetime` as an optional field, keep the
  existing date-keyed code path working.
- The current `savedAt: HH:MM` field is removed and replaced with
  `createdAt: ISO datetime`. Any prototype data that uses it must be
  migrated or discarded — there is no production data yet, so this is a
  code-only change.
- Re-opening meal-add for an existing slot loads that slot's items into
  the basket. "Hotovo" overwrites the record via `put()`.
