# 构建并更新工作流

当用户说“构建当前项目测试环境并更新”“build and update”“发布”等类似请求时使用。

## Tool 使用方式

- 服务状态：调用 `rancher_get_service`，参数 `{ "serviceUrl": "..." }`。
- 服务发现：调用 `rancher_find_services`，可传 `{ "query": "..." }`、`{ "image": "..." }` 或 `{ "projectId": "...", "query": "..." }`。
- 服务升级：调用 `rancher_upgrade_service`，参数 `{ "serviceUrl": "...", "image": "..." }`。
- 等待服务：调用 `rancher_wait_service`，参数 `{ "serviceUrl": "..." }`。
- 流水线元数据：调用 `rancher_get_pipeline`，参数 `{ "uiUrl": "..." }`。
- 构建历史：调用 `rancher_get_pipeline_activities`，参数 `{ "uiUrl": "...", "limit": 10 }`。
- 流水线发现：调用 `rancher_find_pipelines`，可传 `{ "query": "..." }` 或 `{ "projectId": "...", "query": "..." }`。
- 流水线镜像预览：调用 `rancher_update_pipeline_image`，参数 `{ "uiUrl": "...", "tag": "...", "dryRun": true }` 或 `{ "uiUrl": "...", "image": "...", "dryRun": true }`。
- 流水线镜像应用：用户确认后，调用 `rancher_update_pipeline_image` 并设置 `dryRun: false`。
- 运行流水线：调用 `rancher_run_pipeline`，参数 `{ "uiUrl": "..." }`。

## 必须遵守的流程

1. 解析或发现 Pipeline URL。
2. 解析或发现 Service URL。
3. 读取流水线元数据和服务状态。
4. 如果用户提供了新的 image tag 或完整 image，先用 `rancher_update_pipeline_image` 做 `dryRun: true`，并在确认摘要中展示拟修改的 `targetImage`。
5. 展示确认摘要：
   - 环境/project 名称
   - 流水线名称、分支、targetImage、Pipeline URL
   - 服务名称、当前镜像、健康状态、服务状态、Service URL
   - 拟修改的 pipeline targetImage，如有
   - 计划执行的动作
6. 等待用户明确确认。
7. 如果用户提供了新的 image tag 或 image，确认后再应用 `rancher_update_pipeline_image`，设置 `dryRun: false`。
8. 运行流水线。
9. 查询构建历史，直到新 activity 完成；如果仍在运行，报告 activity ID。
10. 只有构建成功后，才解析服务升级要使用的镜像：
   - 优先使用 `rancher_update_pipeline_image` 确认过的完整 image
   - 否则使用流水线构建步骤中的 `targetImage`
   - 如果只改了 tag，保留原 image repository，仅替换 tag
11. 使用确认过的 Service URL 和解析出的 image 升级服务。
12. 等待服务停止 transitioning，然后报告最终状态。

在同一轮中刚发现候选资源时，不要立刻运行流水线、修改流水线镜像、升级服务、完成升级、取消或回滚。除非用户已经对这些精确资源给出明确确认。
