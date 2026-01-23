/**
 * @module handlers/test-workflow-handler
 * @description Universal workflow testing handler
 *
 * Supports two patterns:
 * 1. Direct Webhook - for workflows with Webhook trigger
 * 2. Test Runner - for workflows with Execute Sub-workflow Trigger
 *
 * Can auto-convert Manual/Schedule Trigger workflows by adding Execute Sub-workflow Trigger.
 *
 * @architecture Keep this file thin (~300 lines). New functionality goes to:
 * - utils/workflow-helpers.ts — workflow detection, conversion, search
 * - utils/error-diagnosis.ts — error parsing, diagnosis lookup tables
 * - Create new utils/*.ts for unrelated domains (e.g., retry logic, caching)
 */

import { TestWorkflowSchema } from '../schemas/tool-inputs.js';
import { createSuccessResponse, createErrorResponse } from '../types/mcp.js';
import {
  createClientHandler,
  globalRegistry,
  type HandlerRegistry,
  type WrappedHandler,
} from './registry.js';
import type { N8nWorkflow } from '../types/n8n.js';
import {
  detectTriggerType,
  getWebhookPath,
  hasSubworkflowTrigger,
  findFirstNodeAfterTrigger,
  addExecuteWorkflowTrigger,
  findTestRunner,
} from '../utils/workflow-helpers.js';
import {
  buildDiagnosis,
  buildEnhancedDiagnosis,
  getExecutionErrorDetails,
  parseWebhookResponse,
} from '../utils/error-diagnosis.js';

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Test a workflow
 *
 * Automatically detects trigger type and uses appropriate testing method:
 * - Webhook trigger: Direct webhook call
 * - Execute Sub-workflow Trigger: Via Test Runner
 * - Manual/Schedule Trigger: Requires autoConvert or manual conversion
 */
