// ============================================================
// DASHBOARD COMPONENT
// Purpose: Controls the Staff & Admin Dashboard screen.
// UI: Displays and manages business overview KPI metrics, quick actions, and alerts.
// Flow: Component -> DashboardService / OrderService -> Backend APIs
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * STAFF / ADMIN DASHBOARD COMPONENT - EXECUTIVE TELEMETRY & OPERATIONS
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Serves as the operational flight deck for internal shop personnel (ADMIN,
 * MANAGER, OPERATOR). Aggregates cross-cutting business data into high-level
 * actionable metric cards and recent order activity tables.
 * 
 * DESIGN DECISIONS & REACTIVE PATTERNS:
 * 1. Synchronized Metric Aggregation (`forkJoin`):
 *    - Concurrently triggers production, inventory, revenue, orders, and customer queries.
 *    - Individual `catchError(() => of(null))` handlers ensure partial degradation
 *      instead of catastrophic UI failure if one sub-service encounters latency.
 *    - Guarantees `isLoading = false` triggers only when ALL streams emit, preventing
 *      premature layout shift.
 * 2. Role-Based Visibility (`computed` signals):
 *    - `isAdminOrManager`: Selectively unlocks financial revenue KPIs for managerial
 *      roles while withholding financial data from general floor operators.
 * ============================================================================
 */

import { Component, OnInit, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { OrderService } from '../../core/services/order.service';
import { CustomerService } from '../../core/services/customer.service';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadge],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
/**
 * Executive and operational staff dashboard coordinating cross-domain metric
 * aggregation, role-based telemetry rendering, and recent workflow activity.
 */
export class Dashboard implements OnInit {
  isLoading = true;
  productionStats: any = null;
  inventoryStats: any = null;
  revenueStats: any = null;
  recentOrders: any[] = [];
  totalOrders = 0;
  totalCustomers = 0;

  isAdminOrManager = computed(() => this.authService.isAdminOrManager());
  userRole = computed(() => this.authService.currentUser()?.role ?? '');
  userName = computed(() => {
    const u = this.authService.currentUser();
    return u?.full_name || u?.email || 'User';
  });

  constructor(
    public authService: AuthService,
    private dashboardService: DashboardService,
    private orderService: OrderService,
    private customerService: CustomerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.loadStats(); }

  loadStats() {
    this.isLoading = true;
    this.cdr.markForCheck();

    // Bug 22 Fix: Use forkJoin to prevent premature isLoading = false
    forkJoin({
      production: this.dashboardService.getProductionStats().pipe(catchError(() => of(null))),
      inventory:  this.dashboardService.getInventoryStats().pipe(catchError(() => of(null))),
      revenue:    this.dashboardService.getRevenueStats().pipe(catchError(() => of(null))),
      orders:     this.orderService.getAllOrders({ page: 1, limit: 10 } as any).pipe(catchError(() => of(null))),
      customers:  this.customerService.getCustomers(1, 1).pipe(catchError(() => of(null))),
    }).subscribe({
      next: (res) => {
        if (res.production?.success) this.productionStats = res.production.data;
        if (res.inventory?.success)  this.inventoryStats  = res.inventory.data;
        if (res.revenue?.success)    this.revenueStats    = res.revenue.data;

        if (res.orders?.success) {
          const d: any = res.orders.data;
          this.recentOrders = Array.isArray(d) ? d : (d?.items ?? []);
          this.totalOrders = d?.total ?? (res.orders as any)?.meta?.total ?? this.recentOrders.length;
        }

        if (res.customers?.success) {
          const c: any = res.customers.data;
          this.totalCustomers = c?.total ?? (res.customers as any)?.meta?.total ?? (Array.isArray(c) ? c.length : 0);
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  getFirstName(): string {
    const name = this.userName();
    return name.split(' ')[0];
  }
}
