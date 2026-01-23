/**
 * @module constants/api
 * @description API constants and configuration
 */

/** n8n API version */
export const N8N_API_VERSION = 'v1';

/** n8n API base path */
export const N8N_API_BASE_PATH = `/api/${N8N_API_VERSION}`;

/** Default request timeout in milliseconds */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Maximum retry delay cap in milliseconds */
export const MAX_RETRY_DELAY_MS = 30_000;

/** Default maximum number of retries */
export const DEFAULT_MAX_RETRIES = 3;

/** Default retry delay in milliseconds */
export const DEFAULT_RETRY_DELAY_MS = 1_000;

/** HTTP headers for n8n API requests */
export const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

/** n8n API header for authentication */
export const N8N_API_KEY_HEADER = 'X-N8N-API-KEY';

/** Blocked hostnames for SSRF protection */
export const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
] as const;

/** Blocked IP ranges for SSRF protection (CIDR notation patterns) */
export const BLOCKED_IP_PATTERNS = [
  /^10\./,                           // 10.0.0.0/8
  /^192\.168\./,                     // 192.168.0.0/16
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^169\.254\./,                     // 169.254.0.0/16 (link-local)
  /^fc[0-9a-f]{2}:/i,                // fc00::/7 (IPv6 unique local)
  /^fe80:/i,                         // fe80::/10 (IPv6 link-local)
] as const;

/** Allowed protocols for n8n URLs */
export const ALLOWED_PROTOCOLS = ['https:', 'http:'] as const;
