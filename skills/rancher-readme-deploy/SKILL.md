---
name: rancher-readme-deploy
description: Use when the user asks Codex to inspect, build, deploy, upgrade, rollback, or check Rancher services/pipelines for a project whose README contains or should contain a Rancher section with Service URL and Pipeline URL entries.
metadata:
  requires:
    mcpServers: ["rancher"]
---

# Rancher README Deploy

Use this skill for Rancher operations driven by the current project's `README.md`, including service status checks, pipeline runs, build history, pipeline image tag changes, service upgrades, finish/rollback/cancel upgrade flows, and "build test environment and update" workflows.

## Core Rules

- Rancher URL and credentials come only from MCP environment variables.
- Project/application mapping comes from the current project's `README.md` `## Rancher` section.
- Never read, print, or write Rancher access keys or secret keys in project files.
- Prefer `serviceUrl` and `uiUrl` tool inputs over ad-hoc IDs.
- Before any write operation, including test environment writes, show the matched resources and wait for explicit user confirmation.
- For production/protected entries, follow the stricter confirmation flow in [production-safety.md](references/production-safety.md).

## Reference Workflows

- README format, matching, discovery, and README update rules: [readme-workflow.md](references/readme-workflow.md)
- Build pipeline, update image tag, and upgrade service workflow: [build-update-workflow.md](references/build-update-workflow.md)
- Production/protected safety rules: [production-safety.md](references/production-safety.md)

## MCP Tool Map

- Environment/project discovery: `rancher_list_projects`
- Service discovery/status/update: `rancher_find_services`, `rancher_get_service`, `rancher_upgrade_service`, `rancher_wait_service`, `rancher_finish_service_upgrade`, `rancher_rollback_service_upgrade`, `rancher_cancel_service_upgrade`
- Pipeline discovery/status/history/run: `rancher_find_pipelines`, `rancher_get_pipeline`, `rancher_get_pipeline_activities`, `rancher_update_pipeline_image`, `rancher_run_pipeline`

Load the referenced workflow file that matches the user's request before acting.
