-- =============================================================================
-- Migration: 022 — Create offers Table & Seed Showcase Banners
-- =============================================================================
-- Run order  : #22
-- Description: Creates the promotional showcase table for customer portal landing
--              cards, promotional badges, CTA links, and visual color themes.
--              Secured with Supabase Row Level Security (RLS).
-- =============================================================================

-- Promotional banners and showcase cards shown in the customer dashboard
CREATE TABLE IF NOT EXISTS public.offers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow        VARCHAR(100) NOT NULL,                               -- Small accent text above title (e.g. 'PREMIUM FINISHES')
  title          VARCHAR(255) NOT NULL,                               -- Hero offer heading
  description    TEXT NOT NULL,                                       -- Promotional description and pricing copy
  button_text    VARCHAR(80) NOT NULL DEFAULT 'Order Now',            -- CTA action button label
  button_link    VARCHAR(255) NOT NULL DEFAULT '/customer/orders/new', -- Route navigating when clicked
  service_query  VARCHAR(100),                                        -- Pre-selected service_type parameter
  badge_text     VARCHAR(120),                                        -- Pill badge highlight text
  badge_icon     VARCHAR(60) DEFAULT 'auto_awesome',                  -- Material icon name
  theme          VARCHAR(30) NOT NULL DEFAULT 'dark',                 -- Visual theme: 'dark' | 'light' | 'eco' | 'blue' | 'purple'
  sort_order     INTEGER NOT NULL DEFAULT 1,                          -- Display sequence priority
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,                       -- Toggle offer visibility
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) to enforce access control
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies ────────────────────────────────────────────────────────────
-- 1. Anyone (including unauthenticated/customers) can read active offers
CREATE POLICY "Allow public read access on active offers"
  ON public.offers
  FOR SELECT
  USING (is_active = true);

-- 2. Service role and authenticated staff have full CRUD permissions
CREATE POLICY "Allow authenticated staff full access"
  ON public.offers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── Seed Initial Promotional Cards ──────────────────────────────────────────
INSERT INTO public.offers (eyebrow, title, description, button_text, button_link, service_query, badge_text, badge_icon, theme, sort_order, is_active)
VALUES
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
  );
