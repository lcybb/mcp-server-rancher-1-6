# MCP Reference

## Runtime Configuration

Set these environment variables in the MCP client config:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `RANCHER_URL` | No | `http://192.168.0.241:9999` | Rancher base URL |
| `RANCHER_ACCESS_KEY` | Yes | none | Rancher API key access key |
| `RANCHER_SECRET_KEY` | Yes | none | Rancher API key secret key |
| `RANCHER_PROJECT_ID` | No | none | Fallback project ID for ad-hoc ID-only calls |
| `RANCHER_REQUEST_TIMEOUT_MS` | No | `30000` | HTTP timeout |
| `RANCHER_TARGETS_FILE` | No | none | Optional JSON target alias file |
| `RANCHER_TARGETS_JSON` | No | `{}` | Optional JSON target aliases |
| `RANCHER_ALLOW_PROD_WRITES` | No | `false` | Global switch for protected writes |
| `RANCHER_PROTECTED_PROJECT_IDS` | No | none | Comma-separated protected project IDs |

Credentials are used only for Basic Auth headers and must not be logged or committed.

`RANCHER_PROJECT_ID` is only a fallback for manual calls that provide a `serviceId` or `pipelineId` without a URL, target alias, or explicit `projectId`. For multi-project usage, prefer README `Service URL` / `Pipeline URL` entries, tool `serviceUrl` / `uiUrl` inputs, target aliases, or explicit `projectId`.

## MCP Client Setup

Use the same stdio command shape in Cursor, Claude Desktop, Codex, and other MCP clients:

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
        "RANCHER_SECRET_KEY": "your-secret-key",
        "RANCHER_REQUEST_TIMEOUT_MS": "30000"
      }
    }
  }
}
```

For Codex, the server key is typically placed under the MCP servers section of `~/.codex/config.toml`; keep the same command, args, and env values.

## Tools

### Project Tools

- `rancher_list_projects`: lists Rancher projects/environments from `/v2-beta/projects`, including names such as `test/ERP` or `prod/WMS`.

### Service Tools

- `rancher_get_service`: fetch service state, health, scale, image, transition info, and available actions.
- `rancher_find_services`: search service candidates by project, text query, or image.
- `rancher_upgrade_service`: upgrade a Rancher service using the discoverable `upgrade` action.
- `rancher_wait_service`: poll until `transitioning !== "yes"` or timeout.
- `rancher_finish_service_upgrade`: call `finishupgrade`.
- `rancher_rollback_service_upgrade`: call `rollback`.
- `rancher_cancel_service_upgrade`: call `cancelupgrade`.

Service tools accept either explicit IDs:

```json
{
  "projectId": "1a536",
  "serviceId": "1s2268"
}
```

or a Rancher UI service URL:

```json
{
  "serviceUrl": "http://your-rancher-host:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers"
}
```

### Pipeline Tools

- `rancher_get_pipeline`: fetch pipeline metadata and available actions.
- `rancher_find_pipelines`: search pipeline candidates by project and query.
- `rancher_get_pipeline_activities`: fetch recent build history.
- `rancher_update_pipeline_image`: preview or apply build-step `targetImage` changes. Defaults to `dryRun: true`.
- `rancher_run_pipeline`: run a pipeline using its discoverable `run` action.

Pipeline tools accept either explicit IDs:

```json
{
  "projectId": "1a35",
  "pipelineId": "e1d42fea-9dc6-4856-9fb6-a5585eda1af1"
}
```

or a Rancher pipeline UI URL:

```json
{
  "uiUrl": "http://your-rancher-host:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/e1d42fea-9dc6-4856-9fb6-a5585eda1af1?mode=review"
}
```

## Rancher 1.6 Pipeline Fallback

Some Rancher 1.6 pipeline UI plugin resources are not available at:

```text
/v2-beta/projects/{projectId}/pipelines/{pipelineId}
```

The server falls back to:

```text
/v2-beta/projects/{projectId}/genericobjects?kind=pipeline&key={pipelineId}
```

Then it uses the embedded pipeline server self link. If the embedded `links.self` is missing, it derives:

```text
/r/projects/{projectId}/pipeline-server:60080/v1/pipelines/{pipelineId}
```

This avoids false `actions: {}` results when genericObject metadata is incomplete.

## Pipeline Image Updates

Preview changing a build tag:

```json
{
  "uiUrl": "http://your-rancher-host:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/<pipeline-id>?mode=review",
  "tag": "style_v9_develop",
  "matchImage": "tmall/pc-front",
  "dryRun": true
}
```

Apply after confirmation:

```json
{
  "uiUrl": "http://your-rancher-host:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/<pipeline-id>?mode=review",
  "tag": "style_v9_develop",
  "matchImage": "tmall/pc-front",
  "dryRun": false
}
```

For agent-driven use, preview first (`dryRun: true`), show the proposed `targetImage` changes, then apply only after the user confirms the exact pipeline and image.

## Production Safety

Production writes are blocked by default. A target is protected when either:

- the target has `"protected": true`
- the target has `"environment": "prod"`
- the resolved `projectId` is listed in `RANCHER_PROTECTED_PROJECT_IDS`

Protected read operations are allowed. Protected write operations require:

```json
{
  "RANCHER_ALLOW_PROD_WRITES": "true"
}
```

and a precise confirmation token:

```json
{
  "target": "prod-erp",
  "confirm": "PROD prod-erp 1s999"
}
```
