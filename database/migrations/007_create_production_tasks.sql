-- =============================================================================
-- Migration: 007 — Create production_tasks Table
-- =============================================================================
-- Run order  : #7
-- Depends on : 004_create_orders.sql, 003_create_customers_employees.sql
-- Description: Creates the production workflow tracking table.
--              Represents the physical manufacturing/printing jobs assigned
--              to production staff on the shop floor.
-- =============================================================================

-- Production jobs linked to confirmed orders.
-- Tracks workstation dispatch, operator assignments, and labor hours.
CREATE TABLE IF NOT EXISTS production_tasks (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  assigned_employee  UUID          REFERENCES employees(id) ON DELETE SET NULL,
  -- Task status progression:
  -- queued -> in_progress -> paused -> quality_check -> completed / failed
  -- (Note: Uppercase status migration applied in 020/021)
  status             VARCHAR(50)   NOT NULL DEFAULT 'queued'
                       CHECK (status IN (
                         'queued', 'in_progress', 'paused', 'quality_check', 'completed', 'failed'
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

  -- Business constraint: completion date cannot precede the start date
  CONSTRAINT chk_production_task_dates
    CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

-- Trigger to maintain updated_at on task status transitions
CREATE TRIGGER trg_production_tasks_updated_at
  BEFORE UPDATE ON production_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for Kanban boards and workload dispatching
CREATE INDEX IF NOT EXISTS idx_production_tasks_order_id  ON production_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_employee  ON production_tasks(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status    ON production_tasks(status);
CREATE INDEX IF NOT EXISTS idx_production_tasks_priority  ON production_tasks(priority);

COMMENT ON TABLE production_tasks IS 'Production work items assigned to employees for each order';

