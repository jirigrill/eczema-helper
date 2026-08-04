import { createRawSnippet } from 'svelte';

import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import InfoBanner from './InfoBanner.svelte';

describe('InfoBanner', () => {
  it('renders the wrapper element', () => {
    render(InfoBanner, { props: { variant: 'info' } });
    const wrapper = document.querySelector('[data-state]');
    expect(wrapper).not.toBeNull();
  });

  it.each([
    ['info', 'info'],
    ['success', 'success'],
    ['warning', 'warning'],
    ['danger', 'danger'],
  ] as const)('maps variant=%s to data-state=%s', (variant, state) => {
    const { container } = render(InfoBanner, { props: { variant } });
    expect(container.querySelector(`[data-state="${state}"]`)).not.toBeNull();
  });

  it('renders as a div when no href is provided', () => {
    const { container } = render(InfoBanner, { props: { variant: 'info' } });
    expect(container.querySelector('div[data-state]')).not.toBeNull();
    expect(container.querySelector('a[data-state]')).toBeNull();
  });

  it('renders as an anchor when href is provided', () => {
    const { container } = render(InfoBanner, { props: { variant: 'warning', href: '/settings' } });
    const anchor = container.querySelector('a[data-state="warning"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('/settings');
  });

  it('renders slot content', () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Bannertekst</p>' }));
    const { getByText } = render(InfoBanner, { props: { variant: 'warning', children } });
    expect(getByText('Bannertekst')).toBeInTheDocument();
  });
});
