/**
 * @module utils/error-diagnosis
 * @description Error diagnosis utilities for workflow execution failures
 *
 * Follows official n8n error data structure from:
 * https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger
 */

import type { N8nClient } from '../handlers/registry.js';
import type { TriggerType } from '../schemas/tool-inputs.js';

// =============================================================================
// Types - Official n8n Response Structure
// =============================================================================

/**
 * Standard n8n error response structure (from Error Trigger docs)
 * Response is always an ARRAY containing execution/workflow objects
 */
export interface N8nErrorResponse {
  execution: {
    id?: string;
    url?: string;
    retryOf?: string;
    error: {
      message: string;
      stack?: string;
    };
    lastNodeExecuted: string;
    mode: string;
  };
  workflow: {
    id: string;
    name: string;
  };
}

/**
 * Alternative error structure for trigger node failures
 */
export interface N8nTriggerErrorResponse {
  trigger: {
    error: {
      context: Record<string, unknown>;
      name: string;
      cause: {
        message: string;
        stack?: string;
      };
      timestamp: number;
      message: string;
      node?: Record<string, unknown>;
    };
    mode: string;
  };
  workflow: {
    id: string;
    name: string;
  };
}

/**
 * Our Test Runner response structure
 */
export interface TestRunnerResponse {
  status: 'success' | 'error';
  execution?: {
    status: string;
    result?: unknown;
    error?: Record<string, unknown>;
  };
  error?: {
    nodeName?: string;
    nodeType?: string;
    httpCode?: string;
    errorMessage?: string;
    errorStack?: string;
  };
  data?: unknown;
}

export interface ExecutionErrorDetails {
  lastNodeExecuted: string;
  errorMessage: string;
  errorDescription: string | null;
  httpCode: string | null;
  nodeType: string | null;
  credentialName: string | null;
  credentialId: string | null;
  apiEndpoint: string | null;
}

export interface EnhancedDiagnosis {
  failedNode: string;
  errorCategory: string;
  possibleCauses: string[];
  suggestedActions: string[];
  fixInstructions: string;
}

export interface BasicDiagnosis {
  possibleCauses: string[];
  suggestedActions: string[];
}

interface DiagnosisTemplate {
  category: string;
  causes: string[];
  actions: (details: ExecutionErrorDetails) => string[];
  instructions: (details: ExecutionErrorDetails) => string;
}

// =============================================================================
// HTTP Error Diagnosis Lookup Table
// =============================================================================

const HTTP_ERROR_DIAGNOSIS: Record<number, DiagnosisTemplate> = {
  401: {
    category: 'authentication',
    causes: [
      'Invalid API credentials',
      'Expired access token',
      'Wrong API key configured',
    ],
    actions: (d) => [
      `Update credential "${d.credentialName}" (ID: ${d.credentialId}) in n8n`,
      'Regenerate API token in the external service',
      'Verify credential scopes/permissions',
    ],
    instructions: (d) =>
      `Go to n8n Credentials, find "${d.credentialName}", and update the API key/token`,
  },
  403: {
    category: 'authorization',
    causes: [
      'Insufficient API permissions',
      'Resource access denied',
      'IP not whitelisted',
    ],
    actions: () => [
      'Check API key permissions in external service',
      'Verify resource access rights',
      'Check IP whitelist settings',
    ],
    instructions: () =>
      'Check that the API key has sufficient permissions for the action being performed',
  },
  404: {
    category: 'not_found',
    causes: [
      'Resource does not exist',
      'Invalid endpoint URL',
      'Resource was deleted',
    ],
    actions: () => [
      'Verify the resource ID exists',
      'Check the API endpoint URL',
      "Ensure resource hasn't been deleted",
    ],
    instructions: (d) =>
      `Verify that the resource at "${d.apiEndpoint}" exists`,
  },
  429: {
    category: 'rate_limit',
    causes: ['Too many API requests', 'Rate limit exceeded'],
    actions: () => [
      'Wait and retry later',
      'Implement request throttling',
      'Upgrade API plan for higher limits',
    ],
    instructions: () =>
      'Wait a few minutes and retry, or add delay between requests',
  },
};

const SERVER_ERROR_DIAGNOSIS: DiagnosisTemplate = {
  category: 'server_error',
  causes: [
    'External service is down',
    'Server-side error',
    'Service temporarily unavailable',
  ],
  actions: () => [
    'Check external service status',
    'Retry later',
    'Contact service support if persistent',
  ],
  instructions: () =>
    'The external service has an issue. Wait and retry later.',
};

