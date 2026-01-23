/**
 * @module clients
 * @description Client exports for n8n API integration
 */

export { N8nClient, N8nApiError } from './n8n-client.js';
export type {
  GetExecutionsOptions,
  GetTagsOptions,
  GenerateAuditOptions,
  CreateUserPayload,
  CreatedUser,
  CredentialData,
  N8nClientConfig,
} from './n8n-client.js';

export { HttpClient } from './base/http-client.js';
export type { HttpClientConfig, RequestOptions } from './base/http-client.js';

export { PatternsClient, patternsClient } from './patterns-client.js';
