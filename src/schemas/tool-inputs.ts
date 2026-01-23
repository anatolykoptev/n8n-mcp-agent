/**
 * @module schemas/tool-inputs
 * @description Zod validation schemas for all MCP tool inputs
 *
 * Provides runtime validation to prevent:
 * - Invalid URLs (SSRF protection)
 * - Missing required fields
 * - Type mismatches
 * - Injection attacks
 */

import { z } from 'zod';

// =============================================================================
// Base Schemas (Reusable)
// =============================================================================

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
        // SSRF protection: block localhost, internal IPs, and non-HTTP(S)
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

// =============================================================================
// Tool Input Schemas
// =============================================================================

// --- Initialization ---
export const InitN8nSchema = z.object({
  url: N8nUrlSchema,
  apiKey: ApiKeySchema,
});

// --- Workflows ---
export const ListWorkflowsSchema = z.object({
  clientId: ClientIdSchema,
});

export const GetWorkflowSchema = z.object({
  clientId: ClientIdSchema,
  id: WorkflowIdSchema,
});

export const CreateWorkflowSchema = z.object({
  clientId: ClientIdSchema,
  name: z.string().min(1, 'Workflow name is required').max(255),
  nodes: z.array(z.record(z.unknown())).optional().default([]),
  connections: z.record(z.unknown()).optional().default({}),
});

export const UpdateWorkflowSchema = z.object({
  clientId: ClientIdSchema,
  id: WorkflowIdSchema,
  workflow: z.object({
    name: z.string().min(1).max(255).optional(),
    active: z.boolean().optional(),
    nodes: z.array(z.record(z.unknown())).optional(),
    connections: z.record(z.unknown()).optional(),
    settings: z.record(z.unknown()).optional(),
  }),
});

export const DeleteWorkflowSchema = z.object({
  clientId: ClientIdSchema,
  id: WorkflowIdSchema,
});

export const ActivateWorkflowSchema = z.object({
  clientId: ClientIdSchema,
  id: WorkflowIdSchema,
});

export const DeactivateWorkflowSchema = z.object({
  clientId: ClientIdSchema,
  id: WorkflowIdSchema,
});

export const ExecuteWebhookSchema = z.object({
  clientId: ClientIdSchema,
  webhookPath: z.string().min(1, 'Webhook path is required'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().default('POST'),
  data: z.record(z.unknown()).optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().int().min(1000).max(300000).optional().default(30000),
});

export const GetWebhookUrlSchema = z.object({
  clientId: ClientIdSchema,
  id: WorkflowIdSchema,
});

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

// --- Executions ---
export const ListExecutionsSchema = z.object({
  clientId: ClientIdSchema,
  workflowId: z.string().optional(),
  status: z.enum(['error', 'success', 'waiting']).optional(),
  limit: z.number().int().min(1).max(250).optional(),
  includeData: z.boolean().optional(),
});

export const GetExecutionSchema = z.object({
  clientId: ClientIdSchema,
  id: ExecutionIdSchema,
  includeData: z.boolean().optional(),
});

export const DeleteExecutionSchema = z.object({
  clientId: ClientIdSchema,
  id: ExecutionIdSchema,
});

// --- Tags ---
export const ListTagsSchema = z.object({
  clientId: ClientIdSchema,
  limit: z.number().int().min(1).max(250).optional(),
});

export const CreateTagSchema = z.object({
  clientId: ClientIdSchema,
  name: z.string().min(1, 'Tag name is required').max(100),
});

export const GetTagSchema = z.object({
  clientId: ClientIdSchema,
  id: TagIdSchema,
});

export const UpdateTagSchema = z.object({
  clientId: ClientIdSchema,
  id: TagIdSchema,
  name: z.string().min(1, 'Tag name is required').max(100),
});

export const DeleteTagSchema = z.object({
  clientId: ClientIdSchema,
  id: TagIdSchema,
});

export const GetWorkflowTagsSchema = z.object({
  clientId: ClientIdSchema,
  workflowId: WorkflowIdSchema,
});

export const UpdateWorkflowTagsSchema = z.object({
  clientId: ClientIdSchema,
  workflowId: WorkflowIdSchema,
  tagIds: z.array(
    z.object({
      id: TagIdSchema,
    })
  ),
});

// --- Variables ---
export const ListVariablesSchema = z.object({
  clientId: ClientIdSchema,
});

export const CreateVariableSchema = z.object({
  clientId: ClientIdSchema,
  key: z.string().min(1, 'Variable key is required').max(100),
  value: z.string(),
});

export const DeleteVariableSchema = z.object({
  clientId: ClientIdSchema,
  id: VariableIdSchema,
});

// --- Credentials ---
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
    .array(
      z.enum(['credentials', 'database', 'nodes', 'filesystem', 'instance'])
    )
    .optional(),
  daysAbandonedWorkflow: z.number().int().min(1).optional(),
});

