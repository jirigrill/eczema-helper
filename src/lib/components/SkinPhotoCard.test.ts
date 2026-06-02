import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { SkinPhoto } from '$lib/domain/models';
import SkinPhotoCard from './SkinPhotoCard.svelte';

// jsdom doesn't implement URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

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
  it('shows empty-state text when no photos are passed', async () => {
    const { getByText } = render(SkinPhotoCard, { props: { photos: [] } });
    await tick();
    expect(getByText('Žádný snímek pro dnešek.')).toBeInTheDocument();
  });

  it('renders an img element for each photo', async () => {
    const { container } = render(SkinPhotoCard, {
      props: { photos: [makePhoto({ id: 'photo-1' }), makePhoto({ id: 'photo-2' })] },
    });
    await tick();
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('shows the section label "Foto kůže"', async () => {
    const { getByText } = render(SkinPhotoCard, { props: { photos: [] } });
    await tick();
    expect(getByText('Foto kůže')).toBeInTheDocument();
  });

  it('thumbnail grid appears when photos exist', async () => {
    const { container } = render(SkinPhotoCard, { props: { photos: [makePhoto()] } });
    await tick();
    expect(container.querySelector('.grid-cols-3')).toBeInTheDocument();
  });
});
