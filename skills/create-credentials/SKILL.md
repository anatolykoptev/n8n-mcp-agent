---
name: create-credentials
description: Create n8n credentials using type-safe factory methods. Supports Google, Postgres, MySQL, Slack, Telegram, OpenAI, GitHub, and more.
---

# Create Credentials Skill

This skill provides type-safe credential creation for n8n integrations.

## When to Use

- Setting up new n8n integrations
- Connecting to databases (Postgres, MySQL)
- Configuring messaging services (Slack, Telegram)
- Setting up AI services (OpenAI)
- Connecting to APIs (GitHub, Notion, Airtable)

## Available Credential Factories

### Database Credentials

#### PostgreSQL
```typescript
await credentialFactory.createPostgres(
  'My Postgres DB',    // name
  'db.example.com',    // host
  'myapp',             // database
  'admin',             // user
  'secret123',         // password
  5432,                // port (default: 5432)
  true                 // ssl (default: false)
)
```

#### MySQL
```typescript
await credentialFactory.createMySql(
  'My MySQL DB',       // name
  'db.example.com',    // host
  'myapp',             // database
  'admin',             // user
  'secret123',         // password
  3306                 // port (default: 3306)
)
```

### Messaging Credentials

#### Slack
```typescript
await credentialFactory.createSlack(
  'Slack Bot',         // name
  'xoxb-xxx-xxx'       // Bot User OAuth Token
)
```

#### Telegram
```typescript
await credentialFactory.createTelegram(
  'Telegram Bot',      // name
  '123456:ABC-xxx'     // Bot token from @BotFather
)
```

### AI Credentials

#### OpenAI
```typescript
await credentialFactory.createOpenAI(
  'OpenAI API',        // name
  'sk-xxx'             // API key
)
```

### Cloud Service Credentials

#### Google Service Account
```typescript
await credentialFactory.createGoogleServiceAccount(
  'Google Service',    // name
  'bot@project.iam.gserviceaccount.com', // email
  '-----BEGIN PRIVATE KEY-----\n...'     // PEM private key
)
```

#### GitHub
```typescript
await credentialFactory.createGitHub(
  'GitHub Token',      // name
  'ghp_xxx'            // Personal access token
)
```

### HTTP Authentication

#### Basic Auth
```typescript
await credentialFactory.createHttpBasic(
  'API Basic Auth',    // name
  'username',          // username
  'password'           // password
)
```

#### API Key Header
```typescript
await credentialFactory.createApiKey(
  'API Key',           // name
  'my-secret-key',     // API key value
  'X-API-Key'          // Header name (default: 'X-API-Key')
)
```

### Other Services

#### Notion
```typescript
await credentialFactory.createNotion(
  'Notion Integration', // name
  'secret_xxx'          // Integration token
)
```

#### Airtable
```typescript
await credentialFactory.createAirtable(
  'Airtable API',      // name
  'patXXX'             // API key
)
```

#### SMTP (Email)
```typescript
await credentialFactory.createSmtp(
  'SMTP Server',       // name
  'smtp.gmail.com',    // host
  587,                 // port
  'user@gmail.com',    // user
  'app-password',      // password
  true                 // secure TLS (default: true)
)
```

## Result Format

All factory methods return:
```typescript
interface CredentialResult {
  success: boolean
  credentialId?: string  // ID for use in workflows
  name?: string
  type?: string
  error?: string         // Error message if failed
}
```

## Usage Example

```typescript
// Create Slack credential
const slack = await credentialFactory.createSlack('My Slack', 'xoxb-token')

if (slack.success) {
  console.log(`Created credential: ${slack.credentialId}`)
  // Use in workflow nodes
} else {
  console.error(`Failed: ${slack.error}`)
}
```

## Generic Credential Creation

For credential types not covered by factories:
```typescript
await credentialFactory.create(
  'Custom Credential',
  'customApi',
  {
    apiKey: 'xxx',
    baseUrl: 'https://api.example.com'
  }
)
```

## Best Practices

1. **Use Descriptive Names**: Include environment (dev/prod) in name
2. **Don't Hardcode Secrets**: Pass secrets from environment variables
3. **Test Credentials**: Verify connection after creation
4. **Minimal Permissions**: Request only needed scopes
5. **Rotate Regularly**: Update credentials periodically

## Security Notes

- Credentials are encrypted in n8n
- Never log credential values
- Use environment variables for sensitive data
- Delete unused credentials
