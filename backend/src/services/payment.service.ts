// ============================================================
// PAYMENT SERVICE - BACKEND
// Purpose: Handles payment transactions, revenue aggregation, and balance calculation business logic.
// Flow: Controller -> Payment Service -> Supabase Database
// This file processes payment records and database operations.
// Contains payment business logic and communicates with Supabase.
// ============================================================

// =============================================================================
// PrintShop Management System — Payment Service
// =============================================================================
// Financial Transaction Ledger & Settlement:
//   - Transaction Recording: Enforces positive transaction values (amount > 0),
//     validates parent order existence, and sets 'paid_at' timestamp when completed.
//   - Multi-Channel Settlements: Supports cash, bank transfers, cards, cheques,
//     and mobile money receipts.
//   - Financial Revenue Metrics: Calculates gross realized revenue by summing
//     only payments with 'completed' status, ignoring pending or failed settlements.
// =============================================================================

import { supabase } from '../config/supabase';
import { AppError, PaginatedResponse, PaginationQuery } from '../types';
import { Payment, PaymentMethod, PaymentStatus, UpdatePaymentDto } from '../models/payment.model';
import logger from '../utils/logger';

export interface CreateStaffPaymentDto {
  order_id:         string;
  amount:           number;
  payment_method:   PaymentMethod;
  payment_status?:  PaymentStatus;
  transaction_ref?: string;
  receipt_url?:     string;
  notes?:           string;
}

export interface PaymentSummaryDto {
  totalRevenue:            number;
  totalPaymentsCount:      number;
  completedPaymentsCount:  number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/** Statuses where money has not (yet) been received — paid_at must be cleared */
const UNSETTLED_STATUSES: PaymentStatus[] = ['pending', 'processing', 'failed'];

/** Shared select clause that joins order + customer details for display */
const PAYMENT_WITH_ORDER_SELECT = `*,
  orders (
    id, service_type, quantity, status,
    customers ( users ( full_name, email ) )
  )`;

// Main business logic is handled here.
// Reads data from Supabase PostgreSQL.
// Updates data in the database.
// Validates input before processing.
// Handles errors if the operation fails.
export class PaymentService {