// =============================================================================
// Diagnosis Functions
// =============================================================================

/**
 * Build enhanced diagnosis based on execution error details
 */
export function buildEnhancedDiagnosis(
  errorDetails: ExecutionErrorDetails
): EnhancedDiagnosis {
  const httpCode = errorDetails.httpCode
    ? parseInt(errorDetails.httpCode, 10)
    : null;

  // Check lookup table first
  if (httpCode && HTTP_ERROR_DIAGNOSIS[httpCode]) {
    const template = HTTP_ERROR_DIAGNOSIS[httpCode];
    return {
      failedNode: errorDetails.lastNodeExecuted,
      errorCategory: template.category,
      possibleCauses: template.causes,
      suggestedActions: template.actions(errorDetails),
      fixInstructions: template.instructions(errorDetails),
    };
  }

  // Server errors (5xx)
  if (httpCode && httpCode >= 500) {
    return {
      failedNode: errorDetails.lastNodeExecuted,
      errorCategory: SERVER_ERROR_DIAGNOSIS.category,
      possibleCauses: SERVER_ERROR_DIAGNOSIS.causes,
      suggestedActions: SERVER_ERROR_DIAGNOSIS.actions(errorDetails),
      fixInstructions: SERVER_ERROR_DIAGNOSIS.instructions(errorDetails),
    };
  }

  // Default diagnosis
  return {
    failedNode: errorDetails.lastNodeExecuted,
    errorCategory: 'execution_error',
    possibleCauses: [
      `Error in node "${errorDetails.lastNodeExecuted}"`,
      'Invalid input data format',
      'Node configuration issue',
    ],
    suggestedActions: [
      `Review node "${errorDetails.lastNodeExecuted}" configuration`,
      'Check input data matches expected schema',
      'Test the external API directly',
    ],
    fixInstructions: `Open workflow in n8n, check node "${errorDetails.lastNodeExecuted}" settings`,
  };
}

/**
 * Build basic diagnosis for AI agents
 */
export function buildDiagnosis(
  triggerType: TriggerType,
  error?: { message: string; node?: string }
): BasicDiagnosis {
  const result: BasicDiagnosis = {
    possibleCauses: [],
    suggestedActions: [],
  };

  if (error) {
    result.possibleCauses.push(
      'Workflow execution error',
      error.node ? `Error in node: ${error.node}` : 'Check node configurations'
    );
    result.suggestedActions.push(
      'Review error message for specific issue',
      'Check node credentials and parameters',
      'Verify input data format'
    );
  }

  if (triggerType === 'manualTrigger' || triggerType === 'scheduleTrigger') {
    result.possibleCauses.push(
      'Workflow uses Manual/Schedule Trigger which cannot be tested via API'
    );
    result.suggestedActions.push(
      'Use autoConvert: true to add Execute Sub-workflow Trigger',
      'Or manually add Execute Sub-workflow Trigger node'
    );
  }

  if (triggerType === 'other') {
    result.possibleCauses.push('Unknown trigger type or no trigger found');
    result.suggestedActions.push(
      'Verify workflow has a valid trigger node',
      'Use get-workflow to inspect workflow structure'
    );
  }

  return result;
}

// =============================================================================
// Execution Error Fetching
// =============================================================================

/**
 * Get detailed error information from the last failed execution
 */
