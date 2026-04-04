import Dexie, { type Table } from 'dexie';
import type {
  Child,
  FoodCategory,
  FoodSubItem,
  FoodLog,
  Meal,
  MealItem,
  TrackingPhoto,
  AnalysisResult
} from '$lib/domain/models';

type PhotoBlob = {
  id: string;
  photoId: string;
  type: 'full' | 'thumbnail';
  blob: ArrayBuffer;
};

type PendingDelete = {
  id: string;
  table: string;
  recordId: string;
  createdAt: string;
};

export class EczemaTrackerDB extends Dexie {
  children!: Table<Child>;
  foodCategories!: Table<FoodCategory>;
  foodSubItems!: Table<FoodSubItem>;
  foodLogs!: Table<FoodLog>;
  meals!: Table<Meal>;
  mealItems!: Table<MealItem>;
  trackingPhotos!: Table<TrackingPhoto>;
  analysisResults!: Table<AnalysisResult>;
  photoBlobs!: Table<PhotoBlob>;
  pendingDeletes!: Table<PendingDelete>;

  constructor() {
    super('eczema-tracker');
    this.version(1).stores({
      children: 'id',
      foodCategories: 'id, slug',
      foodSubItems: 'id, categoryId',
      foodLogs: 'id, childId, date, categoryId, [childId+date], syncedAt',
      meals: 'id, userId, date, [userId+date]',
      mealItems: 'id, mealId',
      trackingPhotos: 'id, childId, date, photoType, [childId+date], syncedAt',
      analysisResults: 'id, childId, [photo1Id+photo2Id]',
      photoBlobs: 'id, photoId, type'
    });

    // v2: add pending deletes queue for offline-safe server deletions
    this.version(2).stores({
      pendingDeletes: 'id, table, recordId',
    });
  }
}

export const db = new EczemaTrackerDB();
