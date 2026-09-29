// ============================================================
// PRODUCTION SERVICE - BACKEND
// Purpose: Handles print production queue, stage transitions, and machine assignment business logic.
// Flow: Controller -> Production Service -> Supabase Database
// This file processes production tasks and database operations.
// Contains production business logic and communicates with Supabase.
// ============================================================

// =============================================================================
// PrintShop Management System — Production Service
// =============================================================================
// Production Workflow & Business Logic:
//   1. Approved Design / Confirmed Order Prerequisite:
//      Production can begin when customer has approved design, attached client artwork,
//      or the order is in 'confirmed' status.
//   2. Task Concurrency Guard:
//      An order can have at most one active production task at any given time.
//      Submitting duplicate active tasks returns HTTP 409 Conflict.
//   3. Finite State Machine (Legal Status Transitions):
//      WAITING            → PRINTING | FAILED
//      PRINTING           → QUALITY_CHECK | FAILED
//      QUALITY_CHECK      → READY_FOR_DELIVERY | PRINTING (rework) | FAILED
//      READY_FOR_DELIVERY → COMPLETED | FAILED
//      COMPLETED          → (Terminal state)
//      FAILED             → WAITING | PRINTING (retry)
//   4. Automated Inventory Material Deduction:
//      When a job moves from WAITING into PRINTING, the service queries
//      'inventory_materials' matching the order's specified material, verifies
//      sufficient stock levels, and automatically deducts the job's quantity.
//   5. Order Status Synchronization:
//      Keep the main order workflow synchronized with the production task status:
//      - WAITING / PRINTING  → order status: 'in_production'
//      - QUALITY_CHECK       → order status: 'quality_check'
//      - READY_FOR_DELIVERY  → order status: 'ready'
//      - COMPLETED           → order status: 'COMPLETED'
//   6. Execution Timestamp Auditing:
//      - 'started_at' recorded when task enters 'PRINTING'.
//      - 'completed_at' recorded when task enters 'COMPLETED'.
// =============================================================================

import { supabase } from '../config/supabase';
import { AppError, PaginatedResponse, PaginationQuery } from '../types';
import logger from '../utils/logger';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateProductionTaskDto {
  order_id:           string;
  assigned_employee?: string;
  priority?:          'low' | 'normal' | 'high' | 'urgent';
  notes?:             string;
  estimated_hours?:   number;
}

export type ProductionStatus = 
  | 'WAITING' 
  | 'PRINTING' 
  | 'QUALITY_CHECK' 
  | 'READY_FOR_DELIVERY' 
  | 'COMPLETED'
  | 'FAILED';

export interface UpdateProductionStatusDto {
  status: ProductionStatus;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// =============================================================================
// ProductionService
// =============================================================================

export class ProductionService {

  // ─── Production Staff: Create Task ─────────────────────────────────────────

