// ============================================================
// V1 API ROUTER AGGREGATOR - BACKEND
// Purpose: Central router that mounts all v1 feature modules.
// Flow: Express App (/api/v1) -> Router Aggregator -> Feature Sub-routers
// Defines the API endpoint and connects it to the controller.
// ============================================================

// =============================================================================
// PrintShop Management System — API v1 Route Aggregator & Endpoint Directory
// =============================================================================
// Mounted at: /api/v1
//
// REST API SITEMAP:
//   /api/v1/health      → Health check, uptime, and database ping latency
//   /api/v1/auth        → Registration, login, staff provisioning, JWT profile
//   /api/v1/customers   → Customer CRM lookup, search, and profile updates
//   /api/v1/orders      → Order lifecycle intake, history, and status progression
//   /api/v1/quotations  → Quotations, multi-revision pricing, customer accept/reject
//   /api/v1/designs     → Artwork proof uploads, versioning, customer sign-off
//   /api/v1/production  → Shop floor Kanban queue, task dispatch, status updates
//   /api/v1/inventory   → Raw material tracking, stock adjustments, low-stock alerts
//   /api/v1/suppliers   → Procurement vendors, supply contacts, terms
//   /api/v1/payments    → Transaction ledger, payment recording, revenue stats
//   /api/v1/offers      → Dynamic customer showcase cards and promotional banners
// =============================================================================

import { Router } from 'express';
import healthRouter from './health.routes';
import authRouter   from './auth.routes';
import customerRouter from './customer.routes';
import orderRouter    from './order.routes';
import quotationRouter from './quotation.routes';
import designRouter   from './design.routes';
import productionRouter from './production.routes';
import supplierRouter from './supplier.routes';
import inventoryRouter from './inventory.routes';
import paymentRouter from './payment.routes';
import offerRouter from './offer.routes';

const v1Router = Router();

// ─── Registered Routes ────────────────────────────────────────────────────────

v1Router.use('/health', healthRouter);
v1Router.use('/auth',   authRouter);
v1Router.use('/customers', customerRouter);
v1Router.use('/orders',    orderRouter);
v1Router.use('/quotations', quotationRouter);
v1Router.use('/designs',    designRouter);
v1Router.use('/production', productionRouter);
v1Router.use('/suppliers', supplierRouter);
v1Router.use('/inventory', inventoryRouter);
v1Router.use('/payments',  paymentRouter);
v1Router.use('/offers',    offerRouter);




// Future module routes (uncomment as implemented):
// v1Router.use('/users',      usersRouter);
// v1Router.use('/products',   productsRouter);

// v1Router.use('/jobs',       jobsRouter);
// v1Router.use('/inventory',  inventoryRouter);
// v1Router.use('/invoices',   invoicesRouter);
// v1Router.use('/suppliers',  suppliersRouter);
// v1Router.use('/reports',    reportsRouter);

export default v1Router;
