import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { SkinPhoto } from '$lib/domain/models';

// jsdom doesn't implement URL.createObjectURL — stub it
global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

// ── liveQuery mock ────────────────────────────────────────────
let livePhotos: SkinPhoto[] = [];

vi.mock('dexie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('dexie')>();
  return {
    ...actual,
    liveQuery: vi.fn(() => ({
      subscribe(observer: { next: (v: SkinPhoto[]) => void; error?: (e: unknown) => void }) {
        observer.next(livePhotos);
        return { unsubscribe: () => {} };
      },
    })),
  };
});

vi.mock('$lib/db/atopic-db', () => ({ db: {} }));

// ─────────────────────────────────────────────────────────────

function makePhoto(overrides?: Partial<SkinPhoto>): SkinPhoto {
  return {
    id: 'photo-1',
    date: '2026-05-31',
    capturedAt: '2026-05-31T08:00:00.000Z',
    blob: new Blob(['img'], { type: 'image/jpeg' }),
    ...overrides,
  };
}

beforeEach(() => {
  livePhotos = [];
});

describe('SkinPhotoCard', () => {
  it('shows empty-state text when no photos for the date', async () => {
    livePhotos = [];
    const { default: SkinPhotoCard } = await import('./SkinPhotoCard.svelte');
    const { getByText } = render(SkinPhotoCard, { props: { date: '2026-05-31' } });
    await tick();
    expect(getByText('Žádný snímek pro dnešek.')).toBeInTheDocument();
  });

  it('renders an img element for each saved photo', async () => {
    livePhotos = [
      makePhoto({ id: 'photo-1' }),
      makePhoto({ id: 'photo-2' }),
    ];
    const { default: SkinPhotoCard } = await import('./SkinPhotoCard.svelte');
    const { container } = render(SkinPhotoCard, { props: { date: '2026-05-31' } });
    await tick();
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(2);
  });

  it('shows the section label "Foto kůže"', async () => {
    livePhotos = [];
    const { default: SkinPhotoCard } = await import('./SkinPhotoCard.svelte');
    const { getByText } = render(SkinPhotoCard, { props: { date: '2026-05-31' } });
    await tick();
    expect(getByText('Foto kůže')).toBeInTheDocument();
  });

  it('thumbnail grid appears when photos exist', async () => {
    livePhotos = [makePhoto()];
    const { default: SkinPhotoCard } = await import('./SkinPhotoCard.svelte');
    const { container } = render(SkinPhotoCard, { props: { date: '2026-05-31' } });
    await tick();
    // 3-column thumbnail grid
    const grid = container.querySelector('.grid-cols-3');
    expect(grid).toBeInTheDocument();
  });
});
