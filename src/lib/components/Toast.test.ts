import { tick } from 'svelte';

import { render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Toast from './Toast.svelte';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('renders the message', () => {
    const { getByRole } = render(Toast, { props: { message: 'Test bericht' } });
    expect(getByRole('alert')).toHaveTextContent('Test bericht');
  });

  it('renders a link when href and linkLabel are provided', () => {
    const { getByRole } = render(Toast, {
      props: { message: 'Uloženo', href: '/day', linkLabel: 'Zobrazit přehled →' },
    });
    const link = getByRole('link', { name: 'Zobrazit přehled →' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/day');
  });

  it('does not render a link when href is absent', () => {
    const { queryByRole } = render(Toast, { props: { message: 'Uloženo' } });
    expect(queryByRole('link')).not.toBeInTheDocument();
  });

  it('auto-dismisses after the duration', async () => {
    const { queryByRole } = render(Toast, { props: { message: 'Zmizí', duration: 3000 } });
    expect(queryByRole('alert')).toBeInTheDocument();
    vi.advanceTimersByTime(3000);
    await tick();
    expect(queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onClose when dismissed by timer', async () => {
    const onClose = vi.fn();
    render(Toast, { props: { message: 'Close callback', duration: 1000, onClose } });
    vi.advanceTimersByTime(1000);
    await tick();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('dismisses immediately when ✕ is clicked', async () => {
    const { queryByRole, getByLabelText } = render(Toast, { props: { message: 'Klikni' } });
    getByLabelText('Zavřít').click();
    await tick();
    expect(queryByRole('alert')).not.toBeInTheDocument();
  });
});
