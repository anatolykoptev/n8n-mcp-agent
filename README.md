# n8n MCP Agent

Autonomous AI agent for n8n workflow automation with credential factories, execution helpers, 4343+ workflow templates, and specialized sub-agents.

[![npm version](https://img.shields.io/npm/v/@anatolykoptev/n8n-mcp-agent.svg)](https://www.npmjs.com/package/@anatolykoptev/n8n-mcp-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **38 MCP Tools** - Full n8n API coverage for workflows, executions, credentials, tags, variables, and more
- **4343+ Workflow Templates** - Access to Zie619 database with 268 integrations across 16 categories
- **Credential Factories** - Type-safe factories for Google, Postgres, Slack, Telegram, OpenAI, GitHub, and more
- **Execution Helpers** - Wait for completion, extract output data, get errors, batch operations
- **Workflow Helpers** - Webhook URL extraction, duplication with credential stripping, node management
- **Auto-Connect** - Automatic connection from environment variables (N8N_URL, N8N_API_KEY)
- **TypeScript First** - Built with TypeScript, well-tested with 205+ tests

## Installation

### Get your n8n API Key

1. Log into your n8n instance
2. Click your user icon in the bottom left
3. Go to Settings
4. Select API
5. Click "Create API Key"
6. Copy your API key (you will not be able to see it again)

### Install from npm

```bash
npm install -g @anatolykoptev/n8n-mcp-agent
```

### Install from Source

```bash
git clone https://github.com/anatolykoptev/n8n-mcp-agent.git
cd n8n-mcp-agent
npm install
npm run build
```

## Configuration

### Claude Desktop

Open your Claude Desktop configuration file:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

Add the n8n configuration:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "n8n-mcp-agent",
      "env": {
        "N8N_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cline (VS Code)

1. Open VS Code
2. Open the Cline extension from the left sidebar
3. Click the "MCP Servers" icon at the top of the pane
4. Scroll to bottom and click "Configure MCP Servers"
5. Add to the opened settings file:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "n8n-mcp-agent",
      "env": {
        "N8N_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Environment Variables

The server auto-connects when these environment variables are set:

| Variable | Description |
|----------|-------------|
| `N8N_URL` | Your n8n instance URL (e.g., `https://n8n.example.com`) |
| `N8N_API_KEY` | Your n8n API key |

Optional flags choose which tools are registered. With none set, the 35 core tools are
available; the Enterprise and user-management tools are off by default.

| Variable | Effect when `true` |
|----------|--------------------|
| `N8N_ENTERPRISE` | enable the project and variable tools (n8n Enterprise) |
| `N8N_USERS` | enable the user-management tools |
| `N8N_FULL` | enable every tool (46 in total) |

## MCP Tools

### Workflow Management (8 tools)
- `init-n8n` - Initialize connection to n8n instance
- `list-workflows` - List all workflows
- `get-workflow` - Get workflow by ID
- `create-workflow` - Create new workflow
- `update-workflow` - Update existing workflow
- `delete-workflow` - Delete workflow
- `activate-workflow` - Activate workflow
- `deactivate-workflow` - Deactivate workflow

### Execution Management (3 tools)
- `list-executions` - List executions with filters
- `get-execution` - Get execution by ID
- `delete-execution` - Delete execution

### Credential Management (3 tools)
- `create-credential` - Create credential
- `delete-credential` - Delete credential
- `get-credential-schema` - Get schema for credential type

### Tag Management (7 tools)
- `list-tags` - List all tags
- `create-tag` - Create new tag
- `get-tag` - Get tag by ID
- `update-tag` - Update tag name
- `delete-tag` - Delete tag
- `get-workflow-tags` - Get tags for workflow
- `update-workflow-tags` - Update workflow tags

### User Management (4 tools)
- `list-users` - List all users
- `create-users` - Create users
- `get-user` - Get user by ID or email
- `delete-user` - Delete user

### Project Management (4 tools, Enterprise)
- `list-projects` - List all projects
- `create-project` - Create project
- `update-project` - Update project
- `delete-project` - Delete project

### Variable Management (3 tools, Enterprise)
- `list-variables` - List all variables
- `create-variable` - Create variable
- `delete-variable` - Delete variable

### Security (1 tool)
- `generate-audit` - Generate security audit

### Workflow Templates (5 tools)
- `n8n-patterns-stats` - Get database statistics
- `n8n-patterns-search` - Search templates
- `n8n-patterns-get` - Get template by ID
- `n8n-patterns-categories` - List categories
- `n8n-patterns-integrations` - List top integrations

## Credential Factories

Type-safe factory methods for creating credentials programmatically:

```typescript
// Available factories
createGoogleServiceAccount(name, email, privateKey)
createPostgres(name, host, database, user, password, port?, ssl?)
createHttpBasic(name, username, password)
createApiKey(name, apiKey, headerName?)
createSlack(name, accessToken)
createTelegram(name, accessToken)
createOpenAI(name, apiKey)
createAirtable(name, apiKey)
createNotion(name, apiKey)
createGitHub(name, accessToken)
createSmtp(name, host, port, user, password, secure?)
createMySql(name, host, database, user, password, port?)
```

## Execution Helpers

Advanced execution monitoring and data extraction:

```typescript
// Wait for execution to complete with polling
waitForCompletion(executionId, timeout?, pollInterval?)

// Extract output data from execution
getOutput(executionId)

// Get error message from failed execution
getError(executionId)

// Check if execution is running
isRunning(executionId)

// List failed executions
listFailed(workflowId?, limit?)

// List running executions
listRunning(workflowId?, limit?)

// Delete multiple executions
deleteMany({ workflowId?, status?, limit? })
```

## Workflow Helpers

Advanced workflow manipulation:

```typescript
// Extract webhook URL from workflow
getWebhookUrl(workflowId)

// Duplicate workflow with credential stripping
duplicate(sourceId, newName, stripCredentials?)

// Add node to existing workflow
addNode(workflowId, node)

// Create workflow with trigger
createWithTrigger(name, triggerType, triggerConfig?)

// Get workflow statistics
getStats(workflowId)
```

## Workflow Templates

Access 4343+ workflow templates from the Zie619 database:

- **268 integrations** - Shopify, OpenAI, Slack, Telegram, GitHub, and more
- **16 categories** - E-commerce, AI Agent Development, Marketing, CRM, and more
- **Complexity levels** - Low, Medium, High
- **Trigger types** - Manual, Webhook, Scheduled, Complex

## Validation

After configuration:

1. Restart your LLM application
2. Ask: "List my n8n workflows"
3. You should see your workflows listed

If you get an error:
- Check that your n8n instance is running
- Verify your API key has correct permissions
- Ensure N8N_URL has no trailing slash

## Troubleshooting

### Common Issues

1. **"Client not initialized"**
   - Check N8N_URL and N8N_API_KEY are set correctly
   - Ensure n8n instance is accessible
   - Verify API key permissions

2. **"License required"**
   - You are trying to use an Enterprise feature
   - Either upgrade to n8n Enterprise or use core features only

3. **Connection Issues**
   - Verify n8n instance is running
   - Check URL protocol (http/https)
   - Remove trailing slash from N8N_URL

## Security Best Practices

1. **API Key Management**
   - Use minimal permissions necessary
   - Rotate keys regularly
   - Never commit keys to version control

2. **Instance Access**
   - Use HTTPS for production
   - Enable n8n authentication
   - Keep n8n updated

## Development

```bash
npm install
npm run lint      # tsc --noEmit
npm test          # vitest run
npm run build     # tsc, writes build/
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [DEVELOPMENT.md](DEVELOPMENT.md); all
documents are listed in [docs/INDEX.md](docs/INDEX.md).

## Support

- [GitHub Issues](https://github.com/anatolykoptev/n8n-mcp-agent/issues)
- [n8n Documentation](https://docs.n8n.io)

## Author

Anatoly Koptev

## License

[MIT License](LICENSE)
