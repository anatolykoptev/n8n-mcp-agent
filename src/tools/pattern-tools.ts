/**
 * @module tools/pattern-tools
 * @description MCP tool definitions for Zie619 workflow pattern database
 */

import type { McpToolDefinition } from '../types/mcp.js';

// =============================================================================
// Pattern Tools (Zie619 Workflow Database)
// =============================================================================

export const patternTools: McpToolDefinition[] = [
  {
    name: 'n8n-patterns-stats',
    description: 'Get Zie619 workflow database statistics (4343 workflows, 268 integrations, 16 categories).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'n8n-patterns-search',
    description: 'Search workflow templates from Zie619 database. Filter by query, category, integration, complexity, or trigger type.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text search in name/description' },
        category: { type: 'string', description: "Filter by category (e.g., 'E-commerce & Retail', 'AI Agent Development')" },
        integration: { type: 'string', description: "Filter by integration (e.g., 'Shopify', 'OpenAI', 'Slack')" },
        complexity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter by complexity' },
        trigger_type: { type: 'string', enum: ['Manual', 'Webhook', 'Scheduled', 'Complex'], description: 'Filter by trigger type' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
    },
  },
  {
    name: 'n8n-patterns-get',
    description: 'Get full workflow JSON template by ID. Use this to fetch a template for deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'Workflow ID from search results' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'n8n-patterns-categories',
    description: 'List all workflow categories (16 total).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'n8n-patterns-integrations',
    description: 'List top integrations by usage count.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
  },
];
