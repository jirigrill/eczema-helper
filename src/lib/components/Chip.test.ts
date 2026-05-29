import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Chip from './Chip.svelte';

describe('Chip', () => {
  it('renders a button element', () => {
    const { getByRole } = render(Chip, { props: { active: false } });
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('active=true sets data-active to true', () => {
    const { getByRole } = render(Chip, { props: { active: true } });
    expect(getByRole('button')).toHaveAttribute('data-active', 'true');
  });

  it('active=false sets data-active to false', () => {
    const { getByRole } = render(Chip, { props: { active: false } });
    expect(getByRole('button')).toHaveAttribute('data-active', 'false');
  });

  it('calls onclick when clicked', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(Chip, { props: { active: false, onclick } });
    await fireEvent.click(getByRole('button'));
    expect(onclick).toHaveBeenCalledOnce();
  });
});
