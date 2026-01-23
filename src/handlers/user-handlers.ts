/**
 * @module handlers/user-handlers
 * @description Handlers for n8n user management operations
 *
 * Provides handlers for:
 * - listUsers: List all users
 * - createUsers: Create one or more users
 * - getUser: Get user by ID or email
 * - deleteUser: Delete a user
 */

import {
  ListUsersSchema,
  CreateUsersSchema,
  GetUserSchema,
  DeleteUserSchema,
} from '../schemas/tool-inputs.js';
import { createSuccessResponse } from '../types/mcp.js';
import {
  createClientHandler,
  globalRegistry,
  type WrappedHandler,
} from './registry.js';

// =============================================================================
// User Handlers
// =============================================================================

/**
 * List all users from the n8n instance
 *
 * @returns Formatted list of users with id, email, firstName, lastName, and role
 */
export const listUsers: WrappedHandler = createClientHandler(
  ListUsersSchema,
  async (_input, client) => {
    const users = await client.users.list();

    // Format users for cleaner output
    const formattedUsers = users.data.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    }));

    return createSuccessResponse(formattedUsers);
  }
);

/**
 * Create one or more users in the n8n instance
 *
 * @param input.users - Array of user objects with email and optional role
 * @returns Created user details
 */
export const createUsers: WrappedHandler = createClientHandler(
  CreateUsersSchema,
  async (input, client) => {
    // Cast to expected type - Zod validates structure, we cast for TypeScript
    const createdUsers = await client.users.create(
      input.users as Parameters<typeof client.users.create>[0]
    );

    return createSuccessResponse(
      `Successfully created ${createdUsers.length} user(s):\n${JSON.stringify(createdUsers, null, 2)}`
    );
  }
);

/**
 * Get a user by ID or email
 *
 * @param input.idOrEmail - User ID or email address to retrieve
 * @returns Full user details
 */
export const getUser: WrappedHandler = createClientHandler(
  GetUserSchema,
  async (input, client) => {
    const user = await client.users.get(input.idOrEmail);

    return createSuccessResponse(user);
  }
);

/**
 * Delete a user by ID or email
 *
 * @param input.idOrEmail - User ID or email address to delete
 * @returns Deleted user details
 */
export const deleteUser: WrappedHandler = createClientHandler(
  DeleteUserSchema,
  async (input, client) => {
    await client.users.delete(input.idOrEmail);

    return createSuccessResponse(
      `Successfully deleted user: ${input.idOrEmail}`
    );
  }
);

// =============================================================================
// Registration
// =============================================================================

import type { HandlerRegistry } from './registry.js';

/**
 * Register all user handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerUserHandlers(registry: HandlerRegistry = globalRegistry): void {
  registry.register('list-users', listUsers);
  registry.register('create-users', createUsers);
  registry.register('get-user', getUser);
  registry.register('delete-user', deleteUser);
}
