import { describe, expect, it } from 'vitest';

import { replayJourney } from './journey';
import { parseScenario } from './scenario-loader';

describe('parseScenario — valid YAML → typed JourneyRun', () => {
  it('maps the header and day-by-day events onto the shared event-stream type', () => {
    const yaml = `
allergen: dairy
phase: reintroduction
stage: breastfed
days:
  - date: 2026-06-01
    events:
      - meal: pinch
      - skin: 1
  - date: 2026-06-02
    events: []
  - date: 2026-06-03
    events:
      - eval: mild-reaction
`;
    const run = parseScenario(yaml);

    expect(run.allergenId).toBe('dairy');
    expect(run.stage).toBe('breastfed');
    expect(run.days).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);

    // A `meal: pinch` becomes a dose for the header allergen on its day.
    expect(run.events.meals).toHaveLength(1);
    expect(run.events.meals[0]?.date).toBe('2026-06-01');

    // A `skin: 1` becomes a severity-1 observation on its day.
    expect(run.events.observations).toHaveLength(1);
    expect(run.events.observations[0]?.date).toBe('2026-06-01');

    // An `eval: mild-reaction` becomes a reintroduction evaluation on its day.
    expect(run.events.evaluations).toHaveLength(1);
    expect(run.events.evaluations[0]?.date).toBe('2026-06-03');
    expect(run.events.evaluations[0]?.outcome).toBe('mild-reaction');
  });
});

describe('parseScenario — strict, consecutive, ascending dates', () => {
  const header = `
allergen: dairy
phase: reintroduction
stage: breastfed
days:`;

  it('rejects a duplicate date as a load error', () => {
    const yaml = `${header}
  - date: 2026-06-01
    events: []
  - date: 2026-06-01
    events: []
`;
    expect(() => parseScenario(yaml)).toThrow();
  });

  it('rejects an out-of-order date as a load error', () => {
    const yaml = `${header}
  - date: 2026-06-02
    events: []
  - date: 2026-06-01
    events: []
`;
    expect(() => parseScenario(yaml)).toThrow();
  });

  it('rejects a skipped day (gap) as a load error', () => {
    const yaml = `${header}
  - date: 2026-06-01
    events: []
  - date: 2026-06-03
    events: []
`;
    expect(() => parseScenario(yaml)).toThrow();
  });

  it('accepts a strict consecutive ascending run', () => {
    const yaml = `${header}
  - date: 2026-06-01
    events: []
  - date: 2026-06-02
    events: []
  - date: 2026-06-03
    events: []
`;
    expect(() => parseScenario(yaml)).not.toThrow();
  });
});

describe('parseScenario — Zod enum validation', () => {
  const header = `
allergen: dairy
phase: reintroduction
stage: breastfed
days:`;

  it('rejects an unknown eval outcome as a load error', () => {
    const yaml = `${header}
  - date: 2026-06-01
    events:
      - eval: kinda-bad
`;
    expect(() => parseScenario(yaml)).toThrow();
  });

  it('rejects a skin severity outside 0-3 as a load error', () => {
    const yaml = `${header}
  - date: 2026-06-01
    events:
      - skin: 4
`;
    expect(() => parseScenario(yaml)).toThrow();
  });

  it('rejects an unknown meal amount as a load error', () => {
    const yaml = `${header}
  - date: 2026-06-01
    events:
      - meal: heaps
`;
    expect(() => parseScenario(yaml)).toThrow();
  });

  it('rejects an unknown phase as a load error', () => {
    const yaml = `
allergen: dairy
phase: made-up-phase
stage: breastfed
days:
  - date: 2026-06-01
    events: []
`;
    expect(() => parseScenario(yaml)).toThrow();
  });

  it('rejects an allergen with no ladder in the catalog as a load error', () => {
    const yaml = `
allergen: not-a-real-allergen
phase: reintroduction
stage: breastfed
days:
  - date: 2026-06-01
    events: []
`;
    expect(() => parseScenario(yaml)).toThrow();
  });
});

describe('parseScenario — permanent header threads into the engine', () => {
  it('replays a permanent scenario as blocked from day one, absorbing later events', () => {
    const yaml = `
allergen: dairy
phase: reintroduction
stage: breastfed
permanent: true
days:
  - date: 2026-06-01
    events:
      - meal: pinch
  - date: 2026-06-02
    events:
      - meal: teaspoon
`;
    const run = parseScenario(yaml);
    const journey = replayJourney(run);
    const kinds = journey.map((d) => d.kind);
    // A permanently-eliminated allergen is blocked regardless of doses logged.
    expect(kinds).toContain('blocked');
    expect(kinds).not.toContain('climbing');
  });
});

describe('shipped scenarios — every *.yaml loads', () => {
  const files = import.meta.glob('./scenarios/*.yaml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const entries = Object.entries(files);

  it('ships at least one scenario', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)('%s parses + validates and replays without error', (_path, text) => {
    const run = parseScenario(text);
    expect(() => replayJourney(run)).not.toThrow();
    expect(run.days.length).toBeGreaterThan(0);
  });
});
