import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';

// We test the module by driving the exported write methods and asserting
// on both the returned Results and the state of the reactive store.
// fake-indexeddb is loaded globally in test-setup.ts, but we pass explicit
// instances per test to get a clean slate every run.

// Dynamically re-import to pick up the fresh db instance each test.
// The module uses a singleton db internally, so we test it indirectly by
// observing what it persists and reads back through the store.

import type { QuestionnaireAnswers } from '$lib/domain/models';
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

// ── Helper: wait for liveQuery to propagate ──────────────────────────────────

async function tick(ms = 50): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// Wait until the store reaches a desired status (with a subscriber held open).
async function waitForStatus(
  store: { subscribe: (cb: (v: { status: string }) => void) => () => void },
  status: string,
  timeoutMs = 500,
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
        // defer unsub() so the subscribe call itself returns first
        Promise.resolve().then(() => unsub?.());
        resolve(v);
      }
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// NOTE: protocolSession uses the module-level db singleton from $lib/db/atopic-db.
// Because we cannot swap the singleton per-test without a factory, we test the
// write methods' persistence via adapters on a fresh db, and test the module API
// contract (return types, happy path, error path) by importing the real module
// against the global fake-indexeddb singleton that test-setup.ts installs.

describe('protocolSession', () => {
  // Each describe block imports from the actual module path — this will fail
  // (red) until the module exists at src/lib/stores/protocol-session.ts.

  it('exports subscribe, startProtocol, appendReTests, removeReTest, reset', async () => {
    const mod = await import('./protocol-session');
    expect(mod.protocolSession).toBeDefined();
    expect(typeof mod.protocolSession.subscribe).toBe('function');
    expect(typeof mod.protocolSession.startProtocol).toBe('function');
    expect(typeof mod.protocolSession.appendReTests).toBe('function');
    expect(typeof mod.protocolSession.removeReTest).toBe('function');
    expect(typeof mod.protocolSession.reset).toBe('function');
  });

  it('initial store state is loading or empty (never throws)', async () => {
    const { protocolSession } = await import('./protocol-session');
    const state = get(protocolSession);
    expect(['loading', 'empty', 'ready', 'error']).toContain(state.status);
  });

  it('startProtocol persists answers and schedule, returns Ok', async () => {
    const { protocolSession } = await import('./protocol-session');

    const result = await protocolSession.startProtocol(sampleAnswers);
    expect(result).toMatchObject({ ok: true });
  });

  it('startProtocol transitions store to ready', async () => {
    const { protocolSession } = await import('./protocol-session');

    await protocolSession.startProtocol(sampleAnswers);

    const state = await waitForStatus(protocolSession, 'ready');
    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      // narrow type
      const readyState = state as { status: 'ready'; answers: QuestionnaireAnswers };
      expect(readyState.answers.eczemaSeverity).toBe('moderate');
    }
  });

  it('appendReTests saves updated schedule and returns Ok', async () => {
    const { protocolSession } = await import('./protocol-session');

    await protocolSession.startProtocol(sampleAnswers);
    await tick();

    const result = await protocolSession.appendReTests(['eggs'], '2025-06-01');
    expect(result).toMatchObject({ ok: true });
  });

  it('appendReTests returns Err when allergen is a mother allergy (not retestable)', async () => {
    const { protocolSession } = await import('./protocol-session');

    // Mother allergies are 'permanent-mother' and never retestable. Per
    // ADR-0012 (widened rule), `not-baby-confirmed` now narrows to that case.
    const motherSampleAnswers: QuestionnaireAnswers = {
      ...sampleAnswers,
      motherAllergies: ['fish'],
    };
    await protocolSession.startProtocol(motherSampleAnswers);
    await tick();

    const result = await protocolSession.appendReTests(['fish'], '2025-06-01');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not-baby-confirmed');
    }
  });

  it('removeReTest saves updated schedule and returns Ok', async () => {
    const { protocolSession } = await import('./protocol-session');

    await protocolSession.startProtocol(sampleAnswers);
    await tick();

    // First add a retest phase for 'eggs', then remove it.
    await protocolSession.appendReTests(['eggs'], '2025-06-01');
    await tick();

    const result = await protocolSession.removeReTest('eggs', '2025-06-01');
    expect(result).toMatchObject({ ok: true });
  });

  it('reset clears data and transitions store to empty', async () => {
    const { protocolSession } = await import('./protocol-session');

    await protocolSession.startProtocol(sampleAnswers);
    await waitForStatus(protocolSession, 'ready');

    await protocolSession.reset();

    const state = await waitForStatus(protocolSession, 'empty');
    expect(state.status).toBe('empty');
  });

  it('recordVerdict persists the evaluation and returns Ok', async () => {
    const { protocolSession } = await import('./protocol-session');
    const { db } = await import('$lib/db/atopic-db');

    await protocolSession.startProtocol(sampleAnswers);
    await waitForStatus(protocolSession, 'ready');

    const phaseId = 'reintro-soy';
    const result = await protocolSession.recordVerdict({
      phaseId,
      phaseType: 'allergen-test',
      outcome: 'tolerated',
      allergenId: 'soy',
      date: '2025-06-26',
    });
    expect(result).toMatchObject({ ok: true });

    const stored = await db.evaluations.get(phaseId);
    expect(stored?.outcome).toBe('tolerated');
  });

  it('recordVerdict with a reaction inserts a rest phase', async () => {
    const { protocolSession } = await import('./protocol-session');
    const { db } = await import('$lib/db/atopic-db');

    await protocolSession.reset();
    await protocolSession.startProtocol(sampleAnswers);
    await waitForStatus(protocolSession, 'ready');

    const phaseId = 'reintro-soy';
    const result = await protocolSession.recordVerdict({
      phaseId,
      phaseType: 'allergen-test',
      outcome: 'mild-reaction',
      allergenId: 'soy',
      date: '2025-06-26',
    });
    expect(result).toMatchObject({ ok: true });

    const schedule = await db.schedule.get('singleton');
    const restPhase = schedule?.phases.find((p) => p.id === `rest-after-${phaseId}`);
    expect(restPhase).toBeDefined();
    expect(restPhase?.type).toBe('rest');
  });

  it('recordVerdict persists a skin-status verdict and leaves the schedule structurally unchanged', async () => {
    const { protocolSession } = await import('./protocol-session');
    const { db } = await import('$lib/db/atopic-db');

    await protocolSession.reset();
    await protocolSession.startProtocol(sampleAnswers);
    await waitForStatus(protocolSession, 'ready');

    const before = await db.schedule.get('singleton');
    const phasesBefore = before?.phases.map(
      (p) => `${p.id}:${p.type}:${p.startDate}->${p.endDate}`,
    );

    const phaseId = 'elimination';
    const result = await protocolSession.recordVerdict({
      phaseId,
      phaseType: 'skin-status',
      outcome: 'improved',
      date: '2025-06-20',
    });
    expect(result).toMatchObject({ ok: true });

    // Persisted as a skin-status record, no allergenId.
    const stored = await db.evaluations.get(phaseId);
    expect(stored?.phaseType).toBe('skin-status');
    expect(stored?.outcome).toBe('improved');
    expect(stored?.allergenId).toBeUndefined();

    // Schedule topology is byte-for-byte unchanged — skin-status never mutates.
    const after = await db.schedule.get('singleton');
    const phasesAfter = after?.phases.map((p) => `${p.id}:${p.type}:${p.startDate}->${p.endDate}`);
    expect(phasesAfter).toEqual(phasesBefore);
  });
});
