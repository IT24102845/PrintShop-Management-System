// ============================================================
// PRODUCTION ROUTES - BACKEND
// Purpose: Defines API endpoints for print production workflow tasks and queue management.
// Flow: Client Request -> Auth / Validation Middleware -> Route Handler -> Production Controller
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — Production Routes
// =============================================================================

import { Router } from 'express';
import { productionController } from '../../controllers/production.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate, validateUUID } from '../../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Manager: Dashboard ──────────────────────────────────────────────────────
/**
 * @route   GET /api/v1/production/dashboard
 * @desc    View production dashboard stats
 * @access  Private (manager, admin)
 */
router.get(
  '/dashboard',
  authorize('admin', 'manager'),
  (req, res, next) => productionController.getDashboard(req, res, next)
);

// ─── Support: Eligible Orders & Employees (for Create/Edit modals) ────────────

/**
 * @route   GET /api/v1/production/eligible-orders
 * @desc    Orders that have an approved design and no active production task
 * @access  Private (admin, manager, production_staff)
 */
router.get(
  '/eligible-orders',
  authorize('admin', 'manager', 'production_staff'),
  (req, res, next) => productionController.getEligibleOrders(req, res, next)
);

/**
 * @route   GET /api/v1/production/available-employees
 * @desc    All employees for the assignment dropdown
 * @access  Private (admin, manager, production_staff)
 */
router.get(
  '/available-employees',
  authorize('admin', 'manager', 'production_staff'),
  (req, res, next) => productionController.getAvailableEmployees(req, res, next)
);

// ─── Production Staff / Manager: Tasks ───────────────────────────────────────

/**
 * @route   GET /api/v1/production/tasks
 * @desc    View all production tasks
 * @access  Private (admin, manager, production_staff)
 */
router.get(
  '/tasks',
  authorize('admin', 'manager', 'production_staff'),
  validate({
    query: {
      page:  { type: 'string', pattern: /^\d+$/, required: false },
      limit: { type: 'string', pattern: /^\d+$/, required: false },
    },
  }),
  (req, res, next) => productionController.getProductionTasks(req, res, next)
);

/**
 * @route   POST /api/v1/production/tasks
 * @desc    Create a production task
 * @access  Private (admin, manager, production_staff)
 */
router.post(
  '/tasks',
  authorize('admin', 'manager', 'production_staff'),
  validate({
    body: {
      order_id:          { type: 'string', minLength: 36, maxLength: 36 }, // UUID
      assigned_employee: { type: 'string', minLength: 36, maxLength: 36, required: false }, // UUID
      notes:             { type: 'string', required: false },
      priority:          { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], required: false },
      estimated_hours:   { type: 'number', required: false },
    },
  }),
  (req, res, next) => productionController.createProductionTask(req, res, next)
);

/**
 * @route   PATCH /api/v1/production/tasks/:id/status
 * @desc    Update production task status (workflow progression)
 * @access  Private (admin, manager, production_staff)
 */
router.patch(
  '/tasks/:id/status',
  authorize('admin', 'manager', 'production_staff'),
  validateUUID('id'),
  validate({
    body: {
      status: {
        type: 'string',
        enum: ['WAITING', 'PRINTING', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'COMPLETED', 'FAILED']
      },
    },
  }),
  (req, res, next) => productionController.updateProductionStatus(req, res, next)
);

/**
 * @route   PATCH /api/v1/production/tasks/:id
 * @desc    Update production task metadata (employee, priority, notes, hours)
 *          Separate from status workflow — does NOT change task status.
 * @access  Private (admin, manager, production_staff)
 */
router.patch(
  '/tasks/:id',
  authorize('admin', 'manager', 'production_staff'),
  validateUUID('id'),
  (req, res, next) => productionController.updateProductionTask(req, res, next)
);

/**
 * @route   DELETE /api/v1/production/tasks/:id
 * @desc    Delete a WAITING production task (hard delete — cannot undo)
 *          Order is reverted to 'confirmed'. Design and order data are preserved.
 * @access  Private (admin, manager, production_staff)
 */
router.delete(
  '/tasks/:id',
  authorize('admin', 'manager', 'production_staff'),
  validateUUID('id'),
  (req, res, next) => productionController.deleteProductionTask(req, res, next)
);

export default router;

