---
name: n8n-security
description: Security checklist for n8n workflows. Use when creating webhooks, handling credentials, processing user input, or preparing workflows for production.
---

# n8n Security Skill

This skill ensures n8n workflows follow security best practices.

## When to Activate

- Creating webhook endpoints
- Setting up credentials
- Processing external/user input
- Preparing workflows for production
- Handling sensitive data (payments, PII)
- Integrating with external APIs

## Security Checklist

### 1. Webhook Authentication

#### Always Authenticate Production Webhooks

| Auth Method | Security Level | Use Case |
|-------------|----------------|----------|
| None | Low | Testing only |
| Basic Auth | Medium | Simple auth with HTTPS |
| Header Auth | Medium-High | API key validation |
| JWT Auth | High | Token-based with expiration |

#### Implementation

```
# Basic Auth
Authorization: Basic base64(username:password)

# Header Auth
X-API-Key: your-api-key-here

# JWT Auth
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### Verification Steps
- [ ] Production webhooks use authentication (not "None")
- [ ] HTTPS enabled for all webhook endpoints
- [ ] API keys rotated regularly
- [ ] JWT tokens have reasonable expiration

### 2. Credentials Management

#### Never Hardcode Secrets

```javascript
// WRONG: Hardcoded in Code node
const apiKey = "sk-proj-xxxxx"

// CORRECT: Use credentials or external secrets
const apiKey = $credentials.openAiApi.apiKey
```

#### External Secrets Support

n8n supports external secret vaults:
```javascript
// Reference secrets from vault
{{ $secrets.vault.mySecretName }}
{{ $secrets.infisical.mySecretName }}
{{ $secrets.awsSecretsManager.mySecretName }}
```

#### Secure Credential Storage

Use `_FILE` suffix for Docker/Kubernetes secrets:
```yaml
DB_POSTGRESDB_PASSWORD_FILE=/path/to/secret
CREDENTIALS_OVERWRITE_DATA_FILE=/path/to/credentials
```

#### Verification Steps
- [ ] No hardcoded API keys, tokens, passwords
- [ ] Credentials stored in n8n credential system
- [ ] External secrets used for sensitive data
- [ ] `_FILE` suffix used for Docker/K8s secrets

### 3. Input Validation

#### Validate Webhook Input

```javascript
// In Code node after Webhook
const input = $input.first().json;

// Validate required fields
if (!input.email || !input.userId) {
  throw new Error('Missing required fields');
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(input.email)) {
  throw new Error('Invalid email format');
}

// Validate numeric ranges
if (input.amount < 0 || input.amount > 10000) {
  throw new Error('Amount out of range');
}

return $input.all();
```

#### Use IF Node for Validation

```
Webhook → IF (validate input) → Process
                            ↘ → Error Response
```

#### Verification Steps
- [ ] All webhook inputs validated
- [ ] Required fields checked
- [ ] Data types verified
- [ ] Ranges and formats validated
- [ ] Invalid input returns proper error response

### 4. Environment Variable Access

#### Block Env Access in Production

```bash
# Block access to env vars in Code node (default in v2.0+)
N8N_BLOCK_ENV_ACCESS_IN_NODE=true
```

**Migration path:** If workflows need env vars, use credentials instead.

#### Verification Steps
- [ ] `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` in production
- [ ] Sensitive data moved to credentials
- [ ] No `process.env` in Code nodes

### 5. Error Message Security

#### Don't Expose Internal Details

```javascript
// WRONG: Exposes internal error
catch (error) {
  return { error: error.message, stack: error.stack };
}

// CORRECT: Generic error for users
catch (error) {
  console.error('Internal error:', error);
  return { error: 'An error occurred. Please try again.' };
}
```

#### Webhook Error Responses

```javascript
// Don't reveal system information
// WRONG
return { error: 'Database connection failed: postgres://user:pass@...' };

// CORRECT
return { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' };
```

#### Verification Steps
- [ ] Error messages don't expose credentials
- [ ] No stack traces in responses
- [ ] No database connection strings in errors
- [ ] Internal errors logged, not returned

### 6. Rate Limiting

#### Protect Webhooks from Abuse

```
Webhook → Code (rate check) → IF (allowed) → Process
                                          ↘ → 429 Response
```

#### Rate Limiting in Code Node

```javascript
const clientIp = $input.first().json.headers['x-forwarded-for'];
const key = `rate:${clientIp}`;

// Check rate limit (using external store)
const count = await $credentials.redis.get(key) || 0;

if (count > 100) {  // 100 requests per window
  throw new Error('Rate limit exceeded');
}

// Increment counter
await $credentials.redis.incr(key);
await $credentials.redis.expire(key, 60);  // 1 minute window

return $input.all();
```

#### Verification Steps
- [ ] Public webhooks have rate limiting
- [ ] Expensive operations have stricter limits
- [ ] Rate limit responses return 429 status

### 7. Credential Rotation

#### Regular Rotation Schedule

| Credential Type | Rotation Frequency |
|-----------------|-------------------|
| API Keys | Every 90 days |
| OAuth Tokens | Auto-refresh |
| Database Passwords | Every 90 days |
| Webhook Secrets | Every 90 days |

#### Verification Steps
- [ ] Credential rotation schedule defined
- [ ] OAuth tokens auto-refresh enabled
- [ ] Old credentials revoked after rotation

### 8. HTTPS and TLS

#### Enforce HTTPS

```bash
# Force HTTPS for webhooks
N8N_PROTOCOL=https
N8N_SSL_KEY=/path/to/key.pem
N8N_SSL_CERT=/path/to/cert.pem
```

#### Verification Steps
- [ ] HTTPS enabled in production
- [ ] Valid SSL certificates
- [ ] HTTP redirects to HTTPS

## Pre-Production Security Checklist

Before activating any workflow in production:

### Webhooks
- [ ] Authentication enabled (not "None")
- [ ] HTTPS enforced
- [ ] Input validation in place
- [ ] Rate limiting configured
- [ ] Error responses don't leak data

### Credentials
- [ ] No hardcoded secrets
- [ ] All credentials in n8n system
- [ ] External secrets for sensitive data
- [ ] Rotation schedule defined

### Code Nodes
- [ ] No `process.env` access
- [ ] Input validated
- [ ] Errors caught and sanitized
- [ ] No sensitive data in logs

### Error Handling
- [ ] Error workflow configured
- [ ] Notifications don't include secrets
- [ ] Generic errors for external responses

### Infrastructure
- [ ] `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`
- [ ] Database credentials via `_FILE` suffix
- [ ] Logs don't contain sensitive data

## Security Incident Response

If credentials are exposed:

1. **Immediately revoke** the exposed credential
2. **Generate new** credentials
3. **Update** n8n credential in all workflows
4. **Audit** git history for exposed secrets
5. **Review** logs for unauthorized access
6. **Document** incident and prevention steps

---

**Remember**: Security is not optional. One exposed credential can compromise your entire automation infrastructure.
