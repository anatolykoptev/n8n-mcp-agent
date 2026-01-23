/**
 * @module clients/modules/variable-api
 * @description Variable management API (Enterprise License Required)
 */

import type { HttpClient } from '../base/http-client.js';
import type { N8nVariableList } from '../../types/n8n.js';

/**
 * Variable management API
 * NOTE: Requires n8n Enterprise license
 */
export class VariableApi {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<N8nVariableList> {
    return this.http.request<N8nVariableList>('/variables');
  }

  async create(key: string, value: string): Promise<void> {
    return this.http.request<void>('/variables', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
  }

  async delete(id: string): Promise<void> {
    return this.http.request<void>(`/variables/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
