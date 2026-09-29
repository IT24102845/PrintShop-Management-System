// ============================================================
// REPORTS VIEW COMPONENT
// Purpose: Controls the Executive Reports & Analytics screen.
// UI: Displays and manages revenue reports, top customers, and production performance.
// Flow: Component -> DashboardService / OrderService -> Backend Reports API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * REPORTS VIEW COMPONENT - BUSINESS INTELLIGENCE & ANALYTICS
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Restricted to managerial personnel (ADMIN, MANAGER). Consolidates multi-domain
 * operational data into executive analytics charts, market share distributions,
 * and throughput statistics.
 * 
 * ANALYTICAL BREAKDOWNS:
 * 1. Financial Velocity: Settled income totals and completed transaction counts.
 * 2. Order Funnel: Relative percentage distribution across lifecycle statuses.
 * 3. Product Popularity: Breakdown of order counts by service type (e.g. banners,
 *    business cards, brochures) to highlight primary revenue drivers.
 * 4. Manufacturing Health: Shopfloor stage bottlenecks (waiting vs printing vs QA).
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrderService } from '../../../core/services/order.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ProductionService } from '../../../core/services/production.service';
import { InventoryService, InventoryItem } from '../../../core/services/inventory.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-reports-view',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadge],
  templateUrl: './reports-view.html',
  styleUrl: './reports-view.scss',
})
/**
 * Executive reporting and analytics console synthesizing multi-domain telemetry
 * into actionable business intelligence distributions and health indicators.
 */
export class ReportsView implements OnInit {
  isLoading = true;

  // Revenue & Transactions
  revenueStats = { totalRevenue: 0, completedPaymentsCount: 0 };

  // Orders Summary
  totalOrders = 0;
  ordersByStatus: { status: string; count: number; percentage: number }[] = [];
  ordersByService: { service: string; count: number; percentage: number }[] = [];

  // Production Summary
  productionStats = {
    waiting: 0,
    printing: 0,
    qualityCheck: 0,
    readyForDelivery: 0,
    completed: 0,
    failed: 0,
  };

  // Inventory Alerts
  lowStockItems: InventoryItem[] = [];

  constructor(
    private orderService: OrderService,
    private paymentService: PaymentService,
    private productionService: ProductionService,
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadReports();
  }

  loadReports() {
    this.isLoading = true;

    forkJoin({
      revenue: this.paymentService.getRevenueStats().pipe(catchError(() => of({ success: false, data: { totalRevenue: 0, completedPaymentsCount: 0 } }))),
      orders: this.orderService.getAllOrders({ limit: 100 }).pipe(catchError(() => of({ success: false, data: [] }))),
      production: this.productionService.getDashboard().pipe(catchError(() => of({ success: false, data: {} as any }))),
      inventory: this.inventoryService.getInventory(1, 100).pipe(catchError(() => of({ success: false, data: [] }))),
    }).subscribe({
      next: ({ revenue, orders, production, inventory }) => {
        // 1. Revenue
        if (revenue.success && revenue.data) {
          this.revenueStats = revenue.data;
        }

        // 2. Orders aggregation
        if (orders.success) {
          const rawList: any[] = (orders as any).data?.items ?? (orders as any).data ?? [];
          this.totalOrders = rawList.length;

          // Group by status
          const statusMap = new Map<string, number>();
          // Group by service
          const serviceMap = new Map<string, number>();

          rawList.forEach(o => {
            const st = o.status || o.order_status || 'pending';
            statusMap.set(st, (statusMap.get(st) || 0) + 1);

            const srv = o.service_type || 'custom';
            serviceMap.set(srv, (serviceMap.get(srv) || 0) + 1);
          });

          this.ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
            status,
            count,
            percentage: this.totalOrders > 0 ? Math.round((count / this.totalOrders) * 100) : 0,
          })).sort((a, b) => b.count - a.count);

          this.ordersByService = Array.from(serviceMap.entries()).map(([service, count]) => ({
            service,
            count,
            percentage: this.totalOrders > 0 ? Math.round((count / this.totalOrders) * 100) : 0,
          })).sort((a, b) => b.count - a.count);
        }

        // 3. Production stats
        if (production.success && production.data) {
          const p: any = production.data;
          this.productionStats = {
            waiting: p.pendingTasks ?? p.queuedTasks ?? 0,
            printing: p.activeProduction ?? p.activeTasks ?? 0,
            qualityCheck: p.qualityCheck ?? 0,
            readyForDelivery: p.readyForDelivery ?? 0,
            completed: p.completedJobs ?? p.completedTasks ?? 0,
            failed: p.failedJobs ?? 0,
          };
        }

        // 4. Inventory low-stock filtering
        if (inventory.success) {
          const rawInv: any[] = (inventory as any).data?.items ?? (inventory as any).data ?? [];
          this.lowStockItems = rawInv.filter(
            item => Number(item.quantity) <= Number(item.minimum_stock_level)
          );
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  printReport() {
    window.print();
  }
}
