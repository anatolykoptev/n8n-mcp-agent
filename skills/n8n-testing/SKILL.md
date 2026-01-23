---
name: n8n-testing
description: Testing workflow for n8n. Use before activating workflows in production. Covers manual testing, data pinning, execution modes, and validation.
---

# n8n Testing Skill

This skill ensures workflows are thoroughly tested before production activation.

## When to Activate

- Before activating any workflow
- After making changes to existing workflows
- When debugging failed executions
- Before deploying to production environment

## Execution Modes

### Manual Execution (Development)

Use for testing during development:
- Run workflows with "Execute Workflow" button
- Keep workflow **Inactive** while developing
- Iterate and test node by node
- See data transformations in real-time

### Production Execution (Live)

Workflows run automatically when:
- Set to **Active**
- Triggered by webhooks, schedules, or events

**Rule**: Never develop on Active workflows.

## Testing Workflow

### 1. Data Pinning

Pin data to ensure consistent testing:

**Benefits:**
- Avoid repeated requests to external systems
- Save API rate limits during development
- Consistent data for all test runs
- No need to trigger external events

**How to Pin:**
1. Execute node once to get real data
2. Click "Pin" on node output
3. Future executions use pinned data

**Limitations:**
- Only for nodes with single main output
- Not available in production executions
- Development feature only

### 2. Node-by-Node Testing

Test each node individually:

```
Step 1: Test Trigger node
        ↓ Verify output
Step 2: Test Processing node
        ↓ Verify transformation
Step 3: Test Output node
        ↓ Verify final result
```

### 3. Test with Sample Data

Create test data in Code node:

```javascript
// Test data for development
return [
  {
    json: {
      id: 'test-001',
      email: 'test@example.com',
      amount: 100,
      status: 'pending'
    }
  },
  {
    json: {
      id: 'test-002',
      email: 'invalid-email',  // Test validation
      amount: -50,             // Test edge case
      status: 'active'
    }
  }
];
```

### 4. Edge Case Testing

Test these scenarios:

| Scenario | Test Data | Expected |
|----------|-----------|----------|
| Empty input | `[]` | Graceful handling |
| Null values | `{ email: null }` | Validation error |
| Large payload | 1000+ items | No timeout |
| Invalid format | `{ email: 'not-email' }` | Rejection |
| Missing fields | `{ id: '1' }` | Validation error |
| Special characters | `{ name: '<script>' }` | Sanitized |

### 5. Error Path Testing

Verify error handling works:

```
1. Disable external service (or use wrong credentials)
2. Execute workflow
3. Verify error workflow triggers
4. Check error notification contains useful info
5. Verify no sensitive data in error message
```

## Testing Checklist

### Before First Activation

- [ ] **Trigger tested**: Webhook responds, schedule fires
- [ ] **Input validation**: Invalid data rejected
- [ ] **Happy path**: Normal data processed correctly
- [ ] **Edge cases**: Empty, null, large data handled
- [ ] **Error handling**: Errors caught and reported
- [ ] **Output verified**: Correct data format and values

### Webhook Testing

```bash
# Test webhook locally
curl -X POST https://your-n8n.com/webhook/test-path \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"test": "data"}'
```

Verify:
- [ ] Returns correct status code
- [ ] Response format is correct
- [ ] Auth required and working
- [ ] Invalid auth returns 401/403

### Integration Testing

For workflows with multiple services:

```
1. Test each integration separately
2. Verify credential works
3. Test API response handling
4. Check rate limits respected
5. Verify data transformation
```

### Load Testing

Before production with high volume:

```
1. Test with batch of 100 items
2. Monitor execution time
3. Check memory usage
4. Verify no timeouts
5. Test rate limiting behavior
```

## Debugging Failed Executions

### Using Execution History

1. Go to **Executions** tab
2. Find failed execution (red)
3. Click to see exact failure point
4. View input/output at each node
5. Identify error message

### Debug in Editor (Cloud/Enterprise)

1. Select failed execution
2. Click "Debug in editor"
3. Pinned data loads automatically
4. Re-run to reproduce issue

### Common Debug Patterns

#### Authentication Failures
```
Check:
- Credential still valid?
- Token expired?
- Permissions changed?
- API key rotated?
```

#### Data Format Errors
```
Check:
- Input structure matches expected?
- Required fields present?
- Types correct (string vs number)?
- Null handling in place?
```

#### Timeout Errors
```
Check:
- External API slow?
- Too much data?
- Infinite loop?
- Network issues?
```

## CLI Testing

### Execute Workflow by ID

```bash
# Run specific workflow
n8n execute --id <workflow-id>

# Useful for:
# - Automated testing
# - CI/CD pipelines
# - Scheduled test runs
```

## Test Environment Setup

### Separate Test Instance

```yaml
# docker-compose.test.yml
services:
  n8n-test:
    image: n8nio/n8n
    environment:
      - N8N_HOST=test.n8n.local
      - DB_TYPE=sqlite
    ports:
      - "5679:5678"
```

### Test Credentials

Create separate credentials for testing:
- Use sandbox/test API keys
- Separate test database
- Mock external services when possible

## Pre-Activation Checklist

Before setting workflow to **Active**:

### Functionality
- [ ] All nodes execute without error
- [ ] Output data is correct format
- [ ] Transformations work as expected
- [ ] External integrations respond correctly

### Error Handling
- [ ] Error workflow configured
- [ ] Error notifications working
- [ ] Retry logic in place (if needed)
- [ ] Fallback behavior defined

### Security
- [ ] Authentication on webhooks
- [ ] Input validation in place
- [ ] No sensitive data in logs
- [ ] Credentials not hardcoded

### Performance
- [ ] Tested with realistic data volume
- [ ] No timeouts under load
- [ ] Rate limits respected
- [ ] Memory usage acceptable

### Documentation
- [ ] Workflow description filled
- [ ] Node notes for complex logic
- [ ] Error handling documented
- [ ] Dependencies listed

## Rollback Plan

Before activation, prepare rollback:

1. **Note current version** in workflow history
2. **Test deactivation** works quickly
3. **Have rollback workflow** ready if needed
4. **Monitor first hours** after activation

---

**Remember**: Every minute spent testing saves hours of debugging production issues.
