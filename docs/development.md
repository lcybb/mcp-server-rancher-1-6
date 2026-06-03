# Development

## Repository Structure

```text
.
├── src/                         # TypeScript MCP server implementation
├── test/                        # Vitest unit tests
├── docs/                        # Long-lived documentation
├── skills/                      # Bundled Agent Skills
├── rancher-targets.example.json # Optional alias config example
├── package.json
└── README.md
```

## Source Modules

- `src/index.ts`: stdio entry point.
- `src/config.ts`: environment loading and optional target aliases.
- `src/rancherClient.ts`: Rancher HTTP client, URL handling, Basic Auth, timeout, errors.
- `src/service.ts`: service URL parsing, service summaries, upgrade payloads.
- `src/pipeline.ts`: pipeline URL parsing, genericObject fallback helpers, image update helpers.
- `src/safety.ts`: protected write checks.
- `src/mcp.ts`: MCP tool registration and orchestration.

## Commands

```bash
npm install
npm test
npm run typecheck
npm run build
```

Run locally:

```bash
RANCHER_URL="http://your-rancher-host:9999" \
RANCHER_ACCESS_KEY="..." \
RANCHER_SECRET_KEY="..." \
npm run dev
```

## Git Hygiene

Ignored local files include:

- `node_modules/`
- `dist/`
- `rancher-targets.local.json`

Do not commit real Rancher keys or local production topology.
