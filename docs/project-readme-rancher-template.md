# Project README Rancher Section Template

Copy this section into each application's `README.md` and fill in the URLs.

Do not put Rancher access keys or secret keys in the project README.

```md
## Rancher

### Test / ERP

- Environment: test
- Protected: false
- Environment URL: http://192.168.0.241:9999/env/1a536/apps/stacks
- Service URL: http://192.168.0.241:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers
- Pipeline URL: http://192.168.0.241:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/e1d42fea-9dc6-4856-9fb6-a5585eda1af1?mode=review
- Notes: Build branch develop.

### Prod / ERP

- Environment: prod
- Protected: true
- Environment URL: http://192.168.0.241:9999/env/replace-me/apps/stacks
- Service URL: http://192.168.0.241:9999/env/replace-me/apps/stacks/replace-me/services/replace-me/containers
- Pipeline URL: http://192.168.0.241:9999/r/projects/replace-me/pipeline-ui/#/env/replace-me/pipelines/pipelines/replace-me?mode=review
- Notes: Production writes require explicit confirmation.
```

Recommended field names:

- `Environment`
- `Protected`
- `Environment URL`
- `Service URL`
- `Pipeline URL`
- `Notes`
