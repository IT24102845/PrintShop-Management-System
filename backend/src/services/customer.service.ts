// ============================================================
// CUSTOMER SERVICE - BACKEND
// Purpose: Handles customer-related business logic.
// Flow: Controller -> Customer Service -> Supabase Database
// This file processes customer data and database operations.
// Contains customer business logic and communicates with Supabase.
// ============================================================

// =============================================================================
// PrintShop Management System — Customer Service
// =============================================================================
// Customer CRM & Profile Management:
//   - User-to-Customer Resolution: Links authentication user records (in 'users')
// =============================================================================
// PrintShop Management System — Customer Service
// =============================================================================
// Customer CRM & Profile Management:
//   - User-to-Customer Resolution: Links authentication user records (in 'users')
//     to domain customer entities (in 'customers').
//   - Profile Flattening: Combines identity claims (email, name, role) and CRM
//     attributes (company, phone, address, member_since) into a unified DTO.
//   - Multi-field Search: Enables staff search across user names, email addresses,
//     and customer phone numbers.
// =============================================================================

import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';
import { AppError, PaginatedResponse, PaginationQuery } from '../types';
import logger from '../utils/logger';

const SALT_ROUNDS = 10;

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface UpdateCustomerProfileDto {
  full_name?: string;
  phone?:     string;
  address?:   string;
  company?:   string;
}

export interface CreateCustomerByStaffDto {
  full_name: string;
  email:     string;
  password?: string;
  phone?:    string;
  address?:  string;
  company?:  string;
  notes?:    string;
}

export interface UpdateCustomerByStaffDto {
  full_name?: string;
  email?:     string;
  phone?:     string;
  address?:   string;
  company?:   string;
  notes?:     string;
  is_active?: boolean;
}

export interface CustomerSearchQuery extends PaginationQuery {
  search?: string;
}

// ─── Internal Supabase row shape ──────────────────────────────────────────────

interface CustomerRow {
  id:         string;
  user_id:    string;
  name:       string | null;
  phone:      string | null;
  address:    string | null;
  company:    string | null;
  notes:      string | null;
  created_at: string;
  updated_at: string;
  users: any; // Supabase returns object or array of objects depending on relationship type
}

// ─── Public API shape ─────────────────────────────────────────────────────────

export interface CustomerProfile {
  customer_id:    string;
  user_id:        string;
  full_name:      string;
  email:          string;
  role:           string;
  is_active:      boolean;
  phone:          string | null;
  address:        string | null;
  company:        string | null;
  notes:          string | null;
  last_login_at:  string | null;
  member_since:   string;
  profile_updated_at: string;
}

export interface CustomerDetailWithOrders extends CustomerProfile {
  total_orders?: number;
  recent_orders?: Array<{
    id: string;
    service_type: string;
    quantity: number;
    status: string;
    deadline_date?: string | null;
    created_at: string;
  }>;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function flattenCustomer(row: CustomerRow): CustomerProfile {
  const user = Array.isArray(row.users) ? row.users[0] : row.users;

  return {
    customer_id:        row.id,
    user_id:            row.user_id,
    full_name:          user?.full_name || row.name || '',
    email:              user?.email || '',
    role:               user?.role || 'customer',
    is_active:          user?.is_active ?? true,
    phone:              row.phone,
    address:            row.address,
    company:            row.company,
    notes:              row.notes,
    last_login_at:      user?.last_login_at || null,
    member_since:       user?.created_at || row.created_at,
    profile_updated_at: row.updated_at,
  };
}

const CUSTOMER_SELECT = `
  id, user_id, name, phone, address, company, notes, created_at, updated_at,
  users ( id, full_name, email, role, is_active, last_login_at, created_at, updated_at )
`;

// =============================================================================
// CustomerService
// =============================================================================

export class CustomerService {

  // ─── Get own profile ───────────────────────────────────────────────────────

  async getProfile(userId: string): Promise<CustomerProfile> {
    const { data, error } = await supabase
      .from('customers')
      .select(CUSTOMER_SELECT)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new AppError('Customer profile not found', 404);
    }

    return flattenCustomer(data as CustomerRow);
  }

  // ─── Update own profile ────────────────────────────────────────────────────

  async updateProfile(
    userId: string,
    dto:    UpdateCustomerProfileDto,
  ): Promise<CustomerProfile> {
    // Update users table if full_name provided
    if (dto.full_name?.trim()) {
      const { error } = await supabase
        .from('users')
        .update({ full_name: dto.full_name.trim() })
        .eq('id', userId);

      if (error) {
        logger.error('Failed to update user full_name', error);
        throw new AppError('Failed to update profile name', 500);
      }
    }

    // Build customer update payload (only supplied fields)
    const customerUpdates: Record<string, string | null> = {};
    if (dto.full_name?.trim()) customerUpdates['name']   = dto.full_name.trim();
    if (dto.phone   !== undefined) customerUpdates['phone']   = dto.phone   || null;
    if (dto.address !== undefined) customerUpdates['address'] = dto.address || null;
    if (dto.company !== undefined) customerUpdates['company'] = dto.company || null;

    if (Object.keys(customerUpdates).length > 0) {
      const { error } = await supabase
        .from('customers')
        .update(customerUpdates)
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to update customer record', error);
        throw new AppError('Failed to update customer profile', 500);
      }
    }

