/**
 * @module clients/modules/credential-api
 * @description Credential management API
 *
 * Supports two APIs:
 * - Public API (/api/v1/credentials) - create, delete, getSchema (API key auth)
 * - Internal REST API (/rest/credentials) - listAll (session cookie auth)
 */

import type { HttpClient } from '../base/http-client.js';
import type { N8nCredential, N8nCredentialType } from '../../types/n8n.js';

/** Credential data */
export type CredentialData = Record<string, string | number | boolean | null>;

/** Credential from REST API (includes additional fields) */
export interface N8nCredentialFull extends N8nCredential {
  nodesAccess?: Array<{ nodeType: string; date?: string }>;
  sharedWithProjects?: Array<{ id: string; name: string }>;
  homeProject?: { id: string; name: string };
  scopes?: string[];
}

/** REST API credentials response */
interface CredentialsRestResponse {
  data: N8nCredentialFull[];
}

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

  /**
   * List all credentials via Internal REST API
   * Requires session cookie from login()
   *
   * @param sessionCookie - Session cookie from http.login()
   * @param options.includeScopes - Include credential scopes (default: true)
   * @returns List of all credentials with full details
   */
  async listAll(
    sessionCookie: string,
    options?: { includeScopes?: boolean }
  ): Promise<N8nCredentialFull[]> {
    const includeScopes = options?.includeScopes ?? true;
    const response = await this.http.requestRest<CredentialsRestResponse>(
      `/credentials?includeScopes=${includeScopes}`,
      { sessionCookie }
    );
    return response.data;
  }
}
