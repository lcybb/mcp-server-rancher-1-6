# Project README Rancher Section

Each application can describe its Rancher deployment targets in its own `README.md`. Codex uses the bundled skill to read this section and call MCP tools with URLs.

## Recommended Section

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

## Field Names

Keep these names stable so the skill can parse the section reliably:

- `Environment`
- `Protected`
- `Environment URL`
- `Service URL`
- `Pipeline URL`
- `Notes`

## If The Section Is Missing

The skill should:

1. infer a search term from the repository name, `package.json`, README title, and user request
2. call `rancher_list_projects` if it needs to map names such as `test/ERP` to project IDs
3. call `rancher_find_pipelines`
4. call `rancher_find_services` for build-and-update workflows
5. show candidates and wait for user confirmation
6. update `README.md` only after confirmation

Unknown fields should remain blank rather than fabricated.