  async createProductionTask(dto: CreateProductionTaskDto): Promise<AnyRecord> {
    // 1. Verify order exists and design proof, client artwork, or confirmed status is present
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, 
        status,
        design_file_url,
        designs ( approval_status )
      `)
      .eq('id', dto.order_id)
      .single();

    if (orderError || !order) {
      throw new AppError('Order not found', 404);
    }

    // Business Rule 1: Allow production if design approved, client artwork attached, or order confirmed
    const designs = (order.designs ?? []) as Array<{ approval_status: string }>;
    const hasApprovedDesign = designs.some(d => d.approval_status === 'approved');
    const hasArtwork = Boolean(order.design_file_url);
    const isOrderConfirmed = order.status === 'confirmed' || order.status === 'in_production';

    if (!hasApprovedDesign && !hasArtwork && !isOrderConfirmed) {
      throw new AppError('Cannot start production: No approved design or client artwork found for this order.', 400);
    }

    // Business Rule 2: Prevent accidental duplicate active tasks for the same order
    const { data: existingActiveTask } = await supabase
      .from('production_tasks')
      .select('id, status')
      .eq('order_id', dto.order_id)
      .not('status', 'in', '(COMPLETED,FAILED)')
      .maybeSingle();

    if (existingActiveTask) {
      throw new AppError(`An active production task already exists for this order (${existingActiveTask.status})`, 409);
    }

    // 2. Insert production task with WAITING default
    const { data: task, error } = await supabase
      .from('production_tasks')
      .insert({
        order_id:          dto.order_id,
        assigned_employee: dto.assigned_employee ?? null,
        priority:          dto.priority ?? 'normal',
        notes:             dto.notes ?? null,
        estimated_hours:   dto.estimated_hours ?? null,
        status:            'WAITING',
      })
      .select()
      .single();

    if (error || !task) {
      logger.error('Failed to create production task', error);
      throw new AppError('Failed to create production task', 500);
    }

    // Synchronize order status to 'in_production'
    await supabase
      .from('orders')
      .update({ status: 'in_production' })
      .eq('id', dto.order_id);

    logger.info(`Production task created for order ${dto.order_id}`);
    return task as AnyRecord;
  }

  /**
   * Ensures that all orders in 'confirmed' status have a corresponding
   * production task in 'WAITING' status so they appear on the shopfloor Kanban board.
   */
  async ensureConfirmedOrdersHaveTasks(): Promise<void> {
    try {
      const { data: confirmedOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, special_notes, deadline_date')
        .eq('status', 'confirmed');

      if (ordersError || !confirmedOrders || confirmedOrders.length === 0) return;

      const orderIds = confirmedOrders.map(o => o.id);
      const { data: existingTasks } = await supabase
        .from('production_tasks')
        .select('order_id')
        .in('order_id', orderIds);

      const existingOrderIds = new Set((existingTasks ?? []).map(t => t.order_id));
      const unassigned = confirmedOrders.filter(o => !existingOrderIds.has(o.id));

      if (unassigned.length > 0) {
        const tasksToInsert = unassigned.map(o => ({
          order_id: o.id,
          status: 'WAITING',
          priority: 'normal',
          notes: o.special_notes || 'Confirmed order queued for production',
        }));

        const { error: insertError } = await supabase
          .from('production_tasks')
          .insert(tasksToInsert);

        if (insertError) {
          logger.error('Failed to auto-enroll confirmed orders into production queue', insertError);
        } else {
          logger.info(`Auto-enrolled ${unassigned.length} confirmed order(s) into WAITING production queue`);
        }
      }
    } catch (err) {
      logger.error('Error ensuring confirmed orders have production tasks', err);
    }
  }

  // ─── Production Staff: View Tasks ──────────────────────────────────────────

  async getProductionTasks(query: PaginationQuery): Promise<PaginatedResponse<AnyRecord>> {
    // Automatically ensure all confirmed orders are present in the queue
    await this.ensureConfirmedOrdersHaveTasks();

    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data, error, count } = await supabase
      .from('production_tasks')
      .select(
        `*,
         orders (
           service_type, quantity, deadline_date,
           customers ( users ( full_name ) )
         ),
         employees ( users ( full_name ) )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error('Failed to fetch production tasks', error);
      throw new AppError('Failed to retrieve production tasks', 500);
    }

    return {
      items:      (data ?? []) as AnyRecord[],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  // ─── Production Staff / Manager: Update Status ─────────────────────────────

  async updateProductionStatus(
    taskId: string,
    dto: UpdateProductionStatusDto
  ): Promise<AnyRecord> {
    // 1. Fetch existing task and order details
    const { data: task, error: fetchError } = await supabase
      .from('production_tasks')
      .select('id, status, order_id, started_at, orders(material, quantity)')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      throw new AppError('Production task not found', 404);
    }

    const currentStatus = task.status as ProductionStatus;
    const newStatus = dto.status;

    // ─── WORKFLOW VALIDATION: Enforce legal status transitions ───────────────
    if (currentStatus !== newStatus) {
      const allowedTransitions: Record<ProductionStatus, ProductionStatus[]> = {
        WAITING:            ['PRINTING', 'FAILED'],
        PRINTING:           ['QUALITY_CHECK', 'FAILED'],
        QUALITY_CHECK:      ['READY_FOR_DELIVERY', 'PRINTING', 'FAILED'],
        READY_FOR_DELIVERY: ['COMPLETED', 'FAILED'],
        COMPLETED:          [],
        FAILED:             ['WAITING', 'PRINTING'],
      };

      if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
        throw new AppError(
          `Invalid workflow transition: cannot jump from ${currentStatus} to ${newStatus}. Permitted next steps: ${allowedTransitions[currentStatus]?.join(', ') || 'none'}.`,
          400
        );
      }
    }

