// =============================================================================
// PrintShop Management System — HTTP Authentication Interceptor
// =============================================================================
// Responsibilities:
//   1. JWT Attachment: Automatically clones outgoing HTTP requests to the REST API
//      and attaches 'Authorization: Bearer <token>' from localStorage.
//   2. Storage Exclusions: Skips token injection for direct Supabase Storage calls
//      ('supabase.co' or '/storage/v1/') to prevent credential leakage/errors.
//   3. Centralized 401 Handling: Intercepts expired or invalidated sessions (HTTP 401)
//      and automatically triggers authService.logout() to redirect the user to login.
// =============================================================================

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Do not intercept Supabase direct storage uploads/requests
  if (req.url.includes('supabase.co') || req.url.includes('/storage/v1/')) {
    return next(req);
  }

  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }


  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/')) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
