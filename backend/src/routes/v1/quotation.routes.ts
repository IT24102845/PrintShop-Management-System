// ============================================================
// QUOTATION ROUTES - BACKEND
// Purpose: Defines API endpoints for quotation generation and customer acceptance.
// Flow: Client Request -> Auth / Validation Middleware -> Route Handler -> Quotation Controller
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — Quotation Routes
// =============================================================================

import { Router } from 'express';
import { quotationController } from '../../controllers/quotation.controller';
import { authenticate, authorize, requireStaff } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

// Require authentication for all quotation routes
router.use(authenticate);

// ─── Staff: Quotation Management ─────────────────────────────────────────────

/**
 * @route   POST /api/v1/quotations
 * @desc    Create a quotation for an order
 * @access  Private (staff)
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/',
  requireStaff,
  validate({
    body: {
      order_id:    { type: 'string', minLength: 36, maxLength: 36 }, // UUID
      amount:      { type: 'number', min: 0 },
      notes:       { type: 'string', required: false },
      valid_until: { type: 'string', required: false },
    },
  }),
  (req, res, next) => quotationController.createQuotation(req, res, next)
);

/**
 * @route   GET /api/v1/quotations
 * @desc    Get all quotations
 * @access  Private (staff)
 */
// Defines the API endpoint and connects it to the controller.
router.get(
  '/',
  requireStaff,
  validate({
    query: {
      page:  { type: 'string', pattern: /^\d+$/, required: false },
      limit: { type: 'string', pattern: /^\d+$/, required: false },
    },
  }),
  (req, res, next) => quotationController.getAllQuotations(req, res, next)
);

// ─── Customer: Quotation Management ──────────────────────────────────────────

/**
 * @route   GET /api/v1/quotations/my
 * @desc    Get current customer's quotations
 * @access  Private (customer)
 */
// Defines the API endpoint and connects it to the controller.
router.get(
  '/my',
  authorize('customer'),
  validate({
    query: {
      page:  { type: 'string', pattern: /^\d+$/, required: false },
      limit: { type: 'string', pattern: /^\d+$/, required: false },
    },
  }),
  (req, res, next) => quotationController.getMyQuotations(req, res, next)
);

/**
 * @route   PATCH /api/v1/quotations/:id/respond
 * @desc    Customer responds to a quotation
 * @access  Private (customer)
 */
// Defines the API endpoint and connects it to the controller.
router.patch(
  '/:id/respond',
  authorize('customer'),
  validate({
    body: {
      status: { type: 'string', enum: ['accepted', 'rejected'] },
    },
  }),
  (req, res, next) => quotationController.respondToQuotation(req, res, next)
);

export default router;
