-- =============================================================================
-- Migration: 006 — Create suppliers & inventory_materials Tables
-- =============================================================================
-- Run order  : #6
-- Depends on : 001_enable_extensions_trigger.sql
-- Description: Creates supply chain management tables.
--              - 'suppliers': Vendors providing raw printing materials/inks.
--              - 'inventory_materials': Stock levels, minimum threshold alerts,
--                unit costs, SKUs, and warehouse storage locations.
-- =============================================================================

-- ─── suppliers ────────────────────────────────────────────────────────────────
-- Vendor directory for raw materials procurement.
CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name  VARCHAR(255)  NOT NULL,
  phone          VARCHAR(20),
  email          VARCHAR(255),
  address        TEXT,
  contact_person VARCHAR(255),
  website        TEXT,
  payment_terms  VARCHAR(100),
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,  -- Soft flag to mark discontinued vendors
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Trigger to maintain updated_at on supplier edits
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
-- Trigram index for fast fuzzy searching by supplier name
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm
  ON suppliers USING GIN (supplier_name gin_trgm_ops);

COMMENT ON TABLE suppliers IS 'Suppliers of raw materials and consumables';

-- ─── inventory_materials ──────────────────────────────────────────────────────
-- Raw materials catalog (paper stocks, ink cartridges, vinyl rolls, etc.).
-- minimum_stock_level acts as the reorder trigger point for inventory alerts.
CREATE TABLE IF NOT EXISTS inventory_materials (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name        VARCHAR(255)   NOT NULL,
  category             VARCHAR(100)   NOT NULL
                         CHECK (category IN (
                           'paper', 'ink', 'vinyl', 'fabric', 'packaging',
                           'binding', 'laminate', 'substrate', 'other'
                         )),
  quantity             DECIMAL(12,3)  NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit                 VARCHAR(50)    NOT NULL,  -- e.g., 'sheets', 'meters', 'kg', 'liters'
  minimum_stock_level  DECIMAL(12,3)  NOT NULL DEFAULT 0 CHECK (minimum_stock_level >= 0),
  unit_cost            DECIMAL(10,2)  CHECK (unit_cost >= 0),
  supplier_id          UUID           REFERENCES suppliers(id) ON DELETE SET NULL,
  sku                  VARCHAR(100)   UNIQUE,    -- Unique Stock Keeping Unit code
  location             VARCHAR(100),             -- Warehouse shelf / bin location
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Trigger to maintain updated_at on inventory adjustments
CREATE TRIGGER trg_inventory_materials_updated_at
  BEFORE UPDATE ON inventory_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_inventory_category    ON inventory_materials(category);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory_materials(supplier_id);
-- Trigram index for search-as-you-type material lookup
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm
  ON inventory_materials USING GIN (material_name gin_trgm_ops);

COMMENT ON TABLE inventory_materials IS 'Raw materials and consumables inventory';

