/**
 * @module clients/base/http-client
 * @description Base HTTP client with retry, timeout, and SSRF protection
 */

import {
  N8nApiError,
  N8nConnectionError,
  SsrfProtectionError,
} from '../../errors/n8n-errors.js';
import { validateUrl } from '../../utils/url.js';
import {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_HEADERS,
  N8N_API_KEY_HEADER,
  N8N_API_BASE_PATH,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
} from '../../constants/api.js';
import { API_ERRORS } from '../../constants/errors.js';

// =============================================================================
// Types
// =============================================================================

export interface HttpClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: string;
  headers?: Record<string, string>;
  timeout?: number;
  skipRetry?: boolean;
}

// =============================================================================
// Retry Logic
// =============================================================================

/** Status codes that should trigger a retry */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoff(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// HTTP Client Class
// =============================================================================

/**
 * Base HTTP client with retry logic, timeout, and SSRF protection
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Request timeouts via AbortController
 * - SSRF protection via URL validation
 * - Proper error wrapping
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelay = config.retryDelay ?? DEFAULT_RETRY_DELAY_MS;
  }

  /**
   * Get the full API URL for an endpoint
   */
  getApiUrl(): string {
    return this.baseUrl;
  }

  /**
   * Make an authenticated request to the API
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${N8N_API_BASE_PATH}${endpoint}`;
    const method = options.method ?? 'GET';
    const timeout = options.timeout ?? this.timeout;

    // Validate URL for SSRF protection
    const urlValidation = validateUrl(fullUrl);
    if (!urlValidation.valid) {
      throw new SsrfProtectionError(`SSRF Protection: ${urlValidation.error}`, {
        blockedUrl: fullUrl,
        reason: urlValidation.error ?? 'URL validation failed',
      });
    }

    // Build headers
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      [N8N_API_KEY_HEADER]: this.apiKey,
      ...options.headers,
    };

    // Execute with retry
    const maxAttempts = options.skipRetry ? 1 : this.maxRetries;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.executeRequest<T>(fullUrl, method, headers, options.body, timeout, endpoint);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry if it's a client error (4xx except retryable ones)
        if (error instanceof N8nApiError) {
          if (!RETRYABLE_STATUS_CODES.has(error.statusCode)) {
            throw error;
          }
        }

        // Don't retry SSRF errors
        if (error instanceof SsrfProtectionError) {
          throw error;
        }

        // Wait before retry (except on last attempt)
        if (attempt < maxAttempts - 1) {
          const delay = calculateBackoff(attempt, this.retryDelay);
          await sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw lastError ?? new Error('Request failed after all retries');
  }

  /**
   * Execute a single request with timeout
   */
  private async executeRequest<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: string | undefined,
    timeout: number,
    endpoint: string
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;
        let responseBody: unknown;

        try {
          const errorJson = JSON.parse(errorText) as { message?: string };
          responseBody = errorJson;
          const message = errorJson.message ?? errorText;

          // Check for license-related errors
          if (message.toLowerCase().includes('license')) {
            errorMessage = `${API_ERRORS.LICENSE_REQUIRED}. Error: ${message}`;
          } else {
            errorMessage = message;
          }
        } catch {
          errorMessage = errorText;
        }

        throw new N8nApiError(errorMessage, {
          statusCode: response.status,
          endpoint,
          method,
          responseBody,
        });
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw known errors
      if (error instanceof N8nApiError || error instanceof SsrfProtectionError) {
        throw error;
      }

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new N8nConnectionError(`Request timeout after ${timeout}ms`, {
          url,
          reason: 'Request timed out',
          isTimeout: true,
        });
      }

      // Wrap other errors
      const cause = error instanceof Error ? error : undefined;
      throw new N8nConnectionError(
        `Failed to connect: ${cause?.message ?? 'Unknown error'}`,
        {
          url,
          reason: cause?.message ?? 'Unknown error',
          isTimeout: false,
          cause,
        }
      );
    }
  }
}
