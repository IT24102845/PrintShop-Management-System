// ============================================================
// AUTH ROUTES - BACKEND
// Purpose: Defines API endpoints for user authentication and staff provisioning.
// Flow: Client Request -> Validation Middleware -> Route Handler -> Auth Controller
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — Auth Routes
// =============================================================================
// Mounted at: /api/v1/auth
//
// Public  : POST /register, POST /login
// Protected: GET /me, PATCH /change-password
// =============================================================================

import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router();

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────
/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new customer user account (public)
 * @access  Public
 * @body    { full_name, email, password, phone?, address?, company? }
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/register',
  validate({
    body: {
      full_name: { type: 'string', minLength: 2, maxLength: 255 },
      email:     {
        type:    'string',
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      },
      password:  { type: 'string', minLength: 8, maxLength: 128 },
      role:      {
        type:     'string',
        required: false,
        enum:     ['customer', 'manager', 'customer_service', 'design_staff', 'production_staff', 'inventory_staff', 'admin'],
      },
      phone:     { type: 'string', required: false, pattern: /^(\+?[0-9\s\-\(\)]{7,20})?$/, maxLength: 20 },
      address:   { type: 'string', required: false, maxLength: 500 },
      company:   { type: 'string', required: false, maxLength: 255 },
    },
  }),
  (req, res, next) => authController.register(req, res, next),
);

// ─── POST /api/v1/auth/staff ──────────────────────────────────────────────────
/**
 * @route   POST /api/v1/auth/staff
 * @desc    Provision a new staff account
 * @access  Private — admin, manager only
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/staff',
  authenticate,
  authorize('admin', 'manager'),
  validate({
    body: {
      full_name: { type: 'string', minLength: 2, maxLength: 255 },
      email:     {
        type:    'string',
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      },
      password:  { type: 'string', minLength: 8, maxLength: 128 },
      role:      {
        type: 'string',
        enum: ['admin', 'manager', 'customer_service', 'design_staff', 'production_staff', 'inventory_staff'],
      },
      phone:     { type: 'string', required: false, pattern: /^(\+?[0-9\s\-\(\)]{7,20})?$/, maxLength: 20 },
    },
  }),
  (req, res, next) => authController.createStaff(req, res, next),
);

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate with email + password, receive JWT
 * @access  Public
 * @body    { email, password }
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/login',
  validate({
    body: {
      email:    { type: 'string' },
      password: { type: 'string', minLength: 1 },
    },
  }),
  (req, res, next) => authController.login(req, res, next),
);

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────
/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user's profile
 * @access  Private — all authenticated roles
 * @header  Authorization: Bearer <token>
 */
// Defines the API endpoint and connects it to the controller.
router.get(
  '/me',
  authenticate,
  (req, res, next) => authController.getMe(req, res, next),
);

// ─── PATCH /api/v1/auth/change-password ───────────────────────────────────────
/**
 * @route   PATCH /api/v1/auth/change-password
 * @desc    Change the authenticated user's password
 * @access  Private — all authenticated roles
 * @header  Authorization: Bearer <token>
 * @body    { current_password, new_password }
 */
// Defines the API endpoint and connects it to the controller.
router.patch(
  '/change-password',
  authenticate,
  validate({
    body: {
      current_password: { type: 'string', minLength: 1 },
      new_password:     { type: 'string', minLength: 8, maxLength: 128 },
    },
  }),
  (req, res, next) => authController.changePassword(req, res, next),
);

// ─── Admin-only: List users ───────────────────────────────────────────────────
/**
 * Example protected + authorized route — demonstrates authorize() usage.
 * Full implementation will be added in the users module.
 *
 * @route   GET /api/v1/auth/users-test
 * @access  Private — admin, manager only
 */
// Defines the API endpoint and connects it to the controller.
router.get(
  '/admin-test',
  authenticate,
  authorize('admin', 'manager'),
  (_req, res) => {
    res.json({
      success: true,
      message: 'You have admin/manager access ✅',
      timestamp: new Date().toISOString(),
    });
  },
);

export default router;
