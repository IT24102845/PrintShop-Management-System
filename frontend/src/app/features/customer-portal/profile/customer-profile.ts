// ============================================================
// CUSTOMER PROFILE COMPONENT
// Purpose: Controls the Customer Profile screen.
// UI: Displays and manages personal profile information, contact info, and preferences.
// Flow: Component -> CustomerService -> Backend Customer API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CustomerService, CustomerProfile as ProfileData } from '../../../core/services/customer.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

const PHONE_PATTERN = /^(?:0\d{9}|0\d{2}[-\s]?\d{3}[-\s]?\d{4}|0\d{2}[-\s]?\d{7}|\+94\d{9}|\+94[-\s]?\d{2}[-\s]?\d{3}[-\s]?\d{4}|\+[1-9][0-9\s\-]{7,18})$/;
const NAME_PATTERN  = /^[a-zA-Z\s\-'.]{2,100}$/;

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPw   = control.get('new_password')?.value;
  const confirm = control.get('confirm_password')?.value;
  if (newPw && confirm && newPw !== confirm) {
    return { passwordMismatch: true };
  }
  return null;
}

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

        <!-- Edit Profile Card -->
        <div class="card p-4 mb-4">
          <div class="card-header-inner mb-4">
            <h3>Contact &amp; Business Details</h3>
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
                  @if (f['full_name'].hasError('required')) {
                    <p class="error-text">Full name is required.</p>
                  } @else if (f['full_name'].hasError('minlength')) {
                    <p class="error-text">Name must be at least 2 characters.</p>
                  } @else if (f['full_name'].hasError('pattern')) {
                    <p class="error-text">Name can only contain letters, spaces, hyphens and apostrophes.</p>
                  }
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
                  placeholder="077 123 4567 or +94 77 123 4567"
                  [class.is-invalid]="f['phone'].touched && f['phone'].invalid"
                />
                @if (f['phone'].touched && f['phone'].invalid) {
                  <p class="error-text">Enter a valid phone number (e.g. 077 123 4567 or +94 77 123 4567)</p>
                }
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

        <!-- Change Password Card -->
        <div class="card p-4">
          <div class="card-header-inner mb-4">
            <div class="pw-header-row">
              <span class="pw-icon"><span class="material-icons-outlined">lock</span></span>
              <div>
                <h3>Change Password</h3>
                <p class="text-muted text-sm">Update your login password. You will stay logged in.</p>
              </div>
            </div>
          </div>

          <form [formGroup]="pwForm" (ngSubmit)="onSubmitPassword()">

            <!-- Current Password -->
            <div class="form-group mb-3">
              <label class="form-label required">Current Password</label>
              <div class="pw-input-wrap">
                <input
                  class="form-control"
                  [type]="showCurrent ? 'text' : 'password'"
                  formControlName="current_password"
                  placeholder="Your current password"
                  autocomplete="current-password"
                  [class.is-invalid]="pw['current_password'].touched && pw['current_password'].invalid"
                />
                <button type="button" class="pw-eye" (click)="showCurrent = !showCurrent" tabindex="-1">
                  <span class="material-icons-outlined">{{ showCurrent ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              @if (pw['current_password'].touched && pw['current_password'].hasError('required')) {
                <p class="error-text">Current password is required</p>
              }
            </div>

            <div class="form-grid">
              <!-- New Password -->
              <div class="form-group">
                <label class="form-label required">New Password</label>
                <div class="pw-input-wrap">
                  <input
                    class="form-control"
                    [type]="showNew ? 'text' : 'password'"
                    formControlName="new_password"
                    placeholder="Min. 8 characters"
                    autocomplete="new-password"
                    [class.is-invalid]="pw['new_password'].touched && pw['new_password'].invalid"
                  />
                  <button type="button" class="pw-eye" (click)="showNew = !showNew" tabindex="-1">
                    <span class="material-icons-outlined">{{ showNew ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                @if (pw['new_password'].touched && pw['new_password'].invalid) {
                  @if (pw['new_password'].hasError('required')) {
                    <p class="error-text">New password is required</p>
                  } @else if (pw['new_password'].hasError('minlength')) {
                    <p class="error-text">Must be at least 8 characters</p>
                  }
                }
              </div>

              <!-- Confirm Password -->
              <div class="form-group">
                <label class="form-label required">Confirm New Password</label>
                <div class="pw-input-wrap">
                  <input
                    class="form-control"
                    [type]="showConfirm ? 'text' : 'password'"
                    formControlName="confirm_password"
                    placeholder="Re-enter new password"
                    autocomplete="new-password"
                    [class.is-invalid]="(pw['confirm_password'].touched && pw['confirm_password'].invalid) || (pwForm.hasError('passwordMismatch') && pw['confirm_password'].touched)"
                  />
                  <button type="button" class="pw-eye" (click)="showConfirm = !showConfirm" tabindex="-1">
                    <span class="material-icons-outlined">{{ showConfirm ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                @if (pw['confirm_password'].touched && pw['confirm_password'].hasError('required')) {
                  <p class="error-text">Please confirm your new password</p>
                } @else if (pwForm.hasError('passwordMismatch') && pw['confirm_password'].touched) {
                  <p class="error-text">Passwords do not match</p>
                }
              </div>
            </div>

            <div class="form-actions mt-4">
              <button
                type="submit"
                class="btn btn-portal"
                [disabled]="isChangingPw || pwForm.invalid"
              >
                @if (isChangingPw) {
                  <span class="spinner"></span> Updating...
                } @else {
                  <span class="material-icons-outlined">lock_reset</span> Update Password
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
      color: var(--danger-color, #dc2626);
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

    /* Password section */
    .pw-header-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .pw-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      .material-icons-outlined {
        color: #fff;
        font-size: 1.25rem;
      }
    }
    .pw-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      .form-control { padding-right: 2.75rem; }
    }
    .pw-eye {
      position: absolute;
      right: 0.625rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      color: var(--text-muted, #64748b);
      display: flex;
      align-items: center;
      transition: color 0.15s;
      &:hover { color: var(--portal-color, #0ea5e9); }
      .material-icons-outlined { font-size: 1.125rem; }
    }
    .mb-3 { margin-bottom: 1rem; }

    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
      .profile-header-card { flex-direction: column; text-align: center; }
      .badge-row { justify-content: center; }
    }
  `],
})
export class CustomerProfile implements OnInit {
  profile: ProfileData | null = null;
  form: FormGroup;
  isLoading    = true;
  isSaving     = false;
  errorMessage = '';

  // Change password form
  pwForm:        FormGroup;
  isChangingPw   = false;
  showCurrent    = false;
  showNew        = false;
  showConfirm    = false;

  get initials(): string {
    const name = this.profile?.full_name || '';
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }

  get f() { return this.form.controls; }
  get pw() { return this.pwForm.controls; }

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(NAME_PATTERN)]],
      phone:     ['', [Validators.pattern(PHONE_PATTERN), Validators.maxLength(20)]],
      company:   ['', [Validators.maxLength(255)]],
      address:   ['', [Validators.maxLength(500)]],
    });

    this.pwForm = this.fb.group(
      {
        current_password: ['', [Validators.required]],
        new_password:     ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
        confirm_password: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator },
    );
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
            phone:     res.data.phone     || '',
            company:   res.data.company   || '',
            address:   res.data.address   || '',
          });
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load profile.');
        this.cdr.markForCheck();
      },
    });
  }

  onSubmit() {
    this.form.markAllAsTouched();
    this.cdr.detectChanges();

    if (this.form.invalid) {
      this.toast.error('Please fix the validation errors.');
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

  onSubmitPassword() {
    this.pwForm.markAllAsTouched();
    this.cdr.detectChanges();

    if (this.pwForm.invalid) {
      this.toast.error('Please fix the errors before submitting.');
      return;
    }

    const { current_password, new_password } = this.pwForm.value as {
      current_password: string;
      new_password:     string;
    };

    this.isChangingPw = true;
    this.cdr.markForCheck();

    this.authService.changePassword(current_password, new_password).subscribe({
      next: () => {
        this.toast.success('Password updated successfully!');
        this.pwForm.reset();
        this.showCurrent = false;
        this.showNew     = false;
        this.showConfirm = false;
        this.isChangingPw = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to update password.');
        this.isChangingPw = false;
        this.cdr.markForCheck();
      },
    });
  }
}
