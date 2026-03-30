# Data Models

This document defines all TypeScript interfaces (used in the client and domain layer) and their corresponding PostgreSQL table schemas (used on the server). It also describes entity relationships and seed data for food categories.

---

## Migration Numbering Convention

Database migrations live in `migrations/` and are executed sequentially by the migration runner (`scripts/migrate.ts`). Files are named with a global sequential number across all phases:

```
migrations/
  001_initial_schema.sql          # Phase 1 — all tables
  002_seed_food_data.sql          # Phase 1 — food categories + sub-items
  003_encryption_salt.sql         # Phase 3 — user encryption salt column (if needed)
  ...
```

Rules:
- **Numbering is global**, not per-phase. `001` through `NNN`, always incrementing.
- Format: `{NNN}_{snake_case_description}.sql`
- The migration runner tracks executed migrations in a `_migrations` table.
- Migrations must be **idempotent** where possible (use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- Never modify a migration that has already been run in production. Create a new migration instead.

---

## TypeScript Interfaces

All interfaces are defined in `src/lib/domain/models.ts`.

### User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'parent';
  createdAt: string;
  updatedAt: string;
}
```

Represents an app user. The `role` field is currently always `'parent'` since both parents share the same access level. The field exists to support potential future roles (e.g., read-only viewer).

### Child

```typescript
interface Child {
  id: string;
  name: string;
  birthDate: string;     // ISO date: "2025-03-15"
  createdAt: string;
  updatedAt: string;
}
```

Represents a tracked child. The app enforces a single-child constraint — each family can have exactly one child. This simplifies the UX and data model (meals belong to the mother, not the child; child context is implicit throughout the app).

### UserChild

```typescript
interface UserChild {
  userId: string;
  childId: string;
}
```

Junction table linking users to children. Both parents are linked to the same child, giving them shared access to all tracking data.

### Session

```typescript
interface Session {
  id: string;
  userId: string;
  expiresAt: string;     // ISO datetime
  createdAt: string;
}
```

Server-side session for cookie-based authentication. Sessions use a 30-day sliding expiry: each authenticated request extends the session by 30 days from the current time. Expired sessions are cleaned up periodically.

### FoodCategory

```typescript
interface FoodCategory {
  id: string;
  slug: string;          // URL-safe identifier: "dairy", "eggs", "wheat"
  nameCs: string;        // Czech display name: "Mléčné výrobky"
  icon: string;          // Emoji or icon identifier: "🥛"
  sortOrder: number;     // Display order in the UI
  subItems: FoodSubItem[];  // Populated via JOIN in repository adapter, not stored as a column
}
```

Top-level allergen category. Seeded from a predefined list of common allergens relevant to atopic eczema through breast milk. The `subItems` array is populated by joining with `FoodSubItem`.

### FoodSubItem

```typescript
interface FoodSubItem {
  id: string;
  categoryId: string;
  slug: string;          // "cows-milk", "butter", "cheese"
  nameCs: string;        // "Kravské mléko", "Máslo", "Sýr"
  sortOrder: number;
}
```

Specific foods within a category. Allows more granular tracking -- for example, a mother might tolerate butter but not fresh milk.

### FoodLog

```typescript
interface FoodLog {
  id: string;
  childId: string;
  date: string;          // ISO date: "2025-04-01"
  categoryId: string;
  subItemId?: string;    // Optional: specific sub-item if applicable
  action: 'eliminated' | 'reintroduced';
  notes?: string;        // Optional free-text notes
  createdBy: string;     // User ID of the parent who logged this
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;     // Set when synced to server; null = pending offline upload
}
```

Records a food elimination or reintroduction event. The `action` field tracks direction:
- `'eliminated'` -- The mother removed this food from her diet.
- `'reintroduced'` -- The mother started eating this food again.

The current diet state is derived by looking at the most recent action for each food category.

### Meal

```typescript
interface Meal {
  id: string;
  userId: string;            // The parent (mother) who ate this meal
  date: string;              // ISO date: "2025-04-01"
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  label?: string;            // Optional custom label: "obed u babicky"
  createdAt: string;
  updatedAt: string;
}
```

Records a single meal the mother ate. Meals are logged alongside (not instead of) the elimination tracker. They provide a detailed record of what was actually consumed, which is useful for the pediatrician and for future automatic elimination detection. The meal belongs to the user (mother), not the child — since the app supports a single child, the child context is implicit.

### MealItem

```typescript
interface MealItem {
  id: string;
  mealId: string;            // Reference to the parent Meal
  subItemId?: string;        // Link to FoodSubItem if from predefined list
  customName?: string;       // Free text for items not in predefined list
  categoryId?: string;       // Auto-resolved from subItem, or manually assigned
}
```

Individual food items within a meal. Can reference a predefined `FoodSubItem` (e.g., "potato", "baked milk") or use free text for items not in the system. The `categoryId` is resolved automatically when a `subItemId` is provided, or can be set manually for custom items.

### TrackingPhoto

```typescript
interface TrackingPhoto {
  id: string;
  childId: string;
  date: string;              // ISO date of when the photo was taken
  photoType: 'skin' | 'stool';

