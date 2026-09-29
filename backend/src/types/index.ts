// =============================================================================
// PrintShop Management System — Shared TypeScript Types
// =============================================================================

// ─── Role Types ───────────────────────────────────────────────────────────────

/**
 * All valid user roles in the system.
 * Must match the CHECK constraint in the users table.
 */
export type UserRole =
  | 'admin'
  | 'manager'
  | 'customer'
  | 'customer_service'
  | 'design_staff'
  | 'production_staff'
  | 'inventory_staff';

export const VALID_ROLES: UserRole[] = [
  'admin',
  'manager',
  'customer',
  'customer_service',
  'design_staff',
  'production_staff',
  'inventory_staff',
];

// ─── API Response Types ───────────────────────────────────────────────────────

/** Standard API response envelope used by all endpoints */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Query Types ──────────────────────────────────────────────────────────────

/** Common query string parameters for list endpoints */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ─── Error Types ─────────────────────────────────────────────────────────────

/**
 * Operational application error.
 * Extend this class for domain-specific errors.
 *
 * @example
 *   throw new AppError('Customer not found', 404);
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Database Types ───────────────────────────────────────────────────────────

/** Result of a database connection health check */
export interface DatabaseStatus {
  connected: boolean;
  latencyMs: number;
}

// ─── Express Augmentation ─────────────────────────────────────────────────────

/** Authenticated user attached to every protected request */
export interface AuthUser {
  id:    string;
  email: string;
  role:  UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
