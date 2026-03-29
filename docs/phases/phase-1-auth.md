# Phase 1: Authentication & Child Management

## Summary

This phase implements the complete authentication system and child management feature. It creates the PostgreSQL schema (all tables via migrations), builds server-side API routes for registration, login, and logout using cookie-based sessions with bcrypt password hashing, adds auth middleware to protect the `(app)` route group, implements the Settings page for adding and editing children, adds a child selector dropdown to the app header, and seeds the database with Czech food categories and sub-items. After this phase, users can create accounts, log in, manage children, and all protected routes require authentication.

## Prerequisites

Phase 0 must be complete. Specifically:

- SvelteKit project is running with TypeScript, Tailwind CSS 4, and PWA configured.
- Domain model interfaces (`models.ts`) and port interfaces are defined.
- Docker Compose PostgreSQL instance is available on `localhost:5432`.
- App shell with bottom tab navigation is functional.
- Login page UI exists (will be wired to the backend in this phase).

## Features

1. Create PostgreSQL schema migration covering all tables: `users`, `sessions`, `children`, `user_children`, `food_categories`, `food_sub_items`, `food_logs`, `meals`, `meal_items`, `tracking_photos`, `analysis_results`, `push_subscriptions`, `google_doc_connections`, `reminder_configs` (matching `docs/architecture/data-models.md` exactly).
2. Implement the PostgreSQL adapter (`postgres.ts`) fulfilling the `DataRepository` port interface.
3. Build server API route `POST /api/auth/register` -- creates a new user with bcrypt-hashed password.
4. Build server API route `POST /api/auth/login` -- validates credentials, creates a session, sets an HTTP-only cookie.
5. Build server API route `POST /api/auth/logout` -- destroys the session and clears the cookie.
6. Implement SvelteKit hooks-based auth middleware that protects all `(app)` routes and redirects unauthenticated users to `/login`.
7. Build server API routes `GET /api/children` and `POST /api/children` -- list and create children for the authenticated user.
8. Build server API routes `PUT /api/children/[id]` and `DELETE /api/children/[id]` -- update and delete a child.
9. Implement the Settings page with a child management UI (add, edit, delete children).
10. Add a child selector dropdown in the app header that persists the selection in a Svelte store.
11. Create and run a seed script that populates `food_categories` and `food_sub_items` with Czech allergen data.
12. **UI design review** -- with the app shell, auth, and settings running on a real phone, create `docs/architecture/ui-design.md` covering: navigation flow diagram, screen-by-screen wireframes (ASCII or screenshots), design system basics (component patterns, spacing, typography), and mobile UX conventions (bottom sheets vs pages, swipe behaviors, tap target sizes). This informs all subsequent phases.
13. **PBKDF2 encryption salt column** -- add `encryption_salt` column to `users` table for storing the PBKDF2 salt used in photo encryption key derivation.
14. **Login rate limiting & account lockout** -- add `failed_login_attempts` and `locked_until` columns to `users` table. Implement per-email throttling: 5 failed attempts per 15 minutes locks the account. Return generic error messages that don't distinguish between wrong email vs. wrong password.
15. **Session cleanup** -- implement a mechanism to delete expired sessions from PostgreSQL. Options: daily cron job (03:00) or probabilistic cleanup on each request.
16. **Standardized API error format** -- implement consistent JSON error responses across all endpoints: `{ "error": "Czech message", "code": "MACHINE_READABLE_CODE" }` with appropriate HTTP status codes.
17. **Request correlation IDs** -- generate a unique `requestId` (UUID) for every incoming request in `hooks.server.ts` and attach it to all log calls for distributed tracing.
18. **Security audit logging** -- create `audit_log` table and log security-sensitive events: `login_success`, `login_failure`, `logout`, `registration`, `password_change`. Never log passwords or sensitive data.

## Acceptance Criteria

