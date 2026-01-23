/**
 * @module tools
 * @description Centralized tool definition exports for n8n MCP server
 *
 * This module consolidates all MCP tool definitions and provides
 * utility functions for accessing them.
 */

import type { McpToolDefinition } from '../types/mcp.js';

// Re-export helpers
export { JSON_NOTE, ENTERPRISE_NOTE, clientIdProperty, idProperty } from './helpers.js';

// Re-export tool definitions
export { initN8nTool, workflowTools } from './workflow-tools.js';
export { projectTools, userTools, credentialTools, auditTool } from './admin-tools.js';
export { executionTools, tagTools, variableTools } from './data-tools.js';
export { patternTools } from './pattern-tools.js';
export { diagnosticTools } from './diagnostic-tools.js';

// Import for aggregation
import { initN8nTool, workflowTools } from './workflow-tools.js';
import { projectTools, userTools, credentialTools, auditTool } from './admin-tools.js';
import { executionTools, tagTools, variableTools } from './data-tools.js';
import { patternTools } from './pattern-tools.js';
import { diagnosticTools } from './diagnostic-tools.js';

// =============================================================================
// Aggregation Functions
// =============================================================================

/**
 * Get all MCP tool definitions for n8n operations
 * @returns Array of all tool definitions (workflow, admin, data, pattern tools)
 */
export function getAllTools(): McpToolDefinition[] {
  return [
    initN8nTool,
    ...workflowTools,
    ...projectTools,
    ...userTools,
    ...variableTools,
    ...credentialTools,
    ...executionTools,
    ...tagTools,
    auditTool,
    ...patternTools,
    ...diagnosticTools,
  ];
}

/**
 * Get all tool names for validation purposes
 * @returns Array of tool name strings
 */
export function getToolNames(): string[] {
  return getAllTools().map((t) => t.name);
}
