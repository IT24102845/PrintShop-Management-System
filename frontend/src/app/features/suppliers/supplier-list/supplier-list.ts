// ============================================================
// SUPPLIER LIST COMPONENT
// Purpose: Controls the Suppliers Directory screen.
// UI: Displays and manages vendor contacts, material categories, and supplier records.
// Flow: Component -> SupplierService -> Backend Supplier API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * SUPPLIER LIST COMPONENT - VENDOR RELATIONS & PROCUREMENT DIRECTORY
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Restricted to managerial staff (ADMIN, MANAGER). Manages external vendor
 * relationships, substrate suppliers, equipment maintenance contractors,
 * and commercial credit/payment terms.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Vendor Directory: Debounced search and paginated listing of active suppliers.
 * 2. Unified Create/Edit Modal: Employs Angular Signals (`showModal`, `isEditing`)
 *    and Reactive Forms (`supplierForm`) for seamless CRUD workflows.
 * 3. Relational Safety: Protects supply-chain references; deletions use soft-cascade
 *    or set-null constraints to preserve historic cost records in inventory.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupplierService, Supplier } from '../../../core/services/supplier.service';
import { ToastService } from '../../../core/services/toast.service';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN = /^(?:0\d{9}|0\d{2}[-\s]?\d{3}[-\s]?\d{4}|0\d{2}[-\s]?\d{7}|\+94\d{9}|\+94[-\s]?\d{2}[-\s]?\d{3}[-\s]?\d{4}|\+[1-9][0-9\s\-]{7,18})$/;

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './supplier-list.html',
  styleUrl: './supplier-list.scss',
})
/**
 * Supplier management directory component handling vendor contact records,
 * commercial terms, and procurement partnerships.
 */
export class SupplierList implements OnInit {
  suppliers: Supplier[] = [];
  isLoading = true;
  showModal = signal(false);
  isEditing = signal(false);
  editingId: string | null = null;
  isSubmitting = false;
  searchTerm = '';
  total = 0;
  searchTimeout: any;

  supplierForm: FormGroup;

  constructor(
    private supplierService: SupplierService,
    private toast: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.supplierForm = this.fb.group({
      supplier_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      contact_person: ['', [Validators.maxLength(255)]],
      email: ['', [Validators.pattern(EMAIL_PATTERN), Validators.maxLength(255)]],
      phone: ['', [Validators.pattern(PHONE_PATTERN), Validators.maxLength(20)]],
      address: ['', [Validators.maxLength(500)]],
      website: ['', [Validators.maxLength(255)]],
      payment_terms: ['', [Validators.maxLength(100)]],
      notes: ['', [Validators.maxLength(1000)]],
    });
  }

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.supplierService.getAll(1, 50, this.searchTerm || undefined).subscribe({
      next: res => {
        if (res.success) {
          const d: any = res.data;
          this.suppliers = Array.isArray(d) ? d : (d?.items ?? []);
          this.total = d?.total ?? (res as any).meta?.total ?? this.suppliers.length;
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

  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadSuppliers(), 400);
  }

  openAddModal() {
    this.isEditing.set(false);
    this.editingId = null;
    this.supplierForm.reset({
      payment_terms: 'Net 30',
    });
    this.showModal.set(true);
  }

  openEditModal(s: Supplier) {
    this.isEditing.set(true);
    this.editingId = s.id;
    this.supplierForm.patchValue({
      supplier_name: s.supplier_name,
      contact_person: s.contact_person || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      website: s.website || '',
      payment_terms: s.payment_terms || '',
      notes: s.notes || '',
    });
    this.showModal.set(true);
  }

  onSubmit() {
    this.supplierForm.markAllAsTouched();
    this.cdr.detectChanges();

    if (this.supplierForm.invalid) {
      this.toast.error('Please fix the validation errors before saving.');
      return;
    }

    this.isSubmitting = true;
    const val = this.supplierForm.value;

    if (this.isEditing() && this.editingId) {
      this.supplierService.update(this.editingId, val).subscribe({
        next: () => {
          this.toast.success('Supplier updated successfully!');
          this.showModal.set(false);
          this.isSubmitting = false;
          this.loadSuppliers();
        },
        error: err => {
          this.toast.error(err.error?.message || 'Failed to update supplier.');
          this.isSubmitting = false;
        },
      });
    } else {
      this.supplierService.create(val).subscribe({
        next: () => {
          this.toast.success('Supplier added successfully!');
          this.showModal.set(false);
          this.isSubmitting = false;
          this.loadSuppliers();
        },
        error: err => {
          this.toast.error(err.error?.message || 'Failed to add supplier.');
          this.isSubmitting = false;
        },
      });
    }
  }

  toggleActive(s: Supplier) {
    const newState = !s.is_active;
    const action = newState ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} "${s.supplier_name}"?`)) return;

    this.supplierService.update(s.id, { is_active: newState }).subscribe({
      next: () => {
        this.toast.success(`Supplier ${newState ? 'activated' : 'deactivated'}.`);
        this.loadSuppliers();
      },
      error: () => this.toast.error('Failed to update supplier status.'),
    });
  }

  deleteSupplier(s: Supplier) {
    if (!confirm(`Permanently remove "${s.supplier_name}"? If materials reference this supplier, deactivation is recommended instead.`)) return;

    this.supplierService.delete(s.id).subscribe({
      next: () => {
        this.toast.success('Supplier deleted.');
        this.loadSuppliers();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Cannot delete supplier currently linked to inventory materials. Deactivate instead.');
      },
    });
  }
}
