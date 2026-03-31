# Code Overview for Non-TypeScript Developers

This document provides a high-level understanding of the Eczema Tracker codebase for team members who are not TypeScript developers. It explains what each file does and how information flows through the system.

## Quick Reference: What Each Folder Does

```
src/
├── routes/          → Web pages and API endpoints (what users see/access)
├── lib/
│   ├── domain/      → Business rules and data definitions
│   ├── adapters/    → Database connections
│   ├── server/      → Server-only utilities (auth, sessions, logging)
│   ├── stores/      → Client-side state management
│   ├── components/  → Reusable UI pieces
│   ├── crypto/      → Photo encryption (not yet implemented)
│   ├── types/       → Shared type definitions
│   └── i18n/        → Czech translations
└── hooks.server.ts  → Request interceptor (runs before every request)
```

---

## Information Flow Diagrams

### 1. User Login Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           USER LOGIN FLOW                                 │
└──────────────────────────────────────────────────────────────────────────┘

User types email/password
         │
         ▼
┌─────────────────────┐
│  Login Page         │  src/routes/login/+page.svelte
│  (Browser Form)     │  → User fills out login form
└─────────────────────┘
         │
         │ HTTP POST /api/auth/login
         ▼
┌─────────────────────┐
│  Login API Endpoint │  src/routes/api/auth/login/+server.ts
│  (Server)           │  → Receives email/password
└─────────────────────┘
         │
         ├──────────────────────────────────────────────┐
         │                                              │
         ▼                                              ▼
┌─────────────────────┐                    ┌─────────────────────┐
│  Rate Limiter       │                    │  Database           │
│                     │                    │                     │
│  src/lib/server/    │                    │  src/lib/server/    │
│  rate-limit.ts      │                    │  db.ts              │
│                     │                    │                     │
│  Checks: "Has this  │                    │  Looks up user by   │
│  user tried too     │                    │  email address      │
│  many times?"       │                    │                     │
└─────────────────────┘                    └─────────────────────┘
         │                                              │
         │                                              │
         └──────────────────┬───────────────────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │  Password Verifier  │  src/lib/server/auth.ts
                 │                     │  → Checks if password matches
                 └─────────────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │  Session Creator    │  src/lib/server/session.ts
                 │                     │  → Creates a 30-day session
                 │                     │  → Stores session ID in database
                 └─────────────────────┘
                            │
                            │ Sets cookie: session_id
                            ▼
                 ┌─────────────────────┐
                 │  Browser Cookie     │  Cookie stored in browser
                 │                     │  → Used for all future requests
                 └─────────────────────┘
```

### 2. Authenticated Page Request Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATED PAGE REQUEST                            │
└──────────────────────────────────────────────────────────────────────────┘

User navigates to /calendar
         │
         │ (Browser sends session_id cookie automatically)
         ▼
┌─────────────────────┐
│  Request Hooks      │  src/hooks.server.ts
│  (Interceptor)      │
│                     │  EVERY request goes through here first
│                     │
│  What it does:      │
│  1. Reads session_id cookie
│  2. Validates session in database
│  3. Loads user data
│  4. Loads children data
│  5. Attaches all this to the request
└─────────────────────┘
         │
         │ If session invalid → redirect to /login
         │ If session valid → continue
         ▼
┌─────────────────────┐
│  Layout Loader      │  src/routes/(app)/+layout.server.ts
│                     │
│  Passes user and    │  → Returns { user, children } to page
│  children data to   │
│  the page           │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  App Layout         │  src/routes/(app)/+layout.svelte
│                     │
│  Initializes        │  → Sets up authStore (who's logged in)
│  client stores      │  → Sets up childrenStore (active child)
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Calendar Page      │  src/routes/(app)/calendar/+page.svelte
│                     │
│  Renders the        │  → Shows the calendar interface
│  actual page        │  → Can access user/child via stores
└─────────────────────┘
```

### 3. Creating a Child Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CREATE CHILD FLOW                                │
└──────────────────────────────────────────────────────────────────────────┘

User fills "Add Child" form (name, birth date)
         │
         │ HTTP POST /api/children
         ▼
┌─────────────────────┐
│  Children API       │  src/routes/api/children/+server.ts
│                     │
│  What it does:      │
│  1. Checks if user is logged in
│  2. Checks if user already has a child (limit: 1)
│  3. Validates name (max 100 chars)
│  4. Validates birth date
│  5. Creates child in database
│  6. Links child to user
│  7. Logs audit event
│  8. Returns child data
└─────────────────────┘
         │
         │ Uses raw SQL queries
         ▼
┌─────────────────────┐
│  PostgreSQL         │  Database tables:
│  Database           │  - children (id, name, birth_date)
│                     │  - user_children (user_id, child_id)
└─────────────────────┘
         │
         │ Returns created child
         ▼
