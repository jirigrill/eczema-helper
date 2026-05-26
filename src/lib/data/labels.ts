export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Snídaně',
  lunch: 'Oběd',
  snack: 'Svačina',
  dinner: 'Večeře',
};

export const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  snack: '🍎',
  dinner: '🌙',
};

// Re-exported from strings layer — single source of truth per ADR-0014.
export { portionStrings as AMOUNT_LABELS } from '$lib/strings/portions';
