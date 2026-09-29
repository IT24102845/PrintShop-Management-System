// ============================================================
// PAYMENT LIST COMPONENT
// Purpose: Controls the Payments & Billing screen.
// UI: Displays and manages payment transactions, receipts, and order balance records.
// Flow: Component -> PaymentService -> Backend Payment API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * PAYMENT LIST COMPONENT - FINANCIAL LEDGER & REVENUE SETTLEMENTS
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Restricted to managerial personnel (ADMIN, MANAGER). Acts as the commercial
 * cash-register and audit ledger for all monetary transactions across print jobs.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Financial Ledger: Displays transaction histories across all payment methods
 *    (cash, card, bank transfer, online, cheque, mobile money).
 * 2. Realized Revenue KPI: Inquires `revenueStats` reflecting only successfully
 *    settled (`completed`) payments.
 * 3. Payment Settlement Modal: Implements `paymentForm` with strict validation
 *    (valid UUID, amount > 0.01) to record incoming customer payments.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentService, PaymentRecord, PaymentMethod, PaymentStatus } from '../../../core/services/payment.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, StatusBadge],
  templateUrl: './payment-list.html',
  styleUrl: './payment-list.scss',
})
/**
 * Financial ledger directory component coordinating transaction recording,
 * payment method breakdowns, and realized revenue telemetry.
 */
export class PaymentList implements OnInit {
  payments: any[] = [];
  isLoading = true;
  page = 1;
  limit = 20;
  total = 0;
  totalPages = 1;

  // Stats
  revenueStats = { totalRevenue: 0, completedPaymentsCount: 0 };

  // Filters
  searchTerm = '';
  methodFilter = '';
  statusFilter = '';

  // Record Payment Modal
  showModal = signal(false);
  isSubmitting = false;
  paymentForm: FormGroup;
  orders: any[] = [];
  isLoadingOrders = false;
  manualOrderMode = false;
  selectedOrder: any = null;

  readonly paymentMethods: PaymentMethod[] = [
    'cash', 'bank_transfer', 'card', 'online', 'cheque', 'mobile_money'
  ];

  readonly paymentStatuses: PaymentStatus[] = [
    'completed', 'pending', 'processing', 'failed', 'refunded', 'partially_refunded'
  ];

  constructor(
    private paymentService: PaymentService,
    private orderService: OrderService,
    private toast: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.paymentForm = this.fb.group({
      order_id: ['', [Validators.required, Validators.minLength(36), Validators.maxLength(36)]],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      payment_method: ['cash', Validators.required],
      payment_status: ['completed', Validators.required],
      transaction_ref: [''],
      notes: [''],
    });
  }

  ngOnInit() {
    this.loadStats();
    this.loadPayments();
    this.loadAvailableOrders();
  }

  loadAvailableOrders() {
    this.isLoadingOrders = true;
    this.orderService.getAllOrders({ limit: 100 }).subscribe({
      next: res => {
        if (res.success) {
          this.orders = (res as any).data?.items ?? (res as any).data ?? [];
          const currentId = this.paymentForm.get('order_id')?.value;
          if (currentId) {
            this.selectedOrder = this.orders.find(o => o.id === currentId) || null;
          }
        }
        this.isLoadingOrders = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingOrders = false;
        this.cdr.markForCheck();
      },
    });
  }

  onOrderSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    const orderId = select.value;
    this.selectedOrder = this.orders.find(o => o.id === orderId) || null;
    this.paymentForm.patchValue({ order_id: orderId });
  }

  setManualOrderMode(val: boolean) {
    this.manualOrderMode = val;
    this.cdr.markForCheck();
  }

  loadStats() {
    this.paymentService.getRevenueStats().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.revenueStats = res.data;
          this.cdr.markForCheck();
        }
      },
      error: () => {},
    });
  }

  loadPayments() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.paymentService.getAllPayments(this.page, this.limit).subscribe({
      next: res => {
        if (res.success) {
          const d: any = res.data;
          this.payments = Array.isArray(d) ? d : (d?.items ?? []);
          this.total = d?.total ?? res.meta?.total ?? this.payments.length;
          this.totalPages = d?.totalPages ?? res.meta?.totalPages ?? 1;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to load payments.');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get filteredPayments(): any[] {
    return this.payments.filter(p => {
      if (this.methodFilter && p.payment_method !== this.methodFilter) return false;
      if (this.statusFilter && p.payment_status !== this.statusFilter) return false;
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        const ref = (p.transaction_ref || '').toLowerCase();
        const notes = (p.notes || '').toLowerCase();
        const orderId = (p.order_id || '').toLowerCase();
        const custName = (p.orders?.customers?.users?.full_name || '').toLowerCase();
        if (!ref.includes(term) && !notes.includes(term) && !orderId.includes(term) && !custName.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }

  openRecordModal(orderId?: string) {
    if (this.orders.length === 0) {
      this.loadAvailableOrders();
    }
    this.manualOrderMode = false;
    this.selectedOrder = orderId ? (this.orders.find(o => o.id === orderId) || null) : null;
    this.paymentForm.reset({
      order_id: orderId || '',
      amount: null,
      payment_method: 'cash',
      payment_status: 'completed',
      transaction_ref: '',
      notes: '',
    });
    this.showModal.set(true);
  }

  onSubmit() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const val = this.paymentForm.value;

    this.paymentService.recordPayment({
      order_id: val.order_id.trim(),
      amount: Number(val.amount),
      payment_method: val.payment_method,
      payment_status: val.payment_status,
      transaction_ref: val.transaction_ref || undefined,
      notes: val.notes || undefined,
    }).subscribe({
      next: res => {
        if (res.success) {
          this.toast.success(`Payment of LKR ${Number(val.amount).toLocaleString()} recorded!`);
          this.showModal.set(false);
          this.isSubmitting = false;
          this.loadStats();
          this.loadPayments();
        }
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to record payment.');
        this.isSubmitting = false;
      },
    });
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadPayments();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadPayments();
    }
  }
}
