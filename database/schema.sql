-- =============================================================================
--  PrintShop Management System — Complete Database Schema
-- =============================================================================
--  Database   : Supabase (PostgreSQL 15+)
--  Schema     : public
--  Version    : 1.0.0
--  Run order  : schema.sql → seed-data.sql
--
--  ARCHITECTURE & ENTITY RELATIONSHIPS:
--  users (1) ──── (1) customers (1) ──── (N) orders
--  users (1) ──── (1) employees                     │
--                                                   ├── (N) quotations
--                                                   ├── (N) designs
--                                                   ├── (N) production_tasks
--                                                   └── (N) payments
--  suppliers (1) ──── (N) inventory_materials
--
--  ORDER LIFECYCLE WORKFLOW:
--  pending → quoted → confirmed → design_review → in_production → quality_check → ready → delivered / cancelled
--
--  NOTE: This system uses a custom users table with password_hash for
--  traditional JWT-based authentication. If you switch to Supabase Auth,
--  replace the users table with a profiles table linked to auth.users.
-- =============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram indexes for ILIKE search

-- =============================================================================
-- SECTION 1: UTILITY FUNCTIONS
-- =============================================================================

-- Automatically updates updated_at on any row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- SECTION 2: CORE TABLES
-- (Order matters: parent tables before child tables due to foreign keys)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: users
-- Central authentication and identity table.
-- Linked 1-to-1 to either customers or employees based on role.
-- ─────────────────────────────────────────────────────────────────────────────

-- Creates the users table.
-- Stores user authentication credentials and system roles.
-- This constraint protects data integrity.
CREATE TABLE IF NOT EXISTS users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       VARCHAR(255)  NOT NULL,
  email           VARCHAR(255)  NOT NULL UNIQUE,
  password_hash   TEXT          NOT NULL,
  role            VARCHAR(50)   NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('admin', 'manager', 'employee', 'customer')),
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  users                IS 'System users — admins, managers, employees, and customers';
COMMENT ON COLUMN users.role           IS 'admin | manager | employee | customer';
COMMENT ON COLUMN users.password_hash  IS 'bcrypt hash of the user password';
COMMENT ON COLUMN users.is_active      IS 'Soft-delete flag — false = deactivated account';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: customers
-- Extends users with customer-specific profile data.
-- ─────────────────────────────────────────────────────────────────────────────

-- Creates the customers table.
-- Foreign key connects this record with the users table.
-- This constraint protects data integrity.
CREATE TABLE IF NOT EXISTS customers (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255),
  phone       VARCHAR(20),
  address     TEXT,
  company     VARCHAR(255),
  notes       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  customers           IS 'Customer profile data, linked 1-to-1 with users';
COMMENT ON COLUMN customers.name      IS 'Customer full name';
COMMENT ON COLUMN customers.company   IS 'Optional company/organization name';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: employees
-- Extends users with employee-specific role assignments.
-- ─────────────────────────────────────────────────────────────────────────────

