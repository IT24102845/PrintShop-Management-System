// ============================================================
// RESET PASSWORD COMPONENT
// Purpose: Lets a user choose a new password from the emailed reset link.
// Route:   /reset-password?token=<64-char hex>
// Flow:    Component -> AuthService.resetPassword -> POST /api/v1/auth/reset-password
// ============================================================

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrls: ['../login/login.scss', '../forgot-password/forgot-password.scss'],
})
export class ResetPassword implements OnInit {
  form: FormGroup;
  token = '';
  tokenValid = true;
  isLoading = false;
  isDone = false;
  errorMessage = '';
  showPassword = false;
  showConfirm = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
        confirm_password: ['', [Validators.required]],
      },
      { validators: ResetPassword.passwordsMatch },
    );
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] ?? '';
    this.tokenValid = TOKEN_PATTERN.test(this.token);
  }

  static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirm_password');
    if (!confirm) return null;

    const mismatch = !!confirm.value && pass !== confirm.value;
    const errors = { ...(confirm.errors ?? {}) };
    if (mismatch) errors['passwordMismatch'] = true;
    else delete errors['passwordMismatch'];
    confirm.setErrors(Object.keys(errors).length ? errors : null);
    return null;
  }

  get f() { return this.form.controls; }

  /** 0–4 score: length ≥ 8, mixed case, digit, symbol. */
  get strength(): number {
    const p: string = this.f['password'].value ?? '';
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  get strengthLabel(): string {
    return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.strength];
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.authService.resetPassword(this.token, this.form.value.password).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.isDone = true;
        this.toast.success(res?.message || 'Password reset successfully.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.status === 0
          ? 'Unable to connect to server. Please check your network connection.'
          : err.error?.message || 'Could not reset password. Please request a new link.';
        this.cdr.markForCheck();
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