  // Skin-specific fields (used when photoType === 'skin')
  bodyArea?: 'face' | 'arms' | 'legs' | 'torso' | 'hands' | 'feet' | 'neck' | 'scalp';
  severityManual?: number;   // Manual eczema severity rating 1-5

  // Stool-specific fields (used when photoType === 'stool')
  stoolColor?: 'yellow' | 'green' | 'brown' | 'red' | 'black' | 'white';
  stoolConsistency?: 'liquid' | 'soft' | 'formed' | 'hard';
  hasMucus?: boolean;
  hasBlood?: boolean;

  notes?: string;
  encryptedBlobRef: string;  // Reference to encrypted photo file on server
  thumbnailRef?: string;     // Reference to encrypted thumbnail (320px)
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;     // Set when synced to server; null = pending offline upload
}
```

Photo metadata for both skin (eczema) and stool (diaper) photos. The actual photo is stored as an encrypted blob on the server filesystem (referenced by `encryptedBlobRef`). The metadata record in the database does not contain the image itself -- only a path/reference to the encrypted file.

**Skin photos** track eczema condition with body area labels and severity ratings. Body areas are chosen based on common eczema presentation areas in infants.

**Stool photos** track diaper contents, which are a key indicator of food intolerance in breastfed babies. Pediatricians look for color changes (green = possible intolerance), mucus, and blood. The metadata captures the clinically relevant attributes:
- **Color**: yellow (normal), green (possible intolerance), brown (normal for older babies), red/black (blood -- urgent), white (bile duct issue -- urgent)
- **Consistency**: liquid, soft, formed, hard
- **Mucus**: yes/no -- may indicate gut irritation
- **Blood**: yes/no -- may indicate protein intolerance (e.g., cow's milk protein allergy)

### AnalysisResult

```typescript
type Trend = 'improving' | 'worsening' | 'stable';

interface AnalysisResultBase {
  id: string;
  childId: string;
  photo1Id: string;          // Earlier photo
  photo2Id: string;          // Later photo
  analysisType: 'skin' | 'stool';
  trend: Trend;
  explanation: string;       // AI-generated natural language explanation (Czech)
  analyzerUsed: string;      // "claude-sonnet-4-6" or similar identifier
  createdAt: string;
  updatedAt: string;
}

interface SkinAnalysisResult extends AnalysisResultBase {
  analysisType: 'skin';
  rednessScore: number;      // 1-10 scale
  affectedAreaPct: number;   // 0-100, estimated percentage of visible area affected
  drynessScore: number;      // 1-10 scale
}

interface StoolAnalysisResult extends AnalysisResultBase {
  analysisType: 'stool';
  colorAssessment: string;          // Czech description of color change
  consistencyAssessment: string;    // Czech description of consistency change
  hasAbnormalities: boolean;        // mucus or blood detected
}

