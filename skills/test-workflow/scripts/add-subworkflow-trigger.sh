#!/bin/bash
# Add Execute Sub-workflow Trigger to a workflow with Manual Trigger
# This makes the workflow testable via Test Runner
#
# Usage: ./add-subworkflow-trigger.sh <workflow_id> [first_node_after_trigger]

set -e

# Load environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../../../.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Configuration
N8N_URL="${N8N_URL:?ERROR: N8N_URL not set in .env}"
N8N_API_KEY="${N8N_API_KEY:?ERROR: N8N_API_KEY not set in .env}"

WORKFLOW_ID="${1:?ERROR: Workflow ID required}"
TARGET_NODE="${2:-}"

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

echo "========================================"
echo "ADD EXECUTE SUB-WORKFLOW TRIGGER"
echo "========================================"
echo "n8n URL: $N8N_URL"
echo "Workflow ID: $WORKFLOW_ID"
echo "----------------------------------------"

# Get workflow
echo "Fetching workflow..."
WORKFLOW=$(api_call "/workflows/$WORKFLOW_ID" | tr -d '\000-\037')

# Check if already has executeWorkflowTrigger
HAS_TRIGGER=$(echo "$WORKFLOW" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for node in data.get('nodes', []):
    if node.get('type') == 'n8n-nodes-base.executeWorkflowTrigger':
        print('yes')
        sys.exit(0)
print('no')
")

if [ "$HAS_TRIGGER" = "yes" ]; then
  echo "Workflow already has Execute Sub-workflow Trigger!"
  echo "No changes needed."
  echo "========================================"
  exit 0
fi

# Find Manual Trigger and its target
TRIGGER_INFO=$(echo "$WORKFLOW" | python3 -c "
import json, sys
data = json.load(sys.stdin)

# Find manual trigger
manual_trigger = None
for node in data.get('nodes', []):
    if node.get('type') == 'n8n-nodes-base.manualTrigger':
        manual_trigger = node
        break

if not manual_trigger:
    print('ERROR: No Manual Trigger found', file=sys.stderr)
    sys.exit(1)

# Find what it connects to
trigger_name = manual_trigger['name']
connections = data.get('connections', {})
target_node = None

if trigger_name in connections:
    main_conn = connections[trigger_name].get('main', [[]])
    if main_conn and main_conn[0]:
        target_node = main_conn[0][0].get('node')

print(json.dumps({
    'triggerName': trigger_name,
    'triggerPosition': manual_trigger.get('position', [250, 300]),
    'targetNode': target_node
}))
")

if [ $? -ne 0 ]; then
  echo "ERROR: Could not find Manual Trigger in workflow"
  exit 1
fi

echo "Trigger info: $TRIGGER_INFO"

# Extract values
TRIGGER_POS=$(echo "$TRIGGER_INFO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['triggerPosition'][0], d['triggerPosition'][1])")
TARGET=$(echo "$TRIGGER_INFO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['targetNode'] or '')")

if [ -n "$TARGET_NODE" ]; then
  TARGET="$TARGET_NODE"
fi

if [ -z "$TARGET" ]; then
  echo "ERROR: Could not determine target node. Please specify as second argument."
  exit 1
fi

echo "Target node: $TARGET"

# Calculate new trigger position (below manual trigger)
NEW_X=$(echo "$TRIGGER_POS" | awk '{print $1}')
NEW_Y=$(echo "$TRIGGER_POS" | awk '{print $2 + 200}')

echo "New trigger position: [$NEW_X, $NEW_Y]"

# Update workflow with new node and connection
UPDATED=$(echo "$WORKFLOW" | python3 -c "
import json, sys

data = json.load(sys.stdin)
target = '$TARGET'
new_x = $NEW_X
new_y = $NEW_Y

# Add new node
new_node = {
    'parameters': {},
    'id': 'subworkflow-trigger-added',
    'name': 'Execute Sub-workflow Trigger',
    'type': 'n8n-nodes-base.executeWorkflowTrigger',
    'typeVersion': 1,
    'position': [new_x, new_y]
}

data['nodes'].append(new_node)

# Add connection
if 'connections' not in data:
    data['connections'] = {}

data['connections']['Execute Sub-workflow Trigger'] = {
    'main': [[{'node': target, 'type': 'main', 'index': 0}]]
}

# Output required fields for PUT
print(json.dumps({
    'name': data.get('name', 'Workflow'),
    'nodes': data['nodes'],
    'connections': data['connections'],
    'settings': data.get('settings', {})
}))
")

echo "Updating workflow..."
RESULT=$(api_call "/workflows/$WORKFLOW_ID" "PUT" "$UPDATED")

# Check result
UPDATED_ID=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

if [ -z "$UPDATED_ID" ]; then
  echo "ERROR: Failed to update workflow"
  echo "$RESULT"
  exit 1
fi

echo "----------------------------------------"
echo "SUCCESS!"
echo ""
echo "Added Execute Sub-workflow Trigger"
echo "Connected to: $TARGET"
echo ""
echo "Now you can test with:"
echo "  ./test-workflow.sh --runner $WORKFLOW_ID"
echo "========================================"
