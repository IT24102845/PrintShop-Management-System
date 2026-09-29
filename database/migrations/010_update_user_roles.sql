-- =============================================================================
-- Migration: 010 — Update User Roles to Match New System Roles
-- =============================================================================
-- Run order  : #10
-- Depends on : 002_create_users.sql
-- Description: Replaces the original 4 roles (admin, manager, employee, customer)
--              with 7 domain-specific roles aligned with the staff structure.
--
-- New roles:
--   admin            → System administrator
--   manager          → Print shop manager
--   customer         → Client placing orders
--   customer_service → Front-desk / intake staff
--   design_staff     → Graphic designers
--   production_staff → Machine operators / printers
--   inventory_staff  → Materials and stock staff
-- =============================================================================

BEGIN;

-- 1. Migrate existing 'employee' users to 'production_staff' (closest match in new hierarchy)
UPDATE users
SET role = 'production_staff'
WHERE role = 'employee';

-- 2. Drop the old CHECK constraint (users_role_check) that only allowed 4 roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 3. Add new CHECK constraint covering all 7 specialized enterprise roles
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'admin',
    'manager',
    'customer',
    'customer_service',
    'design_staff',
    'production_staff',
    'inventory_staff'
  ));

-- 4. Preserve existing employees table data mapping
-- (The employee_role column remains valid for workstation assignment)

COMMIT;

-- Verify:
-- SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role;
