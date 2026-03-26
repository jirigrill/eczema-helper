import { describe, it, expect } from 'vitest';
import type {
  User,
  Session,
  Child,
  UserChild,
  FoodCategory,
  FoodSubItem,
  FoodLog,
  Meal,
  MealItem,
  TrackingPhoto,
  SkinAnalysisResult,
  StoolAnalysisResult,
  PushSubscription,
  ReminderConfig,
  GoogleDocConnection
} from './models';

describe('FoodLog', () => {
  it('can be created with action: eliminated', () => {
    const log: FoodLog = {
      id: 'log-1',
      childId: 'child-1',
      date: '2025-04-01',
      categoryId: 'cat-1',
      action: 'eliminated',
      createdBy: 'user-1',
      createdAt: '2025-04-01T10:00:00Z',
      updatedAt: '2025-04-01T10:00:00Z'
    };
    expect(log.action).toBe('eliminated');
  });

  it('can be created with action: reintroduced', () => {
    const log: FoodLog = {
      id: 'log-2',
      childId: 'child-1',
      date: '2025-05-01',
      categoryId: 'cat-1',
      action: 'reintroduced',
      createdBy: 'user-1',
      createdAt: '2025-05-01T10:00:00Z',
      updatedAt: '2025-05-01T10:00:00Z'
    };
    expect(log.action).toBe('reintroduced');
  });

  it('date field matches ISO date format', () => {
    const log: FoodLog = {
      id: 'log-3',
      childId: 'child-1',
      date: '2025-04-01',
      categoryId: 'cat-1',
      action: 'eliminated',
      createdBy: 'user-1',
      createdAt: '2025-04-01T10:00:00Z',
      updatedAt: '2025-04-01T10:00:00Z'
    };
    expect(log.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('TrackingPhoto discriminated fields', () => {
  it('skin photo has bodyArea and severityManual fields available', () => {
    const photo: TrackingPhoto = {
      id: 'photo-1',
      childId: 'child-1',
      date: '2025-04-01',
      photoType: 'skin',
      bodyArea: 'face',
      severityManual: 3,
      encryptedBlobRef: 'blob-ref-1',
      createdBy: 'user-1',
      createdAt: '2025-04-01T10:00:00Z',
      updatedAt: '2025-04-01T10:00:00Z'
    };
    expect(photo.photoType).toBe('skin');
    expect(photo.bodyArea).toBe('face');
    expect(photo.severityManual).toBe(3);
  });

  it('stool photo has stoolColor, stoolConsistency, hasMucus, hasBlood fields available', () => {
    const photo: TrackingPhoto = {
      id: 'photo-2',
      childId: 'child-1',
      date: '2025-04-01',
      photoType: 'stool',
      stoolColor: 'yellow',
      stoolConsistency: 'soft',
      hasMucus: false,
      hasBlood: false,
      encryptedBlobRef: 'blob-ref-2',
      createdBy: 'user-1',
      createdAt: '2025-04-01T10:00:00Z',
      updatedAt: '2025-04-01T10:00:00Z'
    };
    expect(photo.photoType).toBe('stool');
    expect(photo.stoolColor).toBe('yellow');
    expect(photo.stoolConsistency).toBe('soft');
    expect(photo.hasMucus).toBe(false);
    expect(photo.hasBlood).toBe(false);
  });
});

describe('All model interfaces have required id field', () => {
  it('User has id as string', () => {
    const user: User = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hash',
      role: 'parent',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    };
    expect(typeof user.id).toBe('string');
  });

  it('Session has id as string', () => {
    const session: Session = {
      id: 'session-1',
      userId: 'user-1',
      expiresAt: '2025-02-01T00:00:00Z',
      createdAt: '2025-01-01T00:00:00Z'
    };
    expect(typeof session.id).toBe('string');
  });

  it('Child has id as string', () => {
    const child: Child = {
      id: 'child-1',
      name: 'Tomáš',
      birthDate: '2025-01-15',
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: '2025-01-15T00:00:00Z'
    };
    expect(typeof child.id).toBe('string');
  });

  it('UserChild has userId and childId', () => {
    const userChild: UserChild = { userId: 'user-1', childId: 'child-1' };
    expect(typeof userChild.userId).toBe('string');
    expect(typeof userChild.childId).toBe('string');
  });

  it('FoodCategory has id as string', () => {
    const cat: FoodCategory = {
      id: 'cat-1',
      slug: 'milk',
      nameCs: 'Mléko',
      icon: '🥛',
      sortOrder: 1,
      subItems: []
    };
    expect(typeof cat.id).toBe('string');
  });

  it('FoodSubItem has id as string', () => {
    const sub: FoodSubItem = {
      id: 'sub-1',
      categoryId: 'cat-1',
      slug: 'cows-milk',
      nameCs: 'Kravské mléko',
      sortOrder: 1
    };
    expect(typeof sub.id).toBe('string');
  });

  it('Meal has id as string', () => {
    const meal: Meal = {
      id: 'meal-1',
      userId: 'user-1',
      date: '2025-04-01',
      mealType: 'lunch',
      createdAt: '2025-04-01T12:00:00Z',
      updatedAt: '2025-04-01T12:00:00Z'
    };
    expect(typeof meal.id).toBe('string');
  });

  it('MealItem has id as string', () => {
    const item: MealItem = { id: 'item-1', mealId: 'meal-1' };
    expect(typeof item.id).toBe('string');
  });

  it('PushSubscription has id as string', () => {
    const sub: PushSubscription = {
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://push.example.com/123',
      keys: { p256dh: 'key', auth: 'auth' },
      createdAt: '2025-01-01T00:00:00Z'
    };
    expect(typeof sub.id).toBe('string');
  });

  it('GoogleDocConnection has id as string', () => {
    const conn: GoogleDocConnection = {
      id: 'conn-1',
      userId: 'user-1',
      googleEmail: 'user@gmail.com',
      refreshTokenEncrypted: 'encrypted-token',
      createdAt: '2025-01-01T00:00:00Z'
    };
    expect(typeof conn.id).toBe('string');
  });

  it('ReminderConfig has userId and childId', () => {
    const config: ReminderConfig = {
      userId: 'user-1',
      childId: 'child-1',
      foodLogReminder: true,
      foodLogReminderTime: '09:00',
      photoReminder: true,
      photoReminderIntervalDays: 7,
      photoReminderTime: '10:00'
    };
    expect(typeof config.userId).toBe('string');
  });
});

describe('AnalysisResult discriminated union', () => {
  it('SkinAnalysisResult has skin-specific fields', () => {
    const result: SkinAnalysisResult = {
      id: 'result-1',
      childId: 'child-1',
      photo1Id: 'photo-1',
      photo2Id: 'photo-2',
      analysisType: 'skin',
      trend: 'improving',
      explanation: 'Skin looks better',
      analyzerUsed: 'claude-vision',
      rednessScore: 2,
      affectedAreaPct: 15,
      drynessScore: 3,
      createdAt: '2025-04-01T10:00:00Z',
      updatedAt: '2025-04-01T10:00:00Z'
    };
    expect(result.analysisType).toBe('skin');
    expect(result.rednessScore).toBe(2);
    expect(result.affectedAreaPct).toBe(15);
    expect(result.drynessScore).toBe(3);
  });

  it('StoolAnalysisResult has stool-specific fields', () => {
    const result: StoolAnalysisResult = {
      id: 'result-2',
      childId: 'child-1',
      photo1Id: 'photo-3',
      photo2Id: 'photo-4',
      analysisType: 'stool',
      trend: 'stable',
      explanation: 'No significant change',
      analyzerUsed: 'claude-vision',
      colorAssessment: 'Normal yellow',
      consistencyAssessment: 'Soft',
      hasAbnormalities: false,
      createdAt: '2025-04-01T10:00:00Z',
      updatedAt: '2025-04-01T10:00:00Z'
    };
    expect(result.analysisType).toBe('stool');
    expect(result.colorAssessment).toBe('Normal yellow');
    expect(result.hasAbnormalities).toBe(false);
  });
});
