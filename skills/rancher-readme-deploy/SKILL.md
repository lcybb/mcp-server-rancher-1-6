---
name: rancher-readme-deploy
description: Use when the user asks Codex to inspect, build, deploy, upgrade, rollback, or check Rancher services/pipelines for a project whose README contains a Rancher section with Service URL and Pipeline URL entries.
---

# Rancher README Deploy

Use this workflow when a user asks to operate Rancher for the current project, such as checking service status, running a pipeline, viewing build history, upgrading a service image, finishing an upgrade, or rolling back.

## Source Of Truth

- Rancher credentials and base URL must come from MCP environment variables.
- Application/environment mapping comes from the current project's `README.md`.
- `RANCHER_TARGETS_FILE` is optional; do not require it for project-based work.
- Never read, print, or write Rancher access keys or secret keys in project files.

## README Format

Look for a `## Rancher` section in the current project `README.md`.

Within it, match entries like:

```md
### Test / ERP

- Environment: test
- Protected: false
- Environment URL: ...
- Service URL: ...
- Pipeline URL: ...
- Notes: ...
```

Use stable field names:

- `Environment`
- `Protected`
- `Environment URL`
- `Service URL`
- `Pipeline URL`
- `Notes`

## Matching

When the user names an environment and app, match case-insensitively against headings such as `Test / ERP`, `Prod / ERP`, or `测试 / ERP`.

If multiple entries match, stop and ask the user which one to use.

If no README Rancher section exists, try discovery before asking the user for URLs. Discovery must cover both the pipeline and the service when the user asks to "build and update", "构建并更新", "发布", or similar.

Discovery order:

1. Infer search terms from the current repository directory name, `package.json` name, README title, and user wording.
2. If the user names an environment such as `test/ERP`, `test/WMS`, `prod/ERP`, or only says "测试环境"/"生产环境", call `rancher_list_projects` when needed to map environment names to project IDs.
3. Call `rancher_find_pipelines` with the strongest search term. If the user named a project/environment ID, pass `projectId`; otherwise search all accessible projects.
4. For build-and-update requests, use the selected pipeline candidate's `targetImage` and likely app name to call `rancher_find_services`.
5. If there is one strong pipeline candidate and one strong service candidate, show both and ask the user to confirm the pair before doing anything write-like.
6. If there are multiple pipeline or service candidates, list the best few and ask the user to choose.
7. If no pipeline candidates exist, ask the user for the Pipeline URL.
8. If no service candidates exist for a build-and-update request, ask the user for the Service URL or whether to build only.
9. After user confirmation, add or update the project's `README.md` `## Rancher` section with the confirmed Pipeline URL and Service URL.

## MCP Tool Usage

Use the Rancher MCP tools with URLs from README:

- Service status: call `rancher_get_service` with `{ "serviceUrl": "..." }`.
- Environment/project discovery: call `rancher_list_projects` to map `projectId` to names like `test/ERP` or `prod/WMS`.
- Service discovery: call `rancher_find_services` with `{ "query": "..." }`, `{ "image": "..." }`, or `{ "projectId": "...", "query": "..." }`.
- Service upgrade: call `rancher_upgrade_service` with `{ "serviceUrl": "...", "image": "..." }`.
- Wait service: call `rancher_wait_service` with `{ "serviceUrl": "..." }`.
- Finish upgrade: call `rancher_finish_service_upgrade` with `{ "serviceUrl": "..." }`.
- Rollback: call `rancher_rollback_service_upgrade` with `{ "serviceUrl": "..." }`.
- Pipeline metadata: call `rancher_get_pipeline` with `{ "uiUrl": "..." }`.
- Pipeline history: call `rancher_get_pipeline_activities` with `{ "uiUrl": "...", "limit": 10 }`.
- Pipeline discovery: call `rancher_find_pipelines` with `{ "query": "..." }` or `{ "projectId": "...", "query": "..." }`.
- Pipeline image update preview: call `rancher_update_pipeline_image` with `{ "uiUrl": "...", "tag": "...", "dryRun": true }` or `{ "uiUrl": "...", "image": "...", "dryRun": true }`.
- Pipeline image update apply: after user confirmation, call `rancher_update_pipeline_image` with `dryRun: false`.
- Run pipeline: call `rancher_run_pipeline` with `{ "uiUrl": "..." }`.

Before any write operation, including test environment writes, restate the matched environment, app, pipeline candidate, service candidate, and intended operation, then wait for the user's explicit confirmation. Do not run a pipeline, upgrade a service, finish an upgrade, cancel, or rollback in the same turn that discovered candidates unless the user already gave an unambiguous confirmation for those exact resources.

For "build current project test environment and update" requests:

1. Resolve or discover the Pipeline URL.
2. Resolve or discover the Service URL.
3. Read pipeline metadata and service status.
4. If the user supplied a new image tag or image, run `rancher_update_pipeline_image` with `dryRun: true` and include the proposed targetImage changes in the confirmation summary.
5. Present a confirmation summary:
   - environment
   - pipelineName, branch, targetImage, Pipeline URL
   - service name, current image, health/state, Service URL
   - proposed pipeline targetImage changes, if any
   - planned actions: optionally update pipeline targetImage, run pipeline, then upgrade service to the pipeline target image if needed
6. Wait for user confirmation.
7. If a new image tag or image was supplied, apply `rancher_update_pipeline_image` with `dryRun: false`.
8. Run the pipeline.
9. Check build history until the new activity completes or report the activity ID if still running.
10. Only after a successful build, upgrade the service using the confirmed Service URL and target image.
11. Wait for the service to stop transitioning, then report final status.

## Production Safety

Treat an entry as production/protected if:

- `Environment` is `prod`, `production`, `生产`, or `prd`
- `Protected` is `true`
- the heading contains `Prod`, `Production`, or `生产`

For protected write operations:

1. First perform a read-only check with `rancher_get_service`, `rancher_get_pipeline`, or `rancher_get_pipeline_activities`.
2. Restate the resolved projectId and serviceId or pipelineId from the read-only result.
3. Ask the user for explicit confirmation.
4. Only then call the write tool with the MCP-required `confirm` value.

Never run production write operations based only on an ambiguous user request.

## README Update Rules

Only edit `README.md` after user confirmation.

When adding a discovered Rancher entry, use this shape:

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

Leave unknown fields blank rather than fabricating them. If the user later provides a service page URL, fill `Service URL`.
