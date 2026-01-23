/**
 * @module schemas/workflow
 * @description Zod schemas for workflow, webhook, and test operations
 */

import { z } from 'zod';
import { ClientIdSchema, WorkflowIdSchema, N8nUrlSchema, ApiKeySchema } from './base.js';

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

// --- Webhooks ---
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

// --- Test Workflow ---
export const TriggerTypeEnum = z.enum([
  'webhook',
  'executeWorkflowTrigger',
  'manualTrigger',
  'scheduleTrigger',
  'other',
]);

export const TestWorkflowSchema = z.object({
  clientId: ClientIdSchema,
  workflowId: WorkflowIdSchema,
  data: z.record(z.unknown()).optional(),
  autoConvert: z.boolean().optional().default(false),
  testRunnerPath: z.string().optional().default('test-runner'),
  timeout: z.number().int().min(1000).max(300000).optional().default(60000),
});

// --- Type Exports ---
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
export type TriggerType = z.infer<typeof TriggerTypeEnum>;
export type TestWorkflowInput = z.infer<typeof TestWorkflowSchema>;
