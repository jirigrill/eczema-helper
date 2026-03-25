# Security Design Review -- Eczema Tracker PWA

**Reviewer:** Senior Security Engineer (15+ years, specializing in E2E encryption, authentication, and medical data protection)
**Date:** 2026-03-25
**Scope:** All documentation in `docs/` -- architecture, data models, encryption, auth, API routes, deployment, and implementation phases 0-8
**Application type:** Personal/family medical data tracking PWA (2 users, self-hosted)

---

## Executive Summary

The security design of this Eczema Tracker PWA is **well above average for a personal project** and demonstrates thoughtful, defense-in-depth thinking. The E2E encryption scheme (AES-256-GCM with PBKDF2 key derivation at 600K iterations) is correctly specified, the authentication layer follows established best practices (bcrypt, HttpOnly cookies, server-side sessions), and the deployment architecture properly isolates components. The most significant concerns are: (1) an inconsistency in the encryption docs regarding the AI analysis flow that could lead to a dangerous implementation, (2) the absence of application-level rate limiting (relying solely on Nginx), and (3) insufficient guidance on IndexedDB data protection. Overall, the design is **sufficient to begin implementation** with the recommended fixes applied.

---

## Findings

### CRITICAL

#### C-1: Contradictory AI Photo Flow -- Encryption Doc vs Auth Doc vs Phase 4

**Description:** The documentation contains a critical inconsistency about how decrypted photos reach the Claude Vision API. The encryption doc (`encryption.md`, "AI Analysis" diagram, lines 95-114) states: *"Browser sends decrypted images directly to Claude Vision API -> HTTPS POST to api.anthropic.com"* and *"The server never handles decrypted photos during analysis. The browser decrypts locally and calls Claude directly."* However, `auth-overview.md` (lines 162-176) describes the correct server-proxy pattern: *"Client decrypts photos locally... Client sends decrypted photos to POST /api/analyze... Server reads CLAUDE_API_KEY from environment, forwards photos to Claude Vision API."* Phase 4 implementation instructions also correctly describe the server-proxy pattern. The `CLAUDE.md` project instructions also confirm the server-proxy pattern.

**Risk:** If a developer follows `encryption.md`, they would embed the Claude API key in the client bundle (catastrophic key exposure) and bypass the server proxy entirely. The encryption doc's threat model section even lists "Claude API key exposure -- API key is used client-side to call Claude" as a known weakness, which contradicts the intended design.

**Current state:** Contradictory. The encryption doc's AI Analysis flow diagram and threat model table are wrong. The auth-overview, tech-stack, phase 4, and CLAUDE.md are correct.

**Recommendation:** Update `encryption.md`:
1. Rewrite the "AI Analysis" flow diagram to show: Browser decrypts -> sends to `POST /api/analyze` -> server forwards to Claude -> server streams response back.
2. Remove the threat model row about "Claude API key exposure -- API key is used client-side" and replace with: "Server-side photo exposure -- server holds decrypted photos in memory briefly during AI analysis. Mitigated by never writing to disk and discarding after response."
3. Add a note to the encryption doc referencing `auth-overview.md` for the canonical server-proxy description.

---

### HIGH

#### H-1: No Application-Level Rate Limiting -- Single Point of Failure at Nginx

**Description:** Rate limiting is handled exclusively by Nginx `limit_req` zones (5 req/min for auth, 30 req/min for all API). If the app is ever accessed without Nginx in front (e.g., during development on port 3000, or if Nginx is misconfigured), there is zero rate limiting. Additionally, Nginx rate limiting is per-IP only, which means an attacker behind a shared IP (NAT, VPN) could rate-limit legitimate users, while an attacker with multiple IPs bypasses the limit entirely.

**Current state:** Documented in `api-routes.md` and `deployment.md` Nginx config. No application-level fallback.

**Recommendation:**
1. Implement application-level rate limiting in `hooks.server.ts` as a fallback, at minimum for auth endpoints. A simple in-memory counter (or a lightweight library like `rate-limiter-flexible` backed by the existing PostgreSQL) would suffice.
2. The auth doc mentions "5 failed attempts per 15 minutes per email" -- this per-email limiting is not implemented in the Nginx config (which is per-IP only). Implement this check in the login route handler to prevent credential stuffing against a specific account even from rotating IPs.

#### H-2: Session ID Uses crypto.randomUUID() -- Insufficient Entropy for Session Tokens

