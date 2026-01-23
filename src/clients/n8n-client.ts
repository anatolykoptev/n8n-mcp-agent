/**
 * @module clients/n8n-client
 * @description N8n API client with retry, timeout, and SSRF protection
 *
 * Uses centralized:
 * - HttpClient for HTTP operations with retry/timeout
 * - Constants from constants/api.ts
 * - Error classes from errors/n8n-errors.ts
 */

import type {
  N8nWorkflow,
  N8nWorkflowList,
  N8nWorkflowNode,
  N8nWorkflowConnections,
  N8nProjectList,
  N8nUserList,
  N8nUser,
  N8nVariableList,
  N8nExecutionList,
  N8nExecution,
  N8nTag,
  N8nTagList,
  N8nAuditResult,
  N8nCredential,
  N8nCredentialType,
} from '../types/n8n.js';
import { HttpClient, type HttpClientConfig } from './base/http-client.js';

// Re-export for backwards compatibility
export { N8nApiError } from '../errors/n8n-errors.js';

// =============================================================================
// Type Definitions
// =============================================================================

/** Options for listing executions */
export interface GetExecutionsOptions {
  includeData?: boolean;
  status?: 'error' | 'success' | 'waiting';
  workflowId?: string;
  limit?: number;
}

/** Options for listing tags */
export interface GetTagsOptions {
  limit?: number;
}

/** Options for generating audit */
export interface GenerateAuditOptions {
  daysAbandonedWorkflow?: number;
  categories?: Array<'credentials' | 'database' | 'nodes' | 'filesystem' | 'instance'>;
}

/** User creation payload */
export interface CreateUserPayload {
  email: string;
  role?: 'global:admin' | 'global:member';
}

/** Created user response */
export interface CreatedUser {
  user: {
    id: string;
    email: string;
    inviteAcceptUrl?: string;
    emailSent?: boolean;
  };
  error?: string;
}

/** Credential data */
export type CredentialData = Record<string, string | number | boolean | null>;

/** N8nClient configuration */
export interface N8nClientConfig {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

// =============================================================================
// N8n Client Class
// =============================================================================

/**
 * Client for interacting with the n8n API
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Request timeouts
 * - SSRF protection
 * - Proper error handling
 *
 * @example
 * ```typescript
 * const client = new N8nClient('https://n8n.example.com', 'your-api-key');
 * const workflows = await client.listWorkflows();
 * ```
 */
export class N8nClient {
  private readonly http: HttpClient;

  /**
   * Create a new N8nClient instance
   * @param baseUrl - The base URL of your n8n instance
   * @param apiKey - Your n8n API key
   * @param config - Optional configuration
   */
  constructor(baseUrl: string, apiKey: string, config?: N8nClientConfig) {
    const httpConfig: HttpClientConfig = {
      baseUrl,
      apiKey,
      timeout: config?.timeout,
      maxRetries: config?.maxRetries,
      retryDelay: config?.retryDelay,
    };
    this.http = new HttpClient(httpConfig);
  }

  /**
   * Get the base URL of the n8n instance
   */
  get baseUrl(): string {
    return this.http.getApiUrl();
  }

  // ---------------------------------------------------------------------------
  // Workflow Management
  // ---------------------------------------------------------------------------

  async listWorkflows(): Promise<N8nWorkflowList> {
    return this.http.request<N8nWorkflowList>('/workflows');
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>(`/workflows/${encodeURIComponent(id)}`);
  }

