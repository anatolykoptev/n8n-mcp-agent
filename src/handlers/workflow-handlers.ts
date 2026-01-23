/**
 * @module handlers/workflow-handlers
 * @description Handlers for n8n workflow operations
 *
 * Provides handlers for:
 * - listWorkflows: List all workflows
 * - getWorkflow: Get workflow by ID
 * - createWorkflow: Create a new workflow
 * - updateWorkflow: Update an existing workflow
 * - deleteWorkflow: Delete a workflow
 * - activateWorkflow: Activate a workflow
 * - deactivateWorkflow: Deactivate a workflow
 * - executeWebhook: Execute workflow via webhook URL
 * - getWebhookUrl: Get webhook URL from workflow
 */

import {
  ListWorkflowsSchema,
  GetWorkflowSchema,
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  DeleteWorkflowSchema,
  ActivateWorkflowSchema,
  DeactivateWorkflowSchema,
  ExecuteWebhookSchema,
  GetWebhookUrlSchema,
} from '../schemas/tool-inputs.js';
import { createSuccessResponse } from '../types/mcp.js';
import {
  createClientHandler,
  globalRegistry,
  type WrappedHandler,
} from './registry.js';

// =============================================================================
// Workflow Handlers
// =============================================================================

/**
 * List all workflows from the n8n instance
 *
 * @returns Formatted list of workflows with id, name, active status, and timestamps
 */
export const listWorkflows: WrappedHandler = createClientHandler(
  ListWorkflowsSchema,
  async (_input, client) => {
    const workflows = await client.workflows.list();

    // Format workflows for cleaner output
    const formattedWorkflows = workflows.data.map((wf) => ({
      id: wf.id,
      name: wf.name,
      active: wf.active,
      created: wf.createdAt,
      updated: wf.updatedAt,
      tags: wf.tags,
    }));

    return createSuccessResponse(formattedWorkflows);
  }
);

/**
 * Get a workflow by ID
 *
 * @param input.id - Workflow ID to retrieve
 * @returns Full workflow details including nodes and connections
 */
export const getWorkflow: WrappedHandler = createClientHandler(
  GetWorkflowSchema,
  async (input, client) => {
    const workflow = await client.workflows.get(String(input.id));
    return createSuccessResponse(workflow);
  }
);

/**
 * Create a new workflow
 *
 * @param input.name - Name for the new workflow
 * @param input.nodes - Optional array of workflow nodes
 * @param input.connections - Optional workflow connections object
 * @returns Created workflow details
 */
export const createWorkflow: WrappedHandler = createClientHandler(
  CreateWorkflowSchema,
  async (input, client) => {
    // Cast to expected types - Zod validates structure, we cast for TypeScript
    const workflow = await client.workflows.create(
      input.name,
      input.nodes as unknown as Parameters<typeof client.workflows.create>[1],
      input.connections as unknown as Parameters<typeof client.workflows.create>[2]
    );

    return createSuccessResponse(
      `Successfully created workflow:\n${JSON.stringify(workflow, null, 2)}`
    );
  }
);

/**
 * Update an existing workflow
 *
 * @param input.id - Workflow ID to update
 * @param input.workflow - Partial workflow object with fields to update
 * @returns Updated workflow details
 */
export const updateWorkflow: WrappedHandler = createClientHandler(
  UpdateWorkflowSchema,
  async (input, client) => {
    // Cast to expected type - Zod validates structure, we cast for TypeScript
    const updatedWorkflow = await client.workflows.update(
      String(input.id),
      input.workflow as Parameters<typeof client.workflows.update>[1]
    );

    return createSuccessResponse(
      `Successfully updated workflow:\n${JSON.stringify(updatedWorkflow, null, 2)}`
    );
  }
);

/**
 * Delete a workflow by ID
 *
 * @param input.id - Workflow ID to delete
 * @returns Deleted workflow details
 */
export const deleteWorkflow: WrappedHandler = createClientHandler(
  DeleteWorkflowSchema,
  async (input, client) => {
    const workflow = await client.workflows.delete(String(input.id));

    return createSuccessResponse(
      `Successfully deleted workflow:\n${JSON.stringify(workflow, null, 2)}`
    );
  }
);

/**
 * Activate a workflow
 *
 * @param input.id - Workflow ID to activate
 * @returns Activated workflow details
 */
export const activateWorkflow: WrappedHandler = createClientHandler(
  ActivateWorkflowSchema,
  async (input, client) => {
    const workflow = await client.workflows.activate(String(input.id));

    return createSuccessResponse(
      `Successfully activated workflow:\n${JSON.stringify(workflow, null, 2)}`
    );
  }
);

/**
 * Deactivate a workflow
 *
 * @param input.id - Workflow ID to deactivate
 * @returns Deactivated workflow details
 */
export const deactivateWorkflow: WrappedHandler = createClientHandler(
  DeactivateWorkflowSchema,
  async (input, client) => {
    const workflow = await client.workflows.deactivate(String(input.id));

    return createSuccessResponse(
      `Successfully deactivated workflow:\n${JSON.stringify(workflow, null, 2)}`
    );
  }
);

/**
 * Execute a workflow via its webhook URL
 *
 * @param input.webhookPath - Webhook path (e.g., "my-webhook")
 * @param input.method - HTTP method (default: POST)
 * @param input.data - Request body data (for POST/PUT)
 * @param input.headers - Additional headers
 * @param input.timeout - Request timeout in ms (default: 30000)
 * @returns Webhook response with status, data, and headers
 */
export const executeWebhook: WrappedHandler = createClientHandler(
  ExecuteWebhookSchema,
  async (input, client) => {
    const result = await client.webhooks.execute(input.webhookPath, {
      method: input.method,
      data: input.data as Record<string, unknown> | undefined,
      headers: input.headers,
      timeout: input.timeout,
    });

    return createSuccessResponse({
      status: result.status,
      statusText: result.status >= 200 && result.status < 300 ? 'OK' : 'Error',
      data: result.data,
      headers: result.headers,
    });
  }
);

/**
 * Get the webhook URL for a workflow
 *
 * @param input.id - Workflow ID
 * @returns Webhook URL and path information, or error if no webhook found
 */
export const getWebhookUrl: WrappedHandler = createClientHandler(
  GetWebhookUrlSchema,
  async (input, client) => {
    const workflow = await client.workflows.get(String(input.id));
    const webhookInfo = client.webhooks.getInfo(workflow);

    if (!webhookInfo) {
      return createSuccessResponse({
        found: false,
        message: 'No webhook trigger node found in this workflow',
      });
    }

    return createSuccessResponse({
      found: true,
      ...webhookInfo,
    });
  }
);

// =============================================================================
// Registration
// =============================================================================

import type { HandlerRegistry } from './registry.js';

/**
 * Register all workflow handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerWorkflowHandlers(registry: HandlerRegistry = globalRegistry): void {
  registry.register('list-workflows', listWorkflows);
  registry.register('get-workflow', getWorkflow);
  registry.register('create-workflow', createWorkflow);
  registry.register('update-workflow', updateWorkflow);
  registry.register('delete-workflow', deleteWorkflow);
  registry.register('activate-workflow', activateWorkflow);
  registry.register('deactivate-workflow', deactivateWorkflow);
  registry.register('execute-webhook', executeWebhook);
  registry.register('get-webhook-url', getWebhookUrl);
}
