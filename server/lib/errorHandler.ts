import { Request, Response, NextFunction } from "express";

/**
 * Standardized error handling utilities for consistent error responses
 * Eliminates duplicated error handling patterns across route files
 */

export interface ErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

/**
 * Handles route errors with consistent logging and response format
 * @param error - The error that occurred
 * @param res - Express response object
 * @param message - Custom error message (optional)
 * @param statusCode - HTTP status code (default: 500)
 */
export const handleRouteError = (
  error: any,
  res: Response,
  message: string = "Operation failed",
  statusCode: number = 500
): void => {
  console.error(`${message}:`, error);
  
  const errorResponse: ErrorResponse = {
    message,
    statusCode
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = error instanceof Error ? error.message : String(error);
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async route wrapper that automatically catches and handles errors
 * Eliminates try-catch boilerplate in route handlers
 * 
 * @param handler - The async route handler function
 * @returns Wrapped route handler with error handling
 */
export const asyncRouteHandler = (handler: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      handleRouteError(error, res);
    }
  };
};

/**
 * Middleware for handling validation errors consistently
 * @param validationErrors - Array of validation error messages
 * @param res - Express response object
 */
export const handleValidationErrors = (
  validationErrors: string[],
  res: Response
): void => {
  res.status(400).json({
    message: "Validation failed",
    errors: validationErrors,
    statusCode: 400
  });
};

/**
 * Handle different types of common errors with appropriate status codes
 */
export const handleSpecificError = (error: any, res: Response): void => {
  if (error.name === 'ValidationError') {
    handleRouteError(error, res, "Validation failed", 400);
  } else if (error.name === 'UnauthorizedError' || error.message?.includes('unauthorized')) {
    handleRouteError(error, res, "Unauthorized access", 401);
  } else if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
    handleRouteError(error, res, "Resource not found", 404);
  } else if (error.name === 'ConflictError' || error.message?.includes('already exists')) {
    handleRouteError(error, res, "Resource conflict", 409);
  } else {
    handleRouteError(error, res);
  }
};

/**
 * Success response helper for consistent API responses
 */
export const sendSuccessResponse = (
  res: Response,
  data: any,
  message: string = "Operation successful",
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    message,
    data,
    statusCode
  });
};

/**
 * Paginated response helper
 */
export const sendPaginatedResponse = (
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number,
  message: string = "Data retrieved successfully"
): void => {
  res.status(200).json({
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    statusCode: 200
  });
};