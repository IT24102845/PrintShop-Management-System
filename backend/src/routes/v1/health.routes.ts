// ============================================================
// HEALTH ROUTES - BACKEND
// Purpose: Defines API endpoints for service health and database ping.
// Flow: Client Request -> Route Handler -> Health Controller
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — Health Routes
// =============================================================================

import { Router } from 'express';
import { HealthController } from '../../controllers/health.controller';

const router  = Router();
const ctrl    = new HealthController();

/**
 * @route   GET /api/v1/health
 * @desc    System health check — DB connectivity, uptime, environment
 * @access  Public
 */
// Defines the API endpoint and connects it to the controller.
router.get('/', (req, res, next) => ctrl.getHealth(req, res, next));

export default router;
