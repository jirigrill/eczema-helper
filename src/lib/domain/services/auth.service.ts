/**
 * Authentication domain service.
 *
 * Pure business logic for authentication operations.
 * No HTTP concerns, no direct database access - uses repository port.
 */

import type { DataRepository } from '$lib/domain/ports/repository';
import type { ClientUser } from '$lib/domain/models';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { AUTH, VALIDATION } from '$lib/config/constants';

// Specific error types for each operation
export type ValidateCredentialsError =
  | { code: 'INVALID_CREDENTIALS'; userId?: string }
  | { code: 'USER_NOT_FOUND' };

export type RegisterUserError =
  | { code: 'EMAIL_EXISTS' }
  | { code: 'VALIDATION_ERROR'; message: string };

// Union of all auth errors (for backward compatibility)
export type AuthError = ValidateCredentialsError | RegisterUserError;

// Specific result types
export type ValidateCredentialsResult<T> = { ok: true; data: T } | { ok: false; error: ValidateCredentialsError };
export type RegisterUserResult<T> = { ok: true; data: T } | { ok: false; error: RegisterUserError };

// Generic result type (for backward compatibility)
export type AuthResult<T> = { ok: true; data: T } | { ok: false; error: AuthError };

// Re-export ClientUser from models for convenience
export type { ClientUser } from '$lib/domain/models';

export interface AuthService {
  validateCredentials(
    email: string,
    password: string
  ): Promise<ValidateCredentialsResult<ClientUser>>;

  registerUser(
    email: string,
    password: string,
    name: string
  ): Promise<RegisterUserResult<ClientUser>>;
}

export function createAuthService(repository: DataRepository): AuthService {
  return {
    async validateCredentials(email, password): Promise<ValidateCredentialsResult<ClientUser>> {
      // Security: Prevent bcrypt DoS via extremely long passwords
      if (password.length > AUTH.MAX_PASSWORD_LENGTH) {
        return { ok: false, error: { code: 'INVALID_CREDENTIALS' } };
      }

      const user = await repository.getUserByEmail(email);

      if (!user) {
        // Security: Perform dummy password verification to prevent timing attacks
        await verifyPassword(password, '$2b$12$dummyhashtopreventtimingattacks');
        return { ok: false, error: { code: 'USER_NOT_FOUND' } };
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        // Include userId so caller can handle rate limiting without re-fetching
        return { ok: false, error: { code: 'INVALID_CREDENTIALS', userId: user.id } };
      }

      return {
        ok: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    },

    async registerUser(email, password, name): Promise<RegisterUserResult<ClientUser>> {
      // Validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Neplatný e-mail' } };
      }

      if (password.length < 8 || password.length > AUTH.MAX_PASSWORD_LENGTH) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: `Heslo musí mít 8-${AUTH.MAX_PASSWORD_LENGTH} znaků` } };
      }

      const trimmedName = name.trim();
      if (trimmedName.length === 0 || trimmedName.length > VALIDATION.MAX_NAME_LENGTH) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: `Jméno je povinné (max. ${VALIDATION.MAX_NAME_LENGTH} znaků)` } };
      }

      // Check for existing user
      const existing = await repository.getUserByEmail(email);
      if (existing) {
        return { ok: false, error: { code: 'EMAIL_EXISTS' } };
      }

      // Create user
      const passwordHash = await hashPassword(password);
      const user = await repository.createUser({
        email: email.toLowerCase(),
        name: trimmedName,
        passwordHash,
        role: 'parent',
        updatedAt: new Date().toISOString(),
      });

      return {
        ok: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    },
  };
}
