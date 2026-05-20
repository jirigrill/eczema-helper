import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import InfoBanner from './InfoBanner.svelte';

describe('InfoBanner', () => {
  it('renders the wrapper element', () => {
    render(InfoBanner, { props: { variant: 'info' } });
    const wrapper = document.querySelector('[data-variant]');
    expect(wrapper).not.toBeNull();
  });

  it.each(['info', 'success', 'warning', 'danger'] as const)(
    'sets data-variant="%s"',
    (variant) => {
      const { container } = render(InfoBanner, { props: { variant } });
      expect(container.querySelector(`[data-variant="${variant}"]`)).not.toBeNull();
    }
  );
});
