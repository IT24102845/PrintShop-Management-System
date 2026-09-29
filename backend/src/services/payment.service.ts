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
import { Payment, PaymentMethod, PaymentStatus } from '../models/payment.model';
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