┌─────────────────────┐
│  Browser Updates    │  childrenStore gets updated
│  Child Store        │  UI re-renders with new child
└─────────────────────┘
```

---

## File-by-File Explanation

### Core Server Files

| File | What It Does | Plain English |
|------|--------------|---------------|
| `src/hooks.server.ts` | Request interceptor | "Before any page loads, check if the user is logged in and load their data" |
| `src/lib/server/db.ts` | Database connection | "Connect to PostgreSQL and provide a way to run queries" |
| `src/lib/server/session.ts` | Session management | "Create, validate, and extend user login sessions (30 days)" |
| `src/lib/server/auth.ts` | Password handling | "Hash passwords for storage, verify passwords on login" |
| `src/lib/server/rate-limit.ts` | Brute-force protection | "Block users who try wrong passwords too many times (5 attempts = 15 min lockout)" |
| `src/lib/server/audit.ts` | Security logging | "Keep a record of important actions (logins, child creation) for security" |
| `src/lib/server/logger.ts` | Application logging | "Write logs for debugging and monitoring" |
| `src/lib/server/env.ts` | Environment config | "Read and validate environment variables (DATABASE_URL, etc.)" |
| `src/lib/server/shutdown.ts` | Graceful shutdown | "When server stops, close database connections properly" |

### API Endpoints

| Endpoint | File | What It Does |
|----------|------|--------------|
| `POST /api/auth/login` | `src/routes/api/auth/login/+server.ts` | Log user in with email/password |
| `POST /api/auth/register` | `src/routes/api/auth/register/+server.ts` | Create new user account |
| `POST /api/auth/logout` | `src/routes/api/auth/logout/+server.ts` | Log user out (delete session) |
| `GET /api/children` | `src/routes/api/children/+server.ts` | List user's children |
| `POST /api/children` | `src/routes/api/children/+server.ts` | Add a new child |
| `PATCH /api/children/[id]` | `src/routes/api/children/[id]/+server.ts` | Update child info |
| `DELETE /api/children/[id]` | `src/routes/api/children/[id]/+server.ts` | Delete a child |
| `GET /api/health` | `src/routes/api/health/+server.ts` | Server health check |

### Domain Layer (Business Logic Definitions)

| File | What It Does |
|------|--------------|
| `src/lib/domain/models.ts` | Defines data shapes (User, Child, FoodLog, Photo, etc.) |
| `src/lib/domain/ports/repository.ts` | Defines what database operations are needed |
| `src/lib/domain/ports/analyzer.ts` | Defines interface for AI photo analysis |
| `src/lib/domain/ports/photo-storage.ts` | Defines interface for encrypted photo storage |
| `src/lib/domain/ports/notifications.ts` | Defines interface for push notifications |

### Adapters (Database Implementations)

| File | What It Does |
|------|--------------|
| `src/lib/adapters/postgres.ts` | Implements repository for PostgreSQL (server-side) |
| `src/lib/adapters/dexie-db.ts` | Implements local database for offline use (IndexedDB in browser) |

### Client-Side Stores

| File | What It Stores |
|------|----------------|
| `src/lib/stores/auth.svelte.ts` | Current logged-in user |
| `src/lib/stores/children.svelte.ts` | User's children + which child is active |
| `src/lib/stores/food-log.svelte.ts` | Food elimination/reintroduction logs |
| `src/lib/stores/photos.svelte.ts` | Tracking photos |

### Type Definitions

| File | What It Defines |
|------|-----------------|
| `src/lib/types/api.ts` | API request/response shapes |
| `src/lib/types/result.ts` | Success/Error result pattern |
| `src/lib/types/index.ts` | Re-exports all types |

---

## Key Concepts

### 1. The "Result" Pattern

Instead of throwing errors, functions return a result object:

```
Success: { ok: true, data: { ... } }
Error:   { ok: false, error: "Something went wrong" }
```

This makes error handling explicit and predictable.

### 2. API Response Envelope

All API responses follow this pattern:

```json
// Success
{ "ok": true, "data": { "id": "123", "name": "Baby" } }

// Error
{ "ok": false, "error": "Invalid request", "code": "VALIDATION_ERROR" }
```

### 3. Snake_case vs camelCase

- **Database columns**: use snake_case (`birth_date`, `created_at`)
- **TypeScript code**: uses camelCase (`birthDate`, `createdAt`)
- **Mapping happens** in the adapter layer (`postgres.ts`)

### 4. Discriminated Unions

When a type can be one of several variants, TypeScript uses a "discriminator" field:

```typescript
// A photo is either skin OR stool, never both
type TrackingPhoto =
  | { photoType: 'skin'; bodyArea: 'face' | 'arms'; severity?: number }
  | { photoType: 'stool'; color?: 'yellow' | 'green'; consistency?: 'soft' | 'hard' }
```

---

## Security Features

1. **Rate Limiting**: 5 failed logins = 15 minute lockout
2. **Password Hashing**: bcrypt with 12 rounds
3. **Session Management**: 30-day sessions with sliding expiry
4. **Timing Attack Prevention**: Dummy hash verification for non-existent users
5. **Audit Logging**: All security events are logged
6. **Input Validation**: All inputs validated at API boundary

---

## What's Not Implemented Yet

- Photo encryption (`src/lib/crypto/encryption.ts` - just stubs)
- AI photo analysis (interfaces defined, no implementation)
- Push notifications (interfaces defined, no implementation)
- Most app pages (calendar, food, photos, trends - just placeholder text)

These will be built in Phase 2 and beyond.
