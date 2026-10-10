// ============================================================
// INVENTORY API SERVICE - FRONTEND
// Purpose: Connects Angular UI with stock and materials backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend inventory APIs.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Inventory Service
// =============================================================================
// Handles communication with the inventory REST API (/api/v1/inventory):
//   - Material catalog retrieval and search (getInventory)
//   - Material registration and detail editing (addMaterial, updateMaterial)
//   - Stock level adjustments: ADD / REMOVE (adjustStock)
//   - Inventory health dashboard metrics (getDashboardStats)
// =============================================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryItem {
  id: string;
  material_name: string;
  category: string;
  quantity: number;
  unit: string;
  minimum_stock_level: number;
  supplier_id: string | null;
  sku?: string;
  unit_cost?: number;
  location?: string;
  suppliers?: { supplier_name?: string };
  created_at: string;
  updated_at: string;
  // Computed helper
  stock_status?: 'ok' | 'low' | 'out';
}

export interface InventoryResponse {
  success: boolean;
  data: InventoryItem;
  message?: string;
}

export interface InventoryListResponse {
  success: boolean;
  data: InventoryItem[];
  meta: { total: number; page: number; limit: number; totalPages: number; };
}

export interface InventoryDashboardResponse {
  success: boolean;
  data: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
  };
}

export interface CreateMaterialDto {
  material_name: string;
  category: string;
  quantity: number;
  unit: string;
  minimum_stock_level: number;
  supplier_id?: string;
}

export interface AdjustStockDto {
  action: 'ADD' | 'REMOVE';
  quantity: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly baseUrl = '/api/v1/inventory';

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<InventoryDashboardResponse> {
    return this.http.get<InventoryDashboardResponse>(`${this.baseUrl}/dashboard`);
  }

  getInventory(page = 1, limit = 20, search?: string): Observable<InventoryListResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<InventoryListResponse>(this.baseUrl, { params });
  }

  addMaterial(dto: CreateMaterialDto): Observable<InventoryResponse> {
    return this.http.post<InventoryResponse>(this.baseUrl, dto);
  }

  updateMaterial(id: string, dto: Partial<CreateMaterialDto>): Observable<InventoryResponse> {
    return this.http.patch<InventoryResponse>(`${this.baseUrl}/${id}`, dto);
  }

  adjustStock(id: string, dto: AdjustStockDto): Observable<InventoryResponse> {
    return this.http.post<InventoryResponse>(`${this.baseUrl}/${id}/adjust`, dto);
  }

  deleteMaterial(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
