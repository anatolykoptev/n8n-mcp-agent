/**
 * @module handlers/pattern-handlers
 * @description Handlers for Zie619 workflow pattern operations
 *
 * Provides handlers for:
 * - getPatternStats: Get database statistics
 * - searchPatterns: Search workflow templates
 * - getPattern: Get workflow by ID
 * - getPatternCategories: List all categories
 * - getPatternIntegrations: List top integrations
 */

import { z } from 'zod';
import {
  PatternStatsSchema,
  PatternSearchSchema,
  PatternGetSchema,
  PatternCategoriesSchema,
  PatternIntegrationsSchema,
} from '../schemas/tool-inputs.js';
import { createSuccessResponse, createErrorResponse } from '../types/mcp.js';
import type { McpToolResult } from '../types/mcp.js';
import { patternsClient } from '../clients/patterns-client.js';
import { globalRegistry, type WrappedHandler, type HandlerContext } from './registry.js';

// =============================================================================
// Helper: Create handler without client requirement
// =============================================================================

/**
 * Create a handler that doesn't require n8n client (for pattern operations)
 */
function createPatternHandler<TSchema extends z.ZodSchema>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>) => Promise<McpToolResult>
): WrappedHandler {
  return async (
    args: Record<string, unknown>,
    _context: HandlerContext
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

      // Execute handler
      return await handler(parseResult.data);
    } catch (error) {
      if (error instanceof Error) {
        return createErrorResponse(error.message);
      }
      return createErrorResponse('Unknown error occurred');
    }
  };
}

// =============================================================================
// Pattern Handlers
// =============================================================================

/**
 * Get Zie619 workflow database statistics
 */
export const getPatternStats: WrappedHandler = createPatternHandler(
  PatternStatsSchema,
  async () => {
    const stats = await patternsClient.getStats();
    return createSuccessResponse(stats);
  }
);

/**
 * Search workflow templates
 */
export const searchPatterns: WrappedHandler = createPatternHandler(
  PatternSearchSchema,
  async (input) => {
    const results = await patternsClient.search({
      query: input.query,
      category: input.category,
      integration: input.integration,
      complexity: input.complexity,
      trigger_type: input.trigger_type,
      limit: input.limit,
    });

    return createSuccessResponse({
      count: results.length,
      workflows: results,
    });
  }
);

/**
 * Get full workflow JSON by ID
 */
export const getPattern: WrappedHandler = createPatternHandler(
  PatternGetSchema,
  async (input) => {
    const workflow = await patternsClient.getWorkflowById(input.workflow_id);

    if (!workflow) {
      return createErrorResponse(`Workflow not found: ${input.workflow_id}`);
    }

    return createSuccessResponse(workflow);
  }
);

/**
 * List all workflow categories
 */
export const getPatternCategories: WrappedHandler = createPatternHandler(
  PatternCategoriesSchema,
  async () => {
    const categories = await patternsClient.getCategories();
    return createSuccessResponse(categories);
  }
);

/**
 * List top integrations by usage count
 */
export const getPatternIntegrations: WrappedHandler = createPatternHandler(
  PatternIntegrationsSchema,
  async (input) => {
    const integrations = await patternsClient.getIntegrations(input.limit ?? 50);
    return createSuccessResponse(integrations);
  }
);

// =============================================================================
// Registration
// =============================================================================

import type { HandlerRegistry } from './registry.js';

/**
 * Register all pattern handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerPatternHandlers(
  registry: HandlerRegistry = globalRegistry
): void {
  registry.register('n8n-patterns-stats', getPatternStats);
  registry.register('n8n-patterns-search', searchPatterns);
  registry.register('n8n-patterns-get', getPattern);
  registry.register('n8n-patterns-categories', getPatternCategories);
  registry.register('n8n-patterns-integrations', getPatternIntegrations);
}
