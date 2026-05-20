import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
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

  it('applies muted styling when muted=true', () => {
    const { container } = render(AllergenChip, { props: { slug: 'dairy', muted: true } });
    expect(container.querySelector('.text-text-muted')).not.toBeNull();
  });
});
