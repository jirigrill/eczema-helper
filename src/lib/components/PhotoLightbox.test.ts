import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PhotoLightbox from './PhotoLightbox.svelte';

describe('PhotoLightbox', () => {
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