- [x] **AC-1 (Feature 1):** Running the migration script creates all tables in PostgreSQL. Running `\dt` in `psql` lists: `users`, `sessions`, `children`, `user_children`, `food_categories`, `food_sub_items`, `food_logs`, `meals`, `meal_items`, `tracking_photos`, `analysis_results`, `push_subscriptions`, `google_doc_connections`, `reminder_configs`.
- [x] **AC-2 (Feature 2):** The PostgreSQL adapter implements `DataRepository` and can perform entity-specific operations (`getUserByEmail`, `createUser`, `getChildrenForUser`, `createChild`, `linkUserToChild`) against the database without error.
- [x] **AC-3 (Feature 3):** `POST /api/auth/register` with `{ email, password, name }` returns `201` and creates a user row. The stored password is a bcrypt hash (starts with `$2b$`). Registering with a duplicate email returns `409`.
- [x] **AC-4 (Feature 4):** `POST /api/auth/login` with valid credentials returns `200` and sets a `Set-Cookie` header with an HTTP-only, Secure, SameSite=Lax cookie named `session_id`. The response body contains the user object (without password). Invalid credentials return `401`.
- [x] **AC-5 (Feature 5):** `POST /api/auth/logout` with a valid session cookie returns `200`, the session row is deleted from the database, and the `session_id` cookie is cleared (Max-Age=0).
- [x] **AC-6 (Feature 6):** Navigating to any `(app)` route without a session cookie results in a redirect to `/login`. After logging in, navigating to `/login` redirects to `/calendar`.
- [x] **AC-7 (Feature 7):** `GET /api/children` with a valid session returns `200` and an array of children belonging to the authenticated user. `POST /api/children` with `{ name, birthDate }` returns `201` and the created child.
- [x] **AC-8 (Feature 8):** `PUT /api/children/[id]` with `{ name }` updates the child name and returns `200`. `DELETE /api/children/[id]` removes the child and returns `204`. Attempting to modify another user's child returns `403`.
- [x] **AC-9 (Feature 9):** The Settings page displays a list of the user's children. Each child shows name and birth date. A form allows adding a new child. Each existing child has "Edit" and "Delete" buttons that work correctly.
- [x] **AC-10 (Feature 10):** The app header shows a dropdown with the user's children. Selecting a child updates a global Svelte store. The selected child persists across page navigations within the session. If no children exist, the dropdown shows "Add a child" and links to Settings.
- [x] **AC-11 (Feature 11):** After running the seed script, `food_categories` contains at least 12 rows and `food_sub_items` contains at least 30 rows. Each category has a `slug`, `name_cs` (Czech), and `icon` field. Each sub-item references a valid `category_id`.
- [ ] **AC-12 (Feature 12):** `docs/architecture/ui-design.md` exists and covers: navigation flow, wireframes for key screens (calendar, day detail, food grid, photo gallery, capture, settings), design system (button styles, card patterns, typography, spacing), and mobile UX decisions (bottom sheet vs page navigation, swipe gestures, tap target sizes). Decisions are tested on a real phone.
- [x] **AC-13 (Feature 13):** The `users` table has an `encryption_salt BYTEA` column for storing the per-user PBKDF2 salt used in photo encryption key derivation. The column is nullable (set when user first enables encryption).
- [x] **AC-14 (Feature 14):** The `users` table has `failed_login_attempts INT` and `locked_until TIMESTAMPTZ` columns. After 5 failed login attempts for an email within 15 minutes, subsequent login attempts return HTTP 429 with `{ error, retryAfterSeconds }`. Error messages do not reveal whether the email exists (generic "Nesprávné přihlašovací údaje" for both invalid email and invalid password).
- [x] **AC-15 (Feature 15):** Expired sessions (where `expires_at < NOW()`) are automatically deleted. Implementation options: (a) daily cron job at 03:00 via external scheduler, or (b) probabilistic cleanup (1% chance on each request). The chosen mechanism is documented and testable.
- [x] **AC-16 (Feature 16):** All API error responses use the standardized format `{ "error": "Czech user message", "code": "MACHINE_READABLE_CODE" }` with appropriate HTTP status codes (400 for validation, 401 for auth, 403 for authorization, 404 for not found, 409 for conflict, 429 for rate limit, 500 for server error).
- [x] **AC-17 (Feature 17):** Every incoming request generates a UUID `requestId` in `hooks.server.ts`. The `requestId` is attached to all log entries for the request lifecycle. Error responses include the `requestId` (via `errorId` in `handleError`) so users can reference it when reporting issues.
- [x] **AC-18 (Feature 18):** The `audit_log` table exists with columns: `id`, `user_id`, `action`, `details` (JSONB), `ip_address`, `created_at`. Security-sensitive events are logged: `login_success`, `login_failure`, `logout`, `registration`, `child_created`, `child_updated`, `child_deleted`. Passwords and sensitive data are never logged.

