// =============================================================================
// PrintShop Management System — Angular Route Guards
// =============================================================================
// Architectural Note on Frontend Route Guards:
//   Frontend route guards (CanActivateFn) exist to enhance User Experience (UX)
//   and navigation flow by preventing users from seeing unauthorized screens
//   and smoothly redirecting them to login or their respective dashboard.
//
//   SECURITY PRINCIPLE:
//   Frontend guards do NOT represent the application security boundary.
//   The Express backend authorization middleware (authenticate / authorize)
//   remains the authoritative security layer that enforces data protection.
// =============================================================================

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

// ─── Base Auth Guard ───────────────────────────────────────────────────────────

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (authService.isAuthenticated()) return true;
  const isCustomerRoute = state.url.startsWith('/customer');
  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url,
      ...(isCustomerRoute ? { portal: 'customer' } : {})
    }
  });
};

// ─── Guest Guard (redirect logged-in users to their home) ─────────────────────

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (authService.isAuthenticated()) {
    // If accessing login with portal=customer and user is not a customer,
    // clear staff session so customer can log in
    if (route.queryParams['portal'] === 'customer' && !authService.isCustomer()) {
      authService.logout(false);
      return true;
    }
    return router.createUrlTree([authService.getHomeRoute()]);
  }
  return true;
};

// ─── Role Guard Factory ────────────────────────────────────────────────────────

export const roleGuard = (...allowedRoles: UserRole[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router      = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    if (authService.hasRole(...allowedRoles)) return true;

    // Redirect to appropriate home if wrong role
    return router.createUrlTree([authService.getHomeRoute()]);
  };
};

// ─── Convenience Guards ────────────────────────────────────────────────────────

/** Only allows authenticated users with the 'customer' role. Staff/admin accessing customer area are redirected to customer portal login. */
export const customerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url, portal: 'customer' } });
  }

  if (authService.isCustomer()) {
    return true;
  }

  authService.logout(false);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url, portal: 'customer' } });
};

/** Only allows any staff role (not customer) */
export const staffGuard: CanActivateFn = roleGuard(
  'admin', 'manager', 'customer_service', 'design_staff', 'production_staff', 'inventory_staff'
);

/** Only allows admin or manager */
export const managerGuard: CanActivateFn = roleGuard('admin', 'manager');