**Description:** The session management docs (`auth-overview.md`, line 96 and Phase 1 step 6) specify `crypto.randomUUID()` for session IDs. UUIDs v4 provide 122 bits of randomness, which is adequate but not ideal for session tokens. More critically, the session ID is stored directly as the cookie value and used as the database primary key. If session IDs are predictable or have collisions (extremely unlikely but architecturally fragile), an attacker could hijack sessions.

**Current state:** Documented in auth-overview.md. UUID v4 with 122 bits of entropy.

**Recommendation:** This is borderline acceptable for a 2-user app. For a more robust design, consider using `crypto.randomBytes(32).toString('hex')` (256 bits) for session tokens, storing them as a separate column (not the primary key), and hashing them with SHA-256 before database storage. This prevents session token leakage if the sessions table is ever exposed via SQL injection. However, given the app scope, the current approach is pragmatically acceptable -- flag this as a known trade-off.

#### H-3: No CSRF Protection on API Routes During Development

**Description:** The deployment doc notes: *"SvelteKit's +server.ts endpoints automatically check the Origin header on non-GET requests when running in production mode."* This means CSRF protection is **absent during development**. If a developer tests with `NODE_ENV=development` while the app is accessible on the LAN (which it is, via Caddy on `0.0.0.0:443`), any website visited on the same network could make cross-origin POST requests to the API.

**Current state:** Documented as a note in `deployment.md`, line 506.

**Recommendation:** Either:
1. Explicitly configure SvelteKit's CSRF protection to be active in all environments (set `csrf.checkOrigin` in `svelte.config.js`), or
2. Document this risk clearly in the Phase 0 scaffold and ensure the dev Caddyfile does not expose the app beyond the local network.

---

### MEDIUM

#### M-1: Encryption Key Cached in JavaScript Memory for Entire Session

**Description:** The derived AES-256-GCM CryptoKey is cached in JavaScript memory for the entire browser session (from passphrase entry until logout or tab close). This means the key persists even when the user is not actively viewing photos. If the device is compromised (XSS, malicious browser extension, physical access to unlocked phone), the key could be extracted. The `CryptoKey` object is marked as `extractable: false`, which prevents `crypto.subtle.exportKey()`, but does not prevent using it for encrypt/decrypt operations.

**Current state:** Documented in `encryption.md` as a known limitation. The threat model acknowledges device compromise.

**Recommendation:**
1. Consider adding a configurable auto-lock timeout (e.g., 5 minutes of inactivity) that clears the CryptoKey from memory and requires re-entering the passphrase. This is especially important for a medical photo app.
2. Document this as a Phase 8 polish item if not implemented initially.
3. Revoke all `URL.createObjectURL()` references promptly when components unmount (already mentioned in docs but worth enforcing via code review).

#### M-2: No Content-Security-Policy for connect-src to Restrict Outbound Connections

**Description:** The CSP header in `deployment.md` specifies `connect-src 'self'`, which correctly restricts fetch/XHR to the same origin. However, the Phase 4 implementation (if incorrectly following `encryption.md` -- see C-1) would need `connect-src 'self' https://api.anthropic.com`. The correct server-proxy design keeps `connect-src 'self'`, which is good. But the CSP does not restrict WebSocket connections or other connection types beyond `connect-src`. Additionally, the CSP uses `'unsafe-inline'` for `style-src`, which is common with Tailwind but weakens CSP protections.

**Current state:** CSP is documented in the Nginx config in `deployment.md`. The Phase 8 Nginx config has a slightly different CSP (adds `worker-src 'self'`, `manifest-src 'self'`, and uses `'unsafe-inline'` for both `script-src` and `style-src`).

**Recommendation:**
1. Reconcile the two CSP headers (deployment.md vs phase-8-deploy.md). Use one canonical CSP.
2. Avoid `'unsafe-inline'` for `script-src` if possible (SvelteKit can be configured to use nonces). This is important because `'unsafe-inline'` for scripts defeats most XSS protections that CSP provides.
3. Add `connect-src 'self' https://api.anthropic.com` ONLY if the client-direct pattern is used (it should not be). If server-proxy is correctly implemented, `connect-src 'self'` is correct and should be kept.

#### M-3: Photo Blob Path Stored in Database Could Enable Path Traversal

**Description:** The `tracking_photos` table stores `encrypted_blob_path TEXT NOT NULL` which is a filesystem path. If this path is constructed from user input (childId, date, photoId) without proper sanitization, a path traversal attack could read or overwrite arbitrary files on the server. The upload endpoint (`POST /api/photos`) constructs the path as `/data/photos/{childId}/{date}/{photoId}.enc`.

