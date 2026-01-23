/**
 * @module handlers/credential-handlers
 * @description Handlers for n8n credential operations
 *
 * Provides handlers for:
 * - listCredentialsInUse: List credentials used across all workflows
 * - createCredential: Create a new credential
 * - deleteCredential: Delete a credential by ID
 * - getCredentialSchema: Get schema for a credential type
 */

import {
  N8nLoginSchema,
  ListCredentialsInUseSchema,
  ListCredentialsSchema,
  CreateCredentialSchema,
  DeleteCredentialSchema,
  GetCredentialSchemaSchema,
} from '../schemas/tool-inputs.js';
import { createSuccessResponse, createCrudResponse } from '../types/mcp.js';
import {
  createClientHandler,
  globalRegistry,
  type WrappedHandler,
  type HandlerRegistry,
} from './registry.js';
import type { N8nWorkflow } from '../types/n8n.js';

// =============================================================================
// Types
// =============================================================================

interface CredentialReference {
  id: string;
  name: string;
  type: string;
  usedInWorkflows: Array<{ id: string; name: string; nodeName: string }>;
}

// =============================================================================
// Auth Handlers (REST API)
// =============================================================================

/**
 * Login to n8n and get session cookie
 *
 * Required for REST API operations like listing all credentials.
 * Returns session cookie to use with subsequent REST API calls.
 *
 * @param input.email - n8n user email
 * @param input.password - n8n user password
 * @returns Session cookie string
 */
export const n8nLogin: WrappedHandler = createClientHandler(
  N8nLoginSchema,
  async (input, client) => {
    const sessionCookie = await client.login(input.email, input.password);

    return createSuccessResponse({
      message: 'Login successful',
      sessionCookie,
      note: 'Use this sessionCookie with list-credentials and other REST API tools',
    });
  }
);

// =============================================================================
// Credential Handlers
// =============================================================================

/**
 * List all credentials via REST API
 *
 * Requires session cookie from n8n-login.
 * Returns full credential list with details.
 *
 * @param input.sessionCookie - Session cookie from n8n-login
 * @param input.includeScopes - Include credential scopes (default: true)
 * @returns List of all credentials
 */
export const listCredentials: WrappedHandler = createClientHandler(
  ListCredentialsSchema,
  async (input, client) => {
    const credentials = await client.credentials.listAll(input.sessionCookie, {
      includeScopes: input.includeScopes,
    });

    return createSuccessResponse({
      total: credentials.length,
      credentials,
    });
  }
);

/**
 * List all credentials used across workflows
 *
 * Since n8n Public API doesn't support GET /credentials,
 * this extracts credential references from all workflows.
 *
 * @param input.type - Optional filter by credential type
 * @returns List of credentials with usage info
 */
export const listCredentialsInUse: WrappedHandler = createClientHandler(
  ListCredentialsInUseSchema,
  async (input, client) => {
    // Get all workflows
    const workflowsResponse = await client.workflows.list();
    const workflows = workflowsResponse.data || [];

    // Extract credentials from all workflows
    const credentialMap = new Map<string, CredentialReference>();

    for (const workflowSummary of workflows) {
      // Get full workflow to access nodes
      const workflow = (await client.workflows.get(
        String(workflowSummary.id)
      )) as N8nWorkflow;

      if (!workflow.nodes) continue;

      for (const node of workflow.nodes) {
        if (!node.credentials) continue;

        for (const [credType, credRef] of Object.entries(node.credentials)) {
          const cred = credRef as { id: string; name: string };
          if (!cred.id) continue;

          // Filter by type if specified
          if (input.type && credType !== input.type) continue;

          const key = cred.id;
          if (!credentialMap.has(key)) {
            credentialMap.set(key, {
              id: cred.id,
              name: cred.name,
              type: credType,
              usedInWorkflows: [],
            });
          }

          const existing = credentialMap.get(key)!;
          // Check if this workflow+node combo already exists
          const alreadyAdded = existing.usedInWorkflows.some(
            (w) =>
              w.id === String(workflow.id) && w.nodeName === node.name
          );
          if (!alreadyAdded) {
            existing.usedInWorkflows.push({
              id: String(workflow.id),
              name: workflow.name,
              nodeName: node.name,
            });
          }
        }
      }
    }

    const credentials = Array.from(credentialMap.values());

    return createSuccessResponse({
      total: credentials.length,
      credentials,
    });
  }
);

/**
 * Create a new credential
 *
 * @param input.name - Credential name
 * @param input.type - Credential type (e.g., 'githubApi', 'slackOAuth2Api')
 * @param input.data - Credential data object containing type-specific fields
 * @returns Created credential details
 */
export const createCredential: WrappedHandler = createClientHandler(
  CreateCredentialSchema,
  async (input, client) => {
    const credential = await client.credentials.create(
      input.name,
      input.type,
      input.data as Parameters<typeof client.credentials.create>[2]
    );

    return createCrudResponse('created', 'credential', credential);
  }
);

/**
 * Delete a credential by ID
 *
 * @param input.id - Credential ID to delete
 * @returns Deleted credential details
 */
export const deleteCredential: WrappedHandler = createClientHandler(
  DeleteCredentialSchema,
  async (input, client) => {
    const credential = await client.credentials.delete(input.id);

    return createCrudResponse('deleted', 'credential', credential);
  }
);

/**
 * Get the schema for a credential type
 *
 * @param input.credentialTypeName - Credential type name (e.g., 'githubApi', 'slackOAuth2Api')
 * @returns Credential type schema with required and optional fields
 */
export const getCredentialSchema: WrappedHandler = createClientHandler(
  GetCredentialSchemaSchema,
  async (input, client) => {
    const schema = await client.credentials.getSchema(input.credentialTypeName);

    return createSuccessResponse(schema);
  }
);

// =============================================================================
// Registration
// =============================================================================

/**
 * Register all credential handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerCredentialHandlers(
  registry: HandlerRegistry = globalRegistry
): void {
  // Auth (REST API)
  registry.register('n8n-login', n8nLogin);

  // Credentials
  registry.register('list-credentials', listCredentials);
  registry.register('list-credentials-in-use', listCredentialsInUse);
  registry.register('create-credential', createCredential);
  registry.register('delete-credential', deleteCredential);
  registry.register('get-credential-schema', getCredentialSchema);
}
