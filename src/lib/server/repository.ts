/**
 * Singleton repository and service instances for server-side data access.
 *
 * This provides a single point of access to the PostgresRepository and domain services,
 * ensuring consistent data access patterns across all API routes.
 */

import { PostgresRepository } from '$lib/adapters/postgres';
import { createAuthService, createChildService } from '$lib/domain/services';

/**
 * Shared repository instance for all server-side operations.
 * Use this instead of direct SQL queries in routes.
 */
export const repository = new PostgresRepository();

/**
 * Domain services wired to the repository.
 * Use these for business logic in routes.
 */
export const authService = createAuthService(repository);
export const childService = createChildService(repository);