**Current state:** The path structure is documented in `deployment.md` and `encryption.md`. No explicit sanitization guidance is provided.

**Recommendation:**
1. Validate that `childId` is a valid UUID, `date` matches `YYYY-MM-DD` format, and `photoId` is a valid UUID before constructing the path.
2. Use `path.resolve()` and verify the resulting path starts with the expected base directory (`/data/photos/`).
3. Never pass the raw `encrypted_blob_path` from the database directly to filesystem operations without validation.
4. Add this guidance to the Phase 3 implementation steps.

#### M-4: No Audit Logging for Security-Sensitive Operations

**Description:** There is no mention of audit logging for security events: login attempts (successful and failed), password changes, passphrase changes, photo access, AI analysis requests, or Google OAuth token operations. For a medical data app, even a personal one, audit trails help detect unauthorized access.

**Current state:** Not documented anywhere.

**Recommendation:**
1. Add a simple `audit_log` table: `(id, user_id, action, details_json, ip_address, created_at)`.
2. Log at minimum: login success/failure, logout, registration, session creation/deletion, photo upload/download, AI analysis requests, Google OAuth connect/disconnect.
3. This does not need to be complex -- a single INSERT per event. It can be implemented as a cross-cutting concern in `hooks.server.ts`.
4. Add this to Phase 1 or Phase 8.

#### M-5: Google OAuth Refresh Token Encryption Uses SESSION_SECRET Directly as Key

**Description:** The `auth-overview.md` shows refresh token encryption using `Buffer.from(secret, 'hex').subarray(0, 32)` where `secret` is `SESSION_SECRET`. This means:
1. The same key material is used for two purposes (session management and token encryption), violating the principle of key separation.
2. If `SESSION_SECRET` is rotated, all encrypted refresh tokens become undecryptable (documented as a known impact, but still a design weakness).
3. The encryption uses a 16-byte IV for AES-256-GCM. While functional, the standard recommendation for GCM is 12 bytes (96 bits). Using 16 bytes triggers a different internal processing path that is less efficient but not insecure.

**Current state:** Documented with code example in `auth-overview.md` lines 196-228.

**Recommendation:**
1. Derive separate keys for different purposes. Use HKDF to derive a token encryption key from `SESSION_SECRET` with a distinct context string (e.g., `"google-token-encryption"`).
2. Use 12-byte IVs consistently (matching the photo encryption scheme).
3. Consider adding a separate `TOKEN_ENCRYPTION_KEY` env var to fully decouple from session management.

#### M-6: Passphrase Minimum Length of 12 Characters May Be Insufficient Guidance

**Description:** Phase 3 acceptance criteria specify a minimum passphrase length of 12 characters. While the PBKDF2 iteration count (600K) makes brute force expensive, passphrase quality is the single most critical factor for the encryption scheme's security. A 12-character passphrase using only lowercase letters has ~56 bits of entropy, which is marginal. The docs mention a "strength indicator" but do not specify the criteria.

**Current state:** Documented in Phase 3 acceptance criteria.

**Recommendation:**
1. Increase minimum to 16 characters, or implement a proper entropy estimator (e.g., zxcvbn) and require a minimum score.
2. Show estimated time-to-crack in the strength indicator to educate users.
3. Clearly warn users (in Czech) that this passphrase protects their child's medical photos and cannot be recovered.
4. Consider allowing a passphrase consisting of 4+ random words (diceware-style) and guiding users toward this approach.

---

### LOW

#### L-1: Database Backup Encryption Uses aes-256-cbc (Deployment.md) vs GPG (Phase 8)

**Description:** Two different backup encryption schemes are documented:
- `deployment.md` backup script uses `openssl enc -aes-256-cbc -salt -pbkdf2` with a key file.
- Phase 8 backup script uses GPG encryption with a recipient key.

Both are acceptable, but the inconsistency could lead to confusion during implementation.

**Current state:** Two different approaches documented in two places.

**Recommendation:** Choose one approach and document it consistently. GPG is more standard for backup encryption and supports key management better. Update `deployment.md` to match Phase 8's GPG approach, or vice versa.

#### L-2: No Password Change Functionality Documented

**Description:** The auth system documents registration and login but has no endpoint or UI for changing a user's password. If a password is compromised, the only option is direct database access.

**Current state:** Not documented.

**Recommendation:** Add a `PUT /api/auth/password` endpoint that requires the current password and accepts a new password. Include this in Phase 1 or Phase 8.

#### L-3: Session Sliding Window Updates on Every Request

