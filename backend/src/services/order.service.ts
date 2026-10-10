// =============================================================================
// PrintShop Management System — Order Service
// =============================================================================

import { supabase } from '../config/supabase';
import { AppError, PaginatedResponse, PaginationQuery, UserRole } from '../types';
import { OrderStatus, ServiceType } from '../models/order.model';
import { customerService } from './customer.service';
import logger from '../utils/logger';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateOrderDto {
  service_type:     ServiceType;
  description:      string;
  size?:            string;
  quantity:         number;
  colour?:          string;
  material?:        string;
  design_file_url?: string;
  deadline_date?:   string;
  special_notes?:   string;
}

export interface StaffCreateOrderDto extends CreateOrderDto {
  customer_id: string;   // explicit customer UUID — staff provides this
}

export interface OrderFilterQuery extends PaginationQuery {
  status?:       OrderStatus;
  service_type?: ServiceType;
  search?:       string;   // customer name / email
}

// ─── Valid status values (match DB CHECK constraint) ──────────────────────────

export const VALID_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'quoted',
  'confirmed',
  'design_review',
  'in_production',
  'quality_check',
  'ready',
  'delivered',
  'cancelled',
  'COMPLETED',
];

export const VALID_SERVICE_TYPES: ServiceType[] = [
  'business_cards',
  'flyers',
  'banners',
  'posters',
  'brochures',
  'stickers',
  'tshirts',
  'signage',
  'packaging',
  'custom',
];

// ─── Internal result types ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// =============================================================================
// OrderService
// =============================================================================

export class OrderService {

  // ─── Create order (customer only) ──────────────────────────────────────────

