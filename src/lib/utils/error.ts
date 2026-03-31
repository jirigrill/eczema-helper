/**
 * Error handling utilities.
 *
 * Shared utilities for consistent error formatting across the codebase.
 */

/**
 * Format an unknown error into a loggable structure.
 *
 * @param error - The caught error (unknown type)
 * @returns Structured error object safe for logging
 */
export function formatError(error: unknown): { message: string; name?: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

/**
 * Format an error for logging (without stack trace).
 *
 * @param error - The caught error (unknown type)
 * @returns Minimal error object for log lines
 */
export function formatErrorMinimal(error: unknown): { message: string; name?: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: 'Unknown error' };
}
