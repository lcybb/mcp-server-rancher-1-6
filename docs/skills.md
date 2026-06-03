# Skills

Bundled Agent Skills live under `skills/`.

| Skill | Category | Purpose |
| --- | --- | --- |
| `rancher-readme-deploy` | Rancher deploy | Reads project README Rancher entries, discovers missing services/pipelines, asks for confirmation, and calls Rancher MCP tools. |

## rancher-readme-deploy

Entry point:

```text
skills/rancher-readme-deploy/SKILL.md
```

Reference files:

- `skills/rancher-readme-deploy/references/readme-workflow.md`
- `skills/rancher-readme-deploy/references/build-update-workflow.md`
- `skills/rancher-readme-deploy/references/production-safety.md`

UI metadata:

- `skills/rancher-readme-deploy/agents/openai.yaml`

The skill intentionally keeps Rancher credentials out of project files. It reads service and pipeline URLs from the target project's README and passes those URLs into MCP tools.

## Installing The Skill

Copy the skill directory into Codex's skills directory:

```bash
mkdir -p ~/.codex/skills
cp -R skills/rancher-readme-deploy ~/.codex/skills/
```

Restart Codex or start a new session so the skill list refreshes.
