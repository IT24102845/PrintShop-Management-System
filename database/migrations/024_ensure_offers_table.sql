-- =============================================================================
-- Migration: 024 — Ensure offers Table Exists with Correct Constraints & Seed
-- =============================================================================
-- Run order  : #24
-- Description: Idempotent migration that guarantees the public.offers table
--              exists in the live Supabase database with:
--                • Correct column definitions (matches application model)
--                • CHECK constraints for theme and sort_order
--                • updated_at trigger (reuses existing update_updated_at_column)
--                • Secure RLS: anon can only SELECT active offers;
--                  all writes go through the service-role (supabaseAdmin)
--                • Performance indexes
--                • All 4 promotional offer seed rows (idempotent via ON CONFLICT)
--
-- Background: Migration 022 defined this table but was never applied to the
--             live Supabase instance. Migration 023 was applied after 022 in
--             the project numbering, so this corrective migration is numbered 024.
--
-- SAFETY: Uses CREATE TABLE IF NOT EXISTS — safe to re-run.
--         Uses ON CONFLICT DO NOTHING for seed data — no duplicates created.
--         Does NOT drop or truncate any existing data.
-- =============================================================================

-- ─── 1. Create Table (idempotent) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.offers (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Small accent / eyebrow text shown above the main title (e.g. 'PREMIUM FINISHES')
  eyebrow       VARCHAR(100)  NOT NULL,

  -- Primary promotional headline
  title         VARCHAR(255)  NOT NULL,

  -- Supporting copy / pricing description
  description   TEXT          NOT NULL,

  -- Call-to-action button label
  button_text   VARCHAR(80)   NOT NULL DEFAULT 'Order Now',

  -- Angular router link navigated when CTA is clicked
  button_link   VARCHAR(255)  NOT NULL DEFAULT '/customer/orders/new',

  -- Pre-selects a service_type on the order form (matches orders.service_type values)
  service_query VARCHAR(100),

  -- Pill / badge highlight text (e.g. 'Same-Day Dispatch Available')
  badge_text    VARCHAR(120),

  -- Material Icons icon name displayed inside the badge
  badge_icon    VARCHAR(60)   DEFAULT 'auto_awesome',

  -- Visual colour theme for the showcase card
  theme         VARCHAR(30)   NOT NULL DEFAULT 'dark'
                  CHECK (theme IN ('dark', 'light', 'eco', 'blue', 'purple')),

  -- Display sequence — lower numbers appear first; must be non-negative
  sort_order    INTEGER       NOT NULL DEFAULT 1
                  CHECK (sort_order >= 0),

  -- Controls visibility on the customer portal (false = admin-only)
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,

  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── 2. Add CHECK Constraints if Table Already Existed Without Them ───────────
-- These ALTER TABLE statements add constraints idempotently using DO $$ blocks
-- so that if the table was already created by migration 022 (without constraints),
-- we can add them safely.

DO $$
BEGIN
  -- Add theme CHECK constraint if it does not exist
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'public.offers'::regclass
    AND    conname  = 'offers_theme_check'
  ) THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_theme_check
        CHECK (theme IN ('dark', 'light', 'eco', 'blue', 'purple'));
  END IF;

  -- Add sort_order >= 0 CHECK constraint if it does not exist
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'public.offers'::regclass
    AND    conname  = 'offers_sort_order_check'
  ) THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_sort_order_check
        CHECK (sort_order >= 0);
  END IF;
END $$;

-- ─── 3. updated_at Trigger ────────────────────────────────────────────────────
-- Reuses the existing update_updated_at_column() function defined in schema.sql
-- and migration 001_enable_extensions_trigger.sql — do NOT redefine it here.

DROP TRIGGER IF EXISTS trg_offers_updated_at ON public.offers;

CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. Row Level Security ────────────────────────────────────────────────────
-- Architecture note:
--   This system uses custom JWT auth via Express, NOT Supabase Auth.
--   auth.uid() is NOT used here — it would not match application users.
--
--   All API write operations (CREATE / UPDATE / DELETE) are routed through:
--     Browser → Express API (authenticate + authorize middleware) → supabaseAdmin
--   The supabaseAdmin client uses the service-role key which bypasses RLS.
--
--   The anon key (used by the public supabase client) is restricted to:
--     • SELECT on active offers only (customer portal read access)
--   This prevents anonymous direct writes via the anon key.

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts on re-run
DROP POLICY IF EXISTS "Allow public read access on active offers" ON public.offers;
DROP POLICY IF EXISTS "Allow authenticated staff full access"     ON public.offers;
DROP POLICY IF EXISTS "offers_anon_read_active"                   ON public.offers;
DROP POLICY IF EXISTS "offers_service_role_all"                   ON public.offers;

