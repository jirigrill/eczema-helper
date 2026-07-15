import type { Component } from 'svelte';
import type { MealType } from '$lib/domain/models';
import { mealStrings, type MealStrings } from '$lib/strings/meals';
import SunriseIcon from '$lib/components/icons/SunriseIcon.svelte';
import SunIcon from '$lib/components/icons/SunIcon.svelte';
import AppleIcon from '$lib/components/icons/AppleIcon.svelte';
import MoonIcon from '$lib/components/icons/MoonIcon.svelte';

export type MealConfig = MealStrings & {
  /**
   * Monochrome SVG icon component for the meal type. Inherits color via
   * `currentColor` from the parent's text-* class — see DESIGN.md (single
   * wine accent, monochrome SVGs elsewhere). Replaces the legacy emoji.
   */
  icon: Component<{ class?: string }>;
};

export const mealConfig = {
  breakfast: { ...mealStrings.breakfast, icon: SunriseIcon },
  lunch: { ...mealStrings.lunch, icon: SunIcon },
  snack: { ...mealStrings.snack, icon: AppleIcon },
  dinner: { ...mealStrings.dinner, icon: MoonIcon },
} as const satisfies Record<MealType, MealConfig>;
