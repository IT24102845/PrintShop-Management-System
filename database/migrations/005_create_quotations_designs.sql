-- =============================================================================
-- Migration: 005 — Create quotations & designs Tables
-- =============================================================================
-- Run order  : #5
-- Depends on : 004_create_orders.sql, 002_create_users.sql
-- Description: Creates financial quotations and design proof workflow tables.
--              - 'quotations' support multi-revision price estimates per order.
--              - 'designs' manage proof files, versioning, customer approval,
--                and revision request cycles before production starts.
-- =============================================================================

-- ─── quotations ───────────────────────────────────────────────────────────────
-- Holds price quotations issued by staff for customer orders.
-- Orders can have multiple sequential quotation revisions (revision > 0).
CREATE TABLE IF NOT EXISTS quotations (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount       DECIMAL(12,2)  NOT NULL CHECK (amount >= 0),
  -- Quotation status: draft -> sent -> accepted / rejected / revised / expired
  status       VARCHAR(50)    NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'revised', 'expired')),
  notes        TEXT,
  valid_until  DATE,
  revision     INTEGER        NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Trigger to maintain updated_at on quotation revisions
CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_quotations_order_id ON quotations(order_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status   ON quotations(status);

COMMENT ON TABLE quotations IS 'Price quotations for orders; multiple revisions allowed per order';

-- ─── designs ──────────────────────────────────────────────────────────────────
-- Artwork and proof files linked to an order.
-- Tracks approval workflow: customer must approve proof before production commences.
CREATE TABLE IF NOT EXISTS designs (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_url         TEXT          NOT NULL,
  -- Approval status workflow state machine
  approval_status  VARCHAR(50)   NOT NULL DEFAULT 'pending'
                     CHECK (approval_status IN (
                       'pending', 'under_review', 'approved', 'rejected', 'revision_requested'
                     )),
  remarks          TEXT,
  version          INTEGER       NOT NULL DEFAULT 1 CHECK (version > 0),
  uploaded_by      UUID          REFERENCES users(id) ON DELETE SET NULL,  -- Customer or designer who uploaded the file
  approved_by      UUID          REFERENCES users(id) ON DELETE SET NULL,  -- Customer or manager who signed off
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Trigger to maintain updated_at on design approval state changes
CREATE TRIGGER trg_designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_designs_order_id ON designs(order_id);
CREATE INDEX IF NOT EXISTS idx_designs_status   ON designs(approval_status);

COMMENT ON TABLE designs IS 'Design files for orders with customer/staff approval workflow';

