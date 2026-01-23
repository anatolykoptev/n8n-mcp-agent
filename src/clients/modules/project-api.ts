/**
 * @module clients/modules/project-api
 * @description Project management API (Enterprise License Required)
 */

import type { HttpClient } from '../base/http-client.js';
import type { N8nProjectList } from '../../types/n8n.js';

/**
 * Project management API
 * NOTE: Requires n8n Enterprise license
 */
export class ProjectApi {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<N8nProjectList> {
    return this.http.request<N8nProjectList>('/projects');
  }

  async create(name: string): Promise<void> {
    return this.http.request<void>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async update(projectId: string, name: string): Promise<void> {
    return this.http.request<void>(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async delete(projectId: string): Promise<void> {
    return this.http.request<void>(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    });
  }
}
