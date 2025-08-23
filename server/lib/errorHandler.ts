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

export interface DetailedErrorResponse extends ErrorResponse {
  details?: string;
  solution?: string;
  endpoint?: string;
  errorCode?: string;
}

export const ErrorCodes = {
  DATABASE_TABLE_MISSING: 'DB_TABLE_MISSING',
  DATABASE_CONNECTION: 'DB_CONNECTION_ERROR', 
  MISSING_DEPENDENCIES: 'MISSING_DEPENDENCIES',
  SCHEMA_MIGRATION_REQUIRED: 'SCHEMA_MIGRATION_REQUIRED',
  AUTHENTICATION_FAILED: 'AUTH_FAILED',
  INVALID_REQUEST: 'INVALID_REQUEST'
} as const;

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

/**
 * Enhanced database error handler with detailed error messages and solutions
 */
export const handleDatabaseError = (error: any, endpoint: string, res: Response): void => {
  console.error(`Database error at ${endpoint}:`, error);
  
  let errorResponse: DetailedErrorResponse;
  
  // Detect specific PostgreSQL errors
  if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
    const tableName = extractTableName(error.message);
    errorResponse = createDatabaseTableMissingError(tableName, endpoint);
  }
  else if (error.message?.includes('connect ECONNREFUSED') || error.message?.includes('connection terminated')) {
    errorResponse = createDatabaseConnectionError(endpoint);
  }
  else if (error.message?.includes('authentication failed') || error.message?.includes('password authentication failed')) {
    errorResponse = createDatabaseAuthError(endpoint);
  }
  else if (error.code === 'ENOTFOUND') {
    errorResponse = createDatabaseHostError(endpoint);
  }
  else {
    errorResponse = createGenericDatabaseError(error.message || 'Unknown database error', endpoint);
  }
  
  res.status(500).json(errorResponse);
};

const extractTableName = (errorMessage: string): string => {
  const match = errorMessage.match(/relation "([^"]+)" does not exist/);
  return match ? match[1] : 'unknown_table';
};

const createDatabaseTableMissingError = (tableName: string, endpoint: string): DetailedErrorResponse => {
  return {
    message: `Database Table Missing: ${tableName}`,
    details: `The database table "${tableName}" does not exist in the PostgreSQL database. This is required for ${endpoint} to function properly.`,
    solution: `Run database migrations to create missing tables:\n1. Execute: npm run migrate\n2. Or run: node server/init-db.js\n3. Restart the application\n\nAlternatively, switch to Memory DB mode for testing.`,
    endpoint,
    errorCode: ErrorCodes.DATABASE_TABLE_MISSING,
    statusCode: 500
  };
};

const createDatabaseConnectionError = (endpoint: string): DetailedErrorResponse => {
  return {
    message: 'Database Connection Failed',
    details: `Cannot connect to PostgreSQL database. The database server may be offline or unreachable.`,
    solution: `Check database connection:\n1. Verify PostgreSQL service is running\n2. Check DATABASE_URL environment variable\n3. Verify network connectivity\n4. Switch to Memory DB mode for testing\n5. Restart Docker containers if using Docker`,
    endpoint,
    errorCode: ErrorCodes.DATABASE_CONNECTION,
    statusCode: 500
  };
};

const createDatabaseAuthError = (endpoint: string): DetailedErrorResponse => {
  return {
    message: 'Database Authentication Failed',
    details: `Invalid database credentials. Username or password incorrect.`,
    solution: `Fix database authentication:\n1. Check DATABASE_URL credentials\n2. Verify PostgreSQL user exists\n3. Reset password if needed\n4. Update environment variables\n5. Switch to Memory DB mode for testing`,
    endpoint,
    errorCode: ErrorCodes.AUTHENTICATION_FAILED,
    statusCode: 500
  };
};

const createDatabaseHostError = (endpoint: string): DetailedErrorResponse => {
  return {
    message: 'Database Host Not Found', 
    details: `Cannot resolve database hostname. DNS lookup failed.`,
    solution: `Fix database hostname:\n1. Check DATABASE_URL hostname\n2. Verify DNS resolution\n3. Use IP address instead of hostname\n4. Check network configuration\n5. Switch to Memory DB mode for testing`,
    endpoint,
    errorCode: ErrorCodes.DATABASE_CONNECTION,
    statusCode: 500
  };
};

const createGenericDatabaseError = (message: string, endpoint: string): DetailedErrorResponse => {
  return {
    message: 'Database Operation Failed',
    details: `Database error: ${message}`,
    solution: `Troubleshoot database issues:\n1. Check server logs for details\n2. Verify database schema is up to date\n3. Run database migrations\n4. Switch to Memory DB mode for testing\n5. Contact administrator if problem persists`,
    endpoint,
    errorCode: ErrorCodes.DATABASE_CONNECTION,
    statusCode: 500
  };
};

/**
 * Handle feature not implemented errors with helpful solutions
 */
export const handleFeatureNotImplementedError = (featureName: string, endpoint: string, res: Response): void => {
  const errorResponse: DetailedErrorResponse = {
    message: `Feature Not Available: ${featureName}`,
    details: `The ${featureName} feature requires database tables that are not yet implemented in the current database setup.`,
    solution: `Enable this feature:\n1. Run database migrations to create required tables\n2. Execute: npm run migrate\n3. Or manually create tables using schema.sql\n4. Switch to Memory DB mode for basic testing\n5. This feature will be available after proper database setup`,
    endpoint,
    errorCode: ErrorCodes.MISSING_DEPENDENCIES,
    statusCode: 501
  };
  
  res.status(501).json(errorResponse);
};