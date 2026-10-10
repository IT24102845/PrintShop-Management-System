// ============================================================
// ORDER FORM COMPONENT
// Purpose: Controls the New Order Creation & Walk-in intake screen.
// UI: Displays and manages print job intake parameters and customer selector.
// Flow: Component -> OrderService -> Backend Order API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * ORDER FORM COMPONENT - STAFF INTAKE & COUNTER ORDER CREATION
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Provides staff operators with a fast order creation interface for walk-in
 * counter customers or phone orders.
 * 
 * ARCHITECTURAL DIFFERENTIATION:
 * Unlike customer self-service order placement (`CreateOrder` in customer-portal),
 * this staff form:
 * 1. Requires customer selection (`customer_id` is mandatory for staff).
 * 2. Fetches customer directory via `CustomerService.getCustomers()` with
 *    auto-complete dropdown binding.
 * 3. Can be used for immediate order entry and assignment.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { CustomerService, CustomerProfile } from '../../../core/services/customer.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { FileUpload } from '../../../shared/components/file-upload/file-upload';

const SERVICE_TYPES = [
  'business_cards','flyers','banners','posters','brochures',
  'stickers','tshirts','signage','packaging','custom',
];

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FileUpload],
  templateUrl: './order-form.html',
  styleUrl: './order-form.scss',
})
/**
 * Staff counter order entry form component managing customer assignment,
 * specification validation, artwork attachment, and submission.
 */
export class OrderForm implements OnInit {
  form: FormGroup;
  isLoading = false;
  errorMessage = '';
  customers: CustomerProfile[] = [];
  loadingCustomers = false;
  designFileUrl = '';

  readonly serviceTypes = SERVICE_TYPES;
  readonly isStaff: boolean;

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private customerService: CustomerService,
    public authService: AuthService,
    private router: Router,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.isStaff = authService.isStaff();
    this.form = this.fb.group({
      customer_id:   [null],       // staff only
      service_type:  ['', Validators.required],
      description:   ['', [Validators.required, Validators.minLength(10)]],
      size:          [''],
      quantity:      [1, [Validators.required, Validators.min(1)]],
      colour:        [''],
      material:      [''],
      deadline_date: [''],
      special_notes: [''],
    });

    if (this.isStaff) {
      this.form.get('customer_id')?.setValidators(Validators.required);
    }
  }

  ngOnInit() {
    if (this.isStaff) { this.loadCustomers(); }
  }

  loadCustomers() {
    this.loadingCustomers = true;
    this.cdr.markForCheck();
    this.customerService.getCustomers(1, 200).subscribe({
      next: res => {
        if (res.success) {
          const d: any = res.data;
          const rawItems = Array.isArray(d) ? d : (d?.items ?? []);
          this.customers = rawItems.map((c: any) => ({
            ...c,
            id: c.customer_id || c.id || c.user_id,
          }));
        }
        this.loadingCustomers = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.loadingCustomers = false;
        this.toast.error('Failed to load customer directory.');
        this.cdr.markForCheck();
      },
    });
  }


  get f() { return this.form.controls; }

  onFileUploaded(url: string) {
    this.designFileUrl = url;
    this.toast.info('Design file uploaded.');
  }

  onSubmit() {
    this.form.markAllAsTouched();
    this.cdr.detectChanges();

    if (this.form.invalid) {
      this.toast.error('Please complete all required fields before submitting.');
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const payload: any = {
      ...this.form.value,
      quantity: Number(this.form.value.quantity),
    };
    if (this.designFileUrl) payload.design_file_url = this.designFileUrl;

    // Remove empty optional fields
    Object.keys(payload).forEach(k => {
      if (payload[k] === '' || payload[k] === null || payload[k] === undefined) {
        delete payload[k];
      }
    });

    const request$ = this.isStaff
      ? this.orderService.createOrderForStaff(payload)
      : this.orderService.createOrder(payload);

    request$.subscribe({
      next: (res: any) => {
        this.toast.success('Order created successfully!');
        const orderId = res.data?.id;
        const target = orderId
          ? (this.isStaff ? `/app/orders/${orderId}` : `/customer/orders/${orderId}`)
          : (this.isStaff ? '/app/orders' : '/customer/orders');
        this.router.navigate([target]);
      },
      error: err => {
        this.errorMessage = err.error?.message || err.message || 'Failed to create order.';
        this.isLoading = false;
        this.toast.error(this.errorMessage);
        this.cdr.markForCheck();
      },
    });
  }
}
