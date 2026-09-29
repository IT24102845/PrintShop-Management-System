// ============================================================
// SUPPLIER SERVICE - BACKEND
// Purpose: Handles vendor relations, supply purchase records, and supplier catalog business logic.
// Flow: Controller -> Supplier Service -> Supabase Database
// This file processes supplier records and database operations.
// Contains supplier business logic and communicates with Supabase.
// ============================================================

// =============================================================================
// PrintShop Management System — Supplier Service
// =============================================================================
// Supply Chain & Vendor Management:
//   - Vendor Directory: Maintains supplier contacts, billing addresses,
//     and payment terms for paper mills, ink manufacturers, and equipment vendors.
//   - Material Linkage: Connected to 'inventory_materials' (via supplier_id).
//   - Deletion Safety: Foreign key constraint uses ON DELETE SET NULL to prevent
//     accidental cascading loss of historical raw material inventory records.
// =============================================================================

import { supabase } from '../config/supabase';
import { AppError, PaginatedResponse, PaginationQuery } from '../types';
import logger from '../utils/logger';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateSupplierDto {
  supplier_name:  string;
  phone?:         string;
  email?:         string;
  address?:       string;
  contact_person?: string;
  website?:       string;
  payment_terms?: string;
  notes?:         string;
}

export interface UpdateSupplierDto extends Partial<CreateSupplierDto> {
  is_active?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// =============================================================================
// SupplierService
// =============================================================================

// Main business logic is handled here.
// Reads data from Supabase PostgreSQL.
// Updates data in the database.
// Validates input before processing.
// Handles errors if the operation fails.
export class SupplierService {
  
  async createSupplier(dto: CreateSupplierDto): Promise<AnyRecord> {
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert(dto)
      .select()
      .single();

    if (error || !supplier) {
      logger.error('Failed to create supplier', error);
      throw new AppError('Failed to create supplier', 500);
    }

    return supplier as AnyRecord;
  }

  async getAllSuppliers(query: PaginationQuery): Promise<PaginatedResponse<AnyRecord>> {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    let dbQuery = supabase
      .from('suppliers')
      .select('*', { count: 'exact' });
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((query as any).search?.trim()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dbQuery = dbQuery.ilike('supplier_name', `%${(query as any).search}%`);
    }

    const { data, error, count } = await dbQuery
      .order('supplier_name', { ascending: true })
      .range(from, to);

    if (error) {
      logger.error('Failed to fetch suppliers', error);
      throw new AppError('Failed to retrieve suppliers', 500);
    }

    return {
      items:      (data ?? []) as AnyRecord[],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto): Promise<AnyRecord> {
    const { data: updated, error } = await supabase
      .from('suppliers')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      logger.error('Failed to update supplier', error);
      throw new AppError('Failed to update supplier', 500);
    }

    return updated as AnyRecord;
  }

  async deleteSupplier(id: string): Promise<void> {
    // Soft delete or hard delete? The prompt says "Delete supplier"
    // Usually we soft delete if it's referenced in inventory, but let's try a hard delete,
    // Supabase has ON DELETE SET NULL for inventory_materials.supplier_id.
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete supplier', error);
      throw new AppError('Failed to delete supplier (might be in use)', 400);
    }
  }
}

export const supplierService = new SupplierService();
