/**
 * @module handlers/project-handlers
 * @description Handlers for n8n project operations
 *
 * Provides handlers for:
 * - listProjects: List all projects
 * - createProject: Create a new project
 * - deleteProject: Delete a project by ID
 * - updateProject: Update project name
 */

import {
  ListProjectsSchema,
  CreateProjectSchema,
  DeleteProjectSchema,
  UpdateProjectSchema,
} from '../schemas/tool-inputs.js';
import { createSuccessResponse, createCrudResponse } from '../types/mcp.js';
import {
  createClientHandler,
  globalRegistry,
  type WrappedHandler,
  type HandlerRegistry,
} from './registry.js';

// =============================================================================
// Project Handlers
// =============================================================================

/**
 * List all projects from the n8n instance
 *
 * @returns Formatted list of projects with id, name, and metadata
 */
export const listProjects: WrappedHandler = createClientHandler(
  ListProjectsSchema,
  async (_input, client) => {
    const projects = await client.projects.list();

    return createSuccessResponse(projects);
  }
);

/**
 * Create a new project
 *
 * @param input.name - Name for the new project
 * @returns Created project details
 */
export const createProject: WrappedHandler = createClientHandler(
  CreateProjectSchema,
  async (input, client) => {
    await client.projects.create(input.name);

    return createCrudResponse('created', 'project', { name: input.name });
  }
);

/**
 * Delete a project by ID
 *
 * @param input.projectId - Project ID to delete
 * @returns Deletion confirmation
 */
export const deleteProject: WrappedHandler = createClientHandler(
  DeleteProjectSchema,
  async (input, client) => {
    await client.projects.delete(input.projectId);

    return createCrudResponse('deleted', 'project', { projectId: input.projectId });
  }
);

/**
 * Update a project's name
 *
 * @param input.projectId - Project ID to update
 * @param input.name - New name for the project
 * @returns Updated project details
 */
export const updateProject: WrappedHandler = createClientHandler(
  UpdateProjectSchema,
  async (input, client) => {
    await client.projects.update(input.projectId, input.name);

    return createCrudResponse('updated', 'project', { projectId: input.projectId, name: input.name });
  }
);

// =============================================================================
// Registration
// =============================================================================

/**
 * Register all project handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerProjectHandlers(
  registry: HandlerRegistry = globalRegistry
): void {
  registry.register('list-projects', listProjects);
  registry.register('create-project', createProject);
  registry.register('delete-project', deleteProject);
  registry.register('update-project', updateProject);
}
