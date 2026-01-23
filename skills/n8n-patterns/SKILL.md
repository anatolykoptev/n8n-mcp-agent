---
name: n8n-patterns
description: Common n8n workflow patterns. Use when designing workflows to apply proven patterns for error handling, data processing, integrations, and flow control.
---

# n8n Patterns Skill

This skill provides reusable patterns for common n8n workflow scenarios.

## Flow Control Patterns

### 1. Conditional Branching (IF Node)

```
Trigger → IF (condition) → True Path
                       ↘ → False Path
```

**Use for:**
- Route based on data values
- Filter valid/invalid items
- A/B testing logic

### 2. Multi-Way Branching (Switch Node)

```
Trigger → Switch (status) → "pending" → Process Pending
                        → "active"  → Process Active
                        → "closed"  → Process Closed
                        → default   → Handle Unknown
```

**Use for:**
- Multiple condition routing
- Status-based processing
- Type-based handlers

### 3. Parallel Processing

```
Trigger → Branch A ↘
       → Branch B  → Merge → Continue
       → Branch C ↗
```

**Use for:**
- Independent API calls
- Multi-system updates
- Parallel data fetching

## Data Processing Patterns

### 4. Batch Processing (Loop Over Items)

```json
{
  "nodes": [
    {
      "name": "Loop Over Items",
      "type": "n8n-nodes-base.splitInBatches",
      "parameters": {
        "batchSize": 10
      }
    }
  ]
}
```

**Pattern:**
```
Fetch All → Loop Over Items → Process Batch → Wait → Loop Back
                           ↘ Done → Continue
```

**Use for:**
- API rate limit handling
- Large dataset processing
- Memory-efficient operations

### 5. Data Merging

```json
{
  "nodes": [
    {
      "name": "Merge",
      "type": "n8n-nodes-base.merge",
      "parameters": {
        "mode": "combine",
        "mergeByFields": {
          "values": [{"field1": "id", "field2": "id"}]
        }
      }
    }
  ]
}
```

**Merge Modes:**
| Mode | Description |
|------|-------------|
| Append | Combine all items |
| Combine | Match by fields |
| Choose Branch | Pick one input |
| Multiplex | Create all combinations |

### 6. Data Transformation (Code Node)

```javascript
// Transform array of items
return $input.all().map(item => ({
  json: {
    id: item.json.id,
    fullName: `${item.json.firstName} ${item.json.lastName}`,
    email: item.json.email.toLowerCase(),
    createdAt: new Date().toISOString()
  }
}));
```

## Error Handling Patterns

### 7. Error Workflow

```json
{
  "nodes": [
    {
      "name": "Error Trigger",
      "type": "n8n-nodes-base.errorTrigger"
    },
    {
      "name": "Slack Notification",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#alerts",
        "text": "Workflow {{$json.workflow.name}} failed: {{$json.execution.url}}"
      }
    }
  ]
}
```

**Setup:**
1. Create error workflow with Error Trigger
2. In main workflow: Settings → Error Workflow → Select

### 8. Try/Catch Pattern

```
Risky Node (Continue on Fail) → IF (has error) → Error Handler
                                             ↘ → Success Path
```

**Code:**
```javascript
// Check for error in previous node
if ($input.first().json.error) {
  // Handle error
  return [{ json: { status: 'failed', reason: $input.first().json.error.message } }];
}
// Continue normally
return $input.all();
```

### 9. Retry with Exponential Backoff

```
Try → On Error → Code (calc delay) → Wait → Retry Counter → IF (< max) → Try
                                                                      ↘ → Fail
```

**Delay Calculation:**
```javascript
const attempt = $input.first().json.attempt || 1;
const baseDelay = 1000; // 1 second
const delay = Math.pow(2, attempt) * baseDelay;
const jitter = delay * 0.2 * Math.random();

return [{
  json: {
    attempt: attempt + 1,
    delayMs: delay + jitter
  }
}];
```

## Integration Patterns

### 10. Webhook → Process → Respond

```
Webhook → Validate → Process → Respond to Webhook
                  ↘ Invalid → Error Response
```

**Fast Response Pattern:**
```
Webhook → Respond Immediately (202 Accepted)
       → Continue Processing (async)
```

### 11. Schedule → Fetch → Sync

```
Schedule Trigger → Fetch Source Data
                → Compare with Target
                → Upsert Changes
                → Log Summary
```

**Use for:**
- Database synchronization
- Data pipelines
- Regular imports

