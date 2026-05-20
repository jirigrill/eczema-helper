import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
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

  it('renders slot content', () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Zatím žádný záznam.</p>' }));
    const { getByText } = render(EmptyStateCard, { props: { label: 'Test', children } });
    expect(getByText('Zatím žádný záznam.')).toBeInTheDocument();
  });
});
