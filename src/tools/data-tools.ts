/**
 * @module tools/data-tools
 * @description MCP tool definitions for data operations (executions, tags, variables)
 */

import type { McpToolDefinition } from '../types/mcp.js';
import { JSON_NOTE, ENTERPRISE_NOTE, clientIdProperty, idProperty } from './helpers.js';

// =============================================================================
// Execution Tools
// =============================================================================

export const executionTools: McpToolDefinition[] = [
  {
    name: 'list-executions',
    description: 'Retrieve all executions from your instance with optional filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        workflowId: { type: 'string', description: 'Filter by workflow ID' },
        status: {
          type: 'string',
          description: 'Filter by status',
          enum: ['error', 'success', 'waiting'],
        },
        limit: { type: 'number', description: 'Maximum results to return' },
        includeData: { type: 'boolean', description: 'Include execution data' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'get-execution',
    description: 'Retrieve a specific execution by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        id: { type: 'number', description: 'Execution ID' },
        includeData: { type: 'boolean', description: 'Include execution data' },
      },
      required: ['clientId', 'id'],
    },
  },
  {
    name: 'delete-execution',
    description: 'Delete a specific execution by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        id: { type: 'number', description: 'Execution ID' },
      },
      required: ['clientId', 'id'],
    },
  },
];

// =============================================================================
// Tag Tools
// =============================================================================

export const tagTools: McpToolDefinition[] = [
  {
    name: 'list-tags',
    description: 'Retrieve all tags from your instance.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        limit: { type: 'number', description: 'Maximum results to return' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'create-tag',
    description: 'Create a new tag in your instance.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        name: { type: 'string', description: 'Tag name' },
      },
      required: ['clientId', 'name'],
    },
  },
  {
    name: 'get-tag',
    description: 'Retrieve a specific tag by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Tag ID'),
      },
      required: ['clientId', 'id'],
    },
  },
  {
    name: 'update-tag',
    description: "Update a tag's name.",
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Tag ID'),
        name: { type: 'string', description: 'New tag name' },
      },
      required: ['clientId', 'id', 'name'],
    },
  },
  {
    name: 'delete-tag',
    description: 'Delete a tag by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Tag ID'),
      },
      required: ['clientId', 'id'],
    },
  },
  {
    name: 'get-workflow-tags',
    description: 'Get tags associated with a workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        workflowId: { type: 'string', description: 'Workflow ID' },
      },
      required: ['clientId', 'workflowId'],
    },
  },
  {
    name: 'update-workflow-tags',
    description: 'Update tags associated with a workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        workflowId: { type: 'string', description: 'Workflow ID' },
        tagIds: {
          type: 'array',
          description: 'Array of tag IDs',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Tag ID' },
            },
            required: ['id'],
          },
        },
      },
      required: ['clientId', 'workflowId', 'tagIds'],
    },
  },
];

// =============================================================================
// Variable Tools
// =============================================================================

export const variableTools: McpToolDefinition[] = [
  {
    name: 'list-variables',
    description: `List all variables from n8n. ${ENTERPRISE_NOTE} ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: clientIdProperty(),
      required: ['clientId'],
    },
  },
  {
    name: 'create-variable',
    description: `Create a new variable in n8n. Variables can be used across workflows. ${ENTERPRISE_NOTE} ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        key: { type: 'string', description: 'Variable key' },
        value: { type: 'string', description: 'Variable value' },
      },
      required: ['clientId', 'key', 'value'],
    },
  },
  {
    name: 'delete-variable',
    description: `Delete a variable by ID. ${ENTERPRISE_NOTE} ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Variable ID'),
      },
      required: ['clientId', 'id'],
    },
  },
];
