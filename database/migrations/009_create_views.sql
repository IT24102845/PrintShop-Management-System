-- =============================================================================
-- Migration: 009 — Create Reporting Views
-- =============================================================================
-- Run order  : #9 (must run after ALL tables are created)
-- Depends on : All previous migrations (001 through 008)
-- Description: Creates consolidated SQL views for management dashboards,
--              reporting, inventory alerts, and production tracking.
-- =============================================================================

-- ─── view_order_summary ───────────────────────────────────────────────────────
-- Aggregates orders with customer details, latest quotation amount,
-- total completed payments, and calculates the remaining balance due.
-- Uses a LATERAL join to fetch only the most recent quotation revision.
CREATE OR REPLACE VIEW view_order_summary AS
SELECT
  o.id                    AS order_id,
  o.status                AS order_status,
  o.service_type,
  o.quantity,
  o.size,
  o.colour,
  o.material,
  o.deadline_date,
  o.created_at            AS order_date,
  c.id                    AS customer_id,
  u.full_name             AS customer_name,
  u.email                 AS customer_email,
  cu.phone                AS customer_phone,
  q.amount                AS quoted_amount,
  q.status                AS quotation_status,
  -- Sum only successfully settled payments
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'completed'), 0) AS total_paid,
  -- Calculate outstanding debt balance
  q.amount - COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'completed'), 0) AS balance_due
FROM orders o
JOIN customers c    ON c.id  = o.customer_id
JOIN users u        ON u.id  = c.user_id
JOIN customers cu   ON cu.id = o.customer_id
-- Subquery joins only the latest quotation revision for each order
LEFT JOIN LATERAL (
  SELECT amount, status FROM quotations
  WHERE order_id = o.id ORDER BY revision DESC LIMIT 1
) q ON TRUE
LEFT JOIN payments p ON p.order_id = o.id
GROUP BY
  o.id, o.status, o.service_type, o.quantity, o.size, o.colour, o.material,
  o.deadline_date, o.created_at, c.id, u.full_name, u.email, cu.phone,
  q.amount, q.status;

COMMENT ON VIEW view_order_summary IS 'Orders with customer info, latest quotation, and payment totals';

-- ─── view_low_stock ───────────────────────────────────────────────────────────
-- Identifies raw materials where available quantity is at or below the reorder point.
-- Calculates the deficit shortage to simplify purchase order creation.
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

COMMENT ON VIEW view_low_stock IS 'Inventory items at or below minimum stock level';

-- ─── view_production_queue ────────────────────────────────────────────────────
-- Real-time work queue for the production shop floor.
-- Displays only active tasks (excludes finished and aborted jobs),
-- ordered by priority level (urgent first) and customer delivery deadline.
CREATE OR REPLACE VIEW view_production_queue AS
SELECT
  pt.id                   AS task_id,
  pt.status               AS task_status,
  pt.priority,
  pt.notes,
  pt.started_at,
  pt.estimated_hours,
  o.id                    AS order_id,
  o.service_type,
  o.quantity,
  o.deadline_date,
  eu.full_name            AS employee_name,
  e.employee_role,
  cu.full_name            AS customer_name
FROM production_tasks pt
JOIN orders o           ON o.id  = pt.order_id
JOIN customers c        ON c.id  = o.customer_id
JOIN users cu           ON cu.id = c.user_id
LEFT JOIN employees e   ON e.id  = pt.assigned_employee
LEFT JOIN users eu      ON eu.id = e.user_id
WHERE pt.status NOT IN ('COMPLETED', 'FAILED')
ORDER BY
  CASE pt.priority
    WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4
  END,
  o.deadline_date ASC NULLS LAST;

COMMENT ON VIEW view_production_queue IS 'Active production tasks ordered by priority and deadline';

