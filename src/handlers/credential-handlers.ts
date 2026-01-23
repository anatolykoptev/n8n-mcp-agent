/**
 * @module handlers/credential-handlers
 * @description Handlers for n8n credential operations
 *
 * Provides handlers for:
 * - createCredential: Create a new credential
 * - deleteCredential: Delete a credential by ID
 * - getCredentialSchema: Get schema for a credential type
 */

import {
  CreateCredentialSchema,
  DeleteCredentialSchema,
  GetCredentialSchemaSchema,
} from '../schemas/tool-inputs.js';
import { createSuccessResponse } from '../types/mcp.js';
import {
  createClientHandler,
  globalRegistry,
  type WrappedHandler,
} from './registry.js';

// =============================================================================
// Credential Handlers
// =============================================================================

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

    return createSuccessResponse(
      `Successfully created credential:\n${JSON.stringify(credential, null, 2)}`
    );
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

    return createSuccessResponse(
      `Successfully deleted credential:\n${JSON.stringify(credential, null, 2)}`
    );
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

    return createSuccessResponse(
      `Schema for credential type "${input.credentialTypeName}":\n${JSON.stringify(schema, null, 2)}`
    );
  }
);

// =============================================================================
// Registration
// =============================================================================

import type { HandlerRegistry } from './registry.js';

/**
 * Register all credential handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerCredentialHandlers(
  registry: HandlerRegistry = globalRegistry
): void {
  registry.register('create-credential', createCredential);
  registry.register('delete-credential', deleteCredential);
  registry.register('get-credential-schema', getCredentialSchema);
}
