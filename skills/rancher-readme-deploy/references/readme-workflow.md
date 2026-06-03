# README 工作流

## 信息来源

优先查找当前项目 `README.md` 中的 `## Rancher` 段落。

推荐格式：

```md
## Rancher

### Test / ERP

- Environment: test
- Protected: false
- Environment URL: ...
- Service URL: ...
- Pipeline URL: ...
- Notes: ...
```

稳定字段名：

- `Environment`
- `Protected`
- `Environment URL`
- `Service URL`
- `Pipeline URL`
- `Notes`

## 匹配规则

当用户指定环境和应用时，大小写不敏感地匹配标题，例如：

- `Test / ERP`
- `Prod / ERP`
- `测试 / ERP`

如果多个条目匹配，先让用户选择。

## README 缺少 Rancher 段落

如果没有 Rancher 配置，先尝试发现候选，再让用户确认。

“构建并更新”“构建当前项目测试环境并更新”“发布”等请求，必须同时发现 pipeline 和 service。

发现顺序：

1. 从仓库目录名、`package.json` name、README 标题和用户请求推断搜索词。
2. 如果用户提到 `test/ERP`、`test/WMS`、`prod/ERP`、测试环境或生产环境，必要时调用 `rancher_list_projects` 映射 projectId。
3. 用最强搜索词调用 `rancher_find_pipelines`。如果已知 projectId，则传入 projectId。
4. 对构建并更新类请求，使用选中 pipeline 的 `targetImage` 或应用名调用 `rancher_find_services`。
5. 如果只有一个强 pipeline 候选和一个强 service 候选，展示这两个资源并要求用户确认。
6. 如果有多个候选，列出最可能的几个，让用户选择。
7. 如果没有 pipeline 候选，要求用户提供 Pipeline URL。
8. 如果构建并更新类请求没有 service 候选，要求用户提供 Service URL，或询问是否只构建流水线。
9. 用户确认后，再新增或更新 `README.md` 的 `## Rancher` 段落。

## README 写回规则

只有在用户确认后才能编辑 `README.md`。

新增条目使用：

```md
## Rancher

### Test / <App Name>

- Environment: test
- Protected: false
- Environment URL:
- Service URL:
- Pipeline URL: <confirmed pipeline UI URL>
- Notes:
```

未知字段保持空白，不要编造。
