/**
 * @module handlers
 * @description Centralized handler registration for n8n MCP server
 *
 * Environment variables:
 * - N8N_FULL: Set to 'true' to enable ALL tools (46 total)
 * - N8N_ENTERPRISE: Set to 'true' to enable Enterprise-only features (projects, variables)
 * - N8N_USERS: Set to 'true' to enable user management tools
 *
 * Default (no env vars): 35 core tools (disabled: Enterprise, Users)
 */

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
import { registerTestWorkflowHandlers } from './test-workflow-handler.js';

// Feature flags
const isFullEnabled = process.env.N8N_FULL === 'true';
const isEnterpriseEnabled = process.env.N8N_ENTERPRISE === 'true' || isFullEnabled;
const isUsersEnabled = process.env.N8N_USERS === 'true' || isFullEnabled;

/**
 * Register all handlers with a registry
 *
 * @param registry - The handler registry to register handlers with (defaults to globalRegistry)
 */
export function registerAllHandlers(registry: HandlerRegistry = globalRegistry): void {
  // Core handlers (always enabled) - 35 tools
  registerWorkflowHandlers(registry);      // 9 tools
  registerCredentialHandlers(registry);    // 6 tools
  registerExecutionHandlers(registry);     // 3 tools
  registerDiagnosticHandlers(registry);    // 3 tools
  registerTagHandlers(registry);           // 7 tools
  registerAuditHandlers(registry);         // 1 tool
  registerPatternHandlers(registry);       // 5 tools
  registerTestWorkflowHandlers(registry);  // 1 tool

  // Users (4 tools) - disabled by default
  if (isUsersEnabled) {
    registerUserHandlers(registry);
    console.error('[n8n-mcp] Users enabled (+4 tools)');
  }

  // Enterprise-only (7 tools) - disabled by default
  if (isEnterpriseEnabled) {
    registerProjectHandlers(registry);
    registerVariableHandlers(registry);
    console.error('[n8n-mcp] Enterprise enabled: projects, variables (+7 tools)');
  }
}
