# 生产安全

满足以下任一条件时，按生产/受保护目标处理：

- `Environment` 是 `prod`、`production`、`生产` 或 `prd`
- `Protected` 是 `true`
- 标题包含 `Prod`、`Production` 或 `生产`

## 受保护写操作流程

1. 先执行只读检查，例如 `rancher_get_service`、`rancher_get_pipeline` 或 `rancher_get_pipeline_activities`。
2. 从只读结果中复述已解析出的 projectId、serviceId 或 pipelineId。
3. 要求用户明确确认。
4. 确认后，再调用写操作 tool，并传入 MCP 要求的 `confirm` 值。

不要基于模糊请求直接执行生产写操作。

MCP server 还会根据以下配置强制保护写操作：

- `RANCHER_ALLOW_PROD_WRITES`
- `RANCHER_PROTECTED_PROJECT_IDS`
- target alias 中的 `environment: "prod"` 或 `protected: true`
