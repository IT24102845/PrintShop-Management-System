// ============================================================
// DASHBOARD API SERVICE - FRONTEND
// Purpose: Connects Angular UI with aggregated KPI and analytics backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend dashboard & metrics APIs.
// ============================================================

/**
 * ============================================================================
 * DASHBOARD SERVICE - CROSS-DOMAIN METRIC CONSOLIDATION
 * ============================================================================
 * 
 * ROLE IN ARCHITECTURE:
 * Central data retrieval service that aggregates high-level Operational,
 * Inventory, and Financial Key Performance Indicators (KPIs) for the
 * administrative and management portals.
 * 
 * DESIGN DECISIONS:
 * - Single Responsibility: Exclusively focuses on telemetry and overview stats.
 * - Non-destructive: Performs idempotent HTTP GET calls across multiple
 *   specialized micro-endpoints.
 * - Reactive Composition: Callers can use RxJS `forkJoin` to load all metric
 *   tiles concurrently during dashboard route initialization.
 * ============================================================================
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private http: HttpClient) {}

  /**
   * Fetches real-time production throughput statistics.
   * Aggregates task distribution by status (PENDING, PREPRESS, PRINTING,
   * FINISHING, QUALITY_CHECK, COMPLETED) and active technician workloads.
   *
   * @returns Observable emitting production queue overview data.
   */
  getProductionStats(): Observable<any> {
    return this.http.get('/api/v1/production/dashboard');
  }

  /**
   * Fetches warehouse inventory health metrics.
   * Highlights items below reorder threshold (low stock), total SKU count,
   * and total estimated material valuation.
   *
   * @returns Observable emitting inventory stock health and alerts.
   */
  getInventoryStats(): Observable<any> {
    return this.http.get('/api/v1/inventory/dashboard');
  }

  /**
   * Fetches financial revenue telemetry computed strictly from verified,
   * COMPLETED transactions (cash, card, bank transfer).
   * Excludes unconfirmed invoices, pending quotes, and voided payments.
   *
   * @returns Observable emitting realized revenue breakdowns.
   */
  getRevenueStats(): Observable<any> {
    return this.http.get('/api/v1/payments/revenue-stats');
  }
}
