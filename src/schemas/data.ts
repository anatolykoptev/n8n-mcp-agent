/**
 * @module schemas/data
 * @description Zod schemas for data operations (executions, tags, variables)
 */

import { z } from 'zod';
import { ClientIdSchema, ExecutionIdSchema, TagIdSchema, WorkflowIdSchema, VariableIdSchema } from './base.js';

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

// --- Type Exports ---
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
