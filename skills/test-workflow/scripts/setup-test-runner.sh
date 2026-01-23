#!/bin/bash
# Setup Test Runner workflow on n8n instance
# Creates a universal workflow for testing sub-workflows via webhook
#
# Usage: ./setup-test-runner.sh [--force]
#   --force: Recreate even if Test Runner already exists

set -e

# Load environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../../../.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Configuration from environment
N8N_URL="${N8N_URL:?ERROR: N8N_URL not set in .env}"
N8N_API_KEY="${N8N_API_KEY:?ERROR: N8N_API_KEY not set in .env}"
TEST_RUNNER_PATH="${TEST_RUNNER_PATH:-test-runner}"
TEST_RUNNER_NAME="${TEST_RUNNER_NAME:-Test Runner}"

FORCE_RECREATE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE_RECREATE=true
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Helper function for API calls
api_call() {
  local endpoint="$1"
  local method="${2:-GET}"
  local data="$3"

  local curl_args=(
    -s
    -X "$method"
    -H "X-N8N-API-KEY: $N8N_API_KEY"
    -H "Content-Type: application/json"
  )

  if [ -n "$data" ]; then
    curl_args+=(-d "$data")
  fi

  curl "${curl_args[@]}" "${N8N_URL}/api/v1${endpoint}"
}

# Check if Test Runner already exists
find_test_runner() {
  local workflows=$(api_call "/workflows")
  echo "$workflows" | jq -r --arg name "$TEST_RUNNER_NAME" '.data[]? | select(.name == $name) | .id' | head -1
}

# Delete workflow by ID
delete_workflow() {
  local wf_id="$1"
  api_call "/workflows/${wf_id}" "DELETE" > /dev/null
  echo "Deleted existing Test Runner (ID: $wf_id)"
}

