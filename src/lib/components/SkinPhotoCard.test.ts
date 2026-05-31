import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { Observable } from 'dexie';
import type { SkinPhoto } from '$lib/domain/models';
import type { SkinPhotoStore } from '$lib/domain/ports/skin-photo-store';
import SkinPhotoCard from './SkinPhotoCard.svelte';

// jsdom doesn't implement URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

// ── Fake store ────────────────────────────────────────────────
function makeObservable<T>(rows: T): Observable<T> {
  return {
    subscribe(observer: unknown) {
      const obs = observer as { next: (v: T) => void };
      obs.next(rows);
      return { unsubscribe: () => {}, closed: false };
    },
  } as unknown as Observable<T>;
}

function makeFakeStore(rows: SkinPhoto[]): SkinPhotoStore {
  return {
    save: vi.fn(async () => ({ ok: true as const, data: undefined })),
    listByDate: vi.fn(async () => ({ ok: true as const, data: rows })),
    liveQueryByDate: () => makeObservable(rows),
  };
}

function makePhoto(overrides?: Partial<SkinPhoto>): SkinPhoto {
  return {
    id: 'photo-1',
    date: '2026-05-31',
    capturedAt: '2026-05-31T08:00:00.000Z',
    blob: new Blob(['img'], { type: 'image/jpeg' }),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────

describe('SkinPhotoCard', () => {
  it('shows empty-state text when no photos for the date', async () => {
    const photoStore = makeFakeStore([]);
    const { getByText } = render(SkinPhotoCard, { props: { date: '2026-05-31', photoStore } });
    await tick();
    expect(getByText('Žádný snímek pro dnešek.')).toBeInTheDocument();
  });

  it('renders an img element for each saved photo', async () => {
    const photoStore = makeFakeStore([makePhoto({ id: 'photo-1' }), makePhoto({ id: 'photo-2' })]);
    const { container } = render(SkinPhotoCard, { props: { date: '2026-05-31', photoStore } });
    await tick();
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('shows the section label "Foto kůže"', async () => {
    const photoStore = makeFakeStore([]);
    const { getByText } = render(SkinPhotoCard, { props: { date: '2026-05-31', photoStore } });
    await tick();
    expect(getByText('Foto kůže')).toBeInTheDocument();
  });

  it('thumbnail grid appears when photos exist', async () => {
    const photoStore = makeFakeStore([makePhoto()]);
    const { container } = render(SkinPhotoCard, { props: { date: '2026-05-31', photoStore } });
    await tick();
    expect(container.querySelector('.grid-cols-3')).toBeInTheDocument();
  });
});
