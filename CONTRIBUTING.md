# Contributing

Issues and pull requests are welcome.

## Build and test

Requires Node 18 or newer.

```sh
npm install
npm run lint        # tsc --noEmit
npm test            # vitest run
npm run build       # tsc, output in build/
```

Run lint and the tests before you open a pull request; there is no CI workflow in the
repository. Read [DEVELOPMENT.md](DEVELOPMENT.md) first: check `N8N_API.yml` for the
correct endpoint, keep tool arguments to compact single-line JSON, and document only
what is implemented. A new tool needs a schema in `src/schemas/`, a handler registered
in `src/handlers/`, and tests next to the existing ones in `src/__tests__/`.

## Commits and pull requests

- Use Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`), as in
  the history.
- Keep a pull request to one concern; describe what changed, why, and how you tested it
  using the pull-request template.
- Do not commit API keys, session cookies or `.env` files.
- Update [docs/INDEX.md](docs/INDEX.md) when you add or rename a document.

## Security

Report vulnerabilities as described in [SECURITY.md](SECURITY.md), not in public issues.
