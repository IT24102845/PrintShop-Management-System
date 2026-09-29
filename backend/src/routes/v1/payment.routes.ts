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
import { authenticate, requireStaff } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

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

export default router;
