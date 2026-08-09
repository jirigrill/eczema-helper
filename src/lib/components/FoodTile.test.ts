import { tick } from 'svelte';

import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import FoodTile from './FoodTile.svelte';

const baseProps = {
  name: 'Kravské mléko',
  state: 'idle' as const,
};

describe('FoodTile — visual states', () => {
  it('renders the food name', () => {
    const { getByText } = render(FoodTile, { props: baseProps });
    expect(getByText('Kravské mléko')).toBeInTheDocument();
  });

  it('idle: no data-state attribute', () => {
    const { container } = render(FoodTile, { props: baseProps });
    expect(container.firstElementChild?.getAttribute('data-state')).toBeNull();
  });

  it('editing: has no special data-state', () => {
    const { container } = render(FoodTile, { props: { ...baseProps, state: 'editing' as const } });
    expect(container.firstElementChild?.getAttribute('data-state')).toBeNull();
  });

  it('confirmed: data-state="confirmed"', () => {
    const { container } = render(FoodTile, {
      props: { ...baseProps, state: 'confirmed' as const },
    });
    expect(container.firstElementChild?.getAttribute('data-state')).toBe('confirmed');
  });

  it('locked: data-state="locked"', () => {
    const { container } = render(FoodTile, { props: { ...baseProps, state: 'locked' as const } });
    expect(container.firstElementChild?.getAttribute('data-state')).toBe('locked');
  });

  it('locked + lockedPrior=confirmed: data-state="locked-confirmed"', () => {
    const { container } = render(FoodTile, {
      props: { ...baseProps, state: 'locked' as const, lockedPrior: 'confirmed' as const },
    });
    expect(container.firstElementChild?.getAttribute('data-state')).toBe('locked-confirmed');
  });

  it('locked + lockedPrior=idle: still data-state="locked"', () => {
    const { container } = render(FoodTile, {
      props: { ...baseProps, state: 'locked' as const, lockedPrior: 'idle' as const },
    });
    expect(container.firstElementChild?.getAttribute('data-state')).toBe('locked');
  });
});

describe('FoodTile — interactivity', () => {
  it('calls onclick when tapped in idle state', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(FoodTile, { props: { ...baseProps, onclick } });
    await fireEvent.click(getByRole('button'));
    await tick();
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('does not call onclick when state is locked', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(FoodTile, {
      props: { ...baseProps, state: 'locked' as const, onclick },
    });
    const btn = getByRole('button');
    expect(btn).toBeDisabled();
    await fireEvent.click(btn);
    await tick();
    expect(onclick).not.toHaveBeenCalled();
  });

  it('calls onclick when tapped in editing state', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(FoodTile, {
      props: { ...baseProps, state: 'editing' as const, onclick },
    });
    await fireEvent.click(getByRole('button'));
    await tick();
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('calls onclick when tapped in confirmed state', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(FoodTile, {
      props: { ...baseProps, state: 'confirmed' as const, onclick },
    });
    await fireEvent.click(getByRole('button'));
    await tick();
    expect(onclick).toHaveBeenCalledOnce();
  });
});

describe('FoodTile — row affordances (working-list use)', () => {
  it('renders the porce summary when summary prop is provided', () => {
    const { getByText } = render(FoodTile, {
      props: { ...baseProps, state: 'confirmed' as const, summary: 'porce · vařené' },
    });
    expect(getByText('porce · vařené')).toBeInTheDocument();
  });

  it('does not render the summary slot when summary prop is omitted', () => {
    const { queryByText } = render(FoodTile, {
      props: { ...baseProps, state: 'confirmed' as const },
    });
    expect(queryByText('porce · vařené')).not.toBeInTheDocument();
  });

  it('renders a remove (×) button when onRemove handler is provided', () => {
    const onRemove = vi.fn();
    const { getByLabelText } = render(FoodTile, {
      props: { ...baseProps, state: 'confirmed' as const, onRemove },
    });
    expect(getByLabelText(/Odebrat Kravské mléko/)).toBeInTheDocument();
  });

  it('does not render a remove button when onRemove is omitted', () => {
    const { queryByLabelText } = render(FoodTile, {
      props: { ...baseProps, state: 'confirmed' as const },
    });
    expect(queryByLabelText(/Odebrat/)).not.toBeInTheDocument();
  });

  it('clicking the remove button fires onRemove without firing onclick', async () => {
    const onRemove = vi.fn();
    const onclick = vi.fn();
    const { getByLabelText } = render(FoodTile, {
      props: { ...baseProps, state: 'confirmed' as const, onRemove, onclick },
    });
    await fireEvent.click(getByLabelText(/Odebrat Kravské mléko/));
    await tick();
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onclick).not.toHaveBeenCalled();
  });
});
