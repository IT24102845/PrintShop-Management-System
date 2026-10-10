// ============================================================
// AUTH API SERVICE - FRONTEND
// Purpose: Connects Angular UI with authentication backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend auth APIs.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Authentication Service
// =============================================================================
// Core Responsibilities:
//   - Reactive Session State: Manages user authentication state via Angular signals
//     ('currentUser', 'isAuthenticated') and computed role signals ('isCustomer', 'isStaff').
//   - Local Storage Persistence: Caches JWT bearer tokens and public user profiles
//     in browser localStorage for session continuity across page reloads.
//   - API Integration: Communicates with backend endpoints:
//       POST  /api/v1/auth/login
//       POST  /api/v1/auth/register
//       GET   /api/v1/auth/me (session refresh)
//   - Route Resolution: Directs authenticated users to their portal home route
//     ('/customer/dashboard' vs '/app/dashboard') via getHomeRoute().
// =============================================================================

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, of, catchError, map } from 'rxjs';

export type UserRole =
  | 'admin'
  | 'manager'
  | 'customer_service'
  | 'design_staff'
  | 'production_staff'
  | 'inventory_staff'
  | 'customer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

const STAFF_ROLES: UserRole[] = [
  'admin', 'manager', 'customer_service',
  'design_staff', 'production_staff', 'inventory_staff',
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY  = 'auth_user';

  public currentUser     = signal<User | null>(this.getStoredUser());
  public isAuthenticated = signal<boolean>(!!this.getStoredToken());

  // ─── Computed Role Helpers ─────────────────────────────────────────────────

  public isCustomer = computed(() => this.currentUser()?.role === 'customer');
  public isStaff    = computed(() => {
    const role = this.currentUser()?.role;
    return role ? STAFF_ROLES.includes(role) : false;
  });
  public isAdminOrManager = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'manager';
  });
  public isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor(private http: HttpClient, private router: Router) {
    if (this.isAuthenticated()) {
      this.refreshCurrentUser().subscribe();
    }
  }

  refreshCurrentUser(): Observable<User | null> {
    const token = this.getToken();
    if (!token) return of(null);
    return this.http.get<{ success: boolean; data: User }>('/api/v1/auth/me').pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.data));
          this.currentUser.set(res.data);
        }
      }),
      map(res => res.data),
      catchError(() => of(null))
    );
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.currentUser()?.role;
    return role ? roles.includes(role) : false;
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/login', credentials).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/register', userData).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  createStaff(staffData: any): Observable<any> {
    return this.http.post<any>('/api/v1/auth/staff', staffData);
  }

  /** Requests a password reset email. Always resolves with a generic message. */
  forgotPassword(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>('/api/v1/auth/forgot-password', { email });
  }

  /** Sets a new password using the token from the reset email link. */
  resetPassword(token: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>('/api/v1/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  }

  /** Allows the currently logged-in user to change their own password. */
  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>('/api/v1/auth/change-password', {
      current_password: currentPassword,
      new_password:     newPassword,
    });
  }

  logout(redirect: boolean = true, queryParams?: any): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    if (redirect) {
      this.router.navigate(['/login'], queryParams ? { queryParams } : undefined);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** Returns the appropriate home route for the current user role */
  getHomeRoute(): string {
    const role = this.currentUser()?.role;
    if (role === 'customer') return '/customer/dashboard';
    return '/app/dashboard';
  }

  private handleAuthSuccess(res: AuthResponse): void {
    if (res.success && res.data) {
      localStorage.setItem(this.TOKEN_KEY, res.data.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(res.data.user));
      this.currentUser.set(res.data.user);
      this.isAuthenticated.set(true);
    }
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    try { return userStr ? JSON.parse(userStr) : null; } catch { return null; }
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}
