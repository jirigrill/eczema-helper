import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import FamilyDrillIn from './FamilyDrillIn.svelte';
import type { WorkingFood } from '$lib/domain/working-meal';

// ── Helpers ──────────────────────────────────────────────────

function idleFood(foodId: string, name: string): WorkingFood {
  return { foodId, name, state: { status: 'idle' } };
}
function editingFood(foodId: string, name: string): WorkingFood {
  return { foodId, name, state: { status: 'editing', amount: 'portion' } };
}
function confirmedFood(foodId: string, name: string): WorkingFood {
  return { foodId, name, state: { status: 'confirmed', amount: 'portion' }, cachedAmount: 'portion' };
}
function lockedFood(foodId: string, name: string): WorkingFood {
  return { foodId, name, state: { status: 'locked', prior: 'idle' } };
}

const baseProps = {
  familyId: 'fruit' as const,
  foods: [] as WorkingFood[],
  eliminatedAllergenIds: [] as string[],
  onFoodTap: vi.fn(),
  onAmountChange: vi.fn(),
  onPreparationChange: vi.fn(),
};

// ── Fruit family — catalog foods ─────────────────────────────

describe('FamilyDrillIn — fruit family', () => {
  it('renders allergen group header for citrus within fruit family', () => {
    const { getByText } = render(FamilyDrillIn, { props: baseProps });
    expect(getByText(/citrus/i)).toBeInTheDocument();
  });

  it('renders loose foods (jablko, hruška) as FoodToken buttons', () => {
    const { getByRole } = render(FamilyDrillIn, { props: baseProps });
    expect(getByRole('button', { name: /Jablko/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Hruška/ })).toBeInTheDocument();
  });

  it('calls onFoodTap with foodId and Czech name when food tapped', async () => {
    const onFoodTap = vi.fn();
    const { getByRole } = render(FamilyDrillIn, { props: { ...baseProps, onFoodTap } });
    await fireEvent.click(getByRole('button', { name: /Jablko/ }));
    await tick();
    expect(onFoodTap).toHaveBeenCalledWith('jablko', 'Jablko');
  });
});

// ── Working-food states ───────────────────────────────────────

describe('FamilyDrillIn — working-food state rendering', () => {
  it('idle food renders with no data-state="confirmed"', () => {
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, foods: [idleFood('jablko', 'Jablko')] },
    });
    const btn = getByRole('button', { name: /Jablko/ });
    expect(btn.closest('[data-state="confirmed"]')).toBeNull();
  });

  it('confirmed food renders with data-state="confirmed" wrapper', () => {
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, foods: [confirmedFood('jablko', 'Jablko')] },
    });
    const btn = getByRole('button', { name: /Jablko/ });
    expect(btn.closest('[data-state="confirmed"]')).not.toBeNull();
  });

  it('locked food button is disabled', () => {
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, foods: [lockedFood('jablko', 'Jablko')] },
    });
    const btn = getByRole('button', { name: /Jablko/ });
    expect(btn).toBeDisabled();
  });

  it('editing food shows FoodEditor (Množství + Příprava sections)', () => {
    const { getByText } = render(FamilyDrillIn, {
      props: { ...baseProps, foods: [editingFood('jablko', 'Jablko')] },
    });
    expect(getByText('Množství')).toBeInTheDocument();
    expect(getByText('Příprava')).toBeInTheDocument();
  });

  it('non-editing food does not show FoodEditor', () => {
    const { queryByText } = render(FamilyDrillIn, {
      props: { ...baseProps, foods: [idleFood('jablko', 'Jablko')] },
    });
    expect(queryByText('Množství')).not.toBeInTheDocument();
  });
});

// ── Eliminated allergen status ────────────────────────────────

describe('FamilyDrillIn — eliminated allergen rendering', () => {
  it('food in eliminated allergen shows "Vyloučeno" label', () => {
    const { getAllByText } = render(FamilyDrillIn, {
      props: { ...baseProps, eliminatedAllergenIds: ['citrus'] },
    });
    expect(getAllByText('Vyloučeno').length).toBeGreaterThan(0);
  });

  it('food in non-eliminated allergen does not show "Vyloučeno"', () => {
    const { queryByText } = render(FamilyDrillIn, {
      props: { ...baseProps, eliminatedAllergenIds: [] },
    });
    expect(queryByText('Vyloučeno')).not.toBeInTheDocument();
  });
});

// ── Custom (Vlastní) family ───────────────────────────────────

describe('FamilyDrillIn — custom family', () => {
  const customBase = { ...baseProps, familyId: 'custom' as const };

  it('lists previously-typed custom foods', () => {
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...customBase, customFoods: [{ foodId: 'other:kokos', name: 'Kokos' }] },
    });
    expect(getByRole('button', { name: /Kokos/ })).toBeInTheDocument();
  });

  it('calls onFoodTap with other: foodId when custom food tapped', async () => {
    const onFoodTap = vi.fn();
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...customBase, onFoodTap, customFoods: [{ foodId: 'other:kokos', name: 'Kokos' }] },
    });
    await fireEvent.click(getByRole('button', { name: /Kokos/ }));
    await tick();
    expect(onFoodTap).toHaveBeenCalledWith('other:kokos', 'Kokos');
  });

  it('shows empty hint when no custom foods exist', () => {
    const { getByText } = render(FamilyDrillIn, {
      props: { ...customBase, customFoods: [] },
    });
    expect(getByText(/Zatím žádné vlastní potraviny/)).toBeInTheDocument();
  });

  // ── AC1: text input + Přidat button ──────────────────────────

  it('shows a text input in the Vlastní drill-in', () => {
    const { getByRole } = render(FamilyDrillIn, { props: customBase });
    expect(getByRole('textbox')).toBeInTheDocument();
  });

  it('shows a "Přidat" button in the Vlastní drill-in', () => {
    const { getByRole } = render(FamilyDrillIn, { props: customBase });
    expect(getByRole('button', { name: /Přidat/ })).toBeInTheDocument();
  });

  it('does NOT show a text input in a non-custom family', () => {
    const { queryByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'fruit' as const },
    });
    expect(queryByRole('textbox')).not.toBeInTheDocument();
  });

  // ── AC2: new custom food → calls onNewCustomFood ──────────────

  it('typing a name and clicking Přidat calls onNewCustomFood with the typed text', async () => {
    const onNewCustomFood = vi.fn();
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...customBase, onNewCustomFood },
    });
    await fireEvent.input(getByRole('textbox'), { target: { value: 'Špenát' } });
    await fireEvent.click(getByRole('button', { name: /Přidat/ }));
    await tick();
    expect(onNewCustomFood).toHaveBeenCalledWith('Špenát');
  });

  it('Přidat button is disabled when the text input is empty', () => {
    const { getByRole } = render(FamilyDrillIn, { props: customBase });
    expect(getByRole('button', { name: /Přidat/ })).toBeDisabled();
  });

  it('clears the text input after Přidat is clicked', async () => {
    const onNewCustomFood = vi.fn();
    const { getByRole } = render(FamilyDrillIn, {
      props: { ...customBase, onNewCustomFood },
    });
    const input = getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'Špenát' } });
    await fireEvent.click(getByRole('button', { name: /Přidat/ }));
    await tick();
    expect((input as HTMLInputElement).value).toBe('');
  });
});
