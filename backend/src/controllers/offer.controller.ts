// ============================================================
// OFFER CONTROLLER - BACKEND
// Purpose: Handles HTTP requests and responses for seasonal discounts and offers.
// Flow: Route -> Offer Controller -> Offer Service -> HTTP Response
// Receives the HTTP request.
// Passes the required data to the service.
// Sends the result back to the frontend.
// ============================================================

// =============================================================================
// PrintShop Management System — Offer Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { offerService } from '../services/offer.service';
import { sendSuccess, sendCreated } from '../utils/response.util';

export class OfferController {
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.
  async getOffers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const onlyActive = req.query.all !== 'true';
      const offers = await offerService.getOffers(onlyActive);
      sendSuccess(res, offers, 'Offers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async getOfferById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const offer = await offerService.getOfferById(req.params.id as string);
      sendSuccess(res, offer, 'Offer retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async createOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const offer = await offerService.createOffer(req.body);
      sendCreated(res, offer, 'Offer created successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async updateOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await offerService.updateOffer(req.params.id as string, req.body);
      sendSuccess(res, updated, 'Offer updated successfully');
    } catch (error) {
      next(error);
    }
  }
  // Receives the HTTP request.
  // Passes the required data to the service.
  // Sends the result back to the frontend.

  async deleteOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await offerService.deleteOffer(req.params.id as string);
      sendSuccess(res, null, 'Offer deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const offerController = new OfferController();
