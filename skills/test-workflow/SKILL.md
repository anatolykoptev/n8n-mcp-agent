---
name: test-workflow
description: Universal n8n workflow testing via webhook or sub-workflow pattern
version: 2.1.0
author: piternow
tags: [n8n, workflow, test, webhook, sub-workflow, automation, ci-cd]
---

# Test Workflow Skill

Universal testing solution for n8n workflows. Supports two patterns:
1. **Direct Webhook** - for workflows with Webhook trigger
2. **Test Runner** - for workflows with Execute Sub-workflow Trigger

## Quick Start

### 1. Configure Environment

Create or update `.env` in the n8n-mcp-agent root:

```bash
N8N_URL=https://your-n8n-instance.com
N8N_API_KEY=your-api-key
TEST_RUNNER_PATH=test-runner  # optional, default: test-runner
```

### 2. Setup Test Runner (one-time)

```bash
./scripts/setup-test-runner.sh
```

This creates a universal Test Runner workflow on your n8n instance.

### 3. Test Workflows

```bash
# Pattern 1: Direct webhook (for workflows with Webhook trigger)
./scripts/test-workflow.sh <workflow_id>

# Pattern 2: Test Runner (for workflows with Execute Sub-workflow Trigger)
./scripts/test-workflow.sh --runner <workflow_id>
```

## Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup-test-runner.sh` | Create Test Runner workflow | **First time setup** on new n8n instance |
| `test-workflow.sh` | Test any workflow | **Always** - main testing script |
| `add-subworkflow-trigger.sh` | Add testable trigger to workflow | **If workflow has Manual/Schedule Trigger** |
| `create-sample-workflow.sh` | Create sample testable workflow | For testing the setup |

## AI Agent Decision Flow

```
User asks: "Test workflow <ID>"
           │
           ▼
┌─────────────────────────────┐
│ 1. Get workflow details     │
│    curl .../workflows/<ID>  │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 2. Check trigger type       │
└─────────────┬───────────────┘
              │
    ┌─────────┴─────────┬────────────────┬──────────────────┐
    │                   │                │                  │
    ▼                   ▼                ▼                  ▼
┌────────┐      ┌──────────────┐  ┌─────────────┐   ┌──────────────┐
│Webhook │      │ExecuteWorkflow│  │ManualTrigger│   │ScheduleTrigger│
│Trigger │      │Trigger        │  │             │   │              │
└───┬────┘      └──────┬───────┘  └──────┬──────┘   └──────┬───────┘
    │                  │                 │                  │
    ▼                  ▼                 ▼                  ▼
┌────────┐      ┌──────────────┐  ┌─────────────────────────────┐
│Pattern1│      │ Pattern 2    │  │ RUN: add-subworkflow-       │
│Direct  │      │ Test Runner  │  │      trigger.sh <ID>        │
└───┬────┘      └──────┬───────┘  │ Then use Pattern 2          │
    │                  │          └──────────────┬──────────────┘
    ▼                  ▼                         │
┌────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────┐
│ 3. Run test                 │
│    test-workflow.sh ...     │
└─────────────────────────────┘
```

### Script Selection Rules

| Workflow Trigger | Script to Run First | Test Command |
|-----------------|---------------------|--------------|
| `n8n-nodes-base.webhook` | None | `test-workflow.sh <ID>` |
| `n8n-nodes-base.executeWorkflowTrigger` | None | `test-workflow.sh --runner <ID>` |
| `n8n-nodes-base.manualTrigger` | `add-subworkflow-trigger.sh <ID>` | `test-workflow.sh --runner <ID>` |
| `n8n-nodes-base.scheduleTrigger` | `add-subworkflow-trigger.sh <ID>` | `test-workflow.sh --runner <ID>` |

## Usage Examples

### Test workflow with Webhook trigger

```bash
# Auto-detect webhook path from workflow
./scripts/test-workflow.sh p02YJcCILcg5p3OQ

# With custom data
./scripts/test-workflow.sh p02YJcCILcg5p3OQ '{"user": "test", "action": "create"}'

# Direct webhook path
./scripts/test-workflow.sh --path my-webhook-path
```

### Test workflow with Execute Sub-workflow Trigger

```bash
# Via Test Runner
./scripts/test-workflow.sh --runner BFeLmDYJ7DlbwQMM

# With input data
./scripts/test-workflow.sh --runner BFeLmDYJ7DlbwQMM '{"input": "data"}'
```

### Setup commands

```bash
# Create Test Runner (first time setup)
./scripts/setup-test-runner.sh

# Recreate Test Runner (force)
./scripts/setup-test-runner.sh --force

# Create sample workflow for testing
./scripts/create-sample-workflow.sh

# Create sample with custom name
./scripts/create-sample-workflow.sh "My Test Workflow"
```

## Architecture

### Pattern 1: Direct Webhook

```
┌─────────────────┐
│  Workflow ID    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Get webhook URL │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Active? │
    └────┬────┘
    NO   │   YES
    │    │    │
    ▼    │    ▼
┌──────┐ │ ┌──────────────┐
│Activ.│─┘ │ Call webhook │
└──────┘   └──────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Get execution  │
         └────────────────┘
```

### Pattern 2: Test Runner (Sub-workflow)

