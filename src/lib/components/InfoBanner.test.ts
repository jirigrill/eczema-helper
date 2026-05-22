import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import InfoBanner from './InfoBanner.svelte';

describe('InfoBanner', () => {
  it('renders the wrapper element', () => {
    render(InfoBanner, { props: { variant: 'info' } });
    const wrapper = document.querySelector('[data-state]');
    expect(wrapper).not.toBeNull();
  });

  it.each(['info', 'success', 'warning', 'danger'] as const)(
    'sets data-state="%s"',
    (variant) => {
      const { container } = render(InfoBanner, { props: { variant } });
      expect(container.querySelector(`[data-state="${variant}"]`)).not.toBeNull();
    }
  );

  it('renders as a div when no href is provided', () => {
    const { container } = render(InfoBanner, { props: { variant: 'info' } });
    expect(container.querySelector('div[data-state]')).not.toBeNull();
    expect(container.querySelector('a[data-state]')).toBeNull();
  });

  it('renders as an anchor when href is provided', () => {
    const { container } = render(InfoBanner, { props: { variant: 'warning', href: '/program' } });
    const anchor = container.querySelector('a[data-state="warning"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('/program');
  });

  it('renders slot content', () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Bannertekst</p>' }));
    const { getByText } = render(InfoBanner, { props: { variant: 'warning', children } });
    expect(getByText('Bannertekst')).toBeInTheDocument();
  });
});
