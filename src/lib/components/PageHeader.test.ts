import { createRawSnippet } from 'svelte';

import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import PageHeader from './PageHeader.svelte';

describe('PageHeader', () => {
  it('renders the title', () => {
    const { getByText } = render(PageHeader, { props: { title: 'Nastavení' } });
    expect(getByText('Nastavení')).toBeInTheDocument();
  });

  it('renders back button when onBack is provided', () => {
    const onBack = vi.fn();
    const { getByText } = render(PageHeader, { props: { title: 'Test', onBack } });
    expect(getByText('‹')).toBeInTheDocument();
  });

  it('omits back button when onBack is not provided', () => {
    const { queryByText } = render(PageHeader, { props: { title: 'Test' } });
    expect(queryByText('‹')).toBeNull();
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    const { getByText } = render(PageHeader, { props: { title: 'Test', onBack } });
    await fireEvent.click(getByText('‹'));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders right snippet content when provided', () => {
    const right = createRawSnippet(() => ({ render: () => '<span>Pravá strana</span>' }));
    const { getByText } = render(PageHeader, { props: { title: 'Test', right } });
    expect(getByText('Pravá strana')).toBeInTheDocument();
  });

  // ── variant prop (issue #278) ──────────────────────────────
  // The default `compact` variant uses `body-bold` (text-sm) — the same
  // chrome `settings`/`skin` rely on. The `large` variant swaps the title to
  // the `page-heading` token (text-2xl bold), matching the day-page "Dnes"
  // style so the meal screen tells the mother which slot she's editing.

  it('renders title with body-bold class by default (compact variant)', () => {
    const { getByText } = render(PageHeader, { props: { title: 'Nastavení' } });
    const heading = getByText('Nastavení');
    expect(heading.classList.contains('body-bold')).toBe(true);
    expect(heading.classList.contains('page-heading')).toBe(false);
  });

  it('renders title with body-bold class when variant="compact" explicitly', () => {
    const { getByText } = render(PageHeader, { props: { title: 'Nastavení', variant: 'compact' } });
    const heading = getByText('Nastavení');
    expect(heading.classList.contains('body-bold')).toBe(true);
    expect(heading.classList.contains('page-heading')).toBe(false);
  });

  it('renders title with page-heading class when variant="large"', () => {
    const { getByText } = render(PageHeader, { props: { title: 'Oběd', variant: 'large' } });
    const heading = getByText('Oběd');
    expect(heading.classList.contains('page-heading')).toBe(true);
    expect(heading.classList.contains('body-bold')).toBe(false);
  });

  it('still renders the back button under the large variant', () => {
    const onBack = vi.fn();
    const { getByText } = render(PageHeader, {
      props: { title: 'Oběd', variant: 'large', onBack },
    });
    expect(getByText('‹')).toBeInTheDocument();
  });

  it('still renders the right snippet under the large variant', () => {
    const right = createRawSnippet(() => ({ render: () => '<span>Pravá strana</span>' }));
    const { getByText } = render(PageHeader, {
      props: { title: 'Oběd', variant: 'large', right },
    });
    expect(getByText('Pravá strana')).toBeInTheDocument();
  });

  // Back-chevron sizing: under `compact` it stays `text-lg` to match the
  // small heading; under `large` it scales up to `text-3xl` so it reads at
  // the same optical weight as the page-heading title (issue #278 follow-up).

  it('renders the back chevron at text-lg under the compact variant', () => {
    const onBack = vi.fn();
    const { getByText } = render(PageHeader, { props: { title: 'Nastavení', onBack } });
    const chevron = getByText('‹');
    expect(chevron.classList.contains('text-lg')).toBe(true);
    expect(chevron.classList.contains('text-3xl')).toBe(false);
  });

  it('renders the back chevron at text-3xl under the large variant', () => {
    const onBack = vi.fn();
    const { getByText } = render(PageHeader, {
      props: { title: 'Oběd', variant: 'large', onBack },
    });
    const chevron = getByText('‹');
    expect(chevron.classList.contains('text-3xl')).toBe(true);
    expect(chevron.classList.contains('text-lg')).toBe(false);
  });
});
