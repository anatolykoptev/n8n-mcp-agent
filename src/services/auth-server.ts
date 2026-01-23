/**
 * @module services/auth-server
 * @description Embedded HTTP server for Chrome extension credential bridge
 *
 * Starts automatically with MCP server on port 19847.
 * Chrome extension pushes n8n session cookies here.
 */

import http from 'node:http';
import { URL } from 'node:url';

const PORT = 19847;

// =============================================================================
// Types
// =============================================================================

interface N8nCredentials {
  email: string;
  password: string;
}

interface N8nPageData {
  path: string;
  workflowId?: string;
  nodes?: Array<{ name: string; type: string }>;
  user?: { id: string; email: string };
}

interface N8nInstance {
  sessionCookie: string | null;
  apiKey: string | null;
  expiry: number | null;           // Unix timestamp when cookie expires
  credentials: N8nCredentials | null; // For auto-refresh
  pageData: N8nPageData | null;    // Latest page data from content script
  autoRefreshEnabled: boolean;
  updatedAt: string;
}

// =============================================================================
// Storage
// =============================================================================

const storage: Record<string, N8nInstance> = {};

function sendJson(res: http.ServerResponse, data: unknown, statusCode = 200): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, null, 204);
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  try {
    // Health check
    if (pathname === '/health' && req.method === 'GET') {
      sendJson(res, { status: 'ok', timestamp: new Date().toISOString() });
      return;
    }

    // List all instances
    if (pathname === '/instances' && req.method === 'GET') {
      sendJson(res, storage);
      return;
    }

    // Get specific instance
    const instanceMatch = pathname.match(/^\/instance\/(.+)$/);
    if (instanceMatch && req.method === 'GET') {
      const instanceUrl = decodeURIComponent(instanceMatch[1]);
      const instance = storage[instanceUrl];
      if (instance) {
        sendJson(res, { url: instanceUrl, ...instance });
      } else {
        sendJson(res, { error: 'Instance not found' }, 404);
      }
      return;
    }

    // Save instance (main sync endpoint from extension)
    if (pathname === '/instance' && req.method === 'POST') {
      const body = await readBody(req);
      const data = JSON.parse(body);

      if (!data.url) {
        sendJson(res, { error: 'URL is required' }, 400);
        return;
      }

      const existing = storage[data.url];
      storage[data.url] = {
        sessionCookie: data.sessionCookie ?? existing?.sessionCookie ?? null,
        apiKey: data.apiKey ?? existing?.apiKey ?? null,
        expiry: data.expiry ?? existing?.expiry ?? null,
        credentials: existing?.credentials ?? null, // Preserve credentials
        pageData: data.pageData ?? existing?.pageData ?? null,
        autoRefreshEnabled: data.autoRefreshEnabled ?? existing?.autoRefreshEnabled ?? true,
        updatedAt: new Date().toISOString(),
      };

      const expiryInfo = data.expiry
        ? ` (expires: ${new Date(data.expiry).toISOString()})`
        : '';
      console.error(`[auth-server] Synced ${data.url}${expiryInfo}`);
      sendJson(res, { success: true, url: data.url });
      return;
    }

    // Store credentials for auto-refresh (from content.js login capture)
    if (pathname === '/credentials' && req.method === 'POST') {
      const body = await readBody(req);
      const data = JSON.parse(body);

      if (!data.url || !data.email || !data.password) {
        sendJson(res, { error: 'url, email, and password are required' }, 400);
        return;
      }

      const existing = storage[data.url];
      storage[data.url] = {
        sessionCookie: existing?.sessionCookie ?? null,
        apiKey: existing?.apiKey ?? null,
        expiry: existing?.expiry ?? null,
        credentials: { email: data.email, password: data.password },
        pageData: existing?.pageData ?? null,
        autoRefreshEnabled: true,
        updatedAt: new Date().toISOString(),
      };

      console.error(`[auth-server] Stored credentials for ${data.url} (auto-refresh enabled)`);
      sendJson(res, { success: true, autoRefreshEnabled: true });
      return;
    }

    // Check cookie expiry status
    if (pathname === '/expiry-check' && req.method === 'GET') {
      const urlParam = parsedUrl.searchParams.get('url');
      if (!urlParam) {
        sendJson(res, { error: 'url parameter required' }, 400);
        return;
      }

      const instance = storage[urlParam];
      if (!instance) {
        sendJson(res, { error: 'Instance not found' }, 404);
        return;
      }

      const now = Date.now();
      const expiry = instance.expiry;
      const hoursUntilExpiry = expiry ? Math.floor((expiry - now) / (1000 * 60 * 60)) : null;

      sendJson(res, {
        url: urlParam,
        expiry: expiry ? new Date(expiry).toISOString() : null,
        hoursUntilExpiry,
        isExpired: expiry ? now > expiry : null,
        hasCredentials: !!instance.credentials,
        canAutoRefresh: !!instance.credentials && instance.autoRefreshEnabled,
      });
      return;
    }

    // Delete instance
    if (instanceMatch && req.method === 'DELETE') {
      const instanceUrl = decodeURIComponent(instanceMatch[1]);
      delete storage[instanceUrl];
      sendJson(res, { success: true });
      return;
    }

    sendJson(res, { error: 'Not found' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendJson(res, { error: message }, 500);
  }
});

/**
 * Start the embedded auth-server
 * Non-blocking, runs in background
 */
export function startAuthServer(): void {
  server.listen(PORT, '127.0.0.1', () => {
    console.error(`[auth-server] Running on http://127.0.0.1:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[auth-server] Port ${PORT} already in use (external server running?)`);
    } else {
      console.error(`[auth-server] Error: ${err.message}`);
    }
  });
}

/**
 * Get session cookie from in-memory storage
 */
export function getStoredSessionCookie(url: string): string | null {
  return storage[url]?.sessionCookie ?? null;
}

/**
 * Get all stored instances
 */
export function getStoredInstances(): Record<string, N8nInstance> {
  return storage;
}

/**
 * Check if instance can auto-refresh
 */
export function canAutoRefresh(url: string): boolean {
  const instance = storage[url];
  return !!(instance?.credentials && instance.autoRefreshEnabled);
}

/**
 * Get stored credentials for auto-refresh
 */
export function getStoredCredentials(url: string): N8nCredentials | null {
  return storage[url]?.credentials ?? null;
}

/**
 * Get cookie expiry info
 */
export function getCookieExpiry(url: string): { expiry: number | null; hoursRemaining: number | null } {
  const instance = storage[url];
  if (!instance?.expiry) {
    return { expiry: null, hoursRemaining: null };
  }
  const hoursRemaining = Math.floor((instance.expiry - Date.now()) / (1000 * 60 * 60));
  return { expiry: instance.expiry, hoursRemaining };
}
