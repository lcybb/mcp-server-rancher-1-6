import type { RancherTargetConfig } from "./config.js";
import type { RancherClient, RancherResource } from "./rancherClient.js";

export type RancherService = RancherResource & {
  state?: string;
  healthState?: string;
  scale?: number;
  launchConfig?: Record<string, unknown>;
  secondaryLaunchConfigs?: unknown[];
  transitioning?: string;
  transitioningMessage?: string;
};

export type UpgradeOptions = {
  image?: string;
  batchSize?: number;
  intervalMillis?: number;
  startFirst?: boolean;
  rawStrategy?: unknown;
};

export type ServiceRef = {
  projectId?: string;
  serviceId?: string;
};

export type ServiceResolveInput = ServiceRef & {
  serviceUrl?: string;
  target?: string;
};

export function normalizeImageUuid(image: string): string {
  return image.startsWith("docker:") ? image : `docker:${image}`;
}

export function servicePath(projectId: string, serviceId: string): string {
  return `/v2-beta/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(serviceId)}`;
}

export function parseServiceUiUrl(serviceUrl: string): ServiceRef {
  const url = new URL(serviceUrl);
  const match = url.pathname.match(/\/env\/([^/]+)\/apps\/stacks\/[^/]+\/services\/([^/]+)(?:\/|$)/);

  return {
    projectId: match?.[1],
    serviceId: match?.[2]
  };
}

export function resolveServiceRef(
  input: ServiceResolveInput,
  defaultProjectId: string | undefined,
  targets: Record<string, RancherTargetConfig> = {}
): Required<ServiceRef> {
  const target = input.target ? targets[input.target] : undefined;
  if (input.target && !target) {
    throw new Error(`Unknown Rancher target: ${input.target}`);
  }

  const serviceUrl = input.serviceUrl ?? target?.serviceUrl;
  const parsed = serviceUrl ? parseServiceUiUrl(serviceUrl) : {};
  const serviceId = input.serviceId ?? parsed.serviceId ?? target?.serviceId;

  if (!serviceId) {
    throw new Error("serviceId is required when it cannot be parsed from serviceUrl or target");
  }

  const projectId = input.projectId ?? parsed.projectId ?? target?.projectId ?? defaultProjectId;

  if (!projectId) {
    throw new Error("projectId is required when it cannot be parsed from serviceUrl, target, or RANCHER_PROJECT_ID");
  }

  return {
    serviceId,
    projectId
  };
}

export function summarizeService(service: RancherService): Record<string, unknown> {
  return {
    id: service.id,
    state: service.state,
    healthState: service.healthState,
    scale: service.scale,
    imageUuid: service.launchConfig?.imageUuid,
    transitioning: service.transitioning,
    transitioningMessage: service.transitioningMessage,
    actions: service.actions ?? {}
  };
}

export async function getService(client: RancherClient, projectId: string, serviceId: string): Promise<RancherService> {
  return client.get<RancherService>(servicePath(projectId, serviceId));
}

export function buildUpgradePayload(service: RancherService, options: UpgradeOptions): Record<string, unknown> {
  if (options.rawStrategy !== undefined) {
    return options.rawStrategy as Record<string, unknown>;
  }

  if (!service.launchConfig || typeof service.launchConfig !== "object") {
    throw new Error("Service launchConfig is missing; cannot build upgrade payload");
  }

  const launchConfig = {
    ...service.launchConfig,
    ...(options.image ? { imageUuid: normalizeImageUuid(options.image) } : {})
  };

  return {
    inServiceStrategy: {
      batchSize: options.batchSize ?? 1,
      intervalMillis: options.intervalMillis ?? 2000,
      launchConfig,
      secondaryLaunchConfigs: service.secondaryLaunchConfigs ?? [],
      startFirst: options.startFirst ?? false
    }
  };
}

export function actionUrl(resource: RancherResource, actionName: string, fallbackPath: string): string {
  return resource.actions?.[actionName] ?? `${fallbackPath}?action=${encodeURIComponent(actionName)}`;
}
