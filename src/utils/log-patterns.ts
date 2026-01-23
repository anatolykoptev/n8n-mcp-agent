/**
 * @module utils/log-patterns
 * @description Log pattern definitions for n8n diagnostics
 *
 * Provides error pattern matching for:
 * - n8n workflow failures
 * - Database connection issues
 * - Authentication errors
 * - Network problems
 * - Resource exhaustion
 */

// =============================================================================
// Types
// =============================================================================

export enum AlertLevel {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface ErrorPattern {
  pattern: RegExp;
  level: AlertLevel;
  category: string;
  description: string;
  suggestedAction: string;
  services?: string[];
}

export interface LogAnalysisResult {
  level: AlertLevel;
  category: string;
  description: string;
  suggestedAction: string;
  matchedText: string;
}

// =============================================================================
// Error Patterns
// =============================================================================

export const ERROR_PATTERNS: ErrorPattern[] = [
  // n8n workflow patterns
  {
    pattern: /Workflow\s+(?:execution\s+)?failed/i,
    level: AlertLevel.WARNING,
    category: 'workflow',
    description: 'n8n workflow execution failed',
    suggestedAction: 'Check workflow logs for specific error. Review node configurations.',
    services: ['n8n'],
  },
  {
    pattern: /The workflow has been deactivated/i,
    level: AlertLevel.INFO,
    category: 'workflow',
    description: 'Workflow automatically deactivated',
    suggestedAction: 'Review workflow for errors and reactivate if needed.',
    services: ['n8n'],
  },
  {
    pattern: /Node "([^"]+)" has no run data/i,
    level: AlertLevel.WARNING,
    category: 'workflow',
    description: 'Node missing execution data',
    suggestedAction: 'Check node input connections and trigger conditions.',
    services: ['n8n'],
  },
  {
    pattern: /Credential\s+(?:not found|invalid|expired)/i,
    level: AlertLevel.ERROR,
    category: 'credentials',
    description: 'Credential issue detected',
    suggestedAction: 'Update or recreate the affected credential in n8n settings.',
    services: ['n8n'],
  },
  {
    pattern: /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i,
    level: AlertLevel.ERROR,
    category: 'network',
    description: 'Network connection failed',
    suggestedAction: 'Check target service availability and network connectivity.',
  },
  {
    pattern: /rate\s*limit|too\s*many\s*requests|429/i,
    level: AlertLevel.WARNING,
    category: 'rate-limit',
    description: 'Rate limit exceeded',
    suggestedAction: 'Reduce request frequency or implement backoff strategy.',
  },
  {
    pattern: /out\s*of\s*memory|heap|OOM/i,
    level: AlertLevel.CRITICAL,
    category: 'memory',
    description: 'Memory exhaustion detected',
    suggestedAction: 'Increase container memory limits or optimize workflow data handling.',
  },
  {
    pattern: /SIGTERM|SIGKILL|container\s+killed/i,
    level: AlertLevel.CRITICAL,
    category: 'process',
    description: 'Process terminated unexpectedly',
    suggestedAction: 'Check resource limits and container health. Review orchestrator logs.',
  },
  // Database patterns
  {
    pattern: /database\s+connection\s+(?:failed|error|timeout)/i,
    level: AlertLevel.CRITICAL,
    category: 'database',
    description: 'Database connection issue',
    suggestedAction: 'Check database server status and connection string configuration.',
  },
  {
    pattern: /ECONNRESET.*(?:postgres|mysql|mongo)/i,
    level: AlertLevel.ERROR,
    category: 'database',
    description: 'Database connection reset',
    suggestedAction: 'Check database server stability and connection pool settings.',
  },
  {
    pattern: /deadlock\s+detected/i,
    level: AlertLevel.ERROR,
    category: 'database',
    description: 'Database deadlock detected',
    suggestedAction: 'Review concurrent transactions and consider retry logic.',
  },
  // Authentication patterns
  {
    pattern: /unauthorized|401|authentication\s+failed/i,
    level: AlertLevel.ERROR,
    category: 'auth',
    description: 'Authentication failure',
    suggestedAction: 'Verify API keys and authentication tokens are valid.',
  },
  {
    pattern: /forbidden|403|access\s+denied/i,
    level: AlertLevel.ERROR,
    category: 'auth',
    description: 'Authorization failure',
    suggestedAction: 'Check user permissions and access control settings.',
  },
  {
    pattern: /token\s+(?:expired|invalid|revoked)/i,
    level: AlertLevel.ERROR,
    category: 'auth',
    description: 'Token issue detected',
    suggestedAction: 'Refresh or regenerate the authentication token.',
  },
  // SSL/TLS patterns
  {
    pattern: /certificate\s+(?:expired|invalid|error)/i,
    level: AlertLevel.ERROR,
    category: 'ssl',
    description: 'SSL/TLS certificate issue',
    suggestedAction: 'Renew or update SSL certificates.',
  },
  {
    pattern: /SSL\s+handshake\s+failed/i,
    level: AlertLevel.ERROR,
    category: 'ssl',
    description: 'SSL handshake failure',
    suggestedAction: 'Check SSL configuration and certificate chain.',
  },
  // Webhook patterns
  {
    pattern: /webhook\s+(?:not\s+found|error|timeout)/i,
    level: AlertLevel.WARNING,
    category: 'webhook',
    description: 'Webhook issue detected',
    suggestedAction: 'Verify webhook URL and target service availability.',
    services: ['n8n'],
  },
  // Execution patterns
  {
    pattern: /execution\s+timeout/i,
    level: AlertLevel.WARNING,
    category: 'execution',
    description: 'Workflow execution timed out',
    suggestedAction: 'Increase timeout settings or optimize workflow performance.',
    services: ['n8n'],
  },
  {
    pattern: /max\s+(?:retries|attempts)\s+exceeded/i,
    level: AlertLevel.WARNING,
    category: 'execution',
    description: 'Maximum retry attempts reached',
    suggestedAction: 'Review error handling and increase retry limits if appropriate.',
  },
];

