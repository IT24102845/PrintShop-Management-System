// ============================================================
// DESIGN CONTROLLER - BACKEND
// Purpose: Handles HTTP requests and responses for artwork files and design proofs.
// Flow: Route -> Design Controller -> Design Service -> HTTP Response
// Receives the HTTP request.
// Passes the required data to the service.
// Sends the result back to the frontend.
// ============================================================

// =============================================================================
// PrintShop Management System — Design Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { designService } from '../services/design.service';
import { sendSuccess, sendCreated } from '../utils/response.util';

export class DesignController {

  /**
   * POST /api/v1/designs
   * Upload a new design (Design staff)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async uploadDesign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const design = await designService.uploadDesign(req.user!.id, req.body);
      sendCreated(res, design, 'Design uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/designs
   * Get all designs (Staff)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async getAllDesigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await designService.getAllDesigns(req.query);
      sendSuccess(res, result, 'Designs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }


  /**
   * GET /api/v1/designs/my
   * Get customer's own designs (Customer)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async getMyDesigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await designService.getMyDesigns(req.user!.id, req.query);
      sendSuccess(res, result, 'Your designs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/designs/:id/status
   * Customer approves or requests changes to a design (Customer)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async updateDesignStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedDesign = await designService.updateDesignStatus(req.params.id as string, req.user!.id, req.body);
      sendSuccess(res, updatedDesign, 'Design status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/designs/:id
   * Staff updates remarks on a non-approved design
   * @access Private (admin, manager, design_staff)
   */
  async updateDesign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await designService.updateDesign(req.params.id as string, req.body.remarks ?? '');
      sendSuccess(res, updated, 'Design updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/designs/:id
   * Staff deletes a non-approved, non-production-linked design
   * @access Private (admin, manager, design_staff)
   */
  async deleteDesign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await designService.deleteDesign(req.params.id as string);
      sendSuccess(res, null, 'Design deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const designController = new DesignController();
