import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import EmptyStateCard from './EmptyStateCard.svelte';

describe('EmptyStateCard', () => {
  it('renders the label', () => {
    const { getByText } = render(EmptyStateCard, { props: { label: 'Dnešní jídla' } });
    expect(getByText('Dnešní jídla')).toBeInTheDocument();
  });

  it('renders status text when provided', () => {
    const { getByText } = render(EmptyStateCard, {
      props: { label: 'Foto kůže', status: 'chybí' },
    });
    expect(getByText('chybí')).toBeInTheDocument();
  });

  it('omits status element when status is not provided', () => {
    const { queryByText } = render(EmptyStateCard, { props: { label: 'Test' } });
    expect(queryByText('chybí')).toBeNull();
  });
});
