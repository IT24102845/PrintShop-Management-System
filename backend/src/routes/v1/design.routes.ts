import { Router } from 'express';
import { designController } from '../../controllers/design.controller';
import { authenticate, authorize, requireStaff } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { validateUUID } from '../../middleware/validation.middleware';

const router = Router();

// Require authentication for all design routes
router.use(authenticate);

// ─── Staff: Design Management ────────────────────────────────────────────────

/**
 * @route   POST /api/v1/designs
 * @desc    Upload a new design for an order
 * @access  Private (staff)
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/',
  authorize('admin', 'manager', 'design_staff'),
  validate({
    body: {
      order_id: { type: 'string', minLength: 36, maxLength: 36 }, // UUID
      file_url: { type: 'string', minLength: 1 },
      remarks:  { type: 'string', required: false },
    },
  }),
  (req, res, next) => designController.uploadDesign(req, res, next)
);

/**
 * @route   GET /api/v1/designs
 * @desc    Get all designs
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
  (req, res, next) => designController.getAllDesigns(req, res, next)
);


// ─── Customer: Design Management ─────────────────────────────────────────────

/**
 * @route   GET /api/v1/designs/my
 * @desc    Get current customer's designs
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
  (req, res, next) => designController.getMyDesigns(req, res, next)
);

/**
 * @route   PATCH /api/v1/designs/:id/status
 * @desc    Customer responds to a design (approve / request changes)
 * @access  Private (customer)
 */
// Defines the API endpoint and connects it to the controller.
router.patch(
  '/:id/status',
  authorize('customer'),
  validate({
    body: {
      status:  { type: 'string', enum: ['pending', 'approved', 'revision_requested'] },
      remarks: { type: 'string', required: false },
    },
  }),
  (req, res, next) => designController.updateDesignStatus(req, res, next)
);

// ─── Staff: Design CRUD ───────────────────────────────────────────────────────

/**
 * @route   PATCH /api/v1/designs/:id
 * @desc    Staff updates design remarks (only on non-approved designs)
 * @access  Private (admin, manager, design_staff)
 */
router.patch(
  '/:id',
  authorize('admin', 'manager', 'design_staff'),
  validateUUID('id'),
  validate({
    body: {
      remarks: { type: 'string', required: true },
    },
  }),
  (req, res, next) => designController.updateDesign(req, res, next)
);

/**
 * @route   DELETE /api/v1/designs/:id
 * @desc    Staff deletes a non-approved, non-production-linked design proof
 * @access  Private (admin, manager, design_staff)
 */
router.delete(
  '/:id',
  authorize('admin', 'manager', 'design_staff'),
  validateUUID('id'),
  (req, res, next) => designController.deleteDesign(req, res, next)
);

export default router;

