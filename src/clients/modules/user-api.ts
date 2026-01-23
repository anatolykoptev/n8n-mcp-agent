/**
 * @module clients/modules/user-api
 * @description User management API
 */

import type { HttpClient } from '../base/http-client.js';
import type { N8nUserList, N8nUser } from '../../types/n8n.js';

/** User creation payload */
export interface CreateUserPayload {
  email: string;
  role?: 'global:admin' | 'global:member';
}

/** Created user response */
export interface CreatedUser {
  user: {
    id: string;
    email: string;
    inviteAcceptUrl?: string;
    emailSent?: boolean;
  };
  error?: string;
}

/**
 * User management API
 */
export class UserApi {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<N8nUserList> {
    return this.http.request<N8nUserList>('/users');
  }

  async get(idOrEmail: string): Promise<N8nUser> {
    return this.http.request<N8nUser>(`/users/${encodeURIComponent(idOrEmail)}`);
  }

  async create(users: CreateUserPayload[]): Promise<CreatedUser[]> {
    return this.http.request<CreatedUser[]>('/users', {
      method: 'POST',
      body: JSON.stringify(users),
    });
  }

  async delete(idOrEmail: string): Promise<void> {
    return this.http.request<void>(`/users/${encodeURIComponent(idOrEmail)}`, {
      method: 'DELETE',
    });
  }
}
