-- =============================================================================
-- Migration 025: Password reset token columns
-- =============================================================================
-- Supports the "Forgot Password" flow:
--   POST /api/v1/auth/forgot-password -> stores SHA-256 hash of a one-time token
--   POST /api/v1/auth/reset-password  -> verifies hash + expiry, then clears it
-- Only the hash is stored; the raw token is emailed to the user.
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token_hash    TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash
  ON users (reset_token_hash)
  WHERE reset_token_hash IS NOT NULL;
