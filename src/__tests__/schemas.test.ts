/**
 * @module __tests__/schemas.test
 * @description Comprehensive tests for Zod validation schemas
 *
 * Tests cover:
 * - Valid input acceptance
 * - Invalid input rejection
 * - SSRF URL blocking (localhost, internal IPs)
 * - Edge cases and boundary conditions
 */

import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  ClientIdSchema,
  N8nUrlSchema,
  ApiKeySchema,
  WorkflowIdSchema,
  ExecutionIdSchema,
  TagIdSchema,
  UserIdOrEmailSchema,
  ProjectIdSchema,
  VariableIdSchema,
  CredentialIdSchema,
  InitN8nSchema,
  ListWorkflowsSchema,
  GetWorkflowSchema,
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  DeleteWorkflowSchema,
  ActivateWorkflowSchema,
  DeactivateWorkflowSchema,
  ListUsersSchema,
  CreateUsersSchema,
  GetUserSchema,
  DeleteUserSchema,
  ListProjectsSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  DeleteProjectSchema,
  ListExecutionsSchema,
  GetExecutionSchema,
  DeleteExecutionSchema,
  ListTagsSchema,
  CreateTagSchema,
  GetTagSchema,
  UpdateTagSchema,
  DeleteTagSchema,
  GetWorkflowTagsSchema,
  UpdateWorkflowTagsSchema,
  ListVariablesSchema,
  CreateVariableSchema,
  DeleteVariableSchema,
  CreateCredentialSchema,
  DeleteCredentialSchema,
  GetCredentialSchemaSchema,
  GenerateAuditSchema,
} from '../schemas/tool-inputs.js';
import { fixtures } from './setup.js';

// =============================================================================
// Base Schemas Tests
// =============================================================================

describe('ClientIdSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid base64 encoded string', () => {
      const result = ClientIdSchema.safeParse(fixtures.clientId.valid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(fixtures.clientId.valid);
      }
    });

    it('accepts string with equals sign padding', () => {
      const result = ClientIdSchema.safeParse('YWJjZA==');

      expect(result.success).toBe(true);
    });

    it('accepts string with plus sign', () => {
      const result = ClientIdSchema.safeParse('YWJj+ZA=');

      expect(result.success).toBe(true);
    });

    it('accepts string with slash', () => {
      const result = ClientIdSchema.safeParse('YWJj/ZA=');

      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      const result = ClientIdSchema.safeParse(fixtures.clientId.empty);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('clientId is required');
      }
    });

    it('rejects invalid characters', () => {
      const result = ClientIdSchema.safeParse(fixtures.clientId.invalid);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid clientId format');
      }
    });

    it('rejects string with spaces', () => {
      const result = ClientIdSchema.safeParse('abc def');

      expect(result.success).toBe(false);
    });

    it('rejects null', () => {
      const result = ClientIdSchema.safeParse(null);

      expect(result.success).toBe(false);
    });

    it('rejects undefined', () => {
      const result = ClientIdSchema.safeParse(undefined);

      expect(result.success).toBe(false);
    });

    it('rejects number', () => {
      const result = ClientIdSchema.safeParse(12345);

      expect(result.success).toBe(false);
    });
  });
});

