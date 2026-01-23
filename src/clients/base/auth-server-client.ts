/**
 * @module clients/base/auth-server-client
 * @description Client for local auth-server (Chrome extension bridge)
 *
 * The auth-server runs on localhost:19847 and stores n8n credentials
 * pushed by the Chrome extension. This client reads those credentials.
 *
 * Security: Uses X-Auth-Token header for authentication
 */

const AUTH_SERVER_URL = 'http://127.0.0.1:19847';
const TIMEOUT_MS = 3000;

// Cached auth token
let authToken: string | null = null;

// =============================================================================
// Types
// =============================================================================

export interface AuthServerInstance {
  url: string;
  sessionCookie: string | null;
  apiKey: string | null;
  updatedAt?: string;
}

export interface AuthServerHealth {
  status: 'ok';
  storage: 'local';
  timestamp: string;
}

// =============================================================================
// Auth Token
// =============================================================================

/**
 * Get auth token from auth-server (localhost only endpoint)
 */
async function getAuthToken(): Promise<string | null> {
  if (authToken) return authToken;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${AUTH_SERVER_URL}/auth-secret`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      authToken = data.secret;
      return authToken;
    }
  } catch {
    // Auth server not running
  }

  return null;
}

/**
 * Make authenticated request to auth-server
 */
async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const response = await fetch(`${AUTH_SERVER_URL}${path}`, {
    ...options,
    signal: controller.signal,
    headers: {
      ...options.headers,
      ...(token ? { 'X-Auth-Token': token } : {}),
    },
  });

  clearTimeout(timeoutId);
  return response;
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * Check if auth-server is running
 */
export async function isAuthServerRunning(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${AUTH_SERVER_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// Get Credentials
// =============================================================================

/**
 * Get all instances from auth-server
 */
export async function getAllInstances(): Promise<Record<string, AuthServerInstance>> {
  try {
    const response = await authFetch('/instances');

    if (!response.ok) {
      return {};
    }

    return await response.json();
  } catch {
    return {};
  }
}

/**
 * Get credentials for a specific n8n instance URL
 */
export async function getInstanceCredentials(
  instanceUrl: string
): Promise<AuthServerInstance | null> {
  try {
    const encodedUrl = encodeURIComponent(instanceUrl);
    const response = await authFetch(`/instance/${encodedUrl}`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Get session cookie for an n8n instance
 * Returns null if auth-server unavailable or no cookie stored
 */
export async function getSessionCookie(instanceUrl: string): Promise<string | null> {
  const instance = await getInstanceCredentials(instanceUrl);
  return instance?.sessionCookie ?? null;
}

/**
 * Get API key for an n8n instance
 * Returns null if auth-server unavailable or no key stored
 */
export async function getApiKey(instanceUrl: string): Promise<string | null> {
  const instance = await getInstanceCredentials(instanceUrl);
  return instance?.apiKey ?? null;
}

// =============================================================================
// Auto-Enhancement
// =============================================================================

/**
 * Try to enhance client config with auth-server credentials
 *
 * If auth-server is running and has credentials for the given URL,
 * returns enhanced config. Otherwise returns original config unchanged.
 */
export async function enhanceWithAuthServer(config: {
  baseUrl: string;
  apiKey?: string;
  sessionCookie?: string;
}): Promise<{
  baseUrl: string;
  apiKey?: string;
  sessionCookie?: string;
  enhancedFromAuthServer: boolean;
}> {
  const instance = await getInstanceCredentials(config.baseUrl);

  if (!instance) {
    return { ...config, enhancedFromAuthServer: false };
  }

  return {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey || instance.apiKey || undefined,
    sessionCookie: config.sessionCookie || instance.sessionCookie || undefined,
    enhancedFromAuthServer: true,
  };
}

/**
 * Clear cached auth token (for testing or reconnection)
 */
export function clearAuthTokenCache(): void {
  authToken = null;
}
