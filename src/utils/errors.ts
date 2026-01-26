/**
 * Error Classification Utilities
 * 
 * Distinguish between transient errors (should retry) and permanent errors (skip retry).
 * Used by the RSS loader's retry logic to make intelligent decisions about retrying failed feeds.
 */

export type ErrorType = 'transient' | 'permanent' | 'unknown';

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  originalError: Error;
}

/**
 * Classify an error as transient (retry), permanent (skip), or unknown
 * 
 * Transient errors (should retry):
 * - Network timeouts (ETIMEDOUT, ECONNRESET)
 * - Server errors (5xx status codes)
 * - Rate limiting (429 status code)
 * - Temporary DNS failures (ENOTFOUND with retry potential)
 * 
 * Permanent errors (don't retry):
 * - Not found (404)
 * - Forbidden (403)
 * - Unauthorized (401)
 * - Bad request (400)
 * - Parse errors (malformed XML/JSON)
 */
export function classifyError(error: Error): ClassifiedError {
  const message = error.message.toLowerCase();
  
  // Extract HTTP status code if present
  const statusMatch = error.message.match(/status code (\d+)/i);
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined;
  
  // Check for HTTP status codes
  if (statusCode) {
    if (statusCode >= 500 && statusCode < 600) {
      // 5xx: Server errors (transient)
      return {
        type: 'transient',
        message: `Server error (${statusCode})`,
        statusCode,
        originalError: error,
      };
    }
    
    if (statusCode === 429) {
      // 429: Rate limiting (transient, should back off)
      return {
        type: 'transient',
        message: 'Rate limited',
        statusCode,
        originalError: error,
      };
    }
    
    if (statusCode === 404 || statusCode === 403 || statusCode === 401 || statusCode === 400) {
      // 4xx: Client errors (permanent)
      return {
        type: 'permanent',
        message: `Client error (${statusCode})`,
        statusCode,
        originalError: error,
      };
    }
  }
  
  // Check for network timeouts
  if (
    message.includes('etimedout') ||
    message.includes('timeout') ||
    message.includes('timed out')
  ) {
    return {
      type: 'transient',
      message: 'Network timeout',
      originalError: error,
    };
  }
  
  // Check for connection issues
  if (
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('connection reset')
  ) {
    return {
      type: 'transient',
      message: 'Connection error',
      originalError: error,
    };
  }
  
  // Check for DNS failures
  if (message.includes('enotfound') || message.includes('getaddrinfo')) {
    return {
      type: 'transient',
      message: 'DNS resolution failed',
      originalError: error,
    };
  }
  
  // Check for parse errors (permanent)
  if (
    message.includes('parse error') ||
    message.includes('invalid xml') ||
    message.includes('invalid json') ||
    message.includes('unexpected token')
  ) {
    return {
      type: 'permanent',
      message: 'Parse error',
      originalError: error,
    };
  }
  
  // Unknown error type (treat as transient to be safe, but limit retries)
  return {
    type: 'unknown',
    message: error.message,
    originalError: error,
  };
}

/**
 * Check if an error should be retried
 */
export function shouldRetry(error: Error): boolean {
  const classified = classifyError(error);
  return classified.type === 'transient' || classified.type === 'unknown';
}

/**
 * Get a human-readable error message for logging
 */
export function getErrorMessage(error: Error): string {
  const classified = classifyError(error);
  return classified.statusCode 
    ? `${classified.message} (${classified.statusCode})`
    : classified.message;
}
