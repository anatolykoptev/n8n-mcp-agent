/**
 * @module services/credential-factory
 * @description Pre-built credential factories for common n8n integrations
 *
 * Provides type-safe factory methods for creating credentials with validated
 * parameters and proper data structure mapping.
 */

import type { N8nClient } from '../clients/n8n-client.js';

// =============================================================================
// Types
// =============================================================================

export interface CredentialResult {
  success: boolean;
  credentialId?: string;
  name?: string;
  type?: string;
  error?: string;
}

// =============================================================================
// Credential Factory Class
// =============================================================================

export class CredentialFactory {
  constructor(private client: N8nClient) {}

  /**
   * Create Google Service Account credential
   * @param name - Credential display name
   * @param email - Service account email
   * @param privateKey - PEM private key (with \\n or actual newlines)
   */
  async createGoogleServiceAccount(
    name: string,
    email: string,
    privateKey: string
  ): Promise<CredentialResult> {
    // Convert escaped newlines to actual newlines
    const normalizedKey = privateKey.replace(/\\n/g, '\n');

    return this.create(name, 'googleApi', {
      email,
      privateKey: normalizedKey,
      impersonateUser: false,
    });
  }

  /**
   * Create PostgreSQL credential
   * @param name - Credential display name
   * @param host - Database host
   * @param database - Database name
   * @param user - Database user
   * @param password - Database password
   * @param port - Port (default: 5432)
   * @param ssl - Enable SSL (default: false)
   */
  async createPostgres(
    name: string,
    host: string,
    database: string,
    user: string,
    password: string,
    port = 5432,
    ssl = false
  ): Promise<CredentialResult> {
    return this.create(name, 'postgres', {
      host,
      database,
      user,
      password,
      port,
      ssl,
    });
  }

  /**
   * Create HTTP Basic Auth credential
   * @param name - Credential display name
   * @param username - Username
   * @param password - Password
   */
  async createHttpBasic(
    name: string,
    username: string,
    password: string
  ): Promise<CredentialResult> {
    return this.create(name, 'httpBasicAuth', {
      user: username,
      password,
    });
  }

  /**
   * Create API Key Header credential
   * @param name - Credential display name
   * @param apiKey - API key value
   * @param headerName - Header name (default: X-API-Key)
   */
  async createApiKey(
    name: string,
    apiKey: string,
    headerName = 'X-API-Key'
  ): Promise<CredentialResult> {
    return this.create(name, 'httpHeaderAuth', {
      name: headerName,
      value: apiKey,
    });
  }

  /**
   * Create Slack credential
   * @param name - Credential display name
   * @param accessToken - Bot User OAuth Token
   */
  async createSlack(name: string, accessToken: string): Promise<CredentialResult> {
    return this.create(name, 'slackApi', {
      accessToken,
    });
  }

  /**
   * Create Telegram credential
   * @param name - Credential display name
   * @param accessToken - Bot token from @BotFather
   */
  async createTelegram(name: string, accessToken: string): Promise<CredentialResult> {
    return this.create(name, 'telegramApi', {
      accessToken,
    });
  }

  /**
   * Create OpenAI credential
   * @param name - Credential display name
   * @param apiKey - OpenAI API key
   */
  async createOpenAI(name: string, apiKey: string): Promise<CredentialResult> {
    return this.create(name, 'openAiApi', {
      apiKey,
    });
  }

  /**
   * Create Airtable credential
   * @param name - Credential display name
   * @param apiKey - Airtable API key
   */
  async createAirtable(name: string, apiKey: string): Promise<CredentialResult> {
    return this.create(name, 'airtableApi', {
      apiKey,
    });
  }

  /**
   * Create Notion credential
   * @param name - Credential display name
   * @param apiKey - Notion integration token
   */
  async createNotion(name: string, apiKey: string): Promise<CredentialResult> {
    return this.create(name, 'notionApi', {
      apiKey,
    });
  }

  /**
   * Create GitHub credential
   * @param name - Credential display name
   * @param accessToken - Personal access token
   */
  async createGitHub(name: string, accessToken: string): Promise<CredentialResult> {
    return this.create(name, 'githubApi', {
      accessToken,
    });
  }

  /**
   * Create SMTP credential
   * @param name - Credential display name
   * @param host - SMTP host
   * @param port - SMTP port
   * @param user - Username
   * @param password - Password
   * @param secure - Use TLS (default: true)
   */
  async createSmtp(
    name: string,
    host: string,
    port: number,
    user: string,
    password: string,
    secure = true
  ): Promise<CredentialResult> {
    return this.create(name, 'smtp', {
      host,
      port,
      user,
      password,
      secure,
    });
  }

  /**
   * Create MySQL credential
   * @param name - Credential display name
   * @param host - Database host
   * @param database - Database name
   * @param user - Database user
   * @param password - Database password
   * @param port - Port (default: 3306)
   */
  async createMySql(
    name: string,
    host: string,
    database: string,
    user: string,
    password: string,
    port = 3306
  ): Promise<CredentialResult> {
    return this.create(name, 'mySql', {
      host,
      database,
      user,
      password,
      port,
    });
  }

  /**
   * Generic credential creation method
   * @param name - Credential display name
   * @param type - Credential type string
   * @param data - Type-specific credential data
   */
  async create(
    name: string,
    type: string,
    data: Record<string, string | number | boolean | null>
  ): Promise<CredentialResult> {
    try {
      const result = await this.client.createCredential(name, type, data);
      return {
        success: true,
        credentialId: result.id,
        name: result.name,
        type: result.type,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
      };
    }
  }
}

// =============================================================================
// Supported Credential Types
// =============================================================================

export const CREDENTIAL_TYPES = {
  googleApi: 'Google Service Account',
  postgres: 'PostgreSQL',
  httpBasicAuth: 'HTTP Basic Auth',
  httpHeaderAuth: 'API Key Header',
  slackApi: 'Slack',
  telegramApi: 'Telegram',
  openAiApi: 'OpenAI',
  airtableApi: 'Airtable',
  notionApi: 'Notion',
  githubApi: 'GitHub',
  smtp: 'SMTP Email',
  mySql: 'MySQL',
} as const;

export type CredentialType = keyof typeof CREDENTIAL_TYPES;
