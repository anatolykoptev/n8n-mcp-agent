/**
 * @module tools/workflow-tools
 * @description MCP tool definitions for workflow operations
 */

import type { McpToolDefinition } from '../types/mcp.js';
import { JSON_NOTE, clientIdProperty, idProperty } from './helpers.js';

// =============================================================================
// Initialization Tool
// =============================================================================

export const initN8nTool: McpToolDefinition = {
  name: 'init-n8n',
  description: `Initialize connection to n8n instance. Use this tool whenever an n8n URL and API key are shared to establish the connection. ${JSON_NOTE}`,
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'n8n instance URL (https)' },
      apiKey: { type: 'string', description: 'n8n API key' },
    },
    required: ['url', 'apiKey'],
  },
};

// =============================================================================
// Workflow Tools
// =============================================================================

export const workflowTools: McpToolDefinition[] = [
  {
    name: 'list-workflows',
    description: `List all workflows from n8n. Use after init-n8n to see available workflows. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: clientIdProperty(),
      required: ['clientId'],
    },
  },
  {
    name: 'get-workflow',
    description: `Retrieve a workflow by ID. Use after list-workflows to get detailed information about a specific workflow. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Workflow ID'),
      },
      required: ['clientId', 'id'],
    },
  },
  {
    name: 'create-workflow',
    description: `Create a new workflow in n8n. Must provide full workflow structure including nodes and connections arrays, even if empty. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        name: { type: 'string', description: 'Workflow name' },
        nodes: { type: 'array', description: 'Workflow nodes (optional)' },
        connections: { type: 'object', description: 'Node connections (optional)' },
      },
      required: ['clientId', 'name'],
    },
  },
  {
    name: 'update-workflow',
    description: `Update an existing workflow in n8n. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Workflow ID'),
        workflow: {
          type: 'object',
          description: 'Workflow properties to update',
          properties: {
            name: { type: 'string' },
            active: { type: 'boolean' },
            nodes: { type: 'array' },
            connections: { type: 'object' },
            settings: { type: 'object' },
          },
        },
      },
      required: ['clientId', 'id', 'workflow'],
    },
  },
  {
    name: 'delete-workflow',
    description: `Delete a workflow by ID. This action cannot be undone. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Workflow ID'),
      },
      required: ['clientId', 'id'],
    },
  },
  {
    name: 'activate-workflow',
    description: `Activate a workflow by ID. This will enable the workflow to run. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Workflow ID'),
      },
      required: ['clientId', 'id'],
    },
  },
  {
    name: 'deactivate-workflow',
    description: `Deactivate a workflow by ID. This will prevent the workflow from running. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Workflow ID'),
      },
      required: ['clientId', 'id'],
    },
  },
  {
    name: 'execute-webhook',
    description: `Execute a workflow via its webhook URL. Workflow must have a Webhook trigger node and be active. Returns the workflow response. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        webhookPath: {
          type: 'string',
          description: 'Webhook path (e.g., "my-webhook" for /webhook/my-webhook)',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          description: 'HTTP method (default: POST)',
        },
        data: {
          type: 'object',
          description: 'JSON data to send in request body (for POST/PUT)',
        },
        headers: {
          type: 'object',
          description: 'Additional headers to send',
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds (default: 30000)',
        },
      },
      required: ['clientId', 'webhookPath'],
    },
  },
  {
    name: 'get-webhook-url',
    description: `Get the webhook URL for a workflow. Extracts webhook path from workflow nodes. ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Workflow ID'),
      },
      required: ['clientId', 'id'],
    },
  },
];

// =============================================================================
// Test Workflow Tool
// =============================================================================

export const testWorkflowTool: McpToolDefinition = {
  name: 'test-workflow',
  description: `Universal workflow testing tool. Automatically detects trigger type and uses appropriate testing method:
- Webhook trigger → direct webhook call
- Execute Sub-workflow Trigger → via Test Runner workflow
- Manual/Schedule Trigger → use autoConvert:true to add Execute Sub-workflow Trigger

Returns structured response with execution results and AI-friendly diagnosis for errors. ${JSON_NOTE}`,
  inputSchema: {
    type: 'object',
    properties: {
      ...clientIdProperty(),
      workflowId: {
        type: 'string',
        description: 'Workflow ID to test',
      },
      data: {
        type: 'object',
        description: 'Input data to pass to the workflow (optional)',
      },
      autoConvert: {
        type: 'boolean',
        description: 'Add Execute Sub-workflow Trigger to Manual/Schedule workflows (default: false)',
      },
      testRunnerPath: {
        type: 'string',
        description: 'Test Runner webhook path (default: "test-runner")',
      },
      timeout: {
        type: 'number',
        description: 'Request timeout in ms (default: 60000)',
      },
    },
    required: ['clientId', 'workflowId'],
  },
};