type AnalysisResult = SkinAnalysisResult | StoolAnalysisResult;
```

Result of an AI-powered comparison between two photos of the same type. The `photo1Id` should be the chronologically earlier photo and `photo2Id` the later one. The `analysisType` discriminator determines which fields are present:

- **Skin analysis:** includes redness score (1-10), dryness score (1-10), and affected area percentage (0-100).
- **Stool analysis:** includes Czech-language color and consistency assessments, plus a boolean for abnormalities (mucus or blood detected).

The `explanation` field contains a human-readable (Czech) description of the changes observed.

### GoogleDocConnection

```typescript
interface GoogleDocConnection {
  id: string;
  userId: string;
  googleEmail: string;
  refreshTokenEncrypted: string;  // Encrypted at rest using SESSION_SECRET
  documentId?: string;            // ID of the created/linked Google Doc
  folderId?: string;              // ID of the "Eczema Tracker" folder on Drive
  lastExportAt?: string;
  createdAt: string;
}
```

Stores the OAuth2 connection to Google Drive/Docs for a user. The refresh token is encrypted at rest — the server decrypts it on each export to obtain a short-lived access token. The `documentId` is set after the first export and reused for subsequent updates, preserving sharing settings and the URL. The `folderId` references the Drive folder where photos and the document are stored.

### PushSubscription

```typescript
interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
}
```

Web Push subscription data. Each device that enables notifications gets its own subscription. A user can have multiple subscriptions (one per device/browser).

### ReminderConfig

```typescript
interface ReminderConfig {
  userId: string;
  childId: string;
  foodLogReminder: boolean;
  foodLogReminderTime: string;       // "HH:MM" format, e.g., "20:00"
  photoReminder: boolean;
  photoReminderIntervalDays: number; // e.g., 3 = remind every 3 days
  photoReminderTime: string;         // "HH:MM" format, e.g., "10:00"
}
```

Per-user, per-child notification preferences. Controls when and how often the user receives reminders to log food changes or take photos.

---

## PostgreSQL Schema

### Reusable updated_at Trigger

All mutable tables use this trigger to automatically set `updated_at` on every UPDATE:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to each mutable table, e.g.:
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- (Repeat for: children, food_logs, meals, tracking_photos, analysis_results, push_subscriptions, reminder_configs)
```

This prevents bugs where a developer forgets to set `updated_at` in an UPDATE query, which would break the offline sync conflict resolution strategy (last-write-wins by `updatedAt`).

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'parent',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
```

### sessions

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### children

```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### user_children

```sql
CREATE TABLE user_children (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, child_id)
);
```

### food_categories

```sql
CREATE TABLE food_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_cs TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
```

### food_sub_items

```sql
CREATE TABLE food_sub_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES food_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name_cs TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE INDEX idx_food_sub_items_category ON food_sub_items(category_id);
```

### food_logs

```sql
CREATE TABLE food_logs (
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

CREATE INDEX idx_food_logs_child_date ON food_logs(child_id, date);
CREATE INDEX idx_food_logs_child_category ON food_logs(child_id, category_id);
```

### meals

```sql
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meals_user_date ON meals(user_id, date);
```

### meal_items

```sql
CREATE TABLE meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  sub_item_id UUID REFERENCES food_sub_items(id),
  custom_name TEXT,
  category_id UUID REFERENCES food_categories(id),
  CHECK (sub_item_id IS NOT NULL OR custom_name IS NOT NULL)
);

CREATE INDEX idx_meal_items_meal ON meal_items(meal_id);
CREATE INDEX idx_meal_items_category ON meal_items(category_id);
```

### tracking_photos

```sql
CREATE TABLE tracking_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('skin', 'stool')),

  -- Skin-specific
  body_area TEXT,
  severity_manual INT CHECK (severity_manual BETWEEN 1 AND 5),

  -- Stool-specific
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

CREATE INDEX idx_tracking_photos_child_date ON tracking_photos(child_id, date);
CREATE INDEX idx_tracking_photos_type ON tracking_photos(child_id, photo_type);
```

### analysis_results

```sql
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  photo1_id UUID REFERENCES tracking_photos(id) ON DELETE SET NULL,
  photo2_id UUID REFERENCES tracking_photos(id) ON DELETE SET NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('skin', 'stool')),
  trend TEXT NOT NULL CHECK (trend IN ('improving', 'worsening', 'stable')),

  -- Skin-specific (used when analysis_type = 'skin')
  redness_score INT CHECK (redness_score BETWEEN 1 AND 10),
  affected_area_pct INT CHECK (affected_area_pct BETWEEN 0 AND 100),
  dryness_score INT CHECK (dryness_score BETWEEN 1 AND 10),

  -- Stool-specific (used when analysis_type = 'stool')
  color_assessment TEXT,
  consistency_assessment TEXT,
  has_abnormalities BOOLEAN,

  explanation TEXT NOT NULL,
  analyzer_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analysis_results_child ON analysis_results(child_id);
CREATE INDEX idx_analysis_results_photos ON analysis_results(photo1_id, photo2_id);
```

### push_subscriptions

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
```

### google_doc_connections

```sql
CREATE TABLE google_doc_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  document_id TEXT,
  folder_id TEXT,
  last_export_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_google_doc_user ON google_doc_connections(user_id);
