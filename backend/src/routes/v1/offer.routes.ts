// ============================================================
// OFFER ROUTES - BACKEND
// Purpose: Defines API endpoints for promotions, seasonal discounts, and offers.
// Flow: Client Request -> Auth / Validation Middleware -> Route Handler -> Offer Controller
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — Offer Routes
// =============================================================================

import { Router } from 'express';
import { offerController } from '../../controllers/offer.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate, validateUUID } from '../../middleware/validation.middleware';

const router = Router();

/**
 * @route   GET /api/v1/offers
 * @desc    Get promotional offers (public or customer/admin)
 * @query   all=true (for admins/managers to get active and inactive)
 */
// Defines the API endpoint and connects it to the controller.
router.get('/', (req, res, next) => offerController.getOffers(req, res, next));

/**
 * @route   GET /api/v1/offers/:id
 * @desc    Get offer details by ID
 */
// Defines the API endpoint and connects it to the controller.
router.get(
  '/:id',
  validateUUID('id'),
  (req, res, next) => offerController.getOfferById(req, res, next)
);

/**
 * @route   POST /api/v1/offers
 * @desc    Create a new promotional offer (admin, manager only)
 */
// Defines the API endpoint and connects it to the controller.
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  validate({
    body: {
      eyebrow:     { type: 'string', minLength: 2 },
      title:       { type: 'string', minLength: 2 },
      description: { type: 'string', minLength: 2 },
    },
  }),
  (req, res, next) => offerController.createOffer(req, res, next)
);

/**
 * @route   PUT /api/v1/offers/:id
 * @desc    Update a promotional offer (admin, manager only)
 */
// Defines the API endpoint and connects it to the controller.
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validateUUID('id'),
  (req, res, next) => offerController.updateOffer(req, res, next)
);

/**
 * @route   DELETE /api/v1/offers/:id
 * @desc    Delete a promotional offer (admin, manager only)
 */
// Defines the API endpoint and connects it to the controller.
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validateUUID('id'),
  (req, res, next) => offerController.deleteOffer(req, res, next)
);

export default router;
