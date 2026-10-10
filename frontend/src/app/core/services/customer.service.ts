// ============================================================
// CUSTOMER API SERVICE - FRONTEND
// Purpose: Connects Angular UI with customer backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend customer APIs.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Customer Service
// =============================================================================
// Handles communication with the customer REST API (/api/v1/customers):
//   - Customer self-service profile retrieval and update (getMyProfile, updateMyProfile)
//   - Staff customer CRM list, pagination, and multi-field search (getCustomers)
//   - Staff single customer retrieval (getCustomerById)
// =============================================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CustomerProfile {
  id?: string;
  customer_id?: string;
  user_id?: string;
  email: string;
  full_name: string;
  role?: string;
  is_active?: boolean;
  phone?: string | null;
  address?: string | null;
  company?: string | null;
  notes?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  member_since?: string;
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

export interface CustomerResponse {
  success: boolean;
  data: CustomerProfile;
  message?: string;
}

export interface CustomersListResponse {
  success: boolean;
  data: {
    items: CustomerProfile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | CustomerProfile[];
  meta?: { total: number; page: number; limit: number; totalPages: number; };
}

export interface CreateCustomerDto {
  email: string;
  full_name: string;
  password?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly baseUrl = '/api/v1/customers';

  constructor(private http: HttpClient) {}

  // ─── Staff: List all customers ─────────────────────────────────────────────
  getCustomers(page = 1, limit = 20, search?: string): Observable<CustomersListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (search) params = params.set('search', search);
    return this.http.get<CustomersListResponse>(this.baseUrl, { params });
  }

  // ─── Staff: Get single customer by ID ──────────────────────────────────────
  getCustomerById(id: string): Observable<CustomerResponse> {
    return this.http.get<CustomerResponse>(`${this.baseUrl}/${id}`);
  }

  // ─── Staff: Create a new customer account ─────────────────────────────────
  createCustomer(dto: CreateCustomerDto): Observable<CustomerResponse> {
    return this.http.post<CustomerResponse>(this.baseUrl, dto);
  }

  // ─── Staff: Update customer details ────────────────────────────────────────
  updateCustomer(id: string, data: Partial<CustomerProfile>): Observable<CustomerResponse> {
    return this.http.patch<CustomerResponse>(`${this.baseUrl}/${id}`, data);
  }

  // ─── Staff: Delete or deactivate customer ──────────────────────────────────
  deleteCustomer(id: string): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.delete<{ success: boolean; message: string; data?: any }>(`${this.baseUrl}/${id}`);
  }

  // ─── Customer: Own profile ─────────────────────────────────────────────────
  getProfile(): Observable<CustomerResponse> {
    return this.http.get<CustomerResponse>(`${this.baseUrl}/profile`);
  }

  updateProfile(data: Partial<CustomerProfile>): Observable<CustomerResponse> {
    return this.http.patch<CustomerResponse>(`${this.baseUrl}/profile`, data);
  }

  // ─── Staff: Admin reset of customer password ───────────────────────────────
  resetCustomerPassword(id: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(
      `${this.baseUrl}/${id}/password`,
      { new_password: newPassword },
    );
  }
}

