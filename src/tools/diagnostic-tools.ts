/**
 * @module tools/diagnostic-tools
 * @description MCP tool definitions for n8n diagnostics operations
 */

import type { McpToolDefinition } from '../types/mcp.js';
import { JSON_NOTE, clientIdProperty } from './helpers.js';

// =============================================================================
// Diagnostic Tools
// =============================================================================

export const diagnosticTools: McpToolDefinition[] = [
  {
    name: 'n8n-diagnose',
    description: `Run comprehensive n8n diagnostics. Checks container status, analyzes logs for errors, provides actionable fixes. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        includeExecutions: {
          type: 'boolean',
          description: 'Include recent execution analysis (default: true)',
        },
        logLines: {
          type: 'number',
          description: 'Number of recent log lines to analyze (default: 100)',
        },
        verbose: {
          type: 'boolean',
          description: 'Include detailed diagnostic output (default: false)',
        },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'n8n-analyze-logs',
    description: `Analyze n8n logs for known error patterns. Returns categorized issues with suggested actions. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        logs: {
          type: 'array',
          description: 'Array of log lines to analyze',
          items: {
            type: 'string',
          },
        },
        service: {
          type: 'string',
          description: 'Service name to filter patterns (e.g., "n8n")',
        },
        filterBotScans: {
          type: 'boolean',
          description: 'Filter out bot scanner requests (default: true)',
        },
      },
      required: ['clientId', 'logs'],
    },
  },
  {
    name: 'n8n-health-check',
    description: `Quick health check of n8n instance. Returns healthy/unhealthy status with details. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        timeout: {
          type: 'number',
          description: 'Health check timeout in milliseconds (default: 5000)',
        },
      },
      required: ['clientId'],
    },
  },
];
