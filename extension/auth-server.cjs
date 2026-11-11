#!/usr/bin/env node
/**
 * Local Creds Server - Universal Local Secure Storage
 *
 * A universal encrypted credential storage for local applications.
 * Currently used by n8n-mcp extension, but designed for future expansion.
 *
 * Storage: ~/.krolik/creds/
 *   - n8n.json          - n8n instance credentials (encrypted)
 *   - .auth-secret      - Server auth token
 *   - .encryption-salt  - Per-installation encryption salt
 *
 * Security features:
 * - AES-256-GCM encryption with machine-bound key
 * - Per-installation random salt (not static)
 * - Restricted CORS (localhost + chrome-extension only)
 * - Shared secret authentication (X-Auth-Token header)
 * - Constant-time token comparison (timing attack prevention)
 * - Rate limiting (100 req/min)
 * - Request body size limit (1MB)
 * - Credentials never leave the machine
 *
 * Usage:
 *   node auth-server.cjs [port]
 *
 * Default port: 19847
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const os = require('os');

const PORT = parseInt(process.argv[2]) || 19847;
const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit

// Universal secure storage in user's home directory
const CREDS_DIR = path.join(os.homedir(), '.krolik', 'creds');
const STORAGE_FILE = path.join(CREDS_DIR, 'n8n.json');
const SECRET_FILE = path.join(CREDS_DIR, '.auth-secret');
const SALT_FILE = path.join(CREDS_DIR, '.encryption-salt');

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

// Ensure directory exists
function ensureDir() {
  if (!fs.existsSync(CREDS_DIR)) {
    fs.mkdirSync(CREDS_DIR, { recursive: true, mode: 0o700 });
  }
}

// =============================================================================
// Crypto Utils
// =============================================================================

function getMachineId() {
  return `${os.hostname()}-${os.userInfo().username}-n8n-mcp`;
}

function getOrCreateSalt() {
  ensureDir();
  try {
    if (fs.existsSync(SALT_FILE)) {
      return fs.readFileSync(SALT_FILE, 'utf8').trim();
    }
    // Generate cryptographically secure random salt
    const salt = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SALT_FILE, salt, { mode: 0o600 });
    console.log('[auth-server] Generated new encryption salt');
    return salt;
  } catch (error) {
    console.error('Error managing salt:', error);
    // Fallback: derive from machine-specific data (still better than static)
    return crypto.createHash('sha256')
      .update(getMachineId() + os.cpus()[0]?.model + os.totalmem())
      .digest('hex');
  }
}

function deriveKey(machineId) {
  const salt = getOrCreateSalt();
  return crypto.pbkdf2Sync(machineId, salt, 100000, 32, 'sha256');
}

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData, key) {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return null;
  }
}

const ENCRYPTION_KEY = deriveKey(getMachineId());

// =============================================================================
// Auth Secret Management
// =============================================================================

function getOrCreateAuthSecret() {
  ensureDir();
  try {
    if (fs.existsSync(SECRET_FILE)) {
      return fs.readFileSync(SECRET_FILE, 'utf8').trim();
    }

    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
    console.log('[auth-server] Generated new auth secret');
    return secret;
  } catch (error) {
    console.error('Error managing auth secret:', error);
    return crypto.randomBytes(32).toString('hex');
  }
}

const AUTH_SECRET = getOrCreateAuthSecret();

function validateAuthToken(req) {
  const token = req.headers['x-auth-token'];
  if (!token || typeof token !== 'string') return false;

  // Constant-time comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(AUTH_SECRET);

  if (tokenBuffer.length !== secretBuffer.length) {
    // Still do comparison to maintain constant time
    crypto.timingSafeEqual(secretBuffer, secretBuffer);
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, secretBuffer);
}

// =============================================================================
// Local Storage (encrypted)
// =============================================================================

function readStorage() {
  ensureDir();
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
      const storage = {};

      for (const [urlKey, instance] of Object.entries(raw)) {
        storage[urlKey] = { ...instance };

        if (instance.encryptedCredentials) {
          const decrypted = decrypt(instance.encryptedCredentials, ENCRYPTION_KEY);
          if (decrypted) {
            storage[urlKey].credentials = JSON.parse(decrypted);
          }
          delete storage[urlKey].encryptedCredentials;
        }
      }

      return storage;
    }
  } catch (error) {
    console.error('Error reading storage:', error);
  }
  return {};
}

function writeStorage(data) {
  ensureDir();
  try {
    const toWrite = {};

    for (const [urlKey, instance] of Object.entries(data)) {
      toWrite[urlKey] = { ...instance };

      if (instance.credentials) {
        toWrite[urlKey].encryptedCredentials = encrypt(
          JSON.stringify(instance.credentials),
          ENCRYPTION_KEY
        );
        delete toWrite[urlKey].credentials;
      }
    }

    fs.writeFileSync(STORAGE_FILE, JSON.stringify(toWrite, null, 2), { mode: 0o600 });
  } catch (error) {
    console.error('Error writing storage:', error);
  }
}

// =============================================================================
// CORS Validation
// =============================================================================

const ALLOWED_ORIGINS = [
  'http://127.0.0.1',
  'http://localhost',
  'chrome-extension://'
];

function isAllowedOrigin(origin) {
  if (!origin) return false; // Reject missing Origin
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

function isLocalRequest(req) {
  const remoteAddr = req.socket.remoteAddress;
  return remoteAddr === '127.0.0.1' || remoteAddr === '::1' || remoteAddr === '::ffff:127.0.0.1';
}

function setCorsHeaders(res, origin) {
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // Don't set CORS headers for requests without valid Origin
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
}

// =============================================================================
// Rate Limiting
// =============================================================================

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

// =============================================================================
// HTTP Server
// =============================================================================

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const clientIp = req.socket.remoteAddress || 'unknown';

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    sendJson(res, { error: 'Too many requests' }, 429);
    return;
  }

  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // For non-GET requests, require valid Origin header OR local request
  if (req.method !== 'GET' && !isAllowedOrigin(origin) && !isLocalRequest(req)) {
    sendJson(res, { error: 'Invalid origin' }, 403);
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  try {
    // Health check - no auth required
    if (pathname === '/health' && req.method === 'GET') {
      sendJson(res, {
        status: 'ok',
        storage: 'local',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Get auth secret - for extension to retrieve on first connect
    if (pathname === '/auth-secret' && req.method === 'GET') {
      const remoteAddr = req.socket.remoteAddress;
      if (remoteAddr === '127.0.0.1' || remoteAddr === '::1' || remoteAddr === '::ffff:127.0.0.1') {
        sendJson(res, { secret: AUTH_SECRET });
      } else {
        sendJson(res, { error: 'Forbidden' }, 403);
      }
      return;
    }

    // All other endpoints require auth token
    if (!validateAuthToken(req)) {
      sendJson(res, { error: 'Unauthorized - missing or invalid X-Auth-Token' }, 401);
      return;
    }

    // List all instances
    if (pathname === '/instances' && req.method === 'GET') {
      const storage = readStorage();
      const redacted = {};
      for (const [urlKey, instance] of Object.entries(storage)) {
        redacted[urlKey] = {
          ...instance,
          credentials: instance.credentials ? { email: instance.credentials.email, password: '***' } : null
        };
      }
      sendJson(res, redacted);
      return;
    }

    // Get specific instance
    const instanceMatch = pathname.match(/^\/instance\/(.+)$/);
    if (instanceMatch && req.method === 'GET') {
      const instanceUrl = decodeURIComponent(instanceMatch[1]);
      const storage = readStorage();
      const instance = storage[instanceUrl];
      if (instance) {
        const response = {
          url: instanceUrl,
          ...instance,
          credentials: instance.credentials ? { email: instance.credentials.email, password: '***' } : null
        };
        sendJson(res, response);
      } else {
        sendJson(res, { error: 'Instance not found' }, 404);
      }
      return;
    }

    // Save instance (from extension)
    if (pathname === '/instance' && req.method === 'POST') {
      const body = await readBody(req);
      const data = JSON.parse(body);

      if (!data.url) {
        sendJson(res, { error: 'URL is required' }, 400);
        return;
      }

      const storage = readStorage();
      const existing = storage[data.url] || {};
      const instanceData = {
        sessionCookie: data.sessionCookie ?? existing.sessionCookie ?? null,
        apiKey: data.apiKey ?? existing.apiKey ?? null,
        expiry: data.expiry ?? existing.expiry ?? null,
        credentials: existing.credentials ?? null,
        pageData: data.pageData ?? existing.pageData ?? null,
        autoRefreshEnabled: data.autoRefreshEnabled ?? existing.autoRefreshEnabled ?? true,
        updatedAt: new Date().toISOString()
      };
      storage[data.url] = instanceData;
      writeStorage(storage);

      const expiryInfo = data.expiry ? ` (expires: ${new Date(data.expiry).toISOString()})` : '';
      console.log(`[auth-server] Saved ${data.url}${expiryInfo}`);
      sendJson(res, { success: true, url: data.url });
      return;
    }

    // Store credentials for auto-refresh
    if (pathname === '/credentials' && req.method === 'POST') {
      const body = await readBody(req);
      const data = JSON.parse(body);

      if (!data.url || !data.email || !data.password) {
        sendJson(res, { error: 'url, email, and password are required' }, 400);
        return;
      }

      const storage = readStorage();
      const existing = storage[data.url] || {};
      storage[data.url] = {
        ...existing,
        credentials: { email: data.email, password: data.password },
        autoRefreshEnabled: true,
        updatedAt: new Date().toISOString()
      };
      writeStorage(storage);

      console.log(`[auth-server] Stored encrypted credentials for ${data.url}`);
      sendJson(res, { success: true, autoRefreshEnabled: true });
      return;
    }

    // Check cookie expiry
    if (pathname === '/expiry-check' && req.method === 'GET') {
      const urlParam = parsedUrl.query.url;
      if (!urlParam) {
        sendJson(res, { error: 'url parameter required' }, 400);
        return;
      }

      const storage = readStorage();
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
        canAutoRefresh: !!instance.credentials && instance.autoRefreshEnabled
      });
      return;
    }

    // Delete instance
    if (instanceMatch && req.method === 'DELETE') {
      const instanceUrl = decodeURIComponent(instanceMatch[1]);
      const storage = readStorage();
      delete storage[instanceUrl];
      writeStorage(storage);
      sendJson(res, { success: true });
      return;
    }

    sendJson(res, { error: 'Not found' }, 404);
  } catch (error) {
    console.error('Request error:', error);
    // Don't leak internal error details
    const safeMessage = error.message === 'Request body too large'
      ? 'Request body too large'
      : 'Internal server error';
    sendJson(res, { error: safeMessage }, 500);
  }
});

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk;
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// =============================================================================
// Start Server
// =============================================================================

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local Creds Server running at http://127.0.0.1:${PORT}`);
  console.log('');
  console.log('Security:');
  console.log('  ✓ Local-only storage (credentials never leave machine)');
  console.log('  ✓ AES-256-GCM encryption with machine-bound key');
  console.log('  ✓ Per-installation random salt');
  console.log('  ✓ Constant-time token comparison');
  console.log('  ✓ CORS restricted to localhost + chrome-extension');
  console.log('  ✓ Rate limiting (100 req/min)');
  console.log('  ✓ Request body size limit (1MB)');
  console.log('');
  console.log(`Storage: ${CREDS_DIR}`);
  console.log(`  n8n.json - n8n credentials (encrypted)`);
  console.log('');
  console.log('Endpoints (n8n):');
  console.log('  GET  /health        - Health check (no auth)');
  console.log('  GET  /auth-secret   - Get auth token (localhost only)');
  console.log('  GET  /instances     - List n8n instances');
  console.log('  GET  /instance/:url - Get specific instance');
  console.log('  POST /instance      - Save instance');
  console.log('  POST /credentials   - Store login credentials');
  console.log('  DELETE /instance/:url - Delete instance');
  console.log('');
});
