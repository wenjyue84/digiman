import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  parseApiError, 
  createErrorToast, 
  extractDetailedError, 
  apiRequestWithDetailedErrors,
  type DetailedError 
} from '../client/src/lib/errorHandler';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.MockedFunction<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<any>
>;
global.fetch = mockFetch as unknown as typeof fetch;

// Mock browser globals in Node test environment
Object.defineProperty(global, 'window', {
  value: { location: { href: 'http://localhost:3000/test' } },
  writable: true,
  configurable: true,
});
Object.defineProperty(global, 'navigator', {
  value: {},
  writable: true,
  configurable: true,
});

// Mock navigator for clipboard operations
Object.assign((global as any).navigator, {
  userAgent: 'Jest Test Environment',
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock window.location
Object.defineProperty((global as any).window, 'location', {
  value: {
    href: 'http://localhost:3000/test',
  },
  writable: true,
});

describe('Enhanced Error Handling System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set NODE_ENV to development for testing debug features
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseApiError', () => {
    it('should parse Response object with JSON error', async () => {
      const mockResponse = new Response(
        JSON.stringify({
          message: 'Validation failed',
          details: 'Name is required',
          solution: 'Please provide a valid name',
          errorCode: 'VALIDATION_ERROR'
        }),
        { 
          status: 400,
          statusText: 'Bad Request'
        }
      );

      const detailedError = await parseApiError(mockResponse, '/api/test', 'POST', { test: 'data' });

      expect(detailedError.message).toBe('Validation failed');
      expect(detailedError.details).toBe('Name is required');
      expect(detailedError.solution).toBe('Please provide a valid name');
      expect(detailedError.errorCode).toBe('VALIDATION_ERROR');
      expect(detailedError.statusCode).toBe(400);
      expect(detailedError.endpoint).toBe('/api/test');
      expect(detailedError.debugInfo?.method).toBe('POST');
      expect(detailedError.debugInfo?.requestData).toEqual({ test: 'data' });
    });

    it('should parse Response object with non-JSON error', async () => {
      const mockResponse = new Response('Server Error', {
        status: 500,
        statusText: 'Internal Server Error'
      });

      const detailedError = await parseApiError(mockResponse, '/api/test');

      expect(detailedError.message).toBe('Server Error');
      expect(detailedError.statusCode).toBe(500);
      expect(detailedError.debugInfo?.responseData).toBe('Server Error');
    });

    it('should parse standard Error object', async () => {
      const error = new Error('Network connection failed');
      const detailedError = await parseApiError(error, '/api/test');

      expect(detailedError.message).toBe('Network connection failed');
      expect(detailedError.endpoint).toBe('/api/test');
      expect(detailedError.debugInfo?.timestamp).toBeDefined();
      expect(detailedError.debugInfo?.userAgent).toBe('Jest Test Environment');
      expect(detailedError.debugInfo?.url).toBe('http://localhost:3000/test');
    });

    it('should parse Error with status code format', async () => {
      const error = new Error('404: Resource not found');
      const detailedError = await parseApiError(error);

      expect(detailedError.message).toBe('Endpoint Not Found');
      expect(detailedError.statusCode).toBe(404);
    });

    it('should handle string errors', async () => {
      const detailedError = await parseApiError('Simple error message');

      expect(detailedError.message).toBe('Simple error message');
      expect(detailedError.debugInfo).toBeDefined();
    });

    it('should handle object errors', async () => {
      const errorObj = {
        message: 'Object error',
        status: 409,
        details: 'Conflict detected',
        solution: 'Try again later'
      };

      const detailedError = await parseApiError(errorObj);

      expect(detailedError.message).toBe('Conflict Error');
      expect(detailedError.statusCode).toBe(409);
      expect(detailedError.details).toBe('The requested action conflicts with the current state.');
      expect(detailedError.solution).toBe('Check if the resource is already in use or refresh the page to get the latest state.');
    });
  });

  describe('enhanceErrorWithContext', () => {
    it('should enhance 401 errors with authentication context', async () => {
      const mockResponse = new Response('', { status: 401 });
      const detailedError = await parseApiError(mockResponse);

      expect(detailedError.message).toBe('Authentication Required');
      expect(detailedError.details).toBe("Your session has expired or you're not logged in.");
      expect(detailedError.solution).toBe('Please log in again to continue.');
      expect(detailedError.errorCode).toBe('AUTH_REQUIRED');
    });

    it('should enhance 403 errors with permission context', async () => {
      const mockResponse = new Response('', { status: 403 });
      const detailedError = await parseApiError(mockResponse);

      expect(detailedError.message).toBe('Access Forbidden');
      expect(detailedError.details).toBe("You don't have permission to perform this action.");
      expect(detailedError.errorCode).toBe('ACCESS_FORBIDDEN');
    });

    it('should enhance 404 errors with endpoint context', async () => {
      const mockResponse = new Response('', { status: 404 });
      const detailedError = await parseApiError(mockResponse, '/api/test-endpoint');

      expect(detailedError.message).toBe('Endpoint Not Found');
      expect(detailedError.details).toBe('The API endpoint /api/test-endpoint was not found on the server.');
      expect(detailedError.errorCode).toBe('ENDPOINT_NOT_FOUND');
    });

    it('should enhance 422 validation errors', async () => {
      const mockResponse = new Response('', { status: 422 });
      const detailedError = await parseApiError(mockResponse);

      expect(detailedError.message).toBe('Validation Error');
      expect(detailedError.details).toBe('The submitted data failed server validation.');
      expect(detailedError.solution).toBe('Please check your input and try again.');
      expect(detailedError.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should enhance 500 server errors', async () => {
      const mockResponse = new Response('', { status: 500 });
      const detailedError = await parseApiError(mockResponse);

      expect(detailedError.message).toBe('Server Error');
      expect(detailedError.details).toBe('An internal server error occurred.');
      expect(detailedError.solution).toBe('This is a server-side issue. Please try again in a moment or contact support.');
      expect(detailedError.errorCode).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should enhance network errors', async () => {
      const networkError = new Error('Failed to fetch');
      const detailedError = await parseApiError(networkError);

      expect(detailedError.message).toBe('Connection Failed');
      expect(detailedError.details).toBe('Unable to connect to the server. This could be a network issue or the server may be down.');
      expect(detailedError.solution).toBe('Check your internet connection and ensure the development server is running (npm run dev).');
      expect(detailedError.errorCode).toBe('CONNECTION_FAILED');
    });

    it('should enhance guest token endpoint errors', async () => {
      const mockResponse = new Response('', { status: 400 });
      const detailedError = await parseApiError(mockResponse, '/api/guest-tokens');

      expect(detailedError.details).toBe('The guest token creation failed due to invalid data or capsule unavailability.');
      expect(detailedError.solution).toBe('Check if the selected capsule is available and all required fields are filled correctly.');
    });

    it('should enhance guest check-in endpoint errors', async () => {
      const mockResponse = new Response('', { status: 400 });
      const detailedError = await parseApiError(mockResponse, '/api/guests/checkin');

      expect(detailedError.details).toBe('Guest check-in failed due to validation errors or capsule conflicts.');
      expect(detailedError.solution).toBe('Verify all guest information is correct and the selected capsule is available.');
    });
  });

  describe('createErrorToast', () => {
    it('should create basic error toast', () => {
      const error: DetailedError = {
        message: 'Test error',
        debugInfo: {
          timestamp: '2023-01-01T00:00:00.000Z',
          userAgent: 'Test',
          url: 'http://test.com'
        }
      };

      const toast = createErrorToast(error);

      expect(toast.title).toBe('Operation Failed');
      expect(toast.description).toBe('Test error');
      expect(toast.variant).toBe('destructive');
    });

    it('should create authentication error toast', () => {
      const error: DetailedError = {
        message: 'Authentication Required',
        details: 'Session expired',
        solution: 'Please log in again',
        statusCode: 401,
        errorCode: 'AUTH_REQUIRED',
        debugInfo: {
          timestamp: '2023-01-01T00:00:00.000Z',
          userAgent: 'Test',
          url: 'http://test.com'
        }
      };

      const toast = createErrorToast(error);

      expect(toast.title).toBe('Authentication Required');
      expect(toast.description).toContain('Authentication Required');
      expect(toast.description).toContain('Details: Session expired');
      expect(toast.description).toContain('Solution: Please log in again');
    });

    it('should include debug information in development mode', () => {
      const error: DetailedError = {
        message: 'Test error',
        statusCode: 400,
        errorCode: 'TEST_ERROR',
        endpoint: '/api/test',
        debugInfo: {
          timestamp: '2023-01-01T00:00:00.000Z',
          userAgent: 'Test',
          url: 'http://test.com',
          method: 'POST',
          requestData: { test: 'data' }
        }
      };

      const toast = createErrorToast(error);

      expect(toast.debugDetails).toContain('Debug Info:');
      expect(toast.debugDetails).toContain('Timestamp: 2023-01-01T00:00:00.000Z');
      expect(toast.debugDetails).toContain('Endpoint: /api/test');
      expect(toast.debugDetails).toContain('Status: 400');
      expect(toast.debugDetails).toContain('Error Code: TEST_ERROR');
      expect(toast.debugDetails).toContain('Request: POST /api/test');
      expect(toast.debugDetails).toContain('"test": "data"');
    });

    it('should not include debug information in production mode', () => {
      process.env.NODE_ENV = 'production';

      const error: DetailedError = {
        message: 'Test error',
        debugInfo: {
          timestamp: '2023-01-01T00:00:00.000Z',
          userAgent: 'Test',
          url: 'http://test.com'
        }
      };

      const toast = createErrorToast(error);

      expect(toast.debugDetails).toBe('');
    });
  });

  describe('extractDetailedError', () => {
    it('should extract detailed error from JSON string', () => {
      const detailedErrorJson = JSON.stringify({
        message: 'Test error',
        details: 'Error details',
        statusCode: 400,
        errorCode: 'TEST_ERROR',
        debugInfo: {
          timestamp: '2023-01-01T00:00:00.000Z',
          userAgent: 'Test',
          url: 'http://test.com'
        }
      });

      const error = new Error(detailedErrorJson);
      const extracted = extractDetailedError(error);

      expect(extracted.message).toBe('Test error');
      expect(extracted.details).toBe('Error details');
      expect(extracted.statusCode).toBe(400);
      expect(extracted.errorCode).toBe('TEST_ERROR');
    });

    it('should create fallback error for invalid JSON', () => {
      const error = new Error('Simple error message');
      const extracted = extractDetailedError(error);

      expect(extracted.message).toBe('Simple error message');
      expect(extracted.debugInfo?.timestamp).toBeDefined();
      expect(extracted.debugInfo?.userAgent).toBe('Jest Test Environment');
    });

    it('should handle non-Error objects', () => {
      const errorObj = { message: 'Object error' };
      const extracted = extractDetailedError(errorObj);

      expect(extracted.message).toBe('Object error');
      expect(extracted.debugInfo).toBeDefined();
    });

    it('should handle undefined/null errors', () => {
      const extracted = extractDetailedError(null);

      expect(extracted.message).toBe('null');
      expect(extracted.debugInfo).toBeDefined();
    });
  });

  describe('apiRequestWithDetailedErrors', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('test-token');
    });

    it('should make successful API request', async () => {
      const mockResponseData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponseData),
      });

      const response = await apiRequestWithDetailedErrors('GET', 'http://localhost:5000/api/test');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/api/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
        },
        body: undefined,
        credentials: 'include',
      });
      expect(response.ok).toBe(true);
    });

    it('should make POST request with data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const testData = { name: 'Test' };
      await apiRequestWithDetailedErrors('POST', 'http://localhost:5000/api/test', testData);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/api/test', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
        credentials: 'include',
      });
    });

    it('should handle API error responses', async () => {
      const errorResponse = {
        message: 'Validation failed',
        details: 'Name is required',
        solution: 'Please provide a valid name'
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 400,
          statusText: 'Bad Request',
        }) as any
      );

      try {
        await apiRequestWithDetailedErrors('POST', 'http://localhost:5000/api/test', { data: 'test' });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (!(error instanceof Error)) {
          throw error;
        }
        const parsedError = JSON.parse(error.message);
        expect(parsedError.message).toBe('Validation failed');
        expect(parsedError.details).toBe('Name is required');
        expect(parsedError.solution).toBe('Please provide a valid name');
        expect(parsedError.statusCode).toBe(400);
        expect(parsedError.endpoint).toBe('http://localhost:5000/api/test');
        expect(parsedError.debugInfo.method).toBe('POST');
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      try {
        await apiRequestWithDetailedErrors('GET', 'http://localhost:5000/api/test');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (!(error instanceof Error)) {
          throw error;
        }
        const parsedError = JSON.parse(error.message);
        expect(parsedError.message).toBe('Connection Failed');
        expect(parsedError.errorCode).toBe('CONNECTION_FAILED');
        expect(parsedError.solution).toBe('Check your internet connection and ensure the development server is running (npm run dev).');
      }
    });

    it('should work without authentication token', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await apiRequestWithDetailedErrors('GET', 'http://localhost:5000/api/test');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/api/test', {
        method: 'GET',
        headers: {},
        body: undefined,
        credentials: 'include',
      });
    });
  });

  describe('Integration Tests', () => {
    it('should provide comprehensive error information for guest token creation', async () => {
      const errorResponse = {
        message: 'Capsule not available',
        details: 'Capsule C01 is already occupied',
        solution: 'Please select a different capsule',
        errorCode: 'CAPSULE_OCCUPIED'
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 409,
          statusText: 'Conflict',
        }) as any
      );

      try {
        await apiRequestWithDetailedErrors(
          'POST', 
          'http://localhost:5000/api/guest-tokens',
          { capsuleNumber: 'C01', expiresIn: 2 }
        );
      } catch (error) {
        const detailedError = extractDetailedError(error);
        const toast = createErrorToast(detailedError);

        expect(toast.title).toBe('Operation Failed');
        expect(toast.description).toContain('Conflict Error');
        expect(toast.description).toContain('The requested action conflicts with the current state');
        expect(toast.debugDetails).toContain('Status: 409');
        expect(toast.debugDetails).toContain('POST http://localhost:5000/api/guest-tokens');
      }
    });

    it('should provide comprehensive error information for guest check-in', async () => {
      const errorResponse = {
        message: 'Invalid guest data',
        details: 'Email format is invalid',
        solution: 'Please enter a valid email address'
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 422,
          statusText: 'Unprocessable Entity',
        }) as any
      );

      try {
        await apiRequestWithDetailedErrors(
          'POST', 
          'http://localhost:5000/api/guests/checkin',
          { name: 'Test', email: 'invalid-email' }
        );
      } catch (error) {
        const detailedError = extractDetailedError(error);
        const toast = createErrorToast(detailedError);

        expect(toast.title).toBe('Operation Failed');
        expect(toast.description).toContain('Validation Error');
        expect(toast.description).toContain('The submitted data failed server validation');
        expect(toast.description).toContain('Please check your input and try again');
      }
    });
  });
});
