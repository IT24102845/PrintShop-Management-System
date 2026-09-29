// ============================================================
// PRODUCTION CONTROLLER - BACKEND
// Purpose: Handles HTTP requests and responses for print job production scheduling.
// Flow: Route -> Production Controller -> Production Service -> HTTP Response
// Receives the HTTP request.
// Passes the required data to the service.
// Sends the result back to the frontend.
// ============================================================

// =============================================================================
// PrintShop Management System — Production Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { productionService } from '../services/production.service';
import { sendSuccess, sendCreated } from '../utils/response.util';

export class ProductionController {

  /**
   * POST /api/v1/production/tasks
   * Create a production task (Production Staff / Manager)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async createProductionTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await productionService.createProductionTask(req.body);
      sendCreated(res, task, 'Production task created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/production/tasks
   * View all production tasks (Production Staff / Manager)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async getProductionTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.getProductionTasks(req.query);
      sendSuccess(res, result, 'Production tasks retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/production/tasks/:id/status
   * Update production status (Production Staff / Manager)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async updateProductionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedTask = await productionService.updateProductionStatus(req.params.id as string, req.body);
      sendSuccess(res, updatedTask, 'Production task status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/production/dashboard
   * View production dashboard stats (Manager)
   */
  async getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await productionService.getDashboardStats();
      sendSuccess(res, stats, 'Production dashboard stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/production/tasks/:id
   * Update production task metadata (employee, priority, notes, hours)
   * @access Private (admin, manager, production_staff)
   */
  async updateProductionTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await productionService.updateProductionTask(req.params.id as string, req.body);
      sendSuccess(res, updated, 'Production task updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/production/tasks/:id
   * Delete a WAITING production task
   * @access Private (admin, manager, production_staff)
   */
  async deleteProductionTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await productionService.deleteProductionTask(req.params.id as string);
      sendSuccess(res, null, 'Production task deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/production/eligible-orders
   * Get orders eligible for a new production task
   * @access Private (admin, manager, production_staff)
   */
  async getEligibleOrders(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await productionService.getEligibleOrders();
      sendSuccess(res, orders, 'Eligible orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/production/available-employees
   * Get employees for assignment dropdown
   * @access Private (admin, manager, production_staff)
   */
  async getAvailableEmployees(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employees = await productionService.getAvailableEmployees();
      sendSuccess(res, employees, 'Employees retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const productionController = new ProductionController();