export async function getExecutionErrorDetails(
  client: N8nClient,
  workflowId: string
): Promise<ExecutionErrorDetails | null> {
  try {
    const executions = await client.executions.list({
      workflowId,
      status: 'error',
      limit: 1,
      includeData: true,
    });

    if (!executions.data || executions.data.length === 0) {
      return null;
    }

    const execution = executions.data[0];

    // If data is not included in list, fetch it separately
    let executionData = execution.data;
    if (!executionData) {
      const fullExecution = await client.executions.get(execution.id, true);
      executionData = fullExecution.data;
    }

    if (!executionData?.resultData) {
      return null;
    }

    const resultData = executionData.resultData as {
      error?: {
        message?: string;
        description?: string;
        httpCode?: string;
        node?: {
          name?: string;
          type?: string;
          credentials?: Record<string, { id: string; name: string }>;
        };
        context?: {
          request?: {
            uri?: string;
          };
        };
      };
      lastNodeExecuted?: string;
    };

    const error = resultData.error;
    if (!error) {
      return null;
    }

    const credentials = error.node?.credentials;
    const firstCredential = credentials ? Object.values(credentials)[0] : null;

    return {
      lastNodeExecuted:
        resultData.lastNodeExecuted || error.node?.name || 'unknown',
      errorMessage: error.message || 'Unknown error',
      errorDescription: error.description || null,
      httpCode: error.httpCode || null,
      nodeType: error.node?.type || null,
      credentialName: firstCredential?.name || null,
      credentialId: firstCredential?.id || null,
      apiEndpoint: error.context?.request?.uri || null,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// Response Parsing (follows official n8n structure)
// =============================================================================

/**
 * Parse webhook response from Test Runner or direct webhook call
 *
 * Handles:
 * 1. Array response (standard n8n format): [{ execution, workflow }]
 * 2. Object response (custom or Test Runner): { status, execution, error }
 * 3. Trigger error response: { trigger: { error }, workflow }
 */
export function parseWebhookResponse(rawData: unknown): {
  data: Record<string, unknown> | undefined;
  executionResult: { status: string; error?: Record<string, unknown>; result?: unknown } | undefined;
  errorDetails: { nodeName?: string; nodeType?: string; httpCode?: string; message?: string } | undefined;
} {
  // Handle array response (standard n8n format)
  if (Array.isArray(rawData)) {
    const firstItem = rawData[0] as Record<string, unknown> | undefined;
    return parseObjectResponse(firstItem);
  }

  // Handle object response
  if (rawData && typeof rawData === 'object') {
    return parseObjectResponse(rawData as Record<string, unknown>);
  }

  return { data: undefined, executionResult: undefined, errorDetails: undefined };
}

function parseObjectResponse(data: Record<string, unknown> | undefined): {
  data: Record<string, unknown> | undefined;
  executionResult: { status: string; error?: Record<string, unknown>; result?: unknown } | undefined;
  errorDetails: { nodeName?: string; nodeType?: string; httpCode?: string; message?: string } | undefined;
} {
  if (!data) {
    return { data: undefined, executionResult: undefined, errorDetails: undefined };
  }

  // Check for standard n8n error response: { execution: { lastNodeExecuted, error }, workflow }
  if (isN8nErrorResponse(data)) {
    const n8nData = data as unknown as N8nErrorResponse;
    return {
      data,
      executionResult: {
        status: 'error',
        error: {
          message: n8nData.execution.error.message,
          node: n8nData.execution.lastNodeExecuted,
        },
      },
      errorDetails: {
        nodeName: n8nData.execution.lastNodeExecuted,
        message: n8nData.execution.error.message,
      },
    };
  }

  // Check for trigger error response: { trigger: { error }, workflow }
  if (isN8nTriggerErrorResponse(data)) {
    const triggerData = data as unknown as N8nTriggerErrorResponse;
    return {
      data,
      executionResult: {
        status: 'error',
        error: {
          message: triggerData.trigger.error.message,
          name: triggerData.trigger.error.name,
        },
      },
      errorDetails: {
        message: triggerData.trigger.error.message,
      },
    };
  }

  // Check for Test Runner response: { status, execution, error }
  if (isTestRunnerResponse(data)) {
    const runnerData = data as unknown as TestRunnerResponse;
    return {
      data,
      executionResult: runnerData.execution,
      errorDetails: runnerData.error,
    };
  }

  // Generic response - try to extract execution if present
  const execution = data.execution as { status: string; error?: Record<string, unknown>; result?: unknown } | undefined;
  return { data, executionResult: execution, errorDetails: undefined };
}

// Type guards (return boolean, caller casts as needed)
function isN8nErrorResponse(data: Record<string, unknown>): boolean {
  return (
    typeof data.execution === 'object' &&
    data.execution !== null &&
    'lastNodeExecuted' in (data.execution as Record<string, unknown>) &&
    'error' in (data.execution as Record<string, unknown>) &&
    typeof data.workflow === 'object'
  );
}

function isN8nTriggerErrorResponse(data: Record<string, unknown>): boolean {
  return (
    typeof data.trigger === 'object' &&
    data.trigger !== null &&
    'error' in (data.trigger as Record<string, unknown>) &&
    typeof data.workflow === 'object'
  );
}

function isTestRunnerResponse(data: Record<string, unknown>): boolean {
  return (
    'status' in data &&
    (data.status === 'success' || data.status === 'error')
  );
}