```
┌─────────────────────────────────────────────────┐
│           Test Runner Workflow                  │
│  ┌──────────┐    ┌────────────────────┐         │
│  │ Webhook  │───▶│ Execute Sub-workflow│        │
│  │ /test-   │    │ (dynamic by ID)     │        │
│  │  runner  │    └─────────┬──────────┘         │
│  └──────────┘              │                    │
│                 ┌──────────▼──────────┐         │
│                 │ Respond to Webhook  │         │
│                 └─────────────────────┘         │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│           Target Workflow                       │
│  ┌──────────────────────┐    ┌─────────────┐    │
│  │ Execute Sub-workflow │───▶│ Your Logic  │    │
│  │ Trigger              │    │ ...         │    │
│  └──────────────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────┘
```

## Which Pattern to Use?

| Trigger Type | Recommended Pattern |
|--------------|---------------------|
| Webhook | Pattern 1 (Direct) |
| Execute Sub-workflow Trigger | Pattern 2 (Test Runner) |
| Manual Trigger | **Convert** → add Execute Sub-workflow Trigger |
| Schedule Trigger | **Add** Execute Sub-workflow Trigger as alternative |

## Converting Manual Trigger Workflows

**IMPORTANT FOR AI AGENTS:** If workflow has `Manual Trigger` or `Schedule Trigger`, it cannot be tested directly. You MUST add an `Execute Sub-workflow Trigger` node.

### Step-by-step Conversion

1. **Get current workflow**
```bash
curl -H "X-N8N-API-KEY: $API_KEY" "$N8N_URL/api/v1/workflows/<id>"
```

2. **Add Execute Sub-workflow Trigger node**
```json
{
  "parameters": {},
  "id": "subworkflow-trigger",
  "name": "Execute Sub-workflow Trigger",
  "type": "n8n-nodes-base.executeWorkflowTrigger",
  "typeVersion": 1,
  "position": [250, 500]
}
```

3. **Connect to existing flow**
- Find the first node after Manual Trigger
- Add connection from new trigger to that node
- Keep Manual Trigger for manual runs

4. **Update workflow via API**
```bash
curl -X PUT -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "...", "nodes": [...], "connections": {...}, "settings": {...}}' \
  "$N8N_URL/api/v1/workflows/<id>"
```

**Or use the script:**
```bash
./scripts/add-subworkflow-trigger.sh <workflow_id> [target_node]
```

### Example: Before and After

**Before (not testable):**
```
Manual Trigger → Shopify → AI Agent → ...
```

**After (testable via Test Runner):**
```
Manual Trigger ─────────────────┐
                                ├→ Shopify → AI Agent → ...
Execute Sub-workflow Trigger ───┘
```

### AI Agent Checklist

When asked to test a workflow:

1. ✅ Get workflow details
2. ✅ Check trigger type:
   - `n8n-nodes-base.webhook` → use Pattern 1 (direct)
   - `n8n-nodes-base.executeWorkflowTrigger` → use Pattern 2 (runner)
   - `n8n-nodes-base.manualTrigger` → **ADD** executeWorkflowTrigger first
   - `n8n-nodes-base.scheduleTrigger` → **ADD** executeWorkflowTrigger first
3. ✅ If trigger added, update workflow via API
4. ✅ Activate workflow if needed
5. ✅ Run test with `--runner` mode

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `N8N_URL` | Yes | - | Your n8n instance URL |
| `N8N_API_KEY` | Yes | - | n8n API key |
| `TEST_RUNNER_PATH` | No | `test-runner` | Webhook path for Test Runner |
| `TEST_RUNNER_NAME` | No | `Test Runner` | Workflow name for Test Runner |

## Output Format

The test script outputs:
- Workflow status (active/inactive)
- Webhook response (JSON formatted)
- Execution details (id, status, timing)
- Error details (if any)

Example output:
```
========================================
N8N WORKFLOW TEST
========================================
URL: https://n8n.example.com
Time: Fri Jan 23 10:41:10 PST 2026
----------------------------------------
Mode: Test Runner (sub-workflow)
Target Workflow: BFeLmDYJ7DlbwQMM
Test Runner Path: test-runner
Status: Active
----------------------------------------
Calling test runner...
Data: {"test": true, "source": "claude-code"}
----------------------------------------
RESPONSE:
[
  {
    "received": {...},
    "status": "success"
  }
]
----------------------------------------
TARGET WORKFLOW EXECUTION:
{
  "id": "37",
  "status": "success",
  "mode": "integrated",
  "startedAt": "2026-01-23T10:41:10.766Z",
  "stoppedAt": "2026-01-23T10:41:10.792Z",
  "workflowId": "BFeLmDYJ7DlbwQMM"
}
========================================
```

## Dependencies

- `curl` - HTTP client
- `jq` - JSON processor
- n8n instance with API access

## Troubleshooting

### "N8N_URL not set"
Add `N8N_URL=https://your-n8n.com` to `.env` file.

### "N8N_API_KEY not set"
Generate API key in n8n: Settings → API → Create API Key.

### "No webhook trigger found"
Workflow doesn't have a Webhook node. Use `--runner` mode instead.

### "Missing node to start execution"
Target workflow needs Execute Sub-workflow Trigger node for `--runner` mode.

### Test Runner doesn't exist
Run `./scripts/setup-test-runner.sh` first.
