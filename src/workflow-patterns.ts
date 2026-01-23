/**
 * Zie619 Workflow Patterns Database
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

const API_BASE = "https://zie619.github.io/n8n-workflows/api";
const WORKFLOWS_RAW = "https://raw.githubusercontent.com/Zie619/n8n-workflows/main/workflows";

// Cache for search index (loaded once)
let searchIndexCache: SearchIndex | null = null;

interface WorkflowEntry {
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

interface SearchIndex {
  workflows: WorkflowEntry[];
  generated_at: string;
  total_count: number;
}

interface Stats {
  total_workflows: number;
  total_integrations: number;
  total_categories: number;
  complexity_distribution: Record<string, number>;
  trigger_distribution: Record<string, number>;
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

async function loadSearchIndex(): Promise<SearchIndex> {
  if (searchIndexCache) {
    return searchIndexCache;
  }

  const response = await fetch(`${API_BASE}/search-index.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch search index: ${response.status}`);
  }

  searchIndexCache = await response.json() as SearchIndex;
  return searchIndexCache;
}

export async function getStats(): Promise<Stats> {
  const response = await fetch(`${API_BASE}/stats.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.status}`);
  }
  return response.json() as Promise<Stats>;
}

export async function getCategories(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/categories.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status}`);
  }
  return response.json() as Promise<string[]>;
}

export async function getTopIntegrations(limit: number = 50): Promise<Array<{ name: string; count: number }>> {
  const response = await fetch(`${API_BASE}/integrations.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch integrations: ${response.status}`);
  }
  const integrations = await response.json() as Array<{ name: string; count: number }>;
  return integrations.slice(0, limit);
}

export async function searchWorkflows(options: {
  query?: string;
  category?: string;
  integration?: string;
  complexity?: string;
  trigger_type?: string;
  limit?: number;
}): Promise<WorkflowMatch[]> {
  const { query, category, integration, complexity, trigger_type, limit = 10 } = options;
  const index = await loadSearchIndex();

  let results = index.workflows;

  // Filter by query (name/description)
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(wf =>
      wf.name.toLowerCase().includes(q) ||
      wf.description.toLowerCase().includes(q)
    );
  }

  // Filter by category
  if (category) {
    const cat = category.toLowerCase();
    results = results.filter(wf => wf.category.toLowerCase().includes(cat));
  }

  // Filter by integration
  if (integration) {
    const integ = integration.toLowerCase();
    results = results.filter(wf =>
      wf.integrations.some(i => i.toLowerCase().includes(integ))
    );
  }

  // Filter by complexity
  if (complexity) {
    results = results.filter(wf => wf.complexity.toLowerCase() === complexity.toLowerCase());
  }

  // Filter by trigger type
  if (trigger_type) {
    results = results.filter(wf => wf.trigger_type.toLowerCase() === trigger_type.toLowerCase());
  }

  return results.slice(0, limit).map(wf => ({
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

export async function getWorkflowById(workflowId: string): Promise<Record<string, unknown> | null> {
  const index = await loadSearchIndex();

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

// Tool definitions for MCP
export const PATTERN_TOOLS = [
  {
    name: "n8n-patterns-stats",
    description: "Get Zie619 workflow database statistics (4343 workflows, 268 integrations, 16 categories).",
    inputSchema: {
      type: "object",
      properties: {},
    }
  },
  {
    name: "n8n-patterns-search",
    description: "Search workflow templates from Zie619 database. Filter by query, category, integration, complexity, or trigger type.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text search in name/description" },
        category: { type: "string", description: "Filter by category (e.g., 'E-commerce & Retail', 'AI Agent Development')" },
        integration: { type: "string", description: "Filter by integration (e.g., 'Shopify', 'OpenAI', 'Slack')" },
        complexity: { type: "string", enum: ["low", "medium", "high"], description: "Filter by complexity" },
        trigger_type: { type: "string", enum: ["Manual", "Webhook", "Scheduled", "Complex"], description: "Filter by trigger type" },
        limit: { type: "number", description: "Max results (default 10)" }
      }
    }
  },
  {
    name: "n8n-patterns-get",
    description: "Get full workflow JSON template by ID. Use this to fetch a template for deployment.",
    inputSchema: {
      type: "object",
      properties: {
        workflow_id: { type: "string", description: "Workflow ID from search results" }
      },
      required: ["workflow_id"]
    }
  },
  {
    name: "n8n-patterns-categories",
    description: "List all workflow categories (16 total).",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "n8n-patterns-integrations",
    description: "List top integrations by usage count.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 50)" }
      }
    }
  }
];

// Handler for pattern tools
export async function handlePatternTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "n8n-patterns-stats": {
        const stats = await getStats();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(stats, null, 2)
          }]
        };
      }

      case "n8n-patterns-search": {
        const results = await searchWorkflows({
          query: args.query as string | undefined,
          category: args.category as string | undefined,
          integration: args.integration as string | undefined,
          complexity: args.complexity as string | undefined,
          trigger_type: args.trigger_type as string | undefined,
          limit: args.limit as number | undefined
        });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ count: results.length, workflows: results }, null, 2)
          }]
        };
      }

      case "n8n-patterns-get": {
        const workflowId = args.workflow_id as string;
        const workflow = await getWorkflowById(workflowId);
        if (!workflow) {
          return {
            content: [{
              type: "text",
              text: `Workflow not found: ${workflowId}`
            }],
            isError: true
          };
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify(workflow, null, 2)
          }]
        };
      }

      case "n8n-patterns-categories": {
        const categories = await getCategories();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(categories, null, 2)
          }]
        };
      }

      case "n8n-patterns-integrations": {
        const limit = (args.limit as number) || 50;
        const integrations = await getTopIntegrations(limit);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(integrations, null, 2)
          }]
        };
      }

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown pattern tool: ${name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : "Unknown error occurred"
      }],
      isError: true
    };
  }
}
