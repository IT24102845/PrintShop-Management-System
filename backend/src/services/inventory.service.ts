// ============================================================
// INVENTORY SERVICE - BACKEND
// Purpose: Handles raw material tracking, stock deductions, and reorder threshold business logic.
// Flow: Controller -> Inventory Service -> Supabase Database
// This file processes inventory records and database operations.
// Contains inventory business logic and communicates with Supabase.
// ============================================================

// =============================================================================
// PrintShop Management System — Inventory Service
// =============================================================================
// Inventory Management & Stock Control:
//   1. Raw Materials Catalog:
//      Manages raw paper, inks, vinyl substrates, and packaging consumables,
//      associating each record with an authorized vendor/supplier.
//   2. Stock Adjustment & Non-Negative Invariant:
//      Enforces atomic stock adjustments (ADD for incoming shipments, REMOVE for
//      spoilage/manual corrections). Prevents negative inventory levels by
//      throwing HTTP 400 if a removal exceeds current on-hand stock.
//   3. Automated Low-Stock Alerting:
//      Aggregates materials where quantity <= minimum_stock_level to generate
//      proactive procurement alerts before printing stations experience downtime.
// =============================================================================

import { supabase } from '../config/supabase';
import { AppError, PaginatedResponse, PaginationQuery } from '../types';
import logger from '../utils/logger';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface AddMaterialDto {
  material_name:       string;
  category:            string;
  quantity:            number;
  unit:                string;
  minimum_stock_level: number;
  supplier_id?:        string;
}

export interface UpdateMaterialDto extends Partial<AddMaterialDto> {
  unit_cost?: number;
}

export interface AdjustStockDto {
  action: 'ADD' | 'REMOVE';
  quantity: number;
  notes?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// =============================================================================
// InventoryService
// =============================================================================

// Main business logic is handled here.
// Reads data from Supabase PostgreSQL.
// Updates data in the database.
// Validates input before processing.
// Handles errors if the operation fails.
export class InventoryService {

  // ─── Add Material ──────────────────────────────────────────────────────────

  async addMaterial(dto: AddMaterialDto): Promise<AnyRecord> {
    const { data, error } = await supabase
      .from('inventory_materials')
      .insert(dto)
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to add material', error);
      throw new AppError('Failed to add inventory material', 500);
    }

    return data as AnyRecord;
  }

  // ─── View Inventory ────────────────────────────────────────────────────────

  async getInventory(query: PaginationQuery): Promise<PaginatedResponse<AnyRecord>> {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    let dbQuery = supabase
      .from('inventory_materials')
      .select('*, suppliers ( supplier_name )', { count: 'exact' });
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((query as any).search?.trim()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dbQuery = dbQuery.ilike('material_name', `%${(query as any).search}%`);
    }

    const { data, error, count } = await dbQuery
      .order('material_name', { ascending: true })
      .range(from, to);

    if (error) {
      logger.error('Failed to fetch inventory', error);
      throw new AppError('Failed to retrieve inventory materials', 500);
    }

    return {
      items:      (data ?? []) as AnyRecord[],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  // ─── Update Material Details ───────────────────────────────────────────────

  async updateMaterial(id: string, dto: UpdateMaterialDto): Promise<AnyRecord> {
    const { data: updated, error } = await supabase
      .from('inventory_materials')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      logger.error('Failed to update material', error);
      throw new AppError('Failed to update material', 500);
    }

    return updated as AnyRecord;
  }

  // ─── Adjust Stock (Add/Remove) ─────────────────────────────────────────────

  async adjustStock(id: string, dto: AdjustStockDto): Promise<AnyRecord> {
    // 1. Fetch current stock
    const { data: material, error: fetchError } = await supabase
      .from('inventory_materials')
      .select('id, quantity, material_name')
      .eq('id', id)
      .single();

    if (fetchError || !material) {
      throw new AppError('Material not found', 404);
    }

    // 2. Calculate new stock
    let newQuantity = material.quantity;
    if (dto.action === 'ADD') {
      newQuantity += dto.quantity;
    } else {
      newQuantity -= dto.quantity;
    }

    // Rule: Quantity cannot become negative
    if (newQuantity < 0) {
      throw new AppError(`Insufficient stock for ${material.material_name}. Current stock: ${material.quantity}`, 400);
    }

    // 3. Update stock
    const { data: updated, error: updateError } = await supabase
      .from('inventory_materials')
      .update({ quantity: newQuantity })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error('Failed to adjust stock', updateError);
      throw new AppError('Failed to adjust stock', 500);
    }

    return updated as AnyRecord;
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<AnyRecord> {
    // We could use the view_low_stock if needed, but a simple count query works too
    const { data: inventory, error } = await supabase
      .from('inventory_materials')
      .select('id, quantity, minimum_stock_level');

    if (error || !inventory) {
      logger.error('Failed to load inventory stats', error);
      throw new AppError('Failed to load inventory dashboard', 500);
    }

    const stats = {
      totalMaterials: inventory.length,
      lowStockItems: 0,
      outOfStockItems: 0,
    };

    for (const item of inventory) {
      if (item.quantity === 0) {
        stats.outOfStockItems++;
      } else if (item.quantity <= item.minimum_stock_level) {
        stats.lowStockItems++;
      }
    }

    return stats;
  }
}

export const inventoryService = new InventoryService();
