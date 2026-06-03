# README Workflow

## Source Of Truth

Look for a `## Rancher` section in the current project `README.md`.

Expected shape:

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

Stable field names:

- `Environment`
- `Protected`
- `Environment URL`
- `Service URL`
- `Pipeline URL`
- `Notes`

## Matching

When the user names an environment and app, match case-insensitively against headings such as:

- `Test / ERP`
- `Prod / ERP`
- `测试 / ERP`

If multiple entries match, ask the user which one to use.

## Missing README Section

If no README Rancher section exists, try discovery before asking the user for URLs.

Discovery must cover both pipeline and service when the user asks to "build and update", "构建并更新", "发布", or similar.

Discovery order:

1. Infer search terms from the repository directory name, `package.json` name, README title, and user wording.
2. If the user names an environment such as `test/ERP`, `test/WMS`, `prod/ERP`, or says "测试环境"/"生产环境", call `rancher_list_projects` when needed to map environment names to project IDs.
3. Call `rancher_find_pipelines` with the strongest search term. Pass `projectId` if known.
4. For build-and-update requests, use the selected pipeline candidate's `targetImage` and likely app name to call `rancher_find_services`.
5. If there is one strong pipeline candidate and one strong service candidate, show both and ask the user to confirm the pair before doing anything write-like.
6. If there are multiple pipeline or service candidates, list the best few and ask the user to choose.
7. If no pipeline candidates exist, ask the user for the Pipeline URL.
8. If no service candidates exist for a build-and-update request, ask the user for the Service URL or whether to build only.
9. After user confirmation, add or update `README.md` with the confirmed Pipeline URL and Service URL.

## README Update Rules

Only edit `README.md` after user confirmation.

When adding a discovered entry, use:

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

Leave unknown fields blank rather than fabricating them.