export const testWorkflow: WrappedHandler = createClientHandler(
  TestWorkflowSchema,
  async (input, client) => {
    const workflowId = String(input.workflowId);
    const testData = input.data || { test: true, source: 'mcp-test-workflow' };
    const startedAt = new Date().toISOString();

    // Step 1: Get workflow details
    let workflow: N8nWorkflow;
    try {
      workflow = await client.workflows.get(workflowId);
    } catch (error) {
      return createErrorResponse(
        `Failed to get workflow ${workflowId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Step 2: Detect trigger type
    let triggerType = detectTriggerType(workflow);
    const originalTriggerType = triggerType;

    // Step 3: Handle Manual/Schedule Trigger (auto-convert if requested)
    if (
      (triggerType === 'manualTrigger' || triggerType === 'scheduleTrigger') &&
      input.autoConvert
    ) {
      if (!hasSubworkflowTrigger(workflow)) {
        const targetNode = findFirstNodeAfterTrigger(workflow);
        if (!targetNode) {
          return createErrorResponse(
            'Cannot auto-convert: Unable to determine target node. ' +
              'Manual Trigger must be connected to another node.'
          );
        }

        try {
          workflow = await addExecuteWorkflowTrigger(client, workflow, targetNode);
          triggerType = 'executeWorkflowTrigger';
        } catch (error) {
          return createErrorResponse(
            `Failed to add Execute Sub-workflow Trigger: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      } else {
        triggerType = 'executeWorkflowTrigger';
      }
    }

    // Step 4: Validate trigger type is testable
    if (triggerType === 'manualTrigger' || triggerType === 'scheduleTrigger') {
      return createSuccessResponse({
        status: 'error',
        workflowId,
        workflowName: workflow.name,
        triggerType,
        message: `Workflow has ${triggerType} which cannot be tested via API`,
        diagnosis: buildDiagnosis(triggerType),
        suggestion: 'Use autoConvert: true to automatically add Execute Sub-workflow Trigger',
      });
    }

    if (triggerType === 'other') {
      return createSuccessResponse({
        status: 'error',
        workflowId,
        workflowName: workflow.name,
        triggerType,
        message: 'No testable trigger found in workflow',
        diagnosis: buildDiagnosis(triggerType),
      });
    }

    // Step 5: Ensure workflow is active
    if (!workflow.active) {
      try {
        await client.workflows.activate(workflowId);
      } catch (error) {
        return createErrorResponse(
          `Failed to activate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Step 6: Execute test based on trigger type
    let response: { status: number; data: unknown };
    let testMethod: 'direct' | 'testRunner';

    if (triggerType === 'webhook') {
      const webhookPath = getWebhookPath(workflow);
      if (!webhookPath) {
        return createErrorResponse('Webhook trigger found but no path configured');
      }

      testMethod = 'direct';
      try {
        response = await client.webhooks.execute(webhookPath, {
          method: 'POST',
          data: testData as Record<string, unknown>,
          timeout: input.timeout,
        });
      } catch (error) {
        return createSuccessResponse({
          status: 'error',
          workflowId,
          workflowName: workflow.name,
          triggerType,
          testMethod,
          error: error instanceof Error ? error.message : 'Unknown error',
          diagnosis: buildDiagnosis(triggerType, {
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
          startedAt,
          finishedAt: new Date().toISOString(),
        });
      }
    } else {
      testMethod = 'testRunner';

      const testRunner = await findTestRunner(client);
      if (!testRunner) {
        return createSuccessResponse({
          status: 'error',
          workflowId,
          workflowName: workflow.name,
          triggerType,
          testMethod,
          message: 'Test Runner workflow not found',
          diagnosis: {
            possibleCauses: ['Test Runner workflow has not been set up'],
            suggestedActions: [
              'Run setup-test-runner.sh script to create Test Runner',
              `Or create Test Runner workflow manually with webhook at path: ${input.testRunnerPath}`,
            ],
          },
        });
      }

      if (!testRunner.active) {
        await client.workflows.activate(String(testRunner.id));
      }

      try {
        response = await client.webhooks.execute(input.testRunnerPath, {
          method: 'POST',
          data: {
            workflowId,
            input: testData,
            source: 'mcp-test-workflow',
            timestamp: startedAt,
          },
          timeout: input.timeout,
        });
      } catch (error) {
        return createSuccessResponse({
          status: 'error',
          workflowId,
          workflowName: workflow.name,
          triggerType,
          testMethod,
          error: error instanceof Error ? error.message : 'Unknown error',
          diagnosis: buildDiagnosis(triggerType, {
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
          startedAt,
          finishedAt: new Date().toISOString(),
        });
      }
    }

    // Step 7: Parse response using official n8n structure parser
    const finishedAt = new Date().toISOString();
    const { data: responseData, executionResult, errorDetails: parsedError } = parseWebhookResponse(response.data);

    // Check for error status (from executionResult or parsed error)
    const isError = executionResult?.status === 'error' || parsedError?.message;

    if (isError) {
      // Try to get detailed error from n8n Execution API first
      const errorDetails = await getExecutionErrorDetails(client, workflowId);

      if (errorDetails) {
        return createSuccessResponse({
          status: 'error',
          workflowId,
          workflowName: workflow.name,
          triggerType,
          originalTriggerType: originalTriggerType !== triggerType ? originalTriggerType : undefined,
          converted: originalTriggerType !== triggerType,
          testMethod,
          error: {
            node: errorDetails.lastNodeExecuted,
            nodeType: errorDetails.nodeType,
            message: errorDetails.errorMessage,
            description: errorDetails.errorDescription,
            httpCode: errorDetails.httpCode,
            credential: errorDetails.credentialName
              ? { name: errorDetails.credentialName, id: errorDetails.credentialId }
              : null,
            apiEndpoint: errorDetails.apiEndpoint,
          },
          diagnosis: buildEnhancedDiagnosis(errorDetails),
          startedAt,
          finishedAt,
        });
      }

      // Use parsed error from response if available (Test Runner or n8n error response)
      if (parsedError?.nodeName || parsedError?.message) {
        return createSuccessResponse({
          status: 'error',
          workflowId,
          workflowName: workflow.name,
          triggerType,
          originalTriggerType: originalTriggerType !== triggerType ? originalTriggerType : undefined,
          converted: originalTriggerType !== triggerType,
          testMethod,
          error: {
            node: parsedError.nodeName || 'unknown',
            nodeType: parsedError.nodeType || null,
            message: parsedError.message || 'Workflow execution failed',
            httpCode: parsedError.httpCode || null,
          },
          diagnosis: buildDiagnosis(triggerType, {
            message: parsedError.message || 'Workflow execution failed',
            node: parsedError.nodeName,
          }),
          startedAt,
          finishedAt,
        });
      }

      // Fallback to basic diagnosis from executionResult
      return createSuccessResponse({
        status: 'error',
        workflowId,
        workflowName: workflow.name,
        triggerType,
        originalTriggerType: originalTriggerType !== triggerType ? originalTriggerType : undefined,
        converted: originalTriggerType !== triggerType,
        testMethod,
        execution: executionResult,
        diagnosis: buildDiagnosis(triggerType, {
          message: (executionResult?.error?.message as string) || 'Workflow execution failed',
          node: executionResult?.error?.node as string | undefined,
        }),
        startedAt,
        finishedAt,
      });
    }

    // Success
    return createSuccessResponse({
      status: 'success',
      workflowId,
      workflowName: workflow.name,
      triggerType,
      originalTriggerType: originalTriggerType !== triggerType ? originalTriggerType : undefined,
      converted: originalTriggerType !== triggerType,
      testMethod,
      response: {
        httpStatus: response.status,
        data: responseData,
      },
      execution: executionResult,
      startedAt,
      finishedAt,
    });
  }
);

// =============================================================================
// Registration
// =============================================================================

/**
 * Register test workflow handler with a registry
 */
export function registerTestWorkflowHandlers(
  registry: HandlerRegistry = globalRegistry
): void {
  registry.register('test-workflow', testWorkflow);
}
