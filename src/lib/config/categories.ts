import type { ProtocolAllergenId } from '$lib/domain/models';
import { categoryStrings, regionalCategoryStrings, type CategoryStrings } from '$lib/strings/categories';

export type CategoryConfig = CategoryStrings & {
  icon: string; // emoji shown in category tiles and chips
};

/** Protocol allergen display config — keyed by ProtocolAllergenId (compile-time exhaustive). */
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
} as const satisfies Record<ProtocolAllergenId, CategoryConfig>;

/** Regional (protocol-less) allergen display config. */
const regionalCategoryConfig: Record<string, CategoryConfig> = {
  paprika: { ...regionalCategoryStrings.paprika, icon: '🌶️' },
};

/**
 * Unified lookup covering both protocol and regional allergens.
 * Returns undefined for truly unknown ids (custom other: items).
 */
export function getCategoryConfig(allergenId: string): CategoryConfig | undefined {
  return (categoryConfig as Record<string, CategoryConfig>)[allergenId]
    ?? regionalCategoryConfig[allergenId];
}
