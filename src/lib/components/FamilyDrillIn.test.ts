import { tick } from 'svelte';

import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import type { WorkingFood } from '$lib/domain/working-meal';

import FamilyDrillIn from './FamilyDrillIn.svelte';

// ── Helpers ──────────────────────────────────────────────────

function idleFood(foodId: string, name: string): WorkingFood {
  return { foodId, name, state: { status: 'idle' } };
}
function editingFood(foodId: string, name: string): WorkingFood {
  return { foodId, name, state: { status: 'editing', amount: 'portion' } };
}
function confirmedFood(foodId: string, name: string): WorkingFood {
  return {
    foodId,
    name,
    state: { status: 'confirmed', amount: 'portion' },
    cachedAmount: 'portion',
  };
}
function lockedFood(foodId: string, name: string): WorkingFood {
  return { foodId, name, state: { status: 'locked', prior: 'idle' } };
}

const baseProps = {
  familyId: 'fruit' as const,
  foods: [] as WorkingFood[],
  onFoodTap: vi.fn(),
  onAmountChange: vi.fn(),
  onPreparationChange: vi.fn(),
};

// ── Fruit family — small/uncurated → flat list ───────────────

describe('FamilyDrillIn — fruit family (flat, small/uncurated)', () => {
  it('renders no source-group headers (no familySources entry for fruit)', () => {
    const { queryByText } = render(FamilyDrillIn, { props: baseProps });
    // No "Kravské", "Rostlinné", "S lepkem" headers etc.
    expect(queryByText('Kravské')).not.toBeInTheDocument();
    expect(queryByText('Rostlinné')).not.toBeInTheDocument();
    expect(queryByText('Ostatní')).not.toBeInTheDocument();
  });

  it('does NOT render the legacy "bez alergenu" heading', () => {
    const { queryByText } = render(FamilyDrillIn, { props: baseProps });
    expect(queryByText(/bez alergenu/i)).not.toBeInTheDocument();
  });

  it('renders foods (Jablko, Hruška) as FoodTile buttons in flat mode', () => {
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

// ── Eggs family — flat-small (< 5 foods, no entry) ────────────

describe('FamilyDrillIn — eggs family (flat, < 5 foods)', () => {
  it('renders without source-group headers (3 foods, below ADR-0019 grouping threshold)', () => {
    const { queryByText, getByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'eggs' as const },
    });
    expect(getByRole('button', { name: /Celé vejce/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Bílek/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Žloutek/ })).toBeInTheDocument();
    expect(queryByText('Kravské')).not.toBeInTheDocument();
    expect(queryByText('Ostatní')).not.toBeInTheDocument();
  });
});

// ── Vegetables — large family with authored 6-group axis ──

describe('FamilyDrillIn — vegetables family (grouped by culinary axis)', () => {
  const vegBase = { ...baseProps, familyId: 'vegetables' as const };

  it('renders the 6-group culinary axis (kořenová / listová / plodová / cibulová / hlízová / košťálová)', () => {
    const { getAllByText } = render(FamilyDrillIn, { props: vegBase });
    for (const label of ['Kořenová', 'Listová', 'Plodová', 'Cibulová', 'Hlízová', 'Košťálová']) {
      expect(getAllByText(label).length, `'${label}' header missing`).toBeGreaterThan(0);
    }
  });

  it('does NOT render the legacy "bez alergenu" heading', () => {
    const { queryByText } = render(FamilyDrillIn, { props: vegBase });
    expect(queryByText(/bez alergenu/i)).not.toBeInTheDocument();
  });

  it('renders veg foods as buttons (grouped under their source headers)', () => {
    const { getByRole } = render(FamilyDrillIn, { props: vegBase });
    expect(getByRole('button', { name: /Brambory/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Mrkev/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Špenát/ })).toBeInTheDocument();
  });

  it('houby renders under Ostatní (mushrooms aren’t culinary vegetables)', () => {
    const { queryByText } = render(FamilyDrillIn, { props: vegBase });
    expect(queryByText('Ostatní')).toBeInTheDocument();
  });
});

// ── Mléko (dairy) — large family with authored source groups ──

describe('FamilyDrillIn — dairy family (grouped by source)', () => {
  const dairyBase = { ...baseProps, familyId: 'dairy' as const };

  it('renders authored source-group headers in authored order', () => {
    const { getAllByText } = render(FamilyDrillIn, { props: dairyBase });
    const headers = ['Kravské', 'Ovčí', 'Kozí', 'Rostlinné'];
    const indices = headers.map((h) => {
      const elements = getAllByText(h);
      expect(elements.length).toBeGreaterThan(0);
      return elements[0]!.compareDocumentPosition;
    });
    // Verify each header is present
    expect(indices.every(Boolean)).toBe(true);
  });

  it('renders Kravské header before Ovčí, Ovčí before Kozí, Kozí before Rostlinné', () => {
    const { getByText } = render(FamilyDrillIn, { props: dairyBase });
    const cow = getByText('Kravské');
    const sheep = getByText('Ovčí');
    const goat = getByText('Kozí');
    const plant = getByText('Rostlinné');

    const cowVsSheep = cow.compareDocumentPosition(sheep);
    const sheepVsGoat = sheep.compareDocumentPosition(goat);
    const goatVsPlant = goat.compareDocumentPosition(plant);

    expect(cowVsSheep & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sheepVsGoat & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(goatVsPlant & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('plant milks (sójové, mandlové, ovesné, kokosové) all render under Rostlinné despite differing allergenIds', () => {
    const { getByText, getByRole } = render(FamilyDrillIn, { props: dairyBase });
    const plantHeader = getByText('Rostlinné');
    const plantSection = plantHeader.parentElement;
    expect(plantSection).not.toBeNull();

    const sojove = getByRole('button', { name: /Sójové mléko/ });
    const mandlove = getByRole('button', { name: /Mandlové mléko/ });
    const ovesne = getByRole('button', { name: /Ovesné mléko/ });
    const kokosove = getByRole('button', { name: /Kokosové mléko/ });

    [sojove, mandlove, ovesne, kokosove].forEach((btn) => {
      expect(plantSection!.contains(btn)).toBe(true);
    });
  });

  it('does NOT render the legacy "bez alergenu" heading even in grouped mode', () => {
    const { queryByText } = render(FamilyDrillIn, { props: dairyBase });
    expect(queryByText(/bez alergenu/i)).not.toBeInTheDocument();
  });
});

// ── Ostatní bucket ────────────────────────────────────────────

describe('FamilyDrillIn — Ostatní (unsourced) bucket', () => {
  it('renders Ostatní as a trailing section when a grouped family has unsourced foods', () => {
    // vegetables: houby has no sourceGroup → renders under Ostatní (mushrooms ≠ culinary veg).
    const { getByText, getByRole } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'vegetables' as const },
    });
    const ostatni = getByText('Ostatní');
    expect(ostatni).toBeInTheDocument();
    const houby = getByRole('button', { name: /Houby/ });
    const ostatniSection = ostatni.parentElement;
    expect(ostatniSection!.contains(houby)).toBe(true);
  });

  it('Ostatní renders AFTER all authored groups', () => {
    const { getByText } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'vegetables' as const },
    });
    // Košťálová is the last authored vegetables group; Ostatní must follow it.
    const lastAuthored = getByText('Košťálová');
    const ostatni = getByText('Ostatní');
    const cmp = lastAuthored.compareDocumentPosition(ostatni);
    expect(cmp & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Ostatní does NOT appear when all foods are tagged', () => {
    const { queryByText } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'grains' as const },
    });
    expect(queryByText('Ostatní')).not.toBeInTheDocument();
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

  it('locked + prior=confirmed sibling renders data-state="locked-confirmed" so it stays visible', () => {
    const lockedConfirmed: WorkingFood = {
      foodId: 'jablko',
      name: 'Jablko',
      state: { status: 'locked', prior: 'confirmed' },
      cachedAmount: 'portion',
    };
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, foods: [lockedConfirmed] },
    });
    const tile = container.querySelector('[data-state="locked-confirmed"]');
    expect(tile).not.toBeNull();
  });

  it('locked + prior=idle sibling renders data-state="locked" (greyed out)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, foods: [lockedFood('jablko', 'Jablko')] },
    });
    const tile = container.querySelector('[data-state="locked"]');
    expect(tile).not.toBeNull();
    expect(container.querySelector('[data-state="locked-confirmed"]')).toBeNull();
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

