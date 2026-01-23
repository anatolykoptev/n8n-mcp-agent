/**
 * @module clients/n8n-client
 * @description N8n API client facade with modular architecture
 *
 * Composes domain-specific API modules:
 * - WorkflowApi: Workflow CRUD and activation
 * - WebhookApi: Webhook execution
 * - ExecutionApi: Execution management
 * - TagApi: Tag management
 * - UserApi: User management
 * - ProjectApi: Project management (Enterprise)
 * - VariableApi: Variable management (Enterprise)
 * - CredentialApi: Credential management
 * - AuditApi: Security audit
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
import {
  WorkflowApi,
  WebhookApi,
  ExecutionApi,
  TagApi,
  UserApi,
  ProjectApi,
  VariableApi,
  CredentialApi,
  AuditApi,
  type WebhookExecuteOptions,
  type WebhookResponse,
  type WebhookInfo,
  type GetExecutionsOptions,
  type GetTagsOptions,
  type CreateUserPayload,
  type CreatedUser,
  type CredentialData,
  type GenerateAuditOptions,
} from './modules/index.js';

// Re-export for backwards compatibility
export { N8nApiError } from '../errors/n8n-errors.js';
export type {
  GetExecutionsOptions,
  GetTagsOptions,
  CreateUserPayload,
  CreatedUser,
  CredentialData,
  GenerateAuditOptions,
  WebhookExecuteOptions,
  WebhookResponse,
  WebhookInfo,
};

/** N8nClient configuration */
export interface N8nClientConfig {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Client for interacting with the n8n API
 *
 * Features:
 * - Modular architecture with domain-specific APIs
 * - Automatic retries with exponential backoff
 * - Request timeouts
 * - SSRF protection
 *
 * @example
 * ```typescript
 * const client = new N8nClient('https://n8n.example.com', 'your-api-key');
 *
 * // Use via facade methods (backwards compatible)
 * const workflows = await client.listWorkflows();
 *
 * // Or use domain-specific APIs directly
 * const workflows = await client.workflows.list();
 * ```
 */
export class N8nClient {
  private readonly http: HttpClient;

  /** Workflow management API */
  public readonly workflows: WorkflowApi;
  /** Webhook execution API */
  public readonly webhooks: WebhookApi;
  /** Execution management API */
  public readonly executions: ExecutionApi;
  /** Tag management API */
  public readonly tags: TagApi;
  /** User management API */
  public readonly users: UserApi;
  /** Project management API (Enterprise) */
  public readonly projects: ProjectApi;
  /** Variable management API (Enterprise) */
  public readonly variables: VariableApi;
  /** Credential management API */
  public readonly credentials: CredentialApi;
  /** Security audit API */
  public readonly audit: AuditApi;

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

    // Initialize API modules
    this.workflows = new WorkflowApi(this.http);
    this.webhooks = new WebhookApi(this.http, () => this.baseUrl);
    this.executions = new ExecutionApi(this.http);
    this.tags = new TagApi(this.http);
    this.users = new UserApi(this.http);
    this.projects = new ProjectApi(this.http);
    this.variables = new VariableApi(this.http);
    this.credentials = new CredentialApi(this.http);
    this.audit = new AuditApi(this.http);
  }

  /**
   * Get the base URL of the n8n instance
   */
  get baseUrl(): string {
    return this.http.getApiUrl();
  }

  // ===========================================================================
  // Facade Methods (Backwards Compatible)
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Workflow Management
  // ---------------------------------------------------------------------------

  async listWorkflows(): Promise<N8nWorkflowList> {
    return this.workflows.list();
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.workflows.get(id);
  }

  async createWorkflow(
    name: string,
    nodes: N8nWorkflowNode[] = [],
    connections: N8nWorkflowConnections = {}
  ): Promise<N8nWorkflow> {
    return this.workflows.create(name, nodes, connections);
  }

