# Program Engine Shape — Grilling Session Audit Trail

**Date:** 2026-07-05
**Method:** `/grill-with-docs` (relentless one-question-at-a-time interview, recommended answer per question)
**Status:** Research complete incl. deep safety/operational grilling (§6). No implementation. Feeds ADRs/PRDs per §5 sequence.
**Durable summary:** `~/.claude` project memory `program-engine-shape.md`.
**Read rule:** §2 logs decisions + rejected alternatives; §3 is the current
architecture; §6 holds the deep safety/operational decisions. Where a later round refined an earlier
call, the earlier text is rewritten to the final decision (no evolution scaffolding).
**ADR/PRD authors quote §3 and §6.**

---

## 1. Original requirements

**Research question (verbatim intent):** Should the program engine (the
"program engine" driving phase/allergen scheduling, `src/lib/domain/schedule-*.ts`)
be **code-driven** (deterministic rules) or **LLM-driven** (prompt/response
orchestration) — or a hybrid, and where does the seam go? Decide the
*architectural shape* to accommodate an evolving feature set long-term. No
concrete APIs/schemas/implementations.

**Illustrative feature direction (NOT exhaustive — design for the class):**
- **F1** — Baseline allergen tolerances: user declares already-accepted allergens
  + portion at program start; influences initial schedule generation.
- **F2** — External events & adjustments: user logs vaccinations, illness,
  teething, weather, pollen; engine reacts (pause new-allergen testing, revert to
  accepted foods, resume after).
- **F3** — Accepted-allergen dose-escalation reminders: continuous dose increases
  once an allergen is accepted.
- **F4** — Reintroduction-phase dose escalation: same shape, during active
  reintroduction.
- **Class characteristics:** contextual adaptation to user state, reaction to
  external/temporal events, long-running personalised nudging; likely future —
  pattern detection, correlation surfacing, NL explanations, adaptive coaching.

**Deliverables requested:** (1) decision matrix F1–F4 + generalisation; (2) engine
shape recommendation; (3) seam definition; (4) offline-first re-evaluation
(ADR-0001 open to revision if it hurts UX); (5) long-term extensibility check;
(6) open questions / new-or-revised ADRs.

