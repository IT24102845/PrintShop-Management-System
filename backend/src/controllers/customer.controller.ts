// =============================================================================
// PrintShop Management System — Customer Controller
// =============================================================================
// Purpose: Handles HTTP requests and responses for customer operations.
// Flow: Route → Customer Controller → Customer Service → HTTP Response
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service';
import { sendSuccess, sendCreated } from '../utils/response.util';

export class CustomerController {

  /**
   * GET /api/v1/customers/profile
   * Get the current customer's profile.
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await customerService.getProfile(req.user!.id);
      sendSuccess(res, profile, 'Customer profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/customers/profile
   * Update the current customer's profile.
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedProfile = await customerService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, updatedProfile, 'Customer profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/customers
   * List all customers (with search & pagination)
   * Authorized: admin, manager, customer_service
   */
  async getAllCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customerService.getAllCustomers(req.query);
      sendSuccess(res, result, 'Customers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/customers/:id
   * Get a single customer by ID (with order stats & recent orders)
   * Authorized: admin, manager, customer_service
   */
  async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await customerService.getCustomerById(req.params.id as string);
      sendSuccess(res, customer, 'Customer retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/customers
   * Create a new customer by staff
   * Authorized: admin, manager, customer_service
   */
  async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await customerService.createCustomer(req.body);
      sendCreated(res, customer, 'Customer created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/customers/:id
   * Update a customer by staff
   * Authorized: admin, manager, customer_service
   */
  async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await customerService.updateCustomer(req.params.id as string, req.body);
      sendSuccess(res, updated, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/customers/:id
   * Delete or deactivate customer by staff
   * Authorized: admin, manager
   */
  async deleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customerService.deleteCustomer(req.params.id as string);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();

