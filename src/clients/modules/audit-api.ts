/**
 * @module clients/modules/audit-api
 * @description Security audit API
 */

import type { HttpClient } from '../base/http-client.js';
import type { N8nAuditResult } from '../../types/n8n.js';

/** Options for generating audit */
export interface GenerateAuditOptions {
  daysAbandonedWorkflow?: number;
  categories?: Array<'credentials' | 'database' | 'nodes' | 'filesystem' | 'instance'>;
}

/**
 * Security audit API
 */
export class AuditApi {
  constructor(private readonly http: HttpClient) {}

  async generate(options: GenerateAuditOptions = {}): Promise<N8nAuditResult> {
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
}
