/**
 * @module schemas/pattern
 * @description Zod schemas for Zie619 workflow pattern operations
 */

import { z } from 'zod';

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

// --- Type Exports ---
export type PatternStatsInput = z.infer<typeof PatternStatsSchema>;
export type PatternSearchInput = z.infer<typeof PatternSearchSchema>;
export type PatternGetInput = z.infer<typeof PatternGetSchema>;
export type PatternCategoriesInput = z.infer<typeof PatternCategoriesSchema>;
export type PatternIntegrationsInput = z.infer<typeof PatternIntegrationsSchema>;
