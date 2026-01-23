/**
 * @module tools/admin-tools
 * @description MCP tool definitions for admin operations (project, user, credential, audit)
 */

import type { McpToolDefinition } from '../types/mcp.js';
import { JSON_NOTE, ENTERPRISE_NOTE, clientIdProperty, idProperty } from './helpers.js';

// =============================================================================
// Project Tools
// =============================================================================

export const projectTools: McpToolDefinition[] = [
  {
    name: 'list-projects',
    description: `List all projects from n8n. ${ENTERPRISE_NOTE} ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: clientIdProperty(),
      required: ['clientId'],
    },
  },
  {
    name: 'create-project',
    description: `Create a new project in n8n. ${ENTERPRISE_NOTE} ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        name: { type: 'string', description: 'Project name' },
      },
      required: ['clientId', 'name'],
    },
  },
  {
    name: 'update-project',
    description: `Update a project's name. ${ENTERPRISE_NOTE} ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'New project name' },
      },
      required: ['clientId', 'projectId', 'name'],
    },
  },
  {
    name: 'delete-project',
    description: `Delete a project by ID. ${ENTERPRISE_NOTE} ${JSON_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['clientId', 'projectId'],
    },
  },
];

// =============================================================================
// User Tools
// =============================================================================

export const userTools: McpToolDefinition[] = [
  {
    name: 'list-users',
    description: 'Retrieve all users from your instance. Only available for the instance owner.',
    inputSchema: {
      type: 'object',
      properties: clientIdProperty(),
      required: ['clientId'],
    },
  },
  {
    name: 'create-users',
    description: 'Create one or more users in your instance.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        users: {
          type: 'array',
          description: 'Array of users to create',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'User email' },
              role: {
                type: 'string',
                description: 'User role',
                enum: ['global:admin', 'global:member'],
              },
            },
            required: ['email'],
          },
        },
      },
      required: ['clientId', 'users'],
    },
  },
  {
    name: 'get-user',
    description: 'Get user by ID or email address.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        idOrEmail: { type: 'string', description: 'User ID or email' },
      },
      required: ['clientId', 'idOrEmail'],
    },
  },
  {
    name: 'delete-user',
    description: 'Delete a user from your instance.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        idOrEmail: { type: 'string', description: 'User ID or email' },
      },
      required: ['clientId', 'idOrEmail'],
    },
  },
];

// =============================================================================
// Credential Tools
// =============================================================================

export const credentialTools: McpToolDefinition[] = [
  {
    name: 'create-credential',
    description:
      "Create a credential that can be used by nodes of the specified type. Use get-credential-schema first to see required fields.",
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        name: { type: 'string', description: 'Credential name' },
        type: { type: 'string', description: "Credential type (e.g., 'githubApi', 'slackOAuth2Api')" },
        data: { type: 'object', description: 'Credential data (fields depend on type)' },
      },
      required: ['clientId', 'name', 'type', 'data'],
    },
  },
  {
    name: 'delete-credential',
    description: 'Delete a credential by ID. You must be the owner of the credentials.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        ...idProperty('Credential ID'),
      },
      required: ['clientId', 'id'],
    },
  },
  {
    name: 'get-credential-schema',
    description: 'Show credential data schema for a specific credential type.',
    inputSchema: {
      type: 'object',
      properties: {
        ...clientIdProperty(),
        credentialTypeName: { type: 'string', description: "Credential type name (e.g., 'githubApi')" },
      },
      required: ['clientId', 'credentialTypeName'],
    },
  },
];

// =============================================================================
// Audit Tool
// =============================================================================

export const auditTool: McpToolDefinition = {
  name: 'generate-audit',
  description: 'Generate a security audit for your n8n instance.',
  inputSchema: {
    type: 'object',
    properties: {
      ...clientIdProperty(),
      categories: {
        type: 'array',
        description: 'Audit categories to include',
        items: {
          type: 'string',
          enum: ['credentials', 'database', 'nodes', 'filesystem', 'instance'],
        },
      },
      daysAbandonedWorkflow: {
        type: 'number',
        description: 'Days threshold for abandoned workflows',
      },
    },
    required: ['clientId'],
  },
};
