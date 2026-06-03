# mcp-server-rancher-1-6

Rancher 1.6 stdio MCP Server for `/v2-beta` service operations and Rancher pipeline UI plugin workflows.

It is designed for two layers:

- **MCP tools** execute Rancher API actions: inspect services, run pipelines, update pipeline build images, upgrade services, and wait for state changes.
- **Agent Skill** reads each project README's `## Rancher` section, maps app/environment entries to Rancher URLs, asks for confirmation, then calls MCP tools.

## Capabilities

| Area | Tools |
| --- | --- |
| Projects | `rancher_list_projects` |
| Services | `rancher_get_service`, `rancher_find_services`, `rancher_upgrade_service`, `rancher_wait_service`, `rancher_finish_service_upgrade`, `rancher_rollback_service_upgrade`, `rancher_cancel_service_upgrade` |
| Pipelines | `rancher_get_pipeline`, `rancher_find_pipelines`, `rancher_get_pipeline_activities`, `rancher_update_pipeline_image`, `rancher_run_pipeline` |
| Optional aliases | `rancher_list_targets` |

For Rancher 1.6 pipeline UI plugins, the server handles the `genericobjects -> pipeline-server` fallback automatically.

## Quick Start

```bash
npm install
npm run build
```

Configure your MCP client:

```json
{
  "mcpServers": {
    "rancher": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-rancher-1-6/dist/index.js"],
      "env": {
        "RANCHER_URL": "http://your-rancher-host:9999",
        "RANCHER_ACCESS_KEY": "your-access-key",
        "RANCHER_SECRET_KEY": "your-secret-key"
      }
    }
  }
}
```

Do not put Rancher access keys or secret keys in project READMEs or skill files.

## Project README Workflow

Recommended per-application README section:

```md
## Rancher

### Test / ERP

- Environment: test
- Protected: false
- Environment URL: http://your-rancher-host:9999/env/1a536/apps/stacks
- Service URL: http://your-rancher-host:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers
- Pipeline URL: http://your-rancher-host:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/<pipeline-id>?mode=review
- Notes:
```

Codex can then read this section and call MCP tools with `serviceUrl` or `uiUrl`.

## Documentation

- [Documentation index](docs/README.md)
- [MCP reference](docs/mcp-reference.md)
- [Project README Rancher section](docs/project-readme-rancher.md)
- [Skills guide](docs/skills.md)
- [Development guide](docs/development.md)

## Agent Skill

The bundled skill lives at:

```text
skills/rancher-readme-deploy/SKILL.md
```

Install or copy it into your Codex skills directory if you want the README-driven workflow to trigger automatically.

## Validation

```bash
npm test
npm run typecheck
npm run build
```

## License

No license has been declared yet.
