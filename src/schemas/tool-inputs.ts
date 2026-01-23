/**
 * @module schemas/tool-inputs
 * @description Centralized re-exports for all Zod validation schemas
 *
 * @ai-rule Adding new schema:
 * 1. Add to appropriate module (workflow.ts, admin.ts, data.ts, pattern.ts)
 * 2. Export schema + type from module
 * 3. Re-export here
 */

// Base schemas
export {
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
} from './base.js';

// Workflow schemas
export {
  InitN8nSchema,
  ListWorkflowsSchema,
  GetWorkflowSchema,
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  DeleteWorkflowSchema,
  ActivateWorkflowSchema,
  DeactivateWorkflowSchema,
  ExecuteWebhookSchema,
  GetWebhookUrlSchema,
  TriggerTypeEnum,
  TestWorkflowSchema,
  type InitN8nInput,
  type ListWorkflowsInput,
  type GetWorkflowInput,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type DeleteWorkflowInput,
  type ActivateWorkflowInput,
  type DeactivateWorkflowInput,
  type ExecuteWebhookInput,
  type GetWebhookUrlInput,
  type TriggerType,
  type TestWorkflowInput,
} from './workflow.js';

// Admin schemas
export {
  N8nLoginSchema,
  ListUsersSchema,
  CreateUsersSchema,
  GetUserSchema,
  DeleteUserSchema,
  ListProjectsSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  DeleteProjectSchema,
  ListCredentialsInUseSchema,
  ListCredentialsSchema,
  CreateCredentialSchema,
  DeleteCredentialSchema,
  GetCredentialSchemaSchema,
  GenerateAuditSchema,
  type N8nLoginInput,
  type ListUsersInput,
  type CreateUsersInput,
  type GetUserInput,
  type DeleteUserInput,
  type ListProjectsInput,
  type CreateProjectInput,
  type UpdateProjectInput,
  type DeleteProjectInput,
  type ListCredentialsInUseInput,
  type ListCredentialsInput,
  type CreateCredentialInput,
  type DeleteCredentialInput,
  type GetCredentialSchemaInput,
  type GenerateAuditInput,
} from './admin.js';

// Data schemas
export {
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
  type ListExecutionsInput,
  type GetExecutionInput,
  type DeleteExecutionInput,
  type ListTagsInput,
  type CreateTagInput,
  type GetTagInput,
  type UpdateTagInput,
  type DeleteTagInput,
  type GetWorkflowTagsInput,
  type UpdateWorkflowTagsInput,
  type ListVariablesInput,
  type CreateVariableInput,
  type DeleteVariableInput,
} from './data.js';

// Pattern schemas
export {
  PatternStatsSchema,
  PatternSearchSchema,
  PatternGetSchema,
  PatternCategoriesSchema,
  PatternIntegrationsSchema,
  type PatternStatsInput,
  type PatternSearchInput,
  type PatternGetInput,
  type PatternCategoriesInput,
  type PatternIntegrationsInput,
} from './pattern.js';

// Diagnostic schemas
export {
  DiagnoseN8nSchema,
  AnalyzeLogsSchema,
  HealthCheckSchema,
  type DiagnoseN8nInput,
  type AnalyzeLogsInput,
  type HealthCheckInput,
} from './diagnostic.js';
