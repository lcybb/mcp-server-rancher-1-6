import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RancherConfig } from "./config.js";
import { RancherClient, type RancherResource } from "./rancherClient.js";
import {
  actionUrl,
  buildUpgradePayload,
  getService,
  resolveServiceRef,
  servicePath,
  summarizeService,
  type RancherService
} from "./service.js";
import {
  buildPipelineImageUpdate,
  choosePipelineAction,
  parsePipelineFromGenericObject,
  pipelineGenericObjectPath,
  pipelinePath,
  pipelineServerPath,
  resolvePipelineRef,
  type RancherGenericObject
} from "./pipeline.js";
import { assertWriteAllowed } from "./safety.js";

const serviceInput = {
  target: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  serviceUrl: z.string().url().optional(),
  projectId: z.string().min(1).optional()
};

const confirmInput = {
  confirm: z.string().min(1).optional()
};

export function createServer(config: RancherConfig): McpServer {
  const client = new RancherClient(config);
  const server = new McpServer({
    name: "mcp-server-stdio-rancher",
    version: "0.1.0"
  });

  server.registerTool(
    "rancher_list_targets",
    {
      title: "List configured Rancher targets",
      description: "List named Rancher targets configured by RANCHER_TARGETS_JSON.",
      inputSchema: {}
    },
    async () => {
      const targets = Object.fromEntries(
        Object.entries(config.targets).map(([name, target]) => [
          name,
          {
            projectId: target.projectId,
            environment: target.environment,
            protected: target.protected,
            stackId: target.stackId,
            serviceId: target.serviceId,
            serviceUrl: target.serviceUrl,
            pipelineId: target.pipelineId,
            pipelineUrl: target.pipelineUrl,
            description: target.description
          }
        ])
      );
      return jsonResult("Configured Rancher targets fetched.", { targets });
    }
  );

  server.registerTool(
    "rancher_list_projects",
    {
      title: "List Rancher projects",
      description: "List Rancher projects/environments from /v2-beta/projects.",
      inputSchema: {}
    },
    async () => {
      const projects = await listProjects(client);
      return jsonResult("Rancher projects fetched.", {
        projects: projects.map(summarizeProject)
      });
    }
  );

  server.registerTool(
    "rancher_get_service",
    {
      title: "Get Rancher service",
      description: "Get Rancher 1.6 service status, health, scale, image and available actions.",
      inputSchema: serviceInput
    },
    async ({ target, serviceId, serviceUrl, projectId }) => {
      const resolved = resolveServiceRef({ target, serviceId, serviceUrl, projectId }, config.defaultProjectId, config.targets);
      const service = await getService(client, resolved.projectId, resolved.serviceId);
      return jsonResult(`Service ${resolved.serviceId} fetched.`, summarizeService(service));
    }
  );

  server.registerTool(
    "rancher_find_services",
    {
      title: "Find Rancher services",
      description: "Search Rancher 1.6 services by project and query without changing them.",
      inputSchema: {
        query: z.string().min(1).optional(),
        projectId: z.string().min(1).optional(),
        image: z.string().min(1).optional(),
        limit: z.number().int().positive().max(100).optional()
      }
    },
    async ({ query, projectId, image, limit = 20 }) => {
      const projectIds = projectId ? [projectId] : await listProjectIds(client);
      const projectNames = await getProjectNameMap(client);
      const normalizedImageQuery = image?.replace(/^docker:/, "").toLowerCase();
      const textQuery = query?.toLowerCase();
      const matches: Record<string, unknown>[] = [];

      for (const currentProjectId of projectIds) {
        const services = await listServices(client, currentProjectId);
        for (const service of services) {
          const candidate = summarizeServiceCandidate(config, currentProjectId, projectNames[currentProjectId], service);
          const candidateText = JSON.stringify(candidate).toLowerCase();
          const imageUuid = String(service.launchConfig?.imageUuid ?? "").replace(/^docker:/, "").toLowerCase();
          const imageMatches = !normalizedImageQuery || imageUuid.includes(normalizedImageQuery);
          const textMatches = !textQuery || candidateText.includes(textQuery);

          if (imageMatches && textMatches) {
            matches.push(candidate);
          }
          if (matches.length >= limit) {
            break;
          }
        }
        if (matches.length >= limit) {
          break;
        }
      }

      return jsonResult(matches.length ? "Service candidates found." : "No service candidates found.", {
        query,
        projectId,
        image,
        count: matches.length,
        services: matches
      });
    }
  );

  server.registerTool(
    "rancher_upgrade_service",
    {
      title: "Upgrade Rancher service",
      description: "Upgrade a Rancher 1.6 service using its discoverable upgrade action.",
      inputSchema: {
        ...serviceInput,
        image: z.string().min(1).optional(),
        batchSize: z.number().int().positive().optional(),
        intervalMillis: z.number().int().nonnegative().optional(),
        startFirst: z.boolean().optional(),
        rawStrategy: z.unknown().optional(),
        ...confirmInput
      }
    },
    async ({ target, serviceId, serviceUrl, projectId, image, batchSize, intervalMillis, startFirst, rawStrategy, confirm }) => {
      const resolved = resolveServiceRef({ target, serviceId, serviceUrl, projectId }, config.defaultProjectId, config.targets);
      assertWriteAllowed(config, {
        targetName: target,
        target: target ? config.targets[target] : undefined,
        projectId: resolved.projectId,
        resourceId: resolved.serviceId,
        resourceType: "service",
        operation: "upgrade",
        confirm
      });
      const path = servicePath(resolved.projectId, resolved.serviceId);
      const service = await client.get<RancherService>(path);
      const payload = buildUpgradePayload(service, { image, batchSize, intervalMillis, startFirst, rawStrategy });
      const result = await client.post(actionUrl(service, "upgrade", path), payload);
      return jsonResult(`Service ${resolved.serviceId} upgrade requested.`, {
        serviceId: resolved.serviceId,
        projectId: resolved.projectId,
        payload,
        result
      });
    }
  );

  server.registerTool(
    "rancher_finish_service_upgrade",
    {
      title: "Finish Rancher service upgrade",
      description: "Call the finishupgrade action for a Rancher 1.6 service.",
      inputSchema: {
        ...serviceInput,
        ...confirmInput
      }
    },
    async ({ target, serviceId, serviceUrl, projectId, confirm }) =>
      runServiceAction(client, config, { target, serviceId, serviceUrl, projectId, confirm }, "finishupgrade")
  );

  server.registerTool(
    "rancher_rollback_service_upgrade",
    {
      title: "Rollback Rancher service upgrade",
      description: "Call the rollback action for a Rancher 1.6 service.",
      inputSchema: {
        ...serviceInput,
        ...confirmInput
      }
    },
    async ({ target, serviceId, serviceUrl, projectId, confirm }) =>
      runServiceAction(client, config, { target, serviceId, serviceUrl, projectId, confirm }, "rollback")
  );

  server.registerTool(
    "rancher_cancel_service_upgrade",
    {
      title: "Cancel Rancher service upgrade",
      description: "Call the cancelupgrade action for a Rancher 1.6 service.",
      inputSchema: {
        ...serviceInput,
        ...confirmInput
      }
    },
    async ({ target, serviceId, serviceUrl, projectId, confirm }) =>
      runServiceAction(client, config, { target, serviceId, serviceUrl, projectId, confirm }, "cancelupgrade")
  );

  server.registerTool(
    "rancher_wait_service",
    {
      title: "Wait for Rancher service",
      description: "Poll a service until transitioning is no longer yes or timeout is reached.",
      inputSchema: {
        ...serviceInput,
        timeoutMs: z.number().int().positive().optional(),
        intervalMs: z.number().int().positive().optional()
      }
    },
    async ({ target, serviceId, serviceUrl, projectId, timeoutMs = 300000, intervalMs = 5000 }) => {
      const resolved = resolveServiceRef({ target, serviceId, serviceUrl, projectId }, config.defaultProjectId, config.targets);
      const deadline = Date.now() + timeoutMs;
      let service = await getService(client, resolved.projectId, resolved.serviceId);

      while (service.transitioning === "yes" && Date.now() < deadline) {
        await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
        service = await getService(client, resolved.projectId, resolved.serviceId);
      }

      const timedOut = service.transitioning === "yes";
      return jsonResult(timedOut ? `Timed out waiting for service ${resolved.serviceId}.` : `Service ${resolved.serviceId} is not transitioning.`, {
        timedOut,
        service: summarizeService(service)
      });
    }
  );

  server.registerTool(
    "rancher_get_pipeline",
    {
      title: "Get Rancher pipeline",
      description: "Get Rancher pipeline metadata and available actions without running it.",
      inputSchema: {
        target: z.string().min(1).optional(),
        uiUrl: z.string().url().optional(),
        projectId: z.string().min(1).optional(),
        pipelineId: z.string().min(1).optional()
      }
    },
    async ({ target, uiUrl, projectId, pipelineId }) => {
      const resolved = resolvePipelineRef({ target, uiUrl, projectId, pipelineId }, config.defaultProjectId, config.targets);
      const { pipeline, source } = await getPipelineResource(client, resolved.projectId, resolved.pipelineId);
      return jsonResult(`Pipeline ${resolved.pipelineId} fetched.`, {
        projectId: resolved.projectId,
        pipelineId: resolved.pipelineId,
        source,
        pipeline: summarizePipeline(pipeline)
      });
    }
  );

  server.registerTool(
    "rancher_find_pipelines",
    {
      title: "Find Rancher pipelines",
      description: "Search Rancher 1.6 pipeline genericObjects by project and query without running them.",
      inputSchema: {
        query: z.string().min(1).optional(),
        projectId: z.string().min(1).optional(),
        limit: z.number().int().positive().max(100).optional()
      }
    },
    async ({ query, projectId, limit = 20 }) => {
      const projectIds = projectId ? [projectId] : await listProjectIds(client);
      const projectNames = await getProjectNameMap(client);
      const matches: Record<string, unknown>[] = [];

      for (const currentProjectId of projectIds) {
        const pipelines = await listPipelineGenericObjects(client, currentProjectId);
        for (const pipelineObject of pipelines) {
          const candidate = summarizePipelineCandidate(config, currentProjectId, projectNames[currentProjectId], pipelineObject);
          if (!query || JSON.stringify(candidate).toLowerCase().includes(query.toLowerCase())) {
            matches.push(candidate);
          }
          if (matches.length >= limit) {
            break;
          }
        }
        if (matches.length >= limit) {
          break;
        }
      }

      return jsonResult(matches.length ? "Pipeline candidates found." : "No pipeline candidates found.", {
        query,
        projectId,
        count: matches.length,
        pipelines: matches
      });
    }
  );

  server.registerTool(
    "rancher_get_pipeline_activities",
    {
      title: "Get Rancher pipeline build history",
      description: "Get recent Rancher pipeline activities/build history without running it.",
      inputSchema: {
        target: z.string().min(1).optional(),
        uiUrl: z.string().url().optional(),
        projectId: z.string().min(1).optional(),
        pipelineId: z.string().min(1).optional(),
        limit: z.number().int().positive().max(100).optional()
      }
    },
    async ({ target, uiUrl, projectId, pipelineId, limit = 10 }) => {
      const resolved = resolvePipelineRef({ target, uiUrl, projectId, pipelineId }, config.defaultProjectId, config.targets);
      const { pipeline, source } = await getPipelineResource(client, resolved.projectId, resolved.pipelineId);
      const activitiesUrl = getPipelineActivitiesUrl(pipeline, source);
      const activities = await client.get<{ data?: RancherResource[] }>(activitiesUrl);
      const items = (activities.data ?? []).slice(0, limit).map(summarizePipelineActivity);

      return jsonResult(`Pipeline ${resolved.pipelineId} activities fetched.`, {
        projectId: resolved.projectId,
        pipelineId: resolved.pipelineId,
        source,
        activitiesUrl,
        count: items.length,
        activities: items
      });
    }
  );

  server.registerTool(
    "rancher_update_pipeline_image",
    {
      title: "Update Rancher pipeline build image",
      description: "Update build step targetImage values in a Rancher pipeline. Defaults to dry-run.",
      inputSchema: {
        target: z.string().min(1).optional(),
        uiUrl: z.string().url().optional(),
        projectId: z.string().min(1).optional(),
        pipelineId: z.string().min(1).optional(),
        image: z.string().min(1).optional(),
        tag: z.string().min(1).optional(),
        matchImage: z.string().min(1).optional(),
        dryRun: z.boolean().optional(),
        ...confirmInput
      }
    },
    async ({ target, uiUrl, projectId, pipelineId, image, tag, matchImage, dryRun = true, confirm }) => {
      const resolved = resolvePipelineRef({ target, uiUrl, projectId, pipelineId }, config.defaultProjectId, config.targets);
      if (!dryRun) {
        assertWriteAllowed(config, {
          targetName: target,
          target: target ? config.targets[target] : undefined,
          projectId: resolved.projectId,
          resourceId: resolved.pipelineId,
          resourceType: "pipeline",
          operation: "update_pipeline_image",
          confirm
        });
      }

      const { pipeline, source } = await getPipelineResource(client, resolved.projectId, resolved.pipelineId);
      const update = buildPipelineImageUpdate(pipeline, { image, tag, matchImage });

      if (dryRun) {
        return jsonResult(`Pipeline ${resolved.pipelineId} image update dry-run completed.`, {
          dryRun: true,
          projectId: resolved.projectId,
          pipelineId: resolved.pipelineId,
          source,
          changes: update.changes,
          payload: update.pipeline
        });
      }

      const updateUrl = pipeline.actions?.update;
      if (!updateUrl) {
        return jsonResult("No pipeline update action was found.", {
          projectId: resolved.projectId,
          pipelineId: resolved.pipelineId,
          availableActions: pipeline.actions ?? {},
          changes: update.changes
        });
      }

      const result = await client.post(updateUrl, update.pipeline);
      return jsonResult(`Pipeline ${resolved.pipelineId} image update requested.`, {
        dryRun: false,
        projectId: resolved.projectId,
        pipelineId: resolved.pipelineId,
        source,
        changes: update.changes,
        result
      });
    }
  );

  server.registerTool(
    "rancher_run_pipeline",
    {
      title: "Run Rancher pipeline",
      description: "Run a Rancher pipeline using a UI URL or explicit project and pipeline IDs.",
      inputSchema: {
        target: z.string().min(1).optional(),
        uiUrl: z.string().url().optional(),
        projectId: z.string().min(1).optional(),
        pipelineId: z.string().min(1).optional(),
        actionName: z.string().min(1).optional(),
        ...confirmInput
      }
    },
    async ({ target, uiUrl, projectId, pipelineId, actionName, confirm }) => {
      const resolved = resolvePipelineRef({ target, uiUrl, projectId, pipelineId }, config.defaultProjectId, config.targets);
      assertWriteAllowed(config, {
        targetName: target,
        target: target ? config.targets[target] : undefined,
        projectId: resolved.projectId,
        resourceId: resolved.pipelineId,
        resourceType: "pipeline",
        operation: "run_pipeline",
        confirm
      });
      const { pipeline, source } = await getPipelineResource(client, resolved.projectId, resolved.pipelineId);
      const selected = choosePipelineAction(pipeline, actionName);

      if (!selected.actionName || !selected.actionUrl) {
        return jsonResult("No executable pipeline action was found.", {
          projectId: resolved.projectId,
          pipelineId: resolved.pipelineId,
          requestedAction: actionName,
          availableActions: selected.availableActions
        });
      }

      const result = await client.post(selected.actionUrl, {});
      return jsonResult(`Pipeline ${resolved.pipelineId} action ${selected.actionName} requested.`, {
        projectId: resolved.projectId,
        pipelineId: resolved.pipelineId,
        actionName: selected.actionName,
        source,
        result
      });
    }
  );

  return server;
}

