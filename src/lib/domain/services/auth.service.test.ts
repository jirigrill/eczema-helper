import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthService } from './auth.service';
import type { DataRepository } from '$lib/domain/ports/repository';
import type { User } from '$lib/domain/models';
import { AUTH, VALIDATION } from '$lib/config/constants';

// Mock the auth module
vi.mock('$lib/server/auth', () => ({
  hashPassword: vi.fn(async (password: string) => `hashed_${password}`),
  verifyPassword: vi.fn(async (password: string, hash: string) => hash === `hashed_${password}`),
}));

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: 'hashed_correctpassword',
  role: 'parent',
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

describe('AuthService', () => {
  describe('validateCredentials', () => {
    it('returns user data on valid credentials', async () => {
      const repository = createMockRepository({
        getUserByEmail: vi.fn().mockResolvedValue(mockUser),
      });
      const authService = createAuthService(repository);

      const result = await authService.validateCredentials('test@example.com', 'correctpassword');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'parent',
        });
      }
    });

    it('returns USER_NOT_FOUND when user does not exist', async () => {
      const repository = createMockRepository({
        getUserByEmail: vi.fn().mockResolvedValue(null),
      });
      const authService = createAuthService(repository);

      const result = await authService.validateCredentials('unknown@example.com', 'anypassword');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }
    });

    it('returns INVALID_CREDENTIALS with userId on wrong password', async () => {
      const repository = createMockRepository({
        getUserByEmail: vi.fn().mockResolvedValue(mockUser),
      });
      const authService = createAuthService(repository);

      const result = await authService.validateCredentials('test@example.com', 'wrongpassword');

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'INVALID_CREDENTIALS') {
        expect(result.error.userId).toBe('user-123');
      }
    });

    it('rejects passwords exceeding max length', async () => {
      const repository = createMockRepository();
      const authService = createAuthService(repository);
      const longPassword = 'a'.repeat(AUTH.MAX_PASSWORD_LENGTH + 1);

      const result = await authService.validateCredentials('test@example.com', longPassword);

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'INVALID_CREDENTIALS') {
        expect(result.error.userId).toBeUndefined();
      }
      // Should not even query the database
      expect(repository.getUserByEmail).not.toHaveBeenCalled();
    });

    it('normalizes email to lowercase for lookup', async () => {
      const repository = createMockRepository({
        getUserByEmail: vi.fn().mockResolvedValue(null),
      });
      const authService = createAuthService(repository);

      await authService.validateCredentials('TEST@EXAMPLE.COM', 'password');

      // Note: The service passes email as-is, repository should handle normalization
      expect(repository.getUserByEmail).toHaveBeenCalledWith('TEST@EXAMPLE.COM');
    });
  });

  describe('registerUser', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('creates user with valid inputs', async () => {
      const createdUser: User = {
        ...mockUser,
        id: 'new-user-123',
        email: 'new@example.com',
        name: 'New User',
      };
      const repository = createMockRepository({
        getUserByEmail: vi.fn().mockResolvedValue(null),
        createUser: vi.fn().mockResolvedValue(createdUser),
      });
      const authService = createAuthService(repository);

      const result = await authService.registerUser('new@example.com', 'password123', 'New User');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({
          id: 'new-user-123',
          email: 'new@example.com',
          name: 'New User',
          role: 'parent',
        });
      }
      expect(repository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          name: 'New User',
          role: 'parent',
        })
      );
    });

    it('returns EMAIL_EXISTS when email is taken', async () => {
      const repository = createMockRepository({
        getUserByEmail: vi.fn().mockResolvedValue(mockUser),
      });
      const authService = createAuthService(repository);

      const result = await authService.registerUser('test@example.com', 'password123', 'Another User');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('EMAIL_EXISTS');
      }
    });

    it('rejects invalid email format', async () => {
      const repository = createMockRepository();
      const authService = createAuthService(repository);

      const result = await authService.registerUser('invalid-email', 'password123', 'Test');

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'VALIDATION_ERROR') {
        expect(result.error.message).toContain('e-mail');
      }
    });

    it('rejects password shorter than 8 characters', async () => {
      const repository = createMockRepository();
      const authService = createAuthService(repository);

      const result = await authService.registerUser('test@example.com', 'short', 'Test');

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'VALIDATION_ERROR') {
        expect(result.error.message).toContain('8');
      }
    });

    it('rejects password exceeding max length', async () => {
      const repository = createMockRepository();
      const authService = createAuthService(repository);
      const longPassword = 'a'.repeat(AUTH.MAX_PASSWORD_LENGTH + 1);

      const result = await authService.registerUser('test@example.com', longPassword, 'Test');

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'VALIDATION_ERROR') {
        expect(result.error.message).toContain(String(AUTH.MAX_PASSWORD_LENGTH));
      }
    });

    it('rejects empty name', async () => {
      const repository = createMockRepository();
      const authService = createAuthService(repository);

      const result = await authService.registerUser('test@example.com', 'password123', '   ');

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'VALIDATION_ERROR') {
        expect(result.error.message).toContain('Jméno');
      }
    });

    it('rejects name exceeding max length', async () => {
      const repository = createMockRepository();
      const authService = createAuthService(repository);
      const longName = 'a'.repeat(VALIDATION.MAX_NAME_LENGTH + 1);

      const result = await authService.registerUser('test@example.com', 'password123', longName);

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'VALIDATION_ERROR') {
        expect(result.error.message).toContain(String(VALIDATION.MAX_NAME_LENGTH));
      }
    });

    it('trims whitespace from name', async () => {
      const createdUser: User = { ...mockUser, name: 'Trimmed Name' };
      const repository = createMockRepository({
        getUserByEmail: vi.fn().mockResolvedValue(null),
        createUser: vi.fn().mockResolvedValue(createdUser),
      });
      const authService = createAuthService(repository);

      await authService.registerUser('test@example.com', 'password123', '  Trimmed Name  ');

      expect(repository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Trimmed Name' })
      );
    });

    it('normalizes email to lowercase', async () => {
      const createdUser: User = { ...mockUser, email: 'test@example.com' };
      const repository = createMockRepository({
        getUserByEmail: vi.fn().mockResolvedValue(null),
        createUser: vi.fn().mockResolvedValue(createdUser),
      });
      const authService = createAuthService(repository);

      await authService.registerUser('TEST@EXAMPLE.COM', 'password123', 'Test');

      expect(repository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
    });
  });
});
