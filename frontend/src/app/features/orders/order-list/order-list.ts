// ============================================================
// ORDER LIST COMPONENT
// Purpose: Controls the Orders Directory screen.
// UI: Displays and manages order lists, status filtering, and search.
// Flow: Component -> OrderService -> Backend Order API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * ORDER LIST COMPONENT - STAFF WORKFLOW & PIPELINE MANAGEMENT
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Central console for print shop operators, managers, and administrators
 * to monitor and search all orders across the enterprise.
 * 
 * DESIGN HIGHLIGHTS:
 * 1. Debounced Search (400ms): Prevents API throttling when staff type customer
 *    names or order IDs into the search box.
 * 2. Multi-Filter Pipeline: Filters dynamically across 10 service categories and
 *    10 production/lifecycle statuses.
 * 3. Server-Side Pagination: Uses page/limit query parameters to keep network
 *    transfers performant regardless of order history volume.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService, OrderSummary } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

const SERVICE_TYPES = [
  'business_cards','flyers','banners','posters','brochures',
  'stickers','tshirts','signage','packaging','custom',
];

const ORDER_STATUSES = [
  'pending', 'quoted', 'confirmed', 'design_review',
  'in_production', 'quality_check', 'ready', 'delivered', 'cancelled', 'COMPLETED',
];

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StatusBadge],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
/**
 * Staff order directory component managing debounced text search,
 * status and category filtering, and server-side pagination.
 */
export class OrderList implements OnInit {
  orders: any[] = [];
  isLoading = true;
  page = 1;
  limit = 20;
  total = 0;
  totalPages = 0;

  // Filters
  searchTerm    = '';
  statusFilter  = '';
  serviceFilter = '';
  searchTimeout: any;

  readonly serviceTypes = SERVICE_TYPES;
  readonly orderStatuses = ORDER_STATUSES;

  constructor(
    private orderService: OrderService,
    private toast: ToastService,
    public authService: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      if (p['search']) { this.searchTerm = p['search']; }
      this.loadOrders();
    });
  }

  loadOrders() {
    this.isLoading = true;
    this.cdr.markForCheck();
    const filters: any = { page: this.page, limit: this.limit };
    if (this.searchTerm)  filters.search       = this.searchTerm;
    if (this.statusFilter) filters.status       = this.statusFilter;
    if (this.serviceFilter) filters.service_type = this.serviceFilter;

    this.orderService.getAllOrders(filters).subscribe({
      next: res => {
        if (res.success) {
          this.orders     = (res as any).data?.items ?? (res as any).data ?? [];
          this.total      = (res as any).data?.total ?? (res as any).meta?.total ?? this.orders.length;
          this.totalPages = (res as any).data?.totalPages ?? (res as any).meta?.totalPages ?? 1;
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to load orders.');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => { this.page = 1; this.loadOrders(); }, 400);
  }

  onFilterChange() { this.page = 1; this.loadOrders(); }
  prevPage() { if (this.page > 1) { this.page--; this.loadOrders(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.loadOrders(); } }

  get from() { return (this.page - 1) * this.limit + 1; }
  get to()   { return Math.min(this.page * this.limit, this.total); }
}
