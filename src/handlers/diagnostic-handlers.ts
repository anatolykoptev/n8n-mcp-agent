/**
 * @module handlers/diagnostic-handlers
 * @description Handlers for n8n diagnostic operations
 *
 * Provides handlers for:
 * - diagnoseN8n: Comprehensive diagnostics
 * - analyzeLogs: Log pattern analysis
 * - healthCheck: Quick health check
 */

import { createSuccessResponse } from '../types/mcp.js';
import {
  createClientHandler,
  createHandler,
  globalRegistry,
  type WrappedHandler,
  type HandlerRegistry,
} from './registry.js';
import {
  DiagnoseN8nSchema,
  AnalyzeLogsSchema,
  HealthCheckSchema,
} from '../schemas/tool-inputs.js';
import {
  AlertLevel,
  analyzeLogs as analyzeLogsUtil,
  summarizeResults,
  isBotScannerRequest,
  type LogAnalysisResult,
} from '../utils/log-patterns.js';
import { CLIENT_ERRORS } from '../constants/errors.js';

// =============================================================================
// Diagnostic Types
// =============================================================================

interface DiagnosticReport {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    api: {
      status: 'ok' | 'error';
      latencyMs?: number;
      error?: string;
    };
    workflows: {
      total: number;
      active: number;
      inactive: number;
    };
    executions?: {
      recent: number;
      failed: number;
      failureRate: number;
    };
    logAnalysis?: {
      totalIssues: number;
      critical: number;
      errors: number;
      warnings: number;
      summary: Record<string, { count: number; levels: Record<AlertLevel, number> }>;
    };
  };
  issues: Array<{
    level: AlertLevel;
    category: string;
    description: string;
    suggestedAction: string;
  }>;
  recommendations: string[];
}

interface HealthCheckResult {
  healthy: boolean;
  timestamp: string;
  latencyMs: number;
  details: {
    apiReachable: boolean;
    workflowCount: number;
    activeWorkflows: number;
  };
  error?: string;
}

// =============================================================================
// Handler Functions
// =============================================================================

/**
 * Run comprehensive n8n diagnostics
 *
 * @param input.includeExecutions - Include execution analysis
 * @param input.logLines - Number of log lines to analyze
 * @param input.verbose - Include detailed output
 * @returns Diagnostic report with issues and recommendations
 */
export const diagnoseN8n: WrappedHandler = createClientHandler(
  DiagnoseN8nSchema,
  async (input, client) => {
    const startTime = Date.now();
    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        api: { status: 'ok' },
        workflows: { total: 0, active: 0, inactive: 0 },
      },
      issues: [],
      recommendations: [],
    };

    // Check API connectivity
    try {
      const workflows = await client.workflows.list();
      report.checks.api.latencyMs = Date.now() - startTime;

      // Analyze workflows
      const workflowData = workflows.data;
      report.checks.workflows = {
        total: workflowData.length,
        active: workflowData.filter((w) => w.active).length,
        inactive: workflowData.filter((w) => !w.active).length,
      };

      // Check for workflow issues
      if (report.checks.workflows.total === 0) {
        report.issues.push({
          level: AlertLevel.INFO,
          category: 'workflow',
          description: 'No workflows found',
          suggestedAction: 'Create workflows to automate tasks.',
        });
      } else if (report.checks.workflows.active === 0) {
        report.issues.push({
          level: AlertLevel.WARNING,
          category: 'workflow',
          description: 'All workflows are inactive',
          suggestedAction: 'Activate workflows that should be running.',
        });
      }

      // Analyze recent executions
      if (input.includeExecutions) {
        try {
          const executions = await client.executions.list({ limit: 50 });
          const recentExecs = executions.data;
          const failedExecs = recentExecs.filter(
            (e): e is typeof e & { status: 'error' } => e.status === 'error'
          );

          report.checks.executions = {
            recent: recentExecs.length,
            failed: failedExecs.length,
            failureRate:
              recentExecs.length > 0
                ? Math.round((failedExecs.length / recentExecs.length) * 100)
                : 0,
          };

          // Check failure rate
          if (report.checks.executions.failureRate > 50) {
            report.status = 'degraded';
            report.issues.push({
              level: AlertLevel.ERROR,
              category: 'execution',
              description: `High failure rate: ${report.checks.executions.failureRate}% of recent executions failed`,
              suggestedAction: 'Review failed executions and fix workflow issues.',
            });
          } else if (report.checks.executions.failureRate > 20) {
            report.issues.push({
              level: AlertLevel.WARNING,
              category: 'execution',
              description: `Elevated failure rate: ${report.checks.executions.failureRate}% of recent executions failed`,
              suggestedAction: 'Monitor failed executions and address recurring issues.',
            });
          }
        } catch (execError) {
          // Executions endpoint might not be available
          report.recommendations.push(
            'Could not fetch execution data. Ensure API has execution permissions.'
          );
        }
      }
    } catch (apiError) {
      report.checks.api = {
        status: 'error',
        error: apiError instanceof Error ? apiError.message : 'Unknown error',
      };
      report.status = 'unhealthy';
      report.issues.push({
        level: AlertLevel.CRITICAL,
        category: 'api',
        description: CLIENT_ERRORS.CONNECTION_FAILED,
        suggestedAction: 'Check n8n instance status and API credentials.',
      });
    }

    // Determine overall status
    const criticalIssues = report.issues.filter(
      (i) => i.level === AlertLevel.CRITICAL
    );
    const errorIssues = report.issues.filter(
      (i) => i.level === AlertLevel.ERROR
    );

    if (criticalIssues.length > 0) {
      report.status = 'unhealthy';
    } else if (errorIssues.length > 0) {
      report.status = 'degraded';
    }

    // Generate recommendations
    if (report.checks.workflows.inactive > report.checks.workflows.active) {
      report.recommendations.push(
        'Consider reviewing inactive workflows - they may need updates or removal.'
      );
    }

    if (!input.verbose) {
      // Return compact report
      return createSuccessResponse({
        status: report.status,
        timestamp: report.timestamp,
        summary: {
          workflows: `${report.checks.workflows.active}/${report.checks.workflows.total} active`,
          executions: report.checks.executions
            ? `${report.checks.executions.failureRate}% failure rate`
            : 'N/A',
          issues: report.issues.length,
        },
        issues: report.issues,
        recommendations: report.recommendations,
      });
    }

    return createSuccessResponse(report);
  }
);

