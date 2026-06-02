import type { RancherConfig, RancherTargetConfig } from "./config.js";

export type WriteGuardInput = {
  targetName?: string;
  target?: RancherTargetConfig;
  projectId: string;
  resourceId: string;
  resourceType: "service" | "pipeline";
  operation: string;
  confirm?: string;
};

export function assertWriteAllowed(config: RancherConfig, input: WriteGuardInput): void {
  const protectedByTarget = input.target?.protected === true || input.target?.environment === "prod";
  const protectedByProject = config.protectedProjectIds.includes(input.projectId);

  if (!protectedByTarget && !protectedByProject) {
    return;
  }

  const expectedConfirm = buildConfirmToken(input.targetName ?? input.projectId, input.resourceId);

  if (!config.allowProdWrites) {
    throw new Error(
      `Protected ${input.resourceType} write blocked for ${input.operation}. Set RANCHER_ALLOW_PROD_WRITES=true and pass confirm="${expectedConfirm}" to proceed.`
    );
  }

  if (input.confirm !== expectedConfirm) {
    throw new Error(
      `Protected ${input.resourceType} write requires confirm="${expectedConfirm}".`
    );
  }
}

export function buildConfirmToken(targetOrProject: string, resourceId: string): string {
  return `PROD ${targetOrProject} ${resourceId}`;
}
