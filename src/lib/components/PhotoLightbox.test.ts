import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import PhotoLightbox from './PhotoLightbox.svelte';

describe('PhotoLightbox', () => {
  it('sits on the modal-content layer above the FAB (z-[70])', () => {
    const { getByTestId } = render(PhotoLightbox, {
      props: { src: 'blob:mock', onClose: vi.fn() },
    });

    expect(getByTestId('skin-photo-lightbox').className).toContain('z-[70]');
  });

  it('calls onClose when × button is clicked', async () => {
    const onClose = vi.fn();
    const { getByTestId } = render(PhotoLightbox, {
      props: { src: 'blob:mock', onClose },
    });

    await fireEvent.click(getByTestId('skin-lightbox-close'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked directly', async () => {
    const onClose = vi.fn();
    const { getByTestId } = render(PhotoLightbox, {
      props: { src: 'blob:mock', onClose },
    });

    await fireEvent.click(getByTestId('skin-photo-lightbox'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when inner image is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(PhotoLightbox, {
      props: { src: 'blob:mock', onClose },
    });

    const img = container.querySelector('img') as HTMLElement;
    await fireEvent.click(img);

    expect(onClose).not.toHaveBeenCalled();
  });
});
