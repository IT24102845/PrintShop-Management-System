// ============================================================
// CUSTOMER DETAILS COMPONENT
// Purpose: Controls the Customer Details screen.
// UI: Displays and manages individual customer profile, contact, and history.
// Flow: Component -> CustomerService -> Backend Customer API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomerService, CustomerProfile } from '../../../core/services/customer.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

@Component({
  selector: 'app-customer-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './customer-details.html',
  styleUrl: './customer-details.scss',
})
export class CustomerDetails implements OnInit {
  customerId = '';
  customer: CustomerProfile | null = null;
  isLoading = true;
  isSubmitting = false;

  // Edit Modal
  showEditModal = false;
  editForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    public authService: AuthService,
    private toast: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.editForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      email:     ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
      phone:     [''],
      company:   [''],
      address:   [''],
      notes:     [''],
      is_active: [true],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.customerId = id;
      this.loadCustomerDetails();
    } else {
      this.toast.error('Invalid customer ID');
      this.router.navigate(['/app/customers']);
    }
  }

  loadCustomerDetails(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.customerService.getCustomerById(this.customerId).subscribe({
      next: res => {
        if (res && res.success) {
          this.customer = res.data;
        } else {
          this.toast.error('Failed to load customer information.');
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Customer not found.');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openEditModal(): void {
    if (!this.customer) return;

    this.editForm.reset({
      full_name: this.customer.full_name || '',
      email:     this.customer.email || '',
      phone:     this.customer.phone || '',
      company:   this.customer.company || '',
      address:   this.customer.address || '',
      notes:     this.customer.notes || '',
      is_active: this.customer.is_active !== undefined ? this.customer.is_active : true,
    });

    this.showEditModal = true;
    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.cdr.markForCheck();
  }

  onSubmitEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toast.error('Please fix the validation errors.');
      return;
    }

    this.isSubmitting = true;
    const val = this.editForm.value;

    const payload: any = {
      full_name: val.full_name.trim(),
      email:     val.email.trim().toLowerCase(),
      phone:     val.phone ? val.phone.trim() : null,
      company:   val.company ? val.company.trim() : null,
      address:   val.address ? val.address.trim() : null,
      notes:     val.notes ? val.notes.trim() : null,
      is_active: Boolean(val.is_active),
    };

    this.customerService.updateCustomer(this.customerId, payload).subscribe({
      next: res => {
        this.toast.success('Customer updated successfully!');
        if (res && res.data) {
          this.customer = {
            ...this.customer,
            ...res.data,
          };
        }
        this.closeEditModal();
        this.isSubmitting = false;
        this.loadCustomerDetails();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to update customer.');
        this.isSubmitting = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleActive(): void {
    if (!this.customer) return;

    const newStatus = !this.customer.is_active;
    const action = newStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} this customer?`)) return;

    this.customerService.updateCustomer(this.customerId, { is_active: newStatus }).subscribe({
      next: () => {
        this.toast.success(`Customer ${action}d successfully.`);
        this.loadCustomerDetails();
      },
      error: err => {
        this.toast.error(err.error?.message || `Failed to ${action} customer.`);
      },
    });
  }

  confirmDelete(): void {
    if (!this.customer) return;

    const message = `Are you sure you want to delete customer "${this.customer.full_name}"?\n\nNote: If this customer has existing orders or quotes, their account will be deactivated instead to safely preserve business records.`;
    if (!confirm(message)) return;

    this.customerService.deleteCustomer(this.customerId).subscribe({
      next: res => {
        this.toast.success(res.message || 'Customer deleted or deactivated successfully.');
        this.router.navigate(['/app/customers']);
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to delete customer.');
      },
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'ready':
        return 'badge-success';
      case 'in_production':
      case 'design_review':
      case 'quality_check':
        return 'badge-primary';
      case 'quoted':
      case 'confirmed':
        return 'badge-info';
      case 'cancelled':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }
}