-- Policy 1: Anyone (anon key / customer portal) can read active offers only
CREATE POLICY "offers_anon_read_active"
  ON public.offers
  FOR SELECT
  USING (is_active = true);

-- Policy 2: Service role bypasses RLS (this policy is a safety net;
-- the service-role key actually skips all RLS policies automatically).
-- Including it explicitly for documentation clarity.
CREATE POLICY "offers_service_role_all"
  ON public.offers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 5. Performance Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_offers_is_active  ON public.offers (is_active);
CREATE INDEX IF NOT EXISTS idx_offers_sort_order ON public.offers (sort_order ASC);

-- ─── 6. Table Comments ────────────────────────────────────────────────────────

COMMENT ON TABLE  public.offers              IS 'Promotional showcase cards displayed on the customer dashboard';
COMMENT ON COLUMN public.offers.eyebrow      IS 'Small accent text above the card title (e.g. PREMIUM FINISHES)';
COMMENT ON COLUMN public.offers.theme        IS 'Visual theme: dark | light | eco | blue | purple';
COMMENT ON COLUMN public.offers.sort_order   IS 'Display order — ascending, must be >= 0';
COMMENT ON COLUMN public.offers.is_active    IS 'false = hidden from customer portal; still visible in admin';
COMMENT ON COLUMN public.offers.service_query IS 'Pre-selects orders.service_type when customer clicks CTA';

-- ─── 7. Seed Data (all 4 promotional offers) ─────────────────────────────────
-- Uses ON CONFLICT (eyebrow, title) DO NOTHING to be fully idempotent.
-- Safe to re-run — will not create duplicate offers.
-- Unique constraint added temporarily for conflict target, then removed if needed.

-- Add a unique constraint on (eyebrow, title) for the ON CONFLICT clause.
-- This is idempotent — PostgreSQL will error if it already exists, so wrap in DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE  conrelid = 'public.offers'::regclass
    AND    conname  = 'offers_eyebrow_title_unique'
  ) THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_eyebrow_title_unique UNIQUE (eyebrow, title);
  END IF;
END $$;

INSERT INTO public.offers
  (eyebrow, title, description, button_text, button_link, service_query, badge_text, badge_icon, theme, sort_order, is_active)
VALUES
  -- 1. Premium business card showcase
  (
    'PREMIUM FINISHES',
    'Spot UV & Gold Foil Cards.',
    'From LKR 15 / card. Tactile velvety soft-touch with raised 3D metallic foil.',
    'Order Now',
    '/customer/orders/new',
    'business_cards',
    'Soft-Touch Velvet 450gsm',
    'auto_awesome',
    'dark',
    1,
    TRUE
  ),
  -- 2. Events & signage showcase
  (
    'EVENTS & SIGNAGE',
    'Heavyweight Vinyl Banners.',
    'Vibrant weather-resistant prints. Ready in 24 hours with reinforced brass eyelets.',
    'Configure Size',
    '/customer/orders/new',
    'banners',
    'Same-Day Dispatch Available',
    'speed',
    'light',
    2,
    TRUE
  ),
  -- 3. Eco-friendly packaging showcase
  (
    'SUSTAINABLE PACKAGING',
    '100% Recycled Kraft Boxes.',
    'Eco-friendly corrugated mailer boxes tailored to elevate your brand''s unboxing.',
    'Get Free Quote',
    '/customer/orders/new',
    'packaging',
    'FSC-Certified & Soy Inks',
    'eco',
    'eco',
    3,
    TRUE
  ),
  -- 4. Flash sale stickers showcase (was only in offers.json, not in migration 022)
  (
    'FLASH SALE 30% OFF',
    'Holographic Foil Stickers.',
    'Dazzling prismatic reflections for high-impact packaging and labels. Water and UV proof.',
    'Claim 30% Off',
    '/customer/orders/new',
    'stickers',
    'Hot New Arrival',
    'auto_awesome',
    'purple',
    4,
    TRUE
  )
ON CONFLICT (eyebrow, title) DO NOTHING;

-- ─── 8. Verification Query ────────────────────────────────────────────────────
-- Run after applying this migration to confirm all rows exist:
--
-- SELECT id, eyebrow, title, theme, sort_order, is_active
-- FROM   public.offers
-- ORDER  BY sort_order;
--
-- Expected: 4 rows
-- =============================================================================
