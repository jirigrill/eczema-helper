# Secrets, Authentication & Credential Management

This document defines how passwords, sessions, API keys, OAuth tokens, and environment variables are handled across the application. It serves as the single reference for all authentication and secret management decisions.

---

## Environment Variables

All secrets are stored in a `.env` file (never committed to git). The `.env.example` template lists all required variables.

### Complete Variable Inventory

| Variable | Used By | Purpose | How to Generate |
|---|---|---|---|
| `DATABASE_URL` | Server (PostgreSQL adapter) | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `SESSION_SECRET` | Server (session middleware) | Signs and encrypts session cookies. Also used to encrypt Google OAuth refresh tokens at rest. | `openssl rand -hex 32` (64 hex chars) |
| `GOOGLE_CLIENT_ID` | Server (OAuth routes) | Google Cloud OAuth2 client ID | Google Cloud Console > Credentials |
| `GOOGLE_CLIENT_SECRET` | Server (OAuth routes) | Google Cloud OAuth2 client secret | Google Cloud Console > Credentials |
| `CLAUDE_API_KEY` | Server only (proxy at `POST /api/analyze`) | Claude Vision API key for photo analysis. Never exposed to client. | Anthropic Console > API Keys |
| `VAPID_PUBLIC_KEY` | Client + Server | Web Push VAPID public key | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Server only | Web Push VAPID private key | Generated with public key above |
| `VAPID_SUBJECT` | Server (push adapter) | Contact email for VAPID | `mailto:your@email.com` |
| `REGISTRATION_ENABLED` | Server (auth routes) | Enable/disable new user registration | `true` or `false`, default `true` |

### Dev vs Production Values

| Variable | Local Dev | Production |
|---|---|---|
| `DATABASE_URL` | `postgresql://atopic:atopic_dev@localhost:5432/atopic_helper` | Strong password, internal Docker network |
| `SESSION_SECRET` | `dev-secret-change-in-production` | Randomly generated 64-char hex |

### Rotation Policy

| Secret | Rotation Impact | Procedure |
|---|---|---|
| `SESSION_SECRET` | All active sessions invalidated (users must re-login). Google refresh tokens must be re-encrypted. | Generate new secret, re-encrypt all `refresh_token_encrypted` values in `google_doc_connections`, restart app. |
| `DATABASE_URL` password | App cannot connect until restarted with new value | Update PostgreSQL password, update `.env`, restart app + Docker. |
| `CLAUDE_API_KEY` | AI analysis stops working until updated | Generate new key in Anthropic Console, update `.env`, restart app container. |
| `VAPID_*` keys | All existing push subscriptions become invalid | Generate new keys, update `.env`, users must re-subscribe to notifications. |
| `GOOGLE_CLIENT_SECRET` | OAuth flow breaks; existing refresh tokens still work until they expire | Regenerate in Google Cloud Console, update `.env`. |

---

## User Passwords

### Storage

| Aspect | Value |
|---|---|
| Algorithm | bcrypt |
| Cost factor | 12 rounds (hardcoded) |
| Library | `bcryptjs` |
| Stored as | `password_hash` column in `users` table (starts with `$2b$`) |
| Plaintext stored | Never |

### Password Requirements

| Rule | Value | Rationale |
|---|---|---|
| Minimum length | 8 characters | Balances security with usability for a personal app |
| Maximum length | 72 bytes | bcrypt truncation limit |
| Complexity rules | None | For a 2-user personal app, long passphrase > complexity rules |
| Future | WebAuthn / Passkeys planned for Phase 8 (Face ID / Touch ID) |
| Rate limiting | 5 failed attempts per 15 minutes per email | Prevents brute force on the login endpoint |

### Password Flow

```
REGISTRATION:
  Client sends { email, password, name }
    -> Server validates length (8-72 bytes)
    -> bcrypt.hash(password, 12) -> hash
    -> INSERT INTO users (email, password_hash, name) VALUES (...)
    -> Return 201 (password never logged, never echoed)

LOGIN:
  Client sends { email, password }
    -> Server: SELECT password_hash FROM users WHERE email = ?
    -> bcrypt.compare(password, hash)
    -> If match: create session (see below)
    -> If no match: return 401 (generic "Invalid credentials")
    -> Rate limit check before bcrypt.compare()
```