function summarizePipeline(pipeline: RancherResource): Record<string, unknown> {
  return {
    id: pipeline.id,
    name: pipeline.name,
    state: pipeline.state,
    isActivate: pipeline.isActivate,
    runCount: pipeline.runCount,
    lastRunId: pipeline.lastRunId,
    lastRunStatus: pipeline.lastRunStatus,
    lastRunTime: pipeline.lastRunTime,
    actions: pipeline.actions ?? {},
    links: pipeline.links ?? {},
    genericObject: pipeline.genericObject
  };
}

function summarizeProject(project: RancherResource): Record<string, unknown> {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    state: project.state,
    uuid: project.uuid
  };
}

function summarizePipelineCandidate(
  config: RancherConfig,
  projectId: string,
  projectName: string | undefined,
  genericObject: RancherGenericObject
): Record<string, unknown> {
  let embedded: RancherResource | undefined;
  try {
    embedded = parsePipelineFromGenericObject(genericObject);
  } catch {
    embedded = undefined;
  }

  const pipelineId = genericObject.key ?? String(embedded?.id ?? "");
  return {
    projectId,
    projectName,
    genericObjectId: genericObject.id,
    pipelineId,
    genericObjectName: genericObject.name,
    pipelineName: embedded?.name,
    state: genericObject.state,
    isActivate: embedded?.isActivate,
    runCount: embedded?.runCount,
    lastRunStatus: embedded?.lastRunStatus,
    lastRunTime: embedded?.lastRunTime,
    repository: firstStageStepField(embedded, "repository"),
    branch: firstStageStepField(embedded, "branch"),
    targetImage: firstStageStepField(embedded, "targetImage"),
    uiUrl: pipelineId
      ? `${config.baseUrl.replace(/\/+$/, "")}/r/projects/${encodeURIComponent(projectId)}/pipeline-ui/#/env/${encodeURIComponent(projectId)}/pipelines/pipelines/${encodeURIComponent(pipelineId)}?mode=review`
      : undefined
  };
}

