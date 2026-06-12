import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import FoodToken from './FoodToken.svelte';

const baseProps = {
  name: 'Kravské mléko',
  state: 'idle' as const,
};

describe('FoodToken — visual states', () => {
  it('renders the food name', () => {
    const { getByText } = render(FoodToken, { props: baseProps });
    expect(getByText('Kravské mléko')).toBeInTheDocument();
  });

  it('idle: no data-state attribute (no eliminated)', () => {
    const { container } = render(FoodToken, { props: baseProps });
    expect(container.firstElementChild?.getAttribute('data-state')).toBeNull();
  });

  it('editing: has no special data-state', () => {
    const { container } = render(FoodToken, { props: { ...baseProps, state: 'editing' as const } });
    expect(container.firstElementChild?.getAttribute('data-state')).toBeNull();
  });

  it('confirmed: data-state="confirmed"', () => {
    const { container } = render(FoodToken, { props: { ...baseProps, state: 'confirmed' as const } });
    expect(container.firstElementChild?.getAttribute('data-state')).toBe('confirmed');
  });

  it('locked: data-state="locked"', () => {
    const { container } = render(FoodToken, { props: { ...baseProps, state: 'locked' as const } });
    expect(container.firstElementChild?.getAttribute('data-state')).toBe('locked');
  });

  it('idle with eliminatedStatus: data-state="danger"', () => {
    const { container } = render(FoodToken, { props: { ...baseProps, eliminatedStatus: 'danger' as const } });
    expect(container.firstElementChild?.getAttribute('data-state')).toBe('danger');
  });

  it('shows "Vyloučeno" label when idle + eliminatedStatus=danger', () => {
    const { getByText } = render(FoodToken, { props: { ...baseProps, eliminatedStatus: 'danger' as const } });
    expect(getByText('Vyloučeno')).toBeInTheDocument();
  });

  it('does not show "Vyloučeno" label when state is confirmed', () => {
    const { queryByText } = render(FoodToken, { props: { ...baseProps, state: 'confirmed' as const, eliminatedStatus: 'danger' as const } });
    expect(queryByText('Vyloučeno')).not.toBeInTheDocument();
  });
});

describe('FoodToken — interactivity', () => {
  it('calls onclick when tapped in idle state', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(FoodToken, { props: { ...baseProps, onclick } });
    await fireEvent.click(getByRole('button'));
    await tick();
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('does not call onclick when state is locked', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(FoodToken, { props: { ...baseProps, state: 'locked' as const, onclick } });
    const btn = getByRole('button');
    expect(btn).toBeDisabled();
    await fireEvent.click(btn);
    await tick();
    expect(onclick).not.toHaveBeenCalled();
  });

  it('calls onclick when tapped in editing state', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(FoodToken, { props: { ...baseProps, state: 'editing' as const, onclick } });
    await fireEvent.click(getByRole('button'));
    await tick();
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('calls onclick when tapped in confirmed state', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(FoodToken, { props: { ...baseProps, state: 'confirmed' as const, onclick } });
    await fireEvent.click(getByRole('button'));
    await tick();
    expect(onclick).toHaveBeenCalledOnce();
  });
});
