// ============================================================
// ORDER API SERVICE - FRONTEND
// Purpose: Connects Angular UI with order management backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend order APIs.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Order Service
// =============================================================================
// Handles communication with the order REST API (/api/v1/orders):
//   - Customer self-service: createOrder, getMyOrders.
//   - Staff administration: createOrderForStaff, getAllOrders, updateOrderStatus.
//   - Single order retrieval: getOrderById (deep hydration of quotes, designs, tasks).
//
// Components should inject this service rather than issuing raw HTTP requests.
// =============================================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type OrderStatus =
  | 'pending'
  | 'quoted'
  | 'confirmed'
  | 'design_review'
  | 'in_production'
  | 'quality_check'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'COMPLETED';

export interface Order {
  id: string;
  customer_id: string;
  service_type: string;
  description: string;
  size?: string;
  quantity: number;
  colour?: string;
  material?: string;
  design_file_url?: string;
  status: OrderStatus | string;
  deadline_date?: string;
  special_notes?: string;
  created_at: string;
  // joined fields
  customers?: any;
  quotations?: any[];
  designs?: any[];
  production_tasks?: any[];
  payments?: any[];
}

export interface OrderSummary {
  order_id: string;
  order_status: string;
  service_type: string;
  quantity: number;
  order_date: string;
  customer_name: string;
  total_paid: number;
  balance_due?: number;
}

export interface OrderResponse {
  success: boolean;
  data: Order;
  message?: string;
}

export interface OrderListResponse {
  success: boolean;
  data: any;
  meta: { total: number; page: number; limit: number; totalPages: number; };
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly baseUrl = '/api/v1/orders';

  constructor(private http: HttpClient) {}

  getAllOrders(filters: any = {}): Observable<OrderListResponse> {
    let params = new HttpParams();
    Object.keys(filters).forEach(k => { if (filters[k]) params = params.set(k, filters[k]); });
    return this.http.get<OrderListResponse>(this.baseUrl, { params });
  }

  getMyOrders(page = 1, limit = 20): Observable<OrderListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<OrderListResponse>(`${this.baseUrl}/my-orders`, { params });
  }

  getOrderById(id: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.baseUrl}/${id}`);
  }

  /** Customer creates their own order */
  createOrder(data: any): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.baseUrl, data);
  }

  /** Staff creates an order on behalf of a customer */
  createOrderForStaff(data: any): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.baseUrl}/staff-create`, data);
  }

  updateOrderStatus(id: string, status: string): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`${this.baseUrl}/${id}/status`, { status });
  }

  /**
   * Purpose: Attach or update client artwork for an existing order.
   * Input: Order ID and public design file URL.
   * Process: Calls PATCH /api/v1/orders/:id/artwork.
   * Result: Returns updated order response.
   */
  updateOrderArtwork(id: string, designFileUrl: string): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`${this.baseUrl}/${id}/artwork`, {
      design_file_url: designFileUrl,
    });
  }
}

