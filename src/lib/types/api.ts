/**
 * API request and response types for type-safe client-server communication.
 * These types define the JSON contract between frontend and backend.
 */

import type { Child } from '$lib/domain/models';

// ─────────────────────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────────────────────

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  id: string;
  email: string;
  name: string;
  role: 'parent';
};

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type RegisterResponse = LoginResponse;

export type LogoutResponse = {
  ok: true;
};

// ─────────────────────────────────────────────────────────────────────────────
// Children API
// ─────────────────────────────────────────────────────────────────────────────

export type ChildResponse = Omit<Child, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type GetChildrenResponse = ChildResponse[];

export type CreateChildRequest = {
  name: string;
  birthDate: string;
};

export type CreateChildResponse = ChildResponse;

export type UpdateChildRequest = {
  name?: string;
  birthDate?: string;
};

export type UpdateChildResponse = ChildResponse;

// ─────────────────────────────────────────────────────────────────────────────
// Error responses
// ─────────────────────────────────────────────────────────────────────────────

export type ApiError = {
  error: string;
};

export type RateLimitedError = ApiError & {
  retryAfterSeconds: number;
};

/**
 * Type guard for checking if an API response is an error.
 */
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ApiError).error === 'string'
  );
}
