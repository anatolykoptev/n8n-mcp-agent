# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## 2.0.0 - 2026-01-23

### Added
- A database of 4343+ workflow templates with search, categories and integrations
  tools.
- Feature flags (`N8N_ENTERPRISE`, `N8N_USERS`, `N8N_FULL`) that choose which tools
  are registered, and an embedded auth server that lets the Chrome extension hand
  session cookies to the server.

### Changed
- The n8n client was rebuilt as modules with a shared HTTP client, retry and
  centralised constants; the facade methods were removed.
- Dead services and error constants were deleted.

## 0.1.0 - 2025-02-19

### Added
- Initial n8n MCP server: workflow, execution, credential, tag, user, project and
  variable tools; background-process support; npm and Smithery packaging; MIT licence.
