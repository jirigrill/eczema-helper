# 0027 — Dual-actor meals via a mirrored schedule

## Overview

The app now logs meals for two people, not one: the breastfeeding mother and the baby. Once the baby starts eating solids alongside the breast, both eat foods that matter to the elimination diet, so both need their own meal log. This decision records *how* we added the baby without forking the protocol: the baby rides the **same schedule** as the mother — the same phases, the same order, the same allergen eliminated on the same days — and the only per-person difference is each one's own permanent allergies. There is no separate baby ladder and no second schedule generator.

What flips who can log is the **feeding stage**, a single live setting. While the baby is exclusively breastfed, only the mother logs; once mixed feeding starts, both can; once the baby is fully on solids, the baby does. The stage is a live master switch the mother changes from Settings, not a fixed value baked in at onboarding — so the app follows the baby's real transition through the first year. This is deliberately *not* the multi-device, multi-account world ADR-0001 rejected: it is still one phone, one journal. "Single-actor" is retired; "single-device" stands.

---

**Status:** Accepted — implemented.
**Date:** 2026-07-25
**Spec:** [issue #564](https://github.com/jirigrill/eczema-helper/issues/564) (dual-actor meals build hand-off), slices #569–#578.
**Builds on:** [ADR-0001](0001-single-device-v1.md) (single-device; single-*actor* half retired here), [ADR-0023](0023-dose-escalation-ladder.md) (`FeedingStage` as a ladder-stage selector, now also the actor master switch), the commit-gated `/meal` editor (was ADR-0018, now in the decisions log).

## Context

The domain is a breastfeeding elimination diet: the mother eats, allergens transit through breastmilk, the baby reacts (ADR-0001). V1 modelled exactly one actor — the mother — and reserved an `actor` field on `Meal` typed `'mother' | 'baby'` while only ever writing `'mother'`.

That reservation came due. Once the baby eats solids, the baby's own intake is a first-class variable in the same elimination diet, and the mother needs to log it. The open question was the *shape* of the extension:

1. **A second schedule / second ladder for the baby** — the baby introduces solids on its own timeline, with its own reintroduction order and dose ladder, independent of the mother's protocol.
2. **A mirrored schedule** — one protocol timeline governs both actors; the baby simply avoids the same protocol-eliminated allergens on the same days, differing only in its own confirmed permanent allergies.

Option 1 forks the schedule generator, doubles the phase machinery, and asks the mother to reason about two overlapping timelines on one phone. Option 2 reuses everything already built and matches the clinical reality of this protocol: the point of the diet is to find *the family's* triggers, and during elimination both mother and baby avoid the same set.

## Decision

**Meals are dual-actor over a single mirrored schedule. `Actor` is `'mother' | 'baby'`; who may log is governed by the live `FeedingStage` via `getEligibleActors`; there is no second schedule and no second ladder.**

### One schedule, two permanent-elimination sets

`GeneratedSchedule` is unchanged and shared. `ReadyContext` carries three eliminated-set fields kept **separate, never pre-merged**: `protocolEliminated` (actor-independent), `permanentMother`, and `permanentBaby`. Each actor's window is recombined at the point of use by the single helper `eliminatedFor(ctx, actor)`:

- mother → `protocolEliminated ∪ permanentMother`
- baby → `protocolEliminated ∪ permanentBaby`

The protocol portion is identical for both actors on any given day — that is the "mirror." The only divergence is each actor's own permanent allergies. Conflict detection stays actor-aware because the sets are never merged upstream (spec #568).

### FeedingStage is the master switch for "who may log"

`getEligibleActors(stage)` is the single source for which actors may log at the current stage: `breastfed → [mother]`, `mixed → [mother, baby]`, `solids → [baby]`. `FeedingStage` lives in the `settings` Dexie singleton (not on `GeneratedSchedule`, so retest/verdict rebuilds can't overwrite it), is seeded from `answers.feedingStage` at onboarding, and is changeable live from Settings via `settingsStore.setFeedingStage()`. The `/meal` route shows the actor picker only when more than one actor is eligible (i.e. `mixed`); single-actor stages render no picker and log the implicit actor.

### Identity: actor is part of the meal key

`MealId` is the 3-part composite `"${date}:${mealType}:${actor}"`, enforced at the type level and by the Dexie `&id` unique index. A `(date, mealType)` slot therefore holds **up to one meal per actor** — the one-per-slot invariant is now one-per-slot-*per-actor*. Swapping the picker while a draft is dirty autosaves the departing actor's confirmed foods first (the meal-editor store's `swapActor`, issue #571).

### No second ladder

There is deliberately **no** baby-specific reintroduction ladder or baby schedule generator. The reintroduction dose ladder (ADR-0023) already varies its dose steps by `FeedingStage`; that stage-variance is the only baby-specific dosing the model needs. A future baby-only reintroduction path, if ever required, is out of scope and would need its own ADR.

## Consequences

- **ADR-0001 reconciled, not reversed.** Single-*device* still holds — one phone, one journal, no accounts, no sync. Only the "single-*actor*" framing is retired; that title's second adjective no longer describes the app. No multi-device/GDPR-controller reasoning changes.
- **Not-yet-built work is constrained.** The derived-insight engine ([#468](https://github.com/jirigrill/eczema-helper/issues/468)) must pair `(Meal, SkinObservation)` per actor and must not assume every meal is the mother's. The encrypted export/import ([#438](https://github.com/jirigrill/eczema-helper/issues/438)) must round-trip the `actor` dimension of `MealId`. This constraint is why the decision is a numbered ADR rather than a decisions-log line.
- **Migration already shipped.** The composite key change wiped the meal store at Dexie v10 (#574); there is no back-compat path for two-part `MealId`s.
- **Reversal cost.** Backing out to single-actor would mean a second key migration and re-collapsing the three eliminated-set fields — non-trivial once baby meals exist.
