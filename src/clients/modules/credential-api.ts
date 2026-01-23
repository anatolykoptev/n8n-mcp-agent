/**
 * @module clients/modules/credential-api
 * @description Credential management API
 */

import type { HttpClient } from '../base/http-client.js';
import type { N8nCredential, N8nCredentialType } from '../../types/n8n.js';

/** Credential data */
export type CredentialData = Record<string, string | number | boolean | null>;

/**
 * Credential management API
 */
export class CredentialApi {
  constructor(private readonly http: HttpClient) {}

  async create(name: string, type: string, data: CredentialData): Promise<N8nCredential> {
    return this.http.request<N8nCredential>('/credentials', {
      method: 'POST',
      body: JSON.stringify({ name, type, data }),
    });
  }

  async delete(id: string): Promise<N8nCredential> {
    return this.http.request<N8nCredential>(`/credentials/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async getSchema(credentialTypeName: string): Promise<N8nCredentialType> {
    return this.http.request<N8nCredentialType>(
      `/credentials/schema/${encodeURIComponent(credentialTypeName)}`
    );
  }
}