### Per-Account Login Lockout

To prevent credential stuffing from rotating IPs, track failed login attempts per account:

```sql
ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;
```

**Logic:**
1. Before `bcrypt.compare()`, check if `locked_until > NOW()`. If so, return 401 with generic "Invalid credentials" (same message as wrong password to prevent enumeration).
2. On failed login: increment `failed_login_attempts`. If >= 5, set `locked_until = NOW() + 15 minutes`.
3. On successful login: reset `failed_login_attempts = 0` and `locked_until = NULL`.

---

## Sessions

### Cookie-Based Sessions

| Aspect | Value |
|---|---|
| Cookie name | `session_id` |
| Cookie flags | `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` |
| Session storage | PostgreSQL `sessions` table |
| Session ID format | `crypto.randomBytes(32).toString('hex')` (256-bit random) |
| Expiration | 30 days from creation |
| Renewal | Extended on each authenticated request (sliding window) |

### Session Table Schema

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

### Session Lifecycle

```
LOGIN:
  -> Generate session_id = crypto.randomBytes(32).toString('hex')
  -> INSERT INTO sessions (id, user_id, expires_at)
     VALUES (session_id, user_id, now() + 30 days)
  -> Set-Cookie: session_id=...; HttpOnly; Secure; SameSite=Lax;
     Max-Age=2592000; Path=/

EACH REQUEST (SvelteKit hooks):
  -> Read session_id from cookie
  -> SELECT * FROM sessions WHERE id = session_id AND expires_at > now()
  -> If valid: attach user to event.locals,
     extend expires_at (sliding: now + 30 days)
     NOTE: Only extend if less than 15 days remain on the session.
     This reduces database writes from every request to ~once per 15 days.
  -> If invalid/expired: clear cookie, redirect to /login

LOGOUT:
  -> DELETE FROM sessions WHERE id = session_id
  -> Clear cookie (Max-Age=0)

CLEANUP (periodic):
  -> DELETE FROM sessions WHERE expires_at < now()
  -> Run daily via server-side cron or on each request
     with probabilistic check
```

### Session Cleanup

Expired sessions are cleaned up daily via the existing cron infrastructure (Phase 6 `node-cron`):

```typescript
// Run daily at 03:00
cron.schedule('0 3 * * *', async () => {
  await sql`DELETE FROM sessions WHERE expires_at < NOW()`;
  logger.info('Expired sessions cleaned up');
});
```

Alternatively, add to the daily backup cron: `docker exec eczema-postgres psql -U eczema -d eczema -c "DELETE FROM sessions WHERE expires_at < NOW()"`.

---

## Encryption Passphrase (Photo E2E Encryption)

Separate from the login password. See `encryption.md` for full details.

| Aspect | Value |
|---|---|
| Purpose | Derives AES-256-GCM key for photo encryption |
| Entered | Once per session (after login) |
| Stored | Never (only the PBKDF2 salt is stored) |
| Shared between | Both parents (out-of-band) |
| Lost passphrase | Photos permanently unrecoverable (by design) |

---

## Claude Vision API Key

| Aspect | Value |
|---|---|
| Used by | Server only -- `POST /api/analyze` proxy endpoint |
| Storage | `.env` file on server (`CLAUDE_API_KEY`). Never in client bundle, never in browser. |
| Risk | Minimal. Key is server-side only. A server compromise would expose it, but that also exposes the database. |
| Mitigation | Anthropic API usage limits + billing alerts. Key can be rotated without data loss. |

### Server Proxy Pattern

The client never calls the Claude API directly. Instead:

1. Client decrypts photos locally in the browser.
2. Client sends decrypted photos to `POST /api/analyze` (multipart/form-data).
3. Server reads `CLAUDE_API_KEY` from environment, forwards photos to Claude Vision API.
4. Server streams the response back to the client.
5. Server discards photo data from memory after the response completes.

This keeps the API key server-side and provides a single auditable point for all AI analysis calls. The server holds plaintext photos briefly in a memory buffer only -- never written to disk or logged.

---

## Google OAuth2 Tokens

