// ============================================================
// CUSTOMER ROUTES - BACKEND
// Purpose: Defines API endpoints for customer profiles and directory lookup.
// Flow: Client Request -> Auth / Validation Middleware -> Route Handler -> Customer Controller
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — Customer Routes
// =============================================================================
// Mounted at: /api/v1/customers
// =============================================================================

import { Router } from 'express';
import { customerController } from '../../controllers/customer.controller';
import { authController } from '../../controllers/auth.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate, validateUUID } from '../../middleware/validation.middleware';

const router = Router();

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^(?:0\d{9}|0\d{2}[-\s]?\d{3}[-\s]?\d{4}|0\d{2}[-\s]?\d{7}|\+94\d{9}|\+94[-\s]?\d{2}[-\s]?\d{3}[-\s]?\d{4}|\+[1-9][0-9\s\-]{7,18})$/;
const NAME_REGEX  = /^[a-zA-Z\s\-'.]{2,100}$/;

// Require authentication for all customer routes
router.use(authenticate);

// ─── Customer: Own Profile ────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/customers/profile
 * @desc    Get current customer's profile
 * @access  Private (customer)
 */
router.get(
  '/profile',
  authorize('customer'),
  (req, res, next) => customerController.getProfile(req, res, next)
);

/**
 * @route   PATCH /api/v1/customers/profile
 * @desc    Update current customer's profile
 * @access  Private (customer)
 */
router.patch(
  '/profile',
  authorize('customer'),
  validate({
    body: {
      full_name: { type: 'string', minLength: 2, maxLength: 100, pattern: NAME_REGEX, required: false },
      phone:     { type: 'string', pattern: PHONE_REGEX, maxLength: 20, required: false },
      address:   { type: 'string', maxLength: 500, required: false },
      company:   { type: 'string', maxLength: 255, required: false },
    },
  }),
  (req, res, next) => customerController.updateProfile(req, res, next)
);

// ─── Staff: Customer Management ───────────────────────────────────────────────

/**
 * @route   GET /api/v1/customers
 * @desc    List all customers (with search & pagination)
 * @access  Private (admin, manager, customer_service)
 */
router.get(
  '/',
  authorize('admin', 'manager', 'customer_service'),
  validate({
    query: {
      page:   { type: 'string', pattern: /^\d+$/, required: false },
      limit:  { type: 'string', pattern: /^\d+$/, required: false },
      search: { type: 'string', required: false },
    },
  }),
  (req, res, next) => customerController.getAllCustomers(req, res, next)
);

/**
 * @route   POST /api/v1/customers
 * @desc    Create a new customer (staff provisioned)
 * @access  Private (admin, manager, customer_service)
 */
router.post(
  '/',
  authorize('admin', 'manager', 'customer_service'),
  validate({
    body: {
      full_name: { type: 'string', minLength: 2, maxLength: 100, pattern: NAME_REGEX, required: true },
      email:     { type: 'string', pattern: EMAIL_REGEX, required: true },
      password:  { type: 'string', minLength: 6, maxLength: 128, required: false },
      phone:     { type: 'string', pattern: PHONE_REGEX, maxLength: 20, required: false },
      address:   { type: 'string', maxLength: 500, required: false },
      company:   { type: 'string', maxLength: 255, required: false },
      notes:     { type: 'string', maxLength: 1000, required: false },
    },
  }),
  (req, res, next) => customerController.createCustomer(req, res, next)
);

/**
 * @route   GET /api/v1/customers/:id
 * @desc    Get single customer details (with order statistics)
 * @access  Private (admin, manager, customer_service)
 */
router.get(
  '/:id',
  authorize('admin', 'manager', 'customer_service'),
  validateUUID('id'),
  (req, res, next) => customerController.getCustomerById(req, res, next)
);

/**
 * @route   PATCH /api/v1/customers/:id
 * @desc    Update customer details (profile, company, status)
 * @access  Private (admin, manager, customer_service)
 */
router.patch(
  '/:id',
  authorize('admin', 'manager', 'customer_service'),
  validateUUID('id'),
  validate({
    body: {
      full_name: { type: 'string', minLength: 2, maxLength: 100, pattern: NAME_REGEX, required: false },
      email:     { type: 'string', pattern: EMAIL_REGEX, required: false },
      phone:     { type: 'string', pattern: PHONE_REGEX, maxLength: 20, required: false },
      address:   { type: 'string', maxLength: 500, required: false },
      company:   { type: 'string', maxLength: 255, required: false },
      notes:     { type: 'string', maxLength: 1000, required: false },
      is_active: { type: 'boolean', required: false },
    },
  }),
  (req, res, next) => customerController.updateCustomer(req, res, next)
);

/**
 * @route   PATCH /api/v1/customers/:id/password
 * @desc    Admin/Manager resets a customer's password (no current-password check)
 * @access  Private (admin, manager)
 */
router.patch(
  '/:id/password',
  authorize('admin', 'manager'),
  validateUUID('id'),
  validate({
    body: {
      new_password: { type: 'string', minLength: 8, maxLength: 128 },
    },
  }),
  (req, res, next) => authController.adminResetCustomerPassword(req, res, next),
);

/**
 * @route   DELETE /api/v1/customers/:id
 * @desc    Delete customer (or deactivate if order history exists)
 * @access  Private (admin, manager)
 */
router.delete(
  '/:id',
  authorize('admin', 'manager'),
  validateUUID('id'),
  (req, res, next) => customerController.deleteCustomer(req, res, next)
);

export default router;