  async createWorkflow(
    name: string,
    nodes: N8nWorkflowNode[] = [],
    connections: N8nWorkflowConnections = {}
  ): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify({
        name,
        nodes,
        connections,
        settings: {
          saveManualExecutions: true,
          saveExecutionProgress: true,
        },
      }),
    });
  }

  async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>(`/workflows/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  async deleteWorkflow(id: string): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>(`/workflows/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>(`/workflows/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
    });
  }

  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>(`/workflows/${encodeURIComponent(id)}/deactivate`, {
      method: 'POST',
    });
  }

  // ---------------------------------------------------------------------------
  // Webhook Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute a workflow via its webhook URL
   * @param webhookPath - The webhook path (e.g., "my-webhook")
   * @param options - Request options
   * @returns The webhook response
   */
  async executeWebhook(
    webhookPath: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: Record<string, unknown>;
      headers?: Record<string, string>;
      timeout?: number;
    } = {}
  ): Promise<{ status: number; data: unknown; headers: Record<string, string> }> {
    const { method = 'POST', data, headers = {}, timeout = 30000 } = options;

    // Construct webhook URL from base URL
    const baseUrlObj = new URL(this.baseUrl);
    const webhookUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/webhook/${webhookPath}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(webhookUrl, fetchOptions);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData: unknown;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        status: response.status,
        data: responseData,
        headers: responseHeaders,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get webhook information from a workflow
   * @param id - Workflow ID
   * @returns Webhook details including URL and path
   */
  async getWebhookInfo(
    id: string
  ): Promise<{ webhookUrl: string; webhookPath: string; httpMethod: string } | null> {
    const workflow = await this.getWorkflow(id);

    // Find webhook trigger node
    const webhookNode = workflow.nodes?.find(
      (node) =>
        node.type === 'n8n-nodes-base.webhook' || node.type === '@n8n/n8n-nodes-langchain.webhook'
    );

    if (!webhookNode) {
      return null;
    }

    const path = webhookNode.parameters?.path as string | undefined;
    const httpMethod = (webhookNode.parameters?.httpMethod as string) || 'POST';

    if (!path) {
      return null;
    }

    const baseUrlObj = new URL(this.baseUrl);
    const webhookUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/webhook/${path}`;

    return {
      webhookUrl,
      webhookPath: path,
      httpMethod,
    };
  }

  // ---------------------------------------------------------------------------
  // Project Management (Enterprise License Required)
  // ---------------------------------------------------------------------------

  async listProjects(): Promise<N8nProjectList> {
    return this.http.request<N8nProjectList>('/projects');
  }

  async createProject(name: string): Promise<void> {
    return this.http.request<void>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.http.request<void>(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    });
  }

  async updateProject(projectId: string, name: string): Promise<void> {
    return this.http.request<void>(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  // ---------------------------------------------------------------------------
  // User Management
  // ---------------------------------------------------------------------------

  async listUsers(): Promise<N8nUserList> {
    return this.http.request<N8nUserList>('/users');
  }

  async createUsers(users: CreateUserPayload[]): Promise<CreatedUser[]> {
    return this.http.request<CreatedUser[]>('/users', {
      method: 'POST',
      body: JSON.stringify(users),
    });
  }

  async getUser(idOrEmail: string): Promise<N8nUser> {
    return this.http.request<N8nUser>(`/users/${encodeURIComponent(idOrEmail)}`);
  }

  async deleteUser(idOrEmail: string): Promise<void> {
    return this.http.request<void>(`/users/${encodeURIComponent(idOrEmail)}`, {
      method: 'DELETE',
    });
  }

  // ---------------------------------------------------------------------------
  // Variable Management (Enterprise License Required)
  // ---------------------------------------------------------------------------

  async listVariables(): Promise<N8nVariableList> {
    return this.http.request<N8nVariableList>('/variables');
  }

  async createVariable(key: string, value: string): Promise<void> {
    return this.http.request<void>('/variables', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
  }

  async deleteVariable(id: string): Promise<void> {
    return this.http.request<void>(`/variables/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // ---------------------------------------------------------------------------
  // Execution Management
  // ---------------------------------------------------------------------------

  async getExecutions(options: GetExecutionsOptions = {}): Promise<N8nExecutionList> {
    const params = new URLSearchParams();

    if (options.includeData !== undefined) {
      params.append('includeData', String(options.includeData));
    }
    if (options.status) {
      params.append('status', options.status);
    }
    if (options.workflowId) {
      params.append('workflowId', options.workflowId);
    }
    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/executions?${queryString}` : '/executions';

    return this.http.request<N8nExecutionList>(endpoint);
  }

  async getExecution(id: number, includeData = false): Promise<N8nExecution> {
    const params = new URLSearchParams();
    if (includeData) {
      params.append('includeData', 'true');
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/executions/${id}?${queryString}` : `/executions/${id}`;

    return this.http.request<N8nExecution>(endpoint);
  }

  async deleteExecution(id: number): Promise<N8nExecution> {
    return this.http.request<N8nExecution>(`/executions/${id}`, {
      method: 'DELETE',
    });
  }

  // ---------------------------------------------------------------------------
  // Tag Management
  // ---------------------------------------------------------------------------

  async createTag(name: string): Promise<N8nTag> {
    return this.http.request<N8nTag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getTags(options: GetTagsOptions = {}): Promise<N8nTagList> {
    const params = new URLSearchParams();
    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/tags?${queryString}` : '/tags';

    return this.http.request<N8nTagList>(endpoint);
  }

  async getTag(id: string): Promise<N8nTag> {
    return this.http.request<N8nTag>(`/tags/${encodeURIComponent(id)}`);
  }

  async updateTag(id: string, name: string): Promise<N8nTag> {
    return this.http.request<N8nTag>(`/tags/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteTag(id: string): Promise<N8nTag> {
    return this.http.request<N8nTag>(`/tags/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async getWorkflowTags(workflowId: string): Promise<N8nTag[]> {
    return this.http.request<N8nTag[]>(`/workflows/${encodeURIComponent(workflowId)}/tags`);
  }

  async updateWorkflowTags(workflowId: string, tagIds: Array<{ id: string }>): Promise<N8nTag[]> {
    return this.http.request<N8nTag[]>(`/workflows/${encodeURIComponent(workflowId)}/tags`, {
      method: 'PUT',
      body: JSON.stringify(tagIds),
    });
  }

  // ---------------------------------------------------------------------------
  // Security Audit
  // ---------------------------------------------------------------------------

  async generateAudit(options: GenerateAuditOptions = {}): Promise<N8nAuditResult> {
    return this.http.request<N8nAuditResult>('/audit', {
      method: 'POST',
      body: JSON.stringify({
        additionalOptions: {
          daysAbandonedWorkflow: options.daysAbandonedWorkflow,
          categories: options.categories,
        },
      }),
    });
  }

  // ---------------------------------------------------------------------------
  // Credential Management
  // ---------------------------------------------------------------------------

  async createCredential(
    name: string,
    type: string,
    data: CredentialData
  ): Promise<N8nCredential> {
    return this.http.request<N8nCredential>('/credentials', {
      method: 'POST',
      body: JSON.stringify({ name, type, data }),
    });
  }

  async deleteCredential(id: string): Promise<N8nCredential> {
    return this.http.request<N8nCredential>(`/credentials/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async getCredentialSchema(credentialTypeName: string): Promise<N8nCredentialType> {
    return this.http.request<N8nCredentialType>(
      `/credentials/schema/${encodeURIComponent(credentialTypeName)}`
    );
  }
}
