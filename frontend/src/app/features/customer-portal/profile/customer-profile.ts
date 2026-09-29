// ============================================================
// CUSTOMER PROFILE COMPONENT
// Purpose: Controls the Customer Profile screen.
// UI: Displays and manages personal profile information, contact info, and preferences.
// Flow: Component -> CustomerService -> Backend Customer API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * CUSTOMER PROFILE COMPONENT - ACCOUNT & CONTACT MANAGEMENT
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Manages the client's contact and billing information, maintaining parity
 * between the authentication identity (`users` table) and the relational CRM
 * record (`customers` table).
 * 
 * KEY FEATURES:
 * 1. Dual-Table Synchronization: Updates made here update the customer's
 *    profile entity, ensuring delivery addresses and phone numbers automatically
 *    propagate to future printed delivery slips.
 * 2. Form State Integrity: Employs Angular Reactive Forms (`FormGroup`) with
 *    input validation and pristine/dirty change detection.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomerService, CustomerProfile as ProfileData } from '../../../core/services/customer.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container" style="max-width: 800px">
      <div class="page-header">
        <div class="page-header-left">
          <h1>My Profile</h1>
          <p>Manage your personal information and contact details</p>
        </div>
      </div>

      @if (isLoading) {
        <div class="card p-4">
          <div class="skeleton mb-3" style="height: 40px; width: 40%"></div>
          <div class="skeleton mb-3" style="height: 100px"></div>
          <div class="skeleton" style="height: 40px; width: 30%"></div>
        </div>
      } @else {
        <!-- Profile Card Header -->
        <div class="card profile-header-card mb-4">
          <div class="avatar-col">
            <div class="profile-avatar-lg">{{ initials }}</div>
          </div>
          <div class="info-col">
            <h2>{{ profile?.full_name || 'Customer' }}</h2>
            <p class="text-muted">{{ profile?.email }}</p>
            <div class="badge-row mt-2">
              <span class="badge badge-primary">Customer</span>
              @if (profile?.company) {
                <span class="badge badge-secondary">{{ profile?.company }}</span>
              }
            </div>
          </div>
        </div>

        <!-- Edit Form Card -->
        <div class="card p-4">
          <div class="card-header-inner mb-4">
            <h3>Contact & Business Details</h3>
            <p class="text-muted text-sm">Keep your delivery and invoicing info up to date</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-grid">

              <!-- Full Name -->
              <div class="form-group">
                <label class="form-label required">Full Name</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="full_name"
                  [class.is-invalid]="f['full_name'].touched && f['full_name'].invalid"
                />
                @if (f['full_name'].touched && f['full_name'].invalid) {
                  <p class="error-text">Name is required (at least 2 characters).</p>
                }
              </div>

              <!-- Email (Read-only) -->
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input
                  type="email"
                  class="form-control"
                  [value]="profile?.email"
                  disabled
                  title="Email cannot be changed directly"
                />
                <span class="form-hint">Used for login and notifications</span>
              </div>

              <!-- Phone -->
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input
                  type="tel"
                  class="form-control"
                  formControlName="phone"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <!-- Company -->
              <div class="form-group">
                <label class="form-label">Company / Organization</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="company"
                  placeholder="e.g. Acme Corporation"
                />
              </div>

              <!-- Address -->
              <div class="form-group full-width">
                <label class="form-label">Shipping / Billing Address</label>
                <textarea
                  class="form-control"
                  rows="3"
                  formControlName="address"
                  placeholder="Street address, city, state, postal code..."
                ></textarea>
              </div>

            </div>

            @if (errorMessage) {
              <div class="alert alert-danger mt-3">
                <span class="material-icons-outlined">error</span>
                <span>{{ errorMessage }}</span>
              </div>
            }

            <div class="form-actions mt-4">
              <button
                type="submit"
                class="btn btn-portal"
                [disabled]="isSaving || form.invalid || form.pristine"
              >
                @if (isSaving) {
                  <span class="spinner"></span> Saving Changes...
                } @else {
                  <span class="material-icons-outlined">save</span> Save Changes
                }
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-header-card {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1.5rem 2rem;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    }
    .profile-avatar-lg {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--portal-color);
      color: #fff;
      font-size: 1.75rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
    }
    .info-col h2 {
      margin: 0;
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .info-col p {
      margin: 0.125rem 0 0;
      font-size: 0.875rem;
    }
    .badge-row {
      display: flex;
      gap: 0.5rem;
    }
    .card-header-inner h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .card-header-inner p {
      margin: 0.25rem 0 0;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .form-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
      display: block;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-color);
    }
    .error-text {
      color: var(--danger-color);
      font-size: 0.8125rem;
      margin-top: 0.375rem;
    }
    .spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid #fff;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      margin-right: 0.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
      .profile-header-card { flex-direction: column; text-align: center; }
      .badge-row { justify-content: center; }
    }
  `],
})
/**
 * Customer profile component handling personal contact details,
 * organization affiliation, and billing address updates.
 */
export class CustomerProfile implements OnInit {
  profile: ProfileData | null = null;
  form: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage = '';

  get initials(): string {
    const name = this.profile?.full_name || '';
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }

  get f() {
    return this.form.controls;
  }

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      company: [''],
      address: [''],
    });
  }

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.customerService.getProfile().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.profile = res.data;
          this.form.patchValue({
            full_name: res.data.full_name || '',
            phone: res.data.phone || '',
            company: res.data.company || '',
            address: res.data.address || '',
          });
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.isLoading = false;
        this.toast.error('Failed to load profile.');
        this.cdr.markForCheck();
      },
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.customerService.updateProfile(this.form.value).subscribe({
      next: res => {
        this.isSaving = false;
        if (res.success && res.data) {
          this.profile = res.data;
          this.form.markAsPristine();
          this.toast.success('Profile updated successfully!');
        }
        this.cdr.markForCheck();
      },
      error: err => {
        this.isSaving = false;
        this.errorMessage = err.error?.message || 'Failed to update profile.';
        this.toast.error(this.errorMessage);
        this.cdr.markForCheck();
      },
    });
  }
}
