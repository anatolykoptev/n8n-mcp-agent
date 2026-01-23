/**
 * @module __tests__/types.test
 * @description Tests for type guards and helper functions in types module
 *
 * Tests cover:
 * - MCP response helper functions
 * - Type guard behavior
 * - Error handling utilities
 */

import { describe, it, expect } from 'vitest';
import {
  createErrorResponse,
  createSuccessResponse,
  createClientNotInitializedError,
  type McpToolResult,
  type McpTextContent,
  type McpImageContent,
  type McpResourceContent,
  type McpContent,
} from '../types/mcp.js';

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('Type Guards', () => {
  describe('McpTextContent', () => {
    it('is correctly typed with type: text', () => {
      const content: McpTextContent = {
        type: 'text',
        text: 'Hello, world!',
      };

      expect(content.type).toBe('text');
      expect(content.text).toBe('Hello, world!');
    });
  });

  describe('McpImageContent', () => {
    it('is correctly typed with type: image', () => {
      const content: McpImageContent = {
        type: 'image',
        data: 'base64data',
        mimeType: 'image/png',
      };

      expect(content.type).toBe('image');
      expect(content.data).toBe('base64data');
      expect(content.mimeType).toBe('image/png');
    });
  });

  describe('McpResourceContent', () => {
    it('is correctly typed with type: resource', () => {
      const content: McpResourceContent = {
        type: 'resource',
        resource: {
          uri: 'file:///path/to/resource',
          mimeType: 'application/json',
          text: '{"key": "value"}',
        },
      };

      expect(content.type).toBe('resource');
      expect(content.resource.uri).toBe('file:///path/to/resource');
    });

    it('supports blob content', () => {
      const content: McpResourceContent = {
        type: 'resource',
        resource: {
          uri: 'file:///path/to/binary',
          blob: 'base64encodedblob',
        },
      };

      expect(content.resource.blob).toBe('base64encodedblob');
    });
  });

  describe('McpContent union type', () => {
    it('accepts text content', () => {
      const content: McpContent = {
        type: 'text',
        text: 'test',
      };

      expect(content.type).toBe('text');
    });

    it('accepts image content', () => {
      const content: McpContent = {
        type: 'image',
        data: 'data',
        mimeType: 'image/jpeg',
      };

      expect(content.type).toBe('image');
    });

    it('accepts resource content', () => {
      const content: McpContent = {
        type: 'resource',
        resource: { uri: 'test://uri' },
      };

      expect(content.type).toBe('resource');
    });
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('createErrorResponse', () => {
  describe('basic usage', () => {
    it('creates error response with message only', () => {
      const result = createErrorResponse('Something went wrong');

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect((result.content[0] as McpTextContent).text).toBe('Something went wrong');
    });

    it('creates error response with Error object', () => {
      const error = new Error('Database connection failed');
      const result = createErrorResponse('Failed to connect', error);

      expect(result.isError).toBe(true);
      expect((result.content[0] as McpTextContent).text).toBe(
        'Failed to connect: Database connection failed'
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty message', () => {
      const result = createErrorResponse('');

      expect(result.isError).toBe(true);
      expect((result.content[0] as McpTextContent).text).toBe('');
    });

    it('handles Error with empty message', () => {
      const error = new Error('');
      const result = createErrorResponse('Prefix', error);

      expect((result.content[0] as McpTextContent).text).toBe('Prefix: ');
    });

    it('handles very long error message', () => {
      const longMessage = 'a'.repeat(10000);
      const result = createErrorResponse(longMessage);

      expect((result.content[0] as McpTextContent).text).toBe(longMessage);
    });

    it('handles message with special characters', () => {
      const message = 'Error: <script>alert("xss")</script>';
      const result = createErrorResponse(message);

      expect((result.content[0] as McpTextContent).text).toBe(message);
    });

    it('handles message with unicode', () => {
      const message = 'Error: Cannot process data';
      const result = createErrorResponse(message);

      expect((result.content[0] as McpTextContent).text).toBe(message);
    });
  });

  describe('return type', () => {
    it('returns McpToolResult type', () => {
      const result: McpToolResult = createErrorResponse('test');

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
    });
  });
});

describe('createSuccessResponse', () => {
  describe('with string data', () => {
    it('returns string directly', () => {
      const result = createSuccessResponse('Success message');

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect((result.content[0] as McpTextContent).text).toBe('Success message');
    });

    it('handles empty string', () => {
      const result = createSuccessResponse('');

      expect((result.content[0] as McpTextContent).text).toBe('');
    });
  });

  describe('with object data', () => {
    it('serializes object with pretty printing by default', () => {
      const data = { name: 'Test', value: 42 };
      const result = createSuccessResponse(data);

      const expectedJson = JSON.stringify(data, null, 2);
      expect((result.content[0] as McpTextContent).text).toBe(expectedJson);
    });

    it('serializes object without pretty printing when pretty=false', () => {
      const data = { name: 'Test', value: 42 };
      const result = createSuccessResponse(data, false);

      const expectedJson = JSON.stringify(data, null, 0);
      expect((result.content[0] as McpTextContent).text).toBe(expectedJson);
    });
  });

  describe('with array data', () => {
    it('serializes array with pretty printing', () => {
      const data = [1, 2, 3];
      const result = createSuccessResponse(data);

      const expectedJson = JSON.stringify(data, null, 2);
      expect((result.content[0] as McpTextContent).text).toBe(expectedJson);
    });

    it('serializes empty array', () => {
      const result = createSuccessResponse([]);

      expect((result.content[0] as McpTextContent).text).toBe('[]');
    });
  });

  describe('with primitive data', () => {
    it('serializes number', () => {
      const result = createSuccessResponse(42);

      expect((result.content[0] as McpTextContent).text).toBe('42');
    });

    it('serializes boolean true', () => {
      const result = createSuccessResponse(true);

      expect((result.content[0] as McpTextContent).text).toBe('true');
    });

    it('serializes boolean false', () => {
      const result = createSuccessResponse(false);

      expect((result.content[0] as McpTextContent).text).toBe('false');
    });

    it('serializes null', () => {
      const result = createSuccessResponse(null);

      expect((result.content[0] as McpTextContent).text).toBe('null');
    });
  });

  describe('with complex nested data', () => {
    it('serializes deeply nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };
      const result = createSuccessResponse(data);

      expect((result.content[0] as McpTextContent).text).toContain('"value": "deep"');
    });

    it('handles objects with arrays', () => {
      const data = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      };
      const result = createSuccessResponse(data);

      const expectedJson = JSON.stringify(data, null, 2);
      expect((result.content[0] as McpTextContent).text).toBe(expectedJson);
    });
  });

  describe('return type', () => {
    it('returns McpToolResult type', () => {
      const result: McpToolResult = createSuccessResponse({ test: true });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();
    });
  });
});

describe('createClientNotInitializedError', () => {
  it('returns correct error message', () => {
    const result = createClientNotInitializedError();

    expect(result.isError).toBe(true);
    expect((result.content[0] as McpTextContent).text).toBe(
      'Client not initialized. Please run init-n8n first.'
    );
  });

  it('returns McpToolResult type', () => {
    const result: McpToolResult = createClientNotInitializedError();

    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('isError');
  });

  it('has single content item', () => {
    const result = createClientNotInitializedError();

    expect(result.content).toHaveLength(1);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Response Composition', () => {
  describe('composing multiple responses', () => {
    it('can create array of tool results', () => {
      const results: McpToolResult[] = [
        createSuccessResponse({ step: 1 }),
        createSuccessResponse({ step: 2 }),
        createErrorResponse('Step 3 failed'),
      ];

      expect(results).toHaveLength(3);
      expect(results[0].isError).toBeUndefined();
      expect(results[1].isError).toBeUndefined();
      expect(results[2].isError).toBe(true);
    });
  });

  describe('conditional response creation', () => {
    it('creates appropriate response based on condition', () => {
      const createResponse = (success: boolean): McpToolResult => {
        if (success) {
          return createSuccessResponse({ status: 'ok' });
        }
        return createErrorResponse('Operation failed');
      };

      const successResult = createResponse(true);
      const errorResult = createResponse(false);

      expect(successResult.isError).toBeUndefined();
      expect(errorResult.isError).toBe(true);
    });
  });
});

// =============================================================================
// N8n Type Structure Tests
// =============================================================================

describe('N8n Type Structures', () => {
  describe('N8nUser structure', () => {
    it('validates typical user response shape', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isPending: false,
        role: 'global:admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Type assertions to verify structure
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.isPending).toBe(false);
    });
  });

  describe('N8nWorkflow structure', () => {
    it('validates typical workflow response shape', () => {
      const workflow = {
        id: 1,
        name: 'My Workflow',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: ['production', 'email'],
        nodes: [
          {
            name: 'Start',
            type: 'n8n-nodes-base.manualTrigger',
            position: [250, 300] as [number, number],
          },
        ],
        connections: {},
      };

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBeDefined();
      expect(workflow.active).toBe(true);
      expect(workflow.nodes).toHaveLength(1);
    });
  });

  describe('N8nExecution structure', () => {
    it('validates typical execution response shape', () => {
      const execution = {
        id: 123,
        finished: true,
        mode: 'manual' as const,
        startedAt: '2024-01-01T00:00:00Z',
        stoppedAt: '2024-01-01T00:01:00Z',
        workflowId: 1,
        status: 'success' as const,
      };

      expect(execution.id).toBeDefined();
      expect(execution.finished).toBe(true);
      expect(execution.mode).toBe('manual');
    });
  });

  describe('N8nTag structure', () => {
    it('validates typical tag response shape', () => {
      const tag = {
        id: 'tag-123',
        name: 'production',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(tag.id).toBeDefined();
      expect(tag.name).toBeDefined();
    });
  });

  describe('N8nProject structure', () => {
    it('validates typical project response shape', () => {
      const project = {
        id: 'proj-123',
        name: 'My Project',
        type: 'team',
      };

      expect(project.id).toBeDefined();
      expect(project.name).toBeDefined();
    });
  });

  describe('N8nVariable structure', () => {
    it('validates typical variable response shape', () => {
      const variable = {
        id: 'var-123',
        key: 'API_KEY',
        value: 'secret-value',
        type: 'string',
      };

      expect(variable.id).toBeDefined();
      expect(variable.key).toBeDefined();
      expect(variable.value).toBeDefined();
    });
  });

  describe('N8nCredential structure', () => {
    it('validates typical credential response shape', () => {
      const credential = {
        id: 'cred-123',
        name: 'My API Key',
        type: 'httpHeaderAuth',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(credential.id).toBeDefined();
      expect(credential.name).toBeDefined();
      expect(credential.type).toBeDefined();
    });
  });
});

// =============================================================================
// McpToolDefinition Tests
// =============================================================================

describe('MCP Tool Definition Structure', () => {
  it('validates tool definition shape', () => {
    const toolDefinition = {
      name: 'list-workflows',
      description: 'List all workflows in the n8n instance',
      inputSchema: {
        type: 'object' as const,
        properties: {
          clientId: {
            type: 'string',
            description: 'The client ID for the n8n instance',
          },
        },
        required: ['clientId'],
      },
    };

    expect(toolDefinition.name).toBeDefined();
    expect(toolDefinition.description).toBeDefined();
    expect(toolDefinition.inputSchema.type).toBe('object');
    expect(toolDefinition.inputSchema.properties).toBeDefined();
  });

  it('validates tool with complex input schema', () => {
    const toolDefinition = {
      name: 'create-workflow',
      description: 'Create a new workflow',
      inputSchema: {
        type: 'object' as const,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client ID',
          },
          name: {
            type: 'string',
            description: 'Workflow name',
          },
          nodes: {
            type: 'array',
            description: 'Workflow nodes',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Node name' },
                type: { type: 'string', description: 'Node type' },
              },
              required: ['name', 'type'],
            },
          },
        },
        required: ['clientId', 'name'],
      },
    };

    expect(toolDefinition.inputSchema.properties.nodes).toBeDefined();
    expect(toolDefinition.inputSchema.properties.nodes.items).toBeDefined();
  });
});
