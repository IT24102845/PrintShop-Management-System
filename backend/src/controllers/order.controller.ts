// ============================================================
// ORDER CONTROLLER - BACKEND
// Purpose: Handles HTTP requests and responses for print orders.
// Flow: Route -> Order Controller -> Order Service -> HTTP Response
// Receives the HTTP request.
// Passes the required data to the service.
// Sends the result back to the frontend.
// ============================================================

// =============================================================================
// PrintShop Management System — Order Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { sendSuccess, sendCreated } from '../utils/response.util';


export class OrderController {

  /**
   * POST /api/v1/orders
   * Create a new order.
   * Authorized: customer
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.createOrder(req.user!.id, req.body);
      sendCreated(res, order, 'Order created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders/staff-create
   * Create a new order on behalf of a customer.
   * Authorized: staff (any staff role)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async createOrderForStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.createOrderForStaff(req.user!.id, req.body);
      sendCreated(res, order, 'Order created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/orders/my-orders
   * Get the current customer's orders.
   * Authorized: customer
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async getMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await orderService.getMyOrders(req.user!.id, req.query);
      sendSuccess(res, result, 'Your orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/orders
   * Get all orders (with filters & search)
   * Authorized: staff
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async getAllOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await orderService.getAllOrders(req.query);
      sendSuccess(res, result, 'Orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/orders/:id
   * Get a specific order by ID.
   * Authorized: all (customers can only see their own, handled by service)
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.getOrderById(req.params.id as string, req.user!.id, req.user!.role);
      sendSuccess(res, order, 'Order details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/orders/:id/status
   * Update the status of an order.
   * Authorized: staff
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      const updatedOrder = await orderService.updateOrderStatus(req.params.id as string, status);
      sendSuccess(res, updatedOrder, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/orders/:id/artwork
   * Update or attach client artwork URL for an existing order.
   * Authorized: customer (own order) or staff
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async updateOrderArtwork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { design_file_url } = req.body;
      const updatedOrder = await orderService.updateOrderArtwork(
        req.params.id as string,
        design_file_url,
        req.user!.id,
        req.user!.role
      );
      sendSuccess(res, updatedOrder, 'Order artwork updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();

