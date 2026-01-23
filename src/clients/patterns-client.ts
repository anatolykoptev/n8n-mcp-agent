/**
 * @module clients/patterns-client
 * @description Client for Zie619 workflow patterns database
 *
 * Provides access to 4343+ n8n workflow templates from:
 * https://github.com/Zie619/n8n-workflows
 *
 * Static API endpoints:
 * - /api/search-index.json - Full search index (2.2MB, 4343 workflows)
 * - /api/stats.json - Statistics
 * - /api/integrations.json - Top integrations
 * - /api/categories.json - Categories list
 */

import fetch from 'node-fetch';
import type {
  SearchIndex,
  PatternStats,
  Integration,
  WorkflowMatch,
  SearchOptions,
} from '../types/patterns.js';

// =============================================================================
// Constants
// =============================================================================

const API_BASE = 'https://zie619.github.io/n8n-workflows/api';
const WORKFLOWS_RAW = 'https://raw.githubusercontent.com/Zie619/n8n-workflows/main/workflows';

// =============================================================================
// Patterns Client
// =============================================================================

/**
 * Client for accessing Zie619 workflow patterns database
 *
 * @example
 * ```ts
 * const client = new PatternsClient();
 * const stats = await client.getStats();
 * const results = await client.search({ query: 'shopify', limit: 5 });
 * ```
 */
export class PatternsClient {
  private searchIndexCache: SearchIndex | null = null;

  /**
   * Load and cache the search index
   */
  private async loadSearchIndex(): Promise<SearchIndex> {
    if (this.searchIndexCache) {
      return this.searchIndexCache;
    }

    const response = await fetch(`${API_BASE}/search-index.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch search index: ${response.status}`);
    }

    this.searchIndexCache = (await response.json()) as SearchIndex;
    return this.searchIndexCache;
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<PatternStats> {
    const response = await fetch(`${API_BASE}/stats.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }
    return response.json() as Promise<PatternStats>;
  }

  /**
   * Get all workflow categories
   */
  async getCategories(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/categories.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }
    return response.json() as Promise<string[]>;
  }

  /**
   * Get top integrations by usage count
   */
  async getIntegrations(limit = 50): Promise<Integration[]> {
    const response = await fetch(`${API_BASE}/integrations.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch integrations: ${response.status}`);
    }
    const integrations = (await response.json()) as Integration[];
    return integrations.slice(0, limit);
  }

  /**
   * Search workflows by various criteria
   */
  async search(options: SearchOptions): Promise<WorkflowMatch[]> {
    const { query, category, integration, complexity, trigger_type, limit = 10 } = options;
    const index = await this.loadSearchIndex();

    let results = index.workflows;

    // Filter by query (name/description)
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (wf) =>
          wf.name.toLowerCase().includes(q) || wf.description.toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (category) {
      const cat = category.toLowerCase();
      results = results.filter((wf) => wf.category.toLowerCase().includes(cat));
    }

    // Filter by integration
    if (integration) {
      const integ = integration.toLowerCase();
      results = results.filter((wf) =>
        wf.integrations.some((i) => i.toLowerCase().includes(integ))
      );
    }

    // Filter by complexity
    if (complexity) {
      results = results.filter(
        (wf) => wf.complexity.toLowerCase() === complexity.toLowerCase()
      );
    }

    // Filter by trigger type
    if (trigger_type) {
      results = results.filter(
        (wf) => wf.trigger_type.toLowerCase() === trigger_type.toLowerCase()
      );
    }

    return results.slice(0, limit).map((wf) => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      category: wf.category,
      complexity: wf.complexity,
      trigger_type: wf.trigger_type,
      node_count: wf.node_count,
      integrations: wf.integrations,
    }));
  }

  /**
   * Get full workflow JSON by ID
   */
  async getWorkflowById(workflowId: string): Promise<Record<string, unknown> | null> {
    const index = await this.loadSearchIndex();

    for (const wf of index.workflows) {
      if (wf.id === workflowId || wf.filename === workflowId + '.json') {
        // Extract folder from ID pattern: NNNN_FolderName_Rest_Of_Name
        const parts = wf.id.split('_');
        let folder: string;

        if (parts.length >= 2) {
          folder = parts[1]; // Second part after the number
        } else {
          // Fallback to first integration
          folder = wf.integrations[0] || 'Unknown';
        }

        const filename = wf.filename || `${wf.id}.json`;
        const url = `${WORKFLOWS_RAW}/${folder}/${filename}`;

        try {
          const response = await fetch(url);
          if (response.ok) {
            return response.json() as Promise<Record<string, unknown>>;
          }
        } catch {
          // Try next pattern
        }
      }
    }

    return null;
  }

  /**
   * Clear the cached search index
   */
  clearCache(): void {
    this.searchIndexCache = null;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Global patterns client instance
 */
export const patternsClient = new PatternsClient();
