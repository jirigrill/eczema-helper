import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { SkinPhoto } from '$lib/domain/models';
import SkinPhotoCard from './SkinPhotoCard.svelte';

// jsdom doesn't implement URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

function makePhoto(overrides?: Partial<SkinPhoto>): SkinPhoto {
  return {
    id: 'photo-1',
    observationId: 'obs-1',
    region: 'face',
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

  // Region label appears beneath each thumb — matches the gallery layout
  // shown on /skin so a user sees the same wording in both places (issue #371).
  it('renders the Czech region label beneath each thumb', async () => {
    const { getByText } = render(SkinPhotoCard, {
      props: { photos: [makePhoto({ id: 'p-face', region: 'face' })] },
    });
    await tick();
    expect(getByText('Tváře')).toBeInTheDocument();
  });

  it('renders distinct region labels for photos with different regions', async () => {
    const { getByText } = render(SkinPhotoCard, {
      props: {
        photos: [
          makePhoto({ id: 'p-arms', region: 'arms' }),
          makePhoto({ id: 'p-belly', region: 'belly' }),
        ],
      },
    });
    await tick();
    expect(getByText('Paže')).toBeInTheDocument();
    expect(getByText('Břicho')).toBeInTheDocument();
  });

  // Guards against the frozen-snippet bug class: the `right` count must track
  // the photos prop reactively, not freeze at its first-render value.
  it('photo count in the header updates when the photos prop changes', async () => {
    const { getByTestId, rerender } = render(SkinPhotoCard, {
      props: { photos: [makePhoto({ id: 'photo-1' })] },
    });
    await tick();
    expect(getByTestId('day-card-right').textContent).toContain('1 snímek');

    await rerender({
      photos: [
        makePhoto({ id: 'photo-1' }),
        makePhoto({ id: 'photo-2' }),
        makePhoto({ id: 'photo-3' }),
      ],
    });
    await tick();
    expect(getByTestId('day-card-right').textContent).toContain('3 snímky');
  });

  // Time overlay — the caption pill merges the region label with the parent
  // observation's H:MM (separator `·`) so two photos of the same region taken
  // at different evaluations on the same day are visually distinguishable.
  it('renders a caption pill combining region label and observation time', async () => {
    const { getAllByTestId } = render(SkinPhotoCard, {
      props: {
        photos: [makePhoto({ id: 'p-1', observationId: 'obs-1', region: 'face' })],
        observationTimes: new Map([['obs-1', '9:12']]),
      },
    });
    await tick();
    const pills = getAllByTestId('skin-photo-caption');
    expect(pills).toHaveLength(1);
    expect(pills[0]!.textContent).toBe('Tváře · 9:12');
  });

  it('renders distinct times for two photos of the same region taken at different observations', async () => {
    const { getAllByTestId } = render(SkinPhotoCard, {
      props: {
        photos: [
          makePhoto({ id: 'p-morning', observationId: 'obs-morning', region: 'face' }),
          makePhoto({ id: 'p-evening', observationId: 'obs-evening', region: 'face' }),
        ],
        observationTimes: new Map([
          ['obs-morning', '9:12'],
          ['obs-evening', '19:47'],
        ]),
      },
    });
    await tick();
    const texts = getAllByTestId('skin-photo-caption').map((el) => el.textContent);
    expect(texts).toEqual(['Tváře · 9:12', 'Tváře · 19:47']);
  });

  it('omits the time portion when observationTimes has no entry for the photo (orphan photo)', async () => {
    const { getByTestId } = render(SkinPhotoCard, {
      props: {
        photos: [makePhoto({ id: 'p-orphan', observationId: 'obs-missing', region: 'arms' })],
        observationTimes: new Map(),
      },
    });
    await tick();
    // Caption still renders — just without the ` · H:MM` suffix.
    const pill = getByTestId('skin-photo-caption');
    expect(pill.textContent).toBe('Paže');
    expect(pill.textContent).not.toContain('·');
  });

  it('omits the time portion when observationTimes prop is omitted entirely', async () => {
    const { getByTestId } = render(SkinPhotoCard, {
      props: { photos: [makePhoto({ region: 'face' })] },
    });
    await tick();
    const pill = getByTestId('skin-photo-caption');
    expect(pill.textContent).toBe('Tváře');
    expect(pill.textContent).not.toContain('·');
  });
});

// ── Lightbox ───────────────────────────────────────────────────────────────

describe('SkinPhotoCard — lightbox', () => {
  it('lightbox is not visible initially', async () => {
    const { container } = render(SkinPhotoCard, {
      props: { photos: [makePhoto({ id: 'photo-1' })] },
    });
    await tick();
    expect(container.querySelector('[data-testid="skin-photo-lightbox"]')).toBeNull();
  });

  it('tapping thumb at index 0 opens the lightbox', async () => {
    const { container } = render(SkinPhotoCard, {
      props: { photos: [makePhoto({ id: 'photo-1' })] },
    });
    await tick();

    await fireEvent.click(
      container.querySelector('[data-testid="skin-photo-thumb-0"]') as HTMLElement,
    );
    await tick();

    expect(container.querySelector('[data-testid="skin-photo-lightbox"]')).toBeInTheDocument();
  });

  it('× button closes the lightbox', async () => {
    const { container } = render(SkinPhotoCard, {
      props: { photos: [makePhoto({ id: 'photo-1' })] },
    });
    await tick();

    await fireEvent.click(
      container.querySelector('[data-testid="skin-photo-thumb-0"]') as HTMLElement,
    );
    await tick();
    expect(container.querySelector('[data-testid="skin-photo-lightbox"]')).toBeInTheDocument();

    await fireEvent.click(
      container.querySelector('[data-testid="skin-lightbox-close"]') as HTMLElement,
    );
    await tick();
    expect(container.querySelector('[data-testid="skin-photo-lightbox"]')).toBeNull();
  });

  it('tapping the backdrop closes the lightbox', async () => {
    const { container } = render(SkinPhotoCard, {
      props: { photos: [makePhoto({ id: 'photo-1' })] },
    });
    await tick();

    await fireEvent.click(
      container.querySelector('[data-testid="skin-photo-thumb-0"]') as HTMLElement,
    );
    await tick();

    await fireEvent.click(
      container.querySelector('[data-testid="skin-photo-lightbox"]') as HTMLElement,
    );
    await tick();
    expect(container.querySelector('[data-testid="skin-photo-lightbox"]')).toBeNull();
  });
});
