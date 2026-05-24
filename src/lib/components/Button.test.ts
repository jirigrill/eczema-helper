import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
  it('renders a button element', () => {
    const { getByRole } = render(Button);
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('calls onclick when clicked', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(Button, { props: { onclick } });
    await fireEvent.click(getByRole('button'));
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('disabled prop prevents click', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(Button, { props: { onclick, disabled: true } });
    const btn = getByRole('button');
    expect(btn).toBeDisabled();
    await fireEvent.click(btn);
    expect(onclick).not.toHaveBeenCalled();
  });

  it('ghost-sm variant is visually distinct from primary via data-variant', () => {
    const { getByRole, rerender } = render(Button, { props: { variant: 'primary' } });
    const btn = getByRole('button');
    expect(btn).toHaveAttribute('data-variant', 'primary');

    rerender({ variant: 'ghost-sm' });
    expect(btn).toHaveAttribute('data-variant', 'ghost-sm');
  });

  it('color prop is reflected via data-color', () => {
    const { getByRole } = render(Button, { props: { color: 'warning' } });
    expect(getByRole('button')).toHaveAttribute('data-color', 'warning');
  });
});
