// ============================================================
// QUOTATION API SERVICE - FRONTEND
// Purpose: Connects Angular UI with quotation backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend quotation APIs.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Quotation Service
// =============================================================================
// Handles communication with the quotation REST API (/api/v1/quotations):
//   - Staff creation of price estimates (createQuotation)
//   - Customer viewing of their issued estimates (getMyQuotations)
//   - Customer response handling (respondToQuotation: 'accepted' or 'rejected')
// =============================================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'revised' | 'expired';

export interface Quotation {
  id: string;
  order_id: string;
  amount: number;
  status: QuotationStatus;
  notes: string | null;
  valid_until: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  // Optional joined fields
  orders?: any;
}

export interface QuotationResponse {
  success: boolean;
  data: Quotation;
  message?: string;
}

export interface QuotationListResponse {
  success: boolean;
  data: Quotation[];
  meta: { total: number; page: number; limit: number; totalPages: number; };
}

export interface CreateQuotationDto {
  order_id: string;
  amount: number;
  notes?: string;
  valid_until?: string;
}

@Injectable({ providedIn: 'root' })
export class QuotationService {
  private readonly baseUrl = '/api/v1/quotations';

  constructor(private http: HttpClient) {}

  // ─── Staff ─────────────────────────────────────────────────────────────────

  getAll(page = 1, limit = 20): Observable<QuotationListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<QuotationListResponse>(this.baseUrl, { params });
  }

  create(dto: CreateQuotationDto): Observable<QuotationResponse> {
    return this.http.post<QuotationResponse>(this.baseUrl, dto);
  }

  // ─── Customer ──────────────────────────────────────────────────────────────

  getMyQuotations(page = 1, limit = 20): Observable<QuotationListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<QuotationListResponse>(`${this.baseUrl}/my`, { params });
  }

  respond(id: string, status: 'accepted' | 'rejected'): Observable<QuotationResponse> {
    return this.http.patch<QuotationResponse>(`${this.baseUrl}/${id}/respond`, { status });
  }
}
