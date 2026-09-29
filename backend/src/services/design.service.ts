// =============================================================================
// PrintShop Management System — Design Service
// =============================================================================

import { supabase } from '../config/supabase';
import { AppError, PaginatedResponse, PaginationQuery } from '../types';
import { customerService } from './customer.service';
import logger from '../utils/logger';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface UploadDesignDto {
  order_id: string;
  file_url: string;
  remarks?: string;
}

export type DesignStatus = 'pending' | 'approved' | 'revision_requested';

export interface DesignStatusDto {
  status: DesignStatus;
  remarks?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// =============================================================================
// DesignService
// =============================================================================

export class DesignService {

  // ─── Design Staff: Upload Design ───────────────────────────────────────────

  async uploadDesign(userId: string, dto: UploadDesignDto): Promise<AnyRecord> {
    // 1. Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', dto.order_id)
      .single();

    if (orderError || !order) {
      throw new AppError('Order not found', 404);
    }

    // 2. Compute next version number for this order
    const { data: latestDesign } = await supabase
      .from('designs')
      .select('version')
      .eq('order_id', dto.order_id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const version = (latestDesign?.version ?? 0) + 1;

    // 3. Insert design proof
    const { data: design, error } = await supabase
      .from('designs')
      .insert({
        order_id:        dto.order_id,
        file_url:        dto.file_url,
        remarks:         dto.remarks ?? null,
        approval_status: 'pending',
        uploaded_by:     userId,
        version,
      })
      .select()
      .single();

    if (error || !design) {
      logger.error('Failed to upload design', error);
      throw new AppError('Failed to upload design', 500);
    }

    // 4. Update order status to 'design_review'
    await supabase
      .from('orders')
      .update({ status: 'design_review' })
      .eq('id', dto.order_id);

    logger.info(`Design v${version} uploaded for order ${dto.order_id} by staff ${userId}`);
    return design as AnyRecord;
  }

  // ─── Staff: All Designs ───────────────────────────────────────────────────

  async getAllDesigns(query: PaginationQuery): Promise<PaginatedResponse<AnyRecord>> {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data, error, count } = await supabase
      .from('designs')
      .select(
        `*,
         orders (
           id, customer_id, service_type, quantity,
           customers ( users ( full_name ) )
         )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error('Failed to fetch designs', error);
      throw new AppError('Failed to retrieve designs', 500);
    }

    return {
      items:      (data ?? []) as AnyRecord[],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }


  // ─── Customer: My Designs ──────────────────────────────────────────────────

  async getMyDesigns(userId: string, query: PaginationQuery): Promise<PaginatedResponse<AnyRecord>> {
    const customer = await customerService.findCustomerByUserId(userId);

    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data, error, count } = await supabase
      .from('designs')
      .select(
        `*,
         orders!inner ( id, customer_id, service_type, quantity )`,
        { count: 'exact' }
      )
      .eq('orders.customer_id', customer.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error('Failed to fetch customer designs', error);
      throw new AppError('Failed to retrieve your designs', 500);
    }

    return {
      items:      (data ?? []) as AnyRecord[],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  // ─── Customer: Respond to Design ───────────────────────────────────────────

  async updateDesignStatus(
    designId: string,
    userId: string,
    dto: DesignStatusDto
  ): Promise<AnyRecord> {
    const customer = await customerService.findCustomerByUserId(userId);

    // 1. Verify design exists and belongs to the customer's order
    const { data: design, error: fetchError } = await supabase
      .from('designs')
      .select(`id, approval_status, order_id, orders!inner(customer_id)`)
      .eq('id', designId)
      .eq('orders.customer_id', customer.id)
      .single();

    if (fetchError || !design) {
      throw new AppError('Design not found or access denied', 404);
    }

    if (design.approval_status === 'approved') {
      throw new AppError('This design has already been approved', 400);
    }

    // 2. Update design status
    const updatePayload: Record<string, any> = {
      approval_status: dto.status,
    };
    
    if (dto.remarks) {
      updatePayload['remarks'] = dto.remarks;
    }
    
    if (dto.status === 'approved') {
      updatePayload['approved_by'] = userId;
      updatePayload['approved_at'] = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from('designs')
      .update(updatePayload)
      .eq('id', designId)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error('Failed to update design status', updateError);
      throw new AppError('Failed to update design status', 500);
    }

    // 3. Workflow Progression: Upon approval, advance order and ensure production task exists
    if (dto.status === 'approved') {
      await supabase
        .from('orders')
        .update({ status: 'in_production' })
        .eq('id', design.order_id);

      // Check whether an active production task already exists for this order
      const { data: existingTask } = await supabase
        .from('production_tasks')
        .select('id')
        .eq('order_id', design.order_id)
        .not('status', 'in', '(COMPLETED,FAILED)')
        .maybeSingle();

      if (!existingTask) {
        const { error: taskError } = await supabase
          .from('production_tasks')
          .insert({
            order_id: design.order_id,
            status:   'WAITING',
            priority: 'normal',
            notes:    'Auto-queued upon customer design proof approval',
          });

        if (taskError) {
          logger.warn(`Could not auto-create production task for order ${design.order_id}`, taskError);
        } else {
          logger.info(`Idempotent production task created for approved order ${design.order_id}`);
        }
      }
    }

    logger.info(`Customer responded to design ${designId}: ${dto.status}`);
    return updated as AnyRecord;
  }

  // ─── Staff: Update Design Remarks ─────────────────────────────────────────
  // Only the `remarks` field may be changed by staff.
  // Blocked when design is already approved (immutable audit record).

  async updateDesign(designId: string, remarks: string): Promise<AnyRecord> {
    // 1. Fetch existing design
    const { data: design, error: fetchError } = await supabase
      .from('designs')
      .select('id, approval_status')
      .eq('id', designId)
      .single();

    if (fetchError || !design) {
      throw new AppError('Design not found', 404);
    }

    // 2. Business rule: approved designs are locked
    if (design.approval_status === 'approved') {
      throw new AppError(
        'Cannot edit an approved design. Approved designs are locked as audit records.',
        400,
      );
    }

    // 3. Update only remarks
    const { data: updated, error: updateError } = await supabase
      .from('designs')
      .update({ remarks: remarks.trim() })
      .eq('id', designId)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error('Failed to update design remarks', updateError);
      throw new AppError('Failed to update design', 500);
    }

    logger.info(`Design ${designId} remarks updated by staff`);
    return updated as AnyRecord;
  }

  // ─── Staff: Delete Design ─────────────────────────────────────────────────
  // Deletion is allowed only for: pending, revision_requested, rejected.
  // Blocked for: approved (immutable history).
  // Also blocked if an active production task exists for the same order.

  async deleteDesign(designId: string): Promise<void> {
    // 1. Fetch design and its order_id
    const { data: design, error: fetchError } = await supabase
      .from('designs')
      .select('id, approval_status, order_id')
      .eq('id', designId)
      .single();

    if (fetchError || !design) {
      throw new AppError('Design not found', 404);
    }

    // 2. Block deletion of approved designs
    if (design.approval_status === 'approved') {
      throw new AppError(
        'Cannot delete this design because it is approved. Approved designs are permanent records.',
        400,
      );
    }

    // 3. Block deletion if an active production task exists for the order
    const activeStatuses = ['WAITING', 'PRINTING', 'QUALITY_CHECK', 'READY_FOR_DELIVERY'];
    const { data: activeTask } = await supabase
      .from('production_tasks')
      .select('id, status')
      .eq('order_id', design.order_id)
      .in('status', activeStatuses)
      .maybeSingle();

    if (activeTask) {
      throw new AppError(
        `Cannot delete this design because it is associated with an active production job (${activeTask.status}). Complete or cancel the production task first.`,
        400,
      );
    }

    // 4. Safe to delete
    const { error: deleteError } = await supabase
      .from('designs')
      .delete()
      .eq('id', designId);

    if (deleteError) {
      logger.error(`Failed to delete design ${designId}`, deleteError);
      throw new AppError('Failed to delete design', 500);
    }

    logger.info(`Design ${designId} deleted by staff`);
  }
}

export const designService = new DesignService();
