/**
 * @module clients/modules/execution-api
 * @description Execution management API
 */

import type { HttpClient } from '../base/http-client.js';
import type { N8nExecutionList, N8nExecution } from '../../types/n8n.js';

/** Options for listing executions */
export interface GetExecutionsOptions {
  includeData?: boolean;
  status?: 'error' | 'success' | 'waiting';
  workflowId?: string;
  limit?: number;
}

/**
 * Execution management API
 */
export class ExecutionApi {
  constructor(private readonly http: HttpClient) {}

  async list(options: GetExecutionsOptions = {}): Promise<N8nExecutionList> {
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

  async get(id: number, includeData = false): Promise<N8nExecution> {
    const params = new URLSearchParams();
    if (includeData) {
      params.append('includeData', 'true');
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/executions/${id}?${queryString}` : `/executions/${id}`;

    return this.http.request<N8nExecution>(endpoint);
  }

  async delete(id: number): Promise<N8nExecution> {
    return this.http.request<N8nExecution>(`/executions/${id}`, {
      method: 'DELETE',
    });
  }
}