```

### reminder_configs

```sql
CREATE TABLE reminder_configs (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  food_log_reminder BOOLEAN DEFAULT true,
  food_log_reminder_time TIME DEFAULT '20:00',
  photo_reminder BOOLEAN DEFAULT true,
  photo_reminder_interval_days INT DEFAULT 3,
  photo_reminder_time TIME DEFAULT '10:00',
  PRIMARY KEY (user_id, child_id)
);
```

---

## Entity Relationships

```
users ──┐
        ├── user_children ──┐
users ──┘                   │
                            ├── children
                            │      │
                            │      ├── food_logs ──── food_categories
                            │      │                        │
                            │      │                  food_sub_items
                            │      │                        │
users ── meals ──── meal_items ─────────────────────────────┘
                            │      │
                            │      ├── tracking_photos
                            │      │      │       │
                            │      │      └───────┼── analysis_results
                            │      │              │
                            │      └──────────────┘
                            │
users ── push_subscriptions
users ── reminder_configs ── children
users ── google_doc_connections
```

**Key relationships:**

- **Users to Children:** Many-to-many via `user_children`. Both parents link to the same child.
- **Children to Food Logs:** One-to-many. A child has many food log entries (elimination/reintroduction events) over time.
- **Food Logs to Food Categories:** Many-to-one. Each log references a food category and optionally a sub-item.
- **Users to Meals:** One-to-many. A user (the mother) has many meals logged over time. Meals record what she actually ate. The child association is implicit (single-child app).
- **Meals to Meal Items:** One-to-many. Each meal contains one or more food items, which can reference predefined `FoodSubItem` entries or use free text.
- **Meal Items to Food Sub Items / Categories:** Optional many-to-one. Links meal items to the predefined food taxonomy for consistent categorization.
- **Children to Tracking Photos:** One-to-many. A child has many photos over time, of two types: skin (eczema) and stool (diaper).
- **Tracking Photos to Analysis Results:** An analysis result references exactly two photos (photo1 and photo2). Each photo can appear in multiple analysis results (compared against different photos). Analysis is supported for both skin and stool photo types.
- **Users to Push Subscriptions:** One-to-many. Each device has its own subscription.
- **Users + Children to Reminder Configs:** One-to-one per user-child pair. Each parent can set different reminder preferences for each child.
- **Users to Google Doc Connections:** One-to-one. Each user can connect one Google account for Google Doc export with inline photos.

---

## System Tables

### _migrations

The migration runner (`scripts/migrate.ts`) automatically creates and manages a `_migrations` table to track which migration files have been executed:

```sql
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  executed_at TIMESTAMPTZ DEFAULT now()
);
```

This table is not part of the domain model and should not be referenced by application code.

---

## Seed Data: Food Categories

The following food categories represent the most common allergens relevant to atopic eczema triggered through breast milk. These are seeded into the database during initial setup.

### Categories and Sub-Items

#### 1. Mlecne vyrobky (Dairy)

| slug | nameCs | icon |
|---|---|---|
| **Category:** dairy | Mlecne vyrobky | milk glass |

**Sub-items:**

| slug | nameCs |
|---|---|
| cows-milk | Kravske mleko |
| butter | Maslo |
| cheese | Syr |
| yogurt | Jogurt |
| cream | Smetana |
| cottage-cheese | Tvaroh |
| whey | Syrovatka |
| casein | Kasein |

#### 2. Vejce (Eggs)

| slug | nameCs | icon |
|---|---|---|
| **Category:** eggs | Vejce | egg |

**Sub-items:**

| slug | nameCs |
|---|---|
| whole-egg | Cele vejce |
| egg-white | Bilek |
| egg-yolk | Zloutek |

#### 3. Psenice (Wheat)

| slug | nameCs | icon |
|---|---|---|
| **Category:** wheat | Psenice/lepek | wheat |

**Sub-items:**

| slug | nameCs |
|---|---|
| bread | Chleb |
| pasta | Testoviny |
| flour | Mouka |
| pastries | Pecivo |
| gluten | Lepek |

#### 4. Soja (Soy)

| slug | nameCs | icon |
|---|---|---|
| **Category:** soy | Soja | soy |

**Sub-items:**

| slug | nameCs |
|---|---|
| soy-milk | Sojove mleko |
| tofu | Tofu |
| soy-sauce | Sojova omacka |
| soy-lecithin | Sojovy lecitin |

#### 5. Orechy (Nuts)

| slug | nameCs | icon |
|---|---|---|
| **Category:** nuts | Orechy | nut |

**Sub-items:**

| slug | nameCs |
|---|---|
| peanuts | Arasidy |
| walnuts | Vlaske orechy |
| hazelnuts | Liskove orechy |
| almonds | Mandle |
| cashews | Kesu orechy |
| pistachios | Pistacie |

#### 6. Ryby (Fish)

| slug | nameCs | icon |
|---|---|---|
| **Category:** fish | Ryby | fish |

**Sub-items:**

| slug | nameCs |
|---|---|
| freshwater-fish | Sladkovodni ryby |
| saltwater-fish | Morske ryby |
| fish-oil | Rybi olej |

#### 7. Korysi (Shellfish)

| slug | nameCs | icon |
|---|---|---|
| **Category:** shellfish | Korysi a mekkysi | shrimp |

**Sub-items:**

| slug | nameCs |
|---|---|
| shrimp | Krevety |
| crab | Krab |
| mussels | Slávky |

#### 8. Citrusy (Citrus)

| slug | nameCs | icon |
|---|---|---|
| **Category:** citrus | Citrusy | lemon |

**Sub-items:**

| slug | nameCs |
|---|---|
| oranges | Pomerance |
| lemons | Citrony |
| grapefruits | Grapefruity |
| mandarins | Mandarinky |

#### 9. Cokolada (Chocolate)

| slug | nameCs | icon |
|---|---|---|
| **Category:** chocolate | Cokolada/kakao | chocolate |

**Sub-items:**

| slug | nameCs |
|---|---|
| dark-chocolate | Horka cokolada |
| milk-chocolate | Mlecna cokolada |
| cocoa | Kakao |

#### 10. Rajcata (Tomatoes)

| slug | nameCs | icon |
|---|---|---|
| **Category:** tomatoes | Rajcata | tomato |

**Sub-items:**

| slug | nameCs |
|---|---|
| fresh-tomatoes | Cerstve rajcata |
| tomato-sauce | Rajcatova omacka |
| ketchup | Kecup |
| tomato-paste | Rajcatovy protlak |

#### 11. Jahody (Strawberries)

| slug | nameCs | icon |
|---|---|---|
| **Category:** strawberries | Jahody | strawberry |

**Sub-items:**

| slug | nameCs |
|---|---|
| fresh-strawberries | Cerstve jahody |
| strawberry-jam | Jahodovy dzem |

#### 12. Kukurice (Corn)

| slug | nameCs | icon |
|---|---|---|
| **Category:** corn | Kukurice | corn |

**Sub-items:**

| slug | nameCs |
|---|---|
| corn-flour | Kukuricna mouka |
| corn-starch | Kukuricny skrob |
| sweet-corn | Sladka kukurice |

#### 13. Sezam (Sesame)

| slug | nameCs | icon |
|---|---|---|
| **Category:** sesame | Sezamové výrobky | sesame seed |

**Sub-items:**

| slug | nameCs |
|---|---|
| sesame-seeds | Sezamová semínka |
| sesame-oil | Sezamový olej |
| tahini | Tahini |

> Sesame is a recognized top allergen in the EU (Regulation 1169/2011).

#### 14. Ostatni (Other)

| slug | nameCs | icon |
|---|---|---|
| **Category:** other | Ostatni | plate |

A catch-all category for foods that do not fit into the predefined categories. Users can add free-text notes to food logs in this category.

### Seed SQL Example

```sql
-- Insert a food category
INSERT INTO food_categories (slug, name_cs, icon, sort_order)
VALUES ('dairy', 'Mléčné výrobky', '🥛', 1);

