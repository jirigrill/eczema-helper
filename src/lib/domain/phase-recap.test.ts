import { describe, it, expect } from 'vitest';
import { buildPhaseRecap } from './phase-recap';
import type { SchedulePhase, SkinObservation } from '$lib/domain/models';

function obs(date: string, status: SkinObservation['status'] = 'unchanged', overrides?: Partial<SkinObservation>): SkinObservation {
  return {
    id: `obs-${date}`,
    date,
    createdAt: `${date}T08:00:00.000Z`,
    status,
    ...overrides,
  };
}

const reintroPhase: SchedulePhase = {
  id: 'reintro-dairy',
  type: 'reintroduction',
  startDate: '2026-05-20',
  endDate: '2026-05-23',
  allergenIds: ['dairy'],
};

describe('buildPhaseRecap', () => {
  it('returns one row per day in the phase window', () => {
    const rows = buildPhaseRecap(reintroPhase, []);
    expect(rows).toHaveLength(4);
    expect(rows.map(r => r.date)).toEqual(['2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23']);
  });

  it('numbers each row by dose day starting at 1', () => {
    const rows = buildPhaseRecap(reintroPhase, []);
    expect(rows.map(r => r.dayNumber)).toEqual([1, 2, 3, 4]);
  });

  it('joins each day with the skin observation status logged that day', () => {
    const obs1 = obs('2026-05-20', 'unchanged');
    const obs2 = obs('2026-05-22', 'worsened');
    const rows = buildPhaseRecap(reintroPhase, [obs1, obs2]);
    expect(rows.find(r => r.date === '2026-05-20')?.skinStatus).toBe('unchanged');
    expect(rows.find(r => r.date === '2026-05-21')?.skinStatus).toBeUndefined();
    expect(rows.find(r => r.date === '2026-05-22')?.skinStatus).toBe('worsened');
    expect(rows.find(r => r.date === '2026-05-23')?.skinStatus).toBeUndefined();
  });

  it('ignores observations outside the phase window', () => {
    const before = obs('2026-05-19', 'improved');
    const after = obs('2026-05-24', 'worsened');
    const rows = buildPhaseRecap(reintroPhase, [before, after]);
    expect(rows.every(r => r.skinStatus === undefined)).toBe(true);
  });

  it('uses the latest observation when a day has more than one', () => {
    const earlier: SkinObservation = obs('2026-05-20', 'unchanged', { id: 'a', createdAt: '2026-05-20T08:00:00.000Z' });
    const later: SkinObservation = obs('2026-05-20', 'worsened', { id: 'b', createdAt: '2026-05-20T18:00:00.000Z' });
    const rows = buildPhaseRecap(reintroPhase, [earlier, later]);
    expect(rows.find(r => r.date === '2026-05-20')?.skinStatus).toBe('worsened');
  });
});
