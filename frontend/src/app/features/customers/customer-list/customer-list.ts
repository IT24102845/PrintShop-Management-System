// ============================================================
// CUSTOMER LIST COMPONENT
// Purpose: Controls the Customer List screen.
// UI: Displays and manages customer information.
// Flow: Component -> Frontend Service -> Backend API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * CUSTOMER LIST COMPONENT - STAFF CLIENT DIRECTORY & CRM
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Provides staff with a searchable database of all retail and corporate clients.
 * Facilitates quick contact lookups, account status inspection, and direct
 * linkage to customer-specific order intake.
 * 
 * CORE OPERATIONS:
 * 1. Debounced Searching: Searches across full name, email, phone, and company.
 * 2. Identity Normalization: Unifies disparate ID representations (`customer_id`,
 *    `id`, `user_id`) to ensure smooth routing to customer detail views.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomerService, CustomerProfile } from '../../../core/services/customer.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN = /^(?:0\d{9}|0\d{2}[-\s]?\d{3}[-\s]?\d{4}|0\d{2}[-\s]?\d{7}|\+94\d{9}|\+94[-\s]?\d{2}[-\s]?\d{3}[-\s]?\d{4}|\+[1-9][0-9\s\-]{7,18})$/;
const NAME_PATTERN  = /^[a-zA-Z\s\-'.]{2,100}$/;

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
})
export class CustomerList implements OnInit {
  customers: CustomerProfile[] = [];
  isLoading = true;
  searchTerm = '';
  page = 1;
  limit = 20;
  total = 0;
  totalPages = 0;
  searchTimeout: any;

  // Modal state
  showModal = false;
  isEditing = false;
  editingId: string | null = null;
  isSubmitting = false;

  customerForm: FormGroup;

  constructor(
    private customerService: CustomerService,
    public authService: AuthService,
    private toast: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.customerForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(NAME_PATTERN)]],
      email:     ['', [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(255)]],
      phone:     ['', [Validators.pattern(PHONE_PATTERN), Validators.maxLength(20)]],
      company:   ['', [Validators.maxLength(255)]],
      address:   ['', [Validators.maxLength(500)]],
      notes:     ['', [Validators.maxLength(1000)]],
      password:  ['', [Validators.minLength(6), Validators.maxLength(128)]],
      is_active: [true],
    });
  }

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.customerService.getCustomers(this.page, this.limit, this.searchTerm || undefined).subscribe({
      next: res => {
        try {
          if (res && res.success) {
            const d: any = res.data;
            const rawItems: any[] = Array.isArray(d) ? d : (d?.items ?? []);
            this.customers = rawItems.map((c: any) => ({
              ...c,
              id: c.customer_id || c.id || c.user_id,
              created_at: c.created_at || c.member_since,
            }));
            this.total      = d?.total ?? (res as any).meta?.total ?? this.customers.length;
            this.totalPages = d?.totalPages ?? (res as any).meta?.totalPages ?? 1;
          }
        } catch (e) {
          console.error('Error parsing customer response:', e);
        } finally {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to load customers.');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page = 1;
      this.loadCustomers();
    }, 400);
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadCustomers();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadCustomers();
    }
  }

  get from() { return (this.page - 1) * this.limit + 1; }
  get to()   { return Math.min(this.page * this.limit, this.total); }

  // ─── Modal Management ───────────────────────────────────────────────────────

  openCreateModal() {
    this.isEditing = false;
    this.editingId = null;
    this.customerForm.reset({
      full_name: '',
      email:     '',
      phone:     '',
      company:   '',
      address:   '',
      notes:     '',
      password:  '',
      is_active: true,
    });
    this.showModal = true;
    this.cdr.markForCheck();
  }

  openEditModal(c: CustomerProfile) {
    this.isEditing = true;
    this.editingId = (c.customer_id || c.id) as string;
    this.customerForm.reset({
      full_name: c.full_name || '',
      email:     c.email || '',
      phone:     c.phone || '',
      company:   c.company || '',
      address:   c.address || '',
      notes:     c.notes || '',
      password:  '',
      is_active: c.is_active !== undefined ? c.is_active : true,
    });
    this.showModal = true;
    this.cdr.markForCheck();
  }

  closeModal() {
    this.showModal = false;
    this.editingId = null;
    this.cdr.markForCheck();
  }

  onSubmitModal() {
    this.customerForm.markAllAsTouched();
    this.cdr.detectChanges();

    if (this.customerForm.invalid) {
      this.toast.error('Please fill in all required fields properly.');
      return;
    }

    this.isSubmitting = true;
    const formVal = this.customerForm.value;

    if (this.isEditing && this.editingId) {
      const payload: any = {
        full_name: formVal.full_name.trim(),
        email:     formVal.email.trim().toLowerCase(),
        phone:     formVal.phone ? formVal.phone.trim() : null,
        company:   formVal.company ? formVal.company.trim() : null,
        address:   formVal.address ? formVal.address.trim() : null,
        notes:     formVal.notes ? formVal.notes.trim() : null,
        is_active: Boolean(formVal.is_active),
      };

      this.customerService.updateCustomer(this.editingId, payload).subscribe({
        next: () => {
          this.toast.success('Customer updated successfully!');
          this.closeModal();
          this.isSubmitting = false;
          this.loadCustomers();
        },
        error: err => {
          this.toast.error(err.error?.message || 'Failed to update customer.');
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
      });
    } else {
      const payload: any = {
        full_name: formVal.full_name.trim(),
        email:     formVal.email.trim().toLowerCase(),
        phone:     formVal.phone ? formVal.phone.trim() : undefined,
        company:   formVal.company ? formVal.company.trim() : undefined,
        address:   formVal.address ? formVal.address.trim() : undefined,
        notes:     formVal.notes ? formVal.notes.trim() : undefined,
      };
      if (formVal.password?.trim()) {
        payload.password = formVal.password.trim();
      }

      this.customerService.createCustomer(payload).subscribe({
        next: () => {
          this.toast.success('Customer created successfully!');
          this.closeModal();
          this.isSubmitting = false;
          this.loadCustomers();
        },
        error: err => {
          this.toast.error(err.error?.message || 'Failed to create customer.');
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
      });
    }
  }

  // ─── Delete & Status Operations ─────────────────────────────────────────────

  confirmDelete(c: CustomerProfile) {
    const targetId = c.customer_id || c.id;
    if (!targetId) return;

    const message = `Are you sure you want to delete customer "${c.full_name}"?\n\nNote: If this customer has existing orders or quotes, their account will be deactivated instead to safely preserve business records.`;
    if (!confirm(message)) return;

    this.customerService.deleteCustomer(targetId).subscribe({
      next: res => {
        this.toast.success(res.message || 'Customer deleted or deactivated successfully.');
        this.loadCustomers();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to delete customer.');
      },
    });
  }

  toggleActive(c: CustomerProfile) {
    const targetId = c.customer_id || c.id;
    if (!targetId) return;

    const newStatus = !c.is_active;
    const action = newStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} customer "${c.full_name}"?`)) return;

    this.customerService.updateCustomer(targetId, { is_active: newStatus }).subscribe({
      next: () => {
        this.toast.success(`Customer "${c.full_name}" ${action}d successfully.`);
        this.loadCustomers();
      },
      error: err => {
        this.toast.error(err.error?.message || `Failed to ${action} customer.`);
      },
    });
  }
}