**Description:** The session expiry is extended on every authenticated request (`validateAndExtendSession` runs an UPDATE on every request). This means:
1. A session never expires as long as the user makes at least one request every 30 days.
2. Each request generates a database write (the UPDATE), which is unnecessary overhead.

**Current state:** Documented in `auth-overview.md` and Phase 1 session utilities.

**Recommendation:**
1. Only extend the session if it is within some window of expiry (e.g., extend only if less than 15 days remain). This reduces database writes by ~50%.
2. Consider whether truly infinite sessions are desirable. For a medical app, a maximum absolute session lifetime (e.g., 90 days regardless of activity) might be appropriate.

#### L-4: No Account Lockout After Excessive Failed Login Attempts

**Description:** The auth doc mentions "5 failed attempts per 15 minutes per email" as a rate limit, but this is not implemented at the Nginx level (which only does per-IP limiting) and no application-level implementation is specified. Without per-account lockout, an attacker rotating IPs could try unlimited passwords against a known email.

**Current state:** Mentioned in `auth-overview.md` password requirements table but not implemented anywhere.

**Recommendation:** Implement per-account failed login tracking:
1. Add a `failed_login_attempts` counter and `locked_until` timestamp to the `users` table.
2. After 5 failed attempts, lock the account for 15 minutes.
3. Reset the counter on successful login.
4. Return the same generic "Invalid credentials" message whether the account is locked or the password is wrong (to avoid enumeration).

#### L-5: Docker Container Runs as Non-Root but node_modules Copied from Builder

**Description:** The Dockerfile in `deployment.md` copies `node_modules` from the builder stage (which ran as root). The Phase 0 Dockerfile does not create a non-root user at all. The Phase 8 Dockerfile creates a non-root user but the `deployment.md` version does. These should be consistent, and all should use non-root.

**Current state:** Inconsistent across docs. The `deployment.md` Dockerfile properly creates `appuser`. The Phase 0 Dockerfile does not.

**Recommendation:** Use the `deployment.md` Dockerfile pattern consistently. Ensure the production Dockerfile:
1. Creates a non-root user.
2. Sets file ownership for `/data/photos`.
3. Runs as the non-root user.
4. Does not include build tooling or dev dependencies in the final image.

#### L-6: No Input Validation Guidance for API Routes

**Description:** While the API routes documentation specifies request/response formats, there is no systematic input validation strategy documented. Individual phase docs mention validation for specific fields (e.g., password length, date format), but there is no centralized validation approach (e.g., using Zod or a similar schema validation library).

**Current state:** Ad-hoc validation mentioned in individual route implementations.

**Recommendation:**
1. Document a centralized validation strategy using a schema validation library (Zod is a natural fit for TypeScript).
2. Define validation schemas for all API request bodies in a shared location.
3. Validate all incoming data at the API route level before passing to domain services.
4. This prevents both security issues (injection, type confusion) and data integrity problems.

#### L-7: `user-scalable=no` Viewport Meta Tag is an Accessibility Concern

**Description:** Phase 0 specifies `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`. Disabling pinch-to-zoom (`user-scalable=no`, `maximum-scale=1`) is an accessibility violation and is ignored by some browsers (Safari on iOS ignores `user-scalable=no` since iOS 10). While common in mobile apps, it prevents users with visual impairments from zooming in.

**Current state:** Documented in Phase 0, Step 22.

**Recommendation:** Remove `maximum-scale=1` and `user-scalable=no`. Modern mobile web apps can handle zoom properly with responsive design. If specific interactive elements (like the camera view) need to prevent zoom, use `touch-action: manipulation` CSS on those elements only.

---

### INFORMATIONAL

#### I-1: Encryption Scheme is Well-Designed

The AES-256-GCM + PBKDF2 scheme is correctly specified:
- 600,000 PBKDF2 iterations (meets OWASP 2023 recommendation for SHA-256).
- 12-byte random IV per encryption (correct for GCM).
- 16-byte random salt per user.
- 128-bit authentication tag (GCM default).
- AAD (Additional Authenticated Data) binding ciphertext to `childId:photoId` -- this is excellent and prevents blob-swapping attacks.
- Key marked as non-extractable.
- IV prepended to ciphertext for storage (standard and correct).
- Separate IVs for full image and thumbnail.

This is a solid design. The AAD usage is a particularly thoughtful touch that many implementations miss.

#### I-2: Server-Proxy Pattern for AI is Correct

The server-proxy pattern (client -> `POST /api/analyze` -> server -> Claude API) is the right architecture. It keeps the API key server-side, provides a single auditable point for AI calls, and allows server-side rate limiting. The documentation correctly notes that photos exist in server memory only during the request and are never written to disk. One enhancement to consider: explicitly zero out or dereference the photo buffers after forwarding to Claude, rather than relying on garbage collection.

