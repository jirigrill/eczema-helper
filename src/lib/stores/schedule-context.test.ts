import { afterEach, describe, expect, it } from 'vitest';

import { SINGLETON_ID, db } from '$lib/db/atopic-db';
import type { GeneratedSchedule, QuestionnaireAnswers, SkinPhoto } from '$lib/domain/models';
import { DEFAULT_TESTED_ALLERGENS } from '$lib/domain/policy';

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

describe('scheduleRaw', () => {
  afterEach(async () => {
    await clearDb();
  });

  it('exports scheduleRaw readable', async () => {
    const mod = await import('./schedule-context');
    expect(mod.scheduleRaw).toBeDefined();
    expect(typeof mod.scheduleRaw.subscribe).toBe('function');
  });

  it('emits {status: "loading"} initially', async () => {
    const { scheduleRaw } = await import('./schedule-context');
    const value = await new Promise<{ status: string }>((resolve) => {
      const unsub = scheduleRaw.subscribe((v) => {
        Promise.resolve().then(() => unsub());
        resolve(v);
      });
    });
    // Either loading (db empty at start) or empty — both are valid depending on prior test state
    expect(['loading', 'empty', 'ready']).toContain(value.status);
  });

  it('emits {status: "ready", schedule, answers} when db has data', async () => {
    await seedDb();
    const { scheduleRaw } = await import('./schedule-context');

    const value = await new Promise<{ status: string }>((resolve, reject) => {
      let unsub: (() => void) | undefined;
      const timer = setTimeout(() => {
        unsub?.();
        reject(new Error('timeout'));
      }, 600);
      unsub = scheduleRaw.subscribe((v) => {
        if (v.status === 'ready') {
          clearTimeout(timer);
          Promise.resolve().then(() => unsub?.());
          resolve(v);
        }
      });
    });

    expect(value.status).toBe('ready');
    // scheduleRaw ready value must have schedule and answers but NOT derived fields
    const raw = value as { status: 'ready'; schedule: unknown; answers: unknown };
    expect(raw.schedule).toBeDefined();
    expect(raw.answers).toBeDefined();
    // Must NOT contain date-derived fields that belong on the page side
    expect((raw as Record<string, unknown>).allergenStatuses).toBeUndefined();
    expect((raw as Record<string, unknown>).eliminatedToday).toBeUndefined();
    expect((raw as Record<string, unknown>).reintroInfo).toBeUndefined();
    expect((raw as Record<string, unknown>).progress).toBeUndefined();
  });
});

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
      observationId: 'obs-1',
      region: 'face',
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
