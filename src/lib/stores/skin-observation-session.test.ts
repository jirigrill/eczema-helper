import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import type { SkinObservation } from '$lib/domain/models';

// fake-indexeddb is loaded globally in test-setup.ts; Dexie works without setup.

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForObservations(
  store: { subscribe: (cb: (v: SkinObservation[]) => void) => () => void },
  predicate: (rows: SkinObservation[]) => boolean,
  timeoutMs = 500,
): Promise<SkinObservation[]> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsub?.();
      reject(new Error('Timed out waiting for observations predicate'));
    }, timeoutMs);
    unsub = store.subscribe((rows) => {
      if (predicate(rows)) {
        clearTimeout(timer);
        Promise.resolve().then(() => unsub?.());
        resolve(rows);
      }
    });
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

function makeObservation(overrides: Partial<SkinObservation> = {}): SkinObservation {
  return {
    id: `obs-${today}`,
    date: today,
    createdAt: new Date().toISOString(),
    status: 'unchanged',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('skinObservationSession (default export — today singleton)', () => {
  it('exports subscribe and save', async () => {
    const mod = await import('./skin-observation-session');
    expect(mod.skinObservationSession).toBeDefined();
    expect(typeof mod.skinObservationSession.subscribe).toBe('function');
    expect(typeof mod.skinObservationSession.save).toBe('function');
  });

  it('initial store value is an array', async () => {
    const { skinObservationSession } = await import('./skin-observation-session');
    const rows = get(skinObservationSession);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('save returns ok:true for a valid observation', async () => {
    const { skinObservationSession } = await import('./skin-observation-session');
    const result = await skinObservationSession.save(makeObservation());
    expect(result).toMatchObject({ ok: true });
  });

  it('after save, subscribe emits an array containing the saved observation', async () => {
    const { skinObservationSession } = await import('./skin-observation-session');
    const obs = makeObservation({ id: `obs-${today}-improved`, status: 'improved' });
    await skinObservationSession.save(obs);
    const rows = await waitForObservations(
      skinObservationSession,
      (rs) => rs.some((r) => r.id === obs.id),
    );
    expect(rows.some((r) => r.id === obs.id)).toBe(true);
  });

  it('observations for other dates are excluded from the subscription', async () => {
    const { skinObservationSession } = await import('./skin-observation-session');
    const pastObs = makeObservation({ id: 'obs-past', date: '2000-01-01' });
    await skinObservationSession.save(pastObs);
    const rows = await waitForObservations(skinObservationSession, () => true);
    expect(rows.some((r) => r.id === 'obs-past')).toBe(false);
  });
});

describe('createSkinObservationSession (factory)', () => {
  it('exports createSkinObservationSession function', async () => {
    const mod = await import('./skin-observation-session');
    expect(typeof mod.createSkinObservationSession).toBe('function');
  });

  it('factory returns a store with subscribe and save', async () => {
    const { createSkinObservationSession } = await import('./skin-observation-session');
    const session = createSkinObservationSession('2024-01-15');
    expect(typeof session.subscribe).toBe('function');
    expect(typeof session.save).toBe('function');
  });

  it('factory store is scoped to the given date', async () => {
    const { createSkinObservationSession } = await import('./skin-observation-session');
    const date = '2024-05-20';
    const session = createSkinObservationSession(date);
    const obs: SkinObservation = {
      id: `obs-factory-${date}`,
      date,
      createdAt: new Date().toISOString(),
      status: 'worsened',
    };
    await session.save(obs);
    const rows = await waitForObservations(session, (rs) => rs.some((r) => r.id === obs.id));
    expect(rows.some((r) => r.id === obs.id)).toBe(true);
  });

  it('factory store for one date does not show observations from a different date', async () => {
    const { createSkinObservationSession } = await import('./skin-observation-session');
    const dateA = '2024-06-01';
    const dateB = '2024-06-02';
    const sessionA = createSkinObservationSession(dateA);
    const obs: SkinObservation = {
      id: `obs-factory-${dateA}`,
      date: dateA,
      createdAt: new Date().toISOString(),
      status: 'improved',
    };
    await sessionA.save(obs);
    const sessionB = createSkinObservationSession(dateB);
    await new Promise((r) => setTimeout(r, 100));
    const rowsB = get(sessionB);
    expect(rowsB.some((r) => r.id === obs.id)).toBe(false);
  });
});
