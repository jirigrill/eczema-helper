-- Reusable trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- === Auth ===

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'parent',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_users') THEN
    CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- === Children (M:N via junction table) ===

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_children') THEN
    CREATE TRIGGER set_updated_at_children BEFORE UPDATE ON children
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_children (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, child_id)
);

-- === Food taxonomy (seeded, read-only) ===

CREATE TABLE IF NOT EXISTS food_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_cs TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS food_sub_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES food_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name_cs TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_food_sub_items_category ON food_sub_items(category_id);

-- === Food logs ===

CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category_id UUID REFERENCES food_categories(id),
  sub_item_id UUID REFERENCES food_sub_items(id),
  action TEXT NOT NULL CHECK (action IN ('eliminated', 'reintroduced')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_food_logs_child_date ON food_logs(child_id, date);
CREATE INDEX IF NOT EXISTS idx_food_logs_child_category ON food_logs(child_id, category_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_food_logs') THEN
    CREATE TRIGGER set_updated_at_food_logs BEFORE UPDATE ON food_logs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- === Meals ===

CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_meals') THEN
    CREATE TRIGGER set_updated_at_meals BEFORE UPDATE ON meals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  sub_item_id UUID REFERENCES food_sub_items(id),
  custom_name TEXT,
  category_id UUID REFERENCES food_categories(id),
  CHECK (sub_item_id IS NOT NULL OR custom_name IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_category ON meal_items(category_id);

-- === Photos (unified skin + stool) ===

CREATE TABLE IF NOT EXISTS tracking_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('skin', 'stool')),
  body_area TEXT,
  severity_manual INT CHECK (severity_manual BETWEEN 1 AND 5),
  stool_color TEXT CHECK (stool_color IN ('yellow', 'green', 'brown', 'red', 'black', 'white')),
  stool_consistency TEXT CHECK (stool_consistency IN ('liquid', 'soft', 'formed', 'hard')),
  has_mucus BOOLEAN,
  has_blood BOOLEAN,
  notes TEXT,
  encrypted_blob_path TEXT NOT NULL,
  encrypted_thumb_path TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tracking_photos_child_date ON tracking_photos(child_id, date);
CREATE INDEX IF NOT EXISTS idx_tracking_photos_type ON tracking_photos(child_id, photo_type);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_tracking_photos') THEN
    CREATE TRIGGER set_updated_at_tracking_photos BEFORE UPDATE ON tracking_photos
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- === Analysis results (discriminated: skin vs stool) ===

CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  photo1_id UUID REFERENCES tracking_photos(id) ON DELETE SET NULL,
  photo2_id UUID REFERENCES tracking_photos(id) ON DELETE SET NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('skin', 'stool')),
  trend TEXT NOT NULL CHECK (trend IN ('improving', 'worsening', 'stable')),
  redness_score INT CHECK (redness_score BETWEEN 1 AND 10),
  affected_area_pct INT CHECK (affected_area_pct BETWEEN 0 AND 100),
  dryness_score INT CHECK (dryness_score BETWEEN 1 AND 10),
  color_assessment TEXT,
  consistency_assessment TEXT,
  has_abnormalities BOOLEAN,
  explanation TEXT NOT NULL,
  analyzer_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analysis_results_child ON analysis_results(child_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_photos ON analysis_results(photo1_id, photo2_id);

-- === Push notifications ===

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_push_subscriptions') THEN
    CREATE TRIGGER set_updated_at_push_subscriptions BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- === Reminder configs ===

CREATE TABLE IF NOT EXISTS reminder_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  food_log_reminder BOOLEAN DEFAULT true,
  food_log_reminder_time TIME DEFAULT '20:00',
  photo_reminder BOOLEAN DEFAULT true,
  photo_reminder_interval_days INT DEFAULT 3,
  photo_reminder_time TIME DEFAULT '10:00',
  last_photo_notification_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, child_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_reminder_configs') THEN
    CREATE TRIGGER set_updated_at_reminder_configs BEFORE UPDATE ON reminder_configs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- === Google Doc export ===

CREATE TABLE IF NOT EXISTS google_doc_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  document_id TEXT,
  folder_id TEXT,
  last_export_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_doc_user ON google_doc_connections(user_id);

-- === Audit log ===

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
