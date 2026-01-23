/**
 * @module constants/env
 * @description Environment variable configuration
 */

/** Default client ID for env-initialized connections */
export const DEFAULT_CLIENT_ID = 'default';

/**
 * Environment configuration for n8n connection
 */
export interface EnvConfig {
  url: string | undefined;
  apiKey: string | undefined;
}

/**
 * Get n8n configuration from environment variables
 * @returns Environment config object
 */
export function getEnvConfig(): EnvConfig {
  return {
    url: process.env.N8N_URL,
    apiKey: process.env.N8N_API_KEY,
  };
}

/**
 * Check if environment variables are configured for auto-connect
 * @returns True if both N8N_URL and N8N_API_KEY are set
 */
export function hasEnvConfig(): boolean {
  const config = getEnvConfig();
  return Boolean(config.url && config.apiKey);
}