    // ─── PRODUCTION INTEGRATION: Inventory Stock Deduction ───────────────────
    if (newStatus === 'PRINTING' && currentStatus === 'WAITING') {
      const orderInfo = Array.isArray(task.orders) ? task.orders[0] : task.orders;
      
      if (orderInfo && orderInfo.material && orderInfo.quantity) {
        // Try to find the matching inventory material
        const { data: inventoryItem, error: invError } = await supabase
          .from('inventory_materials')
          .select('id, quantity, material_name')
          .ilike('material_name', orderInfo.material)
          .limit(1)
          .maybeSingle();

        if (invError || !inventoryItem) {
          logger.warn(`Could not find inventory material matching order material: ${orderInfo.material}`);
        } else {
          // Check stock sufficiency
          if (inventoryItem.quantity < orderInfo.quantity) {
            throw new AppError(
              `Insufficient stock for ${inventoryItem.material_name}. Required: ${orderInfo.quantity}, Available: ${inventoryItem.quantity}`,
              400
            );
          }

          // Deduct stock safely
          const { error: deductError } = await supabase
            .from('inventory_materials')
            .update({ quantity: inventoryItem.quantity - orderInfo.quantity })
            .eq('id', inventoryItem.id);

          if (deductError) {
            logger.error('Failed to deduct inventory stock', deductError);
            throw new AppError('Failed to deduct inventory stock', 500);
          }
          
          logger.info(`Deducted ${orderInfo.quantity} from ${inventoryItem.material_name} for order ${task.order_id}`);
        }
      }
    }

    const payload: Record<string, any> = { status: newStatus };
    
    // Set started_at if entering PRINTING and not previously started
    if (newStatus === 'PRINTING' && !task.started_at) {
      payload.started_at = new Date().toISOString();
    }
    
    // Set completed_at if entering COMPLETED
    if (newStatus === 'COMPLETED') {
      payload.completed_at = new Date().toISOString();
    }

    // 2. Update production task record
    const { data: updated, error: updateError } = await supabase
      .from('production_tasks')
      .update(payload)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error('Failed to update production task status', updateError);
      throw new AppError('Failed to update task status', 500);
    }

    // 3. Centralized Production → Order Status Synchronization (Rule 8)
    const orderStatusMap: Partial<Record<ProductionStatus, string>> = {
      WAITING:            'in_production',
      PRINTING:           'in_production',
      QUALITY_CHECK:      'quality_check',
      READY_FOR_DELIVERY: 'ready',
      COMPLETED:          'COMPLETED',
    };

    const targetOrderStatus = orderStatusMap[newStatus];
    if (targetOrderStatus) {
      await supabase
        .from('orders')
        .update({ status: targetOrderStatus })
        .eq('id', task.order_id);
      logger.info(`Order ${task.order_id} automatically updated to ${targetOrderStatus}`);
    } else if (newStatus === 'FAILED') {
      logger.warn(`Production task ${taskId} marked FAILED for order ${task.order_id} — preserving order record for staff attention.`);
    }

