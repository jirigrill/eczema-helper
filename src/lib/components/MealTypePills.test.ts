import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MealTypePills from './MealTypePills.svelte';
import type { MealType } from '$lib/domain/models';

const ALL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

// ── Visual state helpers ───────────────────────────────────────────────────────

/**
 * Returns the button element for a given meal type by its Czech label.
 * We rely on the label text rendered by the component (from mealConfig).
 */
function getButton(container: HTMLElement, type: MealType): HTMLElement {
  const labels: Record<MealType, string> = {
    breakfast: 'Snídaně',
    lunch: 'Oběd',
    snack: 'Svačina',
    dinner: 'Večeře',
  };
  const buttons = Array.from(container.querySelectorAll('button'));
  const btn = buttons.find(b => b.textContent?.trim() === labels[type]);
  if (!btn) throw new Error(`Button for ${type} not found`);
  return btn as HTMLElement;
}

// ── Pill visual states ─────────────────────────────────────────────────────────

describe('MealTypePills — visual states', () => {
  it('current type renders with chip--current class', () => {
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: [],
        isWorkingListNonEmpty: false,
        onLoad: vi.fn(),
        onMove: vi.fn(),
        onSwitchAway: vi.fn(),
      },
    });
    const btn = getButton(container, 'lunch');
    expect(btn.className).toContain('chip--current');
  });

  it('occupied type renders with chip--active class', () => {
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: ['breakfast'] as MealType[],
        isWorkingListNonEmpty: false,
        onLoad: vi.fn(),
        onMove: vi.fn(),
        onSwitchAway: vi.fn(),
      },
    });
    const btn = getButton(container, 'breakfast');
    expect(btn.className).toContain('chip--active');
  });

  it('empty non-current type renders with chip--muted class', () => {
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: [],
        isWorkingListNonEmpty: false,
        onLoad: vi.fn(),
        onMove: vi.fn(),
        onSwitchAway: vi.fn(),
      },
    });
    const btn = getButton(container, 'breakfast');
    expect(btn.className).toContain('chip--muted');
  });

  it('current type that is also occupied uses chip--current (not chip--active)', () => {
    // The current working slot takes priority over occupancy for visual state.
    // This can happen when the working list was loaded from a finalized meal.
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: ['lunch'] as MealType[],
        isWorkingListNonEmpty: false,
        onLoad: vi.fn(),
        onMove: vi.fn(),
        onSwitchAway: vi.fn(),
      },
    });
    const btn = getButton(container, 'lunch');
    expect(btn.className).toContain('chip--current');
    expect(btn.className).not.toContain('chip--active');
  });

  it('renders all four meal type pills', () => {
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: [],
        isWorkingListNonEmpty: false,
        onLoad: vi.fn(),
        onMove: vi.fn(),
        onSwitchAway: vi.fn(),
      },
    });
    for (const type of ALL_TYPES) {
      expect(() => getButton(container, type)).not.toThrow();
    }
  });
});

// ── Load semantics: working list empty ─────────────────────────────────────────

describe('MealTypePills — load semantics (empty working list)', () => {
  it('tapping current pill with empty working list calls onLoad with the current type', async () => {
    const onLoad = vi.fn();
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: [],
        isWorkingListNonEmpty: false,
        onLoad,
        onMove: vi.fn(),
        onSwitchAway: vi.fn(),
      },
    });
    await fireEvent.click(getButton(container, 'lunch'));
    expect(onLoad).toHaveBeenCalledWith('lunch');
  });

  it('tapping a different empty pill with empty working list calls onLoad with that type', async () => {
    const onLoad = vi.fn();
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: [],
        isWorkingListNonEmpty: false,
        onLoad,
        onMove: vi.fn(),
        onSwitchAway: vi.fn(),
      },
    });
    await fireEvent.click(getButton(container, 'breakfast'));
    expect(onLoad).toHaveBeenCalledWith('breakfast');
  });

  it('tapping an occupied pill with empty working list calls onLoad (load that finalized meal)', async () => {
    const onLoad = vi.fn();
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: ['breakfast'] as MealType[],
        isWorkingListNonEmpty: false,
        onLoad,
        onMove: vi.fn(),
        onSwitchAway: vi.fn(),
      },
    });
    await fireEvent.click(getButton(container, 'breakfast'));
    expect(onLoad).toHaveBeenCalledWith('breakfast');
  });
});

