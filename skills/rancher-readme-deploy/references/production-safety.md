# Production Safety

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

The MCP server also enforces protected writes when configured with:

- `RANCHER_ALLOW_PROD_WRITES`
- `RANCHER_PROTECTED_PROJECT_IDS`
- target aliases with `environment: "prod"` or `protected: true`