function summarizeServiceCandidate(
  config: RancherConfig,
  projectId: string,
  projectName: string | undefined,
  service: RancherService
): Record<string, unknown> {
  const stackId = typeof service.stackId === "string" ? service.stackId : undefined;
  const serviceId = String(service.id ?? "");
  return {
    projectId,
    projectName,
    stackId,
    serviceId,
    name: service.name,
    state: service.state,
    healthState: service.healthState,
    scale: service.scale,
    imageUuid: service.launchConfig?.imageUuid,
    transitioning: service.transitioning,
    serviceUrl:
      stackId && serviceId
        ? `${config.baseUrl.replace(/\/+$/, "")}/env/${encodeURIComponent(projectId)}/apps/stacks/${encodeURIComponent(stackId)}/services/${encodeURIComponent(serviceId)}/containers`
        : undefined
  };
}

function firstStageStepField(pipeline: RancherResource | undefined, field: string): unknown {
  const stages = pipeline?.stages;
  if (!Array.isArray(stages)) {
    return undefined;
  }

  for (const stage of stages) {
    if (!stage || typeof stage !== "object" || !("steps" in stage) || !Array.isArray(stage.steps)) {
      continue;
    }
    for (const step of stage.steps) {
      if (step && typeof step === "object" && field in step) {
        return (step as Record<string, unknown>)[field];
      }
    }
  }

  return undefined;
}