describe('N8nUrlSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid HTTPS URL', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.valid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(fixtures.url.valid);
      }
    });

    it('accepts valid HTTP URL', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.validHttp);

      expect(result.success).toBe(true);
    });

    it('accepts URL with port', () => {
      const result = N8nUrlSchema.safeParse('https://n8n.example.com:8080');

      expect(result.success).toBe(true);
    });

    it('accepts URL with path', () => {
      const result = N8nUrlSchema.safeParse('https://n8n.example.com/api/v1');

      expect(result.success).toBe(true);
    });
  });

  describe('SSRF protection - blocked hosts', () => {
    it('rejects localhost', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.localhost);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('external HTTPS endpoint');
      }
    });

    it('rejects 127.0.0.1', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.loopback);

      expect(result.success).toBe(false);
    });

    it('rejects 0.0.0.0', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.zeroAddress);

      expect(result.success).toBe(false);
    });

    // IPv6 loopback [::1] is now properly blocked
    it('rejects IPv6 loopback [::1]', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.ipv6Loopback);

      expect(result.success).toBe(false);
    });
  });

  describe('SSRF protection - internal IPs', () => {
    it('rejects Class A private IP (10.x.x.x)', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.internalClassA);

      expect(result.success).toBe(false);
    });

    it('rejects Class B private IP (172.16-31.x.x)', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.internalClassB);

      expect(result.success).toBe(false);
    });

    it('rejects 172.16.0.1', () => {
      const result = N8nUrlSchema.safeParse('http://172.16.0.1:5678');

      expect(result.success).toBe(false);
    });

    it('rejects 172.31.255.255', () => {
      const result = N8nUrlSchema.safeParse('http://172.31.255.255:5678');

      expect(result.success).toBe(false);
    });

    it('accepts 172.32.0.1 (outside private range)', () => {
      // 172.32.x.x is NOT in the private range
      const result = N8nUrlSchema.safeParse('http://172.32.0.1:5678');

      expect(result.success).toBe(true);
    });

    it('rejects Class C private IP (192.168.x.x)', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.internalClassC);

      expect(result.success).toBe(false);
    });

    it('rejects link-local address (169.254.x.x)', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.linkLocal);

      expect(result.success).toBe(false);
    });
  });

  describe('invalid format', () => {
    it('rejects invalid URL format', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.invalidFormat);

      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = N8nUrlSchema.safeParse(fixtures.url.empty);

      expect(result.success).toBe(false);
    });

    it('rejects null', () => {
      const result = N8nUrlSchema.safeParse(null);

      expect(result.success).toBe(false);
    });

    it('rejects FTP protocol', () => {
      const result = N8nUrlSchema.safeParse('ftp://example.com');

      expect(result.success).toBe(false);
    });

    it('rejects file protocol', () => {
      const result = N8nUrlSchema.safeParse('file:///etc/passwd');

      expect(result.success).toBe(false);
    });
  });
});

describe('ApiKeySchema', () => {
  describe('valid inputs', () => {
    it('accepts valid API key', () => {
      const result = ApiKeySchema.safeParse(fixtures.apiKey.valid);

      expect(result.success).toBe(true);
    });

    it('accepts API key with special characters', () => {
      const result = ApiKeySchema.safeParse('api_key-123_456');

      expect(result.success).toBe(true);
    });

    it('accepts single character', () => {
      const result = ApiKeySchema.safeParse('a');

      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects API key with spaces', () => {
      const result = ApiKeySchema.safeParse(fixtures.apiKey.withSpaces);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot contain spaces');
      }
    });

    it('rejects empty string', () => {
      const result = ApiKeySchema.safeParse(fixtures.apiKey.empty);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('apiKey is required');
      }
    });

    it('rejects null', () => {
      const result = ApiKeySchema.safeParse(null);

      expect(result.success).toBe(false);
    });
  });
});

describe('WorkflowIdSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid string ID', () => {
      const result = WorkflowIdSchema.safeParse(fixtures.workflowId.validString);

      expect(result.success).toBe(true);
    });

    it('accepts valid number ID', () => {
      const result = WorkflowIdSchema.safeParse(fixtures.workflowId.validNumber);

      expect(result.success).toBe(true);
    });

    it('accepts number 1', () => {
      const result = WorkflowIdSchema.safeParse(1);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      const result = WorkflowIdSchema.safeParse(fixtures.workflowId.empty);

      expect(result.success).toBe(false);
    });

    it('rejects negative number', () => {
      const result = WorkflowIdSchema.safeParse(fixtures.workflowId.invalidNegative);

      expect(result.success).toBe(false);
    });

    it('rejects zero', () => {
      const result = WorkflowIdSchema.safeParse(fixtures.workflowId.invalidZero);

      expect(result.success).toBe(false);
    });

    it('rejects float', () => {
      const result = WorkflowIdSchema.safeParse(fixtures.workflowId.invalidFloat);

      expect(result.success).toBe(false);
    });

    it('rejects null', () => {
      const result = WorkflowIdSchema.safeParse(null);

      expect(result.success).toBe(false);
    });
  });
});

