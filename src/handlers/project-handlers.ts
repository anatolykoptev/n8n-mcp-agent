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
import { createSuccessResponse } from '../types/mcp.js';
import {
  createClientHandler,
  globalRegistry,
  type WrappedHandler,
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
    const projects = await client.listProjects();

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
    const project = await client.createProject(input.name);

    return createSuccessResponse(
      `Successfully created project:\n${JSON.stringify(project, null, 2)}`
    );
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
    await client.deleteProject(input.projectId);

    return createSuccessResponse(
      `Successfully deleted project: ${input.projectId}`
    );
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
    const updatedProject = await client.updateProject(
      input.projectId,
      input.name
    );

    return createSuccessResponse(
      `Successfully updated project:\n${JSON.stringify(updatedProject, null, 2)}`
    );
  }
);

// =============================================================================
// Registration
// =============================================================================

import type { HandlerRegistry } from './registry.js';

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
