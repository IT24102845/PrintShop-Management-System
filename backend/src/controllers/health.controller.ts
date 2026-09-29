// ============================================================
// HEALTH CONTROLLER - BACKEND
// Purpose: Handles HTTP requests and responses for service uptime diagnostics.
// Flow: Route -> Health Controller -> Health Service -> HTTP Response
// Receives the HTTP request.
// Passes the required data to the service.
// Sends the result back to the frontend.
// ============================================================

// =============================================================================
// PrintShop Management System — Health Controller
// =============================================================================
// Controllers handle HTTP concerns only: parse request, call service, send
// response. All business logic lives in the corresponding service.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/health.service';
import { sendSuccess } from '../utils/response.util';

const healthService = new HealthService();

export class HealthController {
  /**
   * GET /api/v1/health
   * Returns system health status including DB connectivity.
   */
  async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await healthService.getSystemHealth();

      const statusCode = health.status === 'OK' ? 200 : 503;
      sendSuccess(res, health, `System status: ${health.status}`, statusCode);
    } catch (error) {
      next(error);
    }
  }
}
