-- Schema improvements: indexes, constraints, and data integrity fixes

-- ============================================================================
-- 1. Add unique constraint on food_sub_items(category_id, slug) for seed data
-- ============================================================================
-- The seed migration uses ON CONFLICT DO NOTHING, which requires a unique constraint.
-- This makes slug unique within each category (not globally).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'food_sub_items_category_slug_unique'
  ) THEN
    ALTER TABLE food_sub_items
      ADD CONSTRAINT food_sub_items_category_slug_unique UNIQUE (category_id, slug);
  END IF;
END $$;

-- ============================================================================
-- 2. Add index for getCurrentEliminationState query optimization
-- ============================================================================
-- Query: SELECT DISTINCT ON (category_id) ... ORDER BY category_id, date DESC, created_at DESC
-- This composite index covers the DISTINCT ON + ORDER BY pattern

CREATE INDEX IF NOT EXISTS idx_food_logs_elimination_state
  ON food_logs(child_id, category_id, date DESC, created_at DESC);

-- ============================================================================
-- 3. Add index on audit_log.created_at for time-based queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================================
-- 4. Add index on sessions.expires_at for cleanup queries
-- ============================================================================
-- Useful for cleanup jobs that delete expired sessions.
-- Note: A partial index with NOW() is not allowed (NOW() is not IMMUTABLE).
-- A regular index is more practical anyway.

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- 5. Add index for photo queries by type within date range
-- ============================================================================
-- Query pattern: WHERE child_id = ? AND date BETWEEN ? AND ? AND photo_type = ?

CREATE INDEX IF NOT EXISTS idx_tracking_photos_child_date_type
  ON tracking_photos(child_id, date, photo_type);

-- ============================================================================
-- 6. Add NOT NULL where logically required (safely, only for new rows)
-- ============================================================================
-- These columns reference entities that must exist for the row to be meaningful.
-- Note: These are ALTER statements - they will fail if existing NULL values exist.
-- Running these in a transaction allows rollback on failure.

-- food_logs.child_id: A food log without a child makes no sense
DO $$ BEGIN
  -- Check if column already has NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_logs'
      AND column_name = 'child_id'
      AND is_nullable = 'YES'
  ) THEN
    -- Only alter if no NULL values exist
    IF NOT EXISTS (SELECT 1 FROM food_logs WHERE child_id IS NULL) THEN
      ALTER TABLE food_logs ALTER COLUMN child_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- food_logs.category_id: A food log must reference a category
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_logs'
      AND column_name = 'category_id'
      AND is_nullable = 'YES'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM food_logs WHERE category_id IS NULL) THEN
      ALTER TABLE food_logs ALTER COLUMN category_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- food_logs.created_by: We should always know who created the log
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_logs'
      AND column_name = 'created_by'
      AND is_nullable = 'YES'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM food_logs WHERE created_by IS NULL) THEN
      ALTER TABLE food_logs ALTER COLUMN created_by SET NOT NULL;
    END IF;
  END IF;
END $$;

-- meals.user_id: A meal without a user makes no sense
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM meals WHERE user_id IS NULL) THEN
      ALTER TABLE meals ALTER COLUMN user_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- tracking_photos.child_id: A photo without a child makes no sense
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tracking_photos'
      AND column_name = 'child_id'
      AND is_nullable = 'YES'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM tracking_photos WHERE child_id IS NULL) THEN
      ALTER TABLE tracking_photos ALTER COLUMN child_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- tracking_photos.created_by: We should always know who uploaded the photo
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tracking_photos'
      AND column_name = 'created_by'
      AND is_nullable = 'YES'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM tracking_photos WHERE created_by IS NULL) THEN
      ALTER TABLE tracking_photos ALTER COLUMN created_by SET NOT NULL;
    END IF;
  END IF;
END $$;

-- analysis_results.child_id: An analysis without a child makes no sense
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_results'
      AND column_name = 'child_id'
      AND is_nullable = 'YES'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM analysis_results WHERE child_id IS NULL) THEN
      ALTER TABLE analysis_results ALTER COLUMN child_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- food_sub_items.category_id: A sub-item must belong to a category
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_sub_items'
      AND column_name = 'category_id'
      AND is_nullable = 'YES'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM food_sub_items WHERE category_id IS NULL) THEN
      ALTER TABLE food_sub_items ALTER COLUMN category_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- meal_items.meal_id: A meal item must belong to a meal
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items'
      AND column_name = 'meal_id'
      AND is_nullable = 'YES'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM meal_items WHERE meal_id IS NULL) THEN
      ALTER TABLE meal_items ALTER COLUMN meal_id SET NOT NULL;
    END IF;
  END IF;
END $$;
