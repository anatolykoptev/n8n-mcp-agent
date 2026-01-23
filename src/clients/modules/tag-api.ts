/**
 * @module clients/modules/tag-api
 * @description Tag management API
 */

import type { HttpClient } from '../base/http-client.js';
import type { N8nTag, N8nTagList } from '../../types/n8n.js';

/** Options for listing tags */
export interface GetTagsOptions {
  limit?: number;
}

/**
 * Tag management API
 */
export class TagApi {
  constructor(private readonly http: HttpClient) {}

  async list(options: GetTagsOptions = {}): Promise<N8nTagList> {
    const params = new URLSearchParams();
    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/tags?${queryString}` : '/tags';

    return this.http.request<N8nTagList>(endpoint);
  }

  async get(id: string): Promise<N8nTag> {
    return this.http.request<N8nTag>(`/tags/${encodeURIComponent(id)}`);
  }

  async create(name: string): Promise<N8nTag> {
    return this.http.request<N8nTag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async update(id: string, name: string): Promise<N8nTag> {
    return this.http.request<N8nTag>(`/tags/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async delete(id: string): Promise<N8nTag> {
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
}
