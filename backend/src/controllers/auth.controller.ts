// ============================================================
// AUTH CONTROLLER - BACKEND
// Purpose: Handles HTTP requests and responses for authentication.
// Flow: Route -> Auth Controller -> Auth Service -> HTTP Response
// Receives the HTTP request.
// Passes the required data to the service.
// Sends the result back to the frontend.
// ============================================================

// =============================================================================
// PrintShop Management System — Authentication Controller
// =============================================================================
// Thin HTTP layer — only parses requests and delegates to AuthService.
// No business logic here.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response.util';

export class AuthController {

  /**
   * POST /api/v1/auth/register
   * Register a new user account.
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
   async register(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const result = await authService.register(req.body);
       sendCreated(res, result, 'Account created successfully');
     } catch (error) {
       next(error);
     }
   }

  /**
   * POST /api/v1/auth/staff
   * Provision a new staff account (admin/manager only).
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.createStaff(req.body);
      sendCreated(res, result, 'Staff account created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   * Authenticate with email + password. Returns a JWT.
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get the currently authenticated user's profile.
   * Requires: Bearer token
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user!.id);
      sendSuccess(res, user, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/auth/change-password
   * Change the authenticated user's password.
   * Requires: Bearer token
   */
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { current_password, new_password } = req.body as {
        current_password: string;
        new_password:     string;
      };
      await authService.changePassword(req.user!.id, current_password, new_password);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Emails a one-time password reset link. Always responds with a generic message.
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as { email: string };
      const result = await authService.requestPasswordReset(email);
      sendSuccess(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   * Sets a new password using the token from the reset email.
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, new_password } = req.body as { token: string; new_password: string };
      await authService.resetPassword(token, new_password);
      sendSuccess(res, null, 'Your password has been reset. You can now sign in.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/customers/:id/password
   * Admin/Manager can directly set a new password for a customer.
   * Does NOT require the customer's current password.
   */
  async adminResetCustomerPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { new_password } = req.body as { new_password: string };
      await authService.adminResetCustomerPassword(id, new_password);
      sendSuccess(res, null, 'Customer password updated successfully.');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
