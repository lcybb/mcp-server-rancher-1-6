# 业务项目 README Rancher 配置规范

每个业务项目可以在自己的 `README.md` 中维护 Rancher 部署目标。Codex 使用 `szt-rancher-deploy` Skill 读取这段配置，再把 URL 传给 MCP tools。

## 推荐格式

```md
## Rancher

### Test / ERP

- Environment: test
- Protected: false
- Environment URL: http://your-rancher-host:9999/env/1a536/apps/stacks
- Service URL: http://your-rancher-host:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers
- Pipeline URL: http://your-rancher-host:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/<pipeline-id>?mode=review
- Notes:

### Prod / ERP

- Environment: prod
- Protected: true
- Environment URL: http://your-rancher-host:9999/env/<project-id>/apps/stacks
- Service URL: http://your-rancher-host:9999/env/<project-id>/apps/stacks/<stack-id>/services/<service-id>/containers
- Pipeline URL: http://your-rancher-host:9999/r/projects/<project-id>/pipeline-ui/#/env/<project-id>/pipelines/pipelines/<pipeline-id>?mode=review
- Notes:
```

## 字段约定

保持字段名稳定，便于 Skill 解析：

- `Environment`
- `Protected`
- `Environment URL`
- `Service URL`
- `Pipeline URL`
- `Notes`

字段值可以是中文说明，但字段名建议保持英文，减少解析歧义。

## 多环境多应用

一个项目可以维护多个 Rancher 条目，例如：

```md
## Rancher

### Test / ERP

- Environment: test
- Protected: false
- Environment URL:
- Service URL:
- Pipeline URL:
- Notes:

### Test / WMS

- Environment: test
- Protected: false
- Environment URL:
- Service URL:
- Pipeline URL:
- Notes:

### Prod / ERP

- Environment: prod
- Protected: true
- Environment URL:
- Service URL:
- Pipeline URL:
- Notes: 生产环境写操作需要二次确认。
```

当用户说“构建当前项目测试环境并更新”时，Skill 会优先匹配 `Test` 条目；如果存在多个测试应用，会要求用户选择。

## 缺少 Rancher 配置时

如果当前项目没有 `## Rancher` 段落，Skill 应该先尝试发现候选，而不是立刻要求用户手动提供 URL：

1. 从仓库目录名、`package.json` name、README 标题和用户请求推断搜索词。
2. 如用户提到 `test/ERP`、`test/WMS`、生产环境等，必要时调用 `rancher_list_projects` 映射 projectId。
3. 调用 `rancher_find_pipelines` 搜索流水线候选。
4. 对“构建并更新”类请求，同时调用 `rancher_find_services` 搜索服务候选。
5. 展示候选 pipeline/service，并等待用户确认。
6. 用户确认后，再把确认过的 URL 写回 `README.md`。

未知字段保持空白，不要编造。
