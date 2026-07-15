# 0026 — LLM as schedule proposer (code core + LLM proposer)

## Overview

The plan engine today is plain, predictable code: given the history, it computes the same schedule every time. Some future features — reading free-text notes, weighing fuzzy combinations of meals, skin, and outside events — are exactly the things rules struggle with and an AI is genuinely good at. This decision settles where an AI is allowed to sit: *above* the engine, as an advisor that produces *proposals*.

The line that must never be crossed: the AI never changes your data. It suggests; the plain, deterministic engine is the only thing that writes, and every actual change stays local, offline, and reproducible. The AI can be wrong, or simply unavailable, and the app still works — reading your data, logging, and every routine change happen with no network at all, and only generating a fresh suggestion needs to go online.

This keeps the trustworthy, offline core intact while letting the app get smarter at the edges. It's designed but not yet built.

---

**Status:** Accepted design — not yet implemented; build tracked in [PRD #423](https://github.com/jirigrill/eczema-helper/issues/423).
**Date:** 2026-07-05
**Source:** [Program Engine Shape audit](../research/program-engine-shape.md) §3, §6 #3/#4/#5/#6, §5 sequence #4.
**Amends:** [ADR-0001](0001-single-device-v1.md) (introduces a stateless BFF; "no server" → "no server *holding user data*").
**Gated by:** [ADR-0024](0024-medical-scope-boundary.md) (scope-gate ahead of the proposer).
**Builds on:** [ADR-0016](0016-verdict-drives-schedule-not-status.md) (audit-fact precedent), [ADR-0023](0023-dose-escalation-ladder.md) (ladder moves), [ADR-0025](0025-event-domain-model.md) (trigger kinds), the Dexie-persistence and presentation-strings conventions (now in CONTEXT.md / code-standards.md).

## Context

The program engine is pure and deterministic today
(`generateSchedule → insertRestDays / applyReintroductionVerdict →
getAllergenStatuses`, all topology-derived per ADR-0016). Feature directions F2–F4
need contextual adaptation — reasoning over fuzzy input (free-text events),
combining weak signals (meals + skin + events) no single rule captures. The audit
concluded this is where an LLM earns its keep, and settled where it may sit without
destroying the deterministic core's value.

## Decision

**Shape = code core + LLM proposer. The pure engine is untouched; the LLM sits
*above* it as an application service that emits proposals. The engine writes; the
LLM never does.**

### Spine invariant

- The LLM **never writes domain state** — it emits proposals; the pure engine
  writes.
- Every mutation is **local, deterministic, offline**, regardless of whether its
  proposal originated online.
- The LLM is **never on the input path for authoritative state.**
- It reads authoritative state **only via PII-stripped derived projections.**

"Facts in through the front door; judgment in through a reviewed side door."

### Seam — `ScheduleProposal`

A pure `ScheduleProposal` discriminated union at the application-service boundary.
**Closed vocabulary**; variants map 1:1 to existing pure mutations
(`insertRestDays`, `applyReintroductionVerdict`, `addTrainingPhase`,
`appendReTestPhases`, `removeReTestPhase`) + ladder moves (ADR-0023). The LLM's
freedom is *which protocol-legal move, when, with what Czech rationale* — nothing
more. Rejected: LLM inside the pure engine (destroys determinism; "domain code
that talks to a network is not domain code") and a "smart repository" below it
(hides the mutation vocabulary, clouds the ADR-0016 audit trail).

### Projection = redaction boundary

The proposer consumes a derived **allergen-exposure projection**
`{ allergenId, portion, date, actor }[]` (resolved client-side via the catalog),
**never raw `Meal` records**; skin → a severity series (not free-text notes);
schedule → phase context. Custom `other:*` foods (empty `allergenIds`) drop out of
the projection, so their embedded free text never crosses. **Shape A never sends
photos** (ADR-0005 spirit intact). Only deliberate F2 symptom text crosses as free
text. The projection **is** the redaction boundary.

### Trigger taxonomy

A proposal's cause is a two-kind `trigger`, **not** a mandatory Event FK:

- **`event`** — user-logged flu / teething / vaccination; FKs the Event row
  (ADR-0025).
- **`derived-signal`** — the engine's read of **meals + skin observations** over a
  window (its evaluation *is* the trigger); covers both the cadence dose-nudge and
  the flare-up detector (same thing, different window). Carries the **basis** it
  evaluated, for audit reproducibility.

**Spine constraint (hard):** a `derived-signal` yields a **proposal the mother
confirms**, *never* an auto-verdict — ADR-0016 keeps the reaction verdict
parent-attributed. Consequence (safer escalation): the dose-nudge folds skin in —
"3 days since last dose **and** skin calm → suggest bump" — so an
exposure-increasing move checks the baby is not already flaring.

### Validator — deep, reusing engine legality

Before any suggestion applies it must pass the **same protocol-legality checks the
pure engine already guarantees for its own mutations** — "would the engine accept
this as a legal schedule state? if not, reject before it touches anything."
Shape-only validation is rejected (lets rule-breaking suggestions reach the human).
The deterministic validator is the real safety net; the AI "being careful" is not.
Example catches: one-step-at-a-time ladder advance, no touching permanent
eliminations, min rest length, min elimination window.

### Apply axis — exposure direction, not reversibility

The app must **carry** decisions — the mother opens it *because* she is unsure — so
the apply split is by **whether the change increases the baby's allergen
exposure**:

- **Cautious-direction** (pause / rest / hold / revert-to-safe) → app applies,
  notifies, offers undo; no approval. Wrong-case = a few extra safe days =
  harmless.
- **Exposure-increasing** (raise a dose, start a reintroduction) → app does **all**
  the reasoning and **directs** it ("Zvyšte dnes vejce — proč: … [Rozumím]") with a
  **one-tap confirm**. Wrong-case = more allergen than the baby is ready for = real
  harm; the tap doubles as "yes, I fed it" (data the app cannot observe).

Pure notifications / reminders change nothing the baby experiences → off this axis,
no approval. The deep validator gates *legality* before **either** path.

### Staleness — designed out

**Suggestions are never held pending.** Generate → approve/reject in the same
moment against the current plan → apply-or-not → log to history. No pending
lifetime ⇒ no staleness.

- **Offline:** store the event only; generation is deferred to the next online
  session, producing a *fresh* suggestion.
- **Idempotency:** mark-applied-once guards double-tap; duplicate generation is
  moot (generate + decide is one step).

### Audit table + versioning

A `proposals` Dexie table extends the ADR-0016 audit-fact precedent: immutable
append, **write-only, never read by any schedule derivation** (topology stays the
truth), and it **stores rejected proposals too** (highest-value
prompt-improvement signal). Each row records
`{ trigger, proposal, rationale, disposition, timestamp, promptVersion, modelId }`.

**Pin an explicit `modelId` in the BFF — never "latest"** — and record
`promptVersion` + exact `modelId` on every row. "Use latest" breaks reproducibility
(can't recreate an old suggestion) and stability (behavior drifts on Anthropic's
release schedule, not yours). Distinct from the Anthropic Console `prompt_version`
*metadata* (Console clustering); this is on the *persisted audit row*.

### Infrastructure — stateless edge BFF (amends ADR-0001)

- **Edge-function BFF**, stateless, holds prompt + schema + key, receives
  **client-redacted** structured payloads. Storage bindings *not provisioned*.
  Rejected: on-device model (reasoning-quality + hostile iOS-PWA runtime), direct
  API from client (key leak), full BFF (owns uptime the edge gives free).
- **Client-side redaction** — the client is the data owner's device, not an
  adversary; client redaction keeps PII off *your* infra (BFF PII-free in transit
  and at rest).
- **Endpoint-abuse protection (required, edge-side):** an account-less proxy to a
  paid key is otherwise open. Origin allowlist, per-`device_id` rate limiting,
  lightweight attestation (e.g. Turnstile), and a hard **spend cap / budget alarm**.
- **Model choice is config, not architecture:** pin a cheap/fast model (e.g. Haiku)
  first; upgrade (e.g. Sonnet) only if confound reasoning proves weak — a one-line
  BFF change, seam unaffected.

This amends ADR-0001: "no server" becomes "no server *holding user data*";
connectivity becomes **operation-tiered** (Tier 0 reads / deterministic mutations /
event logging / export always offline; Tier 1 proposal *generation* online; Tier 2
Shape B online-only, future).

### Generated Czech rationale — ADR-0014 edge case

Proposal `rationale` is generated per-instance Czech prose — an ADR-0014 edge case
(not keyable strings-layer text). The prompt emits Czech; the whole F2 loop runs in
Czech; the prose is explanatory, never prescriptive (ADR-0024 C).

## Consequences

- New `proposals` + ladder-override tables (ADR-0006), added to the export
  snapshot (the encrypted export, tracked in [#438](https://github.com/jirigrill/eczema-helper/issues/438)).
- ADR-0001 is amended (BFF, tiered connectivity, endpoint-abuse protection).
- `ScheduleProposal`, the spine invariant, the allergen-exposure projection, the
  `trigger` union + `derived-signal`, and the **exposure-increasing vs
  cautious-direction** axis become `CONTEXT.md` / `UBIQUITOUS_LANGUAGE.md` terms.
- **Extensibility check:** "engine notices flare-ups and proactively suggests
  adjustment" slots in as a new `derived-signal` trigger source (pattern-detector
  port) + the existing seam + existing `rationale` field — no domain rework.

### Deferred (future, not dropped)

- **Eval harness** — golden fixtures, regression-on-prompt-change, acceptance-rate
  loop mining `proposals` rejections. Early: single dogfooder eyeballs suggestions
  and saves bad ones as fixtures.
- **Pending-suggestion queue / approve-later** + targeted staleness handling —
  build only if approve-later is ever wanted; likely never (non-urgent
  suggestions, home wifi, single user).
- **Auto-evaluated verdicts** — the engine confirming the reaction verdict itself,
  not just proposing; requires a deliberate ADR-0016 revision (drops the
  parent-attribution mandate). The seam is built to allow it (the confirm step
  becomes optional later). **Out of scope for the initial proposer build.**
