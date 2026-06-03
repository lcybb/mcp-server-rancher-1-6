# 文档

这里存放 `@szt/rancher` 的长期文档。根目录 `README.md` 保持为项目入口，详细配置、工具说明和 Agent 工作流放在 `docs/` 与 `skills/` 中。

## 从这里开始

- [MCP 配置与工具参考](mcp-reference.md)：环境变量、客户端配置、工具清单、安全规则。
- [业务项目 README Rancher 配置规范](project-readme-rancher.md)：每个项目如何维护 Test/Prod、Service URL、Pipeline URL。
- [Agent Skills 使用说明](skills.md)：Skill 的目录结构、安装方式和工作流。
- [开发说明](development.md)：本地开发、测试、构建和仓库结构。

## 维护原则

- 凭证只放 MCP 客户端环境变量，不写入 README、docs、skills 或提交的配置文件。
- 示例中的 Rancher 地址、项目 ID、服务 ID、流水线 ID 尽量使用占位符。
- 面向人的说明放在 `docs/`，面向 Agent 的流程放在 `skills/`。
- 根 README 只保留快速开始和导航，避免变成长篇参考手册。
