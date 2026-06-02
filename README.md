# MCP Server for Rancher 1.6

Standalone MCP server that runs over stdio and controls the Rancher 1.6 `/v2-beta` API.

## Configuration

Set these environment variables in the MCP client config:

| Variable | Required | Default |
| --- | --- | --- |
| `RANCHER_URL` | No | `http://192.168.0.241:9999` |
| `RANCHER_ACCESS_KEY` | Yes | none |
| `RANCHER_SECRET_KEY` | Yes | none |
| `RANCHER_PROJECT_ID` | No | none |
| `RANCHER_REQUEST_TIMEOUT_MS` | No | `30000` |
| `RANCHER_TARGETS_FILE` | No | none |
| `RANCHER_TARGETS_JSON` | No | `{}` |
| `RANCHER_ALLOW_PROD_WRITES` | No | `false` |
| `RANCHER_PROTECTED_PROJECT_IDS` | No | none |

The server uses Rancher API Key Basic Auth. Credentials are sent only in the `Authorization` header and are not logged.

Recommended setup: keep only Rancher URL and credentials in MCP environment variables. Put application-specific Service URL and Pipeline URL entries in each project's `README.md`, then let Codex read that README and pass URLs into MCP tools.

Named targets are optional. They are useful for smoke tests or shared aliases, but they are not required when Codex reads Service URL and Pipeline URL values from a project README.

If you still want targets, configure them like this:

```json
{
  "test-erp": {
    "environment": "test",
    "projectId": "1a536",
    "stackId": "1st178",
    "serviceId": "1s2268",
    "pipelineUrl": "http://192.168.0.241:9999/r/projects/1a536/pipeline-ui/#/env/1a536/pipelines/pipelines/xxx?mode=review",
    "description": "Test ERP"
  },
  "test-wms": {
    "environment": "test",
    "projectId": "1a200",
    "description": "Test WMS"
  },
  "prod-erp": {
    "environment": "prod",
    "protected": true,
    "projectId": "1a999",
    "stackId": "1st999",
    "serviceId": "1s999",
    "pipelineUrl": "http://192.168.0.241:9999/r/projects/1a999/pipeline-ui/#/env/1a999/pipelines/pipelines/yyy?mode=review",
    "description": "Prod ERP"
  }
}
```

Put that JSON string in `RANCHER_TARGETS_JSON`. Target entries may include `projectId`, `stackId`, `serviceId`, `serviceUrl`, and `description`.

The simpler option is to save the same object in a file and set `RANCHER_TARGETS_FILE`. When both are set, `RANCHER_TARGETS_FILE` wins.

Example `rancher-targets.json`:

```json
{
  "test-erp": {
    "projectId": "1a536",
    "stackId": "1st178",
    "serviceId": "1s2268",
    "description": "Test ERP"
  },
  "test-wms": {
    "projectId": "1a200",
    "description": "Test WMS"
  }
}
```

## Install and Build

```bash
npm install
npm run build
```

Run locally:

```bash
RANCHER_ACCESS_KEY=xxx RANCHER_SECRET_KEY=yyy npm run dev
```

## MCP Client Setup

### Cursor

Add to your Cursor MCP config:

```json
{
  "mcpServers": {
    "rancher": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-stdio-rancher/dist/index.js"],
      "env": {
        "RANCHER_URL": "http://192.168.0.241:9999",
        "RANCHER_ACCESS_KEY": "your-access-key",
        "RANCHER_SECRET_KEY": "your-secret-key",
        "RANCHER_REQUEST_TIMEOUT_MS": "30000"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rancher": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-stdio-rancher/dist/index.js"],
      "env": {
        "RANCHER_URL": "http://192.168.0.241:9999",
        "RANCHER_ACCESS_KEY": "your-access-key",
        "RANCHER_SECRET_KEY": "your-secret-key"
      }
    }
  }
}
```

### Codex

