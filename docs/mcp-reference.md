# MCP 配置与工具参考

## 运行时配置

在 MCP 客户端配置中设置以下环境变量：

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `RANCHER_URL` | 否 | `http://192.168.0.241:9999` | Rancher 根地址 |
| `RANCHER_ACCESS_KEY` | 是 | 无 | Rancher API Key 的 access key |
| `RANCHER_SECRET_KEY` | 是 | 无 | Rancher API Key 的 secret key |
| `RANCHER_PROJECT_ID` | 否 | 无 | 只传 `serviceId` / `pipelineId` 时的兜底 projectId |
| `RANCHER_REQUEST_TIMEOUT_MS` | 否 | `30000` | HTTP 请求超时时间 |
| `RANCHER_TARGETS_FILE` | 否 | 无 | 可选的目标别名 JSON 文件 |
| `RANCHER_TARGETS_JSON` | 否 | `{}` | 可选的目标别名 JSON 字符串 |
| `RANCHER_ALLOW_PROD_WRITES` | 否 | `false` | 是否允许生产/受保护环境写操作 |
| `RANCHER_PROTECTED_PROJECT_IDS` | 否 | 无 | 逗号分隔的受保护 projectId |

凭证只用于 Basic Auth 请求头，不会写日志，也不应该提交到仓库。

`RANCHER_PROJECT_ID` 只是兜底项。多项目使用时，优先使用业务项目 README 里的 `Service URL` / `Pipeline URL`，或在 MCP tool 参数中传 `serviceUrl` / `uiUrl` / `projectId`。

## MCP 客户端配置

Cursor、Claude Desktop、Codex 等 stdio MCP 客户端都可以使用同样的命令结构：

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

Codex 通常配置在 `~/.codex/config.toml` 的 MCP servers 区域，保持相同的 command、args、env 即可。

## 工具清单

### 项目/环境

- `rancher_list_projects`：查询 `/v2-beta/projects`，返回 Rancher 环境名称和 projectId，用于识别 Test/ERP、Test/WMS、Prod 等环境。

### 应用服务

- `rancher_get_service`：查询服务状态、健康状态、scale、当前镜像、transition 信息和可用 actions。
- `rancher_find_services`：按 project、关键词或镜像搜索服务候选。
- `rancher_upgrade_service`：使用服务资源返回的 `upgrade` action 升级服务。
- `rancher_wait_service`：轮询服务，直到 `transitioning !== "yes"` 或超时。
- `rancher_finish_service_upgrade`：调用 `finishupgrade`。
- `rancher_rollback_service_upgrade`：调用 `rollback`。
- `rancher_cancel_service_upgrade`：调用 `cancelupgrade`。

服务工具支持显式 ID：

```json
{
  "projectId": "1a536",
  "serviceId": "1s2268"
}
```

也支持 Rancher UI 服务地址：

```json
{
  "serviceUrl": "http://your-rancher-host:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers"
}
```

### 流水线

- `rancher_get_pipeline`：查询流水线元数据和可用 actions。
- `rancher_find_pipelines`：按 project 和关键词搜索流水线候选。
- `rancher_get_pipeline_activities`：查询最近构建历史。
- `rancher_update_pipeline_image`：预览或应用构建步骤里的 `targetImage` 修改，默认 `dryRun: true`。
- `rancher_run_pipeline`：通过 discoverable action 触发流水线。

流水线工具支持显式 ID：

```json
{
  "projectId": "1a35",
  "pipelineId": "e1d42fea-9dc6-4856-9fb6-a5585eda1af1"
}
```

也支持 Rancher pipeline UI 地址：

```json
{
  "uiUrl": "http://your-rancher-host:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/e1d42fea-9dc6-4856-9fb6-a5585eda1af1?mode=review"
}
```

## Rancher 1.6 Pipeline Fallback

Rancher 1.6 的 pipeline UI plugin 有时不会在下面的 API 暴露完整资源：

```text
/v2-beta/projects/{projectId}/pipelines/{pipelineId}
```

MCP server 会回退查询：

```text
/v2-beta/projects/{projectId}/genericobjects?kind=pipeline&key={pipelineId}
```

然后优先使用资源中返回的 pipeline-server self link。如果 `links.self` 缺失，会按 Rancher 1.6 的路径推导：

```text
/r/projects/{projectId}/pipeline-server:60080/v1/pipelines/{pipelineId}
```

这样可以避免 genericObject 元数据不完整时误判为 `actions: {}`。

## 修改流水线镜像

先预览：

```json
{
  "uiUrl": "http://your-rancher-host:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/<pipeline-id>?mode=review",
  "tag": "style_v9_develop",
  "matchImage": "tmall/pc-front",
  "dryRun": true
}
```

确认后再应用：

```json
{
  "uiUrl": "http://your-rancher-host:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/<pipeline-id>?mode=review",
  "tag": "style_v9_develop",
  "matchImage": "tmall/pc-front",
  "dryRun": false
}
```

Agent 工作流必须先 dry-run，展示拟修改的 `targetImage`，用户确认后才允许 apply。

## 生产安全

以下情况视为生产/受保护目标：

- target 配置了 `"protected": true`
- target 配置了 `"environment": "prod"`
- projectId 在 `RANCHER_PROTECTED_PROJECT_IDS` 中

生产/受保护环境允许读操作，写操作默认阻止。需要同时满足：

```json
{
  "RANCHER_ALLOW_PROD_WRITES": "true"
}
```

并在 tool 参数中传入精确确认 token：

```json
{
  "target": "prod-erp",
  "confirm": "PROD prod-erp 1s999"
}
```
