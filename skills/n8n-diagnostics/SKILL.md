---
name: n8n-diagnostics
description: Diagnose n8n issues by analyzing logs, detecting error patterns, and providing actionable fixes. Use when workflows fail, services are unhealthy, or debugging n8n problems.
---

# n8n Diagnostics Skill

## When to Use This Skill

Use n8n-diagnostics when:
- Workflow executions fail or behave unexpectedly
- n8n service is unhealthy or unresponsive
- Need to analyze logs for error patterns
- Debugging connectivity or credential issues
- Performance problems in n8n instance

## Available MCP Tools

### n8n-diagnose

Primary diagnostic tool. Runs comprehensive health checks and returns actionable recommendations.

```
Input: { clientId, workflowId?, verbose? }
Output: { status, issues[], recommendations[] }
```

Use when:
- Quick overview of n8n health needed
- Specific workflow is failing
- Need to identify root cause of issues

### n8n-analyze-logs

Parses n8n logs and extracts error patterns, warnings, and anomalies.

```
Input: { clientId, lines?, since?, filter? }
Output: { errors[], warnings[], patterns[] }
```

Use when:
- Need to analyze historical issues
- Looking for recurring error patterns
- Debugging intermittent failures

### n8n-health-check

Lightweight health check for service availability and basic metrics.

```
Input: { clientId }
Output: { healthy, latency, version, uptime }
```

Use when:
- Quick availability check needed
- Monitoring service status
- Before running workflows

## Decision Tree

```
Problem reported
    │
    ├─► "n8n is down/unresponsive"
    │       └─► n8n-health-check
    │               │
    │               ├─► healthy=false → Check Docker/service status
    │               └─► healthy=true → n8n-diagnose for deeper issues
    │
    ├─► "Workflow X is failing"
    │       └─► n8n-diagnose { workflowId: X }
    │               │
    │               ├─► Credential error → Re-configure credentials
    │               ├─► Connection error → Check dependent services
    │               └─► Logic error → Review workflow nodes
    │
    ├─► "Something seems wrong, not sure what"
    │       └─► n8n-analyze-logs { lines: 500 }
    │               │
    │               └─► Review patterns → n8n-diagnose for specific issues
    │
    └─► "Need to debug specific timeframe"
            └─► n8n-analyze-logs { since: "2h" }
```

## Common Issues & Quick Fixes

### Service Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| n8n not responding | Container down | `docker compose up -d n8n` |
| Slow response times | Memory pressure | Increase container memory |
| Random restarts | OOM killer | Check logs, increase limits |

### Workflow Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| "Credential not found" | Missing/invalid credential | Re-add credential in n8n UI |
| "Connection refused" | Dependent service down | Check target service status |
| "Timeout" | Slow external API | Increase node timeout setting |
| "Rate limited" | Too many requests | Add delay between executions |

### Database Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| "Authentication failed" | Wrong DB credentials | Check N8N_DB_* env vars |
| "Too many connections" | Connection leak | Restart n8n, check pool settings |
| "Relation does not exist" | Missing migrations | Run `n8n db:migrate` |

## Error Pattern Reference

See [error-patterns.md](./error-patterns.md) for comprehensive error pattern catalog with:
- Regex patterns for log matching
- Severity levels
- Suggested actions

## Best Practices for Troubleshooting

### 1. Start with Health Check

Always run `n8n-health-check` first to verify basic connectivity before deeper analysis.

### 2. Check Recent Logs

Use `n8n-analyze-logs` with appropriate timeframe:
- Last 100 lines for recent issues
- Last 500+ lines for pattern analysis
- Specific timeframe for known incident window

### 3. Isolate the Problem

Narrow down the scope:
- Specific workflow? Use `workflowId` parameter
- Specific time? Use `since` parameter
- Specific error type? Use `filter` parameter

### 4. Ignore Bot Scanners

Many log "errors" are actually bot scanners probing for vulnerabilities. Filter these out:
- `/wp-admin`, `/wp-login.php` - WordPress scanners
- `/.env`, `/.git` - Secret file scanners
- `/phpmyadmin`, `/admin` - Admin panel scanners

These are NOT real issues with your n8n instance.

### 5. Check Dependencies First

Before blaming n8n, verify:
- PostgreSQL is running and accessible
- Redis (if used) is healthy
- External APIs are responding
- Network connectivity is working

### 6. Review Recent Changes

Ask:
- Were any workflows recently modified?
- Were credentials updated?
- Was n8n or Docker updated?
- Were environment variables changed?

## Integration with Other Skills

- **n8n-deployment**: If diagnostics reveal infrastructure issues
- **n8n-security**: If security-related errors detected
- **monitor-executions**: For ongoing monitoring after fixes
