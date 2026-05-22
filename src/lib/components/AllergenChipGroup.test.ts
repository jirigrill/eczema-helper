import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import AllergenChipGroup from './AllergenChipGroup.svelte';

describe('AllergenChipGroup', () => {
  it('renders a chip for each slug', () => {
    const { container } = render(AllergenChipGroup, {
      props: { slugs: ['dairy', 'eggs'], color: 'neutral' },
    });
    expect(container.querySelectorAll('[data-state]')).toHaveLength(2);
  });

  it('renders nothing when slugs is empty', () => {
    const { container } = render(AllergenChipGroup, {
      props: { slugs: [], color: 'neutral' },
    });
    expect(container.querySelectorAll('[data-state]')).toHaveLength(0);
  });

  it('sets data-state="neutral" for color=neutral', () => {
    const { container } = render(AllergenChipGroup, {
      props: { slugs: ['dairy'], color: 'neutral' },
    });
    expect(container.querySelector('[data-state]')).toHaveAttribute('data-state', 'neutral');
  });

  it('sets data-state="danger" for color=danger', () => {
    const { container } = render(AllergenChipGroup, {
      props: { slugs: ['dairy'], color: 'danger' },
    });
    expect(container.querySelector('[data-state]')).toHaveAttribute('data-state', 'danger');
  });

  it('renders the category name inside each chip', () => {
    const { getByText } = render(AllergenChipGroup, {
      props: { slugs: ['dairy'], color: 'neutral' },
    });
    expect(getByText(/Mléčné výrobky/)).toBeInTheDocument();
  });
});
