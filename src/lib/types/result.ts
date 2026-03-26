/**
 * Result type for domain services.
 * Represents either a successful result with data or a failure with an error.
 * Used instead of throwing exceptions for expected failure cases.
 */
export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

/**
 * Helper to create a successful result.
 */
export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

/**
 * Helper to create a failed result.
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Unwrap a result, throwing if it's an error.
 * Use sparingly - prefer pattern matching on ok/error.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.data;
  }
  throw new Error(String(result.error));
}

/**
 * Map over a successful result.
 */
export function map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.data));
  }
  return result;
}

/**
 * FlatMap over a successful result.
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  if (result.ok) {
    return fn(result.data);
  }
  return result;
}
