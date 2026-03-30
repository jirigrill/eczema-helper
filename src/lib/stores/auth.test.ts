import { describe, it, expect, beforeEach } from 'vitest';
import { authStore } from './auth.svelte';
import type { User } from '../domain/models';

const mockUser: User = {
  id: 'user-uuid',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: 'hashed',
  role: 'parent',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('auth store', () => {
  beforeEach(() => {
    authStore.setUser(null);
    authStore.setLoading(true);
  });

  describe('user', () => {
    it('starts as null', () => {
      expect(authStore.user).toBeNull();
    });

    it('can be set to a user object', () => {
      authStore.setUser(mockUser);
      expect(authStore.user).toStrictEqual(mockUser);
    });

    it('can be reset to null', () => {
      authStore.setUser(mockUser);
      authStore.setUser(null);
      expect(authStore.user).toBeNull();
    });
  });

  describe('loading', () => {
    it('starts as true', () => {
      expect(authStore.loading).toBe(true);
    });

    it('can be set to false', () => {
      authStore.setLoading(false);
      expect(authStore.loading).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when user is null', () => {
      authStore.setUser(null);
      expect(authStore.isAuthenticated).toBe(false);
    });

    it('returns true when user is set', () => {
      authStore.setUser(mockUser);
      expect(authStore.isAuthenticated).toBe(true);
    });
  });
});
