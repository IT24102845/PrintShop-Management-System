-- =============================================================================
-- Migration: 020 — Update Production Task Statuses & Synchronize Orders
-- =============================================================================
-- Run order  : #20
-- Depends on : 007_create_production_tasks.sql, 004_create_orders.sql
-- Description: Standardizes production task status codes to uppercase enum tokens
--              (WAITING, PRINTING, QUALITY_CHECK, READY_FOR_DELIVERY, COMPLETED, FAILED)
--              matching the shop Kanban columns, and adds 'COMPLETED' to orders.
-- =============================================================================

-- 1. Drop the legacy lowercase CHECK constraint on production_tasks
ALTER TABLE production_tasks DROP CONSTRAINT IF EXISTS production_tasks_status_check;

-- 2. Add the updated uppercase CHECK constraint matching the physical shop workflow
ALTER TABLE production_tasks ADD CONSTRAINT production_tasks_status_check 
  CHECK (status IN (
    'WAITING',
    'PRINTING',
    'QUALITY_CHECK',
    'READY_FOR_DELIVERY',
    'COMPLETED',
    'FAILED'
  ));

-- 3. Migrate any existing legacy lowercase statuses to their uppercase equivalents
UPDATE production_tasks SET status = 'WAITING' WHERE status = 'queued';
UPDATE production_tasks SET status = 'PRINTING' WHERE status = 'in_progress';
UPDATE production_tasks SET status = 'QUALITY_CHECK' WHERE status = 'quality_check';
UPDATE production_tasks SET status = 'COMPLETED' WHERE status = 'completed';

-- 4. Synchronize orders table: ensure 'COMPLETED' is an allowed order status
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN (
    'pending',
    'quoted',
    'confirmed',
    'design_review',
    'in_production',
    'quality_check',
    'ready',
    'delivered',
    'cancelled',
    'COMPLETED'
  ));