async function listProjectIds(client: RancherClient): Promise<string[]> {
  const projects = await listProjects(client);
  return projects.map((project) => String(project.id)).filter(Boolean);
}

async function listProjects(client: RancherClient): Promise<RancherResource[]> {
  return getPaginatedData<RancherResource>(client, "/v2-beta/projects?limit=100");
}

async function getProjectNameMap(client: RancherClient): Promise<Record<string, string>> {
  const projects = await listProjects(client);
  return Object.fromEntries(
    projects
      .filter((project) => project.id && typeof project.name === "string")
      .map((project) => [String(project.id), project.name as string])
  );
}

async function listPipelineGenericObjects(client: RancherClient, projectId: string): Promise<RancherGenericObject[]> {
  return getPaginatedData<RancherGenericObject>(
    client,
    `/v2-beta/projects/${encodeURIComponent(projectId)}/genericobjects?kind=pipeline&limit=100`
  );
}

async function listServices(client: RancherClient, projectId: string): Promise<RancherService[]> {
  return getPaginatedData<RancherService>(client, `/v2-beta/projects/${encodeURIComponent(projectId)}/services?limit=100`);
}

async function getPaginatedData<T>(client: RancherClient, initialUrl: string, maxPages = 25): Promise<T[]> {
  const data: T[] = [];
  let nextUrl: string | undefined = initialUrl;

  for (let page = 0; nextUrl && page < maxPages; page += 1) {
    const currentUrl = nextUrl;
    const response: { data?: T[]; pagination?: { next?: string } } = await client.get(currentUrl);
    data.push(...(response.data ?? []));
    nextUrl = response.pagination?.next;
  }

  return data;
}

