/**
 * @module clients
 * @description Client exports for n8n API integration
 */

// Main client facade
export { N8nClient, N8nApiError } from './n8n-client.js';
export type {
  GetExecutionsOptions,
  GetTagsOptions,
  GenerateAuditOptions,
  CreateUserPayload,
  CreatedUser,
  CredentialData,
  WebhookExecuteOptions,
  WebhookResponse,
  WebhookInfo,
  N8nClientConfig,
} from './n8n-client.js';

// API modules for direct use
export {
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

// Base HTTP client
export { HttpClient } from './base/http-client.js';
export type { HttpClientConfig, RequestOptions } from './base/http-client.js';

// Patterns client
export { PatternsClient, patternsClient } from './patterns-client.js';
