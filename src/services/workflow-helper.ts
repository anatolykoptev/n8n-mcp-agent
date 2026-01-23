/**
 * @module services/workflow-helper
 * @description Advanced workflow manipulation helpers
 *
 * Provides smart methods for:
 * - Extracting webhook URLs from workflows
 * - Duplicating workflows with credential stripping
 * - Adding nodes to existing workflows
 * - Creating workflows from templates
 */

import type { N8nClient } from '../clients/n8n-client.js';
import type { N8nWorkflowNode } from '../types/n8n.js';

// =============================================================================
// Types
// =============================================================================

export interface WebhookUrlResult {
  success: boolean;
  url?: string;
  path?: string;
  method?: string;
  error?: string;
}

export interface DuplicateResult {
  success: boolean;
  workflowId?: string;
  name?: string;
  error?: string;
}

export interface AddNodeResult {
  success: boolean;
  nodeName?: string;
  error?: string;
}

export interface WorkflowNode {
  name: string;
  type: string;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

// =============================================================================
// Workflow Helper Class
// =============================================================================

export class WorkflowHelper {
  constructor(
    private client: N8nClient,
    private baseUrl: string
  ) {}

  /**
   * Extract webhook URL from a workflow
   * Finds webhook nodes and builds the full URL
   *
   * @param workflowId - Workflow ID
   * @returns Webhook URL info or error
   */
  async getWebhookUrl(workflowId: string): Promise<WebhookUrlResult> {
    try {
      const workflow = await this.client.getWorkflow(workflowId);

      if (!workflow.nodes || workflow.nodes.length === 0) {
        return { success: false, error: 'Workflow has no nodes' };
      }

      // Find webhook node
      const webhookNode = workflow.nodes.find(
        (node) =>
          node.type?.toLowerCase().includes('webhook') ||
          node.type === 'n8n-nodes-base.webhook'
      );

      if (!webhookNode) {
        return { success: false, error: 'No webhook node found in workflow' };
      }

      // Extract path from node parameters
      const params = webhookNode.parameters as Record<string, unknown> | undefined;
      const path = (params?.path as string) ?? workflowId;
      const method = (params?.httpMethod as string) ?? 'GET';

      // Build full URL
      const baseUrlClean = this.baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
      const url = `${baseUrlClean}/webhook/${path}`;

      return {
        success: true,
        url,
        path,
        method,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Duplicate a workflow with credential stripping
   * Creates a copy safe for sharing/importing
   *
   * @param sourceId - Source workflow ID
   * @param newName - Name for the duplicate
   * @param stripCredentials - Remove credentials (default: true)
   * @returns Duplicate result
   */
  async duplicate(
    sourceId: string,
    newName: string,
    stripCredentials = true
  ): Promise<DuplicateResult> {
    try {
      const source = await this.client.getWorkflow(sourceId);

      // Process nodes
      const nodes = (source.nodes ?? []).map((node) => {
        const processedNode = { ...node };

        // Strip credentials if requested
        if (stripCredentials && processedNode.credentials) {
          delete processedNode.credentials;
        }

        return processedNode;
      });

      // Create new workflow
      const result = await this.client.createWorkflow(
        newName,
        nodes,
        source.connections ?? {}
      );

      return {
        success: true,
        workflowId: String(result.id),
        name: result.name,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Add a node to an existing workflow
   *
   * @param workflowId - Workflow ID
   * @param node - Node configuration
   * @returns Add result
   */
  async addNode(workflowId: string, node: WorkflowNode): Promise<AddNodeResult> {
    try {
      const workflow = await this.client.getWorkflow(workflowId);
      const existingNodes = workflow.nodes ?? [];

      // Check for duplicate name
      if (existingNodes.some((n) => n.name === node.name)) {
        return { success: false, error: `Node with name "${node.name}" already exists` };
      }

      // Add new node - cast to N8nWorkflowNode for type compatibility
      const newNode = node as unknown as N8nWorkflowNode;
      const updatedNodes = [...existingNodes, newNode];

      await this.client.updateWorkflow(workflowId, {
        nodes: updatedNodes,
      });

      return {
        success: true,
        nodeName: node.name,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Create a workflow with a trigger node
   *
   * @param name - Workflow name
   * @param triggerType - Trigger type: manual, webhook, or schedule
   * @param triggerConfig - Optional trigger configuration
   * @returns Created workflow info
   */
  async createWithTrigger(
    name: string,
    triggerType: 'manual' | 'webhook' | 'schedule',
    triggerConfig?: Record<string, unknown>
  ): Promise<DuplicateResult> {
    try {
      const triggerNode = this.buildTriggerNode(triggerType, triggerConfig);

      const result = await this.client.createWorkflow(
        name,
        [triggerNode as unknown as N8nWorkflowNode],
        {}
      );

      return {
        success: true,
        workflowId: String(result.id),
        name: result.name,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Get workflow statistics
   *
   * @param workflowId - Workflow ID
   * @returns Workflow statistics
   */
  async getStats(workflowId: string): Promise<{
    nodeCount: number;
    isActive: boolean;
    hasWebhook: boolean;
    hasCredentials: boolean;
    triggerType?: string;
  }> {
    try {
      const workflow = await this.client.getWorkflow(workflowId);
      const nodes = workflow.nodes ?? [];

      const hasWebhook = nodes.some((n) => n.type?.toLowerCase().includes('webhook'));
      const hasCredentials = nodes.some((n) => n.credentials && Object.keys(n.credentials).length > 0);

      // Find trigger node
      const triggerNode = nodes.find(
        (n) =>
          n.type?.includes('Trigger') ||
          n.type?.includes('webhook') ||
          n.type?.includes('Schedule') ||
          n.type === 'n8n-nodes-base.manualTrigger'
      );

      return {
        nodeCount: nodes.length,
        isActive: workflow.active ?? false,
        hasWebhook,
        hasCredentials,
        triggerType: triggerNode?.type,
      };
    } catch {
      return {
        nodeCount: 0,
        isActive: false,
        hasWebhook: false,
        hasCredentials: false,
      };
    }
  }

  /**
   * Build a trigger node based on type
   */
  private buildTriggerNode(
    type: 'manual' | 'webhook' | 'schedule',
    config?: Record<string, unknown>
  ): WorkflowNode {
    switch (type) {
      case 'webhook':
        return {
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          position: [250, 300],
          parameters: {
            path: config?.path ?? 'webhook',
            httpMethod: config?.method ?? 'POST',
            responseMode: 'onReceived',
            ...config,
          },
        };

      case 'schedule':
        return {
          name: 'Schedule Trigger',
          type: 'n8n-nodes-base.scheduleTrigger',
          position: [250, 300],
          parameters: {
            rule: {
              interval: [
                {
                  field: 'minutes',
                  minutesInterval: config?.interval ?? 60,
                },
              ],
            },
            ...config,
          },
        };

      case 'manual':
      default:
        return {
          name: 'Manual Trigger',
          type: 'n8n-nodes-base.manualTrigger',
          position: [250, 300],
          parameters: {},
        };
    }
  }
}
