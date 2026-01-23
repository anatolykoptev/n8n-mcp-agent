# n8n Error Patterns Reference

Comprehensive catalog of error patterns for log analysis and troubleshooting.

## Pattern Format

Each pattern includes:
- **Pattern**: Regex for matching
- **Severity**: CRITICAL, ERROR, WARNING, INFO
- **Category**: Classification for grouping
- **Description**: What this error means
- **Action**: Recommended fix

---

## n8n-Specific Patterns

### Workflow Execution Failures

| Pattern | Severity | Category |
|---------|----------|----------|
| `Workflow execution failed` | ERROR | workflow |

**Description**: A workflow execution encountered an unhandled error.

**Action**:
1. Check workflow execution logs in n8n UI
2. Review node configurations for the failing node
3. Verify input data format matches expected schema
4. Check if external services are responding

---

### Connection Issues

| Pattern | Severity | Category |
|---------|----------|----------|
| `ECONNREFUSED\|Connection refused` | ERROR | network |

**Description**: n8n cannot connect to a dependent service (database, external API, webhook target).

**Action**:
1. Identify which service connection failed from log context
2. Verify the target service is running
3. Check network connectivity between containers
4. Verify firewall rules allow the connection
5. Check if service address/port is correct

---

### Credential Errors

| Pattern | Severity | Category |
|---------|----------|----------|
| `credential.*not found\|invalid.*credential` | ERROR | credentials |

**Description**: Workflow references a credential that doesn't exist or is misconfigured.

**Action**:
1. Open n8n UI and navigate to Credentials
2. Verify the credential exists with correct name
3. Re-test the credential connection
4. If expired, refresh tokens or update API keys
5. Check if credential was accidentally deleted

---

### Node Execution Errors

| Pattern | Severity | Category |
|---------|----------|----------|
| `NodeOperationError\|NodeApiError` | ERROR | node |

**Description**: A specific node failed during execution.

**Action**:
1. Check error message for specific node name
2. Review node configuration
3. Test node with sample data
4. Check if API endpoint changed

---

## Database Patterns

### Authentication Failures

| Pattern | Severity | Category |
|---------|----------|----------|
| `FATAL: password authentication failed` | CRITICAL | database |

**Description**: PostgreSQL rejected the connection due to invalid credentials.

**Action**:
1. Verify `N8N_DB_POSTGRESDB_PASSWORD` in environment
2. Check PostgreSQL `pg_hba.conf` authentication settings
3. Ensure user exists: `psql -U postgres -c "\du"`
4. Reset password if needed

---

### Connection Pool Exhaustion

| Pattern | Severity | Category |
|---------|----------|----------|
| `too many connections\|connection pool exhausted` | CRITICAL | database |

**Description**: PostgreSQL has reached maximum connection limit.

**Action**:
1. Check current connections: `SELECT count(*) FROM pg_stat_activity;`
2. Identify connection leaks in application
3. Increase `max_connections` in PostgreSQL config
4. Implement connection pooling (PgBouncer)
5. Restart n8n to release stale connections

---

### Missing Tables/Migrations

| Pattern | Severity | Category |
|---------|----------|----------|
| `relation.*does not exist\|table.*not found` | CRITICAL | database |

**Description**: Database schema is missing required tables.

**Action**:
1. Run database migrations: `n8n db:migrate`
2. If using Docker: `docker exec n8n n8n db:migrate`
3. Check if database was recreated without migrations
4. Verify connecting to correct database

---

### Database Connection Timeout

| Pattern | Severity | Category |
|---------|----------|----------|
| `database.*timeout\|connection.*timed out.*postgres` | ERROR | database |

**Description**: Database connection took too long to establish.

**Action**:
1. Check PostgreSQL server health
2. Verify network latency between n8n and database
3. Check database server CPU/memory usage
4. Increase connection timeout in n8n config

---

## Resource Patterns

### Out of Memory

| Pattern | Severity | Category |
|---------|----------|----------|
| `OOM\|Out of memory\|JavaScript heap out of memory` | CRITICAL | resource |

**Description**: Process was killed due to memory exhaustion.

**Action**:
1. Increase container memory limits in docker-compose
2. Check for memory leaks in custom code nodes
3. Reduce concurrent workflow executions
4. Add `NODE_OPTIONS=--max-old-space-size=4096`

---

### Disk Space

| Pattern | Severity | Category |
|---------|----------|----------|
| `disk.*full\|No space left on device\|ENOSPC` | CRITICAL | resource |

**Description**: Server has run out of disk space.

**Action**:
1. Check disk usage: `df -h`
2. Clear old logs: `truncate -s 0 /var/log/*.log`
3. Clean Docker: `docker system prune -a`
4. Remove old workflow executions from database
5. Add log rotation

---

### CPU Throttling

| Pattern | Severity | Category |
|---------|----------|----------|
| `CPU.*throttl\|high CPU` | WARNING | resource |

**Description**: Container is being CPU throttled.

