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
  createChild(child: Omit<Child, 'id' | 'createdAt'>): Promise<Child>;
  linkUserToChild(userId: string, childId: string): Promise<void>;

  // Food Categories (read-only, seeded)
  getFoodCategories(): Promise<FoodCategory[]>;
  getFoodSubItems(categoryId: string): Promise<FoodSubItem[]>;

  // Food Logs
  getFoodLogs(childId: string, dateRange: { from: string; to: string }): Promise<FoodLog[]>;
  getFoodLogsForDate(childId: string, date: string): Promise<FoodLog[]>;
  createFoodLog(log: Omit<FoodLog, 'id' | 'createdAt'>): Promise<FoodLog>;
  deleteFoodLog(id: string): Promise<void>;
  getCurrentEliminationState(childId: string): Promise<Map<string, 'eliminated' | 'reintroduced'>>;

  // Meals
  getMealsForDate(userId: string, date: string): Promise<Meal[]>;
  getMealWithItems(mealId: string): Promise<(Meal & { items: MealItem[] }) | null>;
  createMeal(meal: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<MealItem, 'id'>[]): Promise<Meal>;
  updateMeal(id: string, updates: Partial<Meal>): Promise<Meal>;
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
