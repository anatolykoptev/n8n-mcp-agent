/**
 * @module __tests__/setup
 * @description Test setup and global mocks for n8n MCP server tests
 */

import { vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Global Test Utilities
// =============================================================================

/**
 * Valid test data fixtures
 */
export const fixtures = {
  clientId: {
    valid: 'dGVzdC1jbGllbnQ=', // base64 encoded
    invalid: 'invalid!!!',
    empty: '',
  },
  url: {
    valid: 'https://n8n.example.com',
    validHttp: 'http://n8n.example.com',
    localhost: 'http://localhost:5678',
    loopback: 'http://127.0.0.1:5678',
    internalClassA: 'http://10.0.0.1:5678',
    internalClassB: 'http://172.16.0.1:5678',
    internalClassC: 'http://192.168.1.1:5678',
    linkLocal: 'http://169.254.1.1:5678',
    ipv6Loopback: 'http://[::1]:5678',
    zeroAddress: 'http://0.0.0.0:5678',
    invalidFormat: 'not-a-url',
    empty: '',
  },
  apiKey: {
    valid: 'n8n_api_key_12345678',
    withSpaces: 'key with spaces',
    empty: '',
  },
  workflowId: {
    validString: 'workflow-123',
    validNumber: 42,
    invalidNegative: -1,
    invalidZero: 0,
    invalidFloat: 3.14,
    empty: '',
  },
  executionId: {
    valid: 123,
    invalidNegative: -1,
    invalidZero: 0,
    invalidFloat: 3.14,
  },
  email: {
    valid: 'test@example.com',
    invalid: 'not-an-email',
    empty: '',
  },
  tagName: {
    valid: 'my-tag',
    tooLong: 'a'.repeat(101),
    empty: '',
  },
  projectName: {
    valid: 'My Project',
    tooLong: 'a'.repeat(256),
    empty: '',
  },
  workflowName: {
    valid: 'My Workflow',
    tooLong: 'a'.repeat(256),
    empty: '',
  },
};

// =============================================================================
// Mock Fetch
// =============================================================================

/**
 * Create a mock fetch response
 */
export function createMockResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: 'https://mock.test',
    clone: () => createMockResponse(data, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
  } as Response;
}

/**
 * Setup mock fetch with default implementation
 */
export function setupMockFetch(): ReturnType<typeof vi.fn> {
  const mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

// =============================================================================
// Test Lifecycle Hooks
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// =============================================================================
// Type Guards for Testing
// =============================================================================

/**
 * Check if value is a ZodError
 */
export function isZodError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
  );
}

/**
 * Get error message from ZodError or Error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as { issues: Array<{ message: string }> }).issues)
  ) {
    return (error as { issues: Array<{ message: string }> }).issues
      .map((i) => i.message)
      .join(', ');
  }
  return String(error);
}
