# @szt/rancher

Rancher 1.6 MCP stdio 服务 — 让人类和 AI Agent 都能通过 Rancher 1.6 `/v2-beta` API 操作服务与流水线。

本项目分为两层：

- **MCP Server**：提供 Rancher API 工具，包括服务查询、服务升级、流水线查询、流水线构建、镜像 tag 修改等。
- **Agent Skill**：读取业务项目 `README.md` 中的 `## Rancher` 配置，识别测试/生产环境、应用服务和流水线，确认后再调用 MCP。

## 功能范围

| 品类 | 能力 |
| --- | --- |
| 项目/环境 | 查询 Rancher projects，用于识别 Test/ERP、Test/WMS、Prod 等环境 |
| 应用服务 | 查询服务状态、健康状态、scale、当前镜像、升级、等待、完成升级、回滚、取消升级 |
| 流水线 | 查询流水线、搜索流水线、查看构建历史、修改构建镜像、触发构建 |
| Agent 工作流 | 从项目 README 读取 Service URL / Pipeline URL，缺失时搜索候选并要求确认后写回 |
| 安全控制 | Rancher 密钥只放 MCP 环境变量；测试环境写操作也需确认；生产环境默认阻止写操作 |

Rancher 1.6 pipeline UI plugin 的 `genericobjects -> pipeline-server` fallback 已内置处理。

## 快速开始

### 前置条件

- Node.js `>= 20`
- Rancher 1.6 API Key
- 一个支持 stdio MCP 的客户端，例如 Codex、Cursor、Claude Desktop

### 方式一：从内网 GitLab 仓库全局安装

```bash
npm install -g git+ssh://git@your-gitlab-host/group/rancher.git
```

安装后可直接执行：

```bash
szt-rancher
```

也可以指定分支、tag 或 commit：

```bash
npm install -g git+ssh://git@your-gitlab-host/group/rancher.git#main
npm install -g git+ssh://git@your-gitlab-host/group/rancher.git#v0.1.0
```

### 方式二：本地开发安装

```bash
git clone git@your-gitlab-host:group/rancher.git
cd rancher
npm install
npm run build
```

## MCP 客户端配置

全局安装后，MCP 客户端可以直接使用命令名：

```json
{
  "mcpServers": {
    "rancher": {
      "type": "stdio",
      "command": "szt-rancher",
      "args": [],
      "env": {
        "RANCHER_URL": "http://your-rancher-host:9999",
        "RANCHER_ACCESS_KEY": "your-access-key",
        "RANCHER_SECRET_KEY": "your-secret-key"
      }
    }
  }
}
```

本地开发时也可以使用 `node dist/index.js`：

```json
{
  "mcpServers": {
    "rancher": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/rancher/dist/index.js"],
      "env": {
        "RANCHER_URL": "http://your-rancher-host:9999",
        "RANCHER_ACCESS_KEY": "your-access-key",
        "RANCHER_SECRET_KEY": "your-secret-key"
      }
    }
  }
}
```

不要把 Rancher access key / secret key 写入业务项目 README、Skill 文档或仓库配置文件。

## README 驱动的项目配置

推荐在每个业务项目的 `README.md` 中维护 Rancher 入口：

```md
## Rancher

### Test / ERP

- Environment: test
- Protected: false
- Environment URL: http://your-rancher-host:9999/env/1a536/apps/stacks
- Service URL: http://your-rancher-host:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers
- Pipeline URL: http://your-rancher-host:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/<pipeline-id>?mode=review
- Notes:
```

之后可以直接让 Codex 执行类似：

```text
构建当前项目测试环境并更新
```

Codex 会通过 Skill 读取 README，解析对应的 Service URL / Pipeline URL，展示匹配结果并等待确认，然后调用 Rancher MCP。

## 文档

- [文档入口](docs/README.md)
- [MCP 配置与工具参考](docs/mcp-reference.md)
- [业务项目 README Rancher 配置规范](docs/project-readme-rancher.md)
- [Agent Skills 使用说明](docs/skills.md)
- [开发说明](docs/development.md)

## Agent Skills

内置 Skill 位于：

```text
skills/szt-rancher-deploy/SKILL.md
```

安装到 Codex：

```bash
mkdir -p ~/.codex/skills
cp -R skills/szt-rancher-deploy ~/.codex/skills/
```

如果是全局安装，可以从 npm 全局包目录复制：

```bash
mkdir -p ~/.codex/skills
cp -R "$(npm root -g)/@szt/rancher/skills/szt-rancher-deploy" ~/.codex/skills/
```

重启 Codex 或新开会话后生效。

## 验证

```bash
npm test
npm run typecheck
npm run build
```

## 许可证

暂未声明许可证。
