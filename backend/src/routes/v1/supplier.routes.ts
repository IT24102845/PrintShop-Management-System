// ============================================================
// SUPPLIER ROUTES - BACKEND
// Purpose: Defines API endpoints for supplier records and procurement contacts.
// Flow: Client Request -> Auth / Validation Middleware -> Route Handler -> Supplier Controller
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — Supplier Routes
// =============================================================================

import { Router } from 'express';
import { supplierController } from '../../controllers/supplier.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

// Only admin and manager can access supplier routes
router.use(authenticate, authorize('admin', 'manager'));

/**
 * @route   POST /api/v1/suppliers
 * @desc    Create a new supplier
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/',
  validate({
    body: {
      supplier_name: { type: 'string', minLength: 2 },
      phone:         { type: 'string', required: false },
      email:         { type: 'string', pattern: /^\S+@\S+\.\S+$/, required: false },
      address:       { type: 'string', required: false },
    },
  }),
  (req, res, next) => supplierController.createSupplier(req, res, next)
);

/**
 * @route   GET /api/v1/suppliers
 * @desc    View suppliers
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
  (req, res, next) => supplierController.getAllSuppliers(req, res, next)
);

/**
 * @route   PATCH /api/v1/suppliers/:id
 * @desc    Update a supplier
 */
// Defines the API endpoint and connects it to the controller.
router.patch(
  '/:id',
  validate({
    body: {
      supplier_name: { type: 'string', minLength: 2, required: false },
      phone:         { type: 'string', required: false },
      email:         { type: 'string', pattern: /^\S+@\S+\.\S+$/, required: false },
      is_active:     { type: 'boolean', required: false },
    },
  }),
  (req, res, next) => supplierController.updateSupplier(req, res, next)
);

/**
 * @route   DELETE /api/v1/suppliers/:id
 * @desc    Delete a supplier
 */
// Defines the API endpoint and connects it to the controller.
router.delete(
  '/:id',
  (req, res, next) => supplierController.deleteSupplier(req, res, next)
);

export default router;
