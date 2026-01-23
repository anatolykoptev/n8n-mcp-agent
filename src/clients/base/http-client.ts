/**
 * @module clients/base/http-client
 * @description Base HTTP client with retry, timeout, and SSRF protection
 *
 * @architecture Keep this file focused on core HTTP operations (~200 lines).
 * - retry.ts — retry logic, backoff calculations
 * - auth.ts — login, session cookie handling
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
} from '../../constants/api.js';
import { API_ERRORS } from '../../constants/errors.js';
import { withRetry } from './retry.js';
import { login as performLogin } from './auth.js';

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

export interface RestRequestOptions extends RequestOptions {
  /** Session cookie for internal REST API */
  sessionCookie?: string;
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
   * Get the base API URL
   */
  getApiUrl(): string {
    return this.baseUrl;
  }

  /**
   * Make an authenticated request to the public API
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${N8N_API_BASE_PATH}${endpoint}`;
    const timeout = options.timeout ?? this.timeout;

    // Validate URL for SSRF protection
    this.validateSsrf(fullUrl);

    // Build headers with API key
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      [N8N_API_KEY_HEADER]: this.apiKey,
      ...options.headers,
    };

    // Execute with retry
    return withRetry(
      () => this.executeRequest<T>(fullUrl, options.method ?? 'GET', headers, options.body, timeout, endpoint),
      {
        maxAttempts: this.maxRetries,
        baseDelay: this.retryDelay,
        skipRetry: options.skipRetry,
      }
    );
  }

  /**
   * Make a request to internal REST API (session-based auth)
   * Used for endpoints not available in public API, like GET /rest/credentials
   */
  async requestRest<T>(endpoint: string, options: RestRequestOptions = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}/rest${endpoint}`;
    const timeout = options.timeout ?? this.timeout;

    // Validate URL for SSRF protection
    this.validateSsrf(fullUrl);

    // Build headers with session cookie (no API key)
    // browser-id is required by n8n for REST API authentication
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      'browser-id': 'mcp-agent',
      ...options.headers,
    };

    if (options.sessionCookie) {
      headers['Cookie'] = options.sessionCookie;
    }

    // Execute with retry
    return withRetry(
      () => this.executeRequest<T>(fullUrl, options.method ?? 'GET', headers, options.body, timeout, endpoint),
      {
        maxAttempts: this.maxRetries,
        baseDelay: this.retryDelay,
        skipRetry: options.skipRetry,
      }
    );
  }

  /**
   * Login to n8n and return session cookie
   */
  async login(email: string, password: string): Promise<string> {
    return performLogin({
      baseUrl: this.baseUrl,
      email,
      password,
      timeout: this.timeout,
    });
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Validate URL for SSRF protection
   */
  private validateSsrf(url: string): void {
    const validation = validateUrl(url);
    if (!validation.valid) {
      throw new SsrfProtectionError(`SSRF Protection: ${validation.error}`, {
        blockedUrl: url,
        reason: validation.error ?? 'URL validation failed',
      });
    }
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
        throw await this.createApiError(response, endpoint, method);
      }

      // Handle 204 No Content
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

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new N8nConnectionError(`Request timeout after ${timeout}ms`, {
          url,
          reason: 'Request timed out',
          isTimeout: true,
        });
      }

      // Wrap unknown errors
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

  /**
   * Create API error from response
   */
  private async createApiError(
    response: Response,
    endpoint: string,
    method: string
  ): Promise<N8nApiError> {
    const errorText = await response.text();
    let errorMessage: string;
    let responseBody: unknown;

    try {
      const errorJson = JSON.parse(errorText) as { message?: string };
      responseBody = errorJson;
      const message = errorJson.message ?? errorText;

      // Check for license-related errors
      errorMessage = message.toLowerCase().includes('license')
        ? `${API_ERRORS.LICENSE_REQUIRED}. Error: ${message}`
        : message;
    } catch {
      errorMessage = errorText;
    }

    return new N8nApiError(errorMessage, {
      statusCode: response.status,
      endpoint,
      method,
      responseBody,
    });
  }
}
