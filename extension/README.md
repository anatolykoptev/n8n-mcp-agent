# n8n MCP Auth Extension

Chrome extension for automatic n8n session capture.

## Setup

### 1. Install Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `n8n-mcp-agent/extension` folder

### 2. Login to n8n

1. Navigate to your n8n instance
2. Login with your credentials
3. Click extension icon → "Sync Cookie"

### 3. Done

MCP server includes embedded auth-server on port 19847.
When Claude Code uses n8n tools, it reads session cookies automatically.

## How It Works

```
┌─────────────┐     ┌──────────────────────────────┐
│   Chrome    │────▶│  MCP Server (includes        │
│  Extension  │     │  auth-server on :19847)      │
└─────────────┘     └──────────────────────────────┘
      │                           │
   Sync Cookie              Read cookie
```

## Files

- `manifest.json` - Extension manifest
- `background.js` - Auto-capture on cookie change
- `popup.html/js` - Manual sync button