// =============================================================================
// Pattern Schemas (Zie619 Workflow Database)
// =============================================================================

export const PatternStatsSchema = z.object({});

export const PatternSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  integration: z.string().optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  trigger_type: z.enum(['Manual', 'Webhook', 'Scheduled', 'Complex']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const PatternGetSchema = z.object({
  workflow_id: z.string().min(1, 'Workflow ID is required'),
});

export const PatternCategoriesSchema = z.object({});

export const PatternIntegrationsSchema = z.object({
  limit: z.number().int().min(1).max(500).optional(),
});

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type InitN8nInput = z.infer<typeof InitN8nSchema>;
export type ListWorkflowsInput = z.infer<typeof ListWorkflowsSchema>;
export type GetWorkflowInput = z.infer<typeof GetWorkflowSchema>;
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;
export type DeleteWorkflowInput = z.infer<typeof DeleteWorkflowSchema>;
export type ActivateWorkflowInput = z.infer<typeof ActivateWorkflowSchema>;
export type DeactivateWorkflowInput = z.infer<typeof DeactivateWorkflowSchema>;
export type ExecuteWebhookInput = z.infer<typeof ExecuteWebhookSchema>;
export type GetWebhookUrlInput = z.infer<typeof GetWebhookUrlSchema>;
export type ListUsersInput = z.infer<typeof ListUsersSchema>;
export type CreateUsersInput = z.infer<typeof CreateUsersSchema>;
export type GetUserInput = z.infer<typeof GetUserSchema>;
export type DeleteUserInput = z.infer<typeof DeleteUserSchema>;
export type ListProjectsInput = z.infer<typeof ListProjectsSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type DeleteProjectInput = z.infer<typeof DeleteProjectSchema>;
export type ListExecutionsInput = z.infer<typeof ListExecutionsSchema>;
export type GetExecutionInput = z.infer<typeof GetExecutionSchema>;
export type DeleteExecutionInput = z.infer<typeof DeleteExecutionSchema>;
export type ListTagsInput = z.infer<typeof ListTagsSchema>;
export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type GetTagInput = z.infer<typeof GetTagSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;
export type DeleteTagInput = z.infer<typeof DeleteTagSchema>;
export type GetWorkflowTagsInput = z.infer<typeof GetWorkflowTagsSchema>;
export type UpdateWorkflowTagsInput = z.infer<typeof UpdateWorkflowTagsSchema>;
export type ListVariablesInput = z.infer<typeof ListVariablesSchema>;
export type CreateVariableInput = z.infer<typeof CreateVariableSchema>;
export type DeleteVariableInput = z.infer<typeof DeleteVariableSchema>;
export type CreateCredentialInput = z.infer<typeof CreateCredentialSchema>;
export type DeleteCredentialInput = z.infer<typeof DeleteCredentialSchema>;
export type GetCredentialSchemaInput = z.infer<typeof GetCredentialSchemaSchema>;
export type GenerateAuditInput = z.infer<typeof GenerateAuditSchema>;
export type PatternStatsInput = z.infer<typeof PatternStatsSchema>;
export type PatternSearchInput = z.infer<typeof PatternSearchSchema>;
export type PatternGetInput = z.infer<typeof PatternGetSchema>;
export type PatternCategoriesInput = z.infer<typeof PatternCategoriesSchema>;
export type PatternIntegrationsInput = z.infer<typeof PatternIntegrationsSchema>;
