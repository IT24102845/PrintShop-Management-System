// ============================================================
// FORGOT PASSWORD COMPONENT
// Purpose: Lets a user request a password reset link by email.
// Flow: Component -> AuthService.forgotPassword -> POST /api/v1/auth/forgot-password
// ============================================================

import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['../login/login.scss', './forgot-password.scss'],
})
export class ForgotPassword {
  form: FormGroup;
  isLoading = false;
  errorMessage = '';
  sentTo = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      email: [
        this.route.snapshot.queryParams['email'] ?? '',
        [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(255)],
      ],
    });
  }

  get isCustomerPortal(): boolean {
    return this.route.snapshot.queryParams['portal'] === 'customer';
  }

  get loginQueryParams() {
    return this.isCustomerPortal ? { portal: 'customer', returnUrl: '/customer/dashboard' } : {};
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.cdr.detectChanges();
      return;
    }

    const email = String(this.form.value.email).trim().toLowerCase();
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.sentTo = email;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.status === 0
          ? 'Unable to connect to server. Please check your network connection.'
          : err.error?.message || 'Could not send reset email. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  tryAgain(): void {
    this.sentTo = '';
    this.errorMessage = '';
  }
}
