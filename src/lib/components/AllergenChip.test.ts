import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import AllergenChip from './AllergenChip.svelte';

describe('AllergenChip', () => {
  it('renders a known category name', () => {
    const { getByText } = render(AllergenChip, { props: { slug: 'dairy' } });
    expect(getByText(/Mléčné výrobky/)).toBeInTheDocument();
  });

  it('renders a custom other: slug by stripping the prefix', () => {
    const { getByText } = render(AllergenChip, { props: { slug: 'other:Paprika' } });
    expect(getByText(/Paprika/)).toBeInTheDocument();
  });

  it('renders without throwing for unknown slug', () => {
    expect(() => render(AllergenChip, { props: { slug: 'unknown-slug' } })).not.toThrow();
  });

  it('defaults to neutral data-state', () => {
    const { container } = render(AllergenChip, { props: { slug: 'dairy' } });
    expect(container.querySelector('[data-state="neutral"]')).not.toBeNull();
  });

  it('applies warning data-state for color=warning', () => {
    const { container } = render(AllergenChip, { props: { slug: 'dairy', color: 'warning' } });
    expect(container.querySelector('[data-state="warning"]')).not.toBeNull();
  });

  it('applies success data-state for color=success', () => {
    const { container } = render(AllergenChip, { props: { slug: 'dairy', color: 'success' } });
    expect(container.querySelector('[data-state="success"]')).not.toBeNull();
  });

  it('always renders pill chrome', () => {
    const { container } = render(AllergenChip, { props: { slug: 'dairy' } });
    const span = container.querySelector('span');
    expect(span?.className).toContain('rounded-full');
  });
});
