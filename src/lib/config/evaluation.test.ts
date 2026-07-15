import { describe, expect, it } from 'vitest';

import type { SchedulePhase } from '$lib/domain/models';

import { evaluationHrefForPhase, evaluationView } from './evaluation';

function phase(
  p: Partial<SchedulePhase> & Pick<SchedulePhase, 'id' | 'type' | 'startDate' | 'endDate'>,
): SchedulePhase {
  return { allergenIds: [], ...p };
}

describe('evaluationView', () => {
  it('returns the allergen-test vocabulary for a reintroduction phase', () => {
    const view = evaluationView('reintroduction');
    expect(view).not.toBeNull();
    expect(view?.kind).toBe('allergen-test');
    expect(view?.options.map((o) => o.value)).toEqual([
      'tolerated',
      'mild-reaction',
      'clear-reaction',
      'severe-reaction',
    ]);
  });

  it.each(['reset', 'elimination'] as const)(
    'returns the skin-status vocabulary for a %s phase',
    (phaseType) => {
      const view = evaluationView(phaseType);
      expect(view).not.toBeNull();
      expect(view?.kind).toBe('skin-status');
      expect(view?.options.map((o) => o.value)).toEqual([
        'improved',
        'unchanged',
        'worsened',
        'new-lesions',
      ]);
      // every option carries a non-empty label so the cards are never blank
      expect(view?.options.every((o) => o.label.length > 0)).toBe(true);
    },
  );

  it.each(['rest', 'tolerance-building'] as const)(
    'returns null for a %s phase (never evaluated)',
    (phaseType) => {
      expect(evaluationView(phaseType)).toBeNull();
    },
  );
});

describe('evaluationHrefForPhase', () => {
  const reintro = phase({
    id: 'reintro-soy',
    type: 'reintroduction',
    startDate: '2026-06-01',
    endDate: '2026-06-04',
    allergenIds: ['soy'],
  });
  const reset = phase({
    id: 'reset',
    type: 'reset',
    startDate: '2026-05-01',
    endDate: '2026-05-05',
  });
  const elimination = phase({
    id: 'elimination',
    type: 'elimination',
    startDate: '2026-05-06',
    endDate: '2026-05-26',
    allergenIds: ['dairy'],
  });
  const rest = phase({
    id: 'rest-1',
    type: 'rest',
    startDate: '2026-06-05',
    endDate: '2026-06-07',
  });

  it('links to /evaluation on a reintroduction phase-end day', () => {
    const href = evaluationHrefForPhase(reintro, '2026-06-04', false);
    expect(href).toBe(
      `/evaluation?phase=reintro-soy&date=2026-06-04&returnTo=${encodeURIComponent('/day/2026-06-04')}`,
    );
  });

  it('links to /evaluation on a reset phase-end day', () => {
    const href = evaluationHrefForPhase(reset, '2026-05-05', false);
    expect(href).toBe(
      `/evaluation?phase=reset&date=2026-05-05&returnTo=${encodeURIComponent('/day/2026-05-05')}`,
    );
  });

  it('links to /evaluation on an elimination phase-end day', () => {
    const href = evaluationHrefForPhase(elimination, '2026-05-26', false);
    expect(href).toBe(
      `/evaluation?phase=elimination&date=2026-05-26&returnTo=${encodeURIComponent('/day/2026-05-26')}`,
    );
  });

  it('links to /evaluation when a verdict already exists, even mid-phase (revisit read-only)', () => {
    const href = evaluationHrefForPhase(reset, '2026-05-03', true);
    expect(href).toContain('/evaluation?phase=reset&date=2026-05-03');
  });

  it('returns null mid-phase with no verdict yet', () => {
    expect(evaluationHrefForPhase(elimination, '2026-05-10', false)).toBeNull();
  });

  it('returns null on a rest phase-end day (rest is never evaluated)', () => {
    expect(evaluationHrefForPhase(rest, '2026-06-07', false)).toBeNull();
  });

  it('returns null when there is no phase', () => {
    expect(evaluationHrefForPhase(null, '2026-05-05', false)).toBeNull();
  });
});
