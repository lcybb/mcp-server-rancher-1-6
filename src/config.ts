import { readFileSync } from "node:fs";

export type RancherTargetConfig = {
  environment?: string;
  protected?: boolean;
  projectId?: string;
  stackId?: string;
  serviceId?: string;
  serviceUrl?: string;
  pipelineId?: string;
  pipelineUrl?: string;
  description?: string;
};

export type RancherConfig = {
  baseUrl: string;
  accessKey: string;
  secretKey: string;
  defaultProjectId?: string;
  timeoutMs: number;
  targets: Record<string, RancherTargetConfig>;
  allowProdWrites: boolean;
  protectedProjectIds: string[];
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RancherConfig {
  const baseUrl = env.RANCHER_URL ?? "http://192.168.0.241:9999";
  const accessKey = env.RANCHER_ACCESS_KEY;
  const secretKey = env.RANCHER_SECRET_KEY;
  const defaultProjectId = env.RANCHER_PROJECT_ID;
  const timeoutMs = parsePositiveInteger(env.RANCHER_REQUEST_TIMEOUT_MS, 30000);
  const targets = loadTargets(env.RANCHER_TARGETS_FILE, env.RANCHER_TARGETS_JSON);
  const allowProdWrites = env.RANCHER_ALLOW_PROD_WRITES === "true";
  const protectedProjectIds = parseCsv(env.RANCHER_PROTECTED_PROJECT_IDS);

  if (!accessKey) {
    throw new Error("RANCHER_ACCESS_KEY is required");
  }
  if (!secretKey) {
    throw new Error("RANCHER_SECRET_KEY is required");
  }

  return {
    baseUrl,
    accessKey,
    secretKey,
    defaultProjectId,
    timeoutMs,
    targets,
    allowProdWrites,
    protectedProjectIds
  };
}

function loadTargets(filePath: string | undefined, jsonValue: string | undefined): Record<string, RancherTargetConfig> {
  if (filePath) {
    let fileContent: string;
    try {
      fileContent = readFileSync(filePath, "utf8");
    } catch (error) {
      throw new Error(`Failed to read RANCHER_TARGETS_FILE ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return parseTargets(fileContent, `RANCHER_TARGETS_FILE ${filePath}`);
  }

  return parseTargets(jsonValue, "RANCHER_TARGETS_JSON");
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("RANCHER_REQUEST_TIMEOUT_MS must be a positive integer");
  }
  return parsed;
}

function parseTargets(value: string | undefined, source: string): Record<string, RancherTargetConfig> {
  if (!value) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`${source} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${source} must be a JSON object`);
  }

  const targets: Record<string, RancherTargetConfig> = {};
  for (const [name, target] of Object.entries(parsed)) {
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      throw new Error(`${source} target ${name} must be an object`);
    }

    targets[name] = pickTargetFields(target as Record<string, unknown>);
  }

  return targets;
}

function pickTargetFields(target: Record<string, unknown>): RancherTargetConfig {
  return {
    environment: stringField(target, "environment"),
    protected: booleanField(target, "protected"),
    projectId: stringField(target, "projectId"),
    stackId: stringField(target, "stackId"),
    serviceId: stringField(target, "serviceId"),
    serviceUrl: stringField(target, "serviceUrl"),
    pipelineId: stringField(target, "pipelineId"),
    pipelineUrl: stringField(target, "pipelineUrl"),
    description: stringField(target, "description")
  };
}

function stringField(target: Record<string, unknown>, key: keyof RancherTargetConfig): string | undefined {
  const value = target[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`RANCHER_TARGETS_JSON field ${key} must be a non-empty string`);
  }
  return value;
}

function booleanField(target: Record<string, unknown>, key: keyof RancherTargetConfig): boolean | undefined {
  const value = target[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`RANCHER_TARGETS_JSON field ${key} must be a boolean`);
  }
  return value;
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
