# 0004 — Causation is derived, not recorded

## Overview

When the mother notices the baby's skin flaring, it's tempting to let her tag a day with "I think it was the dairy." We deliberately don't. She records only what actually happened — what she ate, how the skin looked, and the verdict at the end of a reintroduction test. The app is what looks for the culprit: it compares those honest records and surfaces patterns like "after dairy days, skin was worse in 3 of 4 cases," including the counter-examples.

Why keep the parent out of the guessing? A tired parent's in-the-moment hunch is often wrong, and once it's written down it quietly biases everything recorded after it. Keeping the ground truth free of guesses means the app's later reasoning has clean data to work from. Practically: there is no "suspected cause" field anywhere in the app, and no one should add one.

---

**Status:** Accepted
**Date:** 2026-05-11
**Amended:** 2026-06-22 — `SkinObservation` shape replaced with per-region severities (see ADR-0021 (now in CONTEXT.md)). The "user records only ground truth, app derives patterns" decision is unchanged; only the *shape* of the ground truth changed.

## Context

A daily skin observation in the prototype carries: ~~status (improved /
unchanged / worsened / new-lesions)~~ a set of per-region severities on a
four-step absolute scale (klidné / mírné / střední / silné), optional
free-text notes, optional photo. It does *not* carry a "suspected cause"
field, and the prototype deliberately uses the same form shape on ordinary
days and reintro-test days (`docs/design/redesign-prototype.html:2640–2700`,
`src/routes/skin-prototype/+page.svelte`).

Causal reasoning lives in two other places:

- **End-of-phase reintro verdict** — at the close of a reintro test, the
  user picks one of four allergen-attributed outcomes (Toleruje, Mírná
  reakce, Jasná reakce, Silná reakce). The app may pre-suggest one based
  on the daily observations during the phase; it does not auto-select.
- **Derived insight cards** — the "Souvislosti" panel surfaces computed
  patterns across `(Meal, SkinObservation)` pairs, e.g. "After dairy
  days, skin was worsened in 3 of 4 cases, reaction within 24 hours,"
  including counter-examples.

Three shapes were considered:

- **(a)** App does not reason about causation; daily logs are a journal.
- **(b)** The user records their hypothesis per bad day (e.g.
  `suspectedCause`).
- **(c)** The user records only ground truth; the app derives patterns.

## Decision

**(c).** The user records only what they observe:

- What was eaten (`Meal`).
- What the skin looks like today (`SkinObservation`: per-region
  severities on a four-step scale, optional notes, optional photo —
  see ADR-0021 for the shape).
- The allergen verdict at the end of a reintro phase
  (`ReintroductionEvaluation`).

Causation lives only in derived insights — a pattern detector computes
them over the user's logs. Insights are not user input; they are a
query result and may be regenerated on demand.

## Consequences

- `SkinObservation` does not gain a `suspectedCause` field. Bad-day
  logging stays low-friction: tap the affected regions and their
  severity, optionally jot a note, optionally take a photo. The same
  form on every day.
- A new domain concept `Insight` is introduced as **derived data**: a
  pure function `insights(meals, assessments, schedule) → Insight[]`.
  Insights are not persisted as records to be edited; they are
  recomputed whenever the underlying logs change. Persisting their
  rendering (e.g. dismissed / pinned) is a UI-state concern, not a
  domain concern.
- Parents are unreliable causal narrators under sleep deprivation. By
  refusing to record their guess, the app avoids capturing noise that
  would then bias future insights.
- The pattern detector becomes a first-class piece of the domain layer.
  Its rules (what counts as a "strong pattern", how many co-occurrences
  before surfacing, how to detect exceptions like 3. 5.) belong in
  `lib/domain/` and need tests.
- The end-of-phase verdict (`ReintroductionEvaluation`) remains the
  only place where the user explicitly attributes a reaction to an
  allergen — and even there, the app suggests the verdict from the
  daily observations, the user only confirms.
