/**
 * n8n MCP Bridge - Fully Automatic Background Service
 *
 * AI-first design: Zero user interaction required.
 * - Auto-captures cookies on any n8n page visit
 * - Auto-refreshes before expiry
 * - Stores credentials locally via auth-server (localhost:19847)
 * - Credentials never leave the machine
 */

// Local auth server (no remote storage, no hardcoded keys)
const AUTH_SERVER_URL = 'http://127.0.0.1:19847';

const REFRESH_ALARM = 'n8n-cookie-refresh';
const REFRESH_INTERVAL_MINUTES = 60;
const EXPIRY_THRESHOLD_HOURS = 24;

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE = {
  AUTH_TOKEN: 'auth_server_token',
  INSTANCES: 'n8n_instances'
};

// =============================================================================
// Auth Server Communication
// =============================================================================

let authToken = null;

async function getAuthToken() {
  if (authToken) return authToken;

  // Try to get from storage first
  const stored = await chrome.storage.local.get(STORAGE.AUTH_TOKEN);
  if (stored[STORAGE.AUTH_TOKEN]) {
    authToken = stored[STORAGE.AUTH_TOKEN];
    return authToken;
  }

  // Fetch from auth server (localhost only endpoint)
  try {
    const res = await fetch(`${AUTH_SERVER_URL}/auth-secret`);
    if (res.ok) {
      const data = await res.json();
      authToken = data.secret;
      await chrome.storage.local.set({ [STORAGE.AUTH_TOKEN]: authToken });
      console.log('[n8n-mcp] Got auth token from server');
      return authToken;
    }
  } catch (e) {
    console.error('[n8n-mcp] Auth server not running:', e.message);
  }

  return null;
}

async function isAuthServerRunning() {
  try {
    const res = await fetch(`${AUTH_SERVER_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function pushToAuthServer(instanceUrl, data) {
  const token = await getAuthToken();
  if (!token) {
    console.error('[n8n-mcp] No auth token, auth-server not running?');
    return false;
  }

  try {
    const payload = {
      url: instanceUrl,
      sessionCookie: data.sessionCookie || null,
      apiKey: data.apiKey || null,
      expiry: data.expiry || null,
      autoRefreshEnabled: data.autoRefreshEnabled ?? true,
      pageData: data.pageData || null
    };

    const res = await fetch(`${AUTH_SERVER_URL}/instance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(`[n8n-mcp] Saved to local storage: ${instanceUrl}`);
      return true;
    } else {
      const err = await res.json();
      console.error(`[n8n-mcp] Auth server error:`, err);
      return false;
    }
  } catch (e) {
    console.error(`[n8n-mcp] Failed to save:`, e);
    return false;
  }
}

async function pushCredentialsToAuthServer(instanceUrl, email, password) {
  const token = await getAuthToken();
  if (!token) return false;

  try {
    const res = await fetch(`${AUTH_SERVER_URL}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token
      },
      body: JSON.stringify({ url: instanceUrl, email, password })
    });

    if (res.ok) {
      console.log(`[n8n-mcp] Credentials saved for ${instanceUrl}`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// =============================================================================
// JWT Utils
// =============================================================================

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getExpiryFromCookie(cookieValue) {
  const payload = parseJwt(cookieValue);
  return payload?.exp ? payload.exp * 1000 : null;
}

function hoursUntilExpiry(expiryMs) {
  return (expiryMs - Date.now()) / (1000 * 60 * 60);
}

// =============================================================================
// Cookie Management
// =============================================================================

async function getAllN8nCookies() {
  const cookies = await chrome.cookies.getAll({ name: 'n8n-auth' });
  return cookies.map(c => ({
    domain: c.domain,
    url: `https://${c.domain.replace(/^\./, '')}`,
    value: c.value,
    cookie: `n8n-auth=${c.value}`,
    expiry: getExpiryFromCookie(c.value)
  }));
}

async function syncAllCookies() {
  const running = await isAuthServerRunning();
  if (!running) {
    console.log('[n8n-mcp] Auth server not running, skipping sync');
    return [];
  }

  const cookies = await getAllN8nCookies();

  for (const c of cookies) {
    await pushToAuthServer(c.url, {
      sessionCookie: c.cookie,
      expiry: c.expiry
    });
  }

  console.log(`[n8n-mcp] Synced ${cookies.length} cookies`);
  return cookies;
}

