/**
 * @module services/execution-helper
 * @description Advanced execution monitoring and data extraction helpers
 *
 * Provides smart methods for:
 * - Extracting output data from nested runData structures
 * - Polling for execution completion with timeout
 * - Extracting error messages
 * - Batch operations
 */

import type { N8nClient } from '../clients/n8n-client.js';

// =============================================================================
// Types
// =============================================================================

export interface ExecutionOutput {
  success: boolean;
  data?: unknown;
  error?: string;
  nodeName?: string;
}

export interface WaitResult {
  success: boolean;
  executionId: string;
  status: 'success' | 'error' | 'waiting' | 'timeout';
  data?: unknown;
  error?: string;
  duration?: number;
}

export interface BatchDeleteResult {
  success: boolean;
  deletedCount?: number;
  error?: string;
}

// =============================================================================
// Execution Helper Class
// =============================================================================

export class ExecutionHelper {
  constructor(private client: N8nClient) {}

  /**
   * Extract output data from execution's nested runData structure
   * Navigates: execution.data → resultData → runData → lastNode → lastRun → data.main[0]
   *
   * @param executionId - Execution ID to extract output from
   * @returns Extracted output data or error
   */
  async getOutput(executionId: number): Promise<ExecutionOutput> {
    try {
      const execution = await this.client.getExecution(executionId, true);

      if (!execution.data) {
        return { success: false, error: 'Execution has no data' };
      }

      const resultData = (execution.data as Record<string, unknown>).resultData as
        | Record<string, unknown>
        | undefined;
      if (!resultData) {
        return { success: false, error: 'No resultData in execution' };
      }

      const runData = resultData.runData as Record<string, unknown[]> | undefined;
      if (!runData || Object.keys(runData).length === 0) {
        return { success: false, error: 'No runData in execution' };
      }

      // Get the last node's output
      const nodeNames = Object.keys(runData);
      const lastNodeName = nodeNames[nodeNames.length - 1];
      const nodeRuns = runData[lastNodeName];

      if (!nodeRuns || nodeRuns.length === 0) {
        return { success: false, error: `No runs for node: ${lastNodeName}` };
      }

      // Get the last run's data
      const lastRun = nodeRuns[nodeRuns.length - 1] as Record<string, unknown>;
      const data = lastRun.data as Record<string, unknown[][]> | undefined;

      if (!data || !data.main || !data.main[0]) {
        return { success: false, error: 'No output data in last run' };
      }

      return {
        success: true,
        data: data.main[0],
        nodeName: lastNodeName,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Wait for execution to complete with polling
   *
   * @param executionId - Execution ID to wait for
   * @param timeout - Maximum wait time in seconds (default: 60)
   * @param pollInterval - Interval between polls in seconds (default: 1)
   * @returns Execution result with status and data
   */
  async waitForCompletion(
    executionId: number,
    timeout = 60,
    pollInterval = 1
  ): Promise<WaitResult> {
    const startTime = Date.now();
    const timeoutMs = timeout * 1000;
    const pollIntervalMs = pollInterval * 1000;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const execution = await this.client.getExecution(executionId, true);

        if (execution.finished) {
          const duration = (Date.now() - startTime) / 1000;

          if (execution.status === 'success') {
            const output = await this.getOutput(executionId);
            return {
              success: true,
              executionId: String(executionId),
              status: 'success',
              data: output.data,
              duration,
            };
          } else {
            const errorMsg = await this.getError(executionId);
            return {
              success: false,
              executionId: String(executionId),
              status: 'error',
              error: errorMsg ?? 'Execution failed',
              duration,
            };
          }
        }

        // Wait before next poll
        await this.sleep(pollIntervalMs);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          executionId: String(executionId),
          status: 'error',
          error: message,
        };
      }
    }

    // Timeout reached
    return {
      success: false,
      executionId: String(executionId),
      status: 'timeout',
      error: `Execution did not complete within ${timeout} seconds`,
      duration: timeout,
    };
  }

  /**
   * Extract error message from failed execution
   *
   * @param executionId - Execution ID
   * @returns Error message or null if no error
   */
  async getError(executionId: number): Promise<string | null> {
    try {
      const execution = await this.client.getExecution(executionId, true);

      if (!execution.data) {
        return null;
      }

      const resultData = (execution.data as Record<string, unknown>).resultData as
        | Record<string, unknown>
        | undefined;
      if (!resultData) {
        return null;
      }

      const error = resultData.error as Record<string, unknown> | undefined;
      if (!error) {
        return null;
      }

      return (error.message as string) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Check if execution is still running
   *
   * @param executionId - Execution ID
   * @returns True if running, false otherwise
   */
  async isRunning(executionId: number): Promise<boolean> {
    try {
      const execution = await this.client.getExecution(executionId);
      return !execution.finished;
    } catch {
      return false;
    }
  }

  /**
   * Get execution status
   *
   * @param executionId - Execution ID
   * @returns Status string or 'unknown'
   */
  async getStatus(executionId: number): Promise<string> {
    try {
      const execution = await this.client.getExecution(executionId);
      return execution.status ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * List failed executions for a workflow
   *
   * @param workflowId - Optional workflow ID filter
   * @param limit - Maximum results (default: 10)
   * @returns Array of failed execution summaries
   */
  async listFailed(
    workflowId?: string,
    limit = 10
  ): Promise<Array<{ id: number; workflowId: number; startedAt: string; error?: string }>> {
    try {
      const result = await this.client.getExecutions({
        workflowId,
        status: 'error',
        limit,
      });

      return result.data.map((exec) => ({
        id: exec.id,
        workflowId: exec.workflowId,
        startedAt: exec.startedAt,
      }));
    } catch {
      return [];
    }
  }

  /**
   * List running executions
   *
   * @param workflowId - Optional workflow ID filter
   * @param limit - Maximum results (default: 10)
   * @returns Array of running execution summaries
   */
  async listRunning(
    workflowId?: string,
    limit = 10
  ): Promise<Array<{ id: number; workflowId: number; startedAt: string }>> {
    try {
      const result = await this.client.getExecutions({
        workflowId,
        status: 'waiting',
        limit,
      });

      return result.data.map((exec) => ({
        id: exec.id,
        workflowId: exec.workflowId,
        startedAt: exec.startedAt,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Delete multiple executions with filters
   *
   * @param options - Filter options
   * @returns Batch delete result
   */
  async deleteMany(options: {
    workflowId?: string;
    status?: 'error' | 'success' | 'waiting';
    limit?: number;
  }): Promise<BatchDeleteResult> {
    try {
      // Get executions matching filters
      const executions = await this.client.getExecutions({
        workflowId: options.workflowId,
        status: options.status,
        limit: options.limit ?? 100,
      });

      if (executions.data.length === 0) {
        return { success: true, deletedCount: 0 };
      }

      // Delete each execution
      let deletedCount = 0;
      for (const exec of executions.data) {
        try {
          await this.client.deleteExecution(exec.id);
          deletedCount++;
        } catch {
          // Continue with other deletions
        }
      }

      return { success: true, deletedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Sleep helper for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
