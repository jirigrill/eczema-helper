import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';

import { db } from '$lib/db/atopic-db';
import type { SkinObservation } from '$lib/domain/models';

// fake-indexeddb is loaded globally in test-setup.ts; Dexie works without setup.

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForRows<T>(
  store: { subscribe: (cb: (v: T[]) => void) => () => void },
  predicate: (rows: T[]) => boolean,
  timeoutMs = 500,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsub?.();
      reject(new Error('Timed out waiting for rows predicate'));
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

function makeObs(id: string, date: string): SkinObservation {
  return { id, date, createdAt: new Date().toISOString(), regions: [{ id: 'face', level: 1 }] };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createDateScopedSession (generic)', () => {
  it('initial value is an empty array', async () => {
    const { createDateScopedSession } = await import('./date-scoped-session');
    const session = createDateScopedSession(db.skin_observations, '2025-01-01');
    const rows = get(session);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(0);
  });

  it('emits rows whose date matches the scoped date', async () => {
    const { createDateScopedSession } = await import('./date-scoped-session');
    const date = '2025-02-10';
    const session = createDateScopedSession(db.skin_observations, date);
    const obs = makeObs('generic-test-match', date);
    await db.skin_observations.put(obs);
    const rows = await waitForRows(session, (rs) => rs.some((r) => r.id === obs.id));
    expect(rows.some((r) => r.id === obs.id)).toBe(true);
  });

  it('excludes rows with a different date', async () => {
    const { createDateScopedSession } = await import('./date-scoped-session');
    const targetDate = '2025-03-01';
    const otherDate = '2025-03-02';
    const session = createDateScopedSession(db.skin_observations, targetDate);
    const obsOther = makeObs('generic-test-other', otherDate);
    await db.skin_observations.put(obsOther);
    // Let liveQuery settle
    await new Promise((r) => setTimeout(r, 100));
    const rows = get(session);
    expect(rows.some((r) => r.id === obsOther.id)).toBe(false);
  });

  it('reflects a subsequent write reactively', async () => {
    const { createDateScopedSession } = await import('./date-scoped-session');
    const date = '2025-04-15';
    const session = createDateScopedSession(db.skin_observations, date);
    const first = makeObs('generic-test-reactive-1', date);
    const second = makeObs('generic-test-reactive-2', date);
    await db.skin_observations.put(first);
    await waitForRows(session, (rs) => rs.some((r) => r.id === first.id));
    await db.skin_observations.put(second);
    const rows = await waitForRows(session, (rs) => rs.some((r) => r.id === second.id));
    expect(rows.some((r) => r.id === first.id)).toBe(true);
    expect(rows.some((r) => r.id === second.id)).toBe(true);
  });
});