**Guardrails:** read CONTEXT.md, ADR-0001/0007/0008 + `schedule.ts` first; no code
writes; flag ADR conflicts (propose revision, don't silently accommodate);
optimise for UX quality, not for preserving prior constraints.

**Starting-state facts (from the code read):** the engine is today pure /
deterministic — `generateSchedule → insertRestDays / applyReintroductionVerdict →
getAllergenStatuses`, all topology-derived (ADR-0016), no display strings on
domain records (ADR-0014). Meals already feed `getToleranceBuildingRemindersForDate`
+ `detectConflicts`, but not `getAllergenStatuses`.

---

## 2. Decision log (chronological)

Each entry: options **proposed** → ✅ **approved** / ❌ **rejected** → rationale.

### Q1 — Which problem shape is primary?
- **Proposed:** Shape A ("make the schedule smarter" — features end in *schedule
  state*: F1–F4 are mutations of `GeneratedSchedule`) vs Shape B ("make the app
  *talk to the mother*" — output is *text/coaching*). Recommended Shape A first.
- ✅ **Approved:** Shape A first. Shape B is the natural progression — "the LLM
  gathers all information, creates insights, serves them to the user."
- **Rationale:** F1–F4 all bottom out in schedule/ladder state, buildable on the
  existing domain layer. Shape B (context assembly, chat, medical-advice safety)
  is a bigger bet that benefits from Shape A's structured output existing first.

### Q2 — "Model-inferred rules": runtime or design-time inference?
- **Proposed:** runtime-LLM (model *is* the rule engine, queried per mutation) vs
  design-time-LLM (model helps *author* rules, ship as deterministic code).
  Recommended design-time for v1.1, runtime later.
- ❌ **This recommendation was challenged and walked back** — see next.

### User challenge — "Is F1–F4 really a finite, enumerable rule set? What about
unknown-unknowns after F4?"
- **Outcome:** the interviewer's "finite rule set → deterministic wins" claim was
  **retracted as an overreach.** Two tangled claims separated: (1) F1–F4 *as
  specified today* are enumerable — true; (2) therefore deterministic code handles
  them and successors indefinitely — false. The unknown-unknowns cost is
  asymmetric (deterministic: every new event = code+ADR+deploy; LLM: type the
  event name, model has priors). The real value is *combinatorial application of
  known principles to a specific case*, which is where LLM reasoning fits.
- **Revised recommendation:** **code core + LLM proposer**, LLM optional-but-present
  from v1.1.

### Q3 — v1.1a deterministic-only vs v1.1b LLM-proposer-from-day-one?
- **Proposed:** v1.1a (authored rules, offline, add LLM later) vs v1.1b (free-text
  events, LLM proposes, user approves — dogfood the *seam*).
- ✅ **Approved:** **v1.1b.** Commits to a real architecture, not a hypothetical.

### Q4 — Where does the model run?
- **Proposed:** (a) on-device small model, (b) direct Anthropic API from client,
  (c) full BFF, (d) edge-function BFF. Recommended (d).
- ✅ **Approved:** (d) edge-function BFF. *(Detour: clarified "BFF" =
  Backend-For-Frontend, a single-purpose server holding prompt + schema + key.)*
- ❌ **Rejected:** (a) — reasoning-quality risk (3B model struggles on F2's
  "flu vs teething confound"), hostile iOS-PWA runtime. (b) — API-key leak,
  non-starter. (c) — full BFF is overkill for a proxy; owns uptime the edge gives
  free.

### Q5 — BFF stateless or stateful?
- **Proposed:** (a) fully stateless, (b) stateful for observability, (c) stateful
  for sync. Recommended (a).
- ✅ **Approved:** (a) stateless. Storage bindings *not provisioned* (not
  "provisioned but unused").
- ❌ **Rejected:** (b) — logging `{schedule, event, response}` is a real GDPR
  moment (processing an identifiable infant's data); defer until a real user +
  legal basis exists. (c) — a different product; graduate to it with an explicit
  ADR, don't slide in.
- **Sub-thread (prompt debugging under (a)):** confirmed viable — client-side
  Dexie `llm_calls` mirror (un-redacted, delete-on-reset) + **Anthropic Console**
  (30-day window, keyed by pseudonymous `device_id` metadata) + Cloudflare tail
  logs. Cross-user debugging (future) → Anthropic Console suffices for now.

### Q6 — Where does the LLM sit in the domain call graph?
- **Proposed:** (a) inside the pure engine, (b) application service *above* it,
  (c) "smart repository" *below* it. Recommended (b), seam = a pure
  `ScheduleProposal` discriminated union.
- ✅ **Approved:** (b) application service.
- ❌ **Rejected:** (a) — injecting async/fallible/non-deterministic LLM calls into
  the pure engine destroys the property that gives it value; "domain code that
  talks to a network is not domain code." (c) — hides the mutation vocabulary,
  clouds ADR-0016's audit trail, makes "why did the schedule change?" archaeology.
- **Approve vs auto-apply (sub-decision):** ✅ **Approved** — split by **whether the
  change increases the baby's allergen exposure** (detail + rationale in §6 #4):
  cautious-direction (pause / rest / hold / revert-to-safe) auto-applies with notify
  + undo; exposure-increasing (raise dose, start reintroduction) is app-directed with
  a one-tap confirm. The app carries the reasoning either way.
- **User side-note (approved into the design):** there is a **default dose
  escalation ladder per allergen** (deterministic protocol data). The LLM's job is
  proposing *movement on / adjustment of* the ladder, never authoring portions.
  → "menu vs chef": LLM picks among protocol-legal moves; the kitchen refuses
  off-menu orders. Also collapsed **F3 ≡ F4** mechanically (same ladder-walker,
  different phase). *(Interviewer over-designed the ladder schema here; corrected
  back to the architectural essence — closed action vocabulary — on user prompt
  "aren't we derailed?")*

### Q7 — Decision matrix F1–F4.
- **Proposed classification:** F1 pure code, F2 LLM proposer, F3/F4 hybrid
  (deterministic default + LLM overlay). Queried whether F1 input is free-text or
  structured.
- ✅ **Approved:** classification accepted. **F1 = structured** — user selects
  allergen from a list and picks amount from the predefined ladder. No free text,
  no LLM. → confirmed the rule **"LLM is never on the input path for authoritative
  state."**

### Q8 — Offline-first re-evaluation.
- **Proposed:** tiered model (Tier 0 data path offline; Tier 1 proposal path
  online w/ degradation; Tier 2 Shape B online-only). Steel-manned *dropping*
  offline-first (home/doctor venues have wifi; stroller use hypothetical).
- **User challenge:** "Can the program view be Tier-0-offline when the LLM will
  very likely mutate the program?"
- **Outcome — re-tiered by *operation*, not screen:** *read* program = offline;
  *deterministic mutation* = offline; *LLM-proposed mutation* = split (proposal
  **generation** online, proposal **application** offline via the pure engine).
  Surfaced the **spine invariant: the LLM never writes domain state — it emits
  proposals; the pure engine writes; every mutation is a local, deterministic,
  offline op regardless of whether its proposal originated online.**
- ✅ **Approved:** operation-level tiering; **events log offline** (never block the
  hot path on the cold path). ❌ Rejected "F2 blocks the event log until online."
  Proposals are **never held pending** — offline stores only the event; generation is
  deferred to the next online session and yields a fresh suggestion (detail in §6 #3).

### Clarification — "LLM never on the input path for authoritative state."
- Unpacked on request: *authoritative state* (stored source of truth:
  answers/schedule/meals/skin/evaluations/ladder) vs *derived views* (status,
  elimination window, rung — recomputed, never stored) vs *proposals* (advisory,
  non-authoritative until approved). The LLM's output never *becomes* a stored
  authoritative fact directly; it enters only a gated proposal chain (validator →
  human approval → pure apply). F1 (structured input → authoritative state, no LLM)
  vs F2 (LLM → proposal → 3 gates → schedule). "Facts in through the front door;
  judgment in through a reviewed side door."

### PRD-timing (workflow)
- PRD once at end; `/to-prd` synthesises from conversation, so incremental drafts
  are discarded work.
- ADRs before PRD (`ready-for-agent` stamp = build signal; wrong while
  architecture open). Multiple PRDs; ladder first.
- Durable memory checkpoint written (covers the "don't lose work" motive).

### Q9 — Is a proposal an audit fact?
- **Proposed:** a `proposals` table mirroring `evaluations` (ADR-0016 precedent) —
  immutable append, `{triggerEvent, proposal, rationale, disposition, timestamp}`,
  **write-only, never read by any schedule derivation** (topology stays the truth).
- ✅ **Approved** — and ✅ **store rejected proposals too** (highest-value
  prompt-improvement signal; Console can't see the human override). It is an
  *event log*, not a mutation log.
- **Invariant-check resolved:** storing LLM-authored rationale is *not* a spine
  violation — the record is authoritative *as an audit fact about what the LLM
  proposed*, not as domain truth; nothing derives domain state from the table.

### Q10 — Redaction contract.
- ❌ **Interviewer's earlier claim reversed:** Q4/Q6 said "the BFF redacts; don't
  trust the client." **Corrected to client-side redaction** — the client isn't an
  adversary (it's the data owner's device); only client-side redaction keeps PII
  off *your* infra (BFF genuinely PII-free in transit + at rest).
- **Proposed:** client-side redaction; two payload classes — (1) structured =
  domain ids + derived state, dates relativised, no names; (2) F2 free text =
  symptom-scoped field + literal name-scrub (the one place minimised NL crosses).
  Versioned `payload_version`. Anthropic zero-retention DPA before non-dogfooder
  users. Fork: **F2a free text** vs **F2b structured-only dropdown**.
- ✅ **Approved:** client-side redaction **and F2a free text.**
- ❌ **Rejected:** F2b — a dropdown collapses F2 into pure code, undercutting the
  v1.1b decision; the "flu vs teething confound" nuance is F2's reason to exist.

### Consequences surfaced by Q9/Q10.
- **Shape A never sends photos** (proposer reasons over structured state + F2 text,
  never images; multimodal = future Shape B, separate ADR) — keeps ADR-0005's
  spirit intact.
- **Proposal `rationale` is generated Czech prose** — an **ADR-0014 edge case**
  (generated per-instance text, not keyable strings-layer text); prompt must emit
  Czech; the whole F2 loop runs in Czech.
- **Export must enumerate new tables** (`proposals`, ladder overrides) — ADR-0002 /
  slice-6.

### User catch — "Does the engine use meals (mother's, later baby's) as input?"
- **Gap acknowledged** — meals were under-specified (only skin severity was named
  in Q10's payload). **Resolved:** the proposer consumes a derived
  **allergen-exposure projection** `{allergenId, portion, date, actor}[]` (resolved
  client-side via the catalog), **never raw `Meal` records**. Skin → severity
  series (not free-text notes); schedule → phase context.
- **Generalised principle:** *the proposer never sees raw authoritative records,
  only PII-stripped derived projections — the projection IS the redaction boundary.*
  Custom `other:*` foods (empty `allergenIds`) drop out of the projection, so their
  embedded free text never crosses (closes a Q10 hole). Only F2 symptom text
  crosses as deliberate free text.
- Meals are **load-bearing** for F2 confound (food-vs-illness) + F3/F4 ladder
  position; deterministic precedent already exists
  (`getToleranceBuildingRemindersForDate`, `detectConflicts`). Spine-safe (read,
  never write). **Baby-ready:** the projection carries `actor` from day one
  (CONTEXT.md reserves `Meal.actor`); dual-actor is additive.

---

## 3. Settled architecture (summary)

- **Shape:** code core + LLM **proposer** (hybrid). Pure deterministic engine
  (`schedule-builder.ts`) stays sync/pure/untouched; LLM sits *above* it as an
  application service.
- **Seam:** a pure `ScheduleProposal` discriminated union at the
  application-service boundary. Closed vocabulary; variants map 1:1 to existing
  pure mutations + ladder moves. LLM's freedom = which protocol-legal move, when,
  with what (Czech) rationale.
- **Spine invariant:** the LLM never writes domain state; it emits proposals, the
  pure engine writes. Every mutation is local/deterministic/offline. The LLM is
  never on the input path for authoritative state. It reads authoritative state
  only via PII-stripped projections.
- **Medical-scope safety (§6 #1):** app competence is closed to skin eczema
  + its protocol; a **scope-gate** classifies
  `in-scope | out-of-scope-acute | out-of-scope-nonacute` and refuses-and-redirects
  the latter two (never diagnoses). Detector = **(c)-lite** (LLM primary + thin
  high-acuity offline floor, fail-safe: either raises, neither suppresses). Runs as
  **two checks at two times** (§6 #1): a synchronous **deterministic stem floor at
  log-time** (offline-capable, fires call-155 immediately) + the **LLM scope verdict
  at generation-time** (online). Acute input is logged (not proposed-against);
  generated prose is explanatory, never prescriptive. Regulatory classification =
  **counsel hard-gate before any non-dogfooder user.**
- **Auto-apply axis (§6 #4):** not "reversible" — **"does the change increase the
  baby's allergen exposure?"** Cautious-direction (pause/rest/hold/revert-to-safe) →
  app applies + notifies + undo, no approval; exposure-increasing (raise dose, start
  reintroduction) → app decides + directs + **one-tap confirm**. The app carries the
  reasoning either way; the only taps left are exposure-increasing ones.
- **Ladder:** first-class deterministic per-allergen protocol data; current rung
  topology-derived (never persisted). LLM proposes movement/adjustment, never
  portions. **Net-new domain modeling, not a refactor** — no ladder/rung concept
  exists today; `PortionKind` is flat + food-agnostic and may not suffice as the
  rung scale. Rung-derivation from meal-history amounts × ladder
  is whole-new.
- **Persistence:** `proposals` table (audit, write-only, stores rejected) +
  ladder-override table + `events` table; same normalised Dexie pattern (ADR-0006);
  all three added to the export snapshot.
- **Events (§6 #2):** first-class authoritative record, curated-kinds + `other:`
  escape + scoped free-text detail (catalog/harvest pattern). Role = **confounder in
  reaction attribution** (`Event → attribution → verdict → schedule`), not a
  pause-trigger; may also seed a proactive pause. `date`-only (no `endDate`).
- **Trigger taxonomy (§6 #2):** a proposal's cause is a two-kind `trigger` —
  `event` (user-logged flu/teething, FKs the Event row) or `derived-signal` (the
  engine's read of **meals + skin**, carrying the basis it evaluated; covers both
  cadence dose-nudges and flare-up detection). A derived signal yields a **proposal
  the mother confirms, never an auto-verdict** (ADR-0016 keeps the verdict
  parent-attributed). Auto-evaluated verdicts = future ADR-0016 revision, not v1.1.
- **Infra:** edge-function BFF, stateless, holds prompt + schema + key, receives
  client-redacted structured payloads. Debugging via Anthropic Console + client
  Dexie mirror. **Endpoint-abuse protection required** (net-new, edge-side):
  origin allowlist, per-`device_id` rate limiting, lightweight attestation, hard
  spend cap — an account-less proxy to a paid key is otherwise open.
- **Offline (operation-tiered):** Tier 0 (reads, deterministic mutations, event
  logging, export) always offline; Tier 1 (proposal *generation*) online — suggestions
  **decided on generation, never held pending** (§6 #3), so offline stores only the
  event and defers generation; Tier 2 (Shape B) online-only, future.
- **F1–F4 matrix:** F1 pure code (structured picker); F2 LLM proposer (free text);
  F3/F4 deterministic default + LLM overlay (mechanically identical).
- **Generalisation rule:** route to the LLM only when input is fuzzy **and**
  reasoning combines ≥3 weak signals no single rule captures **and** output is a
  closed-vocabulary proposal. Else deterministic. Free-text *output* with no
  mutation → Shape B, deferred.
- **Extensibility check (deliverable 5):** "engine notices flare-ups and
  proactively suggests adjustment" slots in as a new *trigger source*
  (pattern-detector port) + the existing proposal seam + existing `rationale`
  field. No domain rework; new concerns (detector cadence, suppression) are
  application-layer.

---

## 4. Deliverables status

| # | Deliverable | Status |
|---|---|---|
| 1 | Decision matrix F1–F4 + generalisation | ✅ Q7 |
| 2 | Engine shape recommendation | ✅ code core + LLM proposer (Q2 revised, Q6) |
| 3 | Seam definition | ✅ `ScheduleProposal` at application-service boundary |
| 4 | Offline-first re-evaluation | ✅ operation-level tiering (Q8) |
| 5 | Long-term extensibility check | ✅ flare-up feature worked example |
| 6 | Open questions / ADRs | ✅ register below |

---

## 5. ADR / artifact worklist (deliverable 6)

> **Written 2026-07-05:** new ADRs [0023](../adr/0023-dose-escalation-ladder.md)
> (ladder), [0024](../adr/0024-medical-scope-boundary.md) (medical-scope boundary),
> [0025](../adr/0025-event-domain-model.md) (Event model),
> [0026](../adr/0026-llm-schedule-proposer.md) (LLM proposer + BFF, amends 0001);
> amendments applied to ADR-0001, 0006, 0007, 0012, 0014, 0016. PRDs still
> outstanding.

| Existing ADR | Relationship | Action |
|---|---|---|
| ADR-0001 single-device/no-server | **Conflict** (BFF added) | **Amend**: tiered connectivity; "no server" → "no server *holding user data*"; BFF stateless + client-redacted + **endpoint-abuse protection** (origin allowlist, per-device rate limit, attestation, spend cap) |
| ADR-0007 v1 scope | Scope drift (Shape A = new v1.1 work) | **Revise**: roadmap reconciliation |
| ADR-0016 verdict-drives-schedule | Extended, no conflict | proposals inherit "audit fact, never read by derivation" |
| ADR-0012 status lifecycle | Extended, no conflict | rung topology-derived like status |
| ADR-0006 Dexie | Extended, no conflict | `proposals` + ladder-override tables |
| ADR-0014 types-not-strings | Edge case | note generated-Czech-rationale exception |
| **(new)** LLM-as-proposer | — | **Write**: seam, closed vocabulary, spine invariant, projection-as-redaction-boundary, no-photos, Czech rationale, **endpoint-abuse protection**, **scope-gate two-checks-two-times** (§6 #1), **deep validator reusing engine legality** (§6 #4 Part A) + **auto-apply by exposure axis** (§6 #4), **two-kind `trigger`: `event` \| `derived-signal`** (§6 #2), suggestions **decided-on-generation, never pending** (§6 #3), **pinned `modelId` + `promptVersion` on proposals** (§6 #6) |
| **(new)** medical-scope-boundary & red-flag escalation | — | **Write standalone ADR** (§6 #1 — own ADR decided): posture-3, positive-competence boundary, (c)-lite detector, **two-checks-two-times** (log-time stem floor + generation-time LLM verdict), escalation-not-a-proposal-variant, explanatory-not-prescriptive prose. **Regulatory hard-gate: external counsel before any non-dogfooder user.** |
| **(new)** `Event` domain model (F2) | — | **Write** (§6 #2): first-class record, curated-kinds + `other:` escape + scoped detail, **confounder role** (upstream of verdict), no `endDate`, proactive-pause (ii); **`event` trigger kind** (§6 #2 — not a mandatory proposal FK); new Dexie table + export entry; `UBIQUITOUS_LANGUAGE.md` + CONTEXT.md term |
| **(new)** ladder-as-first-class-data | — | **Write**: **net-new domain modeling** (not a refactor — no ladder exists; rung-scale question open), shippable *independently, first* (pure/deterministic, no LLM) |

**Sequence (five ADRs):** (1) ladder ADR → **ladder domain-model PRD**
(LLM-independent, de-risks the rest — net-new modeling, size accordingly);
(2) **medical-scope-boundary & red-flag ADR** (standalone — before any
prompt is written; safety before capability); (3) **Event-model ADR** (proposer's
`event` trigger points at it); (4) ADR-0001 amendment + LLM-as-proposer ADR →
proposer+BFF PRD (seam, trigger taxonomy, exposure split, endpoint-abuse
protection); (5) ADR-0007 revision.

**Parked design detail (belongs in the PRDs/ADRs, not architectural forks):**
**rung scale — does `PortionKind` suffice, or is an allergen-specific dose scale /
`PortionKind → rung` mapping needed** (`PortionKind` is flat + food-agnostic —
a "pinch" of egg ≠ a "pinch" of celery as an escalation step); ladder versioning + migration on
default-ladder improvement; proactive-detector cadence + suppression (Shape B);
exact structured `payload_version` field list; specific
attestation mechanism + rate-limit thresholds; Anthropic
30-day-retention dependency (export failing prompts to fixtures the day found);
**acute-reaction datum's positive home on the reaction path** (reaction-model
question surfaced by §6 #1-D / #2 — SkinObservation-with-notes vs a distinct
reaction record vs rolled into the `severe-reaction` verdict).

**Deferred to future versions (features intentionally postponed, not dropped):**
(1) **pending-suggestion queue / approve-later + targeted staleness handling**
(§6 #3 "option 3"); (2) **LLM eval harness** — golden fixtures,
regression-on-prompt-change, acceptance-rate loop mining `proposals` rejections
(§6 #4 Part B); (3) **auto-evaluated verdicts** (§6 #2) — engine confirming the
reaction verdict itself, not just proposing; requires an ADR-0016 revision (drops
parent-attribution mandate); seam built to allow it (confirm step becomes
optional). All are hardening/capability features for when there is real multi-user
usage + prompt-iteration pressure; none is needed for the single-dogfooder early
version.

**CONTEXT.md additions flagged:** the spine invariant; `ScheduleProposal`,
`DoseRung`/ladder, allergen-exposure projection, `PatternDetectorPort` (Shape B),
**`Event`** (§6 #2), the **`trigger`** union + **`derived-signal`** term (§6 #2),
the **exposure-increasing vs cautious-direction** mutation axis (§6 #4), the
**closed-competence-boundary invariant** + **scope-verdict** term (§6 #1), and a
**red-flag / escalation** term as domain terms.

---

## 6. Deep decisions — safety, events, staleness, validation, versioning, cost

### #1 — Medical-scope boundary & red-flag escalation ✅ (2026-07-05)

**Posture (decided): (3) detect-to-refuse-and-redirect** — detect alarming /
out-of-scope input only enough to STOP the normal flow and REDIRECT to human care;
never diagnose, name a condition, or treat. Rejected (1) active-detector (max
MDR/liability) and (2) pure-logger (trivializes alarming input by proposing
schedule tweaks in response to it).

**Competence boundary (candidate CONTEXT.md invariant):** the app has ONE
competence — **skin eczema + its elimination protocol** (incl. parent-reported
reintroduction reactions, *even non-skin ones*, as protocol outcomes). Assessment
scope is **closed** to that domain; non-competence input is context-at-most, never
assessed; **acute-danger input of any body system** trips refuse-and-redirect
regardless of scope. Trip line is **acuity/danger, not body-system**: "hives +
fussy after egg" = in-scope protocol reaction; "swollen lips + wheezing after egg"
= out-of-scope acute → redirect. Framing is **positive competence** (define the one
thing assessed), not **negative enumeration** (list dangers) — more robust +
auditable; the closed-vocabulary idea applied to assessment *scope*.

**Detector = (c)-lite (decided):** LLM primary (positive-scope enforcement,
negation/phrasing precision) + a **thin, high-acuity-only deterministic offline
floor** (small curated stem list — breathing / lips-swelling / unconscious /
cyanosis — over-triggers by design). **Fail-safe asymmetry: either layer may RAISE
a redirect; neither may SUPPRESS the other's.** Rejected (a) deterministic-only
(leaky Czech morphology, no negation) and (b) LLM-only (life-safety with a
connectivity dependency; offline-silent for the *under-reacting* parent who logs
"trochu sípe, je to reakce?" as a routine note). (c)-lite covers the worst offline
slice at a fraction of full-(c)'s build + medical-maintenance cost; posture-3's
**standing emergency affordance** (always-visible call-155) remains the passive
offline backstop.

**Timing — two checks at two times (decided):** the scope-gate is not one gate at
one moment.
- **Log-time (always, offline-capable):** the deterministic high-acuity stem floor
  runs **synchronously the instant F2 text is saved** — local, no network,
  over-triggers by design; a hit fires the call-155 affordance **immediately,
  regardless of connectivity.** This is the life-safety path; it never waits for
  generation.
- **Generation-time (online):** the LLM scope verdict runs when generation runs —
  the *non-acute* discrimination (protocol reaction vs redirect) + a second acuity
  pass on what the floor missed.

Fail-safe asymmetry holds across *time*, not just layers: the floor raises *now*,
the LLM raises *later* or catches what the floor missed. **Accepted residual:**
under-reacting parent + novel offline phrasing not on the stem list → backstopped by
the standing call-155 affordance. Rejected: blocking offline F2 entry (breaks Tier-0
logging) and an on-device model (cost disproportionate to a rare overlap). Contract:
"offline, the word-list floor guards you and the emergency button is always present;
the LLM scope check runs on reconnect."

**Gate architecture:**
- **A — Safety gate is a pre-filter AHEAD of the proposer**, returning a scope
  verdict `in-scope | out-of-scope-acute | out-of-scope-nonacute` — **NOT** a
  `ScheduleProposal` variant. Only `in-scope` reaches the proposer. The escape
  hatch is a *higher gate*, not a widened vocabulary → safety and scheduling stay
  orthogonal + independently auditable. Proposer keeps a refuse *backstop* in-prompt
  (defense-in-depth). Two redirect flavors: **emergency** (acute → 155) vs **scope**
  (non-acute non-eczema → pediatrician).
- **C — Generated prose explanatory, never prescriptive** ("protokol navrhuje…
  protože…", never "snižte dávku") + standing "nejsme lékařský nástroj" disclaimer.
  Bounds the ADR-0014-edge generated text away from medical advice.
- **D — Escalate first; LOG the datum; suppress only the PROPOSER, not the record.**
  *(Corrected mid-round — the initial "don't log" was safety-by-omission that would
  discard the protocol's single most valuable datum.)* An acute reaction to a
  reintroduced allergen IS the `severe-reaction` signal driving the safe mutation
  (rest → `reacted` → no auto-retest) and is what the redirected-to doctor needs.
  App stores the parent's **raw report + context + "flagged urgent / redirected"**;
  it does **not** auto-set the `severe-reaction` verdict (stays parent-attributed
  per ADR-0016, confirmed later, calmly). Storing raw words ≠ diagnosing. **Where**
  it's stored (reaction observation vs event row) → resolved in #2.

**B — Regulatory (flagged, NOT grilled — needs external counsel):** EU MDR
classification + whether Czech rationale = "medical advice" are legal
determinations. Design mitigations already lower exposure (posture 3,
positive-competence boundary, explanatory-not-prescriptive prose + disclaimer,
redirect-to-human-care) — the most defensible starting posture; counsel confirms
sufficiency. **Hard gate before any non-dogfooder user** (parallels ADR-0005).

**Cross-links:** #2 Event schema becomes a *safety control* (structured event kinds
+ scoped free-text detail channel input away from open-ended symptom prose); the
storage location of a logged acute reaction resolves in #2.

### #2 — Event schema ✅ (2026-07-05)

**First-class authoritative record** — Dexie table, repository port, in the export
snapshot. By the term-ownership rule gets a `UBIQUITOUS_LANGUAGE.md` + CONTEXT.md
entry. **"Event" is reserved for this user-logged log only** (flu / teething /
vaccination) — the engine's own trigger is not an Event.

**Trigger taxonomy (a proposal's cause) — decided:** two closed kinds, **not** a
mandatory Event FK (cadence nudges + flare-up detection have no Event row):
- **`event`** — user-logged flu / teething / vaccination; carries the Event row id.
- **`derived-signal`** — the engine's read of **meals + skin observations** over a
  window (its evaluation *is* the trigger); covers both the cadence dose-nudge and
  the flare-up detector (same thing, different window). Carries the **basis**
  evaluated for audit reproducibility. Precedent: the derived pattern card over
  `(Meal, SkinObservation)` + `detectConflicts`; on the ADR-0004 causation-derived
  spine. (`pattern` is not a third kind — the flare-up detector is a `derived-signal`
  with a longer window.)

**Spine constraint (hard):** a `derived-signal` yields a **proposal the mother
confirms**, *never* an auto-verdict — ADR-0016 keeps the reaction verdict
parent-attributed; the engine watching skin may *suggest* "hold egg?", it may not
silently flip the verdict to "reacted." Consequence (safer escalation): the
dose-nudge folds skin in — "3 days since last dose **and** skin calm → suggest bump"
— so an exposure-increasing move checks the baby is not already flaring.

**Future direction (parked):** *auto-evaluated verdicts* — the engine confirming the
verdict itself, not just proposing — is the eventual target; requires a deliberate
ADR-0016 revision (drops the parent-attribution mandate); **not v1.1.** The seam is
built to allow it (the confirm step becomes optional later).

**Role reframe (decided) — Event = confounder in reaction attribution, NOT a
pause-trigger.** Primary use: when a flare / reintroduction reaction is evaluated,
nearby events are weighed as *alternative causes* ("skin worse on egg day 3 — but
there's a flu"), preventing false allergen attribution. Squarely on the ADR-0004
causation-derived spine. Plugs in **upstream of the verdict**:
`Event → reaction attribution → verdict → schedule mutation` — schedule effect is
mostly *indirect* (via the verdict it shapes).

**Structure (decided): (c) curated kinds + `other:` free-text escape + scoped
free-text detail** — verbatim reuse of `CanonicalAllergen` (curated) +
`HarvestCandidate` (`other:`) from ADR-0017. Curated kinds (`illness | teething |
vaccination | weather | pollen`) carry structure + the #1 safety control (channel
input away from open symptom prose); `other:` absorbs unknown-unknowns (can
graduate like a harvested food); scoped detail gives the LLM confound-reasoning
material inside a structured envelope. Rejected (a) pure free text (max safety
surface) and (b) closed enum (kills the unknown-unknowns rationale that justified
the LLM).

**Temporal (decided): `date` (onset, backdatable) only — NO `endDate`.** Under the
confounder framing attribution needs *proximity*, not a resolution date; `endDate`
input is overkill. Duration nuance → free-text detail; any proximity window →
**derived typical-duration-per-kind** (`policy.ts`), never user-entered. Drops the
"open endDate evolves" staleness source → **simplifies #3** (only verdict-interleaving
remains).

**Direct schedule effect (decided: ii):** besides the confounder role, the engine
**may propose a proactive pause** — *don't start a new reintroduction while a
confound is active* ("can't read an egg test through a flu"). Same
signal-unreliable-in-window logic, forward-facing; pause window policy-derived, not
a user `endDate`. Rejected (i) pure-confounder (proactive pause is sound protocol
hygiene).

**Identity/mutability:** surrogate `id` (uuid) — *not* slot-keyed like `Meal`
(multiple events/day, no natural slot); content editable, hard-deletable; `id` +
`createdAt` immutable; `date` (onset, user-set) ≠ `createdAt` (system). Mirrors
`SkinObservation`, not `Meal` upsert. Logged offline (Tier-0, immediate); decoupled
in time from any proposal (Q8 queue) — an Event can exist with no proposal yet.

**Reaction is NOT an Event** (external context only) → the acute-reaction datum from
§6 #1-D needs a positive home on the *reaction* path: **open item** (reaction-model
question, parked in §5).

### #3 — Proposal staleness + idempotency ✅ — resolved by design-out (2026-07-05)

**Decision: suggestions are never held pending.** Generate → approve/reject in the
same moment against the current plan → apply-or-not → log to history. No pending
lifetime ⇒ no staleness.

- **Offline:** store the event only; generation deferred to next online session,
  producing a *fresh* suggestion. *(Supersedes Q8's "proposals resolve on
  reconnect.")*
- **Audit table (Q9):** rows written post-decision; history is never re-applied,
  cannot be stale.
- **Idempotency:** mark-applied-once guards double-tap; duplicate generation moot
  (generate+decide is one step).
- **Deferred, coupled pair:** pending queue / approve-later **and** targeted
  staleness check (`schedule.revision` + `basisRevision` + per-kind preconditions)
  — build together only if approve-later is ever wanted; likely never (non-urgent
  suggestions, home wifi, single user).

### #4 — Validator depth + eval harness ✅ (2026-07-05)

**Part A — Validator depth (decided): deep, reusing the engine's own legality
rules.** Before any AI suggestion is applied it must pass the **same protocol-
legality checks the pure engine already guarantees for its own mutations** — test
is *"would the engine accept this as a legal schedule state? if not, reject before
it touches anything."* Shape-only validation rejected (lets rule-breaking
suggestions reach the human, who might approve a subtly-illegal one). The
deterministic validator is the real safety net; the AI "being careful" is not.
Example catches: one-step-at-a-time ladder advance, no touching permanent
eliminations, min rest length, min elimination window.

**"Legal but dumb" + the apply axis (decided):** rules catch *illegal*
(machine-judgable); a human catches *unwise* (legal-but-silly — "pause everything on
one sneeze"). But the app must **carry** decisions — the mother opens it *because* she
is unsure — so the apply split is by **harm direction, not reversibility**:
- **Cautious-direction** (pause / rest / hold / revert-to-safe) → app applies,
  notifies, offers undo; no approval. Wrong-case = a few extra safe days = harmless.
- **Exposure-increasing** (raise a dose, start a reintroduction) → app does **all**
  the reasoning and **directs** it ("Increase egg today — here's why. [Got it]") with
  a one-tap confirm. Wrong-case = more allergen than the baby is ready for = real
  harm; and the tap doubles as "yes, I fed it" (data the app cannot observe).

Pure notifications / reminders change nothing the baby experiences → no approval, off
this axis. Kills Q6's "reversible" category (the axis is now "increases exposure?").
The deep validator (Part A) is unchanged — it gates *legality* before either path.

**Part B — Eval harness (deferred → FUTURE FEATURE, not dropped).** Testing a
non-deterministic component against the repo's deterministic two-tier testing doc is
real but not an early-version fork. **Early:** single dogfooder eyeballs suggestions,
saves bad ones as fixtures. **Future feature:** golden-fixture suite,
regression-on-prompt-change, and an acceptance-rate loop mining the `proposals`
table's rejections (Q9) as prompt-improvement signal.

### #6 — Prompt/model versioning ✅ (2026-07-05)

**Decided:** record `promptVersion` + exact `modelId` on every proposal-history row
(the Q9 `proposals` table). **Pin an explicit model id in the BFF — never "latest"**
— bump deliberately. Rationale: "use latest" breaks both reproducibility (can't
recreate an old suggestion) and stability (behavior drifts on Anthropic's release
schedule, not yours). Ties to the deferred eval harness (#4B) — regression-testing
prompt changes requires knowing which prompt/model produced each past result.
Distinct from the Q5 Console `prompt_version` *metadata* (Console clustering); this
is on the *persisted audit row* for reproducibility.

### #5 — Cost + model choice ✅ — config, not architecture (2026-07-05)

- **Decision:** pinned cheap/fast model (e.g. Haiku) first; upgrade (e.g. Sonnet)
  only if confound reasoning proves weak. One-line BFF change; seam unaffected.
- **Economics:** dogfooding scale ≈ handful of calls/week → cents/month on any
  model. Revisit at multi-user scale alongside the CLAUDE.md-hinted entitlement
  API. Spend cap already required (§3 Infra).
- **Optional future:** split models — fast for scope-gate (latency-critical),
  stronger for confound reasoning; decide empirically.
