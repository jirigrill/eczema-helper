import type {
  User,
  Child,
  FoodCategory,
  FoodSubItem,
  FoodLog,
  Meal,
  MealItem,
  TrackingPhoto,
  AnalysisResult,
  PushSubscription,
  ReminderConfig
} from '$lib/domain/models';

export interface DataRepository {
  // Users
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;

  // Children
  getChildrenForUser(userId: string): Promise<Child[]>;
  getChildById(childId: string): Promise<Child | null>;
  getChildCount(userId: string): Promise<number>;
  isChildOwner(userId: string, childId: string): Promise<boolean>;
  createChild(child: Omit<Child, 'id' | 'createdAt'>): Promise<Child>;
  /**
   * Atomically create a child and link to user, enforcing single-child constraint.
   * Uses row-level locking to prevent race conditions.
   * Returns null if user already has a child.
   */
  createChildAtomic(userId: string, child: Omit<Child, 'id' | 'createdAt'>): Promise<Child | null>;
  updateChild(childId: string, updates: Partial<Pick<Child, 'name' | 'birthDate'>>): Promise<Child>;
  deleteChild(childId: string): Promise<void>;
  linkUserToChild(userId: string, childId: string): Promise<void>;

  // Food Categories (read-only, seeded)
  getFoodCategories(): Promise<FoodCategory[]>;
  getFoodSubItems(categoryId: string): Promise<FoodSubItem[]>;

  // Food Logs
  getFoodLogs(childId: string, dateRange: { from: string; to: string }): Promise<FoodLog[]>;
  getFoodLogsForDate(childId: string, date: string): Promise<FoodLog[]>;
  getFoodLogById(id: string): Promise<FoodLog | null>;
  createFoodLog(log: Omit<FoodLog, 'id' | 'createdAt'>): Promise<FoodLog>;
  updateFoodLog(id: string, updates: Partial<Pick<FoodLog, 'action' | 'notes'>>): Promise<FoodLog>;
  upsertFoodLog(log: FoodLog): Promise<FoodLog>;
  deleteFoodLog(id: string): Promise<void>;
  getCurrentEliminationState(childId: string): Promise<Map<string, 'eliminated' | 'reintroduced'>>;
  getMostRecentFoodLog(childId: string, categoryId: string, onOrBeforeDate: string): Promise<FoodLog | null>;

  // Meals
  getMealsForDate(userId: string, date: string): Promise<Meal[]>;
  getMealById(id: string): Promise<Meal | null>;
  getMealWithItems(mealId: string): Promise<(Meal & { items: MealItem[] }) | null>;
  createMeal(meal: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<MealItem, 'id'>[]): Promise<Meal>;
  updateMeal(id: string, updates: Partial<Meal>): Promise<Meal>;
  replaceMealItems(mealId: string, items: Omit<MealItem, 'id'>[]): Promise<void>;
  deleteMeal(id: string): Promise<void>;

  // Photos
  getPhotos(childId: string, dateRange: { from: string; to: string }): Promise<TrackingPhoto[]>;
  getPhotosForDate(childId: string, date: string): Promise<TrackingPhoto[]>;
  getPhotoById(id: string): Promise<TrackingPhoto | null>;
  createPhoto(photo: Omit<TrackingPhoto, 'id' | 'createdAt'>): Promise<TrackingPhoto>;
  deletePhoto(id: string): Promise<void>;

  // Analysis Results
  getAnalysisResults(childId: string): Promise<AnalysisResult[]>;
  getAnalysisForPhotoPair(photo1Id: string, photo2Id: string): Promise<AnalysisResult | null>;
  createAnalysisResult(result: Omit<AnalysisResult, 'id' | 'createdAt'>): Promise<AnalysisResult>;

  // Push Subscriptions
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  savePushSubscription(sub: Omit<PushSubscription, 'id' | 'createdAt'>): Promise<PushSubscription>;
  deletePushSubscription(id: string): Promise<void>;

  // Reminder Config
  getReminderConfig(userId: string, childId: string): Promise<ReminderConfig | null>;
  saveReminderConfig(config: ReminderConfig): Promise<void>;
}
