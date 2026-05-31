import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { SkinObservation } from '$lib/domain/models';

// ── liveQuery mock ────────────────────────────────────────────
// SkinObservationCard drives its list via liveQuery. We intercept it here
// so tests can push data without a real IndexedDB.
let liveObservations: SkinObservation[] = [];

vi.mock('dexie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('dexie')>();
  return {
    ...actual,
    liveQuery: vi.fn(() => ({
      subscribe(observer: { next: (v: SkinObservation[]) => void; error?: (e: unknown) => void }) {
        observer.next(liveObservations);
        return { unsubscribe: () => {} };
      },
    })),
  };
});

vi.mock('$lib/db/atopic-db', () => ({ db: {} }));

// ─────────────────────────────────────────────────────────────

function makeObservation(overrides?: Partial<SkinObservation>): SkinObservation {
  return {
    id: 'obs-1',
    date: '2026-05-31',
    createdAt: '2026-05-31T08:00:00.000Z',
    status: 'unchanged',
    ...overrides,
  };
}

beforeEach(() => {
  liveObservations = [];
});

describe('SkinObservationCard', () => {
  it('shows empty-state text when no observations for the date', async () => {
    liveObservations = [];
    const { default: SkinObservationCard } = await import('./SkinObservationCard.svelte');
    const { getByText } = render(SkinObservationCard, { props: { date: '2026-05-31' } });
    await tick();
    expect(getByText('Zatím není záznam pro dnešek.')).toBeInTheDocument();
  });

  it('renders a saved observation status label', async () => {
    liveObservations = [makeObservation({ status: 'improved' })];
    const { default: SkinObservationCard } = await import('./SkinObservationCard.svelte');
    const { getByText } = render(SkinObservationCard, { props: { date: '2026-05-31' } });
    await tick();
    expect(getByText('Zlepšení')).toBeInTheDocument();
  });

  it('renders observation notes when present', async () => {
    liveObservations = [makeObservation({ notes: 'rash on left arm' })];
    const { default: SkinObservationCard } = await import('./SkinObservationCard.svelte');
    const { getByText } = render(SkinObservationCard, { props: { date: '2026-05-31' } });
    await tick();
    expect(getByText('rash on left arm')).toBeInTheDocument();
  });

  it('renders multiple observations for the same date', async () => {
    liveObservations = [
      makeObservation({ id: 'obs-1', status: 'improved', createdAt: '2026-05-31T08:00:00.000Z' }),
      makeObservation({ id: 'obs-2', status: 'worsened', createdAt: '2026-05-31T18:00:00.000Z' }),
    ];
    const { default: SkinObservationCard } = await import('./SkinObservationCard.svelte');
    const { getByText } = render(SkinObservationCard, { props: { date: '2026-05-31' } });
    await tick();
    expect(getByText('Zlepšení')).toBeInTheDocument();
    expect(getByText('Zhoršení')).toBeInTheDocument();
  });

  it('shows the section label "Stav ekzému"', async () => {
    liveObservations = [];
    const { default: SkinObservationCard } = await import('./SkinObservationCard.svelte');
    const { getByText } = render(SkinObservationCard, { props: { date: '2026-05-31' } });
    await tick();
    expect(getByText('Stav ekzému')).toBeInTheDocument();
  });
});
