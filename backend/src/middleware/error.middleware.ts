// =============================================================================
// PrintShop Management System — Centralized Error Handling Middleware
// =============================================================================
// Architecture & Error Handling Strategy:
// Express 5 centralized error pipeline. Must be mounted LAST in the middleware chain:
//   1. notFoundHandler: Catches unmatched HTTP requests and returns a standard 404.
//   2. errorHandler: Distinguishes between:
//      - Operational Errors (AppError): Predictable business logic failures (400, 401, 403, 404)
//        where clean, sanitized error messages are safely returned to clients.
//      - Programming / Unexpected Errors (500): Server errors where internal stack traces
//        are sanitized in production to prevent information disclosure vulnerabilities.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import logger from '../utils/logger';

const IS_DEV = process.env.NODE_ENV === 'development';

// ─── 404 Not Found ───────────────────────────────────────────────────────────

/**
 * Catches requests to undefined routes.
 * Mount AFTER all route definitions.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
};

// ─── Global Error Handler ─────────────────────────────────────────────────────

/**
 * Central Express error handler.
 * All errors thrown from controllers/services land here.
 * Mount LAST, after notFoundHandler.
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // ── Operational error (expected, thrown intentionally) ──
  if (err instanceof AppError) {
    logger.warn(`[${err.statusCode}] ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString(),
      ...(IS_DEV && { stack: err.stack }),
    });
    return;
  }

  // ── Unexpected / programming error ──
  logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred.',
    timestamp: new Date().toISOString(),
    ...(IS_DEV && {
      error: err.message,
      stack: err.stack,
    }),
  });
};
