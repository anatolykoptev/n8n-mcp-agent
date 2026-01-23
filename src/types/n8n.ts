/**
 * @module types/n8n
 * @description Type definitions for n8n API responses
 */

// =============================================================================
// User Types
// =============================================================================

export interface N8nUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isPending: boolean;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8nUserList {
  data: N8nUser[];
  nextCursor?: string;
}

// =============================================================================
// Workflow Types
// =============================================================================

export interface N8nWorkflowNode {
  id?: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  webhookId?: string;
}

export interface N8nWorkflowConnection {
  node: string;
  type: string;
  index: number;
}

export interface N8nWorkflowConnections {
  [nodeName: string]: {
    [outputType: string]: N8nWorkflowConnection[][];
  };
}

export interface N8nWorkflowSettings {
  saveManualExecutions?: boolean;
  saveExecutionProgress?: boolean;
  executionTimeout?: number;
  timezone?: string;
  errorWorkflow?: string;
}

export interface N8nWorkflow {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  nodes?: N8nWorkflowNode[];
  connections?: N8nWorkflowConnections;
  settings?: N8nWorkflowSettings;
  staticData?: Record<string, unknown>;
  pinData?: Record<string, unknown>;
  versionId?: string;
}

export interface N8nWorkflowList {
  data: N8nWorkflow[];
  nextCursor?: string;
}

// =============================================================================
// Project Types
// =============================================================================

export interface N8nProject {
  id: string;
  name: string;
  type?: string;
}

export interface N8nProjectList {
  data: N8nProject[];
  nextCursor?: string;
}

// =============================================================================
// Variable Types
// =============================================================================

export interface N8nVariable {
  id: string;
  key: string;
  value: string;
  type?: string;
}

export interface N8nVariableList {
  data: N8nVariable[];
  nextCursor?: string;
}

// =============================================================================
// Execution Types
// =============================================================================

export interface N8nExecutionData {
  startData?: Record<string, unknown>;
  resultData?: {
    runData?: Record<string, unknown>;
    lastNodeExecuted?: string;
    error?: Record<string, unknown>;
  };
  executionData?: Record<string, unknown>;
}

export interface N8nExecution {
  id: number;
  data?: N8nExecutionData;
  finished: boolean;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry' | 'integrated';
  retryOf?: number;
  retrySuccessId?: number;
  startedAt: string;
  stoppedAt?: string;
  workflowId: number;
  waitTill?: string;
  status?: 'error' | 'success' | 'waiting' | 'running' | 'unknown';
}

export interface N8nExecutionList {
  data: N8nExecution[];
  nextCursor?: string;
}

// =============================================================================
// Tag Types
// =============================================================================

export interface N8nTag {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface N8nTagList {
  data: N8nTag[];
  nextCursor?: string;
}

// =============================================================================
// Credential Types
// =============================================================================

export interface N8nCredential {
  id: string;
  name: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface N8nCredentialType {
  name: string;
  displayName: string;
  properties: N8nCredentialProperty[];
}

export interface N8nCredentialProperty {
  displayName: string;
  name: string;
  type: string;
  default?: unknown;
  required?: boolean;
  description?: string;
  options?: Array<{ name: string; value: string }>;
}

// =============================================================================
// Audit Types
// =============================================================================

export interface N8nAuditRiskItem {
  risk: string;
  description?: string;
  recommendation?: string;
}

export interface N8nAuditReport {
  risk: 'high' | 'medium' | 'low';
  sections: N8nAuditRiskItem[];
}

export interface N8nAuditResult {
  'Credentials Risk Report'?: N8nAuditReport;
  'Database Risk Report'?: N8nAuditReport;
  'Filesystem Risk Report'?: N8nAuditReport;
  'Nodes Risk Report'?: N8nAuditReport;
  'Instance Risk Report'?: N8nAuditReport;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface N8nApiError {
  message: string;
  name?: string;
  httpStatusCode?: number;
}

export interface N8nRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: string;
  headers?: Record<string, string>;
}
