/**
 * @module clients/base/auth
 * @description n8n authentication utilities (login, session cookies)
 */

import { N8nApiError, N8nConnectionError, SsrfProtectionError } from '../../errors/n8n-errors.js';
import { validateUrl } from '../../utils/url.js';
import { DEFAULT_HEADERS } from '../../constants/api.js';

// =============================================================================
// Types
// =============================================================================

export interface LoginOptions {
  baseUrl: string;
  email: string;
  password: string;
  timeout: number;
}

// =============================================================================
// Cookie Parsing
// =============================================================================

/**
 * Parse session cookie from Set-Cookie header
 *
 * n8n uses 'n8n-auth' cookie for session authentication.
 * Falls back to first cookie if n8n-auth not found.
 */
export function parseSessionCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) {
    return null;
  }

  // Try n8n-auth cookie first (standard n8n session cookie)
  const sessionMatch = setCookieHeader.match(/n8n-auth=([^;]+)/);
  if (sessionMatch) {
    return `n8n-auth=${sessionMatch[1]}`;
  }

  // Fallback to first cookie
  const fallbackMatch = setCookieHeader.match(/([^=]+)=([^;]+)/);
  if (fallbackMatch) {
    return `${fallbackMatch[1]}=${fallbackMatch[2]}`;
  }

  return null;
}

// =============================================================================
// Login
// =============================================================================

/**
 * Login to n8n and return session cookie
 *
 * @param options - Login configuration
 * @returns Session cookie string for REST API requests
 */
export async function login(options: LoginOptions): Promise<string> {
  const { baseUrl, email, password, timeout } = options;
  const fullUrl = `${baseUrl}/rest/login`;

  // Validate URL for SSRF protection
  const urlValidation = validateUrl(fullUrl);
  if (!urlValidation.valid) {
    throw new SsrfProtectionError(`SSRF Protection: ${urlValidation.error}`, {
      blockedUrl: fullUrl,
      reason: urlValidation.error ?? 'URL validation failed',
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ emailOrLdapLoginId: email, password }),
      signal: controller.signal,
      credentials: 'include',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new N8nApiError(errorText, {
        statusCode: response.status,
        endpoint: '/rest/login',
        method: 'POST',
      });
    }

    // Extract session cookie
    const setCookie = response.headers.get('set-cookie');
    const sessionCookie = parseSessionCookie(setCookie);

    if (!sessionCookie) {
      throw new N8nApiError('No session cookie returned from login', {
        statusCode: 200,
        endpoint: '/rest/login',
        method: 'POST',
      });
    }

    return sessionCookie;
  } catch (error) {
    clearTimeout(timeoutId);

    // Re-throw known errors
    if (error instanceof N8nApiError || error instanceof SsrfProtectionError) {
      throw error;
    }

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new N8nConnectionError(`Login timeout after ${timeout}ms`, {
        url: fullUrl,
        reason: 'Request timed out',
        isTimeout: true,
      });
    }

    // Wrap unknown errors
    const cause = error instanceof Error ? error : undefined;
    throw new N8nConnectionError(
      `Login failed: ${cause?.message ?? 'Unknown error'}`,
      {
        url: fullUrl,
        reason: cause?.message ?? 'Unknown error',
        isTimeout: false,
        cause,
      }
    );
  }
}
