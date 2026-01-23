#!/bin/bash
# Create a sample testable workflow with Execute Sub-workflow Trigger
# This is useful for testing the Test Runner setup
#
# Usage: ./create-sample-workflow.sh [workflow_name]

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

WORKFLOW_NAME="${1:-Echo Sub-workflow (Sample)}"

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

# Create sample workflow
create_sample_workflow() {
  local workflow_json=$(cat <<EOF
{
  "name": "$WORKFLOW_NAME",
  "nodes": [
    {
      "parameters": {},
      "id": "subworkflow-trigger",
      "name": "Execute Sub-workflow Trigger",
      "type": "n8n-nodes-base.executeWorkflowTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "mode": "raw",
        "jsonOutput": "={{ { received: \$json, status: 'success', processedBy: 'sample-workflow' } }}",
        "options": {}
      },
      "id": "process-node",
      "name": "Process & Return",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [500, 300]
    }
  ],
  "connections": {
    "Execute Sub-workflow Trigger": {
      "main": [[{"node": "Process & Return", "type": "main", "index": 0}]]
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

  local result=$(api_call "/workflows" "POST" "$workflow_json")
  local workflow_id=$(echo "$result" | jq -r '.id // empty')

  if [ -z "$workflow_id" ]; then
    echo "ERROR: Failed to create sample workflow" >&2
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
echo "CREATE SAMPLE WORKFLOW"
echo "========================================"
echo "n8n URL: $N8N_URL"
echo "Workflow Name: $WORKFLOW_NAME"
echo "----------------------------------------"

echo "Creating sample workflow..."
workflow_id=$(create_sample_workflow)
echo "Created workflow (ID: $workflow_id)"

echo "Activating workflow..."
activate_workflow "$workflow_id"
echo "Workflow activated"

echo "----------------------------------------"
echo "SUCCESS!"
echo ""
echo "Sample Workflow Details:"
echo "  ID: $workflow_id"
echo "  Name: $WORKFLOW_NAME"
echo "  Trigger: Execute Sub-workflow Trigger"
echo ""
echo "Test with:"
echo "  ./test-workflow.sh --runner $workflow_id"
echo ""
echo "========================================"
