/**
 * @module schemas/base
 * @description Base Zod schemas - reusable primitives for all tool inputs
 */

import { z } from 'zod';

/** Client ID - base64 encoded URL */
export const ClientIdSchema = z
  .string()
  .min(1, 'clientId is required')
  .regex(/^[A-Za-z0-9+/=]+$/, 'Invalid clientId format');

/** n8n instance URL with SSRF protection */
export const N8nUrlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();
        const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
        const isBlockedHost = blockedHosts.includes(hostname);
        const isInternalIP =
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
          hostname.startsWith('169.254.');
        const isHttps = parsed.protocol === 'https:' || parsed.protocol === 'http:';
        return !isBlockedHost && !isInternalIP && isHttps;
      } catch {
        return false;
      }
    },
    { message: 'URL must be a valid external HTTPS endpoint' }
  );

/** API key - non-empty string, no whitespace */
export const ApiKeySchema = z
  .string()
  .min(1, 'apiKey is required')
  .refine((key) => !key.includes(' '), 'apiKey cannot contain spaces');

/** Workflow ID - string or number */
export const WorkflowIdSchema = z.union([
  z.string().min(1, 'Workflow ID is required'),
  z.number().int().positive(),
]);

/** Execution ID */
export const ExecutionIdSchema = z.number().int().positive();

/** Tag ID */
export const TagIdSchema = z.string().min(1, 'Tag ID is required');

/** User ID or email */
export const UserIdOrEmailSchema = z.string().min(1, 'User ID or email is required');

/** Project ID */
export const ProjectIdSchema = z.string().min(1, 'Project ID is required');

/** Variable ID */
export const VariableIdSchema = z.string().min(1, 'Variable ID is required');

/** Credential ID */
export const CredentialIdSchema = z.string().min(1, 'Credential ID is required');
