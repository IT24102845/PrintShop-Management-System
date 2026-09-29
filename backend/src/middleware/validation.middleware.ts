// =============================================================================
// PrintShop Management System — Request Validation Middleware
// =============================================================================
// Provides declarative request validation for Express routes:
//   1. validate(schema): Validates body, URL params, and query strings against
//      type rules, required constraints, string length limits, numeric bounds,
//      regex patterns, and enum whitelists before hitting controllers.
//   2. validateUUID(param): Fast regex verification of RFC 4122 UUID v4 parameters.
//   3. parsePagination: Normalizes 'page' and 'limit' query parameters, enforcing
//      safe defaults (page 1, limit 20, max 100) to prevent unbounded DB queries.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

interface FieldRule {
  type:       FieldType;
  required?:  boolean;
  minLength?: number;
  maxLength?: number;
  min?:       number;
  max?:       number;
  pattern?:   RegExp;
  enum?:      string[];  // Whitelist of allowed string values
}

interface ValidationSchema {
  body?:   Record<string, FieldRule>;
  params?: Record<string, FieldRule>;
  query?:  Record<string, FieldRule>;
}

// ─── Core Validator ───────────────────────────────────────────────────────────

function validateField(
  fieldName: string,
  value: unknown,
  rule: FieldRule,
  source: string,
): string | null {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return rule.required !== false
      ? `'${fieldName}' is required in request ${source}`
      : null; // Optional field — skip further checks
  }

  if (rule.type === 'array') {
    if (!Array.isArray(value)) return `'${fieldName}' must be an array`;
  } else if (typeof value !== rule.type) {
    return `'${fieldName}' must be of type ${rule.type}`;
  }

  if (rule.type === 'string' && typeof value === 'string') {
    const trimmed = value.trim();
    const isPasswordField = fieldName === 'password' || fieldName === 'new_password' || fieldName === 'current_password';
    const len = isPasswordField ? value.length : trimmed.length;

    if (rule.minLength !== undefined && len < rule.minLength)
      return `'${fieldName}' must be at least ${rule.minLength} characters`;
    if (rule.maxLength !== undefined && value.length > rule.maxLength)
      return `'${fieldName}' must not exceed ${rule.maxLength} characters`;
    if (rule.pattern && !rule.pattern.test(fieldName === 'email' ? trimmed.toLowerCase() : trimmed))
      return `'${fieldName}' has an invalid format`;
    if (rule.enum && !rule.enum.includes(trimmed))
      return `'${fieldName}' must be one of: ${rule.enum.join(', ')}`;
  }

  if (rule.type === 'number' && typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min)
      return `'${fieldName}' must be at least ${rule.min}`;
    if (rule.max !== undefined && value > rule.max)
      return `'${fieldName}' must not exceed ${rule.max}`;
  }

  return null;
}

// ─── Middleware Factory ───────────────────────────────────────────────────────

/**
 * Schema-based request validation middleware factory.
 *
 * @example
 *   router.post('/', validate({
 *     body: {
 *       name:  { type: 'string', minLength: 2, maxLength: 100 },
 *       email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
 *       age:   { type: 'number', min: 0, required: false },
 *     },
 *   }), controller.create);
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      for (const [field, rule] of Object.entries(schema.body)) {
        const err = validateField(field, req.body[field], rule, 'body');
        if (err) errors.push(err);
      }
    }

    // Validate params
    if (schema.params) {
      for (const [field, rule] of Object.entries(schema.params)) {
        const err = validateField(field, req.params[field], rule, 'params');
        if (err) errors.push(err);
      }
    }

    // Validate query
    if (schema.query) {
      for (const [field, rule] of Object.entries(schema.query)) {
        const err = validateField(field, req.query[field] as string | undefined, rule, 'query');
        if (err) errors.push(err);
      }
    }

    if (errors.length > 0) {
      return next(new AppError(errors.join('. '), 400));
    }

    next();
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a route param is a valid UUID v4.
 *
 * @example
 *   router.get('/:id', validateUUID('id'), controller.getById);
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const paramValue = Array.isArray(req.params[paramName])
      ? req.params[paramName][0]
      : (req.params[paramName] ?? '');
    if (!UUID_REGEX.test(paramValue)) {
      return next(
        new AppError(`Invalid UUID format for parameter '${paramName}'`, 400),
      );
    }
    next();
  };
};

/**
 * Parses and validates common pagination query params.
 * Normalizes page/limit to integers and attaches defaults.
 */
export const parsePagination = (req: Request, _res: Response, next: NextFunction): void => {
  const page  = parseInt(req.query['page']  as string, 10) || 1;
  const limit = parseInt(req.query['limit'] as string, 10) || 20;

  if (page < 1)   return next(new AppError("'page' must be >= 1", 400));
  if (limit < 1 || limit > 100)
    return next(new AppError("'limit' must be between 1 and 100", 400));

  req.query['page']  = String(page);
  req.query['limit'] = String(limit);
  next();
};
