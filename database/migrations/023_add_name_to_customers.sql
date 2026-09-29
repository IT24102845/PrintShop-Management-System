-- =============================================================================
-- Migration: 023 — Add name Column to customers Table
-- =============================================================================
-- Run order  : #23
-- Description: Adds 'name' column directly to 'customers' table for immediate
--              visibility and fast search. Automatically backfills existing
--              records from 'users.full_name' and configures bidirectional
--              triggers so 'customers.name' stays in sync with 'users.full_name'.
-- =============================================================================

-- 1. Add 'name' column to customers table if not exists
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- 2. Backfill existing customer names from users table
UPDATE customers c
SET name = u.full_name
FROM users u
WHERE c.user_id = u.id
  AND (c.name IS NULL OR c.name = '');

-- 3. Create index for fast name searches
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- 4. Trigger Function: Populate name on customers BEFORE INSERT if not supplied
CREATE OR REPLACE FUNCTION set_customer_name_from_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NULL OR NEW.name = '' THEN
    SELECT full_name INTO NEW.name FROM users WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_customer_name ON customers;
CREATE TRIGGER trg_set_customer_name
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_name_from_user();

-- 5. Trigger Function: Sync customers.name when users.full_name is updated
CREATE OR REPLACE FUNCTION sync_customer_name_on_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET name = NEW.full_name
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_customer_name ON users;
CREATE TRIGGER trg_sync_customer_name
  AFTER UPDATE OF full_name ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_name_on_user_update();

COMMENT ON COLUMN customers.name IS 'Customer full name (kept in sync with users.full_name)';
