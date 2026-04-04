export const VALID_ACTIONS = ['eliminated', 'reintroduced'] as const;
export const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export function isValidAction(action: unknown): action is 'eliminated' | 'reintroduced' {
  return typeof action === 'string' && VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number]);
}

export function isValidMealType(type: unknown): type is 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  return typeof type === 'string' && VALID_MEAL_TYPES.includes(type as typeof VALID_MEAL_TYPES[number]);
}

export function isValidDateString(date: unknown): date is string {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

const MAX_TEXT_LENGTH = 1000;

/**
 * Sanitize an optional string field: trim whitespace and enforce max length.
 * Returns undefined if the value is not a string or is empty after trimming.
 */
export function sanitizeOptionalString(
  value: unknown,
  maxLength = MAX_TEXT_LENGTH,
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.substring(0, maxLength);
}
