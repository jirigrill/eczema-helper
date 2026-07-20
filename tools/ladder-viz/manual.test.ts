import { describe, expect, it } from 'vitest';

import { replayJourney } from './journey';
import { advanceDay, logEval, logMeal, logSkin, startManualRun, toRun } from './manual';
import { parseScenario } from './scenario-loader';

describe('manual mode — the run setup is fixed at session start', () => {
  it('threads the setup fields into the JourneyRun', () => {
    const session = startManualRun(
      {
        allergen: 'dairy',
        phase: 'reintroduction',
        stage: 'breastfed',
        permanent: false,
      },
      '2026-06-01',
    );
    const run = toRun(session);

    expect(run.allergenId).toBe('dairy');
    expect(run.stage).toBe('breastfed');
    expect(run.days).toEqual(['2026-06-01']);
  });
});

describe('manual mode — a hand-driven run renders identically to the equivalent scenario', () => {
  it('produces the same journey as the scenario with the same setup and dated events', () => {
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
    const scenarioJourney = replayJourney(parseScenario(yaml));

    let session = startManualRun(
      {
        allergen: 'dairy',
        phase: 'reintroduction',
        stage: 'breastfed',
        permanent: false,
      },
      '2026-06-01',
    );
    session = logMeal(session, 'pinch'); // day 1 actions
    session = logSkin(session, 1);
    session = advanceDay(session); // day 2 — empty
    session = advanceDay(session); // day 3
    session = logEval(session, 'mild-reaction');
    const manualJourney = replayJourney(toRun(session));

    expect(manualJourney).toEqual(scenarioJourney);
  });
});

describe('manual mode — the permanent setup field threads into the engine', () => {
  it('replays a permanent run as blocked from day one regardless of doses logged', () => {
    let session = startManualRun(
      {
        allergen: 'dairy',
        phase: 'reintroduction',
        stage: 'breastfed',
        permanent: true,
      },
      '2026-06-01',
    );
    session = logMeal(session, 'pinch');
    session = advanceDay(session);
    session = logMeal(session, 'teaspoon');
    const kinds = replayJourney(toRun(session)).map((d) => d.kind);

    expect(kinds).toContain('blocked');
    expect(kinds).not.toContain('climbing');
  });
});

describe('manual mode — actions apply to today, advance-day moves today forward', () => {
  it('stamps each logged event with the current day and grows a strict consecutive calendar', () => {
    let session = startManualRun(
      {
        allergen: 'dairy',
        phase: 'reintroduction',
        stage: 'breastfed',
        permanent: false,
      },
      '2026-06-01',
    );
    session = logMeal(session, 'pinch'); // stamped 2026-06-01
    session = advanceDay(session);
    session = advanceDay(session);
    session = logEval(session, 'tolerated'); // stamped 2026-06-03
    const run = toRun(session);

    expect(run.days).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
    expect(run.events.meals[0]?.date).toBe('2026-06-01');
    expect(run.events.evaluations[0]?.date).toBe('2026-06-03');
  });
});
