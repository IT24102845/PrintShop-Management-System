# 🖨️ PrintShop Management System (SaaS ERP)

A full-stack, enterprise-grade Print Shop Management System designed for print manufacturing, workflow automation, customer proof approval, and commercial operations.

---

## 🏗️ Architecture & Technology Stack

```
Angular 22 Standalone Frontend (Port 4200)
               │
               ▼ REST API (JWT Authenticated)
Node.js / Express 5 / TypeScript Backend (Port 3000)
               │
       ┌───────┴───────┐
       ▼               ▼
Supabase PostgreSQL   Supabase Storage
  (Relational DB)     (Artwork Proofs)
```

- **Frontend**: Angular 22, TypeScript, SCSS, Standalone Components, Angular Router, Reactive Forms, Angular Signals, RxJS
- **Backend**: Node.js, Express 5, TypeScript, REST API, JWT Authentication, Role-based Middleware
- **Database**: Supabase PostgreSQL (Foreign key constraints, triggers, check constraints)
- **Storage**: Supabase Storage bucket (`design-files`)

---

## 👥 System Roles & Test Credentials

The system separates **System Authorization Roles** (`users.role`) from **Employee Operational Roles** (`employees.employee_role`).

| Portal | Email | Password | Role | Access Scope |
|---|---|---|---|---|
| **Admin Portal** | `admin@printshop.com` | `Admin123!` | `admin` | Full ERP access: Dashboard, Orders, Quotations, Proofs, Production, Inventory, Suppliers, Payments, Reports |
| **Customer Portal** | `asiri.test@printshop.com` | `password123` | `customer` | Customer Portal: Dashboard, My Orders, Create Order, Quotations, Proof Approval, Profile |

*(Public registration strictly provisions accounts with `role: 'customer'`. Staff accounts are provisioned by Admin/Manager).*

---

## 🔄 End-to-End System Demonstration Flow

Follow this step-by-step lifecycle to showcase the complete business workflow:

1. **Customer Registration & Order Creation**:
   - Navigate to `http://localhost:4200/register` and register a new customer account.
   - You are automatically authenticated and redirected to the **Customer Dashboard**.
   - Click **Create New Order**, select service (e.g. *Business Cards*), enter quantity (e.g. `500`), description, deadline date, and optionally attach artwork.
   - Order is created in `pending` status.

2. **Staff Review & Quotation Issuance**:
   - Sign out and log in as Admin (`admin@printshop.com` / `Admin123!`).
   - Open **Orders** (`/app/orders`) and select the newly created order.
   - Click **Create Quotation**, specify price in LKR (e.g. `12,500`), valid until date, and notes.
   - Submitting sets `quotation.status = 'sent'` and automatically advances `order.status = 'quoted'`.

3. **Customer Quotation Acceptance**:
   - Log back in as the customer.
   - Open the order or **Quotations** page (`/customer/quotations`).
   - Click **Accept Quote** (with confirmation dialog).
   - Order automatically moves to `confirmed` status.

4. **Design Staff Proof Upload**:
   - Log in as staff (`admin@printshop.com`).
   - Open the order detail page. In the **Design Proofs** card, click **Upload Proof**.
   - Upload proof artwork and add remarks. The proof is versioned as `v1` and order enters `design_review`.

5. **Customer Proof Review & Production Handoff**:
   - Log in as customer, open the order detail page or **Design Approval** (`/customer/designs`).
   - Inspect the proof thumbnail or enlarge it in the lightbox.
   - Click **Approve Proof**.
   - Backend automatically transitions `order.status = 'in_production'` and queues a new production task with status `'WAITING'`.

6. **Production Execution & Stage Advancements**:
   - Log in as staff, open **Production Queue** (`/app/production`) to view the 5-column Kanban board (`WAITING`, `PRINTING`, `QUALITY_CHECK`, `READY_FOR_DELIVERY`, `COMPLETED`).
   - On the Order Detail page or Kanban card, advance the job legally through the state machine:
     - `WAITING` → `PRINTING` (deducts raw material stock, timestamps `started_at`)
     - `PRINTING` → `QUALITY_CHECK` (order becomes `quality_check`)
     - `QUALITY_CHECK` → `READY_FOR_DELIVERY` (order becomes `ready`)
     - `READY_FOR_DELIVERY` → `COMPLETED` (timestamps `completed_at`, order becomes `COMPLETED`)

7. **Financial Ledger & Payment Recording**:
   - In Order Detail or **Payments** (`/app/payments`), click **Record Payment**.
   - Enter amount (e.g. `12500`), payment method (Cash, Bank Transfer, Card, etc.), and receipt reference.
   - Order balance due updates to `0.00 LKR` and status updates to `PAID IN FULL`.
   - **Reports** (`/app/reports`) and **Dashboard** (`/app/dashboard`) metrics reflect the new revenue immediately.

---

## 🚀 Running the Project Locally

### Prerequisites
- Node.js (v20+ recommended)
- npm (v10+)
- Angular CLI

### 1. Backend

```bash
cd backend
npm install
npm run dev        # Development server on http://localhost:3000
npm run build      # Production TypeScript compile
```

### 2. Frontend

```bash
cd frontend
npm install
npm start          # Development server on http://localhost:4200
npm run build      # Production bundle build
```

---

## 🔒 Security & Data Integrity Highlights

- **Role-Based Guards & Interceptors**: Express middleware (`requireStaff`, `authorize('admin', 'manager')`) protects backend routes; Angular guards (`authGuard`, `staffGuard`, `managerGuard`, `customerGuard`) secure frontend routes.
- **Strict Status Finite State Machines**:
  - `OrderStatus`: `pending` → `quoted` → `confirmed` → `design_review` → `in_production` → `quality_check` → `ready` → `delivered` → `COMPLETED` / `cancelled`.
  - `ProductionTaskStatus`: `WAITING` → `PRINTING` → `QUALITY_CHECK` → `READY_FOR_DELIVERY` → `COMPLETED` / `FAILED`. Invalid status jumps are rejected server-side with HTTP 400.
- **Idempotent Inventory Consumption**: Material stock deductions occur strictly once upon transition to `PRINTING` and prevent negative stock levels.
- **Real Database Health Checks**: Verified via low-latency PostgreSQL queries against application tables, avoiding stale session caches.