function getPipelineActivitiesUrl(pipeline: RancherResource, source: string): string {
  const links = pipeline.links;
  if (links && typeof links === "object" && "activities" in links && typeof links.activities === "string") {
    return links.activities;
  }

  return `${source.replace(/\/+$/, "")}/activities`;
}

function summarizePipelineActivity(activity: RancherResource): Record<string, unknown> {
  return {
    id: activity.id,
    status: activity.status,
    triggerType: activity.triggerType,
    runSequence: activity.runSequence,
    commitInfo: activity.commitInfo,
    startTs: activity.start_ts,
    stopTs: activity.stop_ts,
    durationMs:
      typeof activity.start_ts === "number" && typeof activity.stop_ts === "number"
        ? activity.stop_ts - activity.start_ts
        : undefined,
    pipelineName:
      typeof activity.envVars === "object" && activity.envVars !== null && "CICD_PIPELINE_NAME" in activity.envVars
        ? (activity.envVars as Record<string, unknown>).CICD_PIPELINE_NAME
        : undefined,
    gitBranch:
      typeof activity.envVars === "object" && activity.envVars !== null && "CICD_GIT_BRANCH" in activity.envVars
        ? (activity.envVars as Record<string, unknown>).CICD_GIT_BRANCH
        : undefined,
    stages: Array.isArray(activity.activity_stages)
      ? activity.activity_stages.map((stage) => summarizePipelineStage(stage))
      : [],
    actions: activity.actions ?? {}
  };
}

