import type { CatalogAllergenId } from '$lib/domain/models';
import { categoryStrings, type CategoryStrings } from '$lib/strings/categories';

export type CategoryConfig = CategoryStrings & {
  icon: string; // emoji shown in category tiles and chips
};

export const categoryConfig = {
  dairy:        { ...categoryStrings.dairy,        icon: '🥛' },
  eggs:         { ...categoryStrings.eggs,         icon: '🥚' },
  wheat:        { ...categoryStrings.wheat,        icon: '🌾' },
  soy:          { ...categoryStrings.soy,          icon: '🫘' },
  nuts:         { ...categoryStrings.nuts,         icon: '🥜' },
  fish:         { ...categoryStrings.fish,         icon: '🐟' },
  shellfish:    { ...categoryStrings.shellfish,    icon: '🦐' },
  citrus:       { ...categoryStrings.citrus,       icon: '🍋' },
  chocolate:    { ...categoryStrings.chocolate,    icon: '🍫' },
  tomatoes:     { ...categoryStrings.tomatoes,     icon: '🍅' },
  strawberries: { ...categoryStrings.strawberries, icon: '🍓' },
  corn:         { ...categoryStrings.corn,         icon: '🌽' },
  sesame:       { ...categoryStrings.sesame,       icon: '🌰' },
  paprika:      { ...categoryStrings.paprika,      icon: '🌶️' },
} as const satisfies Record<CatalogAllergenId, CategoryConfig>;

/**
 * Lookup covering all catalog allergens (protocol and regional).
 * Returns undefined only for custom other: items.
 */
export function getCategoryConfig(allergenId: string): CategoryConfig | undefined {
  return (categoryConfig as Record<string, CategoryConfig>)[allergenId];
}
