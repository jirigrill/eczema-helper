import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryScheduleRepository } from './in-memory-schedule-repository';
import type { GeneratedSchedule } from '$lib/domain/models';

const sampleSchedule: GeneratedSchedule = {
  phases: [],
  permanentEliminations: [],
  startDate: '2025-06-01',
  estimatedEndDate: '2025-09-01',
};

describe('InMemoryScheduleRepository', () => {
  let repo: InMemoryScheduleRepository;

  beforeEach(() => {
    repo = new InMemoryScheduleRepository();
  });

  it('returns null when nothing has been saved', async () => {
    expect(await repo.load()).toBeNull();
  });

  it('returns saved schedule after save', async () => {
    await repo.save(sampleSchedule);
    expect(await repo.load()).toEqual(sampleSchedule);
  });

  it('overwrites previous schedule on second save', async () => {
    await repo.save(sampleSchedule);
    const updated = { ...sampleSchedule, estimatedEndDate: '2025-10-01' };
    await repo.save(updated);
    expect(await repo.load()).toEqual(updated);
  });
});
