/**
 * @module tools/helpers
 * @description Shared helpers and constants for MCP tool definitions
 */

import type { McpToolInputSchema } from '../types/mcp.js';

// =============================================================================
// Constants
// =============================================================================

/** Common note for JSON format requirement */
export const JSON_NOTE =
  'IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.';

/** Note for enterprise features */
export const ENTERPRISE_NOTE = 'NOTE: Requires n8n Enterprise license.';

// =============================================================================
// Property Helpers
// =============================================================================

/**
 * Create clientId property for tool input schema
 * @returns Property object with clientId field definition
 */
export function clientIdProperty(): McpToolInputSchema['properties'] {
  return {
    clientId: { type: 'string', description: 'Client ID from init-n8n' },
  };
}

/**
 * Create id property for tool input schema
 * @param description - Description for the id field (defaults to 'Resource ID')
 * @returns Property object with id field definition
 */
export function idProperty(description = 'Resource ID'): McpToolInputSchema['properties'] {
  return {
    id: { type: 'string', description },
  };
}
