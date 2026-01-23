/**
 * Custom error classes for n8n MCP Server
 *
 * Provides structured error handling with proper typing,
 * contextual information, and serialization support.
 */

/**
 * Options for error construction
 */
interface N8nErrorOptions {
  cause?: Error;
}

/**
 * Base error class for all n8n-related errors.
 * Provides common functionality and structure.
 */
export abstract class N8nBaseError extends Error {
  /**
   * Error name for identification
   */
  abstract readonly name: string;

  /**
   * Error code for programmatic handling
   */
  abstract readonly code: string;

  /**
   * Timestamp when the error occurred
   */
  readonly timestamp: Date;

  /**
   * Original error that caused this error
   */
  readonly cause?: Error;

  constructor(message: string, options?: N8nErrorOptions) {
    super(message);
    this.timestamp = new Date();
    this.cause = options?.cause;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes error to a plain object for logging/transmission
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message,
    };
  }
}

/**
 * Error thrown when n8n API returns an error response.
 *
 * @example
 * ```typescript
 * throw new N8nApiError('Failed to create workflow', {
 *   statusCode: 400,
 *   endpoint: '/workflows',
 *   method: 'POST',
 *   responseBody: { message: 'Invalid workflow structure' },
 * });
 * ```
 */
export class N8nApiError extends N8nBaseError {
  readonly name = 'N8nApiError' as const;
  readonly code = 'N8N_API_ERROR' as const;

  /**
   * HTTP status code returned by n8n API
   */
  readonly statusCode: number;

  /**
   * API endpoint that was called
   */
  readonly endpoint: string;

  /**
   * HTTP method used
   */
  readonly method: string;

  /**
   * Response body from n8n API (if available)
   */
  readonly responseBody?: unknown;

  /**
   * Request ID for tracing (if available)
   */
  readonly requestId?: string;

  constructor(
    message: string,
    options: {
      statusCode: number;
      endpoint: string;
      method: string;
      responseBody?: unknown;
      requestId?: string;
      cause?: Error;
    }
  ) {
    super(message, options);
    this.statusCode = options.statusCode;
    this.endpoint = options.endpoint;
    this.method = options.method;
    this.responseBody = options.responseBody;
    this.requestId = options.requestId;
  }

  /**
   * Checks if the error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Checks if the error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * Checks if the error is retryable
   */
  isRetryable(): boolean {
    return (
      this.statusCode === 429 || // Rate limited
      this.statusCode === 503 || // Service unavailable
      this.statusCode === 502 || // Bad gateway
      this.statusCode === 504 // Gateway timeout
    );
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      method: this.method,
      responseBody: this.responseBody,
      requestId: this.requestId,
    };
  }
}

/**
 * Error thrown when connection to n8n instance fails.
 *
 * @example
 * ```typescript
 * throw new N8nConnectionError('Failed to connect to n8n instance', {
 *   url: 'https://n8n.example.com',
 *   reason: 'ECONNREFUSED',
 * });
 * ```
 */
export class N8nConnectionError extends N8nBaseError {
  readonly name = 'N8nConnectionError' as const;
  readonly code = 'N8N_CONNECTION_ERROR' as const;

  /**
   * URL of the n8n instance
   */
  readonly url: string;

  /**
   * Reason for connection failure
   */
  readonly reason: string;

  /**
   * Whether this is a timeout error
   */
  readonly isTimeout: boolean;

  /**
   * Connection attempt number (if retrying)
   */
  readonly attemptNumber?: number;

  constructor(
    message: string,
    options: {
      url: string;
      reason: string;
      isTimeout?: boolean;
      attemptNumber?: number;
      cause?: Error;
    }
  ) {
    super(message, options);
    this.url = options.url;
    this.reason = options.reason;
    this.isTimeout = options.isTimeout ?? false;
    this.attemptNumber = options.attemptNumber;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      url: this.url,
      reason: this.reason,
      isTimeout: this.isTimeout,
      attemptNumber: this.attemptNumber,
    };
  }
}

/**
 * Error thrown when SSRF (Server-Side Request Forgery) protection blocks a request.
 *
 * @example
 * ```typescript
 * throw new SsrfProtectionError('Blocked request to internal IP', {
 *   blockedUrl: 'http://192.168.1.1/api',
 *   reason: 'Private IP range not allowed',
 * });
 * ```
 */
export class SsrfProtectionError extends N8nBaseError {
  readonly name = 'SsrfProtectionError' as const;
  readonly code = 'SSRF_PROTECTION_ERROR' as const;

  /**
   * URL that was blocked
   */
  readonly blockedUrl: string;

  /**
   * Reason for blocking
   */
  readonly reason: string;

  /**
   * IP address that was blocked (if resolved)
   */
  readonly blockedIp?: string;

  constructor(
    message: string,
    options: {
      blockedUrl: string;
      reason: string;
      blockedIp?: string;
      cause?: Error;
    }
  ) {
    super(message, options);
    this.blockedUrl = options.blockedUrl;
    this.reason = options.reason;
    this.blockedIp = options.blockedIp;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      blockedUrl: this.blockedUrl,
      reason: this.reason,
      blockedIp: this.blockedIp,
    };
  }
}