-- Creates the employees table.
-- Foreign key connects this record with the users table.
-- This constraint protects data integrity.
CREATE TABLE IF NOT EXISTS employees (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_role  VARCHAR(100)  NOT NULL DEFAULT 'operator'
                   CHECK (employee_role IN ('manager', 'designer', 'printer', 'operator', 'delivery', 'sales')),
  hire_date      DATE,
  is_available   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  employees                IS 'Employee profile data, linked 1-to-1 with users';
COMMENT ON COLUMN employees.employee_role  IS 'manager | designer | printer | operator | delivery | sales';
COMMENT ON COLUMN employees.is_available   IS 'Whether this employee can accept new production tasks';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: orders
-- Central entity — the core of the print shop workflow.
-- ─────────────────────────────────────────────────────────────────────────────

-- Creates the orders table.
-- Foreign key connects this record with the customers table.
-- This constraint protects data integrity.
CREATE TABLE IF NOT EXISTS orders (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID          NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
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
  status           VARCHAR(50)   NOT NULL DEFAULT 'pending'
                     CHECK (status IN (
                       'pending', 'quoted', 'confirmed', 'design_review',
                       'in_production', 'quality_check', 'ready', 'delivered', 'cancelled', 'COMPLETED'
                     )),
  deadline_date    DATE,
  special_notes    TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  orders               IS 'Customer print orders — the core entity of the system';
COMMENT ON COLUMN orders.service_type  IS 'Category of printing service requested';
COMMENT ON COLUMN orders.status        IS 'Workflow state: pending → quoted → confirmed → design_review → in_production → quality_check → ready → delivered';
COMMENT ON COLUMN orders.design_file_url IS 'Initial file URL provided by customer at order creation';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: quotations
-- Price quotations issued per order. An order may have multiple revisions.
-- ─────────────────────────────────────────────────────────────────────────────

-- Creates the quotations table.
-- Foreign key connects this record with the orders table.
-- This constraint protects data integrity.
CREATE TABLE IF NOT EXISTS quotations (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount       DECIMAL(12,2)  NOT NULL CHECK (amount >= 0),
  status       VARCHAR(50)    NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'revised', 'expired')),
  notes        TEXT,
  valid_until  DATE,
  revision     INTEGER        NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  quotations          IS 'Price quotations for orders; multiple revisions allowed per order';
COMMENT ON COLUMN quotations.revision IS 'Revision number — increments on each requote';
COMMENT ON COLUMN quotations.amount   IS 'Quoted total price in local currency';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: designs
-- Design files uploaded and tracked per order, with approval workflow.
-- ─────────────────────────────────────────────────────────────────────────────

-- Creates the designs table.
-- Foreign key connects this record with the orders table.
-- This constraint protects data integrity.
CREATE TABLE IF NOT EXISTS designs (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_url         TEXT          NOT NULL,
  approval_status  VARCHAR(50)   NOT NULL DEFAULT 'pending'
                     CHECK (approval_status IN (
                       'pending', 'under_review', 'approved', 'rejected', 'revision_requested'
                     )),
  remarks          TEXT,
  version          INTEGER       NOT NULL DEFAULT 1 CHECK (version > 0),
  uploaded_by      UUID          REFERENCES users(id) ON DELETE SET NULL,
  approved_by      UUID          REFERENCES users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  designs                  IS 'Design files for orders with customer/staff approval workflow';
COMMENT ON COLUMN designs.approval_status  IS 'pending | under_review | approved | rejected | revision_requested';
COMMENT ON COLUMN designs.version          IS 'Design version number — increments with each upload';
COMMENT ON COLUMN designs.uploaded_by      IS 'User who uploaded this design version';
COMMENT ON COLUMN designs.approved_by      IS 'Staff member who approved/rejected the design';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: production_tasks
-- Tracks the physical production work for each order.
-- ─────────────────────────────────────────────────────────────────────────────

-- Creates the production_tasks table.
-- Foreign key connects this record with the orders table.
-- This constraint protects data integrity.
CREATE TABLE IF NOT EXISTS production_tasks (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  assigned_employee  UUID          REFERENCES employees(id) ON DELETE SET NULL,
  status             VARCHAR(50)   NOT NULL DEFAULT 'WAITING'
                       CHECK (status IN (
                         'WAITING', 'PRINTING', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'COMPLETED', 'FAILED'
                       )),
  priority           VARCHAR(20)   NOT NULL DEFAULT 'normal'
                       CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes              TEXT,
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  estimated_hours    DECIMAL(6,2)  CHECK (estimated_hours > 0),
  actual_hours       DECIMAL(6,2)  CHECK (actual_hours >= 0),
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Logical constraint: completed_at must be after started_at
  CONSTRAINT chk_production_task_dates
    CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE TRIGGER trg_production_tasks_updated_at
  BEFORE UPDATE ON production_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  production_tasks                  IS 'Production work items assigned to employees for each order';
COMMENT ON COLUMN production_tasks.priority         IS 'Task urgency: low | normal | high | urgent';
COMMENT ON COLUMN production_tasks.estimated_hours  IS 'Estimated hours to complete the task';
COMMENT ON COLUMN production_tasks.actual_hours     IS 'Actual hours spent on completion';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 8: inventory_materials
-- Raw materials and consumables used during production.
-- ─────────────────────────────────────────────────────────────────────────────

-- Creates the inventory_materials table.
-- Stores stock counts and reorder levels for raw printing materials.
-- This constraint protects data integrity.
CREATE TABLE IF NOT EXISTS inventory_materials (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name        VARCHAR(255)   NOT NULL,
  category             VARCHAR(100)   NOT NULL
                         CHECK (category IN (
                           'paper', 'ink', 'vinyl', 'fabric', 'packaging',
                           'binding', 'laminate', 'substrate', 'other'
                         )),
  quantity             DECIMAL(12,3)  NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit                 VARCHAR(50)    NOT NULL,  -- e.g. 'sheets', 'litres', 'kg', 'meters'
  minimum_stock_level  DECIMAL(12,3)  NOT NULL DEFAULT 0 CHECK (minimum_stock_level >= 0),
  unit_cost            DECIMAL(10,2)  CHECK (unit_cost >= 0),
  supplier_id          UUID           REFERENCES suppliers(id) ON DELETE SET NULL,
  sku                  VARCHAR(100)   UNIQUE,
  location             VARCHAR(100),
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_inventory_materials_updated_at
  BEFORE UPDATE ON inventory_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  inventory_materials                     IS 'Raw materials and consumables inventory';
COMMENT ON COLUMN inventory_materials.quantity            IS 'Current stock quantity in the specified unit';
COMMENT ON COLUMN inventory_materials.minimum_stock_level IS 'Reorder threshold — alert when quantity falls below this';
COMMENT ON COLUMN inventory_materials.unit_cost           IS 'Cost per unit from supplier';
COMMENT ON COLUMN inventory_materials.sku                 IS 'Internal Stock Keeping Unit code';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 9: suppliers
-- External vendors who supply materials.
-- ─────────────────────────────────────────────────────────────────────────────

-- Creates the suppliers table.
-- Stores vendor contacts and procurement information.
-- This constraint protects data integrity.
CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name  VARCHAR(255)  NOT NULL,
  phone          VARCHAR(20),
  email          VARCHAR(255),
  address        TEXT,
  contact_person VARCHAR(255),
  website        TEXT,
  payment_terms  VARCHAR(100),
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  suppliers                IS 'Suppliers of raw materials and consumables';
COMMENT ON COLUMN suppliers.payment_terms  IS 'e.g. Net 30, Cash on Delivery, Prepaid';
COMMENT ON COLUMN suppliers.is_active      IS 'FALSE = discontinued supplier relationship';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 10: payments
-- Payment records linked to orders. One order may have partial payments.
-- ─────────────────────────────────────────────────────────────────────────────

-- Creates the payments table.
-- Foreign key connects this record with the orders table.
-- This constraint protects data integrity.
CREATE TABLE IF NOT EXISTS payments (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID           NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  amount           DECIMAL(12,2)  NOT NULL CHECK (amount > 0),
  payment_method   VARCHAR(50)    NOT NULL
                     CHECK (payment_method IN (
                       'cash', 'bank_transfer', 'card', 'online', 'cheque', 'mobile_money'
                     )),
  payment_status   VARCHAR(50)    NOT NULL DEFAULT 'pending'
                     CHECK (payment_status IN (
                       'pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'
                     )),
  transaction_ref  VARCHAR(255),
  receipt_url      TEXT,
  paid_at          TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  payments                 IS 'Payment transactions linked to orders';
COMMENT ON COLUMN payments.transaction_ref IS 'External transaction reference (bank ref, payment gateway ID, etc.)';
COMMENT ON COLUMN payments.paid_at         IS 'Timestamp when payment was confirmed';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 11: offers
-- Promotional showcase cards shown on the customer dashboard landing page.
-- Managed by admin/manager via the Offers CMS. Customers can only see active offers.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.offers (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow       VARCHAR(100)  NOT NULL,                                  -- Accent text above title (e.g. 'PREMIUM FINISHES')
  title         VARCHAR(255)  NOT NULL,                                  -- Hero offer heading
  description   TEXT          NOT NULL,                                  -- Promotional description and pricing copy
  button_text   VARCHAR(80)   NOT NULL DEFAULT 'Order Now',              -- CTA action button label
  button_link   VARCHAR(255)  NOT NULL DEFAULT '/customer/orders/new',   -- Angular router link navigated when clicked
  service_query VARCHAR(100),                                            -- Pre-selected service_type parameter for order form
  badge_text    VARCHAR(120),                                            -- Pill badge highlight text
  badge_icon    VARCHAR(60)   DEFAULT 'auto_awesome',                   -- Material Icons icon name
  theme         VARCHAR(30)   NOT NULL DEFAULT 'dark'                    -- Visual theme for the card
                  CHECK (theme IN ('dark', 'light', 'eco', 'blue', 'purple')),
  sort_order    INTEGER       NOT NULL DEFAULT 1                         -- Display sequence priority (ascending, >= 0)
                  CHECK (sort_order >= 0),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,                     -- Toggle offer visibility on customer portal
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT offers_eyebrow_title_unique UNIQUE (eyebrow, title)
);

CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  public.offers              IS 'Promotional showcase cards displayed on the customer dashboard';
COMMENT ON COLUMN public.offers.eyebrow      IS 'Small accent text above the card title';
COMMENT ON COLUMN public.offers.theme        IS 'Visual theme: dark | light | eco | blue | purple';
COMMENT ON COLUMN public.offers.sort_order   IS 'Display order — ascending, must be >= 0';
COMMENT ON COLUMN public.offers.is_active    IS 'false = hidden from customer portal; still visible in admin';
COMMENT ON COLUMN public.offers.service_query IS 'Pre-selects orders.service_type when customer clicks CTA';


-- =============================================================================
-- SECTION 3: ADD SUPPLIER FOREIGN KEY ON INVENTORY
-- (suppliers created after inventory in dependency order, resolved here)
-- =============================================================================

ALTER TABLE inventory_materials
  ADD CONSTRAINT fk_inventory_supplier
  FOREIGN KEY (supplier_id)
  REFERENCES suppliers(id)
  ON DELETE SET NULL;


-- =============================================================================
-- SECTION 4: INDEXES (Performance Optimization)
-- =============================================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active   ON users(is_active);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone   ON customers(phone);

-- employees
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role    ON employees(employee_role);

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_customer_id   ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_service_type  ON orders(service_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_deadline      ON orders(deadline_date);

-- quotations
CREATE INDEX IF NOT EXISTS idx_quotations_order_id  ON quotations(order_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status    ON quotations(status);

-- designs
CREATE INDEX IF NOT EXISTS idx_designs_order_id  ON designs(order_id);
CREATE INDEX IF NOT EXISTS idx_designs_status    ON designs(approval_status);

-- production_tasks
CREATE INDEX IF NOT EXISTS idx_production_tasks_order_id     ON production_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_employee     ON production_tasks(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status       ON production_tasks(status);
CREATE INDEX IF NOT EXISTS idx_production_tasks_priority     ON production_tasks(priority);

-- inventory_materials
CREATE INDEX IF NOT EXISTS idx_inventory_category    ON inventory_materials(category);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory_materials(supplier_id);
-- Trigram index for fast name search
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm
  ON inventory_materials USING GIN (material_name gin_trgm_ops);

-- suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm
  ON suppliers USING GIN (supplier_name gin_trgm_ops);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id  ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_method    ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at   ON payments(paid_at DESC);

-- offers
CREATE INDEX IF NOT EXISTS idx_offers_is_active  ON public.offers (is_active);
CREATE INDEX IF NOT EXISTS idx_offers_sort_order ON public.offers (sort_order ASC);


-- =============================================================================
-- SECTION 5: VIEWS (Useful pre-joined datasets)
-- =============================================================================

-- ─── view_order_summary ───────────────────────────────────────────────────────
-- Joins orders with customer info, latest quotation, and payment totals.
-- Use for the orders list/dashboard.

CREATE OR REPLACE VIEW view_order_summary AS
SELECT
  o.id                                                    AS order_id,
  o.status                                                AS order_status,
  o.service_type,
  o.quantity,
  o.size,
  o.colour,
  o.material,
  o.deadline_date,
  o.created_at                                            AS order_date,
  -- Customer info
  c.id                                                    AS customer_id,
  u.full_name                                             AS customer_name,
  u.email                                                 AS customer_email,
  cu.phone                                                AS customer_phone,
  -- Latest quotation
  q.amount                                                AS quoted_amount,
  q.status                                                AS quotation_status,
  -- Payment totals
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'completed'), 0)
                                                          AS total_paid,
  q.amount - COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'completed'), 0)
                                                          AS balance_due
FROM orders o
JOIN customers c    ON c.id      = o.customer_id
JOIN users u        ON u.id      = c.user_id
JOIN customers cu   ON cu.id     = o.customer_id
LEFT JOIN LATERAL (
  SELECT amount, status
  FROM quotations
  WHERE order_id = o.id
  ORDER BY revision DESC
  LIMIT 1
) q ON TRUE
LEFT JOIN payments p ON p.order_id = o.id
GROUP BY
  o.id, o.status, o.service_type, o.quantity, o.size,
  o.colour, o.material, o.deadline_date, o.created_at,
  c.id, u.full_name, u.email, cu.phone,
  q.amount, q.status;

COMMENT ON VIEW view_order_summary IS 'Orders with customer info, latest quotation, and payment totals';


-- ─── view_low_stock ───────────────────────────────────────────────────────────
-- Materials that have fallen at or below minimum stock level.

CREATE OR REPLACE VIEW view_low_stock AS
SELECT
  im.id,
  im.material_name,
  im.category,
  im.quantity             AS current_stock,
  im.minimum_stock_level  AS reorder_point,
  im.unit,
  im.unit_cost,
  im.minimum_stock_level - im.quantity AS shortage,
  s.supplier_name,
  s.phone                 AS supplier_phone,
  s.email                 AS supplier_email
FROM inventory_materials im
LEFT JOIN suppliers s ON s.id = im.supplier_id
WHERE im.quantity <= im.minimum_stock_level
ORDER BY shortage DESC;

COMMENT ON VIEW view_low_stock IS 'Inventory items at or below minimum stock level, with supplier contact info';


-- ─── view_production_queue ────────────────────────────────────────────────────
-- Active production tasks with order and employee details.

CREATE OR REPLACE VIEW view_production_queue AS
SELECT
  pt.id                   AS task_id,
  pt.status               AS task_status,
  pt.priority,
  pt.notes,
  pt.started_at,
  pt.estimated_hours,
  -- Order info
  o.id                    AS order_id,
  o.service_type,
  o.quantity,
  o.deadline_date,
  -- Employee info
  eu.full_name            AS employee_name,
  e.employee_role,
  -- Customer info
  cu.full_name            AS customer_name
FROM production_tasks pt
JOIN orders o           ON o.id = pt.order_id
JOIN customers c        ON c.id = o.customer_id
JOIN users cu           ON cu.id = c.user_id
LEFT JOIN employees e   ON e.id = pt.assigned_employee
LEFT JOIN users eu      ON eu.id = e.user_id
WHERE pt.status NOT IN ('COMPLETED', 'FAILED', 'completed', 'failed')
ORDER BY
  CASE pt.priority
    WHEN 'urgent' THEN 1
    WHEN 'high'   THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low'    THEN 4
  END,
  o.deadline_date ASC NULLS LAST;

COMMENT ON VIEW view_production_queue IS 'Active production tasks ordered by priority and deadline';


-- =============================================================================
-- SECTION 6: ROW LEVEL SECURITY (Supabase RLS Policies)
-- =============================================================================
-- Uncomment and customize these if using Supabase Auth (auth.uid()).
-- For custom JWT auth, implement authorization in the backend middleware.

-- ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employees          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE quotations         ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE designs            ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE production_tasks   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory_materials ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;

-- Example policy: Customers can only see their own orders
-- CREATE POLICY customer_own_orders ON orders
--   FOR SELECT USING (
--     customer_id = (SELECT id FROM customers WHERE user_id = auth.uid())
--   );


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
