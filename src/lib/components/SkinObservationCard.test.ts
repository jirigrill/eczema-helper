import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { Observable } from 'dexie';
import type { SkinObservation } from '$lib/domain/models';
import type { SkinObservationRepository } from '$lib/domain/ports/skin-observation-repository';
import SkinObservationCard from './SkinObservationCard.svelte';

// jsdom doesn't implement URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

// ── Fake repo ─────────────────────────────────────────────────
// Returns a SkinObservationRepository whose liveQueryByDate emits
// `rows` synchronously — no real IndexedDB needed.
function makeObservable<T>(rows: T): Observable<T> {
  return {
    subscribe(observer: unknown) {
      const obs = observer as { next: (v: T) => void };
      obs.next(rows);
      return { unsubscribe: () => {}, closed: false };
    },
  } as unknown as Observable<T>;
}

function makeFakeRepo(rows: SkinObservation[]): SkinObservationRepository {
  return {
    save: vi.fn(async () => ({ ok: true as const, data: undefined })),
    listByDate: vi.fn(async () => ({ ok: true as const, data: rows })),
    liveQueryByDate: () => makeObservable(rows),
  };
}

function makeObservation(overrides?: Partial<SkinObservation>): SkinObservation {
  return {
    id: 'obs-1',
    date: '2026-05-31',
    createdAt: '2026-05-31T08:00:00.000Z',
    status: 'unchanged',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────

describe('SkinObservationCard', () => {
  it('shows empty-state text when no observations for the date', async () => {
    const repo = makeFakeRepo([]);
    const { getByText } = render(SkinObservationCard, { props: { date: '2026-05-31', repo } });
    await tick();
    expect(getByText('Zatím není záznam pro dnešek.')).toBeInTheDocument();
  });

  it('renders a saved observation status label', async () => {
    const repo = makeFakeRepo([makeObservation({ status: 'improved' })]);
    const { getByText } = render(SkinObservationCard, { props: { date: '2026-05-31', repo } });
    await tick();
    expect(getByText('Zlepšení')).toBeInTheDocument();
  });

  it('renders observation notes when present', async () => {
    const repo = makeFakeRepo([makeObservation({ notes: 'rash on left arm' })]);
    const { getByText } = render(SkinObservationCard, { props: { date: '2026-05-31', repo } });
    await tick();
    expect(getByText('rash on left arm')).toBeInTheDocument();
  });

  it('renders multiple observations for the same date', async () => {
    const repo = makeFakeRepo([
      makeObservation({ id: 'obs-1', status: 'improved' }),
      makeObservation({ id: 'obs-2', status: 'worsened' }),
    ]);
    const { getByText } = render(SkinObservationCard, { props: { date: '2026-05-31', repo } });
    await tick();
    expect(getByText('Zlepšení')).toBeInTheDocument();
    expect(getByText('Zhoršení')).toBeInTheDocument();
  });

  it('shows the section label "Stav ekzému"', async () => {
    const repo = makeFakeRepo([]);
    const { getByText } = render(SkinObservationCard, { props: { date: '2026-05-31', repo } });
    await tick();
    expect(getByText('Stav ekzému')).toBeInTheDocument();
  });
});
