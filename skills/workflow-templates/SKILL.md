---
name: workflow-templates
description: Search and deploy n8n workflow templates from Zie619 database. Access 4343+ templates across 268 integrations and 16 categories.
---

# Workflow Templates Skill

This skill provides access to 4343+ n8n workflow templates from the Zie619 database.

## Database Statistics

- **4343 workflows** - Ready-to-use templates
- **268 integrations** - Shopify, OpenAI, Slack, Telegram, GitHub, etc.
- **16 categories** - E-commerce, AI, Marketing, DevOps, etc.

## Available MCP Tools

### Get Database Stats
```
n8n-patterns-stats
```

### Search Templates
```
n8n-patterns-search {
  query?: string,          // Text search in name/description
  category?: string,       // Filter by category
  integration?: string,    // Filter by integration
  complexity?: 'low' | 'medium' | 'high',
  trigger_type?: 'Manual' | 'Webhook' | 'Scheduled' | 'Complex',
  limit?: number           // Max results (default: 10)
}
```

### Get Template
```
n8n-patterns-get {
  workflow_id: string      // ID from search results
}
```

### List Categories
```
n8n-patterns-categories
```

### List Integrations
```
n8n-patterns-integrations {
  limit?: number           // Max results (default: 50)
}
```

## Categories

| Category | Description |
|----------|-------------|
| AI Agent Development | AI-powered workflows, LLM integrations |
| E-commerce & Retail | Shopify, WooCommerce, inventory |
| Marketing Automation | Email campaigns, social media |
| Customer Support | Helpdesk, ticketing, chat |
| Data Processing | ETL, transformations, sync |
| DevOps & CI/CD | Deployments, monitoring |
| Finance & Accounting | Invoicing, payments |
| HR & Recruitment | Hiring workflows |
| Lead Generation | CRM, prospecting |
| Notifications | Alerts, messaging |
| Productivity | Task automation |
| Sales | Pipeline, quotes |
| Security | Monitoring, alerts |
| Social Media | Posting, analytics |
| Utility | General utilities |
| Other | Miscellaneous |

## Top Integrations

- **Slack** - Team messaging
- **Telegram** - Bot automation
- **OpenAI** - AI/LLM
- **Google Sheets** - Spreadsheets
- **Airtable** - Database
- **Notion** - Knowledge base
- **GitHub** - Code/DevOps
- **Shopify** - E-commerce
- **HubSpot** - CRM
- **Stripe** - Payments

## Usage Examples

### Find AI Workflows
```
n8n-patterns-search {
  category: "AI Agent Development",
  integration: "OpenAI",
  limit: 5
}
```

### Find E-commerce Integrations
```
n8n-patterns-search {
  category: "E-commerce & Retail",
  integration: "Shopify",
  complexity: "low"
}
```

### Find Webhook-Based Templates
```
n8n-patterns-search {
  trigger_type: "Webhook",
  query: "notification",
  limit: 10
}
```

### Find Scheduled Automations
```
n8n-patterns-search {
  trigger_type: "Scheduled",
  category: "Data Processing"
}
```

### Search by Keyword
```
n8n-patterns-search {
  query: "slack notification github"
}
```

## Template Deployment Workflow

### 1. Search for Template
```
n8n-patterns-search {
  query: "github slack notification",
  complexity: "low"
}
```

### 2. Get Template Details
```
n8n-patterns-get {
  workflow_id: "found-template-id"
}
```

### 3. Deploy Template
Use the returned JSON to create workflow:
```typescript
const template = await getTemplate(templateId)
await client.createWorkflow(
  template.name,
  template.nodes,
  template.connections
)
```

### 4. Configure Credentials
Add credentials for each node that requires them.

### 5. Activate Workflow
```typescript
await client.activateWorkflow(workflowId)
```

## Complexity Levels

| Level | Description |
|-------|-------------|
| Low | 1-5 nodes, simple logic |
| Medium | 6-15 nodes, conditions/loops |
| High | 16+ nodes, complex integrations |

## Trigger Types

| Type | Description |
|------|-------------|
| Manual | Started manually from n8n |
| Webhook | Triggered by HTTP request |
| Scheduled | Runs on schedule (cron) |
| Complex | Multiple triggers/events |

## Best Practices

### Selecting Templates
1. **Start Simple**: Begin with low complexity templates
2. **Match Use Case**: Choose templates for your specific need
3. **Check Integrations**: Ensure you have accounts for required services
4. **Review Nodes**: Understand what each node does

### Customizing Templates
1. **Update Credentials**: Replace template credentials with yours
2. **Modify Parameters**: Adjust to your specific requirements
3. **Add Error Handling**: Add IF nodes for error cases
4. **Test Thoroughly**: Test with sample data first

### Template Deployment Checklist
- [ ] Template matches use case
- [ ] All required integrations available
- [ ] Credentials created for all services
- [ ] Parameters configured
- [ ] Error handling added
- [ ] Tested with sample data
- [ ] Workflow activated

## Search Tips

1. **Use Keywords**: Search terms from your use case
2. **Filter by Category**: Narrow down by business area
3. **Filter by Integration**: If you know required service
4. **Check Complexity**: Match to your skill level
5. **Review Multiple**: Compare similar templates
