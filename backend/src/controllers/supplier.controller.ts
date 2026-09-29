// ============================================================
// SUPPLIER CONTROLLER - BACKEND
// Purpose: Handles HTTP requests and responses for material vendors and suppliers.
// Flow: Route -> Supplier Controller -> Supplier Service -> HTTP Response
// Receives the HTTP request.
// Passes the required data to the service.
// Sends the result back to the frontend.
// ============================================================

// =============================================================================
// PrintShop Management System — Supplier Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { supplierService } from '../services/supplier.service';
import { sendSuccess, sendCreated } from '../utils/response.util';

export class SupplierController {
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  
  async createSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const supplier = await supplierService.createSupplier(req.body);
      sendCreated(res, supplier, 'Supplier created successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async getAllSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await supplierService.getAllSuppliers(req.query);
      sendSuccess(res, result, 'Suppliers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async updateSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await supplierService.updateSupplier(req.params.id as string, req.body);
      sendSuccess(res, updated, 'Supplier updated successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async deleteSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await supplierService.deleteSupplier(req.params.id as string);
      sendSuccess(res, null, 'Supplier deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const supplierController = new SupplierController();
