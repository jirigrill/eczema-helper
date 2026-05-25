# 0013 — Drop unused in-memory port adapters

**Status:** Accepted
**Date:** 2026-05-25
**Supersedes part of:** [ADR-0006](0006-dexie-persistence.md), [ADR-0009](0009-schedule-context-store.md)

## Context

`docs/architecture/ports-and-adapters.md` lists two in-memory adapters as
the canonical test fixtures for the `ScheduleRepository` and
`QuestionnaireRepository` ports:

- `src/lib/adapters/in-memory-schedule-repository.ts`
- `src/lib/adapters/in-memory-questionnaire-repository.ts`

ADR-0006 references "in-memory fakes" as part of why the domain layer
stays pure and testable. The port shape was deliberately kept non-reactive
(see `ports-and-adapters.md:72`) so these adapters could stay trivial.

A test-suite audit on 2026-05-25 found that neither adapter has any
consumer:

- No production route imports them.
- No component or route test uses them. Route tests bypass repositories
  entirely via `vi.mock('$lib/stores/schedule-context', ...)`, as
  ADR-0009 expected when it deferred DI.
- Their colocated tests (`in-memory-*-repository.test.ts`) only verify
  that JavaScript field assignment round-trips a value — they do not
  exercise the port contract because there is no second implementation
  to compare against in those tests.

The adapters are scaffolding for a testability strategy that was never
adopted. The docs make a promise the code does not honor.

## Decision

Delete both in-memory adapters and their colocated test files.
Update `docs/architecture/ports-and-adapters.md` and ADR-0006 so that the
documented architecture matches the actual code: ports have one
implementation each (`Dexie*Repository`), and adapter tests run against
`fake-indexeddb`.

Route-level tests continue to mock `$lib/stores/schedule-context`
directly, consistent with ADR-0009.

## Why not adopt them instead (option B)

The alternative was to refactor `scheduleContext` into a factory
provided through Svelte `setContext`, wire the in-memory adapters into
route/component tests, and replace every `vi.mock('$lib/stores/schedule-context')`
with a real domain-backed fixture. That work is ~1–2 days plus an ADR.

Rejected because:

- **No forcing function.** No bug has escaped the current test layout.
  The route-test gap (mocked-away `schedule-queries` calls) is
  theoretical, not observed.
- **Reverses ADR-0009 without new evidence.** ADR-0009:48–52 called
  Svelte context "ceremony without benefit" for this single-device PWA,
  and ADR-0009:70 explicitly deferred DI. Overturning both on principle
  alone produces a low-authority ADR that the next refactor proposal
  will ignore.
- **Solo maintenance cost.** The repo has one developer learning
  Svelte; adding DI ceremony without a test that fails today and passes
  after is hard to justify against v1 Protocol Executor scope
  ([ADR-0007](0007-v1-scope.md)) and tracer-bullet discipline
  ([ADR-0008](0008-tracer-bullet-slices.md)).

If a future bug escapes route tests because the schedule-context mock
diverged from real domain behavior, that bug is the forcing function.
Reinstate in-memory adapters and inject them in a follow-up ADR at
that point — the bug becomes the rationale.

## Consequences

- `src/lib/adapters/in-memory-schedule-repository.ts` deleted.
- `src/lib/adapters/in-memory-schedule-repository.test.ts` deleted.
- `src/lib/adapters/in-memory-questionnaire-repository.ts` deleted.
- `src/lib/adapters/in-memory-questionnaire-repository.test.ts` deleted.
- `docs/architecture/ports-and-adapters.md` updated: in-memory column
  removed from the port→adapter table; lines about test-fixture role
  rewritten to describe `fake-indexeddb` as the test substrate.
- ADR-0006 "in-memory fakes" wording revised to "tested against
  `fake-indexeddb`".
- Port shape stays non-reactive — the rationale in
  `ports-and-adapters.md:72` is preserved for future re-introduction.
