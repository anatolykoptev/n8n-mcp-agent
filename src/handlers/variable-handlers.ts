/**
 * @module handlers/variable-handlers
 * @description Handlers for n8n variable operations
 *
 * Provides handlers for:
 * - listVariables: List all variables
 * - createVariable: Create a new variable
 * - deleteVariable: Delete a variable
 */

import {
  ListVariablesSchema,
  CreateVariableSchema,
  DeleteVariableSchema,
} from '../schemas/tool-inputs.js';
import { createSuccessResponse } from '../types/mcp.js';
import type { N8nVariable } from '../types/n8n.js';
import {
  createClientHandler,
  globalRegistry,
  type WrappedHandler,
} from './registry.js';

// =============================================================================
// Variable Handlers
// =============================================================================

/**
 * List all variables from the n8n instance
 *
 * @returns Formatted list of variables with id, key, and value
 */
export const listVariables: WrappedHandler = createClientHandler(
  ListVariablesSchema,
  async (_input, client) => {
    const variableList = await client.variables.list();

    // Format variables for cleaner output
    const formattedVariables = variableList.data.map((variable: N8nVariable) => ({
      id: variable.id,
      key: variable.key,
      value: variable.value,
    }));

    return createSuccessResponse(formattedVariables);
  }
);

/**
 * Create a new variable
 *
 * @param input.key - Variable key/name
 * @param input.value - Variable value
 * @returns Created variable details
 */
export const createVariable: WrappedHandler = createClientHandler(
  CreateVariableSchema,
  async (input, client) => {
    await client.variables.create(input.key, input.value);

    return createSuccessResponse(
      `Successfully created variable: ${input.key}`
    );
  }
);

/**
 * Delete a variable by ID
 *
 * @param input.id - Variable ID to delete
 * @returns Deleted variable details
 */
export const deleteVariable: WrappedHandler = createClientHandler(
  DeleteVariableSchema,
  async (input, client) => {
    await client.variables.delete(input.id);

    return createSuccessResponse(
      `Successfully deleted variable: ${input.id}`
    );
  }
);

// =============================================================================
// Registration
// =============================================================================

import type { HandlerRegistry } from './registry.js';

/**
 * Register all variable handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerVariableHandlers(
  registry: HandlerRegistry = globalRegistry
): void {
  registry.register('list-variables', listVariables);
  registry.register('create-variable', createVariable);
  registry.register('delete-variable', deleteVariable);
}
