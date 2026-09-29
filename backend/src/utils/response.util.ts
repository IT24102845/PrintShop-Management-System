// =============================================================================
// PrintShop Management System — Response Utilities
// =============================================================================
// Centralizes all HTTP response shapes so every endpoint returns a consistent
// ApiResponse envelope. Import these helpers in controllers instead of calling
// res.status().json() directly.
// =============================================================================

import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

// ─── Success Responses ────────────────────────────────────────────────────────

/** 200 OK — general success with data payload */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
};

/** 201 Created — resource successfully created */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Resource created successfully',
): void => {
  sendSuccess(res, data, message, 201);
};

/** 204 No Content — success with no body (e.g. DELETE) */
export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

/** Paginated list response */
export const sendPaginated = <T>(
  res: Response,
  paginated: PaginatedResponse<T>,
  message = 'Data retrieved successfully',
): void => {
  const response: ApiResponse<PaginatedResponse<T>> = {
    success: true,
    message,
    data: paginated,
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(response);
};

// ─── Error Responses ──────────────────────────────────────────────────────────

/** Generic error response (prefer throwing AppError through the error middleware) */
export const sendError = (
  res: Response,
  message = 'An unexpected error occurred',
  statusCode = 500,
  errorDetail?: string,
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error: errorDetail,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
};
