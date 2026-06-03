---
name: szt-rancher-deploy
description: 当用户要求 Codex 检查、构建、发布、升级、回滚或查看 Rancher 服务/流水线，并且当前项目 README 包含或应该包含 Rancher 的 Service URL / Pipeline URL 配置时使用。
metadata:
  requires:
    mcpServers: ["rancher"]
---

# Rancher README Deploy

这是基于业务项目 `README.md` 的 Rancher 操作 Skill，适用于服务状态检查、流水线运行、构建历史查看、流水线镜像 tag 修改、服务升级、完成升级、回滚、取消升级，以及“构建测试环境并更新”等工作流。

## 核心规则

- Rancher URL 和密钥只来自 MCP 环境变量。
- 应用/环境映射来自当前项目 `README.md` 的 `## Rancher` 段落。
- 不读取、不打印、不写入 Rancher access key 或 secret key。
- 优先使用 `serviceUrl` 和 `uiUrl` tool 参数，不优先使用零散 ID。
- 任何写操作都必须先展示匹配到的资源并等待用户明确确认，测试环境也一样。
- 生产/受保护目标必须遵守 [production-safety.md](references/production-safety.md) 的更严格确认流程。

## 参考流程

- README 格式、匹配、发现候选、写回规则：[readme-workflow.md](references/readme-workflow.md)
- 构建流水线、修改镜像 tag、升级服务：[build-update-workflow.md](references/build-update-workflow.md)
- 生产/受保护环境安全规则：[production-safety.md](references/production-safety.md)

## MCP Tool 对照

- 环境/项目发现：`rancher_list_projects`
- 服务发现、状态、升级：`rancher_find_services`、`rancher_get_service`、`rancher_upgrade_service`、`rancher_wait_service`、`rancher_finish_service_upgrade`、`rancher_rollback_service_upgrade`、`rancher_cancel_service_upgrade`
- 流水线发现、状态、历史、运行：`rancher_find_pipelines`、`rancher_get_pipeline`、`rancher_get_pipeline_activities`、`rancher_update_pipeline_image`、`rancher_run_pipeline`

行动前先读取与用户请求匹配的 reference 文件。
