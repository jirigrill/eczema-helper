/**
 * UUID validation utilities.
 *
 * Validates that route parameters and other IDs are properly formatted UUIDs
 * before using them in database queries.
 */

// UUID v4 format: 8-4-4-4-12 hex characters
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID v4.
 */
export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validate a UUID and return it, or throw an error if invalid.
 * Useful for fail-fast validation at API boundaries.
 */
export function validateUuid(value: string, fieldName = 'id'): string {
  if (!isValidUuid(value)) {
    throw new Error(`Invalid ${fieldName}: must be a valid UUID`);
  }
  return value;
}
