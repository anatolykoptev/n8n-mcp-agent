/**
 * n8n MCP Server - Custom Error Classes
 *
 * Provides structured error handling for all n8n-related operations.
 *
 * @example
 * ```typescript
 * import {
 *   N8nApiError,
 *   N8nConnectionError,
 *   N8nAuthenticationError,
 *   N8nValidationError,
 *   ClientNotInitializedError,
 *   SsrfProtectionError,
 *   isN8nError,
 * } from './errors';
 *
 * try {
 *   await client.getWorkflow(id);
 * } catch (error) {
 *   if (isN8nApiError(error) && error.isRetryable()) {
 *     // Retry logic
 *   }
 * }
 * ```
 */

export {
  // Base class
  N8nBaseError,
  // Error classes
  N8nApiError,
  N8nConnectionError,
  N8nAuthenticationError,
  N8nValidationError,
  ClientNotInitializedError,
  SsrfProtectionError,
  // Type guards
  isN8nError,
  isN8nApiError,
  isN8nConnectionError,
  isN8nAuthenticationError,
  isN8nValidationError,
  isClientNotInitializedError,
  isSsrfProtectionError,
} from './n8n-errors.js';