// ── Alphabetical order within source groups (Czech locale) ──────

describe('FamilyDrillIn — alphabetical food order within groups', () => {
  /** Returns the visible Czech food names in DOM order, restricted to the given group. */
  function namesInGroup(container: HTMLElement, groupLabel: string): string[] {
    const headers = Array.from(container.querySelectorAll('span.uppercase')) as HTMLElement[];
    const header = headers.find((h) => h.textContent?.trim() === groupLabel);
    if (!header) return [];
    const groupRoot = header.parentElement;
    if (!groupRoot) return [];
    const buttons = Array.from(groupRoot.querySelectorAll('button')) as HTMLButtonElement[];
    return buttons
      .map((b) => b.getAttribute('aria-label') || b.textContent?.trim() || '')
      .filter(Boolean);
  }

  it('fruit · jádroviny sorted alphabetically (Hruška → Jablko)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'fruit' as const },
    });
    const names = namesInGroup(container as HTMLElement, 'Jádroviny');
    expect(names).toEqual(['Hruška', 'Jablko']);
  });

  it('fruit · peckoviny sorted alphabetically (Broskev → Meruňka → Švestka → Třešně)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'fruit' as const },
    });
    const names = namesInGroup(container as HTMLElement, 'Peckoviny');
    expect(names).toEqual(['Broskev', 'Meruňka', 'Švestka', 'Třešně']);
  });

  it('fruit · bobuloviny sorted alphabetically (Angrešt → Borůvky → Brusinky → Hrozny → Jahody → Maliny → Ostružiny → Rybíz)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'fruit' as const },
    });
    const names = namesInGroup(container as HTMLElement, 'Bobuloviny');
    expect(names).toEqual([
      'Angrešt',
      'Borůvky',
      'Brusinky',
      'Hrozny',
      'Jahody',
      'Maliny',
      'Ostružiny',
      'Rybíz',
    ]);
  });

  it('fruit · citrusy sorted alphabetically (Citron → Grapefruit → Mandarinka → Pomeranč)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'fruit' as const },
    });
    const names = namesInGroup(container as HTMLElement, 'Citrusy');
    expect(names).toEqual(['Citron', 'Grapefruit', 'Mandarinka', 'Pomeranč']);
  });

  it('fruit · tropické sorted alphabetically (Ananas → Avokádo → Banán → Kiwi → Mango → Meloun)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'fruit' as const },
    });
    const names = namesInGroup(container as HTMLElement, 'Tropické');
    expect(names).toEqual([
      'Ananas',
      'Avokádo',
      'Banán',
      'Granátové jablko',
      'Kiwi',
      'Mango',
      'Meloun',
    ]);
  });

  it('fish-seafood · sladkovodní sorted alphabetically (Kapr → Pangas → Pstruh → Sumec)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'fish-seafood' as const },
    });
    const names = namesInGroup(container as HTMLElement, 'Sladkovodní');
    expect(names).toEqual(['Kapr', 'Pangas', 'Pstruh', 'Sumec']);
  });

  it('fish-seafood · mořské sorted alphabetically (Halibut → Losos → Makrela → Sardinky → Sleď → Tilapie → Treska → Tuňák)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'fish-seafood' as const },
    });
    const names = namesInGroup(container as HTMLElement, 'Mořské');
    expect(names).toEqual([
      'Halibut',
      'Losos',
      'Makrela',
      'Sardinky',
      'Sleď',
      'Tilapie',
      'Treska',
      'Tuňák',
    ]);
  });

  it('fish-seafood · plody moře sorted alphabetically (Krab → Krevety → Mušle)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'fish-seafood' as const },
    });
    const names = namesInGroup(container as HTMLElement, 'Plody moře');
    expect(names).toEqual(['Krab', 'Krevety', 'Mušle']);
  });

  it('grains · s lepkem sorted alphabetically (Ječmen → Oves → Pšenice → Žito)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'grains' as const },
    });
    const names = namesInGroup(container as HTMLElement, 'S lepkem');
    expect(names).toEqual(['Ječmen', 'Oves', 'Pšenice', 'Žito']);
  });

  it('vegetables · plodová sorted alphabetically (Cuketa → Dýně → Lilek → Okurka → Paprika → Rajče)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'vegetables' as const },
    });
    const names = namesInGroup(container as HTMLElement, 'Plodová');
    expect(names).toEqual(['Cuketa', 'Dýně', 'Lilek', 'Okurka', 'Paprika', 'Rajče']);
  });
});

// ── Source-group order ────────────────────────────────────────

describe('FamilyDrillIn — source-group order', () => {
  /** Returns the visible source-group header labels in DOM order. */
  function groupHeaders(container: HTMLElement): string[] {
    const headers = Array.from(container.querySelectorAll('span.uppercase')) as HTMLElement[];
    return headers.map((h) => h.textContent?.trim() ?? '').filter(Boolean);
  }

  it('renders authored source groups in their curated order (Kravské first, Rostlinné last)', () => {
    const { container } = render(FamilyDrillIn, {
      props: { ...baseProps, familyId: 'dairy' as const },
    });
    const headers = groupHeaders(container as HTMLElement);
    // Authored order: Kravské → Ovčí → Kozí → Rostlinné
    expect(headers.indexOf('Kravské')).toBe(0);
    expect(headers.indexOf('Kravské')).toBeLessThan(headers.indexOf('Ovčí'));
    expect(headers.indexOf('Ovčí')).toBeLessThan(headers.indexOf('Kozí'));
    expect(headers.indexOf('Kozí')).toBeLessThan(headers.indexOf('Rostlinné'));
  });
});
