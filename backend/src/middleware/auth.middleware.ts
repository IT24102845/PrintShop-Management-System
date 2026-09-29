// =============================================================================
// PrintShop Management System — Authentication & Authorization Middleware
// =============================================================================
// Security Pipeline:
//   1. extractAndVerifyToken: Extracts the JWT from 'Authorization: Bearer <token>',
//      verifies the cryptographic signature against JWT_SECRET, and decodes claims.
//   2. authenticate(): Attaches verified user credentials { id, email, role }
//      to the Express Request object (req.user). Throws 401 if missing/invalid.
//   3. authorize(...roles): Role-Based Access Control (RBAC) guard verifying
//      that req.user.role matches at least one required role. Throws 403 if unauthorized.
//   4. optionalAuth(): Non-blocking token extraction for endpoints serving both
//      anonymous visitors and logged-in users.
//
// Shorthand RBAC Helpers:
//   - requireStaff: Allows any internal print shop employee role.
//   - requireManager: Allows admin or manager.
//   - requireAdmin: Allows system administrator only.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload as JwtLibPayload } from 'jsonwebtoken';
import { AppError, UserRole } from '../types';
import logger from '../utils/logger';

// ─── Internal token verifier ──────────────────────────────────────────────────

interface DecodedToken extends JwtLibPayload {
  sub:   string;
  email: string;
  role:  UserRole;
}

function extractAndVerifyToken(authHeader: string | undefined): DecodedToken {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No authentication token provided', 401);
  }

  const token = authHeader.slice(7);  // Remove 'Bearer '

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');

  try {
    return jwt.verify(token, secret) as DecodedToken;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('Session expired. Please log in again.', 401);
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid authentication token', 401);
    }
    throw err;
  }
}

// =============================================================================
// Middleware: authenticate
// =============================================================================

/**
 * Verifies the Bearer JWT in the Authorization header.
 * On success, attaches { id, email, role } to req.user.
 *
 * @example
 *   router.get('/protected', authenticate, controller.handler);
 */
export const authenticate = (
  req:  Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const decoded = extractAndVerifyToken(req.headers.authorization);

    req.user = {
      id:    decoded.sub,
      email: decoded.email,
      role:  decoded.role,
    };

    next();
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// Middleware: authorize (Role-Based Access Control)
// =============================================================================

/**
 * Role-based access control middleware factory.
 * MUST be used AFTER authenticate().
 *
 * @param roles - One or more allowed roles. User must have at least one.
 *
 * @example
 *   router.delete('/:id',
 *     authenticate,
 *     authorize('admin', 'manager'),
 *     controller.delete
 *   );
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const userRole = req.user.role as UserRole;

    if (!roles.includes(userRole)) {
      logger.warn(
        `Access denied: user ${req.user.email} (${userRole}) tried to access ` +
        `a route requiring [${roles.join(', ')}]`,
      );
      return next(
        new AppError(
          `Access denied. Required role(s): ${roles.join(', ')}`,
          403,
        ),
      );
    }

    next();
  };
};

// =============================================================================
// Middleware: optionalAuth
// =============================================================================

/**
 * Tries to authenticate but does NOT reject unauthenticated requests.
 * If a valid token is present, req.user is populated.
 * Use for endpoints that behave differently for guests vs authenticated users.
 *
 * @example
 *   router.get('/public-or-private', optionalAuth, controller.handler);
 */
export const optionalAuth = (
  req:  Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const decoded = extractAndVerifyToken(req.headers.authorization);
    req.user = {
      id:    decoded.sub,
      email: decoded.email,
      role:  decoded.role,
    };
  } catch {
    // No-op — unauthenticated is fine for optional auth
  }
  next();
};

// =============================================================================
// Role constants for convenience
// =============================================================================

/** All staff roles that can access internal management features */
export const STAFF_ROLES: UserRole[] = [
  'admin',
  'manager',
  'customer_service',
  'design_staff',
  'production_staff',
  'inventory_staff',
];

/** Shorthand middleware: any staff member (not customers) */
export const requireStaff = authorize(...STAFF_ROLES);

/** Shorthand middleware: admin or manager only */
export const requireManager = authorize('admin', 'manager');

/** Shorthand middleware: admin only */
export const requireAdmin = authorize('admin');
