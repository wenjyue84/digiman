import { Response } from "express";

/**
 * Standardized API response helpers.
 *
 * Every JSON response from the server should use one of these two functions
 * so that clients always receive the same envelope:
 *
 *   { success: boolean, message?: string, data?: any, error?: string }
 *
 * HTTP status codes are NOT changed by these helpers -- callers still choose
 * the status code that is semantically correct.
 */

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Send a standardized error response.
 *
 * @param res     Express Response object
 * @param status  HTTP status code (e.g. 400, 404, 500)
 * @param message Human-readable error description
 * @param details Optional extra context (validation errors, debug info, etc.)
 */
export function sendError(
  res: Response,
  status: number,
  message: string,
  details?: any,
): void {
  const body: ApiResponse = {
    success: false,
    error: message,
  };

  if (details !== undefined) {
    (body as any).details = details;
  }

  res.status(status).json(body);
}

/**
 * Send a standardized success response.
 *
 * @param res     Express Response object
 * @param data    Optional payload (object, array, primitive, etc.)
 * @param message Optional human-readable success description
 */
export function sendSuccess(
  res: Response,
  data?: any,
  message?: string,
): void {
  const body: ApiResponse = {
    success: true,
  };

  if (message !== undefined) {
    body.message = message;
  }

  if (data !== undefined) {
    body.data = data;
  }

  res.json(body);
}
