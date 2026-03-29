-- Add encryption_salt column for PBKDF2 key derivation
-- Used for E2E photo encryption - each user has their own salt

ALTER TABLE users ADD COLUMN IF NOT EXISTS encryption_salt BYTEA;

-- Note: Column is nullable because it's only set when user first enables encryption
-- (deferred until first photo capture, per architecture decision)
