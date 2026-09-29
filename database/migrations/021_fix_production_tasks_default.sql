-- =============================================================================
-- Migration: 021 — Fix production_tasks DEFAULT status to 'WAITING' & Update View
-- =============================================================================
-- Run order  : #21
-- Depends on : 020_update_production_status.sql, 009_create_views.sql
-- Description: Ensures newly created production tasks automatically default to
--              'WAITING' and updates view_production_queue to account for both
--              uppercase and legacy status values.
-- =============================================================================

-- 1. Safely migrate any remaining legacy statuses to uppercase standard
UPDATE public.production_tasks SET status = 'WAITING' WHERE status = 'queued';
UPDATE public.production_tasks SET status = 'PRINTING' WHERE status = 'in_progress';
UPDATE public.production_tasks SET status = 'QUALITY_CHECK' WHERE status = 'quality_check';
UPDATE public.production_tasks SET status = 'COMPLETED' WHERE status = 'completed';
UPDATE public.production_tasks SET status = 'FAILED' WHERE status = 'failed';

-- 2. Alter column default so new tasks enter the queue in 'WAITING' state
ALTER TABLE public.production_tasks ALTER COLUMN status SET DEFAULT 'WAITING';

-- 3. Ensure CHECK constraint covers uppercase production statuses
ALTER TABLE public.production_tasks DROP CONSTRAINT IF EXISTS production_tasks_status_check;
ALTER TABLE public.production_tasks ADD CONSTRAINT production_tasks_status_check 
  CHECK (status IN (
    'WAITING',
    'PRINTING',
    'QUALITY_CHECK',
    'READY_FOR_DELIVERY',
    'COMPLETED',
    'FAILED'
  ));

-- 4. Update view_production_queue to filter COMPLETED and FAILED tasks properly
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
WHERE pt.status NOT IN ('COMPLETED', 'FAILED', 'completed', 'failed')
ORDER BY
  CASE pt.priority
    WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4
  END,
  o.deadline_date ASC NULLS LAST;

COMMENT ON VIEW view_production_queue IS 'Active production tasks ordered by priority and deadline';
