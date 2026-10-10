/**
 * ============================================================================
 * APPLICATION ROUTING TABLE - DUAL-SHELL ARCHITECTURE & RBAC GUARDS
 * ============================================================================
 * 
 * ARCHITECTURE CONTEXT:
 * The frontend implements a segregated "Dual-Shell" navigation model:
 * 
 * 1. PUBLIC ZONE (/login, /register):
 *    - Guarded by `guestGuard`: Authenticated users attempting to access public
 *      auth pages are automatically redirected to their appropriate home portal.
 * 
 * 2. STAFF / ADMIN OPERATIONS PORTAL (/app/*):
 *    - Uses `AppLayout` (sidebar, topbar, command navigation).
 *    - Guarded by `authGuard` (valid JWT session) AND `staffGuard` (ADMIN,
 *      MANAGER, OPERATOR).
 *    - Sensitive financial and management subroutes (/suppliers, /payments,
 *      /offers, /reports) enforce an additional `managerGuard` tier.
 * 
 * 3. CUSTOMER SELF-SERVICE PORTAL (/customer/*):
 *    - Uses `CustomerLayout` (client-focused, simplified workflow navbar).
 *    - Guarded by `authGuard` AND `customerGuard` (role === 'CUSTOMER').
 *    - Strictly isolates self-service workflows: Order Request -> Quotation
 *      Acceptance -> Artwork Proof Review -> Order Tracking.
 * 
 * PERFORMANCE & CODE SPLITTING:
 * - Standalone Components: All route leaf nodes utilize Angular's modern
 *   dynamic import syntax (`loadComponent: () => import(...).then(m => m.X)`),
 *   guaranteeing granular bundle splitting and minimal initial page load weight.
 * ============================================================================
 */

import { Routes } from '@angular/router';
import { authGuard, guestGuard, customerGuard, staffGuard, managerGuard } from './core/guards/auth.guard';
import { AppLayout } from './shared/layouts/app-layout/app-layout';
import { CustomerLayout } from './shared/layouts/customer-layout/customer-layout';

export const routes: Routes = [

  // ─── Public ───────────────────────────────────────────────────────────────
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
    canActivate: [guestGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPassword),
    canActivate: [guestGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPassword),
  },

  // ─── Staff / Admin Shell (/app/*) ─────────────────────────────────────────
  {
    path: 'app',
    component: AppLayout,
    canActivate: [authGuard, staffGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
      },

      // ── Customers ──────────────────────────────────────────────────────────
      {
        path: 'customers',
        loadComponent: () => import('./features/customers/customer-list/customer-list').then(m => m.CustomerList),
      },
      {
        path: 'customers/new',
        loadComponent: () => import('./features/customers/customer-form/customer-form').then(m => m.CustomerForm),
      },
      {
        path: 'customers/:id',
        loadComponent: () => import('./features/customers/customer-details/customer-details').then(m => m.CustomerDetails),
      },
      {
        path: 'staff/new',
        loadComponent: () => import('./features/customers/customer-form/customer-form').then(m => m.CustomerForm),
        canActivate: [managerGuard],
      },


      // ── Orders ─────────────────────────────────────────────────────────────
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/order-list/order-list').then(m => m.OrderList),
      },
      {
        path: 'orders/new',
        loadComponent: () => import('./features/orders/order-form/order-form').then(m => m.OrderForm),
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./features/orders/order-detail/order-detail').then(m => m.OrderDetail),
      },

      // ── Quotations ─────────────────────────────────────────────────────────
      {
        path: 'quotations',
        loadComponent: () => import('./features/quotations/quotation-list/quotation-list').then(m => m.QuotationList),
      },
      {
        path: 'quotations/new',
        loadComponent: () => import('./features/quotations/quotation-form/quotation-form').then(m => m.QuotationForm),
      },

      // ── Designs ────────────────────────────────────────────────────────────
      {
        path: 'designs',
        loadComponent: () => import('./features/designs/design-list/design-list').then(m => m.DesignList),
      },

      // ── Production ─────────────────────────────────────────────────────────
      {
        path: 'production',
        loadComponent: () => import('./features/production/production-queue/production-queue').then(m => m.ProductionQueue),
      },

      // ── Inventory ──────────────────────────────────────────────────────────
      {
        path: 'inventory',
        loadComponent: () => import('./features/inventory/inventory-list/inventory-list').then(m => m.InventoryList),
      },

      // ── Suppliers ──────────────────────────────────────────────────────────
      {
        path: 'suppliers',
        loadComponent: () => import('./features/suppliers/supplier-list/supplier-list').then(m => m.SupplierList),
        canActivate: [managerGuard],
      },

      // ── Payments ───────────────────────────────────────────────────────────
      {
        path: 'payments',
        loadComponent: () => import('./features/payments/payment-list/payment-list').then(m => m.PaymentList),
        canActivate: [managerGuard],
      },

      // ── Promotional Offers ──────────────────────────────────────────────────
      {
        path: 'offers',
        loadComponent: () => import('./features/offers/offer-list/offer-list').then(m => m.OfferList),
        canActivate: [managerGuard],
      },

      // ── Reports ────────────────────────────────────────────────────────────
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports-view/reports-view').then(m => m.ReportsView),
        canActivate: [managerGuard],
      },
    ],
  },

  // ─── Customer Portal (/customer/*) ────────────────────────────────────────
  {
    path: 'customer',
    component: CustomerLayout,
    canActivate: [authGuard, customerGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () => import('./features/customer-portal/customer-dashboard/customer-dashboard').then(m => m.CustomerDashboard),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/customer-portal/my-orders/my-orders').then(m => m.MyOrders),
      },
      {
        path: 'orders/new',
        loadComponent: () => import('./features/customer-portal/create-order/create-order').then(m => m.CreateOrder),
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./features/orders/order-detail/order-detail').then(m => m.OrderDetail),
      },
      {
        path: 'quotations',
        loadComponent: () => import('./features/customer-portal/my-quotations/my-quotations').then(m => m.MyQuotations),
      },
      {
        path: 'quotations/new',
        loadComponent: () => import('./features/customer-portal/create-order/create-order').then(m => m.CreateOrder),
        data: { isQuote: true },
      },
      {
        path: 'designs',
        loadComponent: () => import('./features/customer-portal/my-designs/my-designs').then(m => m.MyDesigns),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/customer-portal/profile/customer-profile').then(m => m.CustomerProfile),
      },
    ],
  },

  // ─── Wildcard ─────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '/login' },
];
