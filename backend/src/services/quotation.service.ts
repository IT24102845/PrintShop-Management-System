// ============================================================
// QUOTATION SERVICE - BACKEND
// Purpose: Handles quotation calculation, price estimates, and customer approval business logic.
// Flow: Controller -> Quotation Service -> Supabase Database
// This file processes quotation data and database operations.
// Contains quotation business logic and communicates with Supabase.
// ============================================================

// =============================================================================
// PrintShop Management System — Quotation Service
// =============================================================================
// Quotation Lifecycle & Business Rules:
//   1. Multi-Revision Pricing:
//      Orders can undergo multiple quotation revisions. When staff submits a new
//      quotation, the service increments the revision sequence number (v1, v2, ...)
//      and automatically marks prior 'draft' or 'sent' quotes as 'revised'.
//   2. Validity Period & Expiry Handling:
//      Quotations default to a 14-day validity window. When a customer attempts
//      to accept an expired quote, the service transitions status to 'expired'
//      and prompts the customer to request a revised quote from staff.
//   3. Order Workflow Synchronization:
//      - When a quotation is sent on a 'pending' order, the order advances to 'quoted'.
//      - When the customer clicks 'accepted', the parent order automatically
//        transitions to 'confirmed', and auto-enrolls into the WAITING production queue.
//      - When rejected, the order remains intact so staff can renegotiate/re-quote.
//   4. Customer Ownership Verification:
//      Customers can only view and respond to quotations for orders linked
//      to their own customer profile ID.
// =============================================================================

