/**
 * @module handlers/registry
 * @description Handler registry with type-safe handler creation and registration
 *
 * Provides a centralized registry for MCP tool handlers with:
 * - Type-safe handler registration and retrieval
 * - Zod validation wrapper
 * - Client initialization checks
 * - Standardized error handling
 * - Proper MCP response formatting
 */

import type { z } from 'zod';
import type { McpToolResult } from '../types/index.js';
import {
  createErrorResponse,
  createClientNotInitializedError,
} from '../types/mcp.js';
import type { N8nClient as N8nClientType } from '../clients/n8n-client.js';

// =============================================================================
// N8nClient Type (imported from clients module)
// =============================================================================

// Re-export N8nClient type from clients module
export type N8nClient = N8nClientType;

// =============================================================================
// Handler Types
// =============================================================================

/**
 * Client provider function - retrieves client by ID
 */
export type ClientProvider = (clientId: string) => N8nClient | undefined;

/**
 * Session cookie provider function - retrieves session cookie by URL
 */
export type SessionCookieProvider = (url: string) => Promise<string | null>;

/**
 * Handler context passed to all handlers
 */
export interface HandlerContext {
  getClient: ClientProvider;
  getSessionCookie?: SessionCookieProvider;
}

/**
 * Raw handler function type - receives validated input and context
 */
export type RawHandler<TInput> = (
  input: TInput,
  context: HandlerContext
) => Promise<McpToolResult>;

/**
 * Wrapped handler function type - receives raw args, validates, and executes
 */
export type WrappedHandler = (
  args: Record<string, unknown>,
  context: HandlerContext
) => Promise<McpToolResult>;

// =============================================================================
// Handler Registry Class
// =============================================================================

/**
 * Registry for MCP tool handlers
 *
 * @example
 * ```ts
 * const registry = new HandlerRegistry();
 *
 * registry.register('list-workflows', createHandler(
 *   ListWorkflowsSchema,
 *   async (input, ctx) => {
 *     const client = ctx.getClient(input.clientId);
 *     const workflows = await client.listWorkflows();
 *     return createSuccessResponse(workflows.data);
 *   }
 * ));
 *
 * const handler = registry.get('list-workflows');
 * const result = await handler(args, context);
 * ```
 */
export class HandlerRegistry {
  private readonly handlers = new Map<string, WrappedHandler>();

  /**
   * Register a handler for a tool name
   */
  register(toolName: string, handler: WrappedHandler): void {
    if (this.handlers.has(toolName)) {
      throw new Error(`Handler for "${toolName}" is already registered`);
    }
    this.handlers.set(toolName, handler);
  }

  /**
   * Get a handler by tool name
   */
  get(toolName: string): WrappedHandler | undefined {
    return this.handlers.get(toolName);
  }

  /**
   * Check if a handler exists for a tool name
   */
  has(toolName: string): boolean {
    return this.handlers.has(toolName);
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Execute a handler by tool name
   */
  async execute(
    toolName: string,
    args: Record<string, unknown>,
    context: HandlerContext
  ): Promise<McpToolResult> {
    const handler = this.get(toolName);

    if (!handler) {
      return createErrorResponse(`Unknown tool: ${toolName}`);
    }

    return handler(args, context);
  }
}

// =============================================================================
// Handler Factory
// =============================================================================

/**
 * Options for handler creation
 */
export interface CreateHandlerOptions {
  /** Skip client initialization check (for init-n8n handler) */
  skipClientCheck?: boolean;
  /** Custom success message formatter */
  formatSuccess?: (data: unknown) => string;
}

/**
 * Create a wrapped handler with validation and error handling
 *
 * @param schema - Zod schema for input validation
 * @param handler - Raw handler function
 * @param options - Additional options
 *
 * @example
 * ```ts
 * const listWorkflows = createHandler(
 *   ListWorkflowsSchema,
 *   async (input, ctx) => {
 *     const client = ctx.getClient(input.clientId);
 *     if (!client) return createClientNotInitializedError();
 *
 *     const workflows = await client.listWorkflows();
 *     return createSuccessResponse(workflows.data);
 *   }
 * );
 * ```
 */
export function createHandler<TSchema extends z.ZodSchema>(
  schema: TSchema,
  handler: RawHandler<z.infer<TSchema>>,
  options: CreateHandlerOptions = {}
): WrappedHandler {
  return async (
    args: Record<string, unknown>,
    context: HandlerContext
  ): Promise<McpToolResult> => {
    try {
      // Validate input
      const parseResult = schema.safeParse(args);

      if (!parseResult.success) {
        const errors = parseResult.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        return createErrorResponse(`Validation failed: ${errors}`);
      }

      const input = parseResult.data;

      // Check client initialization (unless skipped)
      if (!options.skipClientCheck && 'clientId' in input) {
        const client = context.getClient(input.clientId as string);
        if (!client) {
          return createClientNotInitializedError();
        }
      }

      // Execute handler
      return await handler(input, context);
    } catch (error) {
      // Handle errors
      if (error instanceof Error) {
        return createErrorResponse(error.message);
      }
      return createErrorResponse('Unknown error occurred');
    }
  };
}

/**
 * Create a handler that requires a client
 * Convenience wrapper that extracts client and handles not-initialized case
 *
 * @example
 * ```ts
 * const listWorkflows = createClientHandler(
 *   ListWorkflowsSchema,
 *   async (input, client) => {
 *     const workflows = await client.listWorkflows();
 *     return createSuccessResponse(workflows.data);
 *   }
 * );
 * ```
 */
export function createClientHandler<TSchema extends z.ZodSchema>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>, client: N8nClient) => Promise<McpToolResult>
): WrappedHandler {
  return createHandler(schema, async (input, context) => {
    const clientId = (input as { clientId: string }).clientId;
    const client = context.getClient(clientId);

    if (!client) {
      return createClientNotInitializedError();
    }

    return handler(input, client);
  });
}

// =============================================================================
// Global Registry Instance
// =============================================================================

/**
 * Global handler registry instance
 */
export const globalRegistry = new HandlerRegistry();
