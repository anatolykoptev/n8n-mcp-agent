# n8n-mcp-agent — notes for coding agents

TypeScript MCP server (`@anatolykoptev/n8n-mcp-agent`, Node 18+, ESM) that exposes the
n8n public API as tools, plus credential factories, execution and workflow helpers,
a searchable workflow-template database and sub-agent/skill prompts. User-facing
overview in [README.md](README.md); coding rules in [DEVELOPMENT.md](DEVELOPMENT.md);
every document is listed in [docs/INDEX.md](docs/INDEX.md).

## Layout

- `src/main.ts` entry point (stdio MCP server, auto-connects from `N8N_URL` and
  `N8N_API_KEY`); `src/clients/` n8n and patterns HTTP clients with retry; `src/tools/`
  tool definitions; `src/handlers/` handlers and the registry that decides which tools
  are enabled (`N8N_ENTERPRISE`, `N8N_USERS`, `N8N_FULL`); `src/schemas/` zod schemas;
  `src/errors/`, `src/constants/`, `src/utils/`.
- `agents/` and `skills/` are shipped in the npm package (`files` in `package.json`);
  `extension/` is a separate Chrome extension plus the embedded auth server for session
  cookies and is not part of the package.
- `N8N_API.yml` is the endpoint reference: check it before adding or changing a call.
  `LLM_GUIDE.md` and `TYPEKIT_MCP_SDK.md` are vendored reference copies of MCP docs.

## Gate

There is no CI workflow; run locally before a pull request:

```sh
npm run lint     # tsc --noEmit
npm test         # vitest run (205 tests)
npm run build    # tsc && chmod +x build/main.js
```

## Invariants easy to break

- Tool arguments are compact single-line JSON and every tool takes a `clientId`;
  `active` on a workflow is read-only.
- Enterprise-only tools (projects, variables) and user management stay behind their
  environment flags; the default set is the 35 core tools.
- Keep documentation to what is implemented; no public roadmap (DEVELOPMENT.md).
- Never log or commit API keys or session cookies; `.env` is ignored, `.env.example`
  documents names only. Test fixtures use documentation or private addresses, except
  the RFC 1918 boundary cases in `src/__tests__/schemas.test.ts`.
- New modules follow the `@module` / `@ai-rule` header convention used across `src/`.