  /**
   * Creates a new order for the authenticated customer.
   * Resolves user_id → customer_id automatically.
   */
  async createOrder(userId: string, dto: CreateOrderDto): Promise<AnyRecord> {
    // 1. Resolve customer ID
    const customer = await customerService.findCustomerByUserId(userId);

    // 2. Insert order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id:     customer.id,
        service_type:    dto.service_type,
        description:     dto.description,
        size:            dto.size            ?? null,
        quantity:        dto.quantity,
        colour:          dto.colour          ?? null,
        material:        dto.material        ?? null,
        design_file_url: dto.design_file_url ?? null,
        deadline_date:   dto.deadline_date   ?? null,
        special_notes:   dto.special_notes   ?? null,
        status:          'pending',
      })
      .select()
      .single();

    if (error || !order) {
      logger.error('Failed to create order', { code: error?.code, message: error?.message });
      throw new AppError(`Failed to create order: ${error?.message ?? 'Unknown error'}`, 500);
    }

    logger.info(`Order created: ${order['id']} | customer: ${customer.id} | type: ${dto.service_type}`);
    return order as AnyRecord;
  }

  // ─── Create order on behalf of customer (staff only) ──────────────────────

  /**
   * Staff can create an order for any customer by supplying the customer_id
   * directly (bypassing user → customer resolution).
   */
  async createOrderForStaff(staffUserId: string, dto: StaffCreateOrderDto): Promise<AnyRecord> {
    // Verify the customer_id exists (support both customers.id and user_id)
    let resolvedCustomerId = dto.customer_id;
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', dto.customer_id)
      .maybeSingle();

    if (customer) {
      resolvedCustomerId = customer.id;
    } else {
      // Check if passed as user_id
      const { data: customerByUser } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', dto.customer_id)
        .maybeSingle();

      if (customerByUser) {
        resolvedCustomerId = customerByUser.id;
      } else {
        throw new AppError('Customer not found', 404);
      }
    }

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id:     resolvedCustomerId,
        service_type:    dto.service_type,
        description:     dto.description,
        size:            dto.size            ?? null,
        quantity:        dto.quantity,
        colour:          dto.colour          ?? null,
        material:        dto.material        ?? null,
        design_file_url: dto.design_file_url ?? null,
        deadline_date:   dto.deadline_date   ?? null,
        special_notes:   dto.special_notes   ?? null,
        status:          'pending',
      })
      .select()
      .single();

    if (error || !order) {
      logger.error('Staff failed to create order', { code: error?.code, message: error?.message });
      throw new AppError(`Failed to create order: ${error?.message ?? 'Unknown error'}`, 500);
    }

    logger.info(
      `Staff ${staffUserId} created order: ${order['id']} | customer: ${dto.customer_id} | type: ${dto.service_type}`,
    );
    return order as AnyRecord;
  }

  // ─── Customer: my orders ───────────────────────────────────────────────────

  /**
   * Returns paginated orders for the authenticated customer.
   * Includes latest quotation status alongside each order.
   */
  async getMyOrders(
    userId: string,
    query:  PaginationQuery,
  ): Promise<PaginatedResponse<AnyRecord>> {
    const customer = await customerService.findCustomerByUserId(userId);

    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data, error, count } = await supabase
      .from('orders')
      .select(
        `id, status, service_type, quantity, size, colour, material, description,
         design_file_url, deadline_date, special_notes, created_at, updated_at,
         quotations ( id, amount, status, revision, created_at )`,
        { count: 'exact' },
      )
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error('Failed to fetch my orders', error);
      throw new AppError('Failed to retrieve your orders', 500);
    }

    return {
      items:      (data ?? []) as AnyRecord[],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  // ─── Staff: all orders ─────────────────────────────────────────────────────

  /**
   * Returns all orders for staff, with optional filters.
   * Includes customer info and latest quotation.
   */
  async getAllOrders(query: OrderFilterQuery): Promise<PaginatedResponse<AnyRecord>> {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    let dbQuery = supabase
      .from('orders')
      .select(
        `id, status, service_type, quantity, size, colour, material, description,
         deadline_date, special_notes, created_at, updated_at,
         customers (
           id, phone, company,
           users ( full_name, email )
         ),
         quotations ( id, amount, status, revision )`,
        { count: 'exact' },
      );

    // Filter by order status
    if (query.status && VALID_ORDER_STATUSES.includes(query.status)) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    // Filter by service type
    if (query.service_type && VALID_SERVICE_TYPES.includes(query.service_type)) {
      dbQuery = dbQuery.eq('service_type', query.service_type);
    }

    // Search by customer name / email (two-step lookup)
    if (query.search?.trim()) {
      const cleanSearch = query.search.trim().replace(/[,()]/g, '');
      const term = `%${cleanSearch}%`;

      const { data: matchedUsers } = await supabase
        .from('users')
        .select('id')
        .or(`full_name.ilike.${term},email.ilike.${term}`);

      const userIds = (matchedUsers ?? []).map((u: { id: string }) => u.id);

      if (userIds.length > 0) {
        const { data: matchedCustomers } = await supabase
          .from('customers')
          .select('id')
          .in('user_id', userIds);

        const customerIds = (matchedCustomers ?? []).map((c: { id: string }) => c.id);

        if (customerIds.length > 0) {
          dbQuery = dbQuery.in('customer_id', customerIds);
        } else {
          // No matching customers — return empty
          return { items: [], total: 0, page, limit, totalPages: 0 };
        }
      } else {
        // No matching users — return empty
        return { items: [], total: 0, page, limit, totalPages: 0 };
      }
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await dbQuery;

    if (error) {
      logger.error('Failed to fetch all orders', error);
      throw new AppError('Failed to retrieve orders', 500);
    }

    return {
      items:      (data ?? []) as AnyRecord[],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  // ─── Get single order ──────────────────────────────────────────────────────

  /**
   * Returns full order detail.
   * Customers can only view their OWN orders — enforced by customer_id filter.
   * Staff can view any order.
   */
  async getOrderById(
    orderId: string,
    userId:  string,
    role:    UserRole,
  ): Promise<AnyRecord> {
    let dbQuery = supabase
      .from('orders')
      .select(
        `*,
         customers (
           id, phone, company,
           users ( id, full_name, email )
         ),
         quotations ( id, amount, status, notes, revision, valid_until, created_at, updated_at ),
         designs (
           id, file_url, approval_status, remarks, version,
           created_at, updated_at
         ),
         production_tasks (
           id, status, priority, notes, started_at, completed_at, actual_hours, estimated_hours,
           employees ( users ( full_name ) )
         ),
         payments (
           id, amount, payment_method, payment_status, transaction_ref, receipt_url, paid_at, notes, created_at
         )`,
      )
      .eq('id', orderId);

    // Customers can only see their own orders
    if (role === 'customer') {
      const customer = await customerService.findCustomerByUserId(userId);
      dbQuery = dbQuery.eq('customer_id', customer.id);
    }

    const { data, error } = await dbQuery.single();

    if (error || !data) {
      throw new AppError('Order not found', 404);
    }

    return data as AnyRecord;
  }

  // ─── Update order status (staff only) ─────────────────────────────────────

  /**
   * Staff can move an order through any valid status.
   * Validates against the DB constraint whitelist before saving.
   */
  async updateOrderStatus(
    orderId:   string,
    newStatus: string,
  ): Promise<AnyRecord> {
    // Validate status value
    if (!VALID_ORDER_STATUSES.includes(newStatus as OrderStatus)) {
      throw new AppError(
        `Invalid status '${newStatus}'. Valid values: ${VALID_ORDER_STATUSES.join(', ')}`,
        400,
      );
    }

    // Confirm order exists and get current status
    const { data: existing } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (!existing) throw new AppError('Order not found', 404);

    // Apply update
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error || !updated) {
      logger.error('Failed to update order status', error);
      throw new AppError('Failed to update order status', 500);
    }

    logger.info(
      `Order ${orderId} status: ${(existing as AnyRecord)['status']} → ${newStatus}`,
    );

    // If order was confirmed or put in production, automatically queue a WAITING production task if none exists
    if (newStatus === 'confirmed' || newStatus === 'in_production') {
      try {
        const { data: existingTask } = await supabase
          .from('production_tasks')
          .select('id')
          .eq('order_id', orderId)
          .not('status', 'in', '(COMPLETED,FAILED)')
          .maybeSingle();

        if (!existingTask) {
          await supabase
            .from('production_tasks')
            .insert({
              order_id: orderId,
              status: 'WAITING',
              priority: 'normal',
              notes: (updated as AnyRecord)['special_notes'] || 'Confirmed order queued for production',
            });
          logger.info(`Auto-enrolled order ${orderId} into WAITING production task`);
        }
      } catch (queueErr) {
        logger.error(`Failed to auto-enroll order ${orderId} into production task`, queueErr);
      }
    }

    return updated as AnyRecord;
  }

  /**
   * Purpose: Update or attach client artwork to an existing order.
   * Input: Order ID, new artwork URL, authenticated user ID and role.
   * Process: Verifies order exists and caller has permission, then updates design_file_url in Supabase.
   * Business Rule: Staff CANNOT directly overwrite customer-submitted artwork. They must upload a design proof instead.
   * Result: Returns updated order record.
   */
  async updateOrderArtwork(
    orderId: string,
    designFileUrl: string,
    userId: string,
    userRole: string,
  ): Promise<AnyRecord> {
    const { data: existing, error: fetchError } = await supabase
      .from('orders')
      .select('id, customer_id, design_file_url, customers (user_id)')
      .eq('id', orderId)
      .single();

    if (fetchError || !existing) throw new AppError('Order not found', 404);

    // If customer, verify ownership
    if (userRole === 'customer') {
      const customer = await customerService.findCustomerByUserId(userId);
      if (existing.customer_id !== customer.id) {
        throw new AppError('Access denied: You can only update your own order artwork', 403);
      }
    } else {
      // Staff cannot directly overwrite customer-submitted artwork.
      // They must use the Design Proofs workflow instead.
      if (existing.design_file_url) {
        throw new AppError(
          'Customer artwork is protected and cannot be directly replaced by staff. Please upload a revision in the Design Proofs section instead.',
          403,
        );
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({ design_file_url: designFileUrl })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error('Failed to update order artwork', updateError);
      throw new AppError('Failed to update order artwork', 500);
    }

    logger.info(`Order artwork updated for order: ${orderId}`);
    return updated as AnyRecord;
  }
}

export const orderService = new OrderService();

