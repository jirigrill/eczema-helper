import { describe, it, expect } from 'vitest';
import { buildPhaseRecap } from './phase-recap';
import type { SchedulePhase, SkinObservation, RegionLevel } from '$lib/domain/models';

function obs(date: string, level: RegionLevel = 0, overrides?: Partial<SkinObservation>): SkinObservation {
  return {
    id: `obs-${date}`,
    date,
    createdAt: `${date}T08:00:00.000Z`,
    regions: level === 0 ? [{ id: 'face', level: 0 }] : [{ id: 'face', level }],
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

  it('joins each day with the day-overall severity derived from regions', () => {
    const calm = obs('2026-05-20', 0);
    const severe = obs('2026-05-22', 3);
    const rows = buildPhaseRecap(reintroPhase, [calm, severe]);
    expect(rows.find(r => r.date === '2026-05-20')?.severity).toBe(0);
    expect(rows.find(r => r.date === '2026-05-21')?.severity).toBeUndefined();
    expect(rows.find(r => r.date === '2026-05-22')?.severity).toBe(3);
    expect(rows.find(r => r.date === '2026-05-23')?.severity).toBeUndefined();
  });

  it('severity is the max across regions for a day', () => {
    const obsMixed: SkinObservation = {
      id: 'obs-mixed',
      date: '2026-05-20',
      createdAt: '2026-05-20T08:00:00.000Z',
      regions: [
        { id: 'face', level: 1 },
        { id: 'belly', level: 3 },
        { id: 'arms', level: 2 },
      ],
    };
    const rows = buildPhaseRecap(reintroPhase, [obsMixed]);
    expect(rows.find(r => r.date === '2026-05-20')?.severity).toBe(3);
  });

  it('ignores observations outside the phase window', () => {
    const before = obs('2026-05-19', 1);
    const after = obs('2026-05-24', 3);
    const rows = buildPhaseRecap(reintroPhase, [before, after]);
    expect(rows.every(r => r.severity === undefined)).toBe(true);
  });

  it('uses the latest observation when a day has more than one', () => {
    const earlier: SkinObservation = obs('2026-05-20', 1, { id: 'a', createdAt: '2026-05-20T08:00:00.000Z' });
    const later: SkinObservation = obs('2026-05-20', 3, { id: 'b', createdAt: '2026-05-20T18:00:00.000Z' });
    const rows = buildPhaseRecap(reintroPhase, [earlier, later]);
    expect(rows.find(r => r.date === '2026-05-20')?.severity).toBe(3);
  });
});
