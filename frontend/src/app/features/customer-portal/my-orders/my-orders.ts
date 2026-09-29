// ============================================================
// CUSTOMER MY ORDERS COMPONENT
// Purpose: Controls the Customer Order History screen.
// UI: Displays and manages customer personal orders, status progression, and tracking.
// Flow: Component -> OrderService -> Backend Order API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * MY ORDERS COMPONENT - CUSTOMER ORDER PORTFOLIO
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Provides the authenticated customer with an interactive tracking dashboard
 * of all personal print requests submitted through the portal.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Paginated Order Fetching: Interacts with GET `/api/v1/orders/my-orders`.
 * 2. Client-Side Filtering: Instant substring searching (Order ID, service, description)
 *    and categorical filtering across the 9 lifecycle statuses.
 * 3. Navigation Anchor: Deep links into `OrderDetail` for complete history,
 *    linked quotations, artwork proof statuses, and invoice totals.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

const ORDER_STATUSES = [
  'pending', 'quoted', 'confirmed', 'design_review',
  'in_production', 'quality_check', 'ready', 'delivered', 'cancelled'
];

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StatusBadge],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-left">
          <h1>My Orders</h1>
          <p>Track and manage your print orders</p>
        </div>
        <div class="page-header-actions">
          <a routerLink="/customer/orders/new" class="btn btn-portal">
            <span class="material-icons-outlined">add</span> Place New Order
          </a>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="card toolbar-card mb-4">
        <div class="toolbar-wrapper">
          <div class="search-box">
            <span class="material-icons-outlined search-icon">search</span>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Search by order ID or description..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onFilterChange()"
            />
          </div>
          <div class="filter-group">
            <select class="form-control filter-select" [(ngModel)]="statusFilter" (change)="onFilterChange()">
              <option value="">All Statuses</option>
              @for (st of orderStatuses; track st) {
                <option [value]="st">{{ st.replace('_', ' ') | titlecase }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Content -->
      @if (isLoading) {
        <div class="card p-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="skeleton-row mb-3">
              <div class="skeleton" style="height:20px;width:25%"></div>
              <div class="skeleton" style="height:20px;width:15%"></div>
              <div class="skeleton" style="height:20px;width:10%"></div>
              <div class="skeleton" style="height:20px;width:15%"></div>
            </div>
          }
        </div>
      } @else if (filteredOrders.length === 0) {
        <div class="card empty-card text-center">
          <div class="empty-icon-wrap">
            <span class="material-icons-outlined empty-icon">receipt_long</span>
          </div>
          <h3>No Orders Found</h3>
          <p class="text-muted mb-4">
            {{ searchTerm || statusFilter ? 'No orders match your filter criteria.' : "You haven't placed any print orders yet." }}
          </p>
          <a routerLink="/customer/orders/new" class="btn btn-portal">
            <span class="material-icons-outlined">add</span> Create First Order
          </a>
        </div>
      } @else {
        <div class="card table-card">
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Service</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Created</th>
                  <th style="text-align:right">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (order of filteredOrders; track (order.id || order.order_id)) {
                  <tr>
                    <td>
                      <span class="order-id-badge">{{ (order.id || order.order_id)?.substring(0, 8) }}…</span>
                    </td>
                    <td>
                      <div class="service-cell">
                        <span class="service-name">{{ (order.service_type || '').replace('_', ' ') | titlecase }}</span>
                        @if (order.description) {
                          <span class="service-desc text-muted">{{ order.description }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="qty-pill">{{ order.quantity }}</span>
                    </td>
                    <td>
                      <app-status-badge [status]="order.status || order.order_status"></app-status-badge>
                    </td>
                    <td class="text-muted">
                      {{ order.deadline_date ? (order.deadline_date | date:'mediumDate') : '—' }}
                    </td>
                    <td class="text-muted text-sm">
                      {{ (order.created_at || order.order_date) | date:'MMM d, y' }}
                    </td>
                    <td style="text-align:right">
                      <a [routerLink]="'/customer/orders/' + (order.id || order.order_id)" class="btn btn-secondary btn-sm">
                        <span>Details</span>
                        <span class="material-icons-outlined" style="font-size:1rem;margin-left:2px">chevron_right</span>
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (totalPages > 1) {
            <div class="pagination-footer">
              <span class="text-sm text-muted">Page {{ page }} of {{ totalPages }} ({{ total }} total)</span>
              <div class="pagination-buttons">
                <button class="btn btn-ghost btn-sm" [disabled]="page === 1" (click)="prevPage()">Previous</button>
                <button class="btn btn-ghost btn-sm" [disabled]="page === totalPages" (click)="nextPage()">Next</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .toolbar-wrapper {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .search-box {
      position: relative;
      flex: 1;
      min-width: 240px;
    }
    .search-icon {
      position: absolute;
      left: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 1.25rem;
      pointer-events: none;
    }
    .search-input {
      padding-left: 2.5rem;
    }
    .filter-group {
      width: 200px;
    }
    .order-id-badge {
      font-family: monospace;
      font-weight: 600;
      color: var(--portal-color);
      background: rgba(14, 165, 233, 0.08);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
    }
    .service-cell {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .service-name {
      font-weight: 600;
      color: var(--text-main);
    }
    .service-desc {
      font-size: 0.75rem;
      max-width: 260px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .qty-pill {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-main);
    }
    .empty-card {
      padding: 4rem 2rem;
    }
    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(14, 165, 233, 0.1);
      color: var(--portal-color);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .empty-icon {
      font-size: 2.25rem;
    }
    .pagination-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border-color);
    }
    .skeleton-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
  `],
})
/**
 * Customer order history component managing pagination, multi-criteria
 * client-side search, status badge mapping, and order detail navigation.
 */
export class MyOrders implements OnInit {
  orders: any[] = [];
  filteredOrders: any[] = [];
  isLoading = true;
  page = 1;
  limit = 20;
  total = 0;
  totalPages = 1;

  searchTerm = '';
  statusFilter = '';

  readonly orderStatuses = ORDER_STATUSES;

  constructor(
    private orderService: OrderService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.orderService.getMyOrders(this.page, this.limit).subscribe({
      next: res => {
        if (res.success) {
          this.orders = (res as any).data?.items ?? (res as any).data ?? [];
          this.total = (res as any).data?.total ?? (res as any).meta?.total ?? this.orders.length;
          this.totalPages = (res as any).data?.totalPages ?? (res as any).meta?.totalPages ?? 1;
          this.applyFilters();
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to load your orders.');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.orders];
    if (this.statusFilter) {
      result = result.filter(o => (o.status || o.order_status) === this.statusFilter);
    }
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      result = result.filter(o =>
        (o.id || o.order_id || '').toLowerCase().includes(q) ||
        (o.service_type || '').toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q)
      );
    }
    this.filteredOrders = result;
    this.cdr.markForCheck();
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadOrders();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadOrders();
    }
  }
}
