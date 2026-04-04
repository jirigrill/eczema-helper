import { sql } from '$lib/server/db';
import { formatDateToIso } from '$lib/utils/date';
import type { DataRepository } from '$lib/domain/ports/repository';
import type {
  User,
  Child,
  FoodCategory,
  FoodSubItem,
  FoodLog,
  Meal,
  MealItem,
  TrackingPhoto,
  SkinPhoto,
  StoolPhoto,
  BodyArea,
  StoolColor,
  StoolConsistency,
  AnalysisResult,
  SkinAnalysisResult,
  StoolAnalysisResult,
  PushSubscription,
  ReminderConfig,
} from '$lib/domain/models';

export class PostgresRepository implements DataRepository {
  // ── Users ──────────────────────────────────────────────────────────────────

  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
    return rows.length > 0 ? this.mapUser(rows[0]) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
    return rows.length > 0 ? this.mapUser(rows[0]) : null;
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const rows = await sql`
      INSERT INTO users (email, name, password_hash, role)
      VALUES (${user.email.toLowerCase()}, ${user.name}, ${user.passwordHash}, ${user.role})
      RETURNING *
    `;
    return this.mapUser(rows[0]);
  }

  // ── Children ───────────────────────────────────────────────────────────────

  async getChildrenForUser(userId: string): Promise<Child[]> {
    const rows = await sql`
      SELECT c.* FROM children c
      JOIN user_children uc ON uc.child_id = c.id
      WHERE uc.user_id = ${userId}
      ORDER BY c.created_at ASC
    `;
    return rows.map((r) => this.mapChild(r));
  }

  async getChildCount(userId: string): Promise<number> {
    const rows = await sql`
      SELECT COUNT(*)::int AS count FROM user_children WHERE user_id = ${userId}
    `;
    return rows[0].count as number;
  }

  async getChildById(childId: string): Promise<Child | null> {
    const rows = await sql`SELECT * FROM children WHERE id = ${childId}`;
    return rows.length > 0 ? this.mapChild(rows[0]) : null;
  }

  async isChildOwner(userId: string, childId: string): Promise<boolean> {
    const rows = await sql`
      SELECT 1 FROM user_children WHERE user_id = ${userId} AND child_id = ${childId}
    `;
    return rows.length > 0;
  }

  async createChild(child: Omit<Child, 'id' | 'createdAt'>): Promise<Child> {
    const rows = await sql`
      INSERT INTO children (name, birth_date)
      VALUES (${child.name}, ${child.birthDate})
      RETURNING *
    `;
    return this.mapChild(rows[0]);
  }

  async updateChild(childId: string, updates: Partial<Pick<Child, 'name' | 'birthDate'>>): Promise<Child> {
    // Build dynamic update - only update provided fields
    const rows = await sql`
      UPDATE children SET
        name = COALESCE(${updates.name ?? null}, name),
        birth_date = COALESCE(${updates.birthDate ?? null}, birth_date),
        updated_at = NOW()
      WHERE id = ${childId}
      RETURNING *
    `;
    return this.mapChild(rows[0]);
  }

  async deleteChild(childId: string): Promise<void> {
    await sql`DELETE FROM children WHERE id = ${childId}`;
  }

  async linkUserToChild(userId: string, childId: string): Promise<void> {
    await sql`
      INSERT INTO user_children (user_id, child_id) VALUES (${userId}, ${childId})
      ON CONFLICT DO NOTHING
    `;
  }

  async createChildAtomic(userId: string, child: Omit<Child, 'id' | 'createdAt'>): Promise<Child | null> {
    // Use a transaction with row-level locking to prevent race conditions.
    // The FOR UPDATE on user_children prevents concurrent inserts.
    //
    // Type assertion rationale: postgres.js v3.x TransactionSql type doesn't
    // expose the same tagged template interface as the main Sql type, even though
    // the runtime behavior is identical. This is a known limitation:
    // https://github.com/porsager/postgres/issues/625
    // The cast is safe because tx supports the same template literal syntax.
    type TxSql = typeof sql;
    return await sql.begin(async (tx) => {
      const txSql = tx as unknown as TxSql;

      // Lock the user's existing child rows (if any) to serialize concurrent requests
      // This prevents TOCTOU: two requests can't both see count=0 simultaneously
      const existing = await txSql`
        SELECT 1 FROM user_children
        WHERE user_id = ${userId}
        FOR UPDATE
      `;

      if (existing.length > 0) {
        // User already has a child - abort transaction
        return null;
      }

      // Create the child
      const rows = await txSql`
        INSERT INTO children (name, birth_date)
        VALUES (${child.name}, ${child.birthDate})
        RETURNING *
      `;

      const createdChild = this.mapChild(rows[0]);

      // Link to user
      await txSql`
        INSERT INTO user_children (user_id, child_id)
        VALUES (${userId}, ${createdChild.id})
      `;

      return createdChild;
    }) as Child | null;
  }

  // ── Food Categories ────────────────────────────────────────────────────────

  async getFoodCategories(): Promise<FoodCategory[]> {
    const categories = await sql`
      SELECT * FROM food_categories ORDER BY sort_order ASC
    `;
    const subItems = await sql`
      SELECT * FROM food_sub_items ORDER BY sort_order ASC
    `;

    const subItemsByCategory = new Map<string, FoodSubItem[]>();
    for (const row of subItems) {
      const categoryId = row.category_id as string;
      if (!subItemsByCategory.has(categoryId)) {
        subItemsByCategory.set(categoryId, []);
      }
      subItemsByCategory.get(categoryId)!.push(this.mapFoodSubItem(row));
    }

    return categories.map((r) => ({
      ...this.mapFoodCategory(r),
      subItems: subItemsByCategory.get(r.id as string) ?? [],
    }));
  }

  async getFoodSubItems(categoryId: string): Promise<FoodSubItem[]> {
    const rows = await sql`
      SELECT * FROM food_sub_items WHERE category_id = ${categoryId} ORDER BY sort_order ASC
    `;
    return rows.map((r) => this.mapFoodSubItem(r));
  }

  // ── Food Logs ──────────────────────────────────────────────────────────────

  async getFoodLogs(
    childId: string,
    dateRange: { from: string; to: string }
  ): Promise<FoodLog[]> {
    const rows = await sql`
      SELECT * FROM food_logs
      WHERE child_id = ${childId} AND date BETWEEN ${dateRange.from} AND ${dateRange.to}
      ORDER BY date ASC, created_at ASC
    `;
    return rows.map((r) => this.mapFoodLog(r));
  }

  async getFoodLogsForDate(childId: string, date: string): Promise<FoodLog[]> {
    const rows = await sql`
      SELECT * FROM food_logs WHERE child_id = ${childId} AND date = ${date}
      ORDER BY created_at ASC
    `;
    return rows.map((r) => this.mapFoodLog(r));
  }

  async getFoodLogById(id: string): Promise<FoodLog | null> {
    const rows = await sql`SELECT * FROM food_logs WHERE id = ${id}`;
    return rows.length > 0 ? this.mapFoodLog(rows[0]) : null;
  }

  async createFoodLog(log: Omit<FoodLog, 'id' | 'createdAt'>): Promise<FoodLog> {
    const rows = await sql`
      INSERT INTO food_logs (child_id, date, category_id, sub_item_id, action, notes, created_by)
      VALUES (
        ${log.childId}, ${log.date}, ${log.categoryId},
        ${log.subItemId ?? null}, ${log.action}, ${log.notes ?? null}, ${log.createdBy}
      )
      RETURNING *
    `;
    return this.mapFoodLog(rows[0]);
  }

  async deleteFoodLog(id: string): Promise<void> {
    await sql`DELETE FROM food_logs WHERE id = ${id}`;
  }

  async updateFoodLog(id: string, updates: Partial<Pick<FoodLog, 'action' | 'notes'>>): Promise<FoodLog> {
    const rows = await sql`
      UPDATE food_logs SET
        action = ${updates.action !== undefined ? updates.action : sql`action`},
        notes = ${updates.notes !== undefined ? (updates.notes ?? null) : sql`notes`},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return this.mapFoodLog(rows[0]);
  }

  async upsertFoodLog(log: FoodLog): Promise<FoodLog> {
    const rows = await sql`
      INSERT INTO food_logs (id, child_id, date, category_id, sub_item_id, action, notes, created_by, synced_at)
      VALUES (
        ${log.id}, ${log.childId}, ${log.date}, ${log.categoryId},
        ${log.subItemId ?? null}, ${log.action}, ${log.notes ?? null}, ${log.createdBy},
        ${log.syncedAt ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        action = EXCLUDED.action,
        notes = EXCLUDED.notes,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
      RETURNING *
    `;
    return this.mapFoodLog(rows[0]);
  }

  async getMostRecentFoodLog(childId: string, categoryId: string, onOrBeforeDate: string): Promise<FoodLog | null> {
    const rows = await sql`
      SELECT * FROM food_logs
      WHERE child_id = ${childId} AND category_id = ${categoryId} AND date <= ${onOrBeforeDate}
      ORDER BY date DESC, created_at DESC
      LIMIT 1
    `;
    return rows.length > 0 ? this.mapFoodLog(rows[0]) : null;
  }

  async getCurrentEliminationState(
    childId: string
  ): Promise<Map<string, 'eliminated' | 'reintroduced'>> {
    // Get latest action per category
    const rows = await sql`
      SELECT DISTINCT ON (category_id) category_id, action
      FROM food_logs
      WHERE child_id = ${childId}
      ORDER BY category_id, date DESC, created_at DESC
    `;
    const state = new Map<string, 'eliminated' | 'reintroduced'>();
    for (const row of rows) {
      state.set(row.category_id as string, row.action as 'eliminated' | 'reintroduced');
    }
    return state;
  }

  // ── Meals ──────────────────────────────────────────────────────────────────

  async getMealsForDate(userId: string, date: string): Promise<Meal[]> {
    const rows = await sql`
      SELECT * FROM meals WHERE user_id = ${userId} AND date = ${date}
      ORDER BY meal_type ASC
    `;
    return rows.map((r) => this.mapMeal(r));
  }

  async getMealById(id: string): Promise<Meal | null> {
    const rows = await sql`SELECT * FROM meals WHERE id = ${id}`;
    return rows.length > 0 ? this.mapMeal(rows[0]) : null;
  }

  async getMealWithItems(mealId: string): Promise<(Meal & { items: MealItem[] }) | null> {
    const meals = await sql`SELECT * FROM meals WHERE id = ${mealId}`;
    if (meals.length === 0) return null;

    const items = await sql`SELECT * FROM meal_items WHERE meal_id = ${mealId}`;
    return {
      ...this.mapMeal(meals[0]),
      items: items.map((r) => this.mapMealItem(r)),
    };
  }

  async createMeal(
    meal: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>,
    items: Omit<MealItem, 'id'>[]
  ): Promise<Meal> {
    const meals = await sql`
      INSERT INTO meals (user_id, date, meal_type, label)
      VALUES (${meal.userId}, ${meal.date}, ${meal.mealType}, ${meal.label ?? null})
      RETURNING *
    `;
    const created = this.mapMeal(meals[0]);

    // Batch insert all meal items in a single query to avoid N+1
    if (items.length > 0) {
      const itemValues = items.map((item) => ({
        meal_id: created.id,
        sub_item_id: item.subItemId ?? null,
        custom_name: item.customName ?? null,
        category_id: item.categoryId ?? null,
      }));
      await sql`
        INSERT INTO meal_items ${sql(itemValues)}
      `;
    }

    return created;
  }

  async updateMeal(id: string, updates: Partial<Meal>): Promise<Meal> {
    const rows = await sql`
      UPDATE meals SET
        meal_type = ${updates.mealType !== undefined ? updates.mealType : sql`meal_type`},
        label = ${updates.label !== undefined ? (updates.label ?? null) : sql`label`}
      WHERE id = ${id}
      RETURNING *
    `;
    return this.mapMeal(rows[0]);
  }

  async deleteMeal(id: string): Promise<void> {
    await sql`DELETE FROM meals WHERE id = ${id}`;
  }

  async replaceMealItems(mealId: string, items: Omit<MealItem, 'id'>[]): Promise<void> {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM meal_items WHERE meal_id = ${mealId}`;

      if (items.length > 0) {
        const itemValues = items.map((item) => ({
          meal_id: mealId,
          sub_item_id: item.subItemId ?? null,
          custom_name: item.customName ?? null,
          category_id: item.categoryId ?? null,
        }));
        await tx`INSERT INTO meal_items ${tx(itemValues)}`;
      }
    });
  }

  // ── Photos ─────────────────────────────────────────────────────────────────

  async getPhotos(
    childId: string,
    dateRange: { from: string; to: string }
  ): Promise<TrackingPhoto[]> {
    const rows = await sql`
      SELECT * FROM tracking_photos
      WHERE child_id = ${childId} AND date BETWEEN ${dateRange.from} AND ${dateRange.to}
      ORDER BY date ASC, created_at ASC
    `;
    return rows.map((r) => this.mapPhoto(r));
  }

  async getPhotosForDate(childId: string, date: string): Promise<TrackingPhoto[]> {
    const rows = await sql`
      SELECT * FROM tracking_photos WHERE child_id = ${childId} AND date = ${date}
      ORDER BY created_at ASC
    `;
    return rows.map((r) => this.mapPhoto(r));
  }

  async getPhotoById(id: string): Promise<TrackingPhoto | null> {
    const rows = await sql`SELECT * FROM tracking_photos WHERE id = ${id}`;
    return rows.length > 0 ? this.mapPhoto(rows[0]) : null;
  }

  async createPhoto(photo: Omit<TrackingPhoto, 'id' | 'createdAt'>): Promise<TrackingPhoto> {
    // Extract type-specific fields based on photoType
    const isSkin = photo.photoType === 'skin';
    const skinPhoto = isSkin ? (photo as Omit<SkinPhoto, 'id' | 'createdAt'>) : null;
    const stoolPhoto = !isSkin ? (photo as Omit<StoolPhoto, 'id' | 'createdAt'>) : null;

    const rows = await sql`
      INSERT INTO tracking_photos (
        child_id, date, photo_type, body_area, severity_manual,
        stool_color, stool_consistency, has_mucus, has_blood,
        notes, encrypted_blob_path, encrypted_thumb_path, created_by
      ) VALUES (
        ${photo.childId}, ${photo.date}, ${photo.photoType},
        ${skinPhoto?.bodyArea ?? null}, ${skinPhoto?.severityManual ?? null},
        ${stoolPhoto?.stoolColor ?? null}, ${stoolPhoto?.stoolConsistency ?? null},
        ${stoolPhoto?.hasMucus ?? null}, ${stoolPhoto?.hasBlood ?? null},
        ${photo.notes ?? null}, ${photo.encryptedBlobRef}, ${photo.thumbnailRef ?? null},
        ${photo.createdBy}
      )
      RETURNING *
    `;
    return this.mapPhoto(rows[0]);
  }

  async deletePhoto(id: string): Promise<void> {
    await sql`DELETE FROM tracking_photos WHERE id = ${id}`;
  }

  // ── Analysis Results ───────────────────────────────────────────────────────

  async getAnalysisResults(childId: string): Promise<AnalysisResult[]> {
    const rows = await sql`
      SELECT * FROM analysis_results WHERE child_id = ${childId}
      ORDER BY created_at DESC
    `;
    return rows.map((r) => this.mapAnalysisResult(r));
  }

  async getAnalysisForPhotoPair(
    photo1Id: string,
    photo2Id: string
  ): Promise<AnalysisResult | null> {
    const rows = await sql`
      SELECT * FROM analysis_results
      WHERE photo1_id = ${photo1Id} AND photo2_id = ${photo2Id}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows.length > 0 ? this.mapAnalysisResult(rows[0]) : null;
  }

  async createAnalysisResult(
    result: Omit<AnalysisResult, 'id' | 'createdAt'>
  ): Promise<AnalysisResult> {
    const isSkin = result.analysisType === 'skin';
    const skin = isSkin ? (result as SkinAnalysisResult) : null;
    const stool = !isSkin ? (result as StoolAnalysisResult) : null;

    const rows = await sql`
      INSERT INTO analysis_results (
        child_id, photo1_id, photo2_id, analysis_type, trend,
        redness_score, affected_area_pct, dryness_score,
        color_assessment, consistency_assessment, has_abnormalities,
        explanation, analyzer_used
      ) VALUES (
        ${result.childId}, ${result.photo1Id}, ${result.photo2Id},
        ${result.analysisType}, ${result.trend},
        ${skin?.rednessScore ?? null}, ${skin?.affectedAreaPct ?? null}, ${skin?.drynessScore ?? null},
        ${stool?.colorAssessment ?? null}, ${stool?.consistencyAssessment ?? null},
        ${stool?.hasAbnormalities ?? null},
        ${result.explanation}, ${result.analyzerUsed}
      )
      RETURNING *
    `;
    return this.mapAnalysisResult(rows[0]);
  }

  // ── Push Subscriptions ─────────────────────────────────────────────────────

  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    const rows = await sql`SELECT * FROM push_subscriptions WHERE user_id = ${userId}`;
    return rows.map((r) => this.mapPushSubscription(r));
  }

  async savePushSubscription(
    sub: Omit<PushSubscription, 'id' | 'createdAt'>
  ): Promise<PushSubscription> {
    const rows = await sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
      VALUES (${sub.userId}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth})
      ON CONFLICT (endpoint) DO UPDATE SET
        p256dh_key = EXCLUDED.p256dh_key,
        auth_key = EXCLUDED.auth_key
      RETURNING *
    `;
    return this.mapPushSubscription(rows[0]);
  }

  async deletePushSubscription(id: string): Promise<void> {
    await sql`DELETE FROM push_subscriptions WHERE id = ${id}`;
  }

  // ── Reminder Config ────────────────────────────────────────────────────────

  async getReminderConfig(userId: string, childId: string): Promise<ReminderConfig | null> {
    const rows = await sql`
      SELECT * FROM reminder_configs WHERE user_id = ${userId} AND child_id = ${childId}
    `;
    return rows.length > 0 ? this.mapReminderConfig(rows[0]) : null;
  }

  async saveReminderConfig(config: ReminderConfig): Promise<void> {
    await sql`
      INSERT INTO reminder_configs (
        user_id, child_id, food_log_reminder, food_log_reminder_time,
        photo_reminder, photo_reminder_interval_days, photo_reminder_time
      ) VALUES (
        ${config.userId}, ${config.childId},
        ${config.foodLogReminder}, ${config.foodLogReminderTime},
        ${config.photoReminder}, ${config.photoReminderIntervalDays}, ${config.photoReminderTime}
      )
      ON CONFLICT (user_id, child_id) DO UPDATE SET
        food_log_reminder = EXCLUDED.food_log_reminder,
        food_log_reminder_time = EXCLUDED.food_log_reminder_time,
        photo_reminder = EXCLUDED.photo_reminder,
        photo_reminder_interval_days = EXCLUDED.photo_reminder_interval_days,
        photo_reminder_time = EXCLUDED.photo_reminder_time
    `;
  }

  // ── Mappers ────────────────────────────────────────────────────────────────

  private mapUser(r: Record<string, unknown>): User {
    return {
      id: r.id as string,
      email: r.email as string,
      name: r.name as string,
      passwordHash: r.password_hash as string,
      role: 'parent',
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }

  private mapChild(r: Record<string, unknown>): Child {
    return {
      id: r.id as string,
      name: r.name as string,
      birthDate: formatDateToIso(r.birth_date),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }

  private mapFoodCategory(r: Record<string, unknown>): Omit<FoodCategory, 'subItems'> {
    return {
      id: r.id as string,
      slug: r.slug as string,
      nameCs: r.name_cs as string,
      icon: r.icon as string,
      sortOrder: r.sort_order as number,
    };
  }

  private mapFoodSubItem(r: Record<string, unknown>): FoodSubItem {
    return {
      id: r.id as string,
      categoryId: r.category_id as string,
      slug: r.slug as string,
      nameCs: r.name_cs as string,
      sortOrder: r.sort_order as number,
    };
  }

  private mapFoodLog(r: Record<string, unknown>): FoodLog {
    return {
      id: r.id as string,
      childId: r.child_id as string,
      date: formatDateToIso(r.date),
      categoryId: r.category_id as string,
      subItemId: r.sub_item_id as string | undefined,
      action: r.action as 'eliminated' | 'reintroduced',
      notes: r.notes as string | undefined,
      createdBy: r.created_by as string,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      syncedAt: r.synced_at ? String(r.synced_at) : undefined,
    };
  }

  private mapMeal(r: Record<string, unknown>): Meal {
    return {
      id: r.id as string,
      userId: r.user_id as string,
      date: formatDateToIso(r.date),
      mealType: r.meal_type as Meal['mealType'],
      label: r.label as string | undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }

  private mapMealItem(r: Record<string, unknown>): MealItem {
    return {
      id: r.id as string,
      mealId: r.meal_id as string,
      subItemId: r.sub_item_id as string | undefined,
      customName: r.custom_name as string | undefined,
      categoryId: r.category_id as string | undefined,
    };
  }

  private mapPhoto(r: Record<string, unknown>): TrackingPhoto {
    const base = {
      id: r.id as string,
      childId: r.child_id as string,
      date: formatDateToIso(r.date),
      notes: r.notes as string | undefined,
      encryptedBlobRef: r.encrypted_blob_path as string,
      thumbnailRef: r.encrypted_thumb_path as string | undefined,
      createdBy: r.created_by as string,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      syncedAt: r.synced_at ? String(r.synced_at) : undefined,
    };

    if (r.photo_type === 'skin') {
      return {
        ...base,
        photoType: 'skin',
        bodyArea: r.body_area as BodyArea,
        severityManual: r.severity_manual as number | undefined,
      } satisfies SkinPhoto;
    } else {
      return {
        ...base,
        photoType: 'stool',
        stoolColor: r.stool_color as StoolColor | undefined,
        stoolConsistency: r.stool_consistency as StoolConsistency | undefined,
        hasMucus: r.has_mucus as boolean | undefined,
        hasBlood: r.has_blood as boolean | undefined,
      } satisfies StoolPhoto;
    }
  }

  private mapAnalysisResult(r: Record<string, unknown>): AnalysisResult {
    const base = {
      id: r.id as string,
      childId: r.child_id as string,
      photo1Id: r.photo1_id as string,
      photo2Id: r.photo2_id as string,
      trend: r.trend as 'improving' | 'worsening' | 'stable',
      explanation: r.explanation as string,
      analyzerUsed: r.analyzer_used as string,
      createdAt: String(r.created_at),
      updatedAt: String(r.created_at), // analysis_results has no updated_at
    };

    if (r.analysis_type === 'skin') {
      return {
        ...base,
        analysisType: 'skin',
        rednessScore: r.redness_score as number,
        affectedAreaPct: r.affected_area_pct as number,
        drynessScore: r.dryness_score as number,
      } satisfies SkinAnalysisResult;
    } else {
      return {
        ...base,
        analysisType: 'stool',
        colorAssessment: r.color_assessment as string,
        consistencyAssessment: r.consistency_assessment as string,
        hasAbnormalities: r.has_abnormalities as boolean,
      } satisfies StoolAnalysisResult;
    }
  }

  private mapPushSubscription(r: Record<string, unknown>): PushSubscription {
    return {
      id: r.id as string,
      userId: r.user_id as string,
      endpoint: r.endpoint as string,
      keys: {
        p256dh: r.p256dh_key as string,
        auth: r.auth_key as string,
      },
      createdAt: String(r.created_at),
    };
  }

  private mapReminderConfig(r: Record<string, unknown>): ReminderConfig {
    return {
      userId: r.user_id as string,
      childId: r.child_id as string,
      foodLogReminder: r.food_log_reminder as boolean,
      foodLogReminderTime: r.food_log_reminder_time as string,
      photoReminder: r.photo_reminder as boolean,
      photoReminderIntervalDays: r.photo_reminder_interval_days as number,
      photoReminderTime: r.photo_reminder_time as string,
    };
  }
}