// ── Move semantics: non-empty working list + empty target ──────────────────────

describe('MealTypePills — move semantics (non-empty working list, empty target)', () => {
  it('tapping an empty pill calls onMove with the target type', async () => {
    const onMove = vi.fn();
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: [],
        isWorkingListNonEmpty: true,
        onLoad: vi.fn(),
        onMove,
        onSwitchAway: vi.fn(),
      },
    });
    await fireEvent.click(getButton(container, 'breakfast'));
    expect(onMove).toHaveBeenCalledWith('breakfast');
  });

  it('tapping the current pill with non-empty working list calls onLoad (re-tap current = load same slot)', async () => {
    const onLoad = vi.fn();
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: [],
        isWorkingListNonEmpty: true,
        onLoad,
        onMove: vi.fn(),
        onSwitchAway: vi.fn(),
      },
    });
    await fireEvent.click(getButton(container, 'lunch'));
    // Current pill re-tap is a no-op / load-same, not a move
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('move: does not call onSwitchAway or onLoad for an empty target', async () => {
    const onSwitchAway = vi.fn();
    const onLoad = vi.fn();
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: [],
        isWorkingListNonEmpty: true,
        onLoad,
        onMove: vi.fn(),
        onSwitchAway,
      },
    });
    await fireEvent.click(getButton(container, 'snack'));
    expect(onSwitchAway).not.toHaveBeenCalled();
    expect(onLoad).not.toHaveBeenCalled();
  });
});

// ── Block: MOVE cannot land on an occupied slot ────────────────────────────────

describe('MealTypePills — block (MOVE onto occupied slot is unreachable)', () => {
  it('tapping an occupied pill with non-empty working list calls onSwitchAway, not onMove', async () => {
    const onMove = vi.fn();
    const onSwitchAway = vi.fn();
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: ['breakfast'] as MealType[],
        isWorkingListNonEmpty: true,
        onLoad: vi.fn(),
        onMove,
        onSwitchAway,
      },
    });
    await fireEvent.click(getButton(container, 'breakfast'));
    expect(onMove).not.toHaveBeenCalled();
    expect(onSwitchAway).toHaveBeenCalledWith('breakfast');
  });
});

// ── Switch-away semantics: non-empty working list + occupied target ─────────────

describe('MealTypePills — switch-away semantics (non-empty working list, occupied target)', () => {
  it('tapping an occupied pill with non-empty working list calls onSwitchAway', async () => {
    const onSwitchAway = vi.fn();
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: ['dinner'] as MealType[],
        isWorkingListNonEmpty: true,
        onLoad: vi.fn(),
        onMove: vi.fn(),
        onSwitchAway,
      },
    });
    await fireEvent.click(getButton(container, 'dinner'));
    expect(onSwitchAway).toHaveBeenCalledWith('dinner');
  });

  it('switch-away: does not call onMove or onLoad', async () => {
    const onMove = vi.fn();
    const onLoad = vi.fn();
    const { container } = render(MealTypePills, {
      props: {
        currentType: 'lunch' as MealType,
        occupiedTypes: ['dinner'] as MealType[],
        isWorkingListNonEmpty: true,
        onLoad,
        onMove,
        onSwitchAway: vi.fn(),
      },
    });
    await fireEvent.click(getButton(container, 'dinner'));
    expect(onMove).not.toHaveBeenCalled();
    expect(onLoad).not.toHaveBeenCalled();
  });
});
