import { describe, expect, it } from 'vitest';

import { type JourneyNodeKind, journeyNodeKind, replayDays } from './journey';
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

  it('rejects a non-date string as a load error', () => {
    const yaml = `${header}
  - date: not-a-date
    events: []
`;
    expect(() => parseScenario(yaml)).toThrow();
  });

  it('rejects an impossible calendar date as a load error', () => {
    const yaml = `${header}
  - date: 2026-13-40
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
    const kinds = replayDays(run).map((d) => journeyNodeKind(d.explain.decision));
    // A permanently-eliminated allergen is blocked regardless of doses logged.
    expect(kinds).toContain('blocked');
    expect(kinds).not.toContain('climbing');
  });
});

describe('shipped scenarios — each replays its named distinct path (#523)', () => {
  const files = import.meta.glob('./scenarios/*.yaml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const byName = new Map(
    Object.entries(files).map(([path, text]) => [path.replace(/^.*\/(.+)\.yaml$/, '$1'), text]),
  );

  /**
   * Each canonical scenario must exercise the distinct path through the state
   * model its #523 write-up describes — so we assert the *situations* its replay
   * actually visits, not merely that it parses. A scenario that silently drifts
   * off its named path fails here instead of passing as a mere "loads OK".
   *
   * - `visits` — every situation the path must reach.
   * - `endsAt` — the terminal box, pinned wherever the write-up names a specific
   *   end state: a settled/blocked terminal, or the resumed `climbing` a hold is
   *   meant to lift back into (so "climbing resumes" can't regress into a run
   *   that stalls in the hold).
   * - `terminalRung` — pins the live rung the run's terminal fires at: `floor`
   *   for floor-exhaustion (the lowest rung reacts, nowhere lower), `off-floor`
   *   for the walk-down scenario (it settles on the stepped-down rung, BELOW the
   *   rung that reacted but not at the floor — the whole point of the reshape is
   *   that a reaction walks down and re-confirms in place, never re-climbs).
   */
  const PATHS: Record<
    string,
    { visits: JourneyNodeKind[]; endsAt?: JourneyNodeKind; terminalRung?: 'floor' | 'off-floor' }
  > = {
    'clean-climb-settled': { visits: ['climbing', 'dwelling'], endsAt: 'settled' },
    'reaction-walkdown': {
      visits: ['climbing', 'resting', 'dwelling'],
      endsAt: 'settled',
      terminalRung: 'off-floor',
    },
    'floor-exhaustion-ceiling': { visits: ['ceiling-floor-exhaustion'], terminalRung: 'floor' },
    'skin-worsening-hold': { visits: ['holding-skin'], endsAt: 'climbing' },
    'cadence-hold': { visits: ['holding-cadence'], endsAt: 'climbing' },
    'blocked-permanent': { visits: ['blocked'] },
  };

  it('ships exactly the canonical set (#523)', () => {
    expect([...byName.keys()].sort()).toEqual(Object.keys(PATHS).sort());
  });

  it.each(Object.entries(PATHS))(
    '%s reaches its distinct path',
    (name, { visits, endsAt, terminalRung }) => {
      const text = byName.get(name);
      expect(text, `scenario ${name}.yaml is missing`).toBeDefined();

      const run = parseScenario(text!);
      const days = replayDays(run);
      const kinds = days.map((d) => journeyNodeKind(d.explain.decision));

      for (const kind of visits) expect(kinds).toContain(kind);
      if (endsAt) expect(kinds.at(-1)).toBe(endsAt);

      if (terminalRung) {
        const floorRungId = run.defaultLadder.stages[run.stage]?.[0]?.id;
        const liveRungId = days.at(-1)?.explain.snapshot.liveRung?.id;
        if (terminalRung === 'floor') {
          expect(liveRungId).toBe(floorRungId);
        } else {
          expect(liveRungId).toBeDefined();
          expect(liveRungId).not.toBe(floorRungId);
        }
      }
    },
  );
});
