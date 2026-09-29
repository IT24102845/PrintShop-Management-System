// ============================================================
// CUSTOMER MY QUOTATIONS COMPONENT
// Purpose: Controls the Customer Quotations screen.
// UI: Displays price quotations issued by staff AND pending order requests awaiting a quote.
// Flow: Component -> QuotationService / OrderService -> Backend APIs
// ============================================================

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QuotationService, Quotation } from '../../../core/services/quotation.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

type QuotationTab = 'all' | 'pending' | 'review' | 'history';

@Component({
  selector: 'app-my-quotations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StatusBadge],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-left">
          <h1>My Quotations</h1>
          <p>Track quotation requests and approve or decline formal price estimates</p>
        </div>
        <div class="page-header-actions">
          <a routerLink="/customer/quotations/new" class="btn btn-portal btn-sm">
            <span class="material-icons-outlined">add</span> Request a Quotation
          </a>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="quotations-tabs mb-4">
        <button
          class="tab-btn"
          [class.active]="activeTab === 'all'"
          (click)="setTab('all')"
        >
          All Requests & Quotes
          <span class="tab-count">{{ totalCount }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab === 'pending'"
          (click)="setTab('pending')"
        >
          <span class="tab-dot dot-pending" *ngIf="pendingCount > 0"></span>
          Awaiting Quote
          <span class="tab-count">{{ pendingCount }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab === 'review'"
          (click)="setTab('review')"
        >
          <span class="tab-dot dot-action" *ngIf="reviewCount > 0"></span>
          Ready for Review
          <span class="tab-count">{{ reviewCount }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab === 'history'"
          (click)="setTab('history')"
        >
          History
          <span class="tab-count">{{ historyCount }}</span>
        </button>
      </div>

      <!-- Content -->
      @if (isLoading) {
        <div class="card p-4">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton mb-3" style="height: 60px; border-radius: var(--radius-md)"></div>
          }
        </div>
      } @else {

        <!-- Empty state when no requests and no quotes exist anywhere -->
        @if (totalCount === 0) {
          <div class="card empty-card text-center">
            <div class="empty-icon-wrap">
              <span class="material-icons-outlined empty-icon">request_quote</span>
            </div>
            <h3>No Quotations Yet</h3>
            <p class="text-muted mb-4">
              You haven't requested any price quotations. Submit your job specifications to receive a formal price estimate.
            </p>
            <a routerLink="/customer/quotations/new" class="btn btn-portal">
              <span class="material-icons-outlined">request_quote</span> Request a Quotation
            </a>
          </div>
        } @else {

          <!-- SECTION 1: Pending Quotation Requests (Awaiting Estimate from Staff) -->
          @if ((activeTab === 'all' || activeTab === 'pending') && pendingOrders.length > 0) {
            <div class="section-container mb-5">
              <div class="section-heading">
                <div class="heading-left">
                  <span class="material-icons-outlined heading-icon warning">hourglass_top</span>
                  <div>
                    <h2>Quotation Requests Submitted</h2>
                    <p class="text-muted text-sm">
                      {{ pendingOrders.length }} request{{ pendingOrders.length > 1 ? 's' : '' }} submitted — our team is calculating your price estimate.
                    </p>
                  </div>
                </div>
              </div>

              <div class="requests-grid">
                @for (order of pendingOrders; track order.id) {
                  <div class="card pending-quote-card">
                    <div class="pending-card-header">
                      <div class="header-left">
                        <span class="request-id">Request #{{ order.id.substring(0, 8) }}</span>
                        <h3 class="request-title">{{ (order.service_type || '').replace('_', ' ') | titlecase }}</h3>
                      </div>
                      <span class="badge-awaiting">
                        <span class="material-icons-outlined badge-icon">schedule</span>
                        Awaiting Estimate
                      </span>
                    </div>

                    <div class="pending-card-body">
                      <div class="specs-grid">
                        <div class="spec-item">
                          <span class="spec-label">Quantity</span>
                          <span class="spec-val">{{ order.quantity }} pcs</span>
                        </div>
                        @if (order.size) {
                          <div class="spec-item">
                            <span class="spec-label">Dimensions</span>
                            <span class="spec-val">{{ order.size }}</span>
                          </div>
                        }
                        @if (order.material) {
                          <div class="spec-item">
                            <span class="spec-label">Material</span>
                            <span class="spec-val">{{ order.material }}</span>
                          </div>
                        }
                        @if (order.colour) {
                          <div class="spec-item">
                            <span class="spec-label">Colour</span>
                            <span class="spec-val">{{ order.colour }}</span>
                          </div>
                        }
                      </div>

                      @if (order.description) {
                        <p class="request-desc">"{{ order.description }}"</p>
                      }

                      <div class="status-explanation">
                        <span class="material-icons-outlined info-icon">info</span>
                        <span>Request submitted on {{ order.created_at | date:'mediumDate' }}. Our team will issue a formal price quote here shortly.</span>
                      </div>
                    </div>

                    <div class="pending-card-footer">
                      <span class="text-xs text-muted">Submitted {{ order.created_at | date:'mediumDate' }}</span>
                      <a [routerLink]="'/customer/orders/' + order.id" class="btn btn-ghost btn-sm">
                        View Request Specs
                      </a>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- SECTION 2: Formal Issued Quotations -->
          @if ((activeTab === 'all' || activeTab === 'review' || activeTab === 'history') && filteredQuotations.length > 0) {
            <div class="section-container">
              <div class="section-heading" *ngIf="activeTab === 'all'">
                <div class="heading-left">
                  <span class="material-icons-outlined heading-icon primary">receipt_long</span>
                  <div>
                    <h2>Official Price Estimates</h2>
                    <p class="text-muted text-sm">Review detailed pricing and sign off on approvals</p>
                  </div>
                </div>
              </div>

              <div class="quotes-grid">
                @for (quote of filteredQuotations; track quote.id) {
                  <div class="card quote-card" [class.highlight]="quote.status === 'sent'">
                    <div class="quote-header">
                      <div>
                        <span class="quote-number">Quote #{{ quote.id.substring(0, 8) }}</span>
                        <div class="quote-order-meta">
                          @if (quote.orders) {
                            <span>Job: {{ quote.orders.service_type?.replace('_', ' ') | titlecase }} ({{ quote.orders.quantity }} pcs)</span>
                          } @else {
                            <span>Reference: {{ quote.order_id.substring(0, 8) }}…</span>
                          }
                        </div>
                      </div>
                      <app-status-badge [status]="quote.status"></app-status-badge>
                    </div>

                    <div class="quote-body">
                      <div class="quote-amount-box">
                        <span class="amount-label">Quoted Price</span>
                        <span class="amount-val">{{ quote.amount | currency:'LKR ':'symbol':'1.2-2' }}</span>
                      </div>

                      @if (quote.notes) {
                        <div class="quote-notes">
                          <span class="material-icons-outlined notes-icon">info</span>
                          <p>{{ quote.notes }}</p>
                        </div>
                      }

                      <div class="quote-details-list">
                        <div class="detail-row">
                          <span class="text-muted">Revision:</span>
                          <span>v{{ quote.revision || 1 }}</span>
                        </div>
                        <div class="detail-row">
                          <span class="text-muted">Issued Date:</span>
                          <span>{{ quote.created_at | date:'mediumDate' }}</span>
                        </div>
                        @if (quote.valid_until) {
                          <div class="detail-row">
                            <span class="text-muted">Valid Until:</span>
                            <span [class.text-danger]="isExpired(quote.valid_until)">
                              {{ quote.valid_until | date:'mediumDate' }}
                            </span>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Action Bar for Customer -->
                    <div class="quote-footer">
                      @if (quote.status === 'sent') {
                        <div class="action-buttons">
                          <button
                            class="btn btn-danger btn-sm"
                            [disabled]="respondingId === quote.id"
                            (click)="respond(quote, 'rejected')"
                          >
                            <span class="material-icons-outlined">close</span> Decline
                          </button>
                          <button
                            class="btn btn-success btn-sm"
                            [disabled]="respondingId === quote.id"
                            (click)="respond(quote, 'accepted')"
                          >
                            <span class="material-icons-outlined">check</span> Accept Quote
                          </button>
                        </div>
                      } @else if (quote.status === 'accepted') {
                        <div class="status-notice success">
                          <span class="material-icons-outlined">check_circle</span> You accepted this quotation
                        </div>
                      } @else if (quote.status === 'rejected') {
                        <div class="status-notice danger">
                          <span class="material-icons-outlined">cancel</span> You declined this quotation
                        </div>
                      } @else {
                        <div class="status-notice muted">
                          <span class="material-icons-outlined">schedule</span> Under review
                        </div>
                      }

                      <a [routerLink]="'/customer/orders/' + quote.order_id" class="btn btn-ghost btn-sm">
                        View Order
                      </a>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Empty state when active tab has no results -->
          @if (activeTab === 'pending' && pendingOrders.length === 0) {
            <div class="card empty-card text-center">
              <span class="material-icons-outlined text-muted" style="font-size: 2.5rem; margin-bottom: 0.5rem">check_circle</span>
              <h3>No Pending Quotation Requests</h3>
              <p class="text-muted">All your submitted print requests have been priced or processed.</p>
            </div>
          } @else if (activeTab === 'review' && reviewCount === 0) {
            <div class="card empty-card text-center">
              <span class="material-icons-outlined text-muted" style="font-size: 2.5rem; margin-bottom: 0.5rem">done_all</span>
              <h3>No Quotes Ready for Review</h3>
              <p class="text-muted">You have no formal price quotes awaiting your approval right now.</p>
            </div>
          } @else if (activeTab === 'history' && historyCount === 0) {
            <div class="card empty-card text-center">
              <span class="material-icons-outlined text-muted" style="font-size: 2.5rem; margin-bottom: 0.5rem">history</span>
              <h3>No Past Quotation History</h3>
              <p class="text-muted">Past accepted or declined quotations will appear here.</p>
            </div>
          }

        }
      }
    </div>
  `,
  styles: [`
    .mb-4 { margin-bottom: 1.25rem; }
    .mb-5 { margin-bottom: 2rem; }

    /* Tabs Bar */
    .quotations-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.25rem;
      overflow-x: auto;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      &:hover {
        color: var(--text-main);
      }
      &.active {
        color: var(--portal-color);
        border-bottom-color: var(--portal-color);
      }
    }
    .tab-count {
      padding: 0.125rem 0.45rem;
      background: rgba(100, 116, 139, 0.12);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .tab-btn.active .tab-count {
      background: rgba(14, 165, 233, 0.15);
      color: var(--portal-color);
    }
    .tab-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      &.dot-pending { background: #f59e0b; }
      &.dot-action { background: #10b981; }
    }

    /* Section Headings */
    .section-heading {
      margin-bottom: 1.25rem;
    }
    .heading-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      h2 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text-main);
      }
      p { margin: 0.2rem 0 0; }
    }
    .heading-icon {
      font-size: 1.5rem;
      &.warning { color: #f59e0b; }
      &.primary { color: var(--portal-color); }
    }

    /* Requests Grid (Pending Requests Cards) */
    .requests-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }
    .pending-quote-card {
      border-left: 4px solid #f59e0b;
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-lg);
      transition: all 0.2s ease;
      &:hover {
        box-shadow: var(--shadow-md);
      }
    }
    .pending-card-header {
      padding: 1.125rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .request-id {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.15rem;
    }
    .request-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .badge-awaiting {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.625rem;
      background: #fef3c7;
      color: #b45309;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      .badge-icon { font-size: 0.875rem; }
    }

    .pending-card-body {
      padding: 1.25rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.625rem;
      background: var(--bg-main);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
    }
    .spec-item {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .spec-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .spec-val {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .request-desc {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text-main);
      font-style: italic;
      line-height: 1.4;
      background: #fafbfc;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px dashed var(--border-color);
    }
    .status-explanation {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.78125rem;
      color: #92400e;
      background: #fffbeb;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid #fde68a;
      .info-icon { font-size: 1rem; flex-shrink: 0; margin-top: 0.05rem; }
    }

    .pending-card-footer {
      padding: 0.875rem 1.25rem;
      border-top: 1px solid var(--border-color);
      background: #fafbfc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }

    /* Quotes Grid */
    .quotes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }
    .quote-card {
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-lg);
      transition: all 0.2s ease;
      &.highlight {
        border-color: var(--portal-color);
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);
      }
    }
    .quote-header {
      padding: 1.25rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .quote-number {
      font-weight: 700;
      font-size: 1rem;
      color: var(--text-main);
      display: block;
    }
    .quote-order-meta {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }
    .quote-body {
      padding: 1.25rem;
      flex: 1;
    }
    .quote-amount-box {
      background: var(--bg-main);
      border-radius: var(--radius-md);
      padding: 1rem;
      text-align: center;
      margin-bottom: 1rem;
    }
    .amount-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      display: block;
      margin-bottom: 0.25rem;
    }
    .amount-val {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--portal-color);
    }
    .quote-notes {
      display: flex;
      gap: 0.5rem;
      background: rgba(245, 158, 11, 0.08);
      border-left: 3px solid var(--warning-color);
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: var(--text-main);
      .notes-icon { color: var(--warning-color); font-size: 1.125rem; flex-shrink: 0; }
      p { margin: 0; }
    }
    .quote-details-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
    }
    .quote-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border-color);
      background: #fafbfc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }
    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }
    .status-notice {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      .material-icons-outlined { font-size: 1.125rem; }
      &.success { color: var(--success-color); }
      &.danger { color: var(--danger-color); }
      &.muted { color: var(--text-muted); }
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
    .empty-icon { font-size: 2.25rem; }
  `],
})
export class MyQuotations implements OnInit {
  quotations: Quotation[] = [];
  pendingOrders: any[] = [];
  isLoading = true;
  respondingId: string | null = null;
  activeTab: QuotationTab = 'all';

  constructor(
    private quotationService: QuotationService,
    private orderService: OrderService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadAll();
  }

  setTab(tab: QuotationTab) {
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  get totalCount(): number {
    return this.quotations.length + this.pendingOrders.length;
  }

  get pendingCount(): number {
    return this.pendingOrders.length;
  }

  get reviewCount(): number {
    return this.quotations.filter(q => q.status === 'sent').length;
  }

  get historyCount(): number {
    return this.quotations.filter(q => ['accepted', 'rejected', 'expired'].includes(q.status)).length;
  }

  get filteredQuotations(): Quotation[] {
    if (this.activeTab === 'review') {
      return this.quotations.filter(q => q.status === 'sent');
    }
    if (this.activeTab === 'history') {
      return this.quotations.filter(q => ['accepted', 'rejected', 'expired'].includes(q.status));
    }
    return this.quotations;
  }

  loadAll() {
    this.isLoading = true;
    this.cdr.markForCheck();

    forkJoin({
      quotations: this.quotationService.getMyQuotations().pipe(catchError(() => of(null))),
      orders: this.orderService.getMyOrders(1, 50).pipe(catchError(() => of(null))),
    }).subscribe({
      next: results => {
        // Load staff-issued quotations
        if (results.quotations?.success) {
          const d = (results.quotations as any).data;
          if (Array.isArray(d)) {
            this.quotations = d;
          } else if (d?.items) {
            this.quotations = d.items;
          } else {
            this.quotations = [];
          }
        }

        // Load pending orders (awaiting a quotation from staff)
        if (results.orders?.success) {
          const od = (results.orders as any).data;
          const allOrders: any[] = Array.isArray(od) ? od : (od?.items ?? []);
          // Show orders that are still in 'pending' status or 'quoted' without quotation row
          this.pendingOrders = allOrders.filter(o =>
            (o.status || '').toLowerCase() === 'pending' ||
            ((o.status || '').toLowerCase() === 'quoted' && (!o.quotations || o.quotations.length === 0))
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

  respond(quote: Quotation, status: 'accepted' | 'rejected') {
    this.respondingId = quote.id;
    this.cdr.markForCheck();
    this.quotationService.respond(quote.id, status).subscribe({
      next: res => {
        quote.status = status;
        this.respondingId = null;
        if (status === 'accepted') {
          this.toast.success('Quotation accepted! Your order is being processed.');
        } else {
          this.toast.info('Quotation declined.');
        }
        this.cdr.markForCheck();
      },
      error: err => {
        this.respondingId = null;
        this.toast.error(err.error?.message || 'Failed to update quotation response.');
        this.cdr.markForCheck();
      },
    });
  }

  isExpired(dateStr: string): boolean {
    return new Date(dateStr).getTime() < Date.now();
  }
}
