# PrintShop Management System — Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Modules](#modules)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Contributing](#contributing)

---

## Project Overview

The **PrintShop Management System** is a university Information Systems project designed to digitize and streamline the operations of a print shop business.

**Scope** covers:
- Customer and order management
- Job/production tracking
- Inventory and materials control
- Invoicing and payment records
- Supplier management
- Reports and analytics

---

## Architecture

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Angular 22 + TypeScript + SCSS      |
| Backend    | Node.js + Express.js + TypeScript   |
| Database   | Supabase (PostgreSQL)               |

---

## Getting Started

> See individual README files in `frontend/`, `backend/`, and `database/` for setup instructions.

### Quick Start

```bash
# 1. Clone and navigate to project
cd PrintShop-Management-System

# 2. Start the backend
cd backend && npm run dev

# 3. Start the frontend (new terminal)
cd frontend && ng serve
```

---

## Modules

> Modules will be documented here as they are implemented.

- [ ] Authentication & User Management
- [ ] Customer Management
- [ ] Product & Service Catalog
- [ ] Order Management
- [ ] Job / Production Tracking
- [ ] Inventory Management
- [ ] Invoicing & Payments
- [ ] Supplier Management
- [ ] Reports & Analytics

---

## API Reference

> API endpoints will be documented here as they are implemented.

Base URL: `http://localhost:3000/api`

| Method | Endpoint       | Description       |
|--------|----------------|-------------------|
| GET    | `/health`      | Health check      |

---

## Database Schema

> See `database/schema.sql` for the full schema.

---

## Contributing

This is a university project. All team members should follow the branching and commit conventions defined in the project guidelines.
