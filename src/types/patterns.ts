/**
 * @module types/patterns
 * @description Type definitions for Zie619 workflow patterns database
 */

// =============================================================================
// Workflow Entry Types
// =============================================================================

export interface WorkflowEntry {
  id: string;
  name: string;
  description: string;
  filename: string;
  category: string;
  complexity: string;
  trigger_type: string;
  node_count: number;
  integrations: string[];
}

export interface WorkflowMatch {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: string;
  trigger_type: string;
  node_count: number;
  integrations: string[];
}

// =============================================================================
// Search Index Types
// =============================================================================

export interface SearchIndex {
  workflows: WorkflowEntry[];
  generated_at: string;
  total_count: number;
}

// =============================================================================
// Stats Types
// =============================================================================

export interface PatternStats {
  total_workflows: number;
  total_integrations: number;
  total_categories: number;
  complexity_distribution: Record<string, number>;
  trigger_distribution: Record<string, number>;
}

// =============================================================================
// Integration Types
// =============================================================================

export interface Integration {
  name: string;
  count: number;
}

// =============================================================================
// Search Options
// =============================================================================

export interface SearchOptions {
  query?: string;
  category?: string;
  integration?: string;
  complexity?: 'low' | 'medium' | 'high';
  trigger_type?: 'Manual' | 'Webhook' | 'Scheduled' | 'Complex';
  limit?: number;
}
