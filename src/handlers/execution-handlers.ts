/**
 * @module handlers/execution-handlers
 * @description Handlers for n8n execution operations
 *
 * Provides handlers for:
 * - listExecutions: List executions with optional filters
 * - getExecution: Get execution by ID
 * - deleteExecution: Delete an execution
 */

import {
  ListExecutionsSchema,
  GetExecutionSchema,
  DeleteExecutionSchema,
} from '../schemas/tool-inputs.js';
import { createSuccessResponse } from '../types/mcp.js';
import type { N8nExecution } from '../types/n8n.js';
import {
  createClientHandler,
  globalRegistry,
  type WrappedHandler,
} from './registry.js';

// =============================================================================
// Execution Handlers
// =============================================================================

/**
 * List executions from the n8n instance with optional filters
 *
 * @param input.workflowId - Optional workflow ID to filter executions
 * @param input.status - Optional status filter (error, success, waiting)
 * @param input.limit - Optional limit for number of results (1-250)
 * @param input.includeData - Optional flag to include execution data
 * @returns Formatted list of executions with id, status, workflow info
 */
export const listExecutions: WrappedHandler = createClientHandler(
  ListExecutionsSchema,
  async (input, client) => {
    const options = {
      workflowId: input.workflowId,
      status: input.status as 'error' | 'success' | 'waiting' | undefined,
      limit: input.limit,
      includeData: input.includeData,
    };

    const executionList = await client.executions.list(options);

    // Format executions for cleaner output
    const formattedExecutions = executionList.data.map((exec: N8nExecution) => ({
      id: exec.id,
      workflowId: exec.workflowId,
      status: exec.status,
      startedAt: exec.startedAt,
      stoppedAt: exec.stoppedAt,
      mode: exec.mode,
    }));

    return createSuccessResponse(formattedExecutions);
  }
);

/**
 * Get an execution by ID
 *
 * @param input.id - Execution ID to retrieve
 * @param input.includeData - Optional flag to include execution data
 * @returns Full execution details
 */
export const getExecution: WrappedHandler = createClientHandler(
  GetExecutionSchema,
  async (input, client) => {
    const execution = await client.executions.get(input.id, input.includeData);
    return createSuccessResponse(execution);
  }
);

/**
 * Delete an execution by ID
 *
 * @param input.id - Execution ID to delete
 * @returns Deleted execution details
 */
export const deleteExecution: WrappedHandler = createClientHandler(
  DeleteExecutionSchema,
  async (input, client) => {
    const execution = await client.executions.delete(input.id);

    return createSuccessResponse(
      `Successfully deleted execution:\n${JSON.stringify(execution, null, 2)}`
    );
  }
);

// =============================================================================
// Registration
// =============================================================================

import type { HandlerRegistry } from './registry.js';

/**
 * Register all execution handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerExecutionHandlers(
  registry: HandlerRegistry = globalRegistry
): void {
  registry.register('list-executions', listExecutions);
  registry.register('get-execution', getExecution);
  registry.register('delete-execution', deleteExecution);
}