// =============================================================================
// Bot Scanner Patterns
// =============================================================================

export const BOT_SCANNER_PATHS: RegExp[] = [
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/wp-content/i,
  /\/\.env/i,
  /\/\.git/i,
  /\/\.aws/i,
  /\/phpMyAdmin/i,
  /\/phpmyadmin/i,
  /\/admin\.php/i,
  /\/config\.php/i,
  /\/backup/i,
  /\/db\./i,
  /\/sql/i,
  /\/dump/i,
  /\/xmlrpc\.php/i,
  /\/\.well-known\/security\.txt/i,
  /\/actuator/i,
  /\/api\/v1\/pods/i,
  /\/debug/i,
  /\/trace/i,
  /\/console/i,
  /\/shell/i,
  /\/cgi-bin/i,
  /\/manager\/html/i,
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a log message indicates a bot scanner request
 *
 * @param message - Log message to analyze
 * @returns true if the message matches known bot scanner patterns
 */
export function isBotScannerRequest(message: string): boolean {
  return BOT_SCANNER_PATHS.some((pattern) => pattern.test(message));
}

/**
 * Analyze a single log entry for known error patterns
 *
 * @param message - Log message to analyze
 * @param service - Optional service name to filter patterns
 * @returns Array of matching error patterns with analysis results
 */
export function analyzeLogEntry(
  message: string,
  service?: string
): LogAnalysisResult[] {
  const results: LogAnalysisResult[] = [];

  for (const pattern of ERROR_PATTERNS) {
    // Skip patterns that don't apply to this service
    if (pattern.services && service && !pattern.services.includes(service)) {
      continue;
    }

    const match = message.match(pattern.pattern);
    if (match) {
      results.push({
        level: pattern.level,
        category: pattern.category,
        description: pattern.description,
        suggestedAction: pattern.suggestedAction,
        matchedText: match[0],
      });
    }
  }

  return results;
}

/**
 * Get severity weight for sorting
 *
 * @param level - Alert level to get weight for
 * @returns Numeric weight (higher = more severe)
 */
export function getAlertWeight(level: AlertLevel): number {
  const weights: Record<AlertLevel, number> = {
    [AlertLevel.CRITICAL]: 4,
    [AlertLevel.ERROR]: 3,
    [AlertLevel.WARNING]: 2,
    [AlertLevel.INFO]: 1,
  };
  return weights[level];
}

/**
 * Analyze multiple log entries and return sorted results
 *
 * @param messages - Array of log messages to analyze
 * @param service - Optional service name to filter patterns
 * @returns Sorted analysis results (critical first)
 */
export function analyzeLogs(
  messages: string[],
  service?: string
): LogAnalysisResult[] {
  const allResults: LogAnalysisResult[] = [];

  for (const message of messages) {
    // Skip bot scanner requests
    if (isBotScannerRequest(message)) {
      continue;
    }

    const results = analyzeLogEntry(message, service);
    allResults.push(...results);
  }

  // Sort by severity (critical first)
  return allResults.sort(
    (a, b) => getAlertWeight(b.level) - getAlertWeight(a.level)
  );
}

/**
 * Summarize analysis results by category
 *
 * @param results - Analysis results to summarize
 * @returns Summary grouped by category with counts
 */
export function summarizeResults(
  results: LogAnalysisResult[]
): Record<string, { count: number; levels: Record<AlertLevel, number> }> {
  const summary: Record<string, { count: number; levels: Record<AlertLevel, number> }> = {};

  for (const result of results) {
    if (!summary[result.category]) {
      summary[result.category] = {
        count: 0,
        levels: {
          [AlertLevel.CRITICAL]: 0,
          [AlertLevel.ERROR]: 0,
          [AlertLevel.WARNING]: 0,
          [AlertLevel.INFO]: 0,
        },
      };
    }

    summary[result.category].count += 1;
    summary[result.category].levels[result.level] += 1;
  }

  return summary;
}
