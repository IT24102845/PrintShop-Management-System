// ============================================================
// INVENTORY CONTROLLER - BACKEND
// Purpose: Handles HTTP requests and responses for raw materials and paper stock.
// Flow: Route -> Inventory Controller -> Inventory Service -> HTTP Response
// Receives the HTTP request.
// Passes the required data to the service.
// Sends the result back to the frontend.
// ============================================================

// =============================================================================
// PrintShop Management System — Inventory Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { inventoryService } from '../services/inventory.service';
import { sendSuccess, sendCreated } from '../utils/response.util';

export class InventoryController {
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async addMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const material = await inventoryService.addMaterial(req.body);
      sendCreated(res, material, 'Material added successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inventoryService.getInventory(req.query);
      sendSuccess(res, result, 'Inventory retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async updateMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await inventoryService.updateMaterial(req.params.id as string, req.body);
      sendSuccess(res, updated, 'Material updated successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await inventoryService.adjustStock(req.params.id as string, req.body);
      sendSuccess(res, updated, 'Stock adjusted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await inventoryService.getDashboardStats();
      sendSuccess(res, stats, 'Inventory dashboard stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
