// ============================================================
// REGISTER COMPONENT
// Purpose: Controls the User Registration screen.
// UI: Displays and manages customer account registration and input validation.
// Flow: Component -> AuthService -> Backend Auth API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
import { AuthService, UserRole } from '../../../core/services/auth.service';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_PATTERN = /^[a-zA-Z\s\-'.]{2,}$/;

export interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  badgeClass: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnInit {
  registerForm: FormGroup;
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
    {
      value: 'admin',
      label: 'System Administrator',
      description: 'Full administrative access and user management',
      badgeClass: 'badge-red',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    this.registerForm = this.fb.group(
      {
        account_type: ['customer'],
        role: ['customer_service'],
        full_name: ['', [Validators.required, Validators.minLength(2), Validators.pattern(NAME_PATTERN)]],
        email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
        confirm_password: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['type'] === 'staff' || params['role']) {
      this.setAccountType('staff');
      if (params['role']) {
        this.registerForm.patchValue({ role: params['role'] });
      }
    } else if (params['portal'] === 'customer') {
      this.setAccountType('customer');
    }
  }

  setAccountType(type: 'customer' | 'staff'): void {
    this.accountType = type;
    this.registerForm.patchValue({ account_type: type });

    const roleControl = this.registerForm.get('role');
    if (type === 'staff') {
      roleControl?.setValidators([Validators.required]);
      if (!roleControl?.value) {
        roleControl?.setValue('customer_service');
      }
    } else {
      roleControl?.clearValidators();
      roleControl?.setValue('customer');
    }
    roleControl?.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  get f() {
    return this.registerForm.controls;
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get passwordValue(): string {
    return this.registerForm.get('password')?.value || '';
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
        const { passwordMismatch, ...remainingErrors } = confirmCtrl.errors || {};
        confirmCtrl.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
      }
      return null;
    }
  }

  onSubmit(): void {
    this.isSubmitted = true;
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    const role: UserRole = this.accountType === 'staff'
      ? this.registerForm.value.role
      : 'customer';

    const payload = {
      full_name: this.registerForm.value.full_name.trim(),
      email: this.registerForm.value.email.trim().toLowerCase(),
      password: this.registerForm.value.password,
      role,
    };

    this.authService.register(payload).subscribe({
      next: () => {
        if (this.authService.isCustomer()) {
          this.router.navigate(['/customer/dashboard']);
        } else {
          this.router.navigate(['/app/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 0) {
          this.errorMessage = 'Unable to connect to server. Please check your network connection.';
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (typeof err.error === 'string') {
          this.errorMessage = err.error;
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
        this.cdr.markForCheck();
      },
    });
  }
}
