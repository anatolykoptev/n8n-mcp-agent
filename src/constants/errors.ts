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

/** Error messages for validation */
export const VALIDATION_ERRORS = {
  INVALID_URL: 'Invalid URL format',
  INVALID_API_KEY: 'API key is required and cannot be empty',
  INVALID_WORKFLOW_ID: 'Workflow ID is required',
  INVALID_EXECUTION_ID: 'Execution ID must be a positive integer',
  INVALID_TAG_ID: 'Tag ID is required',
  INVALID_PROJECT_ID: 'Project ID is required',
  INVALID_USER_ID: 'User ID or email is required',
  INVALID_VARIABLE_KEY: 'Variable key is required',
  INVALID_CREDENTIAL_TYPE: 'Credential type is required',
  WORKFLOW_NAME_REQUIRED: 'Workflow name is required',
  PROJECT_NAME_REQUIRED: 'Project name is required',
  TAG_NAME_REQUIRED: 'Tag name is required',
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

/** Error messages for tools */
export const TOOL_ERRORS = {
  UNKNOWN_TOOL: 'Unknown tool',
  INVALID_ARGUMENTS: 'Invalid arguments provided',
  HANDLER_NOT_FOUND: 'Handler not found for tool',
} as const;