  async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return this.workflows.update(id, workflow);
  }

  async deleteWorkflow(id: string): Promise<N8nWorkflow> {
    return this.workflows.delete(id);
  }

  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.workflows.activate(id);
  }

  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.workflows.deactivate(id);
  }

  // ---------------------------------------------------------------------------
  // Webhook Execution
  // ---------------------------------------------------------------------------

  async executeWebhook(
    webhookPath: string,
    options?: WebhookExecuteOptions
  ): Promise<WebhookResponse> {
    return this.webhooks.execute(webhookPath, options);
  }

  async getWebhookInfo(id: string): Promise<WebhookInfo | null> {
    const workflow = await this.workflows.get(id);
    return this.webhooks.getInfo(workflow);
  }

  // ---------------------------------------------------------------------------
  // Project Management (Enterprise)
  // ---------------------------------------------------------------------------

  async listProjects(): Promise<N8nProjectList> {
    return this.projects.list();
  }

  async createProject(name: string): Promise<void> {
    return this.projects.create(name);
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.projects.delete(projectId);
  }

  async updateProject(projectId: string, name: string): Promise<void> {
    return this.projects.update(projectId, name);
  }

  // ---------------------------------------------------------------------------
  // User Management
  // ---------------------------------------------------------------------------

  async listUsers(): Promise<N8nUserList> {
    return this.users.list();
  }

  async createUsers(users: CreateUserPayload[]): Promise<CreatedUser[]> {
    return this.users.create(users);
  }

  async getUser(idOrEmail: string): Promise<N8nUser> {
    return this.users.get(idOrEmail);
  }

  async deleteUser(idOrEmail: string): Promise<void> {
    return this.users.delete(idOrEmail);
  }

  // ---------------------------------------------------------------------------
  // Variable Management (Enterprise)
  // ---------------------------------------------------------------------------

  async listVariables(): Promise<N8nVariableList> {
    return this.variables.list();
  }

  async createVariable(key: string, value: string): Promise<void> {
    return this.variables.create(key, value);
  }

  async deleteVariable(id: string): Promise<void> {
    return this.variables.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Execution Management
  // ---------------------------------------------------------------------------

  async getExecutions(options?: GetExecutionsOptions): Promise<N8nExecutionList> {
    return this.executions.list(options);
  }

  async getExecution(id: number, includeData = false): Promise<N8nExecution> {
    return this.executions.get(id, includeData);
  }

  async deleteExecution(id: number): Promise<N8nExecution> {
    return this.executions.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Tag Management
  // ---------------------------------------------------------------------------

  async createTag(name: string): Promise<N8nTag> {
    return this.tags.create(name);
  }

  async getTags(options?: GetTagsOptions): Promise<N8nTagList> {
    return this.tags.list(options);
  }

  async getTag(id: string): Promise<N8nTag> {
    return this.tags.get(id);
  }

  async updateTag(id: string, name: string): Promise<N8nTag> {
    return this.tags.update(id, name);
  }

  async deleteTag(id: string): Promise<N8nTag> {
    return this.tags.delete(id);
  }

  async getWorkflowTags(workflowId: string): Promise<N8nTag[]> {
    return this.tags.getWorkflowTags(workflowId);
  }

  async updateWorkflowTags(workflowId: string, tagIds: Array<{ id: string }>): Promise<N8nTag[]> {
    return this.tags.updateWorkflowTags(workflowId, tagIds);
  }

  // ---------------------------------------------------------------------------
  // Security Audit
  // ---------------------------------------------------------------------------

  async generateAudit(options?: GenerateAuditOptions): Promise<N8nAuditResult> {
    return this.audit.generate(options);
  }

  // ---------------------------------------------------------------------------
  // Credential Management
  // ---------------------------------------------------------------------------

  async createCredential(name: string, type: string, data: CredentialData): Promise<N8nCredential> {
    return this.credentials.create(name, type, data);
  }

  async deleteCredential(id: string): Promise<N8nCredential> {
    return this.credentials.delete(id);
  }

  async getCredentialSchema(credentialTypeName: string): Promise<N8nCredentialType> {
    return this.credentials.getSchema(credentialTypeName);
  }
}