    logger.info(`Customer profile updated for user: ${userId}`);
    return this.getProfile(userId);
  }

  // ─── List all customers (admin / manager / customer_service) ───────────────

  async getAllCustomers(
    query: CustomerSearchQuery,
  ): Promise<PaginatedResponse<CustomerProfile>> {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    let dbQuery = supabase
      .from('customers')
      .select(CUSTOMER_SELECT, { count: 'exact' });

    // Search: resolve matching user IDs first, then filter customers
    if (query.search?.trim()) {
      const cleanSearch = query.search.trim().replace(/[,()]/g, '');
      const term = `%${cleanSearch}%`;

      const { data: matchedUsers } = await supabase
        .from('users')
        .select('id')
        .or(`full_name.ilike.${term},email.ilike.${term}`);

      const userIds = (matchedUsers ?? []).map(
        (u: { id: string }) => u.id,
      );

      if (userIds.length > 0) {
        // Match by name/email OR by phone OR by customer name
        dbQuery = dbQuery.or(
          `user_id.in.(${userIds.join(',')}),phone.ilike.${term},name.ilike.${term}`,
        );
      } else {
        // No user name/email match — search customer phone or customer name
        dbQuery = dbQuery.or(`phone.ilike.${term},name.ilike.${term}`);
      }
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await dbQuery;

    if (error) {
      logger.error('Failed to fetch customers list', error);
      throw new AppError('Failed to retrieve customers', 500);
    }

    return {
      items:      ((data as unknown) as CustomerRow[]).map(flattenCustomer),
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  // ─── Get customer by ID (staff) ────────────────────────────────────────────

  async getCustomerById(customerId: string): Promise<CustomerDetailWithOrders> {
    let { data, error } = await supabase
      .from('customers')
      .select(CUSTOMER_SELECT)
      .eq('id', customerId)
      .maybeSingle();

    if (!data) {
      const byUser = await supabase
        .from('customers')
        .select(CUSTOMER_SELECT)
        .eq('user_id', customerId)
        .maybeSingle();
      data = byUser.data;
      error = byUser.error;
    }

    if (error || !data) {
      throw new AppError('Customer not found', 404);
    }

    const baseProfile = flattenCustomer(data as unknown as CustomerRow);

    // Fetch recent orders & total orders count
    const { data: orders, count: totalOrders } = await supabase
      .from('orders')
      .select('id, service_type, quantity, status, deadline_date, created_at', { count: 'exact' })
      .eq('customer_id', baseProfile.customer_id)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      ...baseProfile,
      total_orders: totalOrders ?? 0,
      recent_orders: orders ?? [],
    };
  }

  // ─── Create customer (staff) ───────────────────────────────────────────────

  async createCustomer(dto: CreateCustomerByStaffDto): Promise<CustomerProfile> {
    const email = dto.email.toLowerCase().trim();

    // 1. Check email uniqueness
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    // 2. Hash password (use provided password or default)
    const rawPassword = dto.password?.trim() || 'Customer@123';
    const password_hash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    // 3. Insert user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        full_name:     dto.full_name.trim(),
        email,
        password_hash,
        role:          'customer',
        is_active:     true,
      })
      .select()
      .single();

    if (userError || !user) {
      logger.error('Failed to insert user for customer', userError);
      throw new AppError(`Failed to create customer user: ${userError?.message || 'Unknown error'}`, 500);
    }

    // 4. Insert customer profile
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        user_id: user.id,
        name:    dto.full_name.trim(),
        phone:   dto.phone?.trim()   || null,
        address: dto.address?.trim() || null,
        company: dto.company?.trim() || null,
        notes:   dto.notes?.trim()   || null,
      })
      .select(CUSTOMER_SELECT)
      .single();

    if (customerError || !customer) {
      logger.error('Failed to insert customer profile', customerError);
      // Rollback user row
      await supabase.from('users').delete().eq('id', user.id);
      throw new AppError(`Failed to create customer profile: ${customerError?.message || 'Unknown error'}`, 500);
    }

    logger.info(`Customer created successfully: ${user.id} (${email})`);
    return flattenCustomer(customer as unknown as CustomerRow);
  }

  // ─── Update customer (staff) ───────────────────────────────────────────────

  async updateCustomer(
    customerId: string,
    dto:        UpdateCustomerByStaffDto,
  ): Promise<CustomerProfile> {
    // 1. Resolve customer & user ID
    let { data: customerRow } = await supabase
      .from('customers')
      .select('id, user_id')
      .eq('id', customerId)
      .maybeSingle();

    if (!customerRow) {
      const byUser = await supabase
        .from('customers')
        .select('id, user_id')
        .eq('user_id', customerId)
        .maybeSingle();
      customerRow = byUser.data;
    }

    if (!customerRow) {
      throw new AppError('Customer not found', 404);
    }

    // 2. Update users table if full_name, email, or is_active provided
    const userUpdates: Record<string, any> = {};
    if (dto.full_name !== undefined && dto.full_name.trim()) {
      userUpdates.full_name = dto.full_name.trim();
    }
    if (dto.email !== undefined && dto.email.trim()) {
      const email = dto.email.toLowerCase().trim();
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', customerRow.user_id)
        .maybeSingle();

      if (existing) {
        throw new AppError('Email is already taken by another account', 409);
      }
      userUpdates.email = email;
    }
    if (dto.is_active !== undefined) {
      userUpdates.is_active = Boolean(dto.is_active);
    }

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', customerRow.user_id);

      if (userError) {
        logger.error('Failed to update user record for customer', userError);
        throw new AppError('Failed to update customer account', 500);
      }
    }

    // 3. Update customers table if name, phone, address, company, or notes provided
    const customerUpdates: Record<string, any> = {};
    if (dto.full_name !== undefined && dto.full_name.trim()) customerUpdates.name = dto.full_name.trim();
    if (dto.phone !== undefined)   customerUpdates.phone   = dto.phone?.trim()   || null;
    if (dto.address !== undefined) customerUpdates.address = dto.address?.trim() || null;
    if (dto.company !== undefined) customerUpdates.company = dto.company?.trim() || null;
    if (dto.notes !== undefined)   customerUpdates.notes   = dto.notes?.trim()   || null;

    if (Object.keys(customerUpdates).length > 0) {
      const { error: custError } = await supabase
        .from('customers')
        .update(customerUpdates)
        .eq('id', customerRow.id);

      if (custError) {
        logger.error('Failed to update customer details', custError);
        throw new AppError('Failed to update customer details', 500);
      }
    }

    logger.info(`Customer ${customerRow.id} updated by staff`);
    return this.getCustomerById(customerRow.id);
  }

  // ─── Delete / Deactivate customer (staff) ───────────────────────────────────

  async deleteCustomer(customerId: string): Promise<{
    deleted: boolean;
    deactivated: boolean;
    message: string;
  }> {
    let { data: customerRow } = await supabase
      .from('customers')
      .select('id, user_id')
      .eq('id', customerId)
      .maybeSingle();

    if (!customerRow) {
      const byUser = await supabase
        .from('customers')
        .select('id, user_id')
        .eq('user_id', customerId)
        .maybeSingle();
      customerRow = byUser.data;
    }

    if (!customerRow) {
      throw new AppError('Customer not found', 404);
    }

    // Check if customer has associated orders (quotations are attached to orders)
    const { count: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerRow.id);

    if (orderCount && orderCount > 0) {
      // Soft-delete / deactivate to preserve historical references
      const { error: deactError } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', customerRow.user_id);

      if (deactError) {
        logger.error('Failed to deactivate customer', deactError);
        throw new AppError('Failed to deactivate customer', 500);
      }

      logger.info(`Customer ${customerRow.id} deactivated due to order/quote history`);
      return {
        deleted: false,
        deactivated: true,
        message: 'Customer has associated order or quote history and has been deactivated instead of permanently deleted to preserve records.',
      };
    }

    // Hard delete: remove customer record, then user record
    const { error: delCustErr } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerRow.id);

    if (delCustErr) {
      logger.error('Failed to delete customer', delCustErr);
      throw new AppError('Failed to delete customer profile', 500);
    }

    const { error: delUserErr } = await supabase
      .from('users')
      .delete()
      .eq('id', customerRow.user_id);

    if (delUserErr) {
      logger.error('Failed to delete user record', delUserErr);
    }

    logger.info(`Customer ${customerRow.id} permanently deleted`);
    return {
      deleted: true,
      deactivated: false,
      message: 'Customer deleted successfully.',
    };
  }

  // ─── Internal helper ───────────────────────────────────────────────────────

  /** Resolves a user ID → customer row. Ensures customer profile exists without throwing fatal errors. */
  async findCustomerByUserId(userId: string): Promise<{ id: string }> {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      return data as { id: string };
    }

    // Check if userId was already a customer id
    const { data: custById } = await supabase
      .from('customers')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (custById) {
      return custById as { id: string };
    }

    // Auto-provision missing customer profile if user exists
    const { data: userRow } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (userRow) {
      const { data: newCust } = await supabase
        .from('customers')
        .insert({
          user_id: userRow.id,
          name: userRow.full_name || 'Customer',
        })
        .select('id')
        .single();

      if (newCust) {
        logger.info(`Auto-provisioned customer profile for user: ${userId}`);
        return newCust as { id: string };
      }
    }

    throw new AppError(
      'Customer profile not found. Please ensure your account is properly set up.',
      404,
    );
  }
}

export const customerService = new CustomerService();
