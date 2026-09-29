// ============================================================
// SUPPLIER API SERVICE - FRONTEND
// Purpose: Connects Angular UI with vendor and supplier backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend supplier APIs.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Supplier Service
// =============================================================================
// Handles communication with the supplier REST API (/api/v1/suppliers):
//   - Vendor catalog lookup and search (getSuppliers)
//   - Supplier registration and profile management (createSupplier, updateSupplier)
//   - Vendor record removal (deleteSupplier)
// =============================================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Supplier {
  id: string;
  supplier_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  contact_person?: string | null;
  website?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierResponse {
  success: boolean;
  data: Supplier;
  message?: string;
}

export interface SupplierListResponse {
  success: boolean;
  data: Supplier[];
  meta: { total: number; page: number; limit: number; totalPages: number; };
}

export interface CreateSupplierDto {
  supplier_name: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  website?: string;
  payment_terms?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly baseUrl = '/api/v1/suppliers';

  constructor(private http: HttpClient) {}

  getAll(page = 1, limit = 20, search?: string): Observable<SupplierListResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<SupplierListResponse>(this.baseUrl, { params });
  }

  create(dto: CreateSupplierDto): Observable<SupplierResponse> {
    return this.http.post<SupplierResponse>(this.baseUrl, dto);
  }

  update(id: string, dto: Partial<CreateSupplierDto> & { is_active?: boolean }): Observable<SupplierResponse> {
    return this.http.patch<SupplierResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
