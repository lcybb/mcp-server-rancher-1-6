# 开发说明

## 仓库结构

```text
.
├── src/                         # TypeScript MCP server 实现
├── test/                        # Vitest 单元测试
├── docs/                        # 长期文档
├── skills/                      # Agent Skills
├── rancher-targets.example.json # 可选 target alias 示例
├── package.json
└── README.md
```

## 源码模块

- `src/index.ts`：stdio 入口。
- `src/config.ts`：环境变量与可选 target aliases 加载。
- `src/rancherClient.ts`：Rancher HTTP client，负责 URL 拼接、Basic Auth、超时、错误格式化。
- `src/service.ts`：服务 URL 解析、服务摘要、升级 payload 构建。
- `src/pipeline.ts`：流水线 URL 解析、genericObject fallback、镜像更新辅助逻辑。
- `src/safety.ts`：生产/受保护写操作校验。
- `src/mcp.ts`：MCP tool 注册和编排。

## 本地命令

```bash
npm install
npm test
npm run typecheck
npm run build
```

本地运行：

```bash
RANCHER_URL="http://your-rancher-host:9999" \
RANCHER_ACCESS_KEY="..." \
RANCHER_SECRET_KEY="..." \
npm run dev
```

## Git 约定

以下本地文件不应提交：

- `node_modules/`
- `dist/`
- `rancher-targets.local.json`

不要提交真实 Rancher 密钥，也不要提交只属于生产环境的敏感拓扑配置。
