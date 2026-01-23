/**
 * @module handlers/audit-handlers
 * @description Handlers for n8n audit operations
 *
 * Provides handlers for:
 * - generateAudit: Generate a security audit report
 */

import { GenerateAuditSchema } from '../schemas/tool-inputs.js';
import { createSuccessResponse } from '../types/mcp.js';
import {
  createClientHandler,
  globalRegistry,
  type WrappedHandler,
} from './registry.js';

// =============================================================================
// Audit Handlers
// =============================================================================

/**
 * Generate a security audit report for the n8n instance
 *
 * @param input.categories - Optional array of audit categories
 * @param input.daysAbandonedWorkflow - Optional number of days to consider workflows as abandoned
 * @returns Audit report with security findings and recommendations
 */
export const generateAudit: WrappedHandler = createClientHandler(
  GenerateAuditSchema,
  async (input, client) => {
    const auditResult = await client.audit.generate({
      categories: input.categories,
      daysAbandonedWorkflow: input.daysAbandonedWorkflow,
    });

    return createSuccessResponse(auditResult);
  }
);

// =============================================================================
// Registration
// =============================================================================

import type { HandlerRegistry } from './registry.js';

/**
 * Register all audit handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerAuditHandlers(
  registry: HandlerRegistry = globalRegistry
): void {
  registry.register('generate-audit', generateAudit);
}
