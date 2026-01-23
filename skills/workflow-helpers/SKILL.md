---
name: workflow-helpers
description: Advanced n8n workflow manipulation. Extract webhook URLs, duplicate workflows, add nodes, create with triggers. Use for workflow management automation.
---

# Workflow Helpers Skill

This skill provides advanced workflow manipulation capabilities for n8n.

## When to Use

- Getting webhook URLs from workflows
- Duplicating workflows (with credential stripping for sharing)
- Adding nodes to existing workflows
- Creating workflows with specific triggers
- Getting workflow statistics

## Core Methods

### Get Webhook URL

Extract the webhook URL from a workflow:

```typescript
const result = await workflowHelper.getWebhookUrl(workflowId)
```

Result:
```typescript
interface WebhookUrlResult {
  success: boolean
  url?: string      // Full webhook URL
  path?: string     // Webhook path
  method?: string   // HTTP method (GET, POST, etc.)
  error?: string
}
```

Example:
```typescript
const webhook = await workflowHelper.getWebhookUrl('123')

if (webhook.success) {
  console.log(`URL: ${webhook.url}`)
  // https://n8n.example.com/webhook/my-path
  console.log(`Method: ${webhook.method}`)
  // POST
}
```

### Duplicate Workflow

Create a copy of a workflow, optionally stripping credentials:

```typescript
const result = await workflowHelper.duplicate(
  sourceId,         // Source workflow ID
  newName,          // Name for the copy
  stripCredentials  // Remove credentials (default: true)
)
```

Result:
```typescript
interface DuplicateResult {
  success: boolean
  workflowId?: string   // New workflow ID
  name?: string
  error?: string
}
```

Example:
```typescript
// Create shareable copy (no credentials)
const copy = await workflowHelper.duplicate('123', 'My Workflow - Copy', true)

if (copy.success) {
  console.log(`Created workflow: ${copy.workflowId}`)
}

// Create working copy (keep credentials)
const workingCopy = await workflowHelper.duplicate('123', 'My Workflow - Dev', false)
```

### Add Node to Workflow

Add a new node to an existing workflow:

```typescript
const result = await workflowHelper.addNode(workflowId, {
  name: 'My Node',
  type: 'n8n-nodes-base.httpRequest',
  position: [450, 300],
  parameters: {
    url: 'https://api.example.com',
    method: 'GET'
  },
  credentials: {
    httpHeaderAuth: { id: 'cred-id', name: 'My Auth' }
  }
})
```

Result:
```typescript
interface AddNodeResult {
  success: boolean
  nodeName?: string
  error?: string
}
```

### Create Workflow with Trigger

Create a new workflow with a pre-configured trigger:

```typescript
const result = await workflowHelper.createWithTrigger(
  name,           // Workflow name
  triggerType,    // 'manual' | 'webhook' | 'schedule'
  triggerConfig   // Optional trigger configuration
)
```

Trigger types:

#### Manual Trigger
```typescript
await workflowHelper.createWithTrigger(
  'My Manual Workflow',
  'manual'
)
```

#### Webhook Trigger
```typescript
await workflowHelper.createWithTrigger(
  'My Webhook Workflow',
  'webhook',
  {
    path: 'my-webhook',
    method: 'POST'
  }
)
```

#### Schedule Trigger
```typescript
await workflowHelper.createWithTrigger(
  'My Scheduled Workflow',
  'schedule',
  {
    interval: 60  // Every 60 minutes
  }
)
```

### Get Workflow Statistics

Get statistics about a workflow:

```typescript
const stats = await workflowHelper.getStats(workflowId)
```

Returns:
```typescript
{
  nodeCount: number       // Number of nodes
  isActive: boolean       // Workflow active status
  hasWebhook: boolean     // Contains webhook node
  hasCredentials: boolean // Contains credential-using nodes
  triggerType?: string    // Type of trigger node
}
```

## Usage Examples

### Get Webhook for Integration

```typescript
// Get webhook URL to share with external service
const webhook = await workflowHelper.getWebhookUrl('my-workflow-id')

if (webhook.success) {
  console.log('Configure your service to POST to:')
  console.log(webhook.url)
} else {
  console.error('No webhook found in workflow')
}
```

### Create Template Copy

```typescript
// Duplicate a template workflow for a new project
const result = await workflowHelper.duplicate(
  'template-workflow-id',
  'Project XYZ - Slack Notifications',
  true  // Strip credentials - user will add their own
)

if (result.success) {
  console.log(`Created workflow: ${result.workflowId}`)
  console.log('Remember to configure credentials!')
}
```

### Build Workflow Programmatically

```typescript
// Create base workflow with webhook
const workflow = await workflowHelper.createWithTrigger(
  'Customer Feedback Processor',
  'webhook',
  { path: 'feedback', method: 'POST' }
)

if (workflow.success) {
  // Add processing node
  await workflowHelper.addNode(workflow.workflowId, {
    name: 'Process Feedback',
    type: 'n8n-nodes-base.function',
    position: [450, 300],
    parameters: {
      functionCode: `
        const feedback = items[0].json;
        return [{
          json: {
            sentiment: feedback.rating > 3 ? 'positive' : 'negative',
            ...feedback
          }
        }];
      `
    }
  })

  // Add notification node
  await workflowHelper.addNode(workflow.workflowId, {
    name: 'Send to Slack',
    type: 'n8n-nodes-base.slack',
    position: [650, 300],
    parameters: {
      channel: '#feedback',
      text: '={{ $json.sentiment }}: {{ $json.message }}'
    }
  })
}
```

### Workflow Audit

```typescript
// Audit all workflows for security
const workflows = await client.listWorkflows()

for (const wf of workflows.data) {
  const stats = await workflowHelper.getStats(String(wf.id))

  console.log(`\n${wf.name}:`)
  console.log(`  Nodes: ${stats.nodeCount}`)
  console.log(`  Active: ${stats.isActive}`)
  console.log(`  Has Webhook: ${stats.hasWebhook}`)
  console.log(`  Uses Credentials: ${stats.hasCredentials}`)

  if (stats.hasWebhook && stats.isActive) {
    const webhook = await workflowHelper.getWebhookUrl(String(wf.id))
    console.log(`  Webhook URL: ${webhook.url}`)
  }
}
```

## Node Types Reference

Common node types for `addNode`:

| Purpose | Node Type |
|---------|-----------|
| HTTP Request | n8n-nodes-base.httpRequest |
| Function (JS) | n8n-nodes-base.function |
| Set Data | n8n-nodes-base.set |
| IF Condition | n8n-nodes-base.if |
| Switch | n8n-nodes-base.switch |
| Merge | n8n-nodes-base.merge |
| Split In Batches | n8n-nodes-base.splitInBatches |
| Slack | n8n-nodes-base.slack |
| Telegram | n8n-nodes-base.telegram |
| PostgreSQL | n8n-nodes-base.postgres |
| MySQL | n8n-nodes-base.mySql |

## Best Practices

1. **Strip Credentials for Sharing**: Always use `stripCredentials: true` when duplicating for export
2. **Use Consistent Positioning**: Keep nodes aligned (increment X by 200, Y by 200)
3. **Name Nodes Clearly**: Use descriptive names for each node
4. **Test After Changes**: Verify workflow after adding nodes
5. **Document Webhooks**: Keep track of exposed webhook URLs
