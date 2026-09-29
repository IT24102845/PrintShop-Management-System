// ============================================================
// QUOTATION FORM COMPONENT
// Purpose: Controls the New Quotation Creation screen.
// UI: Dedicated standalone form for creating quotations, separate from Orders.
// Flow: Component -> QuotationService -> Backend Quotation API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * QUOTATION FORM COMPONENT - STANDALONE QUOTATION CREATION
 * ============================================================================
 *
 * ARCHITECTURAL CONTEXT:
 * A dedicated staff form for creating new quotations, analogous to OrderForm
 * at /app/orders/new. Keeps quotation creation entirely separate from the
 * orders workflow.
 *
 * CORE RESPONSIBILITIES:
 * 1. Order Selection: Staff pick a pending order from a dropdown (or paste UUID).
 * 2. Pricing Entry: Quoted amount in LKR with validity and optional notes.
 * 3. Submission: POST /api/v1/quotations, then navigate back to /app/quotations.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QuotationService } from '../../../core/services/quotation.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-quotation-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './quotation-form.html',
  styleUrl: './quotation-form.scss',
})
/**
 * Staff quotation creation form component. Provides a full-page form
 * for issuing new price estimates, decoupled from the Orders workflow.
 */
export class QuotationForm implements OnInit {
  form: FormGroup;
  isLoading = false;
  isLoadingOrders = false;
  errorMessage = '';

  orders: any[] = [];
  pendingOrders: any[] = [];
  otherOrders: any[] = [];
  selectedOrder: any = null;
  manualMode = false;

  constructor(
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private orderService: OrderService,
    private toast: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    // Set default validity date to 14 days from today
    const defaultValid = new Date();
    defaultValid.setDate(defaultValid.getDate() + 14);

    this.form = this.fb.group({
      order_id:    ['', Validators.required],
      amount:      [null, [Validators.required, Validators.min(1)]],
      valid_until: [defaultValid.toISOString().split('T')[0]],
      notes:       [''],
    });
  }

  ngOnInit() {
    this.loadAvailableOrders();

    // Pre-fill order_id if navigated from order detail with ?order_id=...
    this.route.queryParams.subscribe(params => {
      if (params['order_id']) {
        this.form.patchValue({ order_id: params['order_id'] });
        if (this.orders.length > 0) {
          this.selectedOrder = this.orders.find(o => o.id === params['order_id']) || null;
        }
      }
    });
  }

  loadAvailableOrders() {
    this.isLoadingOrders = true;
    this.cdr.markForCheck();
    this.orderService.getAllOrders({ limit: 100 }).subscribe({
      next: res => {
        if (res.success) {
          const items: any[] = (res as any).data?.items ?? (res as any).data ?? [];
          this.orders = items;
          this.pendingOrders = items.filter(o =>
            ['pending', 'design_review'].includes((o.status || '').toLowerCase())
          );
          this.otherOrders = items.filter(o =>
            !['pending', 'design_review'].includes((o.status || '').toLowerCase())
          );

          // Resolve pre-filled order_id after orders are loaded
          const currentId = this.form.get('order_id')?.value;
          if (currentId) {
            this.selectedOrder = this.orders.find(o => o.id === currentId) || null;
          }
        }
        this.isLoadingOrders = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingOrders = false;
        this.toast.error('Failed to load orders list.');
        this.cdr.markForCheck();
      },
    });
  }

  onOrderSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    const orderId = select.value;
    this.selectedOrder = this.orders.find(o => o.id === orderId) || null;
    this.form.patchValue({ order_id: orderId });
  }

  setManualMode(val: boolean) {
    this.manualMode = val;
    if (val) {
      this.selectedOrder = null;
    }
    this.cdr.markForCheck();
  }

  get f() { return this.form.controls; }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please complete all required fields.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const val = this.form.value;
    const payload: any = {
      order_id: val.order_id,
      amount: Number(val.amount),
    };
    if (val.valid_until) payload.valid_until = val.valid_until;
    if (val.notes?.trim()) payload.notes = val.notes.trim();

    this.quotationService.create(payload).subscribe({
      next: () => {
        this.toast.success('Quotation created successfully!');
        this.router.navigate(['/app/quotations']);
      },
      error: err => {
        this.errorMessage = err.error?.message || 'Failed to create quotation.';
        this.isLoading = false;
        this.toast.error(this.errorMessage);
        this.cdr.markForCheck();
      },
    });
  }
}
