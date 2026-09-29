// ============================================================
// ORDER ROUTES - BACKEND
// Purpose: Defines API endpoints for print orders and order lifecycle tracking.
// Flow: Client Request -> Auth / Validation Middleware -> Route Handler -> Order Controller
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — Order Routes
// =============================================================================
// Mounted at: /api/v1/orders
// =============================================================================

import { Router } from 'express';
import { orderController } from '../../controllers/order.controller';
import { authenticate, authorize, requireStaff } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { VALID_ORDER_STATUSES, VALID_SERVICE_TYPES } from '../../services/order.service';


const router = Router();

// Require authentication for all order routes
router.use(authenticate);

// ─── Staff: Create order for a customer ─────────────────────────────────────────────────

/**
 * @route   POST /api/v1/orders/staff-create
 * @desc    Staff creates an order on behalf of a customer
 * @access  Private (any staff role)
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/staff-create',
  requireStaff,
  validate({
    body: {
      customer_id:     { type: 'string', minLength: 36, maxLength: 36 },
      service_type:    { type: 'string', enum: VALID_SERVICE_TYPES },
      description:     { type: 'string', minLength: 1 },
      size:            { type: 'string', required: false },
      quantity:        { type: 'number', min: 1 },
      colour:          { type: 'string', required: false },
      material:        { type: 'string', required: false },
      design_file_url: { type: 'string', required: false },
      deadline_date:   { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/, required: false },
      special_notes:   { type: 'string', required: false },
    },
  }),
  (req, res, next) => orderController.createOrderForStaff(req, res, next)
);

// ─── Customer: Order Management ───────────────────────────────────────────────

/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private (customer)
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/',
  authorize('customer'),
  validate({
    body: {
      service_type:    { type: 'string', enum: VALID_SERVICE_TYPES },
      description:     { type: 'string', minLength: 1 },
      size:            { type: 'string', required: false },
      quantity:        { type: 'number', min: 1 },
      colour:          { type: 'string', required: false },
      material:        { type: 'string', required: false },
      design_file_url: { type: 'string', required: false },
      deadline_date:   { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/, required: false }, // YYYY-MM-DD
      special_notes:   { type: 'string', required: false },
    },
  }),
  (req, res, next) => orderController.createOrder(req, res, next)
);

/**
 * @route   GET /api/v1/orders/my-orders
 * @desc    Get current customer's orders
 * @access  Private (customer)
 */
// Defines the API endpoint and connects it to the controller.
router.get(
  '/my-orders',
  authorize('customer'),
  validate({
    query: {
      page:  { type: 'string', pattern: /^\d+$/, required: false },
      limit: { type: 'string', pattern: /^\d+$/, required: false },
    },
  }),
  (req, res, next) => orderController.getMyOrders(req, res, next)
);

// ─── Staff: Order Management ──────────────────────────────────────────────────

/**
 * @route   GET /api/v1/orders
 * @desc    List all orders (with filters & pagination)
 * @access  Private (staff)
 */
// Defines the API endpoint and connects it to the controller.
router.get(
  '/',
  requireStaff,
  validate({
    query: {
      page:         { type: 'string', pattern: /^\d+$/, required: false },
      limit:        { type: 'string', pattern: /^\d+$/, required: false },
      status:       { type: 'string', enum: VALID_ORDER_STATUSES, required: false },
      service_type: { type: 'string', enum: VALID_SERVICE_TYPES, required: false },
      search:       { type: 'string', required: false },
    },
  }),
  (req, res, next) => orderController.getAllOrders(req, res, next)
);

/**
 * @route   PATCH /api/v1/orders/:id/status
 * @desc    Update order status
 * @access  Private (staff)
 */
// Defines the API endpoint and connects it to the controller.
router.patch(
  '/:id/status',
  requireStaff,
  validate({
    body: {
      status: { type: 'string', enum: VALID_ORDER_STATUSES },
    },
  }),
  (req, res, next) => orderController.updateOrderStatus(req, res, next)
);

// ─── Shared: View & Update Order Artwork ───────────────────────────────────────

/**
 * @route   PATCH /api/v1/orders/:id/artwork
 * @desc    Attach or update client artwork URL for an existing order
 * @access  Private (customer who owns order or staff)
 */
// Defines the API endpoint and connects it to the controller.
router.patch(
  '/:id/artwork',
  validate({
    body: {
      design_file_url: { type: 'string', minLength: 1 },
    },
  }),
  (req, res, next) => orderController.updateOrderArtwork(req, res, next)
);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order details
 * @access  Private (all) - logic inside service enforces access
 */
// Defines the API endpoint and connects it to the controller.
router.get(
  '/:id',
  (req, res, next) => orderController.getOrderById(req, res, next)
);

export default router;