    logger.info(`Production task ${taskId} updated to ${newStatus}`);
    return updated as AnyRecord;
  }

  // ─── Manager: Production Dashboard ─────────────────────────────────────────

  async getDashboardStats(): Promise<AnyRecord> {
    const { data: tasks, error } = await supabase
      .from('production_tasks')
      .select('id, status');

    if (error) {
      logger.error('Failed to fetch dashboard stats', error);
      throw new AppError('Failed to load production dashboard', 500);
    }

    const stats = {
      pendingTasks:     0,
      activeProduction: 0,
      qualityCheck:     0,
      readyForDelivery: 0,
      completedJobs:    0,
      failedJobs:       0,
    };

    for (const task of (tasks ?? [])) {
      switch (task.status) {
        case 'WAITING':
          stats.pendingTasks++;
          break;
        case 'PRINTING':
          stats.activeProduction++;
          break;
        case 'QUALITY_CHECK':
          stats.qualityCheck++;
          break;
        case 'READY_FOR_DELIVERY':
          stats.readyForDelivery++;
          break;
        case 'COMPLETED':
          stats.completedJobs++;
          break;
        case 'FAILED':
          stats.failedJobs++;
          break;
      }
    }

    return stats;
  }

  // ─── Staff/Manager: Update Production Task Metadata ────────────────────────
  // Allows editing: assigned_employee, priority, notes, estimated_hours, actual_hours.
  // Status must continue through the dedicated updateProductionStatus() endpoint.

  async updateProductionTask(taskId: string, dto: {
    assigned_employee?: string | null;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    notes?: string;
    estimated_hours?: number;
    actual_hours?: number;
  }): Promise<AnyRecord> {
    // 1. Verify task exists
    const { data: task, error: fetchError } = await supabase
      .from('production_tasks')
      .select('id, status')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      throw new AppError('Production task not found', 404);
    }

    // 2. Build update payload — only include whitelisted metadata fields
    const payload: Record<string, unknown> = {};

    if ('assigned_employee' in dto) payload.assigned_employee = dto.assigned_employee ?? null;
    if (dto.priority !== undefined) payload.priority = dto.priority;
    if (dto.notes !== undefined) payload.notes = dto.notes;
    if (dto.estimated_hours !== undefined) {
      if (dto.estimated_hours <= 0) {
        throw new AppError('Estimated hours must be greater than 0', 400);
      }
      payload.estimated_hours = dto.estimated_hours;
    }
    if (dto.actual_hours !== undefined) {
      if (dto.actual_hours < 0) {
        throw new AppError('Actual hours cannot be negative', 400);
      }
      payload.actual_hours = dto.actual_hours;
    }

    if (Object.keys(payload).length === 0) {
      // Nothing to update — return current task
      const { data: current } = await supabase
        .from('production_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      return (current ?? {}) as AnyRecord;
    }

    const { data: updated, error: updateError } = await supabase
      .from('production_tasks')
      .update(payload)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error('Failed to update production task metadata', updateError);
      throw new AppError('Failed to update production task', 500);
    }

    logger.info(`Production task ${taskId} metadata updated`);
    return updated as AnyRecord;
  }

  // ─── Staff/Manager: Delete Production Task ─────────────────────────────────
  // Hard deletion allowed ONLY when status === WAITING (not yet printed).
  // Order is reverted to 'confirmed' status so it can be re-queued if needed.

  async deleteProductionTask(taskId: string): Promise<void> {
    // 1. Fetch task
    const { data: task, error: fetchError } = await supabase
      .from('production_tasks')
      .select('id, status, order_id')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      throw new AppError('Production task not found', 404);
    }

    // 2. Only WAITING tasks may be deleted
    if (task.status !== 'WAITING') {
      throw new AppError(
        `Cannot delete a production task that has already started (status: ${task.status}). Only WAITING tasks can be deleted.`,
        400,
      );
    }

    // 3. Delete task
    const { error: deleteError } = await supabase
      .from('production_tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) {
      logger.error(`Failed to delete production task ${taskId}`, deleteError);
      throw new AppError('Failed to delete production task', 500);
    }

    // 4. Revert order status to 'confirmed' so it can be re-queued
    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', task.order_id);

    logger.info(`Production task ${taskId} deleted. Order ${task.order_id} reverted to confirmed.`);
  }

  // ─── Support: Eligible Orders for Create Task modal ────────────────────────
  // Returns orders that:
  //   1. Have at least one approved design
  //   2. Do NOT already have an active (non-COMPLETED/non-FAILED) production task

  async getEligibleOrders(): Promise<AnyRecord[]> {
    // Get orders with an approved design
    const { data: approvedDesigns, error: dErr } = await supabase
      .from('designs')
      .select('order_id')
      .eq('approval_status', 'approved');

    if (dErr) {
      throw new AppError('Failed to fetch eligible orders', 500);
    }

    const eligibleOrderIds = [...new Set((approvedDesigns ?? []).map(d => d.order_id))];

    if (eligibleOrderIds.length === 0) return [];

    // Get active production task order_ids to exclude
    const { data: activeTasks } = await supabase
      .from('production_tasks')
      .select('order_id')
      .not('status', 'in', '(COMPLETED,FAILED)');

    const activeOrderIds = new Set((activeTasks ?? []).map(t => t.order_id));

    // Filter eligible orders that don't have an active task
    const finalEligibleIds = eligibleOrderIds.filter(id => !activeOrderIds.has(id));

    if (finalEligibleIds.length === 0) return [];

    const { data: orders, error: oErr } = await supabase
      .from('orders')
      .select('id, service_type, quantity, status, deadline_date, customers(users(full_name))')
      .in('id', finalEligibleIds)
      .order('created_at', { ascending: false });

    if (oErr) {
      throw new AppError('Failed to fetch eligible orders', 500);
    }

    return (orders ?? []) as AnyRecord[];
  }

  // ─── Support: Available Employees for assignment dropdown ──────────────────

  async getAvailableEmployees(): Promise<AnyRecord[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_role, users(full_name, email)')
      .order('id', { ascending: true });

    if (error) {
      throw new AppError('Failed to fetch employees', 500);
    }

    return (data ?? []) as AnyRecord[];
  }
}

export const productionService = new ProductionService();
