// ============================================================
// QUOTATION LIST COMPONENT
// Purpose: Controls the Quotations Directory screen.
// UI: Displays pending orders needing quotes + all issued quotations.
// Flow: Component -> QuotationService / OrderService -> Backend APIs
// ============================================================

/**
 * ============================================================================
 * QUOTATION LIST COMPONENT - STAFF PRICING & ESTIMATE MANAGEMENT
 * ============================================================================
 *
 * ARCHITECTURAL CONTEXT:
 * Central staff view for commercial quoting operations. Shows two sections:
 *  1. "Action Required" — pending customer orders that need a quotation issued.
 *  2. Issued Quotations table — all existing quotations with status/amount.
 *
 * CORE RESPONSIBILITIES:
 * 1. Action Panel: Lists orders in 'pending' or 'quoted' status needing a quote.
 * 2. Overview Table: Displays all quotations with amounts, validity, and status.
 * 3. Navigation: "New Quotation" and per-order "Create Quote" buttons.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QuotationService, Quotation } from '../../../core/services/quotation.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-quotation-list',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadge],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Quotations</h1>
          <p>Manage all print job quotations</p>
        </div>
        <div class="page-header-actions">
          <a routerLink="/app/quotations/new" class="btn btn-primary">
            <span class="material-icons-outlined">add</span> New Quotation
          </a>
        </div>
      </div>

      <!-- Action Required: Orders awaiting a quotation -->
      @if (isLoading) {
        <div class="action-card mb-4">
          @for (i of [1,2]; track i) { <div class="skeleton" style="height:52px;border-radius:8px;margin-bottom:0.5rem"></div> }
        </div>
      } @else if (pendingOrders.length > 0) {
        <div class="action-card mb-4">
          <div class="action-card-header">
            <span class="material-icons-outlined action-icon">notification_important</span>
            <div>
              <h3>Action Required — {{ pendingOrders.length }} Order{{ pendingOrders.length > 1 ? 's' : '' }} Need{{ pendingOrders.length === 1 ? 's' : '' }} a Quote</h3>
              <p>These customer orders are waiting for a price estimate to be issued.</p>
            </div>
          </div>
          <div class="action-list">
            @for (order of pendingOrders; track order.id) {
              <div class="action-row">
                <div class="action-order-info">
                  <span class="order-service">{{ (order.service_type || '').replace('_', ' ') | titlecase }}</span>
                  <span class="order-meta">
                    {{ order.quantity }} pcs
                    @if (order.customers?.users?.full_name) { · {{ order.customers.users.full_name }} }
                    @if (order.deadline_date) { · Due {{ order.deadline_date | date:'MMM d' }} }
                  </span>
                  @if (order.description) {
                    <span class="order-desc">"{{ order.description | slice:0:80 }}{{ order.description.length > 80 ? '…' : '' }}"</span>
                  }
                </div>
                <div class="action-row-right">
                  <span class="order-submitted">Submitted {{ order.created_at | date:'MMM d, y' }}</span>
                  <a [routerLink]="['/app/quotations/new']" [queryParams]="{ order_id: order.id }" class="btn btn-primary btn-sm">
                    <span class="material-icons-outlined">add</span> Create Quote
                  </a>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Issued Quotations Table -->
      <div class="table-wrapper">
        @if (isLoading) {
          @for (i of [1,2,3,4,5]; track i) { <div class="skeleton skeleton-row"></div> }
        } @else if (quotations.length === 0) {
          <div class="empty-state">
            <div class="empty-icon"><span class="material-icons-outlined">request_quote</span></div>
            <h3>No quotations issued yet</h3>
            <p>Use the action panel above to create quotations for pending orders.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Valid Until</th>
                <th>Rev</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              @for (q of quotations; track q.id) {
                <tr>
                  <td style="font-family:monospace;font-size:0.8rem">{{ q.id.substring(0,8) }}…</td>
                  <td style="font-family:monospace;font-size:0.8rem">{{ q.order_id.substring(0,8) }}…</td>
                  <td class="text-sm text-muted">
                    {{ q.orders?.customers?.users?.full_name || '—' }}
                  </td>
                  <td class="font-semibold">LKR {{ q.amount | number:'1.2-2' }}</td>
                  <td><app-status-badge [status]="q.status"></app-status-badge></td>
                  <td>{{ q.valid_until ? (q.valid_until | date:'MMM d, y') : '—' }}</td>
                  <td>v{{ q.revision }}</td>
                  <td class="text-muted text-sm">{{ q.created_at | date:'MMM d, y' }}</td>
                </tr>
              }
            </tbody>
          </table>

          @if (totalPages > 1) {
            <div class="pagination">
              <span class="pagination-info">Page {{ page }} of {{ totalPages }}</span>
              <div class="pagination-controls">
                <button class="btn btn-secondary btn-sm" (click)="prevPage()" [disabled]="page===1">
                  <span class="material-icons-outlined">chevron_left</span>
                </button>
                <button class="btn btn-secondary btn-sm" (click)="nextPage()" [disabled]="page===totalPages">
                  <span class="material-icons-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .mb-4 { margin-bottom: 1rem; }

    .action-card {
      border: 1.5px solid #f59e0b;
      border-radius: 10px;
      background: #fffbeb;
      overflow: hidden;
    }
    .action-card-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #fde68a;
      .action-icon { color: #f59e0b; font-size: 1.375rem; margin-top: 0.125rem; flex-shrink: 0; }
      h3 { margin: 0 0 0.2rem; font-size: 0.9375rem; font-weight: 700; color: #92400e; }
      p { margin: 0; font-size: 0.8125rem; color: #b45309; }
    }
    .action-list { padding: 0.375rem 0; }
    .action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid #fde68a;
      &:last-child { border-bottom: none; }
    }
    .action-order-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      flex: 1;
      min-width: 0;
    }
    .order-service {
      font-weight: 700;
      font-size: 0.9rem;
      color: #1e293b;
    }
    .order-meta {
      font-size: 0.78125rem;
      color: #64748b;
    }
    .order-desc {
      font-size: 0.78125rem;
      color: #94a3b8;
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .action-row-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }
    .order-submitted {
      font-size: 0.75rem;
      color: #94a3b8;
      white-space: nowrap;
    }

    .font-semibold { font-weight: 600; }
    .text-sm { font-size: 0.8125rem; }
  `],
})
/**
 * Staff quotation directory. Shows pending orders needing quotes at the top
 * as an actionable panel, followed by the full issued quotations table.
 */
export class QuotationList implements OnInit {
  quotations: Quotation[] = [];
  pendingOrders: any[] = [];

  isLoading = true;
  page = 1;
  totalPages = 1;

  constructor(
    private quotationService: QuotationService,
    private orderService: OrderService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading = true;
    this.cdr.markForCheck();

    forkJoin({
      quotations: this.quotationService.getAll(this.page).pipe(catchError(() => of(null))),
      orders: this.orderService.getAllOrders({ limit: 100, status: 'pending' }).pipe(catchError(() => of(null))),
    }).subscribe({
      next: results => {
        // Load issued quotations
        if (results.quotations?.success) {
          const d: any = (results.quotations as any).data;
          this.quotations = Array.isArray(d) ? d : (d?.items ?? []);
          this.totalPages = d?.totalPages ?? (results.quotations as any).meta?.totalPages ?? 1;
        }

        // Load pending orders needing a quotation
        if (results.orders?.success) {
          const od: any = (results.orders as any).data;
          const allOrders: any[] = Array.isArray(od) ? od : (od?.items ?? []);
          this.pendingOrders = allOrders.filter(o =>
            (o.status || '').toLowerCase() === 'pending'
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

  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.load(); } }
}
