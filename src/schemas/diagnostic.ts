/**
 * @module schemas/diagnostic
 * @description Zod schemas for diagnostic operations (diagnose, logs, health)
 */

import { z } from 'zod';
import { ClientIdSchema } from './base.js';
import { DEFAULT_TIMEOUT_MS } from '../constants/api.js';

// --- Diagnostics ---
export const DiagnoseN8nSchema = z.object({
  clientId: ClientIdSchema,
  includeExecutions: z.boolean().optional().default(true),
  logLines: z.number().int().min(1).max(1000).optional().default(100),
  verbose: z.boolean().optional().default(false),
});

export const AnalyzeLogsSchema = z.object({
  clientId: ClientIdSchema,
  logs: z.array(z.string()).min(1, 'At least one log line is required'),
  service: z.string().optional(),
  filterBotScans: z.boolean().optional().default(true),
});

export const HealthCheckSchema = z.object({
  clientId: ClientIdSchema,
  timeout: z.number().int().min(1000).max(DEFAULT_TIMEOUT_MS).optional().default(5000),
});

// --- Type Exports ---
export type DiagnoseN8nInput = z.infer<typeof DiagnoseN8nSchema>;
export type AnalyzeLogsInput = z.infer<typeof AnalyzeLogsSchema>;
export type HealthCheckInput = z.infer<typeof HealthCheckSchema>;
