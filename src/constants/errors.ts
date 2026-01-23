/**
 * @module constants/errors
 * @description Error message constants
 */

/** Error messages for client operations */
export const CLIENT_ERRORS = {
  NOT_INITIALIZED: 'Client not initialized. Please run init-n8n first.',
  CONNECTION_FAILED: 'Failed to connect to n8n instance',
  INVALID_CLIENT_ID: 'Invalid client ID format',
} as const;

/** Error messages for security */
export const SECURITY_ERRORS = {
  SSRF_BLOCKED: 'URL blocked by SSRF protection: internal/private addresses not allowed',
  HTTPS_REQUIRED: 'HTTPS is required for production use',
  INVALID_PROTOCOL: 'Only HTTP and HTTPS protocols are allowed',
} as const;

/** Error messages for API responses */
export const API_ERRORS = {
  UNKNOWN_ERROR: 'An unknown error occurred',
  LICENSE_REQUIRED: 'This operation requires an n8n Enterprise license',
  RATE_LIMITED: 'Rate limit exceeded. Please try again later.',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Authentication failed. Check your API key.',
  FORBIDDEN: 'You do not have permission to perform this action',
} as const;
