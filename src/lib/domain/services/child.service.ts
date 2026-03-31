/**
 * Child domain service.
 *
 * Pure business logic for child management.
 * Enforces single-child constraint and ownership rules.
 */

import type { DataRepository } from '$lib/domain/ports/repository';
import type { Child } from '$lib/domain/models';
import { VALIDATION } from '$lib/config/constants';

export type ChildError =
  | { code: 'CHILD_LIMIT_REACHED' }
  | { code: 'NOT_FOUND' }
  | { code: 'FORBIDDEN' }
  | { code: 'VALIDATION_ERROR'; message: string };

export type ChildResult<T> = { ok: true; data: T } | { ok: false; error: ChildError };

export interface ChildService {
  getChildrenForUser(userId: string): Promise<ChildResult<Child[]>>;

  createChild(
    userId: string,
    name: string,
    birthDate: string
  ): Promise<ChildResult<Child>>;

  updateChild(
    userId: string,
    childId: string,
    updates: { name?: string; birthDate?: string }
  ): Promise<ChildResult<Child>>;

  deleteChild(userId: string, childId: string): Promise<ChildResult<void>>;
}

export function createChildService(repository: DataRepository): ChildService {
  /**
   * Validate child name.
   */
  function validateName(name: string): ChildResult<string> {
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > VALIDATION.MAX_NAME_LENGTH) {
      return {
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: `Jméno dítěte je povinné (max. ${VALIDATION.MAX_NAME_LENGTH} znaků)` },
      };
    }
    return { ok: true, data: trimmed };
  }

  /**
   * Validate birth date.
   */
  function validateBirthDate(birthDate: string): ChildResult<string> {
    if (isNaN(Date.parse(birthDate))) {
      return {
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Neplatné datum narození' },
      };
    }
    return { ok: true, data: birthDate };
  }

  return {
    async getChildrenForUser(userId): Promise<ChildResult<Child[]>> {
      const children = await repository.getChildrenForUser(userId);
      return { ok: true, data: children };
    },

    async createChild(userId, name, birthDate): Promise<ChildResult<Child>> {
      // Validate inputs
      const nameResult = validateName(name);
      if (!nameResult.ok) return nameResult;

      const birthDateResult = validateBirthDate(birthDate);
      if (!birthDateResult.ok) return birthDateResult;

      // Create child atomically with single-child constraint
      // This uses row-level locking to prevent race conditions (TOCTOU)
      const child = await repository.createChildAtomic(userId, {
        name: nameResult.data,
        birthDate: birthDateResult.data,
        updatedAt: new Date().toISOString(),
      });

      if (!child) {
        return { ok: false, error: { code: 'CHILD_LIMIT_REACHED' } };
      }

      return { ok: true, data: child };
    },

    async updateChild(userId, childId, updates): Promise<ChildResult<Child>> {
      // Check ownership
      const isOwner = await repository.isChildOwner(userId, childId);
      if (!isOwner) {
        return { ok: false, error: { code: 'FORBIDDEN' } };
      }

      // Validate updates
      const validatedUpdates: { name?: string; birthDate?: string } = {};

      if (updates.name !== undefined) {
        const nameResult = validateName(updates.name);
        if (!nameResult.ok) return nameResult;
        validatedUpdates.name = nameResult.data;
      }

      if (updates.birthDate !== undefined) {
        const birthDateResult = validateBirthDate(updates.birthDate);
        if (!birthDateResult.ok) return birthDateResult;
        validatedUpdates.birthDate = birthDateResult.data;
      }

      if (Object.keys(validatedUpdates).length === 0) {
        return {
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'Žádné změny' },
        };
      }

      const child = await repository.updateChild(childId, validatedUpdates);
      return { ok: true, data: child };
    },

    async deleteChild(userId, childId): Promise<ChildResult<void>> {
      // Check ownership
      const isOwner = await repository.isChildOwner(userId, childId);
      if (!isOwner) {
        return { ok: false, error: { code: 'FORBIDDEN' } };
      }

      await repository.deleteChild(childId);
      return { ok: true, data: undefined };
    },
  };
}
