#!/bin/bash
# Test n8n workflow via webhook and get execution results
# Usage: ./test-workflow.sh <workflow_id> [json_data]
#        ./test-workflow.sh --path <webhook_path> [json_data]
#        ./test-workflow.sh --runner <workflow_id> [json_data]

set -e

# Load environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../../../.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Configuration from environment (no defaults for sensitive values)
N8N_URL="${N8N_URL:?ERROR: N8N_URL not set. Add it to .env file}"
N8N_API_KEY="${N8N_API_KEY:?ERROR: N8N_API_KEY not set. Add it to .env file}"
TEST_RUNNER_PATH="${TEST_RUNNER_PATH:-test-runner}"

# Parse arguments
WORKFLOW_ID=""
WEBHOOK_PATH=""
USE_RUNNER=false
JSON_DATA='{"test": true, "source": "claude-code", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'

while [[ $# -gt 0 ]]; do
  case $1 in
    --path)
      WEBHOOK_PATH="$2"
      shift 2
      ;;
    --runner)
      USE_RUNNER=true
      WORKFLOW_ID="$2"
      shift 2
      ;;
    *)
      if [ -z "$WORKFLOW_ID" ] && [ -z "$WEBHOOK_PATH" ]; then
        WORKFLOW_ID="$1"
      else
        JSON_DATA="$1"
      fi
      shift
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

# Get webhook path from workflow
get_webhook_path() {
  local wf_id="$1"
  local workflow=$(api_call "/workflows/${wf_id}")

  # Extract webhook node path using jq
  local path=$(echo "$workflow" | jq -r '.nodes[]? | select(.type == "n8n-nodes-base.webhook") | .parameters.path // empty' | head -1)

  if [ -z "$path" ]; then
    echo "ERROR: No webhook trigger found in workflow $wf_id" >&2
    return 1
  fi

  echo "$path"
}

# Check if workflow is active
is_workflow_active() {
  local wf_id="$1"
  local workflow=$(api_call "/workflows/${wf_id}")
  echo "$workflow" | jq -r '.active'
}

# Activate workflow
activate_workflow() {
  local wf_id="$1"
  api_call "/workflows/${wf_id}/activate" "POST" > /dev/null
  echo "Workflow $wf_id activated"
}

# Call webhook
call_webhook() {
  local path="$1"
  local data="$2"

  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$data" \
    "${N8N_URL}/webhook/${path}"
}

# Get latest execution for workflow
get_latest_execution() {
  local wf_id="$1"
  local executions=$(api_call "/executions?workflowId=${wf_id}&limit=1&includeData=true")
  echo "$executions" | jq '.data[0]'
}

# Call test runner with sub-workflow
call_test_runner() {
  local target_wf_id="$1"
  local input_data="$2"

  # Build payload with workflowId and input data
  local payload=$(jq -n \
    --arg wfId "$target_wf_id" \
    --argjson data "$input_data" \
    '{workflowId: $wfId, input: $data, source: "claude-code", timestamp: (now | todate)}')

  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "${N8N_URL}/webhook/${TEST_RUNNER_PATH}"
}

# Main execution
echo "========================================"
echo "N8N WORKFLOW TEST"
echo "========================================"
echo "URL: $N8N_URL"
echo "Time: $(date)"
echo "----------------------------------------"

# Determine execution mode
if [ "$USE_RUNNER" = true ]; then
  echo "Mode: Test Runner (sub-workflow)"
  echo "Target Workflow: $WORKFLOW_ID"
  echo "Test Runner Path: $TEST_RUNNER_PATH"

  # Check if target workflow is active
  active=$(is_workflow_active "$WORKFLOW_ID")
  if [ "$active" != "true" ]; then
    echo "Status: Inactive - activating..."
    activate_workflow "$WORKFLOW_ID"
    sleep 1
  else
    echo "Status: Active"
  fi

  echo "----------------------------------------"
  echo "Calling test runner..."
  echo "Data: $JSON_DATA"
  echo "----------------------------------------"

  RESPONSE=$(call_test_runner "$WORKFLOW_ID" "$JSON_DATA")
  echo "RESPONSE:"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

  echo "----------------------------------------"

  # Get execution details for target workflow
  sleep 1
  echo "TARGET WORKFLOW EXECUTION:"
  EXECUTION=$(get_latest_execution "$WORKFLOW_ID")

  if [ "$EXECUTION" != "null" ] && [ -n "$EXECUTION" ]; then
    echo "$EXECUTION" | jq '{
      id: .id,
      status: .status,
      mode: .mode,
      startedAt: .startedAt,
      stoppedAt: .stoppedAt,
      workflowId: .workflowId
    }'

    ERROR=$(echo "$EXECUTION" | jq -r '.data.resultData.error // empty')
    if [ -n "$ERROR" ] && [ "$ERROR" != "null" ]; then
      echo "----------------------------------------"
      echo "ERROR IN EXECUTION:"
      echo "$EXECUTION" | jq '.data.resultData.error'
    fi
  else
    echo "No execution found"
  fi

  echo "========================================"
  exit 0
fi

# Direct webhook mode
if [ -n "$WEBHOOK_PATH" ]; then
  echo "Mode: Direct webhook path"
  echo "Path: $WEBHOOK_PATH"
elif [ -n "$WORKFLOW_ID" ]; then
  echo "Mode: Workflow ID (webhook)"
  echo "Workflow: $WORKFLOW_ID"

  # Check if active
  active=$(is_workflow_active "$WORKFLOW_ID")
  if [ "$active" != "true" ]; then
    echo "Status: Inactive - activating..."
    activate_workflow "$WORKFLOW_ID"
    sleep 1
  else
    echo "Status: Active"
  fi

  # Get webhook path
  WEBHOOK_PATH=$(get_webhook_path "$WORKFLOW_ID")
  echo "Webhook: $WEBHOOK_PATH"
else
  echo "ERROR: Provide workflow ID, --path <webhook_path>, or --runner <workflow_id>" >&2
  exit 1
fi

echo "----------------------------------------"
echo "Calling webhook..."
echo "Data: $JSON_DATA"
echo "----------------------------------------"

# Call webhook and capture response
RESPONSE=$(call_webhook "$WEBHOOK_PATH" "$JSON_DATA")
echo "RESPONSE:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo "----------------------------------------"

# Get execution details if we have workflow ID
if [ -n "$WORKFLOW_ID" ]; then
  sleep 1
  echo "EXECUTION DETAILS:"
  EXECUTION=$(get_latest_execution "$WORKFLOW_ID")

  if [ "$EXECUTION" != "null" ] && [ -n "$EXECUTION" ]; then
    echo "$EXECUTION" | jq '{
      id: .id,
      status: .status,
      mode: .mode,
      startedAt: .startedAt,
      stoppedAt: .stoppedAt,
      workflowId: .workflowId
    }'

    # Check for errors
    ERROR=$(echo "$EXECUTION" | jq -r '.data.resultData.error // empty')
    if [ -n "$ERROR" ] && [ "$ERROR" != "null" ]; then
      echo "----------------------------------------"
      echo "ERROR IN EXECUTION:"
      echo "$EXECUTION" | jq '.data.resultData.error'
    fi
  else
    echo "No execution found"
  fi
fi

echo "========================================"
