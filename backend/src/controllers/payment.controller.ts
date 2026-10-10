// ============================================================
// PAYMENT CONTROLLER - BACKEND
// Purpose: Handles HTTP requests and responses for customer payments and billing.
// Flow: Route -> Payment Controller -> Payment Service -> HTTP Response
// Receives the HTTP request.
// Passes the required data to the service.
// Sends the result back to the frontend.
// ============================================================

// =============================================================================
// PrintShop Management System — Payment Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { sendSuccess, sendCreated } from '../utils/response.util';

export class PaymentController {
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await paymentService.recordPayment(req.body);
      sendCreated(res, payment, 'Payment recorded successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async getAllPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payments = await paymentService.getAllPayments(req.query);
      sendSuccess(res, payments, 'Payments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async getPaymentsByOrderId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payments = await paymentService.getPaymentsByOrderId(req.params.orderId as string);
      sendSuccess(res, payments, 'Order payments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRevenueStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await paymentService.getRevenueStats();
      sendSuccess(res, stats, 'Revenue stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await paymentService.getPaymentById(req.params.id as string);
      sendSuccess(res, payment, 'Payment retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async updatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await paymentService.updatePayment(req.params.id as string, req.body);
      sendSuccess(res, updated, 'Payment updated successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async deletePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await paymentService.deletePayment(req.params.id as string);
      sendSuccess(res, null, 'Payment deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
