/**
 * API request and response types for type-safe client-server communication.
 * These types define the JSON contract between frontend and backend.
 *
 * All API responses use the envelope pattern for consistent handling:
 * - Success: { ok: true, data: T }
 * - Error: { ok: false, error: string, code: ApiErrorCode }
 */

import type { Child } from '$lib/domain/models';

// ─────────────────────────────────────────────────────────────────────────────
// Envelope Pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Machine-readable error codes for API responses.
 * These allow clients to handle errors programmatically without parsing Czech messages.
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'CHILD_LIMIT_REACHED'
  | 'INTERNAL_ERROR';

/**
 * Success response envelope.
 */
export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

/**
 * Error response envelope.
 */
export type ApiError = {
  ok: false;
  error: string;
  code: ApiErrorCode;
};

/**
 * Rate-limited error with retry information.
 */
export type RateLimitedError = ApiError & {
  retryAfterSeconds: number;
};

/**
 * Union type for all API responses.
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Type guard for checking if an API response is successful.
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.ok === true;
}

/**
 * Type guard for checking if an API response is an error.
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return response.ok === false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────────────────────

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginData = {
  id: string;
  email: string;
  name: string;
  role: 'parent';
};

export type LoginResponse = ApiResponse<LoginData>;

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type RegisterData = LoginData;
export type RegisterResponse = ApiResponse<RegisterData>;

export type LogoutData = Record<string, never>;
export type LogoutResponse = ApiResponse<LogoutData>;

// ─────────────────────────────────────────────────────────────────────────────
// Children API
// ─────────────────────────────────────────────────────────────────────────────

export type ChildData = Omit<Child, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type GetChildrenData = ChildData[];
export type GetChildrenResponse = ApiResponse<GetChildrenData>;

export type CreateChildRequest = {
  name: string;
  birthDate: string;
};

export type CreateChildData = ChildData;
export type CreateChildResponse = ApiResponse<CreateChildData>;

export type UpdateChildRequest = {
  name?: string;
  birthDate?: string;
};

export type UpdateChildData = ChildData;
export type UpdateChildResponse = ApiResponse<UpdateChildData>;

export type DeleteChildData = Record<string, never>;
export type DeleteChildResponse = ApiResponse<DeleteChildData>;
