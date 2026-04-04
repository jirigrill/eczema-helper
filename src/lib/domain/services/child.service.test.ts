import { describe, it, expect, vi } from 'vitest';
import { createChildService } from './child.service';
import type { DataRepository } from '$lib/domain/ports/repository';
import type { Child } from '$lib/domain/models';
import { VALIDATION } from '$lib/config/constants';

const mockChild: Child = {
  id: 'child-123',
  name: 'Test Child',
  birthDate: '2025-01-15',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

function createMockRepository(overrides: Partial<DataRepository> = {}): DataRepository {
  return {
    getUserByEmail: vi.fn(),
    getUserById: vi.fn(),
    createUser: vi.fn(),
    getChildrenForUser: vi.fn(),
    getChildById: vi.fn(),
    getChildCount: vi.fn(),
    isChildOwner: vi.fn(),
    createChild: vi.fn(),
    createChildAtomic: vi.fn(),
    updateChild: vi.fn(),
    deleteChild: vi.fn(),
    linkUserToChild: vi.fn(),
    getFoodCategories: vi.fn(),
    getFoodSubItems: vi.fn(),
    getFoodLogs: vi.fn(),
    getFoodLogsForDate: vi.fn(),
    getFoodLogById: vi.fn(),
    createFoodLog: vi.fn(),
    updateFoodLog: vi.fn(),
    upsertFoodLog: vi.fn(),
    deleteFoodLog: vi.fn(),
    getCurrentEliminationState: vi.fn(),
    getMostRecentFoodLog: vi.fn(),
    getMealsForDate: vi.fn(),
    getMealById: vi.fn(),
    getMealWithItems: vi.fn(),
    createMeal: vi.fn(),
    updateMeal: vi.fn(),
    replaceMealItems: vi.fn(),
    deleteMeal: vi.fn(),
    getPhotos: vi.fn(),
    getPhotosForDate: vi.fn(),
    getPhotoById: vi.fn(),
    createPhoto: vi.fn(),
    deletePhoto: vi.fn(),
    getAnalysisResults: vi.fn(),
    getAnalysisForPhotoPair: vi.fn(),
    createAnalysisResult: vi.fn(),
    getPushSubscriptions: vi.fn(),
    savePushSubscription: vi.fn(),
    deletePushSubscription: vi.fn(),
    getReminderConfig: vi.fn(),
    saveReminderConfig: vi.fn(),
    ...overrides,
  };
}

describe('ChildService', () => {
  describe('getChildrenForUser', () => {
    it('returns children for user', async () => {
      const children = [mockChild];
      const repository = createMockRepository({
        getChildrenForUser: vi.fn().mockResolvedValue(children),
      });
      const childService = createChildService(repository);

      const result = await childService.getChildrenForUser('user-123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(children);
      }
      expect(repository.getChildrenForUser).toHaveBeenCalledWith('user-123');
    });

    it('returns empty array when user has no children', async () => {
      const repository = createMockRepository({
        getChildrenForUser: vi.fn().mockResolvedValue([]),
      });
      const childService = createChildService(repository);

      const result = await childService.getChildrenForUser('user-123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('createChild', () => {
    it('creates child with valid inputs', async () => {
      const repository = createMockRepository({
        createChildAtomic: vi.fn().mockResolvedValue(mockChild),
      });
      const childService = createChildService(repository);

      const result = await childService.createChild('user-123', 'Test Child', '2025-01-15');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(mockChild);
      }
      expect(repository.createChildAtomic).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          name: 'Test Child',
          birthDate: '2025-01-15',
        })
      );
    });

    it('returns CHILD_LIMIT_REACHED when user already has a child', async () => {
      const repository = createMockRepository({
        createChildAtomic: vi.fn().mockResolvedValue(null),
      });
      const childService = createChildService(repository);

      const result = await childService.createChild('user-123', 'Second Child', '2025-02-01');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CHILD_LIMIT_REACHED');
      }
    });

    it('rejects empty name', async () => {
      const repository = createMockRepository();
      const childService = createChildService(repository);

      const result = await childService.createChild('user-123', '   ', '2025-01-15');

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'VALIDATION_ERROR') {
        expect(result.error.message).toContain('Jméno');
      }
      expect(repository.createChildAtomic).not.toHaveBeenCalled();
    });

    it('rejects name exceeding max length', async () => {
      const repository = createMockRepository();
      const childService = createChildService(repository);
      const longName = 'a'.repeat(VALIDATION.MAX_NAME_LENGTH + 1);

      const result = await childService.createChild('user-123', longName, '2025-01-15');

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'VALIDATION_ERROR') {
        expect(result.error.message).toContain(String(VALIDATION.MAX_NAME_LENGTH));
      }
    });

    it('rejects invalid birth date', async () => {
      const repository = createMockRepository();
      const childService = createChildService(repository);

      const result = await childService.createChild('user-123', 'Test Child', 'not-a-date');

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'VALIDATION_ERROR') {
        expect(result.error.message).toContain('datum');
      }
    });

    it('trims whitespace from name', async () => {
      const repository = createMockRepository({
        createChildAtomic: vi.fn().mockResolvedValue(mockChild),
      });
      const childService = createChildService(repository);

      await childService.createChild('user-123', '  Trimmed Name  ', '2025-01-15');

      expect(repository.createChildAtomic).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ name: 'Trimmed Name' })
      );
    });
  });

  describe('updateChild', () => {
    it('updates child when user is owner', async () => {
      const updatedChild: Child = { ...mockChild, name: 'Updated Name' };
      const repository = createMockRepository({
        isChildOwner: vi.fn().mockResolvedValue(true),
        updateChild: vi.fn().mockResolvedValue(updatedChild),
      });
      const childService = createChildService(repository);

      const result = await childService.updateChild('user-123', 'child-123', { name: 'Updated Name' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.name).toBe('Updated Name');
      }
      expect(repository.updateChild).toHaveBeenCalledWith('child-123', { name: 'Updated Name' });
    });

    it('returns FORBIDDEN when user is not owner', async () => {
      const repository = createMockRepository({
        isChildOwner: vi.fn().mockResolvedValue(false),
      });
      const childService = createChildService(repository);

      const result = await childService.updateChild('user-123', 'child-456', { name: 'Hacked' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
      expect(repository.updateChild).not.toHaveBeenCalled();
    });

    it('rejects empty updates', async () => {
      const repository = createMockRepository({
        isChildOwner: vi.fn().mockResolvedValue(true),
      });
      const childService = createChildService(repository);

      const result = await childService.updateChild('user-123', 'child-123', {});

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'VALIDATION_ERROR') {
        expect(result.error.message).toContain('změny');
      }
    });

    it('validates name in updates', async () => {
      const repository = createMockRepository({
        isChildOwner: vi.fn().mockResolvedValue(true),
      });
      const childService = createChildService(repository);

      const result = await childService.updateChild('user-123', 'child-123', { name: '   ' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('validates birthDate in updates', async () => {
      const repository = createMockRepository({
        isChildOwner: vi.fn().mockResolvedValue(true),
      });
      const childService = createChildService(repository);

      const result = await childService.updateChild('user-123', 'child-123', { birthDate: 'invalid' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('allows partial updates (name only)', async () => {
      const updatedChild: Child = { ...mockChild, name: 'New Name' };
      const repository = createMockRepository({
        isChildOwner: vi.fn().mockResolvedValue(true),
        updateChild: vi.fn().mockResolvedValue(updatedChild),
      });
      const childService = createChildService(repository);

      const result = await childService.updateChild('user-123', 'child-123', { name: 'New Name' });

      expect(result.ok).toBe(true);
      expect(repository.updateChild).toHaveBeenCalledWith('child-123', { name: 'New Name' });
    });

    it('allows partial updates (birthDate only)', async () => {
      const updatedChild: Child = { ...mockChild, birthDate: '2025-06-01' };
      const repository = createMockRepository({
        isChildOwner: vi.fn().mockResolvedValue(true),
        updateChild: vi.fn().mockResolvedValue(updatedChild),
      });
      const childService = createChildService(repository);

      const result = await childService.updateChild('user-123', 'child-123', { birthDate: '2025-06-01' });

      expect(result.ok).toBe(true);
      expect(repository.updateChild).toHaveBeenCalledWith('child-123', { birthDate: '2025-06-01' });
    });
  });

  describe('deleteChild', () => {
    it('deletes child when user is owner', async () => {
      const repository = createMockRepository({
        isChildOwner: vi.fn().mockResolvedValue(true),
        deleteChild: vi.fn().mockResolvedValue(undefined),
      });
      const childService = createChildService(repository);

      const result = await childService.deleteChild('user-123', 'child-123');

      expect(result.ok).toBe(true);
      expect(repository.deleteChild).toHaveBeenCalledWith('child-123');
    });

    it('returns FORBIDDEN when user is not owner', async () => {
      const repository = createMockRepository({
        isChildOwner: vi.fn().mockResolvedValue(false),
      });
      const childService = createChildService(repository);

      const result = await childService.deleteChild('user-123', 'child-456');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
      expect(repository.deleteChild).not.toHaveBeenCalled();
    });
  });
});
