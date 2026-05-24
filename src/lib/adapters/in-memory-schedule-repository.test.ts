import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryScheduleRepository } from './in-memory-schedule-repository';
import type { GeneratedSchedule } from '$lib/domain/models';

const sampleSchedule: GeneratedSchedule = {
  phases: [],
  permanentMother: [], permanentBaby: [],
  startDate: '2025-06-01',
  estimatedEndDate: '2025-09-01',
};

describe('InMemoryScheduleRepository', () => {
  let repo: InMemoryScheduleRepository;

  beforeEach(() => {
    repo = new InMemoryScheduleRepository();
  });

  it('returns Ok(null) when nothing has been saved', async () => {
    expect(await repo.load()).toEqual({ ok: true, data: null });
  });

  it('returns Ok(schedule) after save', async () => {
    expect(await repo.save(sampleSchedule)).toMatchObject({ ok: true });
    expect(await repo.load()).toMatchObject({ ok: true, data: sampleSchedule });
  });

  it('overwrites previous schedule on second save', async () => {
    await repo.save(sampleSchedule);
    const updated = { ...sampleSchedule, estimatedEndDate: '2025-10-01' };
    await repo.save(updated);
    expect(await repo.load()).toMatchObject({ ok: true, data: updated });
  });
});