import { supabase } from '../config/supabase';
import { AppError, PaginatedResponse, PaginationQuery } from '../types';
import { customerService } from './customer.service';
import logger from '../utils/logger';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateQuotationDto {
  order_id:     string;
  amount:       number;
  notes?:       string;
  valid_until?: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'revised' | 'expired';

export interface QuotationResponseDto {
  status: QuotationStatus; // customer can set to 'accepted' or 'rejected'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// =============================================================================
// QuotationService
// =============================================================================

export class QuotationService {

  // ─── Create Quotation (Staff) ──────────────────────────────────────────────

  async createQuotation(dto: CreateQuotationDto): Promise<AnyRecord> {
    // 1. Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', dto.order_id)
      .single();

    if (orderError || !order) {
      throw new AppError('Order not found', 404);
    }

    // 2. Determine revision number and supersede any previous active quotations (Rule 13)
    const { data: latestQuote } = await supabase
      .from('quotations')
      .select('id, revision, status')
      .eq('order_id', dto.order_id)
      .order('revision', { ascending: false })
      .limit(1)
      .maybeSingle();

    const revision = (latestQuote?.revision ?? 0) + 1;

    // Mark previous active quotation as 'revised'
    if (latestQuote && ['sent', 'draft'].includes(latestQuote.status)) {
      await supabase
        .from('quotations')
        .update({ status: 'revised' })
        .eq('id', latestQuote.id);
    }

    // Default valid_until to 14 days from now if not provided
    const validUntil = dto.valid_until || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    // 3. Insert quotation
    const { data: quotation, error } = await supabase
      .from('quotations')
      .insert({
        order_id:    dto.order_id,
        amount:      dto.amount,
        notes:       dto.notes ?? null,
        valid_until: validUntil,
        revision,
        status:      'sent', // Staff sends it directly
      })
      .select()
      .single();

    if (error || !quotation) {
      logger.error('Failed to create quotation', error);
      throw new AppError('Failed to create quotation', 500);
    }

    // 4. Update order status to 'quoted' if pending
    if (order.status === 'pending') {
      await supabase
        .from('orders')
        .update({ status: 'quoted' })
        .eq('id', dto.order_id);
    }

    logger.info(`Quotation v${revision} created for order ${dto.order_id} | amount: ${dto.amount} | valid_until: ${validUntil}`);
    return quotation as AnyRecord;
  }

  // ─── Staff: List all quotations ────────────────────────────────────────────

  async getAllQuotations(query: PaginationQuery): Promise<PaginatedResponse<AnyRecord>> {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data, error, count } = await supabase
      .from('quotations')
      .select(
        `*,
         orders (
           service_type, quantity,
           customers ( users ( full_name, email ) )
         )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error('Failed to fetch quotations', error);
      throw new AppError('Failed to retrieve quotations', 500);
    }

    return {
      items:      (data ?? []) as AnyRecord[],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  // ─── Customer: My Quotations ───────────────────────────────────────────────

  async getMyQuotations(userId: string, query: PaginationQuery): Promise<PaginatedResponse<AnyRecord>> {
    const customer = await customerService.findCustomerByUserId(userId);

    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    // Step 1: Get all order IDs belonging to this customer
    const { data: customerOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', customer.id);

    if (ordersError) {
      logger.error('Failed to fetch customer orders for quotation lookup', ordersError);
      throw new AppError('Failed to retrieve your quotations', 500);
    }

    if (!customerOrders || customerOrders.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    const orderIds = customerOrders.map((o: any) => o.id);

    // Step 2: Fetch quotations for those orders
    const { data, error, count } = await supabase
      .from('quotations')
      .select(
        `*,
         orders ( id, service_type, quantity )`,
        { count: 'exact' }
      )
      .in('order_id', orderIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error('Failed to fetch customer quotations', error);
      throw new AppError('Failed to retrieve your quotations', 500);
    }

    return {
      items:      (data ?? []) as AnyRecord[],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  // ─── Customer: Respond to Quotation ────────────────────────────────────────

  async respondToQuotation(
    quotationId: string,
    userId: string,
    dto: QuotationResponseDto
  ): Promise<AnyRecord> {
    const customer = await customerService.findCustomerByUserId(userId);

    // 1. Verify quotation exists and belongs to the customer's order
    const { data: quotation, error: fetchError } = await supabase
      .from('quotations')
      .select(`id, status, valid_until, order_id, orders!inner(customer_id)`)
      .eq('id', quotationId)
      .eq('orders.customer_id', customer.id)
      .single();

    if (fetchError || !quotation) {
      throw new AppError('Quotation not found or access denied', 404);
    }

    if (!['draft', 'sent'].includes(quotation.status)) {
      throw new AppError(`Cannot respond to a quotation that is already ${quotation.status}`, 400);
    }

    // Rule 13: Check for expiration
    if (quotation.valid_until) {
      const today = new Date().toISOString().split('T')[0];
      if (quotation.valid_until < today) {
        await supabase
          .from('quotations')
          .update({ status: 'expired' })
          .eq('id', quotationId);
        throw new AppError('This quotation has expired and cannot be accepted. Please contact staff for a revised quote.', 400);
      }
    }

    // 2. Update quotation status
    const { data: updated, error: updateError } = await supabase
      .from('quotations')
      .update({ status: dto.status })
      .eq('id', quotationId)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error('Failed to update quotation status', updateError);
      throw new AppError('Failed to update quotation status', 500);
    }

    // 3. Update order status: accepted -> confirmed; rejected -> keep order intact (Rule 13)
    if (dto.status === 'accepted') {
      await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', quotation.order_id);
      logger.info(`Order ${quotation.order_id} confirmed via quotation ${quotationId} acceptance`);

      try {
        const { data: existingTask } = await supabase
          .from('production_tasks')
          .select('id')
          .eq('order_id', quotation.order_id)
          .not('status', 'in', '(COMPLETED,FAILED)')
          .maybeSingle();

        if (!existingTask) {
          await supabase
            .from('production_tasks')
            .insert({
              order_id: quotation.order_id,
              status: 'WAITING',
              priority: 'normal',
              notes: 'Quotation accepted — queued for production',
            });
          logger.info(`Auto-enrolled quotation-accepted order ${quotation.order_id} into production queue`);
        }
      } catch (queueErr) {
        logger.error(`Failed to auto-enroll order ${quotation.order_id} into production queue`, queueErr);
      }
    } else if (dto.status === 'rejected') {
      logger.info(`Quotation ${quotationId} rejected by customer — order ${quotation.order_id} preserved`);
    }

    return updated as AnyRecord;
  }
}

export const quotationService = new QuotationService();
