# Agent Skills

本项目内置 Agent Skill，目录位于 `skills/`。

| Skill | 类型 | 用途 |
| --- | --- | --- |
| `rancher-readme-deploy` | Rancher 发布 | 读取业务项目 README 中的 Rancher 配置，发现缺失的服务/流水线，确认后调用 Rancher MCP。 |

## rancher-readme-deploy

入口文件：

```text
skills/rancher-readme-deploy/SKILL.md
```

参考流程：

- `skills/rancher-readme-deploy/references/readme-workflow.md`
- `skills/rancher-readme-deploy/references/build-update-workflow.md`
- `skills/rancher-readme-deploy/references/production-safety.md`

界面元数据：

- `skills/rancher-readme-deploy/agents/openai.yaml`

Skill 的核心原则：

- Rancher URL 和密钥只来自 MCP 环境变量。
- 业务项目 README 只保存环境、服务 URL、流水线 URL 等映射信息。
- 测试环境写操作也必须先展示匹配结果并等待用户确认。
- 生产环境按受保护目标处理，默认阻止写操作。

## 安装 Skill

如果当前仓库已 clone 到本地，复制 Skill 到 Codex skills 目录：

```bash
mkdir -p ~/.codex/skills
cp -R skills/rancher-readme-deploy ~/.codex/skills/
```

如果 MCP Server 是通过 `npm install -g` 安装的，可以从全局包目录复制：

```bash
mkdir -p ~/.codex/skills
cp -R "$(npm root -g)/mcp-server-stdio-rancher/skills/rancher-readme-deploy" ~/.codex/skills/
```

重启 Codex 或新开会话，让 Skill 列表刷新。
