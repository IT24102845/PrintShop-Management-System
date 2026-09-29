// =============================================================================
// PrintShop Management System — Root Router
// =============================================================================
// Mounts versioned API routers. Add /api/v2 here when needed.
// =============================================================================

import { Router } from 'express';
import v1Router from './v1';

const router = Router();

// ─── API Versions ─────────────────────────────────────────────────────────────

router.use('/api/v1', v1Router);

// Future: router.use('/api/v2', v2Router);

export default router;
