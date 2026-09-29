// ============================================================
// INVENTORY ROUTES - BACKEND
// Purpose: Defines API endpoints for stock materials, quantity adjustments, and alerts.
// Flow: Client Request -> Auth / Validation Middleware -> Route Handler -> Inventory Controller
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — Inventory Routes
// =============================================================================

import { Router } from 'express';
import { inventoryController } from '../../controllers/inventory.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

// Only admin, manager, inventory_staff can access most inventory routes
router.use(authenticate, authorize('admin', 'manager', 'inventory_staff'));

/**
 * @route   GET /api/v1/inventory/dashboard
 * @desc    View inventory dashboard stats
 */
// Defines the API endpoint and connects it to the controller.
router.get(
  '/dashboard',
  (req, res, next) => inventoryController.getDashboard(req, res, next)
);

/**
 * @route   POST /api/v1/inventory
 * @desc    Add new material
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/',
  validate({
    body: {
      material_name:       { type: 'string', minLength: 2 },
      category:            { type: 'string', minLength: 2 },
      quantity:            { type: 'number', min: 0 },
      unit:                { type: 'string', minLength: 1 },
      minimum_stock_level: { type: 'number', min: 0 },
      supplier_id:         { type: 'string', minLength: 36, maxLength: 36, required: false },
    },
  }),
  (req, res, next) => inventoryController.addMaterial(req, res, next)
);

/**
 * @route   GET /api/v1/inventory
 * @desc    View inventory
 */
// Defines the API endpoint and connects it to the controller.
router.get(
  '/',
  validate({
    query: {
      page:   { type: 'string', pattern: /^\d+$/, required: false },
      limit:  { type: 'string', pattern: /^\d+$/, required: false },
      search: { type: 'string', required: false },
    },
  }),
  (req, res, next) => inventoryController.getInventory(req, res, next)
);

/**
 * @route   PATCH /api/v1/inventory/:id
 * @desc    Update material details
 */
// Defines the API endpoint and connects it to the controller.
router.patch(
  '/:id',
  validate({
    body: {
      material_name:       { type: 'string', minLength: 2, required: false },
      category:            { type: 'string', minLength: 2, required: false },
      quantity:            { type: 'number', min: 0, required: false },
      unit:                { type: 'string', minLength: 1, required: false },
      minimum_stock_level: { type: 'number', min: 0, required: false },
      supplier_id:         { type: 'string', minLength: 36, maxLength: 36, required: false },
    },
  }),
  (req, res, next) => inventoryController.updateMaterial(req, res, next)
);

/**
 * @route   POST /api/v1/inventory/:id/adjust
 * @desc    Adjust stock level
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/:id/adjust',
  validate({
    body: {
      action:   { type: 'string', enum: ['ADD', 'REMOVE'] },
      quantity: { type: 'number', min: 0.01 }, // strictly positive adjustment
      notes:    { type: 'string', required: false },
    },
  }),
  (req, res, next) => inventoryController.adjustStock(req, res, next)
);

export default router;
