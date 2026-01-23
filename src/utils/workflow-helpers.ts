/**
 * @module utils/workflow-helpers
 * @description Utilities for workflow analysis and manipulation
 */

import type { N8nClient } from '../handlers/registry.js';
import type { N8nWorkflow, N8nWorkflowNode, N8nWorkflowConnections } from '../types/n8n.js';
import type { TriggerType } from '../schemas/tool-inputs.js';

// =============================================================================
// Constants
// =============================================================================

export const TEST_RUNNER_NAME = 'Test Runner';

export const TRIGGER_TYPES = {
  WEBHOOK: 'n8n-nodes-base.webhook',
  EXECUTE_WORKFLOW_TRIGGER: 'n8n-nodes-base.executeWorkflowTrigger',
  MANUAL_TRIGGER: 'n8n-nodes-base.manualTrigger',
  SCHEDULE_TRIGGER: 'n8n-nodes-base.scheduleTrigger',
} as const;

// =============================================================================
// Trigger Detection
// =============================================================================

/**
 * Detect the trigger type of a workflow
 */
export function detectTriggerType(workflow: N8nWorkflow): TriggerType {
  const nodes = workflow.nodes || [];

  for (const node of nodes) {
    switch (node.type) {
      case TRIGGER_TYPES.WEBHOOK:
        return 'webhook';
      case TRIGGER_TYPES.EXECUTE_WORKFLOW_TRIGGER:
        return 'executeWorkflowTrigger';
      case TRIGGER_TYPES.MANUAL_TRIGGER:
        return 'manualTrigger';
      case TRIGGER_TYPES.SCHEDULE_TRIGGER:
        return 'scheduleTrigger';
    }
  }

  return 'other';
}

/**
 * Get webhook path from workflow
 */
export function getWebhookPath(workflow: N8nWorkflow): string | null {
  const nodes = workflow.nodes || [];
  const webhookNode = nodes.find((n) => n.type === TRIGGER_TYPES.WEBHOOK);

  if (!webhookNode?.parameters) return null;
  return (webhookNode.parameters.path as string) || null;
}

/**
 * Check if workflow has Execute Sub-workflow Trigger
 */
export function hasSubworkflowTrigger(workflow: N8nWorkflow): boolean {
  return workflow.nodes?.some(
    (n) => n.type === TRIGGER_TYPES.EXECUTE_WORKFLOW_TRIGGER
  ) ?? false;
}

// =============================================================================
// Workflow Modification
// =============================================================================

/**
 * Find the first node after trigger (for adding sub-workflow trigger connection)
 */
export function findFirstNodeAfterTrigger(workflow: N8nWorkflow): string | null {
  const nodes = workflow.nodes || [];
  const connections = workflow.connections || {};

  const triggerNode = nodes.find(
    (n) =>
      n.type === TRIGGER_TYPES.MANUAL_TRIGGER || n.type === TRIGGER_TYPES.SCHEDULE_TRIGGER
  );

  if (!triggerNode) return null;

  const triggerConnections = connections[triggerNode.name];
  if (!triggerConnections?.main?.[0]?.[0]) return null;

  return triggerConnections.main[0][0].node;
}

/**
 * Add Execute Sub-workflow Trigger to a workflow
 */
export async function addExecuteWorkflowTrigger(
  client: N8nClient,
  workflow: N8nWorkflow,
  targetNodeName: string
): Promise<N8nWorkflow> {
  const nodes = [...(workflow.nodes || [])];
  const connections: N8nWorkflowConnections = { ...(workflow.connections || {}) };

  // Find trigger position to place new node below
  const triggerNode = nodes.find(
    (n) =>
      n.type === TRIGGER_TYPES.MANUAL_TRIGGER || n.type === TRIGGER_TYPES.SCHEDULE_TRIGGER
  );

  const position: [number, number] = triggerNode
    ? [triggerNode.position[0], triggerNode.position[1] + 200]
    : [250, 500];

  // Create new trigger node
  const newNode: N8nWorkflowNode = {
    parameters: {},
    id: 'subworkflow-trigger-added',
    name: 'Execute Sub-workflow Trigger',
    type: TRIGGER_TYPES.EXECUTE_WORKFLOW_TRIGGER,
    typeVersion: 1,
    position,
  };

  nodes.push(newNode);

  // Add connection to target node
  connections['Execute Sub-workflow Trigger'] = {
    main: [[{ node: targetNodeName, type: 'main', index: 0 }]],
  };

  return client.workflows.update(String(workflow.id), {
    name: workflow.name,
    nodes,
    connections,
    settings: workflow.settings || {},
  });
}

// =============================================================================
// Test Runner
// =============================================================================

/**
 * Find Test Runner workflow
 */
export async function findTestRunner(client: N8nClient): Promise<N8nWorkflow | null> {
  const workflows = await client.workflows.list();
  return workflows.data.find((wf) => wf.name === TEST_RUNNER_NAME) || null;
}
