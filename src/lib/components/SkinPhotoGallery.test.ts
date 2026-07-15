import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { SkinPhotoInput, RegionId } from '$lib/domain/models';

// JSDOM doesn't support Blob → object URL; stub both directions.
let urlCounter = 0;
URL.createObjectURL = vi.fn(() => `blob:mock-${++urlCounter}`);
URL.revokeObjectURL = vi.fn();

function makePhoto(region: RegionId = 'face'): SkinPhotoInput {
  return { region, blob: new Blob(['x'], { type: 'image/jpeg' }) };
}

async function loadGallery() {
  const { default: SkinPhotoGallery } = await import('./SkinPhotoGallery.svelte');
  return SkinPhotoGallery;
}

beforeEach(() => {
  (URL.createObjectURL as ReturnType<typeof vi.fn>).mockClear?.();
  (URL.revokeObjectURL as ReturnType<typeof vi.fn>).mockClear?.();
});

// ── Gallery rendering ──────────────────────────────────────────────────────

describe('SkinPhotoGallery — gallery', () => {
  it('renders nothing (no grid) when photos is empty', async () => {
    const SkinPhotoGallery = await loadGallery();
    const { container } = render(SkinPhotoGallery, {
      props: { photos: [], onDelete: vi.fn() },
    });
    await tick();
    expect(container.querySelector('[data-testid="skin-photo-gallery"]')).toBeNull();
  });

  it('renders one thumb per photo in chronological (insertion) order', async () => {
    const SkinPhotoGallery = await loadGallery();
    const photos = [makePhoto('face'), makePhoto('arms'), makePhoto('belly')];
    const { container } = render(SkinPhotoGallery, {
      props: { photos, onDelete: vi.fn() },
    });
    await tick();
    const thumbs = container.querySelectorAll('[data-testid^="skin-photo-thumb-"]');
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0].getAttribute('data-testid')).toBe('skin-photo-thumb-0');
    expect(thumbs[1].getAttribute('data-testid')).toBe('skin-photo-thumb-1');
    expect(thumbs[2].getAttribute('data-testid')).toBe('skin-photo-thumb-2');
  });

  it('shows the Czech region label beneath each thumb', async () => {
    const SkinPhotoGallery = await loadGallery();
    const photos = [makePhoto('face'), makePhoto('arms')];
    const { getByText } = render(SkinPhotoGallery, {
      props: { photos, onDelete: vi.fn() },
    });
    await tick();
    // regionStrings: face → 'Tváře', arms → 'Paže'
    expect(getByText('Tváře')).toBeInTheDocument();
    expect(getByText('Paže')).toBeInTheDocument();
  });

  it('renders a × delete button per thumb', async () => {
    const SkinPhotoGallery = await loadGallery();
    const photos = [makePhoto('face'), makePhoto('neck')];
    const { container } = render(SkinPhotoGallery, {
      props: { photos, onDelete: vi.fn() },
    });
    await tick();
    const deletes = container.querySelectorAll('[data-testid^="skin-photo-delete-"]');
    expect(deletes).toHaveLength(2);
  });

  it('clicking × calls onDelete with the correct index', async () => {
    const SkinPhotoGallery = await loadGallery();
    const onDelete = vi.fn();
    const photos = [makePhoto('face'), makePhoto('arms'), makePhoto('neck')];
    const { container } = render(SkinPhotoGallery, {
      props: { photos, onDelete },
    });
    await tick();

    // Delete the middle photo (index 1)
    const btn = container.querySelector('[data-testid="skin-photo-delete-1"]') as HTMLElement;
    await fireEvent.click(btn);
    await tick();

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});

// ── Lightbox ───────────────────────────────────────────────────────────────

describe('SkinPhotoGallery — lightbox', () => {
  it('lightbox is not visible initially', async () => {
    const SkinPhotoGallery = await loadGallery();
    const { container } = render(SkinPhotoGallery, {
      props: { photos: [makePhoto('face')], onDelete: vi.fn() },
    });
    await tick();
    expect(container.querySelector('[data-testid="skin-photo-lightbox"]')).toBeNull();
  });

  it('tapping a thumb opens the lightbox', async () => {
    const SkinPhotoGallery = await loadGallery();
    const { container } = render(SkinPhotoGallery, {
      props: { photos: [makePhoto('face')], onDelete: vi.fn() },
    });
    await tick();

    const thumb = container.querySelector('[data-testid="skin-photo-thumb-0"]') as HTMLElement;
    await fireEvent.click(thumb);
    await tick();

    expect(container.querySelector('[data-testid="skin-photo-lightbox"]')).toBeInTheDocument();
  });

  it('lightbox × button closes the lightbox', async () => {
    const SkinPhotoGallery = await loadGallery();
    const { container } = render(SkinPhotoGallery, {
      props: { photos: [makePhoto('face')], onDelete: vi.fn() },
    });
    await tick();

    // Open
    await fireEvent.click(
      container.querySelector('[data-testid="skin-photo-thumb-0"]') as HTMLElement,
    );
    await tick();
    expect(container.querySelector('[data-testid="skin-photo-lightbox"]')).toBeInTheDocument();

    // Close via × button
    await fireEvent.click(
      container.querySelector('[data-testid="skin-lightbox-close"]') as HTMLElement,
    );
    await tick();
    expect(container.querySelector('[data-testid="skin-photo-lightbox"]')).toBeNull();
  });

  it('tapping the backdrop closes the lightbox', async () => {
    const SkinPhotoGallery = await loadGallery();
    const { container } = render(SkinPhotoGallery, {
      props: { photos: [makePhoto('face')], onDelete: vi.fn() },
    });
    await tick();

    // Open
    await fireEvent.click(
      container.querySelector('[data-testid="skin-photo-thumb-0"]') as HTMLElement,
    );
    await tick();

    // Click the backdrop (the lightbox overlay element itself, not the image)
    await fireEvent.click(
      container.querySelector('[data-testid="skin-photo-lightbox"]') as HTMLElement,
    );
    await tick();
    expect(container.querySelector('[data-testid="skin-photo-lightbox"]')).toBeNull();
  });
});