#### I-3: Offline Data Cleanup on Logout is Good

The logout flow (documented in `offline-strategy.md`) properly clears all Dexie tables, the sync timestamp, and the encryption key from memory. This prevents data leakage between users on a shared device. This is often overlooked in offline-first apps.

#### I-4: Cookie Configuration is Correct

Session cookies use `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`. This is correct:
- `HttpOnly` prevents JavaScript access (XSS cannot steal the cookie).
- `Secure` ensures the cookie is only sent over HTTPS.
- `SameSite=Lax` prevents CSRF on state-changing requests while allowing top-level navigations.
- `Path=/` ensures the cookie is sent on all routes.

#### I-5: REGISTRATION_ENABLED Flag is a Good Pattern

The ability to disable registration after both parents have accounts is a simple and effective security control. This prevents unauthorized user creation on a public-facing instance.

#### I-6: PostgreSQL Not Exposed to Host Network in Production

The production Docker Compose correctly does not map PostgreSQL ports to the host. It is only accessible from the app container via the internal Docker network. This is correct.

#### I-7: HSTS Configuration is Correct

The Nginx config includes `Strict-Transport-Security: max-age=31536000; includeSubDomains` (deployment.md) or `max-age=63072000; includeSubDomains; preload` (phase-8). Both are acceptable. The `preload` directive in Phase 8 is a stronger choice.

#### I-8: Anthropic Data Retention is a Known Trust Boundary

The encryption doc correctly identifies that decrypted photos are sent to the Anthropic Claude API and that Anthropic's data retention policy applies. Users should be made aware of this. Consider adding a consent prompt before the first AI analysis (similar to the Google Drive privacy notice documented in Phase 7).

#### I-9: Structured Data (Food Logs, Analysis Results) Not Encrypted

The docs correctly note that structured data in PostgreSQL is not encrypted. This is a reasonable trade-off: the data is less sensitive than photos, is needed for server-side queries, and the VPS has full-disk encryption as an option. For a personal app, this is acceptable.

#### I-10: bcrypt Cost Factor of 12 is Appropriate

bcrypt with cost factor 12 provides ~4096 iterations, which takes roughly 250ms on modern hardware. This is a good balance between security and usability for a 2-user app. The docs correctly note the 72-byte truncation limit of bcrypt.

---

## Summary of Recommendations by Priority

| Priority | ID | Action |
|----------|-----|--------|
| **Critical** | C-1 | Fix encryption.md AI analysis flow to match server-proxy pattern |
| **High** | H-1 | Add application-level rate limiting, especially per-email for login |
| **High** | H-2 | Document session token entropy trade-off; consider stronger tokens |
| **High** | H-3 | Enable SvelteKit CSRF protection in all environments |
| **Medium** | M-1 | Add auto-lock timeout for encryption key |
| **Medium** | M-2 | Reconcile CSP headers; avoid `unsafe-inline` for scripts |
| **Medium** | M-3 | Add path traversal protection for photo blob paths |
| **Medium** | M-4 | Add basic audit logging |
| **Medium** | M-5 | Use separate key derivation for Google token encryption |
| **Medium** | M-6 | Strengthen passphrase requirements or add entropy estimator |
| **Low** | L-1 | Standardize backup encryption approach |
| **Low** | L-2 | Add password change endpoint |
| **Low** | L-3 | Optimize session sliding window |
| **Low** | L-4 | Implement per-account login lockout |
| **Low** | L-5 | Standardize Dockerfile non-root user |
| **Low** | L-6 | Document centralized input validation strategy |
| **Low** | L-7 | Remove user-scalable=no from viewport meta |

---

## Final Verdict

**Is the security design sufficient to begin implementation? Yes, with conditions.**

The critical finding (C-1) must be resolved before Phase 4 implementation begins, as it could lead to API key exposure in the client bundle. The high findings (H-1, H-2, H-3) should be addressed during Phase 1 implementation. The medium and low findings can be tracked as implementation progresses and addressed in their respective phases.

For a personal/family app handling sensitive medical data of a child, this design demonstrates a mature security posture. The E2E encryption is well-specified, the authentication is solid, the deployment architecture follows best practices, and the threat model is honest about what is and is not protected. The Ports & Adapters architecture also provides a clean separation that makes security-critical code (encryption, auth) auditable and testable in isolation.

The project is ready to proceed to implementation.
