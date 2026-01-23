#!/usr/bin/env node
/**
 * n8n MCP Auth - Native Messaging Host
 *
 * This script acts as a bridge between the Chrome extension and the MCP server.
 * It reads messages from the extension and writes responses back.
 *
 * Setup:
 * 1. Install this as a native messaging host
 * 2. Configure manifest in Chrome's native messaging hosts directory
 */

const fs = require('fs');
const path = require('path');

// Storage file for credentials
const STORAGE_FILE = path.join(__dirname, '.n8n-auth-cache.json');

// =============================================================================
// Storage
// =============================================================================

function readStorage() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading storage:', error);
  }
  return {};
}

function writeStorage(data) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing storage:', error);
  }
}

// =============================================================================
// Native Messaging Protocol
// =============================================================================

function readMessage() {
  return new Promise((resolve, reject) => {
    let dataBuffer = Buffer.alloc(0);
    let messageLength = null;

    process.stdin.on('data', (chunk) => {
      dataBuffer = Buffer.concat([dataBuffer, chunk]);

      // Read message length (4 bytes, little-endian)
      if (messageLength === null && dataBuffer.length >= 4) {
        messageLength = dataBuffer.readUInt32LE(0);
        dataBuffer = dataBuffer.slice(4);
      }

      // Read message content
      if (messageLength !== null && dataBuffer.length >= messageLength) {
        const messageJson = dataBuffer.slice(0, messageLength).toString('utf8');
        try {
          resolve(JSON.parse(messageJson));
        } catch (error) {
          reject(error);
        }
      }
    });

    process.stdin.on('end', () => {
      reject(new Error('stdin closed'));
    });
  });
}

function writeMessage(message) {
  const messageJson = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageJson, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

  process.stdout.write(lengthBuffer);
  process.stdout.write(messageBuffer);
}

// =============================================================================
// Message Handlers
// =============================================================================

async function handleMessage(message) {
  const storage = readStorage();

  switch (message.action) {
    case 'save':
      storage[message.url] = {
        sessionCookie: message.sessionCookie,
        apiKey: message.apiKey,
        updatedAt: new Date().toISOString()
      };
      writeStorage(storage);
      return { success: true };

    case 'get':
      return storage[message.url] || null;

    case 'getAll':
      return storage;

    case 'delete':
      delete storage[message.url];
      writeStorage(storage);
      return { success: true };

    default:
      return { error: `Unknown action: ${message.action}` };
  }
}

// =============================================================================
// Main Loop
// =============================================================================

async function main() {
  while (true) {
    try {
      const message = await readMessage();
      const response = await handleMessage(message);
      writeMessage(response);
    } catch (error) {
      if (error.message === 'stdin closed') {
        break;
      }
      writeMessage({ error: error.message });
    }
  }
}

main().catch(console.error);