function summarizePipelineStage(stage: unknown): Record<string, unknown> {
  if (!stage || typeof stage !== "object") {
    return {};
  }

  const record = stage as Record<string, unknown>;
  return {
    name: record.name,
    status: record.status,
    durationMs: record.duration,
    startTs: record.start_ts,
    steps: Array.isArray(record.activity_steps)
      ? record.activity_steps.map((step) => {
          if (!step || typeof step !== "object") {
            return {};
          }
          const stepRecord = step as Record<string, unknown>;
          return {
            status: stepRecord.status,
            durationMs: stepRecord.duration,
            startTs: stepRecord.start_ts
          };
        })
      : []
  };
}

async function getPipelineResource(
  client: RancherClient,
  projectId: string,
  pipelineId: string
): Promise<{ pipeline: RancherResource; source: string }> {
  const directPath = pipelinePath(projectId, pipelineId);
  try {
    return {
      pipeline: await client.get<RancherResource>(directPath),
      source: directPath
    };
  } catch {
    const collection = await client.get<{ data?: RancherGenericObject[] }>(pipelineGenericObjectPath(projectId, pipelineId));
    const genericObject = collection.data?.[0];
    if (!genericObject) {
      throw new Error(`Pipeline ${pipelineId} was not found in project ${projectId}`);
    }

    const embeddedPipeline = parsePipelineFromGenericObject(genericObject);
    const links = embeddedPipeline.links;
    const selfUrl =
      links && typeof links === "object" && "self" in links && typeof links.self === "string" ? links.self : undefined;

    const pipelineServerUrl = selfUrl ?? pipelineServerPath(projectId, pipelineId);
    return {
      pipeline: await client.get<RancherResource>(pipelineServerUrl),
      source: pipelineServerUrl
    };
  }
}

async function runServiceAction(
  client: RancherClient,
  config: RancherConfig,
  input: { target?: string; serviceId?: string; serviceUrl?: string; projectId?: string; confirm?: string },
  actionName: string
) {
  const resolved = resolveServiceRef(input, config.defaultProjectId, config.targets);
  assertWriteAllowed(config, {
    targetName: input.target,
    target: input.target ? config.targets[input.target] : undefined,
    projectId: resolved.projectId,
    resourceId: resolved.serviceId,
    resourceType: "service",
    operation: actionName,
    confirm: input.confirm
  });
  const path = servicePath(resolved.projectId, resolved.serviceId);
  const service = await client.get<RancherService>(path);
  const result = await client.post(actionUrl(service, actionName, path), {});
  return jsonResult(`Service ${resolved.serviceId} action ${actionName} requested.`, {
    serviceId: resolved.serviceId,
    projectId: resolved.projectId,
    actionName,
    result
  });
}

function jsonResult(message: string, data: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: message
      },
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2)
      }
    ],
    structuredContent: data
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
