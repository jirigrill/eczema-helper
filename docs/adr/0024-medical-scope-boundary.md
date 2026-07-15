# 0024 — Medical-scope boundary & red-flag escalation

## Overview

This app helps with one thing: skin eczema and the elimination diet that manages it. But a parent will sometimes type something that isn't that — "swollen lips and wheezing after egg" is a possible medical emergency, not a diet-tuning question. The rule here is to notice such input just enough to *stop* the normal flow and point the parent toward real medical care — and never to diagnose, name a condition, or treat.

We deliberately reject both extremes: a system that actively tries to detect medical conditions (which would turn the app into a regulated medical device and carry serious liability), and a naive logger that would answer "swollen lips" with a schedule tweak (which trivializes real danger). The app's competence is defined positively — eczema and its diet — and anything clearly outside that, or clearly alarming, triggers a stop-and-redirect.

This boundary has to be settled *before* any feature that lets an AI read free-text symptoms is built — safety before capability — which is why it stands as its own decision even though the feature itself isn't built yet.

---

**Status:** Accepted design — not yet implemented; build tracked in [PRD #422](https://github.com/jirigrill/eczema-helper/issues/422). Regulatory classification pending external counsel — hard gate before any non-dogfooder user.
**Date:** 2026-07-05
**Source:** [Program Engine Shape audit](../research/program-engine-shape.md) §3, §6 #1, §5 sequence #2.
**Relates to:** [ADR-0026](0026-llm-schedule-proposer.md) (the proposer this gates), [ADR-0016](0016-verdict-drives-schedule-not-status.md) (verdict stays parent-attributed), [ADR-0025](0025-event-domain-model.md) (event schema as a safety control).

## Context

Once free-text symptom input (F2) reaches an LLM proposer, a parent may type
something that is not an eczema-protocol matter but a medical emergency —
"swollen lips and wheezing after egg." An app that answers such input with a
*schedule tweak* both trivializes danger and edges into diagnosis. This must be
settled **before any prompt is written** — safety before capability — hence its
place ahead of the proposer ADR in the sequence.

## Decision

**Posture 3 — detect-to-refuse-and-redirect.** Detect alarming / out-of-scope
input only enough to STOP the normal flow and REDIRECT to human care. Never
diagnose, name a condition, or treat.

Rejected: (1) active-detector (maximum MDR / liability exposure) and (2)
pure-logger (trivializes alarming input by proposing schedule tweaks in response).

### Competence boundary — positive, not enumerated

The app has **one competence: skin eczema + its elimination protocol** (including
parent-reported reintroduction reactions, *even non-skin ones*, as protocol
outcomes). Assessment scope is **closed** to that domain; non-competence input is
context-at-most, never assessed. **Acute-danger input of any body system** trips
refuse-and-redirect regardless of scope.

The trip line is **acuity / danger, not body-system**:

- "hives + fussy after egg" → in-scope protocol reaction.
- "swollen lips + wheezing after egg" → out-of-scope acute → redirect.

Framing is **positive competence** (define the one thing assessed), not **negative
enumeration** (list every danger) — more robust and auditable; the
closed-vocabulary idea applied to assessment *scope*. This is a candidate
`CONTEXT.md` invariant.

### Detector = (c)-lite

- **LLM primary** — positive-scope enforcement, negation and phrasing precision.
- **Thin, high-acuity-only deterministic floor** — a small curated stem list
  (breathing / lips-swelling / unconscious / cyanosis) that **over-triggers by
  design**, runs offline.
- **Fail-safe asymmetry: either layer may RAISE a redirect; neither may SUPPRESS
  the other's.**

Rejected (a) deterministic-only (leaky Czech morphology, no negation) and (b)
LLM-only (life-safety with a connectivity dependency; offline-silent for the
*under-reacting* parent who logs "trochu sípe, je to reakce?" as a routine note).
(c)-lite covers the worst offline slice at a fraction of a full deterministic
detector's build + medical-maintenance cost.

### Timing — two checks at two times

The scope-gate is not one gate at one moment:

- **Log-time (always, offline-capable):** the deterministic high-acuity stem floor
  runs **synchronously the instant F2 text is saved** — local, no network,
  over-triggers by design. A hit fires the standing call-155 emergency affordance
  **immediately, regardless of connectivity.** This is the life-safety path; it
  never waits for generation.
- **Generation-time (online):** the LLM scope verdict runs when proposal
  generation runs — the *non-acute* discrimination (protocol reaction vs redirect)
  plus a second acuity pass on what the floor missed.

Fail-safe asymmetry holds across *time*, not just layers. **Accepted residual:** an
under-reacting parent + novel offline phrasing not on the stem list is backstopped
by the standing, always-visible call-155 affordance. Rejected: blocking offline F2
entry (breaks Tier-0 logging) and an on-device model (cost disproportionate to a
rare overlap).

### Gate architecture

- **A — the safety gate is a pre-filter AHEAD of the proposer**, returning a scope
  verdict `in-scope | out-of-scope-acute | out-of-scope-nonacute` — **NOT** a
  `ScheduleProposal` variant. Only `in-scope` reaches the proposer. The escape
  hatch is a *higher gate*, not a widened proposal vocabulary → safety and
  scheduling stay orthogonal and independently auditable. The proposer keeps a
  refuse *backstop* in-prompt (defense-in-depth). Two redirect flavors:
  **emergency** (acute → call 155) vs **scope** (non-acute non-eczema →
  pediatrician).
- **C — generated prose is explanatory, never prescriptive** ("protokol
  navrhuje… protože…", never "snižte dávku") + a standing "nejsme lékařský
  nástroj" disclaimer. Bounds the ADR-0014-edge generated text away from medical
  advice.
- **D — escalate first; LOG the datum; suppress only the PROPOSER, not the
  record.** An acute reaction to a reintroduced allergen IS the `severe-reaction`
  signal driving the safe mutation (rest → `reacted` → no auto-retest) and is what
  the redirected-to doctor needs. The app stores the parent's **raw report +
  context + "flagged urgent / redirected"**; it does **not** auto-set the
  `severe-reaction` verdict — that stays parent-attributed per ADR-0016, confirmed
  later, calmly. Storing raw words ≠ diagnosing.

### B — Regulatory (flagged, NOT decided here — needs external counsel)

EU MDR classification and whether generated Czech rationale constitutes "medical
advice" are **legal determinations**, not engineering ones. The design mitigations
above (posture 3, positive-competence boundary, explanatory-not-prescriptive prose
+ disclaimer, redirect-to-human-care) are the most defensible starting posture;
counsel confirms sufficiency. **Hard gate before any non-dogfooder user.**

## Consequences

- A new pure `scope-verdict` classifier sits ahead of the proposer; the
  deterministic stem floor is a small curated offline list.
- The always-visible call-155 emergency affordance is the passive offline backstop
  and a UI requirement.
- An acute-reaction datum is **logged, not proposed against**. Its *positive home*
  on the reaction path (SkinObservation-with-notes vs a distinct reaction record
  vs rolled into the `severe-reaction` verdict) is an **open reaction-model
  question**, resolved alongside ADR-0025.
- `CONTEXT.md` / `UBIQUITOUS_LANGUAGE.md` gain the **closed-competence-boundary**
  invariant, **scope-verdict**, and a **red-flag / escalation** term.
- External counsel is a release blocker for any non-dogfooder user.
