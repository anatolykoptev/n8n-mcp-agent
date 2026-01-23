/**
 * @module clients/base
 * @description Base HTTP client and utilities for n8n API communication
 */

// HTTP Client
export {
  HttpClient,
  type HttpClientConfig,
  type RequestOptions,
  type RestRequestOptions,
} from './http-client.js';

// Retry utilities
export {
  withRetry,
  calculateBackoff,
  sleep,
  RETRYABLE_STATUS_CODES,
  type RetryOptions,
} from './retry.js';

// Auth utilities
export {
  login,
  parseSessionCookie,
  type LoginOptions,
} from './auth.js';
