import { describe, it, expect, afterEach } from 'vitest';

import { db, SINGLETON_ID } from '$lib/db/atopic-db';
import type { QuestionnaireAnswers, GeneratedSchedule, SkinPhoto } from '$lib/domain/models';
import { DEFAULT_TESTED_ALLERGENS } from '$lib/data/categories';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleAnswers: QuestionnaireAnswers = {
  babyBirthDate: '2025-01-01',
  eczemaSeverity: 'moderate',
  motherAllergies: [],
  babyConfirmedAllergies: ['eggs'],
  programStartDate: '2025-06-01',
  completedAt: '2025-06-01T10:00:00.000Z',
  testedAllergens: DEFAULT_TESTED_ALLERGENS,
};

const sampleSchedule: GeneratedSchedule = {
  phases: [],
  permanentMother: [],
  permanentBaby: [],
  startDate: '2025-06-01',
  estimatedEndDate: '2025-08-31',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function tick(ms = 80): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function clearDb(): Promise<void> {
  await Promise.all([db.schedule.clear(), db.answers.clear(), db.photos.clear()]);
}

async function waitForStatus(
  store: { subscribe: (cb: (v: { status: string }) => void) => () => void },
  status: string,
  timeoutMs = 600,
): Promise<{ status: string }> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsub?.();
      reject(new Error(`Timed out waiting for status "${status}"`));
    }, timeoutMs);
    unsub = store.subscribe((v) => {
      if (v.status === status) {
        clearTimeout(timer);
        Promise.resolve().then(() => unsub?.());
        resolve(v);
      }
    });
  });
}

async function seedDb(): Promise<void> {
  await db.answers.put({ id: SINGLETON_ID, ...sampleAnswers });
  await db.schedule.put({ id: SINGLETON_ID, ...sampleSchedule });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('scheduleContext', () => {
  afterEach(async () => {
    await clearDb();
  });
  it('transitions to ready when schedule and answers exist', async () => {
    await seedDb();
    const { scheduleContext } = await import('./schedule-context');

    const state = await waitForStatus(scheduleContext, 'ready');
    expect(state.status).toBe('ready');
  });

  it('stays ready after a write to an unrelated table (transient-empty guard)', async () => {
    // This test exercises the double-query guard added to scheduleContext.
    // Dexie's liveQuery can fire with empty results when a write to an unrelated
    // table (e.g. photos) bumps the internal version counter. Without the guard,
    // the store would transition to 'empty' and trigger a navigation away from
    // the app mid-session.
    await seedDb();
    const { scheduleContext } = await import('./schedule-context');

    await waitForStatus(scheduleContext, 'ready');

    const photo: SkinPhoto = {
      id: 'photo-1',
      date: '2025-06-01',
      capturedAt: '2025-06-01T12:00:00.000Z',
      blob: new Blob(['x'], { type: 'image/jpeg' }),
    };
    await db.photos.put(photo);

    await tick();

    const current = await new Promise<{ status: string }>((resolve) => {
      const unsub = scheduleContext.subscribe((v) => {
        Promise.resolve().then(() => unsub());
        resolve(v);
      });
    });
    expect(current.status).toBe('ready');
  });
});
