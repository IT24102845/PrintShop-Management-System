-- =============================================================================
-- Migration: 004 — Create orders Table
-- =============================================================================
-- Run order  : #4
-- Depends on : 003_create_customers_employees.sql
-- Description: Creates the core print shop business entity: the 'orders' table.
--              Stores customer print job specifications, service categories,
--              deadline schedules, and tracks status progression.
-- =============================================================================

-- Core table representing a print order.
-- Customer reference uses ON DELETE RESTRICT to maintain accounting and audit records.
CREATE TABLE IF NOT EXISTS orders (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID          NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  -- Service category classification
  service_type     VARCHAR(100)  NOT NULL
                     CHECK (service_type IN (
                       'business_cards', 'flyers', 'banners', 'posters',
                       'brochures', 'stickers', 'tshirts', 'signage',
                       'packaging', 'custom'
                     )),
  description      TEXT,
  size             VARCHAR(50),
  quantity         INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0),
  colour           VARCHAR(100),
  material         VARCHAR(100),
  design_file_url  TEXT,
  -- Order workflow state machine:
  -- pending -> quoted -> confirmed -> design_review -> in_production -> quality_check -> ready -> delivered / cancelled
  status           VARCHAR(50)   NOT NULL DEFAULT 'pending'
                     CHECK (status IN (
                       'pending', 'quoted', 'confirmed', 'design_review',
                       'in_production', 'quality_check', 'ready', 'delivered', 'cancelled'
                     )),
  deadline_date    DATE,
  special_notes    TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Trigger to maintain updated_at on order state changes
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for frequent queries: customer history, status filtering, service grouping, deadlines
CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_service_type ON orders(service_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_deadline     ON orders(deadline_date);

COMMENT ON TABLE orders IS 'Customer print orders — the core entity of the system';

