// ============================================================
// CUSTOMER FORM COMPONENT
// Purpose: Controls the Create Customer & Staff account creation screen.
// UI: Displays and manages client and staff registration forms with real-time validation.
// Flow: Component -> CustomerService / AuthService -> Backend API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CustomerService } from '../../../core/services/customer.service';
import { AuthService, UserRole } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN = /^(\+?[0-9\s\-\(\)]{7,20})?$/;
const NAME_PATTERN = /^[a-zA-Z\s\-'.]{2,}$/;

export interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  badgeClass: string;
}

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.scss',
})
export class CustomerForm implements OnInit {
  form: FormGroup;
  accountType: 'customer' | 'staff' = 'customer';
  isLoading = false;
  isSubmitted = false;
  errorMessage = '';

  showPassword = false;
  showConfirmPassword = false;

  readonly staffRoles: RoleOption[] = [
    {
      value: 'manager',
      label: 'Manager',
      description: 'Operations oversight, quote approvals, order routing',
      badgeClass: 'badge-purple',
    },
    {
      value: 'customer_service',
      label: 'Customer Service / Sales',
      description: 'Customer inquiries, quoting, order creation & support',
      badgeClass: 'badge-blue',
    },
    {
      value: 'design_staff',
      label: 'Graphic Designer',
      description: 'Artwork proofs, print-ready file prep, asset approval',
      badgeClass: 'badge-indigo',
    },
    {
      value: 'production_staff',
      label: 'Print & Production',
      description: 'Job queue management, printing, cutting & finishing',
      badgeClass: 'badge-amber',
    },
    {
      value: 'inventory_staff',
      label: 'Inventory Specialist',
      description: 'Stock tracking, reorders, material intake & suppliers',
      badgeClass: 'badge-teal',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
  ) {
    this.form = this.fb.group(
      {
        account_type: ['customer'],
        full_name: ['', [Validators.required, Validators.minLength(2), Validators.pattern(NAME_PATTERN)]],
        email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
        confirm_password: ['', [Validators.required]],
        phone: ['', [Validators.pattern(PHONE_PATTERN)]],
        role: ['customer_service'],
        address: [''],
        company: [''],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    // Check if routed with type=staff or on /staff/new
    this.route.queryParams.subscribe((params) => {
      if (params['type'] === 'staff' && this.authService.isAdminOrManager()) {
        this.setAccountType('staff');
      }
    });

    if (this.router.url.includes('/staff/new') && this.authService.isAdminOrManager()) {
      this.setAccountType('staff');
    }
  }

  get f() {
    return this.form.controls;
  }

  get availableRoles(): RoleOption[] {
    if (this.authService.isAdmin()) {
      return [
        {
          value: 'admin',
          label: 'System Administrator',
          description: 'Full administrative access and user management',
          badgeClass: 'badge-red',
        },
        ...this.staffRoles,
      ];
    }
    return this.staffRoles;
  }

  setAccountType(type: 'customer' | 'staff'): void {
    this.accountType = type;
    this.form.patchValue({ account_type: type });

    const roleControl = this.form.get('role');
    if (type === 'staff') {
      roleControl?.setValidators([Validators.required]);
      if (!roleControl?.value) {
        roleControl?.setValue('customer_service');
      }
    } else {
      roleControl?.clearValidators();
    }
    roleControl?.updateValueAndValidity();
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Real-time password requirement helpers
  get passwordValue(): string {
    return this.form.get('password')?.value || '';
  }

  get hasMinLength(): boolean {
    return this.passwordValue.length >= 8;
  }

  get hasLetter(): boolean {
    return /[a-zA-Z]/.test(this.passwordValue);
  }

  get hasNumberOrSymbol(): boolean {
    return /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.passwordValue);
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirm_password')?.value;

    const confirmCtrl = control.get('confirm_password');
    if (!confirmPassword) return null;

    if (password !== confirmPassword) {
      confirmCtrl?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmCtrl?.hasError('passwordMismatch')) {
        const { passwordMismatch, ...rest } = confirmCtrl.errors || {};
        confirmCtrl.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    }
  }

  onSubmit(): void {
    this.isSubmitted = true;
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please fix the validation errors before submitting.');
      return;
    }

    this.isLoading = true;
    const val = this.form.value;

    if (this.accountType === 'staff') {
      const staffPayload = {
        full_name: val.full_name.trim(),
        email: val.email.trim().toLowerCase(),
        password: val.password,
        role: val.role,
        phone: val.phone ? val.phone.trim() : undefined,
      };

      this.authService.createStaff(staffPayload).subscribe({
        next: () => {
          this.toast.success(`Staff account for ${val.full_name} created successfully!`);
          this.router.navigate(['/app/customers']);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create staff account.';
          this.toast.error(this.errorMessage);
          this.isLoading = false;
        },
      });
    } else {
      const customerPayload = {
        full_name: val.full_name.trim(),
        email: val.email.trim().toLowerCase(),
        password: val.password,
        phone: val.phone ? val.phone.trim() : undefined,
        address: val.address ? val.address.trim() : undefined,
        company: val.company ? val.company.trim() : undefined,
      };

      this.customerService.createCustomer(customerPayload).subscribe({
        next: () => {
          this.toast.success(`Customer account for ${val.full_name} created successfully!`);
          this.router.navigate(['/app/customers']);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create customer.';
          this.toast.error(this.errorMessage);
          this.isLoading = false;
        },
      });
    }
  }
}
