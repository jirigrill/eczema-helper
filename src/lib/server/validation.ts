const MAX_TEXT_LENGTH = 1000;

export function isValidDateString(date: unknown): date is string {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function sanitizeOptionalString(
  value: unknown,
  maxLength = MAX_TEXT_LENGTH,
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.substring(0, maxLength);
}