# Create Test Runner workflow
create_test_runner() {
  local workflow_json=$(cat <<'EOF'
{
  "name": "TEST_RUNNER_NAME_PLACEHOLDER",
  "nodes": [
    {
      "parameters": {
        "path": "TEST_RUNNER_PATH_PLACEHOLDER",
        "httpMethod": "POST",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-trigger",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "webhookId": "test-runner-webhook"
    },
    {
      "parameters": {
        "mode": "raw",
        "jsonOutput": "={{ { workflowId: $json.body.workflowId, input: $json.body.input || {}, source: $json.body.source || 'unknown', requestTimestamp: $json.body.timestamp, startedAt: new Date().toISOString() } }}",
        "options": {}
      },
      "id": "prepare-data",
      "name": "Prepare Data",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [450, 300]
    },
    {
      "parameters": {
        "source": "database",
        "workflowId": "={{ $json.workflowId }}",
        "options": {
          "waitForSubWorkflow": true
        }
      },
      "id": "execute-subworkflow",
      "name": "Execute Sub-workflow",
      "type": "n8n-nodes-base.executeWorkflow",
      "typeVersion": 1,
      "position": [650, 300],
      "onError": "continueErrorOutput"
    },
    {
      "parameters": {
        "mode": "raw",
        "jsonOutput": "={{ { execution: { status: 'success', result: $json, finishedAt: new Date().toISOString() }, logs: { workflowId: $('Prepare Data').item.json.workflowId, source: $('Prepare Data').item.json.source, input: $('Prepare Data').item.json.input, startedAt: $('Prepare Data').item.json.startedAt, finishedAt: new Date().toISOString() } } }}",
        "options": {}
      },
      "id": "build-success",
      "name": "Build Success Response",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [900, 200]
    },
    {
      "parameters": {
        "mode": "raw",
        "jsonOutput": "={{ { execution: { status: 'error', error: { message: $json.error?.message || 'Unknown error', description: $json.error?.description || null, stack: $json.error?.stack || null, node: $json.error?.node || null, timestamp: $json.error?.timestamp || null }, finishedAt: new Date().toISOString() }, logs: { workflowId: $('Prepare Data').item.json.workflowId, source: $('Prepare Data').item.json.source, input: $('Prepare Data').item.json.input, startedAt: $('Prepare Data').item.json.startedAt, finishedAt: new Date().toISOString(), errorContext: { inputData: $('Prepare Data').item.json.input, workflowState: 'failed', failedNode: $json.error?.node || 'unknown' } }, diagnosis: { possibleCauses: ['Check if workflow ID is correct', 'Verify workflow has Execute Sub-workflow Trigger', 'Check input data format matches expected schema', 'Review node configurations in target workflow'], suggestedActions: ['Get workflow details with get-workflow tool', 'Check execution history for similar errors', 'Validate input schema against workflow requirements'] } } }}",
        "options": {}
      },
      "id": "build-error",
      "name": "Build Error Response",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [900, 400]
    },
    {
      "parameters": {
        "respondWith": "allIncomingItems",
        "options": {}
      },
      "id": "respond-webhook",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1150, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Prepare Data", "type": "main", "index": 0}]]
    },
    "Prepare Data": {
      "main": [[{"node": "Execute Sub-workflow", "type": "main", "index": 0}]]
    },
    "Execute Sub-workflow": {
      "main": [
        [{"node": "Build Success Response", "type": "main", "index": 0}],
        [{"node": "Build Error Response", "type": "main", "index": 0}]
      ]
    },
    "Build Success Response": {
      "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
    },
    "Build Error Response": {
      "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "saveManualExecutions": true,
    "saveExecutionProgress": true,
    "callerPolicy": "workflowsFromSameOwner"
  }
}
EOF
)

  # Replace placeholders with actual values
  workflow_json=$(echo "$workflow_json" | sed "s/TEST_RUNNER_NAME_PLACEHOLDER/$TEST_RUNNER_NAME/g")
  workflow_json=$(echo "$workflow_json" | sed "s/TEST_RUNNER_PATH_PLACEHOLDER/$TEST_RUNNER_PATH/g")

  local result=$(api_call "/workflows" "POST" "$workflow_json")
  local workflow_id=$(echo "$result" | jq -r '.id // empty')

  if [ -z "$workflow_id" ]; then
    echo "ERROR: Failed to create Test Runner workflow" >&2
    echo "$result" | jq . 2>/dev/null || echo "$result"
    exit 1
  fi

  echo "$workflow_id"
}

# Activate workflow
activate_workflow() {
  local wf_id="$1"
  api_call "/workflows/${wf_id}/activate" "POST" > /dev/null
}

# Main execution
echo "========================================"
echo "TEST RUNNER SETUP"
echo "========================================"
echo "n8n URL: $N8N_URL"
echo "Webhook Path: $TEST_RUNNER_PATH"
echo "Workflow Name: $TEST_RUNNER_NAME"
echo "----------------------------------------"

# Check for existing Test Runner
existing_id=$(find_test_runner)

if [ -n "$existing_id" ]; then
  if [ "$FORCE_RECREATE" = true ]; then
    echo "Found existing Test Runner (ID: $existing_id)"
    delete_workflow "$existing_id"
  else
    echo "Test Runner already exists!"
    echo ""
    echo "  ID: $existing_id"
    echo "  Webhook: ${N8N_URL}/webhook/${TEST_RUNNER_PATH}"
    echo ""
    echo "Use --force to recreate."
    echo "========================================"
    exit 0
  fi
fi

echo "Creating Test Runner workflow..."
workflow_id=$(create_test_runner)
echo "Created workflow (ID: $workflow_id)"

echo "Activating workflow..."
activate_workflow "$workflow_id"
echo "Workflow activated"

echo "----------------------------------------"
echo "SUCCESS!"
echo ""
echo "Test Runner Details:"
echo "  ID: $workflow_id"
echo "  Name: $TEST_RUNNER_NAME"
echo "  Webhook: ${N8N_URL}/webhook/${TEST_RUNNER_PATH}"
echo ""
echo "Usage:"
echo "  ./test-workflow.sh --runner <workflow_id> [json_data]"
echo ""
echo "========================================"
