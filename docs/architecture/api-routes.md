# API Routes Reference

Consolidated API route reference for the Eczema Tracker PWA (SvelteKit 2). All routes are SvelteKit server routes (`+server.ts`). They run server-side only. All routes require HTTPS.

## Authentication

All routes except `/api/auth/register`, `/api/auth/login`, and `/api/health` require a valid `session_id` cookie. Unauthenticated requests receive `401`. Rate limited per IP via Nginx (see [Rate Limiting](#rate-limiting)).

---

## Endpoints

### Auth (Phase 1)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|--------------|----------|-------|
| POST | `/api/auth/register` | No | `{ email, password, name }` | 201: User (no password) | 409 if email taken. 400 if invalid. Disabled when `REGISTRATION_ENABLED=false` (403). |
| POST | `/api/auth/login` | No | `{ email, password }` | 200: User + Set-Cookie | 401 if invalid. Cookie: `session_id`, 30-day sliding. |
| POST | `/api/auth/logout` | Yes | -- | 200 | Deletes session, clears cookie. |

### Children (Phase 1)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|--------------|----------|-------|
| GET | `/api/children` | Yes | -- | 200: `Child[]` | Children linked to user via `user_children`. |
| POST | `/api/children` | Yes | `{ name, birthDate }` | 201: `Child` | Creates child + `user_children` link. |
| PUT | `/api/children/[id]` | Yes | `{ name?, birthDate? }` | 200: `Child` | 403 if not linked to user. |
| DELETE | `/api/children/[id]` | Yes | -- | 204 | 403 if not linked to user. Cascades. |

### Food Logs (Phase 2a)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|--------------|----------|-------|
| GET | `/api/food-logs?childId=X&startDate=Y&endDate=Z` | Yes | -- | 200: `FoodLog[]` | Filtered by child and date range. |
| POST | `/api/food-logs` | Yes | `{ childId, date, categoryId, subItemId?, action, notes? }` | 201: `FoodLog` | `action`: `'eliminated'` or `'reintroduced'`. |
| PUT | `/api/food-logs/[id]` | Yes | Partial `FoodLog` | 200: `FoodLog` | Verifies child ownership. |
| DELETE | `/api/food-logs/[id]` | Yes | -- | 204 | Verifies child ownership. |

### Meals (Phase 2b)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|--------------|----------|-------|
| GET | `/api/meals?date=YYYY-MM-DD` | Yes | -- | 200: `Meal[]` (with items) | Meals for the authenticated user on date. |
| POST | `/api/meals` | Yes | `{ date, mealType, label?, items: MealItem[] }` | 201: `Meal` | Creates meal + items in one request. |
| PUT | `/api/meals/[id]` | Yes | Partial `Meal` | 200: `Meal` | Verifies ownership. |
| DELETE | `/api/meals/[id]` | Yes | -- | 204 | Cascades to `meal_items`. |

### Photos (Phase 3)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|--------------|----------|-------|
| GET | `/api/photos?childId=X` | Yes | -- | 200: `TrackingPhoto[]` | Metadata only (no blobs). |
| POST | `/api/photos` | Yes | multipart: `blob`, `thumbnail`, `metadata` (JSON) | 201: `{ id }` | Encrypted blobs stored on filesystem. |
| GET | `/api/photos/[id]/blob` | Yes | -- | 200: `ArrayBuffer` | Streams encrypted full-size blob. |
| GET | `/api/photos/[id]/thumbnail` | Yes | -- | 200: `ArrayBuffer` | Streams encrypted thumbnail. |
| DELETE | `/api/photos/[id]` | Yes | -- | 204 | Deletes blob files + metadata. 403 if not owner. |

### AI Analysis (Phase 4)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|--------------|----------|-------|
| POST | `/api/analyze` | Yes | multipart: `photo1`, `photo2`, `context` (JSON) | 200: `AnalysisResult` | Server proxy to Claude API. Photos held in memory only. |
| POST | `/api/analysis` | Yes | `AnalysisResult` JSON | 201: `AnalysisResult` | Persists analysis result to DB. |
| GET | `/api/analysis?childId=X` | Yes | -- | 200: `AnalysisResult[]` | Sorted newest first. |
| GET | `/api/analysis/[id]` | Yes | -- | 200: `AnalysisResult` | 404 if not found. |

### Push Notifications (Phase 6)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|--------------|----------|-------|
| POST | `/api/push` | Yes | `PushSubscription` JSON | 200 | Upserts subscription by endpoint. |
| DELETE | `/api/push` | Yes | `{ endpoint }` | 200 | Removes subscription. |

### Google Export (Phase 7)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|--------------|----------|-------|
| GET | `/api/google/connect` | Yes | -- | 302: Google OAuth URL | Initiates OAuth2 flow. |
| GET | `/api/google/callback` | Yes | (query: `code`, `state`) | 302: `/export` | Exchanges code for tokens. |
| POST | `/api/google/export` | Yes | multipart: photos + report data | 200: `{ docUrl }` | Creates/updates Google Doc. |
| DELETE | `/api/google/disconnect` | Yes | -- | 200 | Revokes token, removes connection. |

### Health (Phase 8)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|--------------|----------|-------|
| GET | `/api/health` | No | -- | 200: `{ status, database, photoStorage, timestamp }` | Used by Docker healthcheck and monitoring. |

---

## Error Response Format

All error responses use this structure:

```json
{
  "error": "Czech-language error message for the user",
  "code": "MACHINE_READABLE_CODE"
}
```

Common codes:

| Code | HTTP Status |
|------|-------------|
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 400 |
| `CONFLICT` | 409 |
| `RATE_LIMITED` | 429 |
| `INTERNAL_ERROR` | 500 |

---

## Rate Limiting

Handled by Nginx `limit_req`:

| Scope | Limit | Burst |
|-------|-------|-------|
| Auth endpoints (`/api/auth/*`) | 5 req/min per IP | 3 |
| All other API endpoints (`/api/*`) | 30 req/min per IP | 10 |
