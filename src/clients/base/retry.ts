/**
 * @module clients/base/retry
 * @description Retry logic with exponential backoff and jitter
 */

import { MAX_RETRY_DELAY_MS } from '../../constants/api.js';
import { N8nApiError, SsrfProtectionError } from '../../errors/n8n-errors.js';

// =============================================================================
// Types
// =============================================================================

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  /** Skip retry entirely */
  skipRetry?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Status codes that should trigger a retry */
export const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

// =============================================================================
// Backoff Utilities
// =============================================================================

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoff(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Retry HOF
// =============================================================================

/**
 * Execute a function with retry logic
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const maxAttempts = options.skipRetry ? 1 : options.maxAttempts;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry client errors (4xx except retryable ones)
      if (error instanceof N8nApiError) {
        if (!RETRYABLE_STATUS_CODES.has(error.statusCode)) {
          throw error;
        }
      }

      // Never retry SSRF errors
      if (error instanceof SsrfProtectionError) {
        throw error;
      }

      // Wait before retry (except on last attempt)
      if (attempt < maxAttempts - 1) {
        const delay = calculateBackoff(attempt, options.baseDelay);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Request failed after all retries');
}
