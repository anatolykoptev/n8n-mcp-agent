/**
 * @module schemas/admin
 * @description Zod schemas for admin operations (users, projects, credentials, audit)
 */

import { z } from 'zod';
import { ClientIdSchema, UserIdOrEmailSchema, ProjectIdSchema, CredentialIdSchema } from './base.js';

// --- Users ---
export const ListUsersSchema = z.object({
  clientId: ClientIdSchema,
});

export const CreateUsersSchema = z.object({
  clientId: ClientIdSchema,
  users: z.array(
    z.object({
      email: z.string().email('Invalid email format'),
      role: z.enum(['global:admin', 'global:member']).optional(),
    })
  ).min(1, 'At least one user is required'),
});

export const GetUserSchema = z.object({
  clientId: ClientIdSchema,
  idOrEmail: UserIdOrEmailSchema,
});

export const DeleteUserSchema = z.object({
  clientId: ClientIdSchema,
  idOrEmail: UserIdOrEmailSchema,
});

// --- Projects ---
export const ListProjectsSchema = z.object({
  clientId: ClientIdSchema,
});

export const CreateProjectSchema = z.object({
  clientId: ClientIdSchema,
  name: z.string().min(1, 'Project name is required').max(255),
});

export const UpdateProjectSchema = z.object({
  clientId: ClientIdSchema,
  projectId: ProjectIdSchema,
  name: z.string().min(1, 'Project name is required').max(255),
});

export const DeleteProjectSchema = z.object({
  clientId: ClientIdSchema,
  projectId: ProjectIdSchema,
});

// --- Auth (REST API) ---
export const N8nLoginSchema = z.object({
  clientId: ClientIdSchema,
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// --- Credentials ---
export const ListCredentialsInUseSchema = z.object({
  clientId: ClientIdSchema,
  /** Filter by credential type (e.g., 'shopifyApi', 'googleApi') */
  type: z.string().optional(),
});

export const ListCredentialsSchema = z.object({
  clientId: ClientIdSchema,
  /** Session cookie from n8n-login (required for REST API) */
  sessionCookie: z.string().min(1, 'Session cookie is required'),
  /** Include credential scopes in response */
  includeScopes: z.boolean().optional().default(true),
});

export const CreateCredentialSchema = z.object({
  clientId: ClientIdSchema,
  name: z.string().min(1, 'Credential name is required').max(255),
  type: z.string().min(1, 'Credential type is required'),
  data: z.record(z.unknown()),
});

export const DeleteCredentialSchema = z.object({
  clientId: ClientIdSchema,
  id: CredentialIdSchema,
});

export const GetCredentialSchemaSchema = z.object({
  clientId: ClientIdSchema,
  credentialTypeName: z.string().min(1, 'Credential type name is required'),
});

// --- Audit ---
export const GenerateAuditSchema = z.object({
  clientId: ClientIdSchema,
  categories: z
    .array(z.enum(['credentials', 'database', 'nodes', 'filesystem', 'instance']))
    .optional(),
  daysAbandonedWorkflow: z.number().int().min(1).optional(),
});

// --- Type Exports ---
export type N8nLoginInput = z.infer<typeof N8nLoginSchema>;
export type ListUsersInput = z.infer<typeof ListUsersSchema>;
export type CreateUsersInput = z.infer<typeof CreateUsersSchema>;
export type GetUserInput = z.infer<typeof GetUserSchema>;
export type DeleteUserInput = z.infer<typeof DeleteUserSchema>;
export type ListProjectsInput = z.infer<typeof ListProjectsSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type DeleteProjectInput = z.infer<typeof DeleteProjectSchema>;
export type ListCredentialsInUseInput = z.infer<typeof ListCredentialsInUseSchema>;
export type ListCredentialsInput = z.infer<typeof ListCredentialsSchema>;
export type CreateCredentialInput = z.infer<typeof CreateCredentialSchema>;
export type DeleteCredentialInput = z.infer<typeof DeleteCredentialSchema>;
export type GetCredentialSchemaInput = z.infer<typeof GetCredentialSchemaSchema>;
export type GenerateAuditInput = z.infer<typeof GenerateAuditSchema>;
