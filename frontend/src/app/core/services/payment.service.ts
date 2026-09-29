// ============================================================
// PAYMENT API SERVICE - FRONTEND
// Purpose: Connects Angular UI with billing and payment backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend payment APIs.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Payment Service
// =============================================================================
// Handles communication with the payment REST API (/api/v1/payments):
//   - Recording incoming customer settlements (recordPayment)
//   - Listing payments across orders (getAllPayments)
//   - Fetching payment history for specific orders (getPaymentsByOrderId)
//   - Revenue metrics for management dashboards (getRevenueStats)
// =============================================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'online' | 'cheque' | 'mobile_money';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';

export interface PaymentRecord {
  id: string;
  order_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_ref?: string;
  receipt_url?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface RecordPaymentDto {
  order_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_status?: PaymentStatus;
  transaction_ref?: string;
  notes?: string;
}

export interface PaymentListResponse {
  success: boolean;
  data: PaymentRecord[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
}

export interface PaymentResponse {
  success: boolean;
  data: PaymentRecord;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly baseUrl = '/api/v1/payments';

  constructor(private http: HttpClient) {}

  getAllPayments(page = 1, limit = 20): Observable<PaymentListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaymentListResponse>(this.baseUrl, { params });
  }

  getPaymentsByOrderId(orderId: string): Observable<{ success: boolean; data: PaymentRecord[] }> {
    return this.http.get<{ success: boolean; data: PaymentRecord[] }>(`${this.baseUrl}/order/${orderId}`);
  }

  recordPayment(dto: RecordPaymentDto): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(this.baseUrl, dto);
  }

  getRevenueStats(): Observable<{ success: boolean; data: { totalRevenue: number; completedPaymentsCount: number } }> {
    return this.http.get<{ success: boolean; data: { totalRevenue: number; completedPaymentsCount: number } }>(
      `${this.baseUrl}/revenue-stats`
    );
  }
}