describe('ExecutionIdSchema', () => {
  describe('valid inputs', () => {
    it('accepts positive integer', () => {
      const result = ExecutionIdSchema.safeParse(fixtures.executionId.valid);

      expect(result.success).toBe(true);
    });

    it('accepts 1', () => {
      const result = ExecutionIdSchema.safeParse(1);

      expect(result.success).toBe(true);
    });

    it('accepts large number', () => {
      const result = ExecutionIdSchema.safeParse(999999);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects negative number', () => {
      const result = ExecutionIdSchema.safeParse(fixtures.executionId.invalidNegative);

      expect(result.success).toBe(false);
    });

    it('rejects zero', () => {
      const result = ExecutionIdSchema.safeParse(fixtures.executionId.invalidZero);

      expect(result.success).toBe(false);
    });

    it('rejects float', () => {
      const result = ExecutionIdSchema.safeParse(fixtures.executionId.invalidFloat);

      expect(result.success).toBe(false);
    });

    it('rejects string', () => {
      const result = ExecutionIdSchema.safeParse('123');

      expect(result.success).toBe(false);
    });
  });
});

describe('TagIdSchema', () => {
  it('accepts non-empty string', () => {
    const result = TagIdSchema.safeParse('tag-123');

    expect(result.success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = TagIdSchema.safeParse('');

    expect(result.success).toBe(false);
  });
});

describe('UserIdOrEmailSchema', () => {
  it('accepts non-empty string', () => {
    const result = UserIdOrEmailSchema.safeParse('user@example.com');

    expect(result.success).toBe(true);
  });

  it('accepts user ID', () => {
    const result = UserIdOrEmailSchema.safeParse('user-123');

    expect(result.success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = UserIdOrEmailSchema.safeParse('');

    expect(result.success).toBe(false);
  });
});

describe('ProjectIdSchema', () => {
  it('accepts non-empty string', () => {
    const result = ProjectIdSchema.safeParse('project-123');

    expect(result.success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = ProjectIdSchema.safeParse('');

    expect(result.success).toBe(false);
  });
});

describe('VariableIdSchema', () => {
  it('accepts non-empty string', () => {
    const result = VariableIdSchema.safeParse('var-123');

    expect(result.success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = VariableIdSchema.safeParse('');

    expect(result.success).toBe(false);
  });
});

describe('CredentialIdSchema', () => {
  it('accepts non-empty string', () => {
    const result = CredentialIdSchema.safeParse('cred-123');

    expect(result.success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = CredentialIdSchema.safeParse('');

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Tool Input Schemas Tests
// =============================================================================

describe('InitN8nSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid url and apiKey', () => {
      const result = InitN8nSchema.safeParse({
        url: fixtures.url.valid,
        apiKey: fixtures.apiKey.valid,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects missing url', () => {
      const result = InitN8nSchema.safeParse({
        apiKey: fixtures.apiKey.valid,
      });

      expect(result.success).toBe(false);
    });

    it('rejects missing apiKey', () => {
      const result = InitN8nSchema.safeParse({
        url: fixtures.url.valid,
      });

      expect(result.success).toBe(false);
    });

    it('rejects localhost url', () => {
      const result = InitN8nSchema.safeParse({
        url: fixtures.url.localhost,
        apiKey: fixtures.apiKey.valid,
      });

      expect(result.success).toBe(false);
    });

    it('rejects empty object', () => {
      const result = InitN8nSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});

describe('Workflow Schemas', () => {
  describe('ListWorkflowsSchema', () => {
    it('accepts valid clientId', () => {
      const result = ListWorkflowsSchema.safeParse({
        clientId: fixtures.clientId.valid,
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid clientId', () => {
      const result = ListWorkflowsSchema.safeParse({
        clientId: fixtures.clientId.invalid,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('GetWorkflowSchema', () => {
    it('accepts valid clientId and string id', () => {
      const result = GetWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: fixtures.workflowId.validString,
      });

      expect(result.success).toBe(true);
    });

    it('accepts valid clientId and number id', () => {
      const result = GetWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: fixtures.workflowId.validNumber,
      });

      expect(result.success).toBe(true);
    });

    it('rejects missing id', () => {
      const result = GetWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('CreateWorkflowSchema', () => {
    it('accepts valid minimal input', () => {
      const result = CreateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: fixtures.workflowName.valid,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes).toEqual([]);
        expect(result.data.connections).toEqual({});
      }
    });

    it('accepts valid full input', () => {
      const result = CreateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: fixtures.workflowName.valid,
        nodes: [{ type: 'trigger', name: 'Start' }],
        connections: { Start: { main: [[]] } },
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = CreateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: fixtures.workflowName.empty,
      });

      expect(result.success).toBe(false);
    });

    it('rejects name exceeding 255 characters', () => {
      const result = CreateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: fixtures.workflowName.tooLong,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('UpdateWorkflowSchema', () => {
    it('accepts valid update with name', () => {
      const result = UpdateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: fixtures.workflowId.validString,
        workflow: { name: 'Updated Workflow' },
      });

      expect(result.success).toBe(true);
    });

    it('accepts valid update with active', () => {
      const result = UpdateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: fixtures.workflowId.validNumber,
        workflow: { active: true },
      });

      expect(result.success).toBe(true);
    });

    it('accepts valid update with nodes and connections', () => {
      const result = UpdateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: '123',
        workflow: {
          nodes: [{ type: 'node' }],
          connections: {},
          settings: { timeout: 300 },
        },
      });

      expect(result.success).toBe(true);
    });

    it('rejects missing workflow', () => {
      const result = UpdateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: '123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('DeleteWorkflowSchema', () => {
    it('accepts valid input', () => {
      const result = DeleteWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: fixtures.workflowId.validString,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('ActivateWorkflowSchema', () => {
    it('accepts valid input', () => {
      const result = ActivateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: fixtures.workflowId.validNumber,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('DeactivateWorkflowSchema', () => {
    it('accepts valid input', () => {
      const result = DeactivateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: '123',
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('User Schemas', () => {
  describe('ListUsersSchema', () => {
    it('accepts valid clientId', () => {
      const result = ListUsersSchema.safeParse({
        clientId: fixtures.clientId.valid,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('CreateUsersSchema', () => {
    it('accepts valid single user', () => {
      const result = CreateUsersSchema.safeParse({
        clientId: fixtures.clientId.valid,
        users: [{ email: fixtures.email.valid }],
      });

      expect(result.success).toBe(true);
    });

    it('accepts valid user with role', () => {
      const result = CreateUsersSchema.safeParse({
        clientId: fixtures.clientId.valid,
        users: [{ email: fixtures.email.valid, role: 'global:admin' }],
      });

      expect(result.success).toBe(true);
    });

    it('accepts valid user with member role', () => {
      const result = CreateUsersSchema.safeParse({
        clientId: fixtures.clientId.valid,
        users: [{ email: fixtures.email.valid, role: 'global:member' }],
      });

      expect(result.success).toBe(true);
    });

    it('accepts multiple users', () => {
      const result = CreateUsersSchema.safeParse({
        clientId: fixtures.clientId.valid,
        users: [
          { email: 'user1@example.com', role: 'global:admin' },
          { email: 'user2@example.com', role: 'global:member' },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty users array', () => {
      const result = CreateUsersSchema.safeParse({
        clientId: fixtures.clientId.valid,
        users: [],
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = CreateUsersSchema.safeParse({
        clientId: fixtures.clientId.valid,
        users: [{ email: fixtures.email.invalid }],
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid role', () => {
      const result = CreateUsersSchema.safeParse({
        clientId: fixtures.clientId.valid,
        users: [{ email: fixtures.email.valid, role: 'invalid-role' }],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('GetUserSchema', () => {
    it('accepts valid idOrEmail', () => {
      const result = GetUserSchema.safeParse({
        clientId: fixtures.clientId.valid,
        idOrEmail: fixtures.email.valid,
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty idOrEmail', () => {
      const result = GetUserSchema.safeParse({
        clientId: fixtures.clientId.valid,
        idOrEmail: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('DeleteUserSchema', () => {
    it('accepts valid input', () => {
      const result = DeleteUserSchema.safeParse({
        clientId: fixtures.clientId.valid,
        idOrEmail: 'user-123',
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Project Schemas', () => {
  describe('ListProjectsSchema', () => {
    it('accepts valid clientId', () => {
      const result = ListProjectsSchema.safeParse({
        clientId: fixtures.clientId.valid,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('CreateProjectSchema', () => {
    it('accepts valid name', () => {
      const result = CreateProjectSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: fixtures.projectName.valid,
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = CreateProjectSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: fixtures.projectName.empty,
      });

      expect(result.success).toBe(false);
    });

    it('rejects name exceeding 255 characters', () => {
      const result = CreateProjectSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: fixtures.projectName.tooLong,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('UpdateProjectSchema', () => {
    it('accepts valid input', () => {
      const result = UpdateProjectSchema.safeParse({
        clientId: fixtures.clientId.valid,
        projectId: 'proj-123',
        name: 'Updated Project',
      });

      expect(result.success).toBe(true);
    });

    it('rejects missing projectId', () => {
      const result = UpdateProjectSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: 'Updated Project',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('DeleteProjectSchema', () => {
    it('accepts valid input', () => {
      const result = DeleteProjectSchema.safeParse({
        clientId: fixtures.clientId.valid,
        projectId: 'proj-123',
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Execution Schemas', () => {
  describe('ListExecutionsSchema', () => {
    it('accepts clientId only', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
      });

      expect(result.success).toBe(true);
    });

    it('accepts with workflowId filter', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        workflowId: 'workflow-123',
      });

      expect(result.success).toBe(true);
    });

    it('accepts with status filter', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        status: 'error',
      });

      expect(result.success).toBe(true);
    });

    it('accepts with success status', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        status: 'success',
      });

      expect(result.success).toBe(true);
    });

    it('accepts with waiting status', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        status: 'waiting',
      });

      expect(result.success).toBe(true);
    });

    it('accepts with limit', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        limit: 50,
      });

      expect(result.success).toBe(true);
    });

    it('accepts with includeData', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        includeData: true,
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        status: 'invalid',
      });

      expect(result.success).toBe(false);
    });

    it('rejects limit below 1', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        limit: 0,
      });

      expect(result.success).toBe(false);
    });

    it('rejects limit above 250', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        limit: 251,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('GetExecutionSchema', () => {
    it('accepts valid input', () => {
      const result = GetExecutionSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: fixtures.executionId.valid,
      });

      expect(result.success).toBe(true);
    });

    it('accepts with includeData', () => {
      const result = GetExecutionSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: 123,
        includeData: true,
      });

      expect(result.success).toBe(true);
    });

    it('rejects string id', () => {
      const result = GetExecutionSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: '123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('DeleteExecutionSchema', () => {
    it('accepts valid input', () => {
      const result = DeleteExecutionSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: fixtures.executionId.valid,
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Tag Schemas', () => {
  describe('ListTagsSchema', () => {
    it('accepts clientId only', () => {
      const result = ListTagsSchema.safeParse({
        clientId: fixtures.clientId.valid,
      });

      expect(result.success).toBe(true);
    });

    it('accepts with limit', () => {
      const result = ListTagsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        limit: 100,
      });

      expect(result.success).toBe(true);
    });

    it('rejects limit below 1', () => {
      const result = ListTagsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        limit: 0,
      });

      expect(result.success).toBe(false);
    });

    it('rejects limit above 250', () => {
      const result = ListTagsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        limit: 251,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('CreateTagSchema', () => {
    it('accepts valid tag name', () => {
      const result = CreateTagSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: fixtures.tagName.valid,
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = CreateTagSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: fixtures.tagName.empty,
      });

      expect(result.success).toBe(false);
    });

    it('rejects name exceeding 100 characters', () => {
      const result = CreateTagSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: fixtures.tagName.tooLong,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('GetTagSchema', () => {
    it('accepts valid input', () => {
      const result = GetTagSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: 'tag-123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('UpdateTagSchema', () => {
    it('accepts valid input', () => {
      const result = UpdateTagSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: 'tag-123',
        name: 'Updated Tag',
      });

      expect(result.success).toBe(true);
    });

    it('rejects name exceeding 100 characters', () => {
      const result = UpdateTagSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: 'tag-123',
        name: fixtures.tagName.tooLong,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('DeleteTagSchema', () => {
    it('accepts valid input', () => {
      const result = DeleteTagSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: 'tag-123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('GetWorkflowTagsSchema', () => {
    it('accepts valid input', () => {
      const result = GetWorkflowTagsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        workflowId: fixtures.workflowId.validString,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('UpdateWorkflowTagsSchema', () => {
    it('accepts valid input', () => {
      const result = UpdateWorkflowTagsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        workflowId: '123',
        tagIds: [{ id: 'tag-1' }, { id: 'tag-2' }],
      });

      expect(result.success).toBe(true);
    });

    it('accepts empty tagIds array', () => {
      const result = UpdateWorkflowTagsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        workflowId: '123',
        tagIds: [],
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid tag object', () => {
      const result = UpdateWorkflowTagsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        workflowId: '123',
        tagIds: [{ id: '' }],
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Variable Schemas', () => {
  describe('ListVariablesSchema', () => {
    it('accepts valid clientId', () => {
      const result = ListVariablesSchema.safeParse({
        clientId: fixtures.clientId.valid,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('CreateVariableSchema', () => {
    it('accepts valid input', () => {
      const result = CreateVariableSchema.safeParse({
        clientId: fixtures.clientId.valid,
        key: 'MY_VARIABLE',
        value: 'some value',
      });

      expect(result.success).toBe(true);
    });

    it('accepts empty value', () => {
      const result = CreateVariableSchema.safeParse({
        clientId: fixtures.clientId.valid,
        key: 'MY_VARIABLE',
        value: '',
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty key', () => {
      const result = CreateVariableSchema.safeParse({
        clientId: fixtures.clientId.valid,
        key: '',
        value: 'value',
      });

      expect(result.success).toBe(false);
    });

    it('rejects key exceeding 100 characters', () => {
      const result = CreateVariableSchema.safeParse({
        clientId: fixtures.clientId.valid,
        key: 'a'.repeat(101),
        value: 'value',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('DeleteVariableSchema', () => {
    it('accepts valid input', () => {
      const result = DeleteVariableSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: 'var-123',
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Credential Schemas', () => {
  describe('CreateCredentialSchema', () => {
    it('accepts valid input', () => {
      const result = CreateCredentialSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: 'My API Key',
        type: 'httpHeaderAuth',
        data: { name: 'Authorization', value: 'Bearer token' },
      });

      expect(result.success).toBe(true);
    });

    it('accepts empty data object', () => {
      const result = CreateCredentialSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: 'My Credential',
        type: 'myType',
        data: {},
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = CreateCredentialSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: '',
        type: 'myType',
        data: {},
      });

      expect(result.success).toBe(false);
    });

    it('rejects name exceeding 255 characters', () => {
      const result = CreateCredentialSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: 'a'.repeat(256),
        type: 'myType',
        data: {},
      });

      expect(result.success).toBe(false);
    });

    it('rejects empty type', () => {
      const result = CreateCredentialSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: 'My Credential',
        type: '',
        data: {},
      });

      expect(result.success).toBe(false);
    });
  });

  describe('DeleteCredentialSchema', () => {
    it('accepts valid input', () => {
      const result = DeleteCredentialSchema.safeParse({
        clientId: fixtures.clientId.valid,
        id: 'cred-123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('GetCredentialSchemaSchema', () => {
    it('accepts valid input', () => {
      const result = GetCredentialSchemaSchema.safeParse({
        clientId: fixtures.clientId.valid,
        credentialTypeName: 'httpHeaderAuth',
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty credentialTypeName', () => {
      const result = GetCredentialSchemaSchema.safeParse({
        clientId: fixtures.clientId.valid,
        credentialTypeName: '',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Audit Schemas', () => {
  describe('GenerateAuditSchema', () => {
    it('accepts clientId only', () => {
      const result = GenerateAuditSchema.safeParse({
        clientId: fixtures.clientId.valid,
      });

      expect(result.success).toBe(true);
    });

    it('accepts with single category', () => {
      const result = GenerateAuditSchema.safeParse({
        clientId: fixtures.clientId.valid,
        categories: ['credentials'],
      });

      expect(result.success).toBe(true);
    });

    it('accepts with multiple categories', () => {
      const result = GenerateAuditSchema.safeParse({
        clientId: fixtures.clientId.valid,
        categories: ['credentials', 'database', 'nodes', 'filesystem', 'instance'],
      });

      expect(result.success).toBe(true);
    });

    it('accepts with daysAbandonedWorkflow', () => {
      const result = GenerateAuditSchema.safeParse({
        clientId: fixtures.clientId.valid,
        daysAbandonedWorkflow: 30,
      });

      expect(result.success).toBe(true);
    });

    it('accepts with all options', () => {
      const result = GenerateAuditSchema.safeParse({
        clientId: fixtures.clientId.valid,
        categories: ['credentials', 'nodes'],
        daysAbandonedWorkflow: 90,
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid category', () => {
      const result = GenerateAuditSchema.safeParse({
        clientId: fixtures.clientId.valid,
        categories: ['invalid-category'],
      });

      expect(result.success).toBe(false);
    });

    it('rejects daysAbandonedWorkflow below 1', () => {
      const result = GenerateAuditSchema.safeParse({
        clientId: fixtures.clientId.valid,
        daysAbandonedWorkflow: 0,
      });

      expect(result.success).toBe(false);
    });

    it('rejects negative daysAbandonedWorkflow', () => {
      const result = GenerateAuditSchema.safeParse({
        clientId: fixtures.clientId.valid,
        daysAbandonedWorkflow: -1,
      });

      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Edge Cases and Security Tests
// =============================================================================

describe('Edge Cases', () => {
  describe('URL edge cases', () => {
    it('rejects URL with username:password', () => {
      const result = N8nUrlSchema.safeParse('https://user:pass@localhost:5678');

      // Should fail because of localhost, not the credentials
      expect(result.success).toBe(false);
    });

    it('handles URL with unicode domain', () => {
      // Punycode domains should be allowed if they resolve to external
      const result = N8nUrlSchema.safeParse('https://xn--n3h.com');

      expect(result.success).toBe(true);
    });

    it('handles very long URL', () => {
      const longPath = 'a'.repeat(2000);
      const result = N8nUrlSchema.safeParse(`https://example.com/${longPath}`);

      expect(result.success).toBe(true);
    });
  });

  describe('Whitespace handling', () => {
    it('ClientIdSchema does not trim whitespace', () => {
      const result = ClientIdSchema.safeParse('  abc123  ');

      // Contains spaces which aren't in base64 alphabet
      expect(result.success).toBe(false);
    });

    it('ApiKeySchema rejects leading/trailing spaces', () => {
      const result = ApiKeySchema.safeParse('  apikey  ');

      expect(result.success).toBe(false);
    });
  });

  describe('Type coercion', () => {
    it('WorkflowIdSchema does not coerce string to number', () => {
      const result = WorkflowIdSchema.safeParse('123');

      // String "123" is valid as string
      expect(result.success).toBe(true);
    });

    it('ExecutionIdSchema does not coerce string to number', () => {
      const result = ExecutionIdSchema.safeParse('123');

      // ExecutionIdSchema requires number
      expect(result.success).toBe(false);
    });
  });

  describe('Boundary conditions', () => {
    it('limit at minimum (1)', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        limit: 1,
      });

      expect(result.success).toBe(true);
    });

    it('limit at maximum (250)', () => {
      const result = ListExecutionsSchema.safeParse({
        clientId: fixtures.clientId.valid,
        limit: 250,
      });

      expect(result.success).toBe(true);
    });

    it('name at maximum length (255)', () => {
      const result = CreateWorkflowSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: 'a'.repeat(255),
      });

      expect(result.success).toBe(true);
    });

    it('tag name at maximum length (100)', () => {
      const result = CreateTagSchema.safeParse({
        clientId: fixtures.clientId.valid,
        name: 'a'.repeat(100),
      });

      expect(result.success).toBe(true);
    });
  });
});
