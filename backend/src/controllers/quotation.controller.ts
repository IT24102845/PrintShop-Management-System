// ============================================================
// QUOTATION CONTROLLER - BACKEND
// Purpose: Handles HTTP requests and responses for cost estimates and quotations.
// Flow: Route -> Quotation Controller -> Quotation Service -> HTTP Response
// Receives the HTTP request.
// Passes the required data to the service.
// Sends the result back to the frontend.
// ============================================================

// =============================================================================
// PrintShop Management System — Quotation Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { quotationService } from '../services/quotation.service';
import { sendSuccess, sendCreated } from '../utils/response.util';

export class QuotationController {

  /**
   * POST /api/v1/quotations
   * Create a quotation (Staff only)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async createQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await quotationService.createQuotation(req.body);
      sendCreated(res, quotation, 'Quotation created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/quotations
   * Get all quotations (Staff only)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async getAllQuotations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await quotationService.getAllQuotations(req.query);
      sendSuccess(res, result, 'Quotations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/quotations/my
   * Get customer's own quotations (Customer only)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async getMyQuotations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await quotationService.getMyQuotations(req.user!.id, req.query);
      sendSuccess(res, result, 'Your quotations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/quotations/:id/respond
   * Respond to a quotation (Customer only)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async respondToQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedQuotation = await quotationService.respondToQuotation(req.params.id as string, req.user!.id, req.body);
      sendSuccess(res, updatedQuotation, 'Quotation responded to successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const quotationController = new QuotationController();
