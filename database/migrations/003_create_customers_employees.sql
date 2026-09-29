-- =============================================================================
-- Migration: 003 — Create customers & employees Tables
-- =============================================================================
-- Run order  : #3
-- Depends on : 002_create_users.sql
-- Description: Extends the core 'users' table using a 1-to-1 profile pattern.
--              - 'customers' table holds customer-specific details (company, address, phone).
--              - 'employees' table holds internal staff metadata (station role, availability).
-- =============================================================================

-- ─── customers ────────────────────────────────────────────────────────────────
-- Profile table for client accounts. Cascades deletion if the parent user record is removed.
CREATE TABLE IF NOT EXISTS customers (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone       VARCHAR(20),
  address     TEXT,
  company     VARCHAR(255),
  notes       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Trigger to update updated_at on customer modification
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone   ON customers(phone);

COMMENT ON TABLE customers IS 'Customer profile data, linked 1-to-1 with users';

-- ─── employees ────────────────────────────────────────────────────────────────
-- Profile table for internal print shop staff.
-- employee_role reflects the physical workstation/job function.
CREATE TABLE IF NOT EXISTS employees (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_role  VARCHAR(100)  NOT NULL DEFAULT 'operator'
                   CHECK (employee_role IN ('manager', 'designer', 'printer', 'operator', 'delivery', 'sales')),
  hire_date      DATE,
  is_available   BOOLEAN       NOT NULL DEFAULT TRUE,  -- Used for assigning production tasks to active staff
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Trigger to update updated_at on employee modification
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role    ON employees(employee_role);

COMMENT ON TABLE employees IS 'Employee profile data, linked 1-to-1 with users';

