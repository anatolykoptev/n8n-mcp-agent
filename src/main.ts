/**
 * @module main
 * @description n8n MCP Server - Clean entry point
 *
 * This file serves as the main entry point for the n8n MCP server.
 * All business logic is delegated to specialized modules.
 *
 * Architecture:
 * - types/       - Type definitions for n8n API and MCP
 * - schemas/     - Zod validation schemas
 * - clients/     - N8nClient with SSRF protection
 * - handlers/    - Tool handler implementations
 * - services/    - Client manager and other services
 * - tools/       - MCP tool definitions
 * - utils/       - Utility functions
 * - constants/   - Configuration constants
 *
 * Environment Variables:
 * - N8N_URL      - n8n instance URL (auto-connects on startup)
 * - N8N_API_KEY  - n8n API key (auto-connects on startup)
 */

import 'dotenv/config';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { N8nClient } from './clients/n8n-client.js';
import { globalRegistry, type HandlerContext } from './handlers/registry.js';
import { registerAllHandlers } from './handlers/index.js';
import { getAllTools } from './tools/index.js';
import { validateUrl, generateClientId } from './utils/url.js';
import { textResponse, errorResponse } from './utils/response.js';
import { InitN8nSchema } from './schemas/tool-inputs.js';
import { DEFAULT_CLIENT_ID, getEnvConfig, hasEnvConfig } from './constants/env.js';
import type { McpToolResult } from './types/mcp.js';

// =============================================================================
// Client Storage
// =============================================================================

/** Map of client ID to N8nClient instance */
const clients = new Map<string, N8nClient>();

/**
 * Get a client by ID
 */
function getClient(clientId: string): N8nClient | undefined {
  return clients.get(clientId);
}

/**
 * Handler context for all tool handlers
 */
const handlerContext: HandlerContext = {
  getClient,
};

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
  {
    name: 'n8n-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// =============================================================================
// Tool Registration
// =============================================================================

/**
 * Register all tool handlers
 */
function setupHandlers(): void {
  // Register all handlers (includes workflow, project, user, etc.)
  registerAllHandlers(globalRegistry);
}

// Initialize handlers
setupHandlers();

// =============================================================================
// Request Handlers
// =============================================================================

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: getAllTools(),
}));

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Handle init-n8n specially (creates client)
  if (name === 'init-n8n') {
    const result = await handleInitN8n(args as Record<string, unknown>);
    return {
      content: result.content.map((c) => ({ type: 'text' as const, text: (c as { text: string }).text })),
      isError: result.isError,
    };
  }

  // Execute registered handler (includes all tools: workflow, pattern, etc.)
  if (globalRegistry.has(name)) {
    const result = await globalRegistry.execute(name, args as Record<string, unknown>, handlerContext);
    return {
      content: result.content.map((c) => ({ type: 'text' as const, text: (c as { text: string }).text })),
      isError: result.isError,
    };
  }

  // Unknown tool
  return {
    content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// =============================================================================
// Special Handlers
// =============================================================================

/**
 * Handle init-n8n tool - initializes connection to n8n instance
 */
async function handleInitN8n(args: Record<string, unknown>): Promise<McpToolResult> {
  // Validate input
  const parseResult = InitN8nSchema.safeParse(args);
  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    return errorResponse(`Validation failed: ${errors}`);
  }

  const { url, apiKey } = parseResult.data;

  // Validate URL for SSRF protection
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return errorResponse(urlValidation.error ?? 'Invalid URL');
  }

  try {
    // Create client and test connection
    const client = new N8nClient(url, apiKey);
    await client.workflows.list();

    // Generate client ID and store
    const clientId = generateClientId(url);
    clients.set(clientId, client);

    return textResponse(
      `Successfully connected to n8n at ${url}. Use this client ID for future operations: ${clientId}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return errorResponse(message);
  }
}

// =============================================================================
// Auto-Connect from Environment
// =============================================================================

/**
 * Auto-initialize n8n client from environment variables
 * @returns True if auto-connected successfully
 */
async function autoConnectFromEnv(): Promise<boolean> {
  if (!hasEnvConfig()) {
    return false;
  }

  const config = getEnvConfig();
  const url = config.url!;
  const apiKey = config.apiKey!;

  // Validate URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    console.error(`Auto-connect failed: ${urlValidation.error}`);
    return false;
  }

  try {
    const client = new N8nClient(url, apiKey);
    await client.workflows.list();
    clients.set(DEFAULT_CLIENT_ID, client);
    console.error(`Auto-connected to n8n at ${url} (clientId: ${DEFAULT_CLIENT_ID})`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Auto-connect failed: ${message}`);
    return false;
  }
}

// =============================================================================
// Server Startup
// =============================================================================

async function main(): Promise<void> {
  // Try auto-connect from environment
  await autoConnectFromEnv();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('n8n MCP server running on stdio');
}

main().catch(console.error);
