# Build And Update Workflow

Use this when the user asks for "构建当前项目测试环境并更新", "build and update", "发布", or similar.

## Tool Usage

- Service status: call `rancher_get_service` with `{ "serviceUrl": "..." }`.
- Service discovery: call `rancher_find_services` with `{ "query": "..." }`, `{ "image": "..." }`, or `{ "projectId": "...", "query": "..." }`.
- Service upgrade: call `rancher_upgrade_service` with `{ "serviceUrl": "...", "image": "..." }`.
- Wait service: call `rancher_wait_service` with `{ "serviceUrl": "..." }`.
- Pipeline metadata: call `rancher_get_pipeline` with `{ "uiUrl": "..." }`.
- Pipeline history: call `rancher_get_pipeline_activities` with `{ "uiUrl": "...", "limit": 10 }`.
- Pipeline discovery: call `rancher_find_pipelines` with `{ "query": "..." }` or `{ "projectId": "...", "query": "..." }`.
- Pipeline image update preview: call `rancher_update_pipeline_image` with `{ "uiUrl": "...", "tag": "...", "dryRun": true }` or `{ "uiUrl": "...", "image": "...", "dryRun": true }`.
- Pipeline image update apply: after user confirmation, call `rancher_update_pipeline_image` with `dryRun: false`.
- Run pipeline: call `rancher_run_pipeline` with `{ "uiUrl": "..." }`.

## Required Flow

1. Resolve or discover the Pipeline URL.
2. Resolve or discover the Service URL.
3. Read pipeline metadata and service status.
4. If the user supplied a new image tag or full image, run `rancher_update_pipeline_image` with `dryRun: true` and include the proposed `targetImage` changes in the confirmation summary.
5. Present a confirmation summary:
   - environment/project name
   - pipeline name, branch, targetImage, Pipeline URL
   - service name, current image, health/state, Service URL
   - proposed pipeline targetImage changes, if any
   - planned actions
6. Wait for explicit user confirmation.
7. If a new image tag or image was supplied, apply `rancher_update_pipeline_image` with `dryRun: false`.
8. Run the pipeline.
9. Check build history until the new activity completes, or report the activity ID if still running.
10. Only after a successful build, determine the image for the service upgrade:
   - prefer the confirmed full image from `rancher_update_pipeline_image`
   - otherwise use the pipeline build step `targetImage`
   - if only a tag was changed, preserve the original image repository and replace only the tag
11. Upgrade the service using the confirmed Service URL and resolved image.
12. Wait for the service to stop transitioning, then report final status.

Do not run a pipeline, update a pipeline image, upgrade a service, finish an upgrade, cancel, or rollback in the same turn that discovered candidates unless the user already gave an unambiguous confirmation for those exact resources.