// =============================================================================
// Auto-Login (if credentials stored)
// =============================================================================

async function getStoredCredentials(url) {
  const result = await chrome.storage.local.get(STORAGE.INSTANCES);
  const instances = result[STORAGE.INSTANCES] || {};
  return instances[url]?.credentials || null;
}

async function storeCredentials(url, email, password) {
  // Store locally for extension
  const result = await chrome.storage.local.get(STORAGE.INSTANCES);
  const instances = result[STORAGE.INSTANCES] || {};
  instances[url] = instances[url] || {};
  instances[url].credentials = { email, password };
  await chrome.storage.local.set({ [STORAGE.INSTANCES]: instances });

  // Push to auth-server
  await pushCredentialsToAuthServer(url, email, password);
}

async function autoLogin(url) {
  const creds = await getStoredCredentials(url);
  if (!creds) {
    console.log(`[n8n-mcp] No stored credentials for ${url}`);
    return false;
  }

  try {
    const response = await fetch(`${url}/rest/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrLdapLoginId: creds.email,
        password: creds.password
      }),
      credentials: 'include'
    });

    if (response.ok) {
      console.log(`[n8n-mcp] Auto-login successful for ${url}`);
      return true;
    }
  } catch (e) {
    console.error(`[n8n-mcp] Auto-login failed:`, e);
  }
  return false;
}

// =============================================================================
// Auto-Refresh Logic
// =============================================================================

async function checkAndRefreshCookies() {
  console.log('[n8n-mcp] Checking cookie expiry...');
  const cookies = await getAllN8nCookies();

  for (const c of cookies) {
    if (!c.expiry) continue;

    const hours = hoursUntilExpiry(c.expiry);
    console.log(`[n8n-mcp] ${c.url}: ${hours.toFixed(1)}h until expiry`);

    if (hours < EXPIRY_THRESHOLD_HOURS) {
      console.log(`[n8n-mcp] Cookie expiring soon, attempting refresh...`);
      await autoLogin(c.url);
    }
  }
}

// =============================================================================
// Event Listeners
// =============================================================================

// Cookie changes - auto-sync
chrome.cookies.onChanged.addListener(async ({ cookie, removed }) => {
  if (cookie.name !== 'n8n-auth') return;

  const url = `https://${cookie.domain.replace(/^\./, '')}`;

  if (removed) {
    console.log(`[n8n-mcp] Cookie removed for ${url}`);
    await pushToAuthServer(url, { sessionCookie: null });
  } else {
    const expiry = getExpiryFromCookie(cookie.value);
    console.log(`[n8n-mcp] Cookie updated for ${url}`);
    await pushToAuthServer(url, {
      sessionCookie: `n8n-auth=${cookie.value}`,
      expiry
    });
  }
});

// Messages from content script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'N8N_PAGE_DATA') {
    console.log('[n8n-mcp] Page data:', msg.data);
    pushToAuthServer(msg.data.url, msg.data);
    sendResponse({ ok: true });
  }

  if (msg.type === 'STORE_CREDENTIALS') {
    storeCredentials(msg.url, msg.email, msg.password)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.type === 'SYNC_NOW') {
    syncAllCookies()
      .then(cookies => sendResponse({ ok: true, count: cookies.length }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

// Periodic refresh alarm
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === REFRESH_ALARM) {
    checkAndRefreshCookies();
  }
});

// Extension click - manual sync
chrome.action.onClicked.addListener(async () => {
  const running = await isAuthServerRunning();
  const cookies = running ? await syncAllCookies() : [];

  // Badge shows status
  chrome.action.setBadgeText({ text: running ? `${cookies.length}` : '!' });
  chrome.action.setBadgeBackgroundColor({ color: running ? '#2ed573' : '#ff4757' });
});

// =============================================================================
// Startup
// =============================================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log('[n8n-mcp] Extension installed');

  chrome.alarms.create(REFRESH_ALARM, {
    periodInMinutes: REFRESH_INTERVAL_MINUTES
  });

  syncAllCookies();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[n8n-mcp] Browser started');
  syncAllCookies();
});

console.log('[n8n-mcp] Background service loaded (local storage mode)');
