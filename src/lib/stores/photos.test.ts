import { describe, it, expect, beforeEach } from 'vitest';
import { photosStore } from './photos.svelte';
import type { SkinPhoto, StoolPhoto } from '../domain/models';

const mockSkinPhoto: SkinPhoto = {
  id: 'photo-skin-uuid',
  childId: 'child-uuid',
  date: '2025-04-01',
  photoType: 'skin',
  bodyArea: 'face',
  severityManual: 3,
  encryptedBlobRef: 'blob-ref-1',
  createdBy: 'user-uuid',
  createdAt: '2025-04-01T10:00:00Z',
  updatedAt: '2025-04-01T10:00:00Z',
};

const mockStoolPhoto: StoolPhoto = {
  id: 'photo-stool-uuid',
  childId: 'child-uuid',
  date: '2025-04-01',
  photoType: 'stool',
  stoolColor: 'yellow',
  stoolConsistency: 'soft',
  hasMucus: false,
  hasBlood: false,
  encryptedBlobRef: 'blob-ref-2',
  createdBy: 'user-uuid',
  createdAt: '2025-04-01T11:00:00Z',
  updatedAt: '2025-04-01T11:00:00Z',
};

const mockSkinPhoto2: SkinPhoto = {
  id: 'photo-skin-uuid-2',
  childId: 'child-uuid',
  date: '2025-04-02',
  photoType: 'skin',
  bodyArea: 'arms',
  encryptedBlobRef: 'blob-ref-3',
  createdBy: 'user-uuid',
  createdAt: '2025-04-02T10:00:00Z',
  updatedAt: '2025-04-02T10:00:00Z',
};

describe('photos store', () => {
  beforeEach(() => {
    photosStore.setPhotos([]);
    photosStore.setFilter('all');
  });

  describe('photos', () => {
    it('starts as empty array', () => {
      expect(photosStore.photos).toHaveLength(0);
    });

    it('can be set to an array of photos', () => {
      photosStore.setPhotos([mockSkinPhoto, mockStoolPhoto]);
      expect(photosStore.photos).toHaveLength(2);
    });
  });

  describe('filter', () => {
    it('defaults to all', () => {
      expect(photosStore.filter).toBe('all');
    });

    it('can be set to skin', () => {
      photosStore.setFilter('skin');
      expect(photosStore.filter).toBe('skin');
    });

    it('can be set to stool', () => {
      photosStore.setFilter('stool');
      expect(photosStore.filter).toBe('stool');
    });
  });

  describe('filtered (derived)', () => {
    beforeEach(() => {
      photosStore.setPhotos([mockSkinPhoto, mockStoolPhoto, mockSkinPhoto2]);
    });

    it('returns all photos when filter is all', () => {
      photosStore.setFilter('all');
      expect(photosStore.filtered).toHaveLength(3);
    });

    it('returns only skin photos when filter is skin', () => {
      photosStore.setFilter('skin');
      expect(photosStore.filtered).toHaveLength(2);
      expect(photosStore.filtered.every(p => p.photoType === 'skin')).toBe(true);
    });

    it('returns only stool photos when filter is stool', () => {
      photosStore.setFilter('stool');
      expect(photosStore.filtered).toHaveLength(1);
      expect(photosStore.filtered[0].photoType).toBe('stool');
    });

    it('updates when photos change', () => {
      photosStore.setFilter('skin');
      expect(photosStore.filtered).toHaveLength(2);

      photosStore.setPhotos([mockSkinPhoto]);
      expect(photosStore.filtered).toHaveLength(1);
    });

    it('updates when filter changes', () => {
      expect(photosStore.filtered).toHaveLength(3);

      photosStore.setFilter('stool');
      expect(photosStore.filtered).toHaveLength(1);
    });
  });
});
