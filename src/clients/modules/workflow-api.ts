/**
 * @module clients/modules/workflow-api
 * @description Workflow management API
 */

import type { HttpClient } from '../base/http-client.js';
import type {
  N8nWorkflow,
  N8nWorkflowList,
  N8nWorkflowNode,
  N8nWorkflowConnections,
} from '../../types/n8n.js';

/**
 * Workflow management API
 */
export class WorkflowApi {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<N8nWorkflowList> {
    return this.http.request<N8nWorkflowList>('/workflows');
  }

  async get(id: string): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>(`/workflows/${encodeURIComponent(id)}`);
  }

  async create(
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

  async update(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>(`/workflows/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  async delete(id: string): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>(`/workflows/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async activate(id: string): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>(`/workflows/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
    });
  }

  async deactivate(id: string): Promise<N8nWorkflow> {
    return this.http.request<N8nWorkflow>(`/workflows/${encodeURIComponent(id)}/deactivate`, {
      method: 'POST',
    });
  }
}
