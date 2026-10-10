// ============================================================
// PAYMENT ROUTES - BACKEND
// Purpose: Defines API endpoints for payment records and revenue reports.
// Flow: Client Request -> Auth / Validation Middleware -> Route Handler -> Payment Controller
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — Payment Routes
// =============================================================================

import { Router } from 'express';
import { paymentController } from '../../controllers/payment.controller';
import { authenticate, requireStaff, requireManager } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

const PAYMENT_METHODS  = ['cash', 'bank_transfer', 'card', 'online', 'cheque', 'mobile_money'];
const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'];

// Generic 8-4-4-4-12 hex UUID check. Intentionally looser than validateUUID()
// so seeded IDs like 'A0000000-0000-0000-0000-000000000001' are accepted.
const ANY_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validatePaymentId = validate({
  params: { id: { type: 'string', pattern: ANY_UUID_REGEX } },
});

// All payment routes require staff authentication
router.use(authenticate, requireStaff);

// ─── GET /api/v1/payments/revenue-stats ───────────────────────────────────────
// Defines the API endpoint and connects it to the controller.
router.get('/revenue-stats', (req, res, next) => paymentController.getRevenueStats(req, res, next));

// ─── GET /api/v1/payments/order/:orderId ──────────────────────────────────────
// Defines the API endpoint and connects it to the controller.
router.get('/order/:orderId', (req, res, next) => paymentController.getPaymentsByOrderId(req, res, next));

// ─── GET /api/v1/payments ─────────────────────────────────────────────────────
// Defines the API endpoint and connects it to the controller.
router.get(
  '/',
  validate({
    query: {
      page:  { type: 'string', pattern: /^\d+$/, required: false },
      limit: { type: 'string', pattern: /^\d+$/, required: false },
    },
  }),
  (req, res, next) => paymentController.getAllPayments(req, res, next)
);

// ─── POST /api/v1/payments ────────────────────────────────────────────────────
// Defines the API endpoint and connects it to the controller.
router.post(
  '/',
  validate({
    body: {
      order_id:         { type: 'string', minLength: 36, maxLength: 36 }, // UUID
      amount:           { type: 'number', min: 0.01 },
      payment_method:   {
        type: 'string',
        enum: ['cash', 'bank_transfer', 'card', 'online', 'cheque', 'mobile_money']
      },
      payment_status:   {
        type: 'string',
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'],
        required: false
      },
      transaction_ref:  { type: 'string', required: false },
      notes:            { type: 'string', required: false },
    },
  }),
  (req, res, next) => paymentController.recordPayment(req, res, next)
);

// ─── GET /api/v1/payments/:id ─────────────────────────────────────────────────────
// Defines the API endpoint and connects it to the controller.
// NOTE: Declared after static paths (/revenue-stats, /order/:orderId) so they
// are not captured by the :id param.
router.get(
  '/:id',
  validatePaymentId,
  (req, res, next) => paymentController.getPaymentById(req, res, next)
);

// ─── PATCH /api/v1/payments/:id ───────────────────────────────────────────────────
// Defines the API endpoint and connects it to the controller.
// All fields optional; order_id cannot be changed.
router.patch(
  '/:id',
  validatePaymentId,
  validate({
    body: {
      amount:          { type: 'number', min: 0.01, required: false },
      payment_method:  { type: 'string', enum: PAYMENT_METHODS,  required: false },
      payment_status:  { type: 'string', enum: PAYMENT_STATUSES, required: false },
      transaction_ref: { type: 'string', maxLength: 255, required: false },
      receipt_url:     { type: 'string', required: false },
      paid_at:         { type: 'string', required: false },
      notes:           { type: 'string', required: false },
    },
  }),
  (req, res, next) => paymentController.updatePayment(req, res, next)
);

// ─── DELETE /api/v1/payments/:id ──────────────────────────────────────────────────
// Defines the API endpoint and connects it to the controller.
// Deleting financial records is restricted to admin / manager.
router.delete(
  '/:id',
  requireManager,
  validatePaymentId,
  (req, res, next) => paymentController.deletePayment(req, res, next)
);

export default router;
