/**
 * @module handlers
 * @description Centralized handler exports and registration for n8n MCP server
 *
 * This module provides:
 * - Export of all handler functions
 * - Export of the handler registry
 * - registerAllHandlers function to register all handlers at once
 */

// =============================================================================
// Re-exports
// =============================================================================

// Registry and types
export {
  HandlerRegistry,
  globalRegistry,
  createHandler,
  createClientHandler,
  type N8nClient,
  type ClientProvider,
  type HandlerContext,
  type RawHandler,
  type WrappedHandler,
  type CreateHandlerOptions,
} from './registry.js';

// Workflow handlers
export {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  executeWebhook,
  getWebhookUrl,
  registerWorkflowHandlers,
} from './workflow-handlers.js';

// Project handlers
export {
  listProjects,
  createProject,
  deleteProject,
  updateProject,
  registerProjectHandlers,
} from './project-handlers.js';

// User handlers
export {
  listUsers,
  createUsers,
  getUser,
  deleteUser,
  registerUserHandlers,
} from './user-handlers.js';

// Execution handlers
export {
  listExecutions,
  getExecution,
  deleteExecution,
  registerExecutionHandlers,
} from './execution-handlers.js';

// Tag handlers
export {
  listTags,
  createTag,
  getTag,
  updateTag,
  deleteTag,
  getWorkflowTags,
  updateWorkflowTags,
  registerTagHandlers,
} from './tag-handlers.js';

// Variable handlers
export {
  listVariables,
  createVariable,
  deleteVariable,
  registerVariableHandlers,
} from './variable-handlers.js';

// Credential handlers
export {
  createCredential,
  deleteCredential,
  getCredentialSchema,
  registerCredentialHandlers,
} from './credential-handlers.js';

// Audit handlers
export {
  generateAudit,
  registerAuditHandlers,
} from './audit-handlers.js';

// Pattern handlers (Zie619 workflow database)
export {
  getPatternStats,
  searchPatterns,
  getPattern,
  getPatternCategories,
  getPatternIntegrations,
  registerPatternHandlers,
} from './pattern-handlers.js';

// Diagnostic handlers
export {
  diagnoseN8n,
  analyzeLogs,
  healthCheck,
  registerDiagnosticHandlers,
  DiagnoseN8nSchema,
  AnalyzeLogsSchema,
  HealthCheckSchema,
  type DiagnoseN8nInput,
  type AnalyzeLogsInput,
  type HealthCheckInput,
} from './diagnostic-handlers.js';

// =============================================================================
// Registration
// =============================================================================

import { type HandlerRegistry, globalRegistry } from './registry.js';
import { registerWorkflowHandlers } from './workflow-handlers.js';
import { registerProjectHandlers } from './project-handlers.js';
import { registerUserHandlers } from './user-handlers.js';
import { registerExecutionHandlers } from './execution-handlers.js';
import { registerTagHandlers } from './tag-handlers.js';
import { registerVariableHandlers } from './variable-handlers.js';
import { registerCredentialHandlers } from './credential-handlers.js';
import { registerAuditHandlers } from './audit-handlers.js';
import { registerPatternHandlers } from './pattern-handlers.js';
import { registerDiagnosticHandlers } from './diagnostic-handlers.js';

/**
 * Register all handlers with a registry
 *
 * Call this function once during server initialization to register
 * all MCP tool handlers.
 *
 * @param registry - The handler registry to register handlers with (defaults to globalRegistry)
 *
 * @example
 * ```ts
 * import { registerAllHandlers, globalRegistry } from './handlers/index.js';
 *
 * // Register all handlers
 * registerAllHandlers(globalRegistry);
 *
 * // Create context with client provider
 * const context = {
 *   getClient: (clientId) => clients.get(clientId),
 * };
 *
 * // Execute a handler
 * const result = await globalRegistry.execute('list-workflows', args, context);
 * ```
 */
export function registerAllHandlers(registry: HandlerRegistry = globalRegistry): void {
  registerWorkflowHandlers(registry);
  registerProjectHandlers(registry);
  registerUserHandlers(registry);
  registerExecutionHandlers(registry);
  registerTagHandlers(registry);
  registerVariableHandlers(registry);
  registerCredentialHandlers(registry);
  registerAuditHandlers(registry);
  registerPatternHandlers(registry);
  registerDiagnosticHandlers(registry);
}
