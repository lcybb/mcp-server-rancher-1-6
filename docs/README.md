# Documentation

This directory keeps long-lived documentation for `mcp-server-rancher-1-6`. The root `README.md` stays as the project entry point; detailed references live here.

## Start Here

- MCP configuration, environment variables, tools, and safety rules: [mcp-reference.md](mcp-reference.md)
- Project README `## Rancher` section format: [project-readme-rancher.md](project-readme-rancher.md)
- Agent Skill layout and workflow: [skills.md](skills.md)
- Local development, testing, and repository structure: [development.md](development.md)

## Maintenance Rules

- Keep credentials out of docs, skills, examples, and committed configs.
- Use documentation examples with placeholder hosts or placeholder IDs unless the values are intentionally public.
- Put workflow instructions for agents in `skills/`; put user-facing and developer-facing documentation in `docs/`.
