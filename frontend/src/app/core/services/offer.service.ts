// ============================================================
// OFFER API SERVICE - FRONTEND
// Purpose: Connects Angular UI with promotional offer backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend offer APIs.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Offer Showcase Service
// =============================================================================
// Handles communication with the promotional showcase REST API (/api/v1/offers):
//   - Fetching active promotional landing cards (getOffers)
//   - Managing marketing campaigns: createOffer, updateOffer, deleteOffer
// =============================================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type OfferTheme = 'dark' | 'light' | 'eco' | 'blue' | 'purple';

export interface Offer {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  button_text: string;
  button_link: string;
  service_query?: string | null;
  badge_text?: string | null;
  badge_icon?: string | null;
  theme: OfferTheme;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OfferResponse {
  success: boolean;
  data: Offer;
  message?: string;
}

export interface OfferListResponse {
  success: boolean;
  data: Offer[];
  message?: string;
}

export interface CreateOfferDto {
  eyebrow: string;
  title: string;
  description: string;
  button_text?: string;
  button_link?: string;
  service_query?: string | null;
  badge_text?: string | null;
  badge_icon?: string | null;
  theme?: OfferTheme;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateOfferDto extends Partial<CreateOfferDto> {}

@Injectable({ providedIn: 'root' })
export class OfferService {
  private readonly baseUrl = '/api/v1/offers';

  constructor(private http: HttpClient) {}

  getAll(all = false): Observable<OfferListResponse> {
    let params = new HttpParams();
    if (all) {
      params = params.set('all', 'true');
    }
    return this.http.get<OfferListResponse>(this.baseUrl, { params });
  }

  getById(id: string): Observable<OfferResponse> {
    return this.http.get<OfferResponse>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateOfferDto): Observable<OfferResponse> {
    return this.http.post<OfferResponse>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateOfferDto): Observable<OfferResponse> {
    return this.http.put<OfferResponse>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
