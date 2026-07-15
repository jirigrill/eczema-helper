import { describe, it, expect } from 'vitest';
import { familySources } from './family-sources';
import { FOODS } from '$lib/data/allergen-catalog/allergen-catalog';

describe('familySources axes', () => {
  it('fruit has jádroviny · peckoviny · bobuloviny · citrusy · tropické (in render order)', () => {
    const keys = (familySources as Record<string, readonly { key: string }[]>).fruit?.map(
      (s) => s.key,
    );
    expect(keys).toEqual(['jadroviny', 'peckoviny', 'bobuloviny', 'citrusy', 'tropicke']);
  });

  it('nuts-seeds has ořechy · semínka (in render order)', () => {
    const keys = (familySources as Record<string, readonly { key: string }[]>)['nuts-seeds']?.map(
      (s) => s.key,
    );
    expect(keys).toEqual(['orechy', 'seminka']);
  });

  it('fish-seafood has sladkovodní · mořské · plody moře (in render order)', () => {
    const keys = (familySources as Record<string, readonly { key: string }[]>)['fish-seafood']?.map(
      (s) => s.key,
    );
    expect(keys).toEqual(['sladkovodni', 'morske', 'plody-more']);
  });

  it('vegetables has 6 culinary groups (kořenová · listová · plodová · cibulová · hlízová · košťálová)', () => {
    const keys = (familySources as Record<string, readonly { key: string }[]>).vegetables?.map(
      (s) => s.key,
    );
    expect(keys).toEqual(['korenova', 'listova', 'plodova', 'cibulova', 'hlizova', 'kostalova']);
  });

  it('dairy axis (existing) reused, not redefined', () => {
    const keys = (familySources as Record<string, readonly { key: string }[]>).dairy!.map(
      (s) => s.key,
    );
    expect(keys).toEqual(['cow', 'sheep', 'goat', 'plant']);
  });

  it('grains axis (existing) reused, not redefined', () => {
    const keys = (familySources as Record<string, readonly { key: string }[]>).grains!.map(
      (s) => s.key,
    );
    expect(keys).toEqual(['gluten', 'gluten-free']);
  });
});

describe('source-axis integrity', () => {
  it('every Food.sourceGroup exists in its family axis', () => {
    type FoodLite = { id: string; familyId: string; sourceGroup?: string };
    for (const food of FOODS as readonly FoodLite[]) {
      if (food.sourceGroup === undefined) continue;
      const axis = (familySources as Record<string, readonly { key: string }[]>)[food.familyId];
      expect(
        axis,
        `food '${food.id}' has sourceGroup but family '${food.familyId}' has no axis`,
      ).toBeDefined();
      const keys = axis!.map((s) => s.key);
      expect(
        keys,
        `food '${food.id}' uses sourceGroup '${food.sourceGroup}' not declared in '${food.familyId}' axis`,
      ).toContain(food.sourceGroup);
    }
  });
});
