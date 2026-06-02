import type { RancherTargetConfig } from "./config.js";
import type { RancherResource } from "./rancherClient.js";

const AUTO_PIPELINE_ACTIONS = ["run", "execute", "start", "trigger", "build"] as const;

export type PipelineRef = {
  projectId?: string;
  pipelineId?: string;
};

export type PipelineResolveInput = PipelineRef & {
  target?: string;
  uiUrl?: string;
};

export type RancherGenericObject = RancherResource & {
  key?: string;
  kind?: string;
  name?: string;
  resourceData?: {
    data?: string;
  };
};

export type PipelineImageUpdateOptions = {
  image?: string;
  tag?: string;
  matchImage?: string;
};

export type PipelineImageUpdateChange = {
  stageIndex: number;
  stepIndex: number;
  stageName?: string;
  oldTargetImage: string;
  newTargetImage: string;
};

export function pipelinePath(projectId: string, pipelineId: string): string {
  return `/v2-beta/projects/${encodeURIComponent(projectId)}/pipelines/${encodeURIComponent(pipelineId)}`;
}

export function pipelineGenericObjectPath(projectId: string, pipelineId: string): string {
  return `/v2-beta/projects/${encodeURIComponent(projectId)}/genericobjects?kind=pipeline&key=${encodeURIComponent(pipelineId)}`;
}

export function parsePipelineUiUrl(uiUrl: string): PipelineRef {
  const url = new URL(uiUrl);
  const projectMatch = url.pathname.match(/\/r\/projects\/([^/]+)\/pipeline-ui\/?$/);
  const hashMatch = url.hash.match(/\/env\/([^/]+)\/pipelines\/pipelines\/([^/?#]+)/);

  return {
    projectId: hashMatch?.[1] ?? projectMatch?.[1],
    pipelineId: hashMatch?.[2]
  };
}

export function resolvePipelineRef(
  input: PipelineResolveInput,
  defaultProjectId: string | undefined,
  targets: Record<string, RancherTargetConfig> = {}
): Required<PipelineRef> {
  const target = input.target ? targets[input.target] : undefined;
  if (input.target && !target) {
    throw new Error(`Unknown Rancher target: ${input.target}`);
  }

  const uiUrl = input.uiUrl ?? target?.pipelineUrl;
  const parsed = uiUrl ? parsePipelineUiUrl(uiUrl) : {};
  const pipelineId = input.pipelineId ?? parsed.pipelineId ?? target?.pipelineId;

  if (!pipelineId) {
    throw new Error("pipelineId is required when it cannot be parsed from uiUrl or target");
  }

  const projectId = input.projectId ?? parsed.projectId ?? target?.projectId ?? defaultProjectId;

  if (!projectId) {
    throw new Error("projectId is required when it cannot be parsed from uiUrl, target, or RANCHER_PROJECT_ID");
  }

  return {
    projectId,
    pipelineId
  };
}

export function choosePipelineAction(
  pipeline: RancherResource,
  requestedAction?: string
): { actionName?: string; actionUrl?: string; availableActions: Record<string, string> } {
  const availableActions = pipeline.actions ?? {};

  if (requestedAction) {
    return {
      actionName: requestedAction,
      actionUrl: availableActions[requestedAction],
      availableActions
    };
  }

  const actionName = AUTO_PIPELINE_ACTIONS.find((candidate) => availableActions[candidate]);
  return {
    actionName,
    actionUrl: actionName ? availableActions[actionName] : undefined,
    availableActions
  };
}

export function parsePipelineFromGenericObject(genericObject: RancherGenericObject): RancherResource {
  const data = genericObject.resourceData?.data;
  if (!data) {
    throw new Error(`Pipeline genericObject ${genericObject.id ?? genericObject.key ?? ""} is missing resourceData.data`);
  }

  const parsed = JSON.parse(data) as RancherResource;
  return {
    ...parsed,
    actions: parsed.actions ?? {},
    genericObject: {
      id: genericObject.id,
      key: genericObject.key,
      name: genericObject.name,
      state: genericObject.state
    }
  };
}

export function replaceImageTag(image: string, tag: string): string {
  const slashIndex = image.lastIndexOf("/");
  const colonIndex = image.lastIndexOf(":");

  if (colonIndex > slashIndex) {
    return `${image.slice(0, colonIndex + 1)}${tag}`;
  }

  return `${image}:${tag}`;
}

export function buildPipelineImageUpdate(
  pipeline: RancherResource,
  options: PipelineImageUpdateOptions
): { pipeline: RancherResource; changes: PipelineImageUpdateChange[] } {
  if (!options.image && !options.tag) {
    throw new Error("Either image or tag is required");
  }

  const updated = structuredClone(pipeline) as RancherResource;
  const stages = updated.stages;
  const changes: PipelineImageUpdateChange[] = [];
  const matchImage = options.matchImage?.replace(/^docker:/, "");

  if (!Array.isArray(stages)) {
    throw new Error("Pipeline stages are missing or invalid");
  }

  stages.forEach((stage, stageIndex) => {
    if (!stage || typeof stage !== "object" || !("steps" in stage) || !Array.isArray(stage.steps)) {
      return;
    }

    const steps = (stage as { steps: unknown[] }).steps;
    steps.forEach((step: unknown, stepIndex: number) => {
      if (!step || typeof step !== "object") {
        return;
      }

      const stepRecord = step as Record<string, unknown>;
      const oldTargetImage = stepRecord.targetImage;
      if (typeof oldTargetImage !== "string") {
        return;
      }

      if (matchImage && !oldTargetImage.replace(/^docker:/, "").includes(matchImage)) {
        return;
      }

      const newTargetImage = options.image ?? replaceImageTag(oldTargetImage, options.tag as string);
      if (newTargetImage === oldTargetImage) {
        return;
      }

      stepRecord.targetImage = newTargetImage;
      changes.push({
        stageIndex,
        stepIndex,
        stageName: typeof (stage as Record<string, unknown>).name === "string" ? ((stage as Record<string, unknown>).name as string) : undefined,
        oldTargetImage,
        newTargetImage
      });
    });
  });

  if (changes.length === 0) {
    throw new Error("No pipeline build steps matched the requested image update");
  }

  return {
    pipeline: sanitizePipelineUpdatePayload(updated),
    changes
  };
}

function sanitizePipelineUpdatePayload(pipeline: RancherResource): RancherResource {
  const payload = structuredClone(pipeline) as RancherResource;
  delete payload.actions;
  delete payload.links;
  delete payload.genericObject;
  delete payload.lastRunId;
  delete payload.lastRunStatus;
  delete payload.lastRunTime;
  delete payload.runCount;
  return payload;
}
