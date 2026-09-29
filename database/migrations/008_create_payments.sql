-- =============================================================================
-- Migration: 008 — Create payments Table
-- =============================================================================
-- Run order  : #8
-- Depends on : 004_create_orders.sql
-- Description: Creates the financial payments ledger.
--              Tracks order transactions, settlement methods, gateway references,
--              receipt uploads, and payment statuses (advance/final payments).
-- =============================================================================

-- Payments ledger linked to orders.
-- ON DELETE RESTRICT guarantees financial records cannot be accidentally deleted.
CREATE TABLE IF NOT EXISTS payments (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID           NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  amount           DECIMAL(12,2)  NOT NULL CHECK (amount > 0),  -- Strict positive transaction amount
  -- Supported payment methods in the shop
  payment_method   VARCHAR(50)    NOT NULL
                     CHECK (payment_method IN (
                       'cash', 'bank_transfer', 'card', 'online', 'cheque', 'mobile_money'
                     )),
  -- Payment lifecycle state machine:
  -- pending -> processing -> completed / failed / refunded / partially_refunded
  payment_status   VARCHAR(50)    NOT NULL DEFAULT 'pending'
                     CHECK (payment_status IN (
                       'pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'
                     )),
  transaction_ref  VARCHAR(255),  -- External bank or payment gateway reference ID
  receipt_url      TEXT,          -- Supabase storage link to customer payment proof / slip
  paid_at          TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Trigger to maintain updated_at on payment status changes
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for financial reporting and order balance reconciliation
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status   ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_method   ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at  ON payments(paid_at DESC);

COMMENT ON TABLE payments IS 'Payment transactions linked to orders';