Add the server to your Codex MCP configuration using the same command, args, and env shape:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/mcp-server-stdio-rancher/dist/index.js"],
  "env": {
    "RANCHER_URL": "http://192.168.0.241:9999",
    "RANCHER_ACCESS_KEY": "your-access-key",
    "RANCHER_SECRET_KEY": "your-secret-key"
  }
}
```

## Tools

- `rancher_get_service`: fetch service state, health, scale, image, transition info, and available actions.
- `rancher_list_projects`: list Rancher projects/environments from `/v2-beta/projects`, including environment names.
- `rancher_find_services`: search service candidates by project, query, or image without changing them.
- `rancher_list_targets`: list configured target aliases from `RANCHER_TARGETS_JSON`.
- `rancher_upgrade_service`: call the service `upgrade` action. It uses the resource action URL when available and falls back to `?action=upgrade`.
- `rancher_finish_service_upgrade`: call `finishupgrade`.
- `rancher_rollback_service_upgrade`: call `rollback`.
- `rancher_cancel_service_upgrade`: call `cancelupgrade`.
- `rancher_wait_service`: poll until `transitioning !== "yes"` or timeout.
- `rancher_get_pipeline`: fetch pipeline metadata and available actions without running it.
- `rancher_find_pipelines`: search pipeline candidates by project and query without running them.
- `rancher_get_pipeline_activities`: fetch recent pipeline build history without running it.
- `rancher_update_pipeline_image`: preview or apply pipeline build-step `targetImage` changes; defaults to dry-run.
- `rancher_run_pipeline`: parse a Rancher pipeline UI URL or use explicit IDs, then run a discoverable pipeline action.

For Rancher 1.6 pipeline UI plugins, pipeline resources may not exist at `/v2-beta/projects/{projectId}/pipelines/{pipelineId}`. The server falls back to `/v2-beta/projects/{projectId}/genericobjects?kind=pipeline&key={pipelineId}`, then uses the embedded `pipeline-server` self link and its `actions.run` URL.

## Production Safety

Production writes are blocked by default. A target is protected when either:

- the target has `"protected": true`
- the target has `"environment": "prod"`
- the resolved `projectId` is listed in `RANCHER_PROTECTED_PROJECT_IDS`

Protected read operations are allowed. Protected write operations require both:

```json
{
  "RANCHER_ALLOW_PROD_WRITES": "true"
}
```

And an exact `confirm` value on the tool call:

```json
{
  "target": "prod-erp",
  "confirm": "PROD prod-erp 1s999"
}
```

When no target alias is used, the confirmation token uses the project ID:

```json
{
  "serviceUrl": "http://192.168.0.241:9999/env/1a999/apps/stacks/1st999/services/1s999/containers",
  "confirm": "PROD 1a999 1s999"
}
```

Service tools accept either explicit IDs:

```json
{
  "projectId": "1a536",
  "serviceId": "1s2268"
}
```

Or a Rancher 1.6 UI service URL:

```json
{
  "serviceUrl": "http://192.168.0.241:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers"
}
```

The server parses this as `projectId=1a536` and `serviceId=1s2268`.

Or a configured target alias:

```json
{
  "target": "test-erp"
}
```

Explicit `projectId`, `serviceId`, or `serviceUrl` values override target values.

`RANCHER_PROJECT_ID` is only a fallback for ad-hoc calls that provide `serviceId` or `pipelineId` without a target or URL. For multi-project usage, prefer `target`, `serviceUrl`, `pipelineUrl`, or explicit `projectId`.

## Project README Workflow

Recommended layout in each application README:

```md
## Rancher

### Test / ERP

- Environment: test
- Protected: false
- Environment URL: http://192.168.0.241:9999/env/1a536/apps/stacks
- Service URL: http://192.168.0.241:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers
- Pipeline URL: http://192.168.0.241:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/e1d42fea-9dc6-4856-9fb6-a5585eda1af1?mode=review
```

Codex can read this section and call MCP tools directly:

```json
{
  "serviceUrl": "http://192.168.0.241:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers"
}
```

```json
{
  "uiUrl": "http://192.168.0.241:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/e1d42fea-9dc6-4856-9fb6-a5585eda1af1?mode=review"
}
```

See [docs/project-readme-rancher-template.md](docs/project-readme-rancher-template.md) for a copyable template. A draft Codex skill for this workflow is in [skills/rancher-readme-deploy/SKILL.md](skills/rancher-readme-deploy/SKILL.md).

If a project README has no Rancher section, the recommended skill workflow is:

1. infer a search term from the repo/app name
2. call `rancher_find_pipelines`
3. show candidates to the user
4. after confirmation, write the selected Pipeline URL back into `README.md`

## Sharing This MCP Server

Commit and share:

- source code
- `README.md`
- `rancher-targets.example.json`

Do not commit:

- real Rancher access keys
- real Rancher secret keys
- production-only local config files if they contain sensitive topology

Each user should create their own MCP client config with their own credentials and their own `RANCHER_TARGETS_FILE`. For a team, keep a sanitized shared targets file in a private repo if service and pipeline URLs are acceptable to share internally.

## Tests

```bash
npm test
npm run typecheck
```
