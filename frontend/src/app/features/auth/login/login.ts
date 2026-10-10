// ============================================================
// LOGIN COMPONENT
// Purpose: Controls the Login screen.
// UI: Displays and manages user login and authentication.
// Flow: Component -> AuthService -> Backend Auth API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  get isCustomerPortal(): boolean {
    const portal = this.route.snapshot.queryParams['portal'];
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    return portal === 'customer' || (returnUrl && returnUrl.startsWith('/customer'));
  }

  /** Carries the typed email and portal context over to the Forgot Password page. */
  get forgotQueryParams(): Record<string, string> {
    const params: Record<string, string> = {};
    const email = (this.loginForm.get('email')?.value ?? '').trim();
    if (email) params['email'] = email;
    if (this.isCustomerPortal) params['portal'] = 'customer';
    return params;
  }

  fillDemoCustomer() {
    this.loginForm.patchValue({
      email: 'amina@techstartup.com',
      password: 'PrintShop2026!',
    });
  }

  fillDemoAdmin() {
    this.loginForm.patchValue({
      email: 'admin@printshop.com',
      password: 'PrintShop2026!',
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        if (this.authService.isCustomer()) {
          if (returnUrl && returnUrl.startsWith('/customer')) {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/customer/dashboard']);
          }
        } else if (returnUrl && returnUrl.startsWith('/app/')) {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.router.navigate([this.authService.getHomeRoute()]);
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
          this.errorMessage = 'Login failed. Please check your credentials or register.';
        }
        this.cdr.markForCheck();
      },
    });
  }
}
