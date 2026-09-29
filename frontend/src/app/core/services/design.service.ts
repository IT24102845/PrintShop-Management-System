// ============================================================
// DESIGN API SERVICE - FRONTEND
// Purpose: Connects Angular UI with design proof and artwork backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend design APIs.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Design Service
// =============================================================================
// Handles communication with the design proof REST API (/api/v1/designs):
//   - Design staff artwork proof uploads (uploadDesign)
//   - Customer viewing of design proofs for their orders (getMyDesigns)
//   - Customer proof approval or revision requests (updateDesignStatus)
// =============================================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type DesignApprovalStatus =
  | 'pending' | 'under_review' | 'approved' | 'rejected' | 'revision_requested';

export interface Design {
  id: string;
  order_id: string;
  file_url: string;
  approval_status: DesignApprovalStatus;
  remarks: string | null;
  version: number;
  uploaded_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Optional joined
  orders?: any;
}

export interface DesignResponse {
  success: boolean;
  data: Design;
  message?: string;
}

export interface DesignListResponse {
  success: boolean;
  data: Design[];
  meta: { total: number; page: number; limit: number; totalPages: number; };
}

export interface CreateDesignDto {
  order_id: string;
  file_url: string;
  remarks?: string;
}

@Injectable({ providedIn: 'root' })
export class DesignService {
  private readonly baseUrl = '/api/v1/designs';

  constructor(private http: HttpClient) {}

  // ─── Staff ─────────────────────────────────────────────────────────────────

  uploadDesign(dto: CreateDesignDto): Observable<DesignResponse> {
    return this.http.post<DesignResponse>(this.baseUrl, dto);
  }

  getAllDesigns(page = 1, limit = 20): Observable<any> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<any>(this.baseUrl, { params });
  }


  // ─── Customer ──────────────────────────────────────────────────────────────

  getMyDesigns(page = 1, limit = 20): Observable<DesignListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<DesignListResponse>(`${this.baseUrl}/my`, { params });
  }

  updateDesignStatus(
    id: string,
    status: 'pending' | 'approved' | 'revision_requested',
    remarks?: string
  ): Observable<DesignResponse> {
    return this.http.patch<DesignResponse>(`${this.baseUrl}/${id}/status`, { status, remarks });
  }

  // ─── Staff CRUD ────────────────────────────────────────────────────────────

  /** Update design remarks (staff — non-approved designs only) */
  updateDesign(id: string, remarks: string): Observable<DesignResponse> {
    return this.http.patch<DesignResponse>(`${this.baseUrl}/${id}`, { remarks });
  }

  /** Delete a design proof (staff — non-approved and no active production task) */
  deleteDesign(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
