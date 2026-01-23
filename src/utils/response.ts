/**
 * @module utils/response
 * @description Response formatting utilities for MCP tools
 */

import type { McpToolResult } from '../types/mcp.js';

/**
 * Create a text response
 */
export function textResponse(text: string): McpToolResult {
  return {
    content: [{ type: 'text', text }],
  };
}

/**
 * Create a JSON response
 */
export function jsonResponse(data: unknown, pretty = true): McpToolResult {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(data, null, pretty ? 2 : 0),
    }],
  };
}

/**
 * Create an error response
 */
export function errorResponse(message: string): McpToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

/**
 * Create a success message response
 */
export function successResponse(message: string, data?: unknown): McpToolResult {
  if (data !== undefined) {
    return {
      content: [{
        type: 'text',
        text: `${message}\n${JSON.stringify(data, null, 2)}`,
      }],
    };
  }
  return textResponse(message);
}

/**
 * Wrap an error into a response
 */
export function wrapError(error: unknown): McpToolResult {
  const message = error instanceof Error
    ? error.message
    : 'Unknown error occurred';
  return errorResponse(message);
}

/**
 * Format a list of items for display
 */
export function formatList<T extends Record<string, unknown>>(
  items: T[],
  fields: (keyof T)[]
): McpToolResult {
  const formatted = items.map((item) => {
    const result: Record<string, unknown> = {};
    for (const field of fields) {
      result[field as string] = item[field];
    }
    return result;
  });
  return jsonResponse(formatted);
}
