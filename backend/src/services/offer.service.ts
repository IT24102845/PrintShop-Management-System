// ============================================================
// OFFER SERVICE - BACKEND
// Purpose: Handles promotional showcase offer persistence via Supabase PostgreSQL.
// Flow: Controller -> Offer Service -> Supabase Database
//
// Architecture:
//   READ  operations use the anon `supabase` client (respects RLS — active-only
//         offers are accessible without auth, matching the customer portal model).
//   WRITE operations use the `supabaseAdmin` client (service-role key, bypasses
//         RLS). All write routes are already protected by Express authenticate +
//         authorize('admin','manager') middleware — the service-role key is NEVER
//         exposed to the browser.
//
// JSON fallback is intentionally REMOVED. Supabase PostgreSQL is the single
// source of truth. If a database operation fails, the service throws an AppError
// so the controller returns a proper HTTP error response to the client.
// ============================================================

// =============================================================================
// PrintShop Management System — Offer Service
// =============================================================================

import { supabase, supabaseAdmin } from '../config/supabase';
import { Offer, CreateOfferDto, UpdateOfferDto } from '../models/offer.model';
import { AppError } from '../types';
import logger from '../utils/logger';

export class OfferService {
  /**
   * Get all offers.
   * @param onlyActive  true  → return only is_active=true rows (customer portal)
   *                    false → return all rows (admin management view)
   */
  async getOffers(onlyActive = true): Promise<Offer[]> {
    let query = supabase
      .from('offers')
      .select('*')
      .order('sort_order', { ascending: true });

    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to retrieve offers from Supabase:', error.message);
      throw new AppError(`Failed to retrieve offers: ${error.message}`, 500);
    }

    return (data ?? []) as Offer[];
  }

  /**
   * Get a single offer by UUID.
   * Throws 404 if the offer does not exist.
   */
  async getOfferById(id: string): Promise<Offer> {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // PGRST116 = no rows returned by .single()
      if (error.code === 'PGRST116') {
        throw new AppError('Offer not found', 404);
      }
      logger.error(`Failed to retrieve offer ${id} from Supabase:`, error.message);
      throw new AppError(`Failed to retrieve offer: ${error.message}`, 500);
    }

    if (!data) {
      throw new AppError('Offer not found', 404);
    }

    return data as Offer;
  }

  /**
   * Create a new promotional offer.
   * Persists to Supabase using the service-role client (bypasses RLS).
   * Throws on any database error — never falls back to a local file.
   */
  async createOffer(dto: CreateOfferDto): Promise<Offer> {
    const payload = {
      eyebrow:       dto.eyebrow.trim(),
      title:         dto.title.trim(),
      description:   dto.description.trim(),
      button_text:   (dto.button_text  || 'Order Now').trim(),
      button_link:   (dto.button_link  || '/customer/orders/new').trim(),
      service_query: dto.service_query ? dto.service_query.trim() : null,
      badge_text:    dto.badge_text    ? dto.badge_text.trim()    : null,
      badge_icon:    dto.badge_icon    ? dto.badge_icon.trim()    : 'auto_awesome',
      theme:         dto.theme         || 'dark',
      sort_order:    Number(dto.sort_order) || 0,
      is_active:     dto.is_active !== undefined ? Boolean(dto.is_active) : true,
    };

    const { data, error } = await supabaseAdmin
      .from('offers')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create offer in Supabase:', error.message);
      throw new AppError(`Failed to create offer: ${error.message}`, 500);
    }

    if (!data) {
      throw new AppError('Failed to create offer: no data returned from database', 500);
    }

    logger.info(`Offer created: id=${(data as Offer).id}, title="${payload.title}"`);
    return data as Offer;
  }

  /**
   * Update an existing offer by UUID.
   * Persists changes to Supabase using the service-role client.
   * Throws 404 if the offer does not exist, 500 on any other DB error.
   */
  async updateOffer(id: string, dto: UpdateOfferDto): Promise<Offer> {
    // Build update payload — only include defined fields
    const payload: Partial<Offer> = {};

    if (dto.eyebrow       !== undefined) payload.eyebrow       = dto.eyebrow.trim();
    if (dto.title         !== undefined) payload.title         = dto.title.trim();
    if (dto.description   !== undefined) payload.description   = dto.description.trim();
    if (dto.button_text   !== undefined) payload.button_text   = dto.button_text.trim();
    if (dto.button_link   !== undefined) payload.button_link   = dto.button_link.trim();
    if (dto.service_query !== undefined) payload.service_query = dto.service_query ? dto.service_query.trim() : null;
    if (dto.badge_text    !== undefined) payload.badge_text    = dto.badge_text    ? dto.badge_text.trim()    : null;
    if (dto.badge_icon    !== undefined) payload.badge_icon    = dto.badge_icon    ? dto.badge_icon.trim()    : null;
    if (dto.theme         !== undefined) payload.theme         = dto.theme;
    if (dto.sort_order    !== undefined) payload.sort_order    = Number(dto.sort_order);
    if (dto.is_active     !== undefined) payload.is_active     = Boolean(dto.is_active);

    if (Object.keys(payload).length === 0) {
      // Nothing to update — fetch and return the current record
      return this.getOfferById(id);
    }

    const { data, error } = await supabaseAdmin
      .from('offers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Offer not found', 404);
      }
      logger.error(`Failed to update offer ${id} in Supabase:`, error.message);
      throw new AppError(`Failed to update offer: ${error.message}`, 500);
    }

    if (!data) {
      throw new AppError('Offer not found', 404);
    }

    logger.info(`Offer updated: id=${id}`);
    return data as Offer;
  }

  /**
   * Delete an offer by UUID.
   * Removes the row from Supabase — no soft delete.
   * Throws 404 if the offer does not exist.
   */
  async deleteOffer(id: string): Promise<void> {
    // Verify existence first to return a meaningful 404
    await this.getOfferById(id);

    const { error } = await supabaseAdmin
      .from('offers')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error(`Failed to delete offer ${id} from Supabase:`, error.message);
      throw new AppError(`Failed to delete offer: ${error.message}`, 500);
    }

    logger.info(`Offer deleted: id=${id}`);
  }
}

export const offerService = new OfferService();
