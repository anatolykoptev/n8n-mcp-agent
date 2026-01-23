---
name: monitor-executions
description: Monitor n8n workflow executions. Wait for completion, extract output, get errors, list failed runs. Use for execution tracking and debugging.
---

# Monitor Executions Skill

This skill provides execution monitoring and data extraction for n8n workflows.

## When to Use

- Waiting for workflow execution to complete
- Extracting output data from executions
- Debugging failed executions
- Monitoring execution patterns
- Batch cleanup of old executions

## Core Methods

### Wait for Completion

Wait for an execution to finish with polling:

```typescript
const result = await executionHelper.waitForCompletion(
  executionId,    // Execution ID (number)
  60,             // Timeout in seconds (default: 60)
  1               // Poll interval in seconds (default: 1)
)
```

Result structure:
```typescript
interface WaitResult {
  success: boolean
  executionId: string
  status: 'success' | 'error' | 'waiting' | 'timeout'
  data?: unknown        // Output data if successful
  error?: string        // Error message if failed
  duration?: number     // Execution duration in seconds
}
```

### Extract Output Data

Get output from the last node of an execution:

```typescript
const output = await executionHelper.getOutput(executionId)
```

Result structure:
```typescript
interface ExecutionOutput {
  success: boolean
  data?: unknown       // Output data from last node
  error?: string
  nodeName?: string    // Name of the last executed node
}
```

### Get Error Message

Extract error message from a failed execution:

```typescript
const errorMessage = await executionHelper.getError(executionId)
// Returns: string | null
```

### Check Execution Status

```typescript
// Check if still running
const running = await executionHelper.isRunning(executionId)
// Returns: boolean

// Get status string
const status = await executionHelper.getStatus(executionId)
// Returns: 'success' | 'error' | 'waiting' | 'unknown'
```

## Listing Executions

### List Failed Executions

```typescript
const failures = await executionHelper.listFailed(
  workflowId,   // Optional: filter by workflow
  10            // Limit (default: 10)
)
```

Returns:
```typescript
Array<{
  id: number
  workflowId: number
  startedAt: string
  error?: string
}>
```

### List Running Executions

```typescript
const running = await executionHelper.listRunning(
  workflowId,   // Optional: filter by workflow
  10            // Limit (default: 10)
)
```

Returns:
```typescript
Array<{
  id: number
  workflowId: number
  startedAt: string
}>
```

## Batch Operations

### Delete Multiple Executions

```typescript
const result = await executionHelper.deleteMany({
  workflowId: 'xxx',        // Optional: filter by workflow
  status: 'error',          // Optional: 'error' | 'success' | 'waiting'
  limit: 100                // Max to delete (default: 100)
})
```

Returns:
```typescript
interface BatchDeleteResult {
  success: boolean
  deletedCount?: number
  error?: string
}
```

## Usage Examples

### Complete Execution Workflow

```typescript
// Start workflow execution (via webhook or other trigger)
const executionId = startWorkflow()

// Wait for completion
const result = await executionHelper.waitForCompletion(executionId, 120)

if (result.status === 'success') {
  console.log('Workflow completed successfully')
  console.log('Output:', result.data)
  console.log('Duration:', result.duration, 'seconds')
} else if (result.status === 'error') {
  console.error('Workflow failed:', result.error)
  // Get more details
  const fullError = await executionHelper.getError(executionId)
} else if (result.status === 'timeout') {
  console.warn('Workflow still running after timeout')
  // Execution continues in background
}
```

### Debug Recent Failures

```typescript
// Get last 5 failures
const failures = await executionHelper.listFailed(workflowId, 5)

for (const failure of failures) {
  console.log(`Execution ${failure.id} failed at ${failure.startedAt}`)

  // Get detailed error
  const error = await executionHelper.getError(failure.id)
  console.log('Error:', error)

  // Get output to see what data was processed
  const output = await executionHelper.getOutput(failure.id)
  console.log('Last node:', output.nodeName)
  console.log('Data:', output.data)
}
```

### Cleanup Old Executions

```typescript
// Delete all failed executions older than limit
const cleaned = await executionHelper.deleteMany({
  status: 'error',
  limit: 1000
})

if (cleaned.success) {
  console.log(`Deleted ${cleaned.deletedCount} failed executions`)
}
```

### Monitor Running Executions

```typescript
// Check for stuck executions
const running = await executionHelper.listRunning()

for (const exec of running) {
  const startTime = new Date(exec.startedAt)
  const runningTime = (Date.now() - startTime.getTime()) / 1000

  if (runningTime > 3600) { // Running for over an hour
    console.warn(`Execution ${exec.id} running for ${runningTime}s - may be stuck`)
  }
}
```

## Best Practices

1. **Set Appropriate Timeouts**: Match timeout to expected execution time
2. **Handle All Status Cases**: success, error, timeout, waiting
3. **Clean Up Old Executions**: Delete old failures to save storage
4. **Monitor Patterns**: Track failure rates over time
5. **Log Execution IDs**: Keep audit trail of executions
6. **Use Polling Wisely**: Don't poll too frequently (1-5 second intervals)

## Common Issues

### Execution Not Found
- Execution was deleted
- Wrong execution ID
- Execution hasn't started yet

### Timeout Without Completion
- Workflow takes longer than expected
- Workflow is stuck/infinite loop
- External service is slow

### No Output Data
- Workflow has no nodes
- Last node produced no output
- Execution failed before output node
