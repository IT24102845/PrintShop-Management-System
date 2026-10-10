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

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^(?:0\d{9}|0\d{2}[-\s]?\d{3}[-\s]?\d{4}|0\d{2}[-\s]?\d{7}|\+94\d{9}|\+94[-\s]?\d{2}[-\s]?\d{3}[-\s]?\d{4}|\+[1-9][0-9\s\-]{7,18})$/;

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
      supplier_name: { type: 'string', minLength: 2, maxLength: 255 },
      phone:         { type: 'string', pattern: PHONE_REGEX, maxLength: 20, required: false },
      email:         { type: 'string', pattern: EMAIL_REGEX, maxLength: 255, required: false },
      address:       { type: 'string', maxLength: 500, required: false },
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
      supplier_name: { type: 'string', minLength: 2, maxLength: 255, required: false },
      phone:         { type: 'string', pattern: PHONE_REGEX, maxLength: 20, required: false },
      email:         { type: 'string', pattern: EMAIL_REGEX, maxLength: 255, required: false },
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
