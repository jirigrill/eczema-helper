/**
 * API request and response types for type-safe client-server communication.
 * These types define the JSON contract between frontend and backend.
 *
 * All API responses use the envelope pattern for consistent handling:
 * - Success: { ok: true, data: T }
 * - Error: { ok: false, error: string, code: ApiErrorCode }
 */

import type { Child } from '$lib/domain/models';
import type { ApiErrorCode } from '$lib/config/constants';

// Re-export for convenience
export type { ApiErrorCode } from '$lib/config/constants';

/**
 * Success response envelope.
 */
export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

/**
 * Error response envelope.
 */
export type ApiError = {
  ok: false;
  error: string;
  code: ApiErrorCode;
};

/**
 * Rate-limited error with retry information.
 */
export type RateLimitedError = ApiError & {
  retryAfterSeconds: number;
};

/**
 * Union type for all API responses.
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Type guard for checking if an API response is successful.
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.ok === true;
}

/**
 * Type guard for checking if an API response is an error.
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return response.ok === false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────────────────────

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginData = {
  id: string;
  email: string;
  name: string;
  role: 'parent';
};

export type LoginResponse = ApiResponse<LoginData>;

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type RegisterData = LoginData;
export type RegisterResponse = ApiResponse<RegisterData>;

export type LogoutData = Record<string, never>;
export type LogoutResponse = ApiResponse<LogoutData>;

// ─────────────────────────────────────────────────────────────────────────────
// Children API
// ─────────────────────────────────────────────────────────────────────────────

export type ChildData = Omit<Child, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type GetChildrenData = ChildData[];
export type GetChildrenResponse = ApiResponse<GetChildrenData>;

export type CreateChildRequest = {
  name: string;
  birthDate: string;
};

export type CreateChildData = ChildData;
export type CreateChildResponse = ApiResponse<CreateChildData>;

export type UpdateChildRequest = {
  name?: string;
  birthDate?: string;
};

export type UpdateChildData = ChildData;
export type UpdateChildResponse = ApiResponse<UpdateChildData>;

export type DeleteChildData = Record<string, never>;
export type DeleteChildResponse = ApiResponse<DeleteChildData>;

// ─────────────────────────────────────────────────────────────────────────────
// Food Categories API
// ─────────────────────────────────────────────────────────────────────────────

import type { FoodCategory, FoodLog, Meal, MealItem } from '$lib/domain/models';

export type FoodCategoryData = FoodCategory;
export type GetFoodCategoriesData = FoodCategoryData[];
export type GetFoodCategoriesResponse = ApiResponse<GetFoodCategoriesData>;

// ─────────────────────────────────────────────────────────────────────────────
// Food Logs API
// ─────────────────────────────────────────────────────────────────────────────

export type FoodLogData = FoodLog;
export type GetFoodLogsData = FoodLogData[];
export type GetFoodLogsResponse = ApiResponse<GetFoodLogsData>;

export type CreateFoodLogRequest = {
  childId: string;
  categoryId: string;
  subItemId?: string;
  date: string;
  action: 'eliminated' | 'reintroduced';
  notes?: string;
};

export type CreateFoodLogData = FoodLogData;
export type CreateFoodLogResponse = ApiResponse<CreateFoodLogData>;

export type UpdateFoodLogRequest = {
  action?: 'eliminated' | 'reintroduced';
  notes?: string;
};

export type UpdateFoodLogData = FoodLogData;
export type UpdateFoodLogResponse = ApiResponse<UpdateFoodLogData>;

export type DeleteFoodLogData = Record<string, never>;
export type DeleteFoodLogResponse = ApiResponse<DeleteFoodLogData>;

export type BatchSyncFoodLogsRequest = {
  logs: FoodLog[];
};

export type BatchSyncFoodLogsData = {
  syncedCount: number;
};
export type BatchSyncFoodLogsResponse = ApiResponse<BatchSyncFoodLogsData>;

// ─────────────────────────────────────────────────────────────────────────────
// Meals API
// ─────────────────────────────────────────────────────────────────────────────

export type MealItemData = MealItem;

export type MealData = Meal & {
  items: MealItemData[];
};

export type GetMealsData = MealData[];
export type GetMealsResponse = ApiResponse<GetMealsData>;

export type CreateMealItemRequest = {
  subItemId?: string;
  customName?: string;
  categoryId?: string;
};

export type CreateMealRequest = {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  label?: string;
  items: CreateMealItemRequest[];
};

export type CreateMealData = MealData;
export type CreateMealResponse = ApiResponse<CreateMealData>;

export type UpdateMealRequest = {
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  label?: string;
  items?: CreateMealItemRequest[];
};

export type UpdateMealData = MealData;
export type UpdateMealResponse = ApiResponse<UpdateMealData>;

export type DeleteMealData = Record<string, never>;
export type DeleteMealResponse = ApiResponse<DeleteMealData>;