/**
 * Analyze log messages for known error patterns
 *
 * @param input.logs - Array of log lines to analyze
 * @param input.service - Optional service filter
 * @param input.filterBotScans - Filter bot scanner requests
 * @returns Categorized analysis results
 */
export const analyzeLogs: WrappedHandler = createHandler(
  AnalyzeLogsSchema,
  async (input) => {
    const logs = input.filterBotScans
      ? input.logs.filter((log) => !isBotScannerRequest(log))
      : input.logs;

    const results = analyzeLogsUtil(logs, input.service);
    const summary = summarizeResults(results);

    // Group results by category for cleaner output
    const groupedResults: Record<string, LogAnalysisResult[]> = {};
    for (const result of results) {
      if (!groupedResults[result.category]) {
        groupedResults[result.category] = [];
      }
      groupedResults[result.category].push(result);
    }

    // Count by severity
    const severityCounts = {
      critical: results.filter((r) => r.level === AlertLevel.CRITICAL).length,
      error: results.filter((r) => r.level === AlertLevel.ERROR).length,
      warning: results.filter((r) => r.level === AlertLevel.WARNING).length,
      info: results.filter((r) => r.level === AlertLevel.INFO).length,
    };

    return createSuccessResponse({
      analyzed: input.logs.length,
      filtered: input.logs.length - logs.length,
      totalIssues: results.length,
      severity: severityCounts,
      summary,
      issues: groupedResults,
    });
  }
);

/**
 * Quick health check of n8n instance
 *
 * @param input.timeout - Health check timeout
 * @returns Health status with latency
 */
export const healthCheck: WrappedHandler = createClientHandler(
  HealthCheckSchema,
  async (_input, client) => {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      healthy: false,
      timestamp: new Date().toISOString(),
      latencyMs: 0,
      details: {
        apiReachable: false,
        workflowCount: 0,
        activeWorkflows: 0,
      },
    };

    try {
      const workflows = await client.workflows.list();
      const latency = Date.now() - startTime;

      result.healthy = true;
      result.latencyMs = latency;
      result.details = {
        apiReachable: true,
        workflowCount: workflows.data.length,
        activeWorkflows: workflows.data.filter((w) => w.active).length,
      };
    } catch (error) {
      result.latencyMs = Date.now() - startTime;
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return createSuccessResponse(result);
  }
);

// =============================================================================
// Registration
// =============================================================================

/**
 * Register all diagnostic handlers with a registry
 *
 * @param registry - The handler registry to register with (defaults to globalRegistry)
 */
export function registerDiagnosticHandlers(
  registry: HandlerRegistry = globalRegistry
): void {
  registry.register('n8n-diagnose', diagnoseN8n);
  registry.register('n8n-analyze-logs', analyzeLogs);
  registry.register('n8n-health-check', healthCheck);
}
