// User
export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'parent';
  createdAt: string;
  updatedAt: string;
};

/**
 * User data safe to send to the client (excludes sensitive fields like passwordHash).
 */
export type ClientUser = Pick<User, 'id' | 'email' | 'name' | 'role'>;

// Session
export type Session = {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

// Child
export type Child = {
  id: string;
  name: string;
  birthDate: string;
  createdAt: string;
  updatedAt: string;
};

// UserChild (junction)
export type UserChild = {
  userId: string;
  childId: string;
};

// FoodCategory
export type FoodCategory = {
  id: string;
  slug: string;
  nameCs: string;
  icon: string;
  sortOrder: number;
  subItems: FoodSubItem[];
};

// FoodSubItem
export type FoodSubItem = {
  id: string;
  categoryId: string;
  slug: string;
  nameCs: string;
  sortOrder: number;
};

// FoodLog
export type FoodLog = {
  id: string;
  childId: string;
  date: string;
  categoryId: string;
  subItemId?: string;
  action: 'eliminated' | 'reintroduced';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
};

// Meal
export type Meal = {
  id: string;
  userId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  label?: string;
  createdAt: string;
  updatedAt: string;
};

// MealItem
export type MealItem = {
  id: string;
  mealId: string;
  subItemId?: string;
  customName?: string;
  categoryId?: string;
};

// TrackingPhoto — discriminated union by photoType
type TrackingPhotoBase = {
  id: string;
  childId: string;
  date: string;
  notes?: string;
  encryptedBlobRef: string;
  thumbnailRef?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
};

export type BodyArea = 'face' | 'arms' | 'legs' | 'torso' | 'hands' | 'feet' | 'neck' | 'scalp';
export type StoolColor = 'yellow' | 'green' | 'brown' | 'red' | 'black' | 'white';
export type StoolConsistency = 'liquid' | 'soft' | 'formed' | 'hard';

export type SkinPhoto = TrackingPhotoBase & {
  photoType: 'skin';
  bodyArea: BodyArea;
  severityManual?: number;
};

export type StoolPhoto = TrackingPhotoBase & {
  photoType: 'stool';
  stoolColor?: StoolColor;
  stoolConsistency?: StoolConsistency;
  hasMucus?: boolean;
  hasBlood?: boolean;
};

export type TrackingPhoto = SkinPhoto | StoolPhoto;

// AnalysisResult — discriminated union
export type Trend = 'improving' | 'worsening' | 'stable';

type AnalysisResultBase = {
  id: string;
  childId: string;
  photo1Id: string;
  photo2Id: string;
  analysisType: 'skin' | 'stool';
  trend: Trend;
  explanation: string;
  analyzerUsed: string;
  createdAt: string;
  updatedAt: string;
};

export type SkinAnalysisResult = AnalysisResultBase & {
  analysisType: 'skin';
  rednessScore: number;
  affectedAreaPct: number;
  drynessScore: number;
};

export type StoolAnalysisResult = AnalysisResultBase & {
  analysisType: 'stool';
  colorAssessment: string;
  consistencyAssessment: string;
  hasAbnormalities: boolean;
};

export type AnalysisResult = SkinAnalysisResult | StoolAnalysisResult;

// PushSubscription
export type PushSubscription = {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
};

// ReminderConfig
export type ReminderConfig = {
  userId: string;
  childId: string;
  foodLogReminder: boolean;
  foodLogReminderTime: string;
  photoReminder: boolean;
  photoReminderIntervalDays: number;
  photoReminderTime: string;
};

// GoogleDocConnection
export type GoogleDocConnection = {
  id: string;
  userId: string;
  googleEmail: string;
  refreshTokenEncrypted: string;
  documentId?: string;
  folderId?: string;
  lastExportAt?: string;
  createdAt: string;
};
