/**
 * @module handlers/tag-handlers
 * @description Handlers for n8n tag operations
 *
 * Provides handlers for:
 * - listTags: List all tags
 * - createTag: Create a new tag
 * - getTag: Get tag by ID
 * - updateTag: Update tag name
 * - deleteTag: Delete a tag
 * - getWorkflowTags: Get tags for a workflow
 * - updateWorkflowTags: Update tags for a workflow
 */

import {
  ListTagsSchema,
  CreateTagSchema,
  GetTagSchema,
  UpdateTagSchema,
  DeleteTagSchema,
  GetWorkflowTagsSchema,
  UpdateWorkflowTagsSchema,
} from '../schemas/tool-inputs.js';
import { createSuccessResponse } from '../types/mcp.js';
import {
  createClientHandler,
  globalRegistry,
  type WrappedHandler,
} from './registry.js';

// =============================================================================
// Tag Handlers
// =============================================================================

/**
 * List all tags from the n8n instance
 *
 * @param input.limit - Optional maximum number of tags to return
 * @returns Formatted list of tags with id and name
 */
export const listTags: WrappedHandler = createClientHandler(
  ListTagsSchema,
  async (input, client) => {
    const tagList = await client.getTags({ limit: input.limit });
    return createSuccessResponse(tagList.data);
  }
);

/**
 * Create a new tag
 *
 * @param input.name - Name for the new tag
 * @returns Created tag details
 */
export const createTag: WrappedHandler = createClientHandler(
  CreateTagSchema,
  async (input, client) => {
    const tag = await client.createTag(input.name);
    return createSuccessResponse(
      `Successfully created tag:\n${JSON.stringify(tag, null, 2)}`
    );
  }
);

/**
 * Get a tag by ID
 *
 * @param input.id - Tag ID to retrieve
 * @returns Tag details
 */
export const getTag: WrappedHandler = createClientHandler(
  GetTagSchema,
  async (input, client) => {
    const tag = await client.getTag(input.id);
    return createSuccessResponse(tag);
  }
);

/**
 * Update a tag's name
 *
 * @param input.id - Tag ID to update
 * @param input.name - New tag name
 * @returns Updated tag details
 */
export const updateTag: WrappedHandler = createClientHandler(
  UpdateTagSchema,
  async (input, client) => {
    const tag = await client.updateTag(input.id, input.name);
    return createSuccessResponse(
      `Successfully updated tag:\n${JSON.stringify(tag, null, 2)}`
    );
  }
);

/**
 * Delete a tag by ID
 *
 * @param input.id - Tag ID to delete
 * @returns Deleted tag details
 */
export const deleteTag: WrappedHandler = createClientHandler(
  DeleteTagSchema,
  async (input, client) => {
    const tag = await client.deleteTag(input.id);
    return createSuccessResponse(
      `Successfully deleted tag:\n${JSON.stringify(tag, null, 2)}`
    );
  }
);

/**
 * Get all tags associated with a workflow
 *
 * @param input.workflowId - Workflow ID to get tags for
 * @returns List of tags for the workflow
 */
export const getWorkflowTags: WrappedHandler = createClientHandler(
  GetWorkflowTagsSchema,
  async (input, client) => {
    const tags = await client.getWorkflowTags(String(input.workflowId));
    return createSuccessResponse(tags);
  }
);

/**
 * Update tags for a workflow
 *
 * @param input.workflowId - Workflow ID to update tags for
 * @param input.tagIds - Array of tag IDs to associate with the workflow
 * @returns Updated workflow details
 */
export const updateWorkflowTags: WrappedHandler = createClientHandler(
  UpdateWorkflowTagsSchema,
  async (input, client) => {
    const updatedWorkflow = await client.updateWorkflowTags(
      String(input.workflowId),
      input.tagIds
    );
    return createSuccessResponse(
      `Successfully updated workflow tags:\n${JSON.stringify(updatedWorkflow, null, 2)}`
    );
  }
);

// =============================================================================
// Registration
// =============================================================================

import type { HandlerRegistry } from './registry.js';

/**
 * Register all tag handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerTagHandlers(registry: HandlerRegistry = globalRegistry): void {
  registry.register('list-tags', listTags);
  registry.register('create-tag', createTag);
  registry.register('get-tag', getTag);
  registry.register('update-tag', updateTag);
  registry.register('delete-tag', deleteTag);
  registry.register('get-workflow-tags', getWorkflowTags);
  registry.register('update-workflow-tags', updateWorkflowTags);
}