| Aspect | Value |
|---|---|
| Scopes | `drive.file` (create/access app-created files), `documents` (create/edit Docs) |
| Access token | Short-lived (~1 hour), obtained from refresh token on each export. Never stored. |
| Refresh token | Long-lived. Encrypted at rest in `google_doc_connections.refresh_token_encrypted`. |
| Encryption method | AES-256-GCM using a key derived from `SESSION_SECRET` (server-side only) |
| Client exposure | None. Client never sees any Google token. |
| Revocation | On disconnect: call `https://oauth2.googleapis.com/revoke`, delete DB record. |

### Refresh Token Encryption at Rest

The refresh token is encrypted server-side before storage using Node.js `crypto` module:

**Key derivation:** To maintain key separation (SESSION_SECRET is also used for session management), derive a dedicated token encryption key using HKDF:

```typescript
import { hkdf } from 'crypto';

async function deriveTokenKey(secret: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    hkdf('sha256', Buffer.from(secret, 'hex'), '', 'google-token-encryption', 32, (err, key) => {
      if (err) reject(err);
      else resolve(Buffer.from(key));
    });
  });
}
```

Use this derived key instead of `Buffer.from(secret, 'hex').subarray(0, 32)` in the encrypt/decrypt functions below.

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function encryptToken(token: string, secret: string): string {
  const key = Buffer.from(secret, 'hex').subarray(0, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  // Stored as iv:tag:ciphertext (all base64)
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64')
  ].join(':');
}

function decryptToken(stored: string, secret: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(':');
  const key = Buffer.from(secret, 'hex').subarray(0, 32);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return (
    decipher.update(Buffer.from(dataB64, 'base64'), undefined, 'utf8') +
    decipher.final('utf8')
  );
}
```

---

## VAPID Keys (Web Push)

| Aspect | Value |
|---|---|
| Generated | Once, at initial setup: `npx web-push generate-vapid-keys` |
| Public key | Shared with client (used in push subscription). Set via `VAPID_PUBLIC_KEY`. |
| Private key | Server-only. Set via `VAPID_PRIVATE_KEY`. |
| Subject | `mailto:` URL for the app operator. Set via `VAPID_SUBJECT`. |
| Rotation | Regenerating keys invalidates all existing push subscriptions. |

---

## Admin Access

There is no admin role or admin panel. This is a personal app with 2 users (both parents).

| Need | Solution |
|---|---|
| Database access | Direct `psql` via Docker: `docker exec -it eczema-postgres-dev psql -U atopic -d atopic_helper` |
| User management | Direct SQL. Disable registration after both parents register (set `REGISTRATION_ENABLED=false`). |
| Log access | `docker logs eczema-app-dev` |
| Backup management | Server-side scripts (see `deployment.md`) |
| Secret rotation | Edit `.env`, restart containers |

### Locking Down Registration

After both parents have accounts, registration should be disabled:

```
# .env
REGISTRATION_ENABLED=false
```

```typescript
// src/routes/api/auth/register/+server.ts
import { env } from '$env/dynamic/private';

export async function POST({ request }) {
  if (env.REGISTRATION_ENABLED === 'false') {
    return new Response('Registrace je deaktivovana', { status: 403 });
  }
  // ... normal registration flow
}
```

---

## Security Summary

| Data | At Rest | In Transit | Client Exposure |
|---|---|---|---|
| User password | bcrypt hash in PostgreSQL | HTTPS only | Never sent back to client |
| Session ID | UUID in PostgreSQL | HTTP-only Secure cookie over HTTPS | Not accessible via JavaScript |
| Photo encryption passphrase | Not stored (salt only) | Never transmitted | Entered by user, held in JS memory |
| Photo blobs | AES-256-GCM encrypted on disk | HTTPS (encrypted blobs) | Decrypted in browser only |
| Google refresh token | AES-256-GCM encrypted in PostgreSQL | HTTPS (server-to-Google) | Never exposed to client |
| Claude API key | `.env` file on server | HTTPS (server-to-Anthropic) | Never exposed to client |
| VAPID private key | `.env` file on server | Never transmitted | Never exposed to client |
| `SESSION_SECRET` | `.env` file on server | Never transmitted | Never exposed to client |