-- Get the category ID for sub-items
WITH dairy AS (
  SELECT id FROM food_categories WHERE slug = 'dairy'
)
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
VALUES
  ((SELECT id FROM dairy), 'cows-milk', 'Kravské mléko', 1),
  ((SELECT id FROM dairy), 'butter', 'Máslo', 2),
  ((SELECT id FROM dairy), 'cheese', 'Sýr', 3),
  ((SELECT id FROM dairy), 'yogurt', 'Jogurt', 4),
  ((SELECT id FROM dairy), 'cream', 'Smetana', 5),
  ((SELECT id FROM dairy), 'cottage-cheese', 'Tvaroh', 6),
  ((SELECT id FROM dairy), 'whey', 'Syrovátka', 7),
  ((SELECT id FROM dairy), 'casein', 'Kasein', 8);
```

The full seed script follows the same pattern for all 14 categories and their sub-items. It should be idempotent (using `ON CONFLICT DO NOTHING` or checking existence before insert).

---

## TypeScript to PostgreSQL Mapping

The domain layer uses camelCase (TypeScript convention) while the database uses snake_case (PostgreSQL convention). The `PostgresRepository` adapter handles this mapping.

| TypeScript field | PostgreSQL column | Entity |
|---|---|---|
| `id` | `id` | all |
| `createdAt` | `created_at` | all |
| `updatedAt` | `updated_at` | all mutable entities |
| `syncedAt` | `synced_at` | FoodLog, TrackingPhoto |
| `email` | `email` | User |
| `passwordHash` | `password_hash` | User |
| `role` | `role` | User |
| `userId` | `user_id` | Session, Meal, UserChild, etc. |
| `expiresAt` | `expires_at` | Session |
| `childId` | `child_id` | UserChild, FoodLog, TrackingPhoto, etc. |
| `birthDate` | `birth_date` | Child |
| `nameCs` | `name_cs` | FoodCategory, FoodSubItem |
| `sortOrder` | `sort_order` | FoodCategory, FoodSubItem |
| `categoryId` | `category_id` | FoodSubItem, FoodLog, MealItem |
| `subItemId` | `sub_item_id` | FoodLog, MealItem |
| `createdBy` | `created_by` | FoodLog, TrackingPhoto |
| `mealType` | `meal_type` | Meal |
| `mealId` | `meal_id` | MealItem |
| `customName` | `custom_name` | MealItem |
| `photoType` | `photo_type` | TrackingPhoto |
| `bodyArea` | `body_area` | TrackingPhoto |
| `severityManual` | `severity_manual` | TrackingPhoto |
| `stoolColor` | `stool_color` | TrackingPhoto |
| `stoolConsistency` | `stool_consistency` | TrackingPhoto |
| `hasMucus` | `has_mucus` | TrackingPhoto |
| `hasBlood` | `has_blood` | TrackingPhoto |
| `encryptedBlobRef` | `encrypted_blob_path` | TrackingPhoto |
| `thumbnailRef` | `encrypted_thumb_path` | TrackingPhoto |

> **Note:** The semantic mismatch between `encryptedBlobRef` (TypeScript) and `encrypted_blob_path` (PostgreSQL) is intentional — the TypeScript field uses "Ref" (reference) while PostgreSQL uses "path" (filesystem). The `PostgresRepository` adapter must map between these names explicitly. The `blobRef` returned by the `PhotoStorage` port is the same value stored as `encrypted_blob_path`.

| `analysisType` | `analysis_type` | AnalysisResult |
| `photo1Id` | `photo1_id` | AnalysisResult |
| `photo2Id` | `photo2_id` | AnalysisResult |
| `rednessScore` | `redness_score` | SkinAnalysisResult |
| `affectedAreaPct` | `affected_area_pct` | SkinAnalysisResult |
| `drynessScore` | `dryness_score` | SkinAnalysisResult |
| `colorAssessment` | `color_assessment` | StoolAnalysisResult |
| `consistencyAssessment` | `consistency_assessment` | StoolAnalysisResult |
| `hasAbnormalities` | `has_abnormalities` | StoolAnalysisResult |
| `updatedAt` | `updated_at` | AnalysisResult |
| `analyzerUsed` | `analyzer_used` | AnalysisResult |
| `foodLogReminder` | `food_log_reminder` | ReminderConfig |
| `foodLogReminderTime` | `food_log_reminder_time` | ReminderConfig |
| `photoReminder` | `photo_reminder` | ReminderConfig |
| `photoReminderIntervalDays` | `photo_reminder_interval_days` | ReminderConfig |
| `photoReminderTime` | `photo_reminder_time` | ReminderConfig |
| `googleEmail` | `google_email` | GoogleDocConnection |
| `refreshTokenEncrypted` | `refresh_token_encrypted` | GoogleDocConnection |
| `documentId` | `document_id` | GoogleDocConnection |
| `folderId` | `folder_id` | GoogleDocConnection |
| `lastExportAt` | `last_export_at` | GoogleDocConnection |