## Implementation Details

### Files Created / Modified

| File                                        | Description                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/lib/adapters/postgres.ts`              | PostgreSQL adapter implementing `DataRepository` using the `postgres` driver |
| `src/lib/server/db.ts`                      | PostgreSQL connection pool singleton (server-only module)                    |
| `src/lib/server/session.ts`                 | Session creation, validation, deletion, and cleanup utilities                |
| `src/lib/server/auth.ts`                    | Password hashing (bcrypt) and verification utilities                         |
| `src/lib/server/rate-limit.ts`              | Login rate limiting and account lockout                                      |
| `src/lib/server/audit.ts`                   | Audit logging for security-sensitive events                                  |
| `src/lib/server/logger.ts`                  | Structured logging with pino (http, auth, audit loggers)                     |
| `src/lib/types/api.ts`                      | API request/response types including standardized error format               |
| `src/hooks.server.ts`                       | SvelteKit server hooks -- auth middleware, session resolution, cleanup       |
| `src/routes/api/auth/register/+server.ts`   | Registration endpoint                                                        |
| `src/routes/api/auth/login/+server.ts`      | Login endpoint with rate limiting                                            |
| `src/routes/api/auth/logout/+server.ts`     | Logout endpoint                                                              |
| `src/routes/api/children/+server.ts`        | List and create children endpoints                                           |
| `src/routes/api/children/[id]/+server.ts`   | Update and delete child endpoints                                            |
| `src/routes/(app)/+layout.server.ts`        | Auth guard -- loads user and children, redirects if unauthenticated          |
| `src/routes/(app)/+layout.svelte`           | Updated to include child selector in header                                  |
| `src/routes/(app)/settings/+page.svelte`    | Child management UI                                                          |
| `src/routes/(app)/settings/+page.server.ts` | Server load function for settings page data                                  |
| `src/routes/login/+page.svelte`             | Updated to wire form to `/api/auth/login`                                    |
| `src/routes/login/+page.server.ts`          | Redirect to `/calendar` if already authenticated                             |
| `src/routes/register/+page.svelte`          | Registration page                                                            |
| `src/routes/register/+page.server.ts`       | Redirect to `/calendar` if already authenticated                             |
| `src/lib/stores/children.svelte.ts`         | Updated with selected child store and setter                                 |
| `src/lib/stores/auth.svelte.ts`             | Updated with user store populated from server data                           |
| `migrations/001_initial_schema.sql`         | Full database schema DDL including audit_log table                           |
| `migrations/002_seed_food_data.sql`         | Seed data for food categories and sub-items                                  |
| `migrations/003_add_rate_limiting.sql`      | Rate limiting columns for users table                                        |
| `migrations/005_encryption_salt.sql`        | PBKDF2 encryption salt column for users table                                |
| `scripts/migrate.ts`                        | Migration runner script                                                      |
| `playwright.config.ts`                      | Playwright E2E test configuration                                            |
| `e2e/auth.spec.ts`                          | E2E tests for registration and login                                         |
| `e2e/auth-guard.spec.ts`                    | E2E tests for route protection                                               |
| `e2e/logout.spec.ts`                        | E2E tests for logout flow                                                    |
| `e2e/children.spec.ts`                      | E2E tests for child management                                               |

### Step-by-Step Instructions

#### Step 1: Create the database migration (`migrations/001_initial_schema.sql`)

This migration creates all tables matching the canonical schema in `docs/architecture/data-models.md`. PostgreSQL 16's native `gen_random_uuid()` is used (no extensions needed).

```sql
-- Reusable trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- === Auth ===

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

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- === Children (M:N via junction table) ===

CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE user_children (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, child_id)
);

-- === Food taxonomy (seeded, read-only) ===

CREATE TABLE food_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_cs TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE food_sub_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES food_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name_cs TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
CREATE INDEX idx_food_sub_items_category ON food_sub_items(category_id);

-- === Food logs ===

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

CREATE TRIGGER set_updated_at BEFORE UPDATE ON food_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- === Meals ===

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

CREATE TRIGGER set_updated_at BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

-- === Photos (unified skin + stool) ===

CREATE TABLE tracking_photos (
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
CREATE INDEX idx_tracking_photos_child_date ON tracking_photos(child_id, date);
CREATE INDEX idx_tracking_photos_type ON tracking_photos(child_id, photo_type);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tracking_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- === Analysis results (discriminated: skin vs stool) ===

CREATE TABLE analysis_results (
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
CREATE INDEX idx_analysis_results_child ON analysis_results(child_id);
CREATE INDEX idx_analysis_results_photos ON analysis_results(photo1_id, photo2_id);

-- === Push notifications ===

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- === Reminder configs ===

CREATE TABLE reminder_configs (
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

CREATE TRIGGER set_updated_at BEFORE UPDATE ON reminder_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- === Google Doc export ===

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

#### Step 2: Create the seed migration (`migrations/002_seed_food_data.sql`)

Insert food categories and their sub-items into `food_categories` and `food_sub_items` tables. Use the complete seed data from `docs/architecture/data-models.md` (13 categories, 50+ sub-items). Use proper Czech diacritics (e.g., `Mléčné výrobky`). The seed script must be idempotent (use `ON CONFLICT DO NOTHING`).

#### Step 3: Create the migration runner (`scripts/migrate.ts`)

A Node.js script that:

1. Connects to the database using `DATABASE_URL` from `.env`.
2. Creates a `_migrations` table if it does not exist.
3. Reads all `.sql` files from `migrations/` in order.
4. Executes each file that has not been run yet.
5. Records the migration in `_migrations`.

#### Step 4: Create the PostgreSQL connection pool (`src/lib/server/db.ts`)

```typescript
import postgres from "postgres";
import { DATABASE_URL } from "$env/static/private";

export const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});
```

#### Step 5: Create auth utilities (`src/lib/server/auth.ts`)

```typescript
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

#### Step 6: Create session utilities (`src/lib/server/session.ts`)

```typescript
import { sql } from "./db";
import { randomUUID } from "crypto";

const SESSION_DURATION_DAYS = 30; // 30-day sliding session

export async function createSession(userId: string): Promise<string> {
  const sessionId = randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
  );
  await sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${sessionId}, ${userId}, ${expiresAt})`;
  return sessionId;
}

export async function validateAndExtendSession(
  sessionId: string,
): Promise<{ userId: string } | null> {
  const rows = await sql`
    SELECT user_id, expires_at FROM sessions
    WHERE id = ${sessionId} AND expires_at > NOW()
  `;
  if (rows.length === 0) return null;

  // Sliding session: extend expiry, but only if less than 15 days remaining
  // This reduces database writes from every request to approximately once per 15 days
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  if (rows[0].expires_at.getTime() - Date.now() < fifteenDays) {
    const newExpiry = new Date(
      Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
    );
    await sql`UPDATE sessions SET expires_at = ${newExpiry} WHERE id = ${sessionId}`;
  }

  return { userId: rows[0].user_id };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}
```

#### Step 7: Implement SvelteKit hooks (`src/hooks.server.ts`)

```typescript
import type { Handle } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { validateAndExtendSession } from "$lib/server/session";
import { sql } from "$lib/server/db";

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get("session_id");

  if (sessionId) {
    const session = await validateAndExtendSession(sessionId);
    if (session) {
      const users =
        await sql`SELECT id, email, name FROM users WHERE id = ${session.userId}`;
      if (users.length > 0) {
        event.locals.user = users[0];
      }
    }
  }

  // Protect (app) routes
  if (
    event.url.pathname.startsWith("/calendar") ||
    event.url.pathname.startsWith("/food") ||
    event.url.pathname.startsWith("/photos") ||
    event.url.pathname.startsWith("/trends") ||
    event.url.pathname.startsWith("/settings")
  ) {
    if (!event.locals.user) {
      throw redirect(303, "/login");
    }
  }

  // Redirect authenticated users away from login
  if (event.url.pathname === "/login" && event.locals.user) {
    throw redirect(303, "/calendar");
  }

  return resolve(event);
};
```

#### Step 8: Create API routes for auth

**`/api/auth/register`**: Validate email format and password length (min 8 chars). Hash password with bcrypt. Insert user. Return 201 with user data (no password). Handle duplicate email with 409.

**`/api/auth/login`**: Look up user by email. Verify password with bcrypt. Create session. Set cookie: `session_id`, HTTP-only, Secure, SameSite=Lax, Path=/, Max-Age=2592000 (30 days, sliding). Return 200 with user data.

**`/api/auth/logout`**: Read session_id from cookie. Delete session from database. Clear cookie (Max-Age=0). Return 200.

#### Step 9: Create API routes for children

**`GET /api/children`**: Query all children linked to the authenticated user via `user_children` junction table. Return 200 with array.

**`POST /api/children`**: Validate `name` (non-empty) and `birthDate` (valid date). Insert child into `children` table, then insert a row into `user_children` linking the authenticated user. Return 201 with the created child.

**`PUT /api/children/[id]`**: Verify the child is linked to the authenticated user via `user_children` (return 403 otherwise). Update allowed fields (`name`, `birthDate`). Return 200 with updated child.

**`DELETE /api/children/[id]`**: Verify ownership via `user_children`. Delete child (cascades to `user_children` row). Return 204.

#### Step 10: Update the login page to wire to the API

Replace the static form with a SvelteKit form action or client-side fetch to `POST /api/auth/login`. On success, redirect to `/calendar`. On failure, display an error message.

#### Step 11: Create the registration page (`src/routes/register/+page.svelte`)

Similar to the login page but with name, email, and password fields. On success, auto-login and redirect to `/calendar`.

#### Step 12: Build the Settings page child management UI

- Display a list of children with name and birth date.
- "Add child" form with name and birth date inputs.
- Each child row has "Edit" (inline editing) and "Delete" (with confirmation) buttons.
- Use client-side `fetch` to interact with `/api/children` endpoints.
- Update the `children` Svelte store on mutation.

#### Step 13: Add the child selector to the app layout

In `src/routes/(app)/+layout.svelte`, add a header bar above the main content area with:

- The selected child's name displayed.
- A dropdown / modal picker listing all children.
- A "No children yet -- go to Settings" message if the user has no children.
- On selection, update the `children` store's `selectedChildId`.
- The selection persists across navigations (stored in the Svelte store).

#### Step 14: Update the (app) layout server load function

In `src/routes/(app)/+layout.server.ts`, load the user's children from the database and pass them to the layout as page data. Also pass the user object.

### Audit Logging

Add a simple audit log table for security-sensitive events:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
```

Log as a cross-cutting concern in `hooks.server.ts`:

- `login_success`, `login_failure` (with email, not password)
- `logout`
- `registration`
- `photo_upload`, `photo_delete`
- `analysis_requested`

Never log passwords, passphrases, or photo content.

### Onboarding Flow

Design a 3-step onboarding wizard for first-time users:

1. **Account + Child** (single screen): Create account fields (email, name, password) + child fields (name, birth date). Combine registration and child creation to reduce friction.
2. **Brief intro**: One-screen explanation of what the app does with a simple visual. "Sledujte eliminační dietu a stav ekzému vašeho dítěte." (Track your child's elimination diet and eczema condition.)
3. **Encryption passphrase**: Clear, non-technical Czech explanation: "Toto heslo chrání fotky vašeho dítěte. Bez něj nelze fotky obnovit — uložte si ho na bezpečné místo." (This password protects your child's photos. Without it, photos cannot be recovered — store it in a safe place.)

After onboarding, land on the calendar with a coach-mark highlighting "Klepněte na dnešek a zaznamenejte první eliminaci." (Tap today and record your first elimination.)

**Defer passphrase setup:** Consider deferring the encryption passphrase prompt until the user first attempts to take a photo, so the food tracking workflow is not blocked.

### Key Code Patterns

**Cookie session setting (in login route):**

```typescript
cookies.set("session_id", sessionId, {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 30, // 30 days (sliding — refreshed on each authenticated request)
});
```

**Auth guard in hooks.server.ts:**

The `handle` hook runs on every server request. It reads the `session_id` cookie, validates it against the database, and populates `event.locals.user`. Protected route checks happen by inspecting the URL pathname. This pattern is centralised -- individual routes do not need to check auth themselves.

**Password hashing with bcrypt:**

```typescript
// Registration: hash before storing
const passwordHash = await bcrypt.hash(password, 12);

// Login: compare plaintext against stored hash
const isValid = await bcrypt.compare(password, user.password_hash);
```

**Child selector store pattern (Svelte 5 runes in a `.svelte.ts` module):**

```typescript
// src/lib/stores/children.svelte.ts
import type { Child } from "$lib/domain/models";

let children = $state<Child[]>([]);
let selectedChildId = $state<string | null>(null);

const selectedChild = $derived(
  children.find((c) => c.id === selectedChildId) ?? children[0] ?? null,
);

export function getChildren() {
  return children;
}
export function setChildren(value: Child[]) {
  children = value;
}
export function getSelectedChildId() {
  return selectedChildId;
}
export function setSelectedChildId(id: string | null) {
  selectedChildId = id;
}
export function getSelectedChild() {
  return selectedChild;
}
```

**PostgreSQL adapter pattern (Ports & Adapters — entity-specific methods):**

```typescript
import { sql } from "$lib/server/db";
import type { DataRepository } from "$lib/domain/ports/repository";
import type { User, Child } from "$lib/domain/models";

export class PostgresRepository implements DataRepository {
  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
    return rows.length > 0 ? this.mapUser(rows[0]) : null;
  }

  async getChildrenForUser(userId: string): Promise<Child[]> {
    const rows = await sql`
      SELECT c.* FROM children c
      JOIN user_children uc ON uc.child_id = c.id
      WHERE uc.user_id = ${userId}
    `;
    return rows.map(this.mapChild);
  }

  async createChild(
    child: Omit<Child, "id" | "createdAt" | "updatedAt">,
  ): Promise<Child> {
    const rows = await sql`
      INSERT INTO children (name, birth_date)
      VALUES (${child.name}, ${child.birthDate})
      RETURNING *
    `;
    return this.mapChild(rows[0]);
  }

  async linkUserToChild(userId: string, childId: string): Promise<void> {
    await sql`INSERT INTO user_children (user_id, child_id) VALUES (${userId}, ${childId})`;
  }
  // ... other entity-specific methods per ports-and-adapters.md
}
```

## Post-Implementation State

Users can register an account on the `/register` page and log in on the `/login` page. Successful login sets an HTTP-only session cookie and redirects to `/calendar`. All `(app)` routes are protected -- unauthenticated users are redirected to `/login`. Authenticated users who visit `/login` are redirected to `/calendar`.

In Settings, users can add, edit, and delete children. Each child has a name and birth date. The app header displays a child selector dropdown. Selecting a child updates a global store that will be used by food tracking and skin tracking in later phases.

The PostgreSQL database has all tables created (matching `docs/architecture/data-models.md`). The `food_categories` table contains 13 Czech allergen categories with icons, and `food_sub_items` contains their sub-items (50+ items total). The full schema supports food logs, meals, tracking photos (skin + stool), analysis results, push subscriptions, reminder configs, and sessions.

## Test Suite

### Unit Tests

**Test file: `src/lib/server/auth.test.ts`**

| #   | Test Case                                            | Details                                                                                                                                                 |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `hashPassword` returns a bcrypt hash                 | Call `hashPassword('testpass123')`. Assert result starts with `$2b$` and has length > 50.                                                               |
| 2   | `verifyPassword` succeeds with correct password      | Hash `'mypassword'`, then call `verifyPassword('mypassword', hash)`. Assert it returns `true`.                                                          |
| 3   | `verifyPassword` fails with incorrect password       | Hash `'mypassword'`, then call `verifyPassword('wrongpassword', hash)`. Assert it returns `false`.                                                      |
| 4   | `hashPassword` produces unique hashes for same input | Hash `'samepassword'` twice. Assert the two hashes are different (bcrypt uses random salts).                                                            |
| 5   | `hashPassword` rejects empty string                  | Call `hashPassword('')`. Define expected behaviour: either reject or hash it (bcrypt does hash empty strings, so assert it still returns a valid hash). |

**Test file: `src/lib/stores/children.test.ts`**

| #   | Test Case                                                           | Details                                                                                                                               |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | `selectedChild` derived store returns first child when no selection | Set `children` to `[childA, childB]`, leave `selectedChildId` as `null`. Subscribe to `selectedChild` and assert it returns `childA`. |
| 7   | `selectedChild` returns the matching child                          | Set `selectedChildId` to `childB.id`. Assert `selectedChild` returns `childB`.                                                        |
| 8   | `selectedChild` returns null when children array is empty           | Set `children` to `[]`. Assert `selectedChild` returns `null`.                                                                        |
| 9   | `selectedChild` falls back to first child when ID is invalid        | Set `selectedChildId` to `'nonexistent-id'`. Assert `selectedChild` returns the first child in the array.                             |

### Integration Tests

**Test file: `tests/integration/auth-api.test.ts`**

| #   | Test Case                                              | Details                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | `POST /api/auth/register` creates a user               | Send `{ email: 'test@example.com', password: 'password123', name: 'Test User' }`. Assert status 201. Assert response body has `id`, `email`, `name` but not `password` or `password_hash`.                                                                |
| 11  | `POST /api/auth/register` rejects duplicate email      | Register the same email twice. Assert second request returns status 409 with an error message.                                                                                                                                                            |
| 12  | `POST /api/auth/register` rejects short password       | Send `{ email: 'a@b.com', password: '123', name: 'X' }`. Assert status 400.                                                                                                                                                                               |
| 13  | `POST /api/auth/register` rejects invalid email format | Send `{ email: 'not-an-email', password: 'password123', name: 'X' }`. Assert status 400.                                                                                                                                                                  |
| 14  | `POST /api/auth/login` returns session cookie          | Register a user, then login. Assert status 200. Assert `Set-Cookie` header contains `session_id`. Assert cookie flags include `HttpOnly`, `Path=/`.                                                                                                       |
| 15  | `POST /api/auth/login` rejects invalid credentials     | Send `{ email: 'test@example.com', password: 'wrongpassword' }`. Assert status 401. Assert no `Set-Cookie` header.                                                                                                                                        |
| 16  | `POST /api/auth/login` rejects non-existent user       | Send `{ email: 'nobody@example.com', password: 'whatever' }`. Assert status 401.                                                                                                                                                                          |
| 17  | `POST /api/auth/logout` clears session                 | Login to get a session cookie. Send `POST /api/auth/logout` with the cookie. Assert status 200. Assert the response sets `session_id` cookie with `Max-Age=0`. Attempt to access a protected resource with the old cookie -- assert redirect to `/login`. |
| 18  | Session expires after 30 days                          | Create a session with `expires_at` set to 1 second in the past (directly in DB). Attempt to validate it. Assert `validateAndExtendSession` returns `null`.                                                                                                |

**Test file: `tests/integration/children-api.test.ts`**

| #   | Test Case                                                          | Details                                                                                                                                           |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 19  | `GET /api/children` returns empty array for new user               | Register, login, fetch children. Assert status 200 and empty array.                                                                               |
| 20  | `POST /api/children` creates a child                               | Send `{ name: 'Emma', birthDate: '2025-12-01' }` with session cookie. Assert status 201. Assert response has `id`, `name`, `birthDate`, `userId`. |
| 21  | `GET /api/children` returns created children                       | Create two children, then fetch. Assert array length is 2.                                                                                        |
| 22  | `PUT /api/children/[id]` updates the child name                    | Create a child, then update name to `'Emmy'`. Assert status 200 and updated name in response.                                                     |
| 23  | `DELETE /api/children/[id]` removes the child                      | Create a child, then delete. Assert status 204. Fetch children and assert empty array.                                                            |
| 24  | `PUT /api/children/[id]` rejects access to another user's child    | Register two users. User A creates a child. User B attempts to update that child. Assert status 403.                                              |
| 25  | `DELETE /api/children/[id]` rejects access to another user's child | Same cross-user scenario as above but for deletion. Assert status 403.                                                                            |
| 26  | `POST /api/children` requires authentication                       | Send without session cookie. Assert status 401 or redirect.                                                                                       |

**Test file: `tests/integration/seed-data.test.ts`**

| #   | Test Case                                       | Details                                                                                                                                      |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 27  | Food categories are seeded                      | Query `SELECT COUNT(*) FROM food_categories`. Assert count >= 13.                                                                            |
| 28  | Food sub-items are seeded                       | Query `SELECT COUNT(*) FROM food_sub_items`. Assert count >= 50.                                                                             |
| 29  | Every food sub-item references a valid category | Query `SELECT fsi.id FROM food_sub_items fsi LEFT JOIN food_categories fc ON fsi.category_id = fc.id WHERE fc.id IS NULL`. Assert zero rows. |
| 30  | Dairy category has 8 sub-items                  | Query sub-items where category slug = `'dairy'`. Assert count = 8.                                                                           |
| 31  | Categories have Czech names and icons           | Query all categories. Assert every row has non-null, non-empty `name_cs` and `icon`.                                                         |

### E2E Tests (Automated with Playwright)

All manual test scenarios are now automated in `e2e/` directory:

**Test file: `e2e/auth.spec.ts`**
- User registration and redirect to calendar
- User login with valid credentials
- Login failure with invalid credentials

**Test file: `e2e/auth-guard.spec.ts`**
- Protected routes redirect to login when unauthenticated
- Authenticated users redirected away from login page

**Test file: `e2e/logout.spec.ts`**
- Logout clears session and redirects to login
- Back button after logout stays on login page

**Test file: `e2e/children.spec.ts`**
- Add child and verify in settings/header
- Edit child name and verify update
- Add multiple children and select between them
- Child selection persists across navigation
- Child deletion with confirmation dialog
- Empty state shows "Add child" link in header

**Run E2E tests:**
```bash
bun run test:e2e        # Headless mode
bun run test:e2e:ui     # Interactive UI mode
```

**Manual Testing (Optional):**
If you prefer to test manually on a real device:
1. Start: `bun run dev`
2. Access `https://<your-lan-ip>:5173` on your phone
3. Run through the scenarios above in the e2e test files

### Regression Checks

All Phase 0 baseline checks must still pass:

- [ ] `bun run dev` starts without errors.
- [ ] `bun run build` completes without errors.
- [ ] TypeScript compilation (`bunx tsc --noEmit`) passes with zero errors.
- [ ] The PWA manifest is valid (Chrome DevTools > Application > Manifest).
- [ ] The service worker registers successfully.
- [ ] The bottom navigation bar renders correctly on a 375px viewport.
- [ ] `docker compose up -d` starts PostgreSQL and it accepts connections.
- [ ] All Dexie.js tables (`children`, `foodCategories`, `foodSubItems`, `foodLogs`, `meals`, `mealItems`, `trackingPhotos`, `analysisResults`, `photoBlobs`) are still accessible after `db.open()`.
- [ ] The login page still renders correctly (now with backend wiring).
- [ ] Navigating to `/` still redirects to `/calendar` (which now redirects to `/login` if unauthenticated).