  /**
   * Record a staff-entered payment for an order.
   * Enforces positive non-zero amount.
   */
  async recordPayment(dto: CreateStaffPaymentDto): Promise<Payment> {
    if (!dto.amount || dto.amount <= 0) {
      throw new AppError('Payment amount must be greater than zero', 400);
    }

    // 1. Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id')
      .eq('id', dto.order_id)
      .single();

    if (orderError || !order) {
      throw new AppError('Order not found', 404);
    }

    const status: PaymentStatus = dto.payment_status || 'completed';

    // 2. Insert payment record
    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert({
        order_id:        dto.order_id,
        amount:          dto.amount,
        payment_method:  dto.payment_method,
        payment_status:  status,
        transaction_ref: dto.transaction_ref ?? null,
        receipt_url:     dto.receipt_url ?? null,
        notes:           dto.notes ?? null,
        paid_at:         status === 'completed' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError || !payment) {
      logger.error('Failed to record payment', insertError);
      throw new AppError('Failed to record payment', 500);
    }

    logger.info(`Payment of ${dto.amount} recorded for order ${dto.order_id} [${dto.payment_method}]`);
    return payment as Payment;
  }

  /**
   * Get all payments with order and customer details
   */
  async getAllPayments(query: PaginationQuery): Promise<PaginatedResponse<AnyRecord>> {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data, error, count } = await supabase
      .from('payments')
      .select(
        `*,
         orders (
           id, service_type, quantity, status,
           customers ( users ( full_name, email ) )
         )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error('Failed to fetch payments', error);
      throw new AppError('Failed to retrieve payments', 500);
    }

    return {
      items:      (data ?? []) as AnyRecord[],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  /**
   * Get all payments for a specific order
   */
  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(`Failed to fetch payments for order ${orderId}`, error);
      throw new AppError('Failed to retrieve order payments', 500);
    }

    return (data ?? []) as Payment[];
  }

  /**
   * Get a single payment by ID (with order and customer details)
   */
  async getPaymentById(id: string): Promise<AnyRecord> {
    const { data, error } = await supabase
      .from('payments')
      .select(PAYMENT_WITH_ORDER_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error(`Failed to fetch payment ${id}`, error);
      throw new AppError('Failed to retrieve payment', 500);
    }

    if (!data) {
      throw new AppError('Payment not found', 404);
    }

    return data as AnyRecord;
  }

  /**
   * Update an existing payment.
   * - order_id is immutable (financial records stay tied to their order).
   * - paid_at is kept consistent with status: stamped when moving to
   *   'completed', cleared when moving back to pending/processing/failed.
   */
  async updatePayment(id: string, dto: UpdatePaymentDto): Promise<Payment> {
    // 1. Ensure payment exists
    const { data: existing, error: findError } = await supabase
      .from('payments')
      .select('id, payment_status, paid_at')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      logger.error(`Failed to look up payment ${id}`, findError);
      throw new AppError('Failed to update payment', 500);
    }
    if (!existing) {
      throw new AppError('Payment not found', 404);
    }

    // 2. Build a whitelist-only update payload
    const updates: AnyRecord = {};

    if (dto.amount !== undefined) {
      if (typeof dto.amount !== 'number' || dto.amount <= 0) {
        throw new AppError('Payment amount must be greater than zero', 400);
      }
      updates.amount = dto.amount;
    }
    if (dto.payment_method !== undefined)  updates.payment_method  = dto.payment_method;
    if (dto.transaction_ref !== undefined) updates.transaction_ref = dto.transaction_ref?.trim() || null;
    if (dto.receipt_url !== undefined)     updates.receipt_url     = dto.receipt_url?.trim() || null;
    if (dto.notes !== undefined)           updates.notes           = dto.notes?.trim() || null;

    if (dto.payment_status !== undefined) {
      updates.payment_status = dto.payment_status;
      if (dto.payment_status === 'completed' && !existing.paid_at) {
        updates.paid_at = new Date().toISOString();
      } else if (UNSETTLED_STATUSES.includes(dto.payment_status)) {
        updates.paid_at = null;
      }
    }

    // Explicit paid_at override (e.g. back-dating a cash receipt)
    if (dto.paid_at !== undefined) {
      if (dto.paid_at !== null && Number.isNaN(Date.parse(dto.paid_at))) {
        throw new AppError("'paid_at' must be a valid ISO date", 400);
      }
      updates.paid_at = dto.paid_at;
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid fields provided for update', 400);
    }

    // 3. Persist
    const { data: updated, error: updateError } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error(`Failed to update payment ${id}`, updateError);
      throw new AppError('Failed to update payment', 500);
    }

    logger.info(`Payment ${id} updated [${Object.keys(updates).join(', ')}]`);
    return updated as Payment;
  }

  /**
   * Permanently delete a payment record.
   * Route layer restricts this to admin/manager roles.
   */
  async deletePayment(id: string): Promise<void> {
    const { data, error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      logger.error(`Failed to delete payment ${id}`, error);
      throw new AppError('Failed to delete payment', 500);
    }

    if (!data || data.length === 0) {
      throw new AppError('Payment not found', 404);
    }

    logger.info(`Payment ${id} deleted`);
  }

  /**
   * Revenue summary calculated from actual completed payments
   */
  async getRevenueStats(): Promise<PaymentSummaryDto> {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_status');

    if (error) {
      logger.error('Failed to calculate revenue stats', error);
      throw new AppError('Failed to compute revenue statistics', 500);
    }

    let totalRevenue = 0;
    let completedPaymentsCount = 0;

    for (const p of (data ?? [])) {
      if (p.payment_status === 'completed') {
        totalRevenue += Number(p.amount) || 0;
        completedPaymentsCount++;
      }
    }

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalPaymentsCount: (data ?? []).length,
      completedPaymentsCount,
    };
  }
}

export const paymentService = new PaymentService();
