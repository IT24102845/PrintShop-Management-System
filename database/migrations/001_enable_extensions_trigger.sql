-- =============================================================================
-- Migration: 001 — Enable Extensions & Create Utility Trigger
-- =============================================================================
-- Run order  : #1 (must run before any table creation)
-- Description: Enables required PostgreSQL extensions and creates the
--              shared updated_at trigger function used by all tables.
-- Dependencies: None
-- =============================================================================

-- ─── PostgreSQL Extensions ───────────────────────────────────────────────────
-- pgcrypto: Provides cryptographic functions including gen_random_uuid() for primary keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pg_trgm: Enables trigram-based indexing (GIN/GiST) for fast substring and fuzzy ILIKE search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Automatic Timestamp Update Trigger Function ──────────────────────────────
-- Generic trigger function attached to tables with an updated_at column.
-- Automatically guarantees that any UPDATE operation updates the modification timestamp.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column()
  IS 'Automatically sets updated_at = NOW() before any row update';