**Action**:
1. Increase CPU limits in docker-compose
2. Optimize workflow logic
3. Reduce polling frequency
4. Distribute load across multiple workers

---

## Network Patterns

### Timeout Errors

| Pattern | Severity | Category |
|---------|----------|----------|
| `timeout\|timed out\|ETIMEDOUT` | ERROR | network |

**Description**: Request to external service exceeded timeout limit.

**Action**:
1. Check if external service is slow/down
2. Increase timeout setting in node configuration
3. Add retry logic to workflow
4. Check network latency to target

---

### Rate Limiting

| Pattern | Severity | Category |
|---------|----------|----------|
| `rate limit\|429\|Too Many Requests` | WARNING | network |

**Description**: External API is rejecting requests due to rate limits.

**Action**:
1. Add delays between API calls in workflow
2. Implement exponential backoff
3. Batch requests where possible
4. Contact API provider for higher limits
5. Cache responses to reduce calls

---

### SSL/TLS Errors

| Pattern | Severity | Category |
|---------|----------|----------|
| `SSL\|TLS\|certificate.*invalid\|CERT_` | ERROR | network |

**Description**: SSL/TLS handshake failed due to certificate issues.

**Action**:
1. Check if target certificate is valid
2. Update CA certificates in container
3. For self-signed certs: add `NODE_TLS_REJECT_UNAUTHORIZED=0` (not recommended for production)
4. Install proper certificates

---

### DNS Resolution

| Pattern | Severity | Category |
|---------|----------|----------|
| `ENOTFOUND\|getaddrinfo.*failed\|DNS` | ERROR | network |

**Description**: Cannot resolve hostname to IP address.

**Action**:
1. Verify hostname is correct
2. Check DNS server configuration
3. Try using IP address directly
4. Check if internal DNS is working (for Docker networks)

---

## Authentication Patterns

### Token Expiration

| Pattern | Severity | Category |
|---------|----------|----------|
| `token.*expired\|401.*unauthorized\|JWT.*invalid` | ERROR | auth |

**Description**: Authentication token has expired or is invalid.

**Action**:
1. Refresh OAuth tokens in credential settings
2. Generate new API key if expired
3. Re-authenticate in n8n credentials
4. Check token expiration settings

---

### Permission Denied

| Pattern | Severity | Category |
|---------|----------|----------|
| `403\|forbidden\|permission denied\|access denied` | ERROR | auth |

**Description**: Authenticated but lacks required permissions.

**Action**:
1. Check API key/user permissions
2. Verify required scopes are granted
3. Contact service admin for access
4. Use different credential with proper access

---

## Bot Scanner Patterns (IGNORE)

These patterns indicate automated vulnerability scanners, NOT real issues with your n8n instance. They should be filtered out during analysis.

| Pattern | Category | Description |
|---------|----------|-------------|
| `/wp-admin` | bot-scanner | WordPress admin scanner |
| `/wp-login` | bot-scanner | WordPress login scanner |
| `/wp-content` | bot-scanner | WordPress content scanner |
| `/wp-includes` | bot-scanner | WordPress includes scanner |
| `/.env` | bot-scanner | Environment file scanner |
| `/.git` | bot-scanner | Git repository scanner |
| `/.aws` | bot-scanner | AWS credentials scanner |
| `/phpmyadmin` | bot-scanner | phpMyAdmin scanner |
| `/admin` | bot-scanner | Generic admin scanner |
| `/administrator` | bot-scanner | Joomla admin scanner |
| `/config.php` | bot-scanner | Config file scanner |
| `/backup` | bot-scanner | Backup file scanner |
| `/shell` | bot-scanner | Shell script scanner |
| `/cgi-bin` | bot-scanner | CGI scanner |
| `/.well-known` | bot-scanner | ACME/security.txt scanner |
| `/xmlrpc.php` | bot-scanner | WordPress XML-RPC scanner |
| `/api/v1/pods` | bot-scanner | Kubernetes API scanner |
| `/actuator` | bot-scanner | Spring Boot actuator scanner |
| `/swagger` | bot-scanner | API documentation scanner |
| `/graphql` | bot-scanner | GraphQL endpoint scanner |

**Note**: 404 responses to these paths are expected and healthy. They show your server correctly rejects unauthorized access attempts.

---

## Severity Guide

| Severity | Response Time | Description |
|----------|---------------|-------------|
| CRITICAL | Immediate | Service down, data at risk, security breach |
| ERROR | Within 1 hour | Feature broken, workflow failing |
| WARNING | Within 24 hours | Potential issue, degraded performance |
| INFO | Monitor | Informational, no action needed |

---

## Pattern Matching Tips

### Combining Patterns

For complex log analysis, combine patterns:
```regex
(ECONNREFUSED|timeout|connection refused).*postgres
```
This finds database-specific connection issues.

### Context Extraction

When a pattern matches, extract surrounding context:
- 5 lines before: Setup and request info
- 5 lines after: Stack trace and details

### Time Correlation

Group errors by timestamp to identify:
- Cascading failures
- Periodic issues (cron-related)
- Traffic spikes
