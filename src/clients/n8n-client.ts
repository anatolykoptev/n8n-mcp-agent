/**
 * @module clients/n8n-client
 * @description N8n API client with modular architecture
 *
 * @ai-rule Adding new module:
 * 1. Create `modules/<name>-api.ts` (copy from existing, e.g. tag-api.ts)
 * 2. Export from `modules/index.ts`
 * 3. Add property + init here (this file)
 * 4. Create handler in `handlers/<name>-handlers.ts`
 * 5. NO facade methods - handlers use `client.<module>.<method>()` directly
 */

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
} from './modules/index.js';

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
 * // Workflow operations
 * const workflows = await client.workflows.list();
 * const workflow = await client.workflows.get('123');
 * await client.workflows.activate('123');
 *
 * // Tag operations
 * const tags = await client.tags.list();
 * await client.tags.create('my-tag');
 *
 * // Execution operations
 * const executions = await client.executions.list({ status: 'error' });
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

  /**
   * Login to n8n and get session cookie for REST API access
   * Required for operations not available in Public API (e.g., listing credentials)
   *
   * @param email - n8n user email
   * @param password - n8n user password
   * @returns Session cookie string to use with REST API methods
   */
  async login(email: string, password: string): Promise<string> {
    return this.http.login(email, password);
  }
}
