#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createServer } from "./mcp.js";

const server = createServer(loadConfig());
await server.connect(new StdioServerTransport());