### 12. Event → Notify

```
Webhook (event) → Parse Event → Switch (type)
                             → "order.created" → Slack
                             → "payment.failed" → Email + Slack
                             → "user.signup" → Welcome Email
```

## API Patterns

### 13. Rate-Limited API Calls

```json
{
  "nodes": [
    {"name": "Loop Over Items", "type": "n8n-nodes-base.splitInBatches", "parameters": {"batchSize": 10}},
    {"name": "API Call", "type": "n8n-nodes-base.httpRequest"},
    {"name": "Wait", "type": "n8n-nodes-base.wait", "parameters": {"unit": "seconds", "amount": 1}}
  ],
  "connections": {
    "Loop Over Items": {"main": [[{"node": "API Call"}]]},
    "API Call": {"main": [[{"node": "Wait"}]]},
    "Wait": {"main": [[{"node": "Loop Over Items"}]]}
  }
}
```

### 14. Pagination Pattern

```javascript
// In Code node for pagination
const allResults = [];
let page = 1;
let hasMore = true;

while (hasMore) {
  const response = await $http.get(`https://api.example.com/items?page=${page}`);
  allResults.push(...response.data.items);
  hasMore = response.data.hasNextPage;
  page++;
}

return allResults.map(item => ({ json: item }));
```

### 15. Two-Webhook Polling (Long Operations)

**Start Webhook:**
```
Webhook (POST /start) → Generate Job ID → Start Background Process
                      → Respond with Job ID
```

**Poll Webhook:**
```
Webhook (GET /status/:jobId) → Check Status → IF (complete)
                                            → Return Results
                                            ↘ Return "pending"
```

## Sub-Workflow Patterns

### 16. Modular Sub-Workflows

**Parent:**
```
Trigger → Execute Sub-workflow (Validation)
       → Execute Sub-workflow (Processing)
       → Execute Sub-workflow (Notification)
```

**Benefits:**
- Reusable validation logic
- Easier testing
- Better organization
- Sub-executions don't count toward limits

### 17. Async Sub-Workflow

```
Trigger → Execute Sub-workflow (Wait: false)
       → Continue immediately
       → Sub-workflow runs in background
```

**Use for:**
- Fire-and-forget operations
- Background processing
- Non-blocking notifications

## Data Validation Patterns

### 18. Input Validation Node

```javascript
// Validation Code node
const item = $input.first().json;
const errors = [];

// Required fields
if (!item.email) errors.push('email is required');
if (!item.name) errors.push('name is required');

// Format validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (item.email && !emailRegex.test(item.email)) {
  errors.push('invalid email format');
}

// Range validation
if (item.amount && (item.amount < 0 || item.amount > 10000)) {
  errors.push('amount must be between 0 and 10000');
}

if (errors.length > 0) {
  return [{ json: { valid: false, errors } }];
}

return [{ json: { valid: true, data: item } }];
```

### 19. Schema Validation

```javascript
// JSON Schema validation
const schema = {
  type: 'object',
  required: ['email', 'name'],
  properties: {
    email: { type: 'string', format: 'email' },
    name: { type: 'string', minLength: 1 },
    age: { type: 'integer', minimum: 0, maximum: 150 }
  }
};

// Validate input against schema
// (requires external validator library or custom implementation)
```

## Caching Pattern

### 20. Static Data Caching

```javascript
// Use staticData for caching in Code node
const cache = $getWorkflowStaticData('global');

// Check cache
if (cache.data && cache.timestamp > Date.now() - 3600000) {
  return [{ json: cache.data }];
}

// Fetch fresh data
const response = await $http.get('https://api.example.com/data');

// Update cache
cache.data = response.data;
cache.timestamp = Date.now();

return [{ json: response.data }];
```

## Pattern Selection Guide

| Scenario | Pattern |
|----------|---------|
| Process large dataset | Batch Processing (#4) |
| Handle API rate limits | Rate-Limited Calls (#13) |
| Multiple independent calls | Parallel Processing (#3) |
| Route by condition | IF/Switch (#1, #2) |
| Handle errors gracefully | Error Workflow (#7) |
| Retry failed operations | Exponential Backoff (#9) |
| Long-running operations | Two-Webhook Polling (#15) |
| Reusable logic | Sub-Workflows (#16) |
| Fast webhook response | Fast Response (#10) |
| Data synchronization | Schedule Sync (#11) |

---

**Remember**: Use proven patterns instead of reinventing. Each pattern has been battle-tested in production workflows.
