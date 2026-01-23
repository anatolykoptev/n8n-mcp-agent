/**
 * @module types/mcp
 * @description Type definitions for MCP (Model Context Protocol) responses
 */

import { CLIENT_ERRORS } from '../constants/errors.js';

// =============================================================================
// MCP Response Types
// =============================================================================

export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface McpResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}

export type McpContent = McpTextContent | McpImageContent | McpResourceContent;

export interface McpToolResult {
  content: McpContent[];
  isError?: boolean;
}

// =============================================================================
// Tool Definition Types
// =============================================================================

export interface McpToolProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: {
    type: string;
    description?: string;
    enum?: string[];
    properties?: Record<string, McpToolProperty>;
    required?: string[];
  };
  properties?: Record<string, McpToolProperty>;
  required?: string[];
}

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, McpToolProperty>;
  required?: string[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
}

// =============================================================================
// Handler Types
// =============================================================================

export type ToolHandler = (
  args: Record<string, unknown>
) => Promise<McpToolResult>;

export interface HandlerRegistry {
  [toolName: string]: ToolHandler;
}

// =============================================================================
// Error Response Helpers
// =============================================================================

/**
 * Create an error response for MCP tools
 */
export function createErrorResponse(
  message: string,
  error?: Error
): McpToolResult {
  const errorMessage = error
    ? `${message}: ${error.message}`
    : message;

  return {
    content: [{ type: 'text', text: errorMessage }],
    isError: true,
  };
}

/**
 * Create a success response for MCP tools
 */
export function createSuccessResponse(
  data: unknown,
  pretty = true
): McpToolResult {
  const text =
    typeof data === 'string'
      ? data
      : JSON.stringify(data, null, pretty ? 2 : 0);

  return {
    content: [{ type: 'text', text }],
  };
}

/**
 * Create a client not initialized error
 */
export function createClientNotInitializedError(): McpToolResult {
  return createErrorResponse(CLIENT_ERRORS.NOT_INITIALIZED);
}

// =============================================================================
// CRUD Response Helpers
// =============================================================================

/**
 * CRUD action types for standardized responses
 */
export type CrudAction = 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';

/**
 * Standardized CRUD response format
 */
export interface CrudResponse<T = unknown> {
  success: true;
  action: CrudAction;
  entity: string;
  data: T;
}

/**
 * Create a standardized CRUD response
 *
 * @param action - The CRUD action performed
 * @param entity - Entity type (workflow, tag, execution, etc.)
 * @param data - The entity data
 *
 * @example
 * ```ts
 * return createCrudResponse('created', 'workflow', workflow);
 * // Returns: { success: true, action: 'created', entity: 'workflow', data: {...} }
 * ```
 */
export function createCrudResponse<T>(
  action: CrudAction,
  entity: string,
  data: T
): McpToolResult {
  const response: CrudResponse<T> = {
    success: true,
    action,
    entity,
    data,
  };
  return createSuccessResponse(response);
}
