import { describe, expect, it } from "vitest";
import {
  actionUrl,
  buildUpgradePayload,
  normalizeImageUuid,
  parseServiceUiUrl,
  resolveServiceRef,
  servicePath
} from "../src/service.js";

describe("service helpers", () => {
  it("normalizes Docker image UUIDs", () => {
    expect(normalizeImageUuid("nginx:1.25")).toBe("docker:nginx:1.25");
    expect(normalizeImageUuid("docker:nginx:1.25")).toBe("docker:nginx:1.25");
  });

  it("builds an upgrade payload from the current launchConfig", () => {
    const payload = buildUpgradePayload(
      {
        launchConfig: {
          imageUuid: "docker:old/image:1",
          ports: ["80:80/tcp"],
          environment: { A: "B" }
        },
        secondaryLaunchConfigs: [{ name: "sidecar", imageUuid: "docker:sidecar:1" }]
      },
      {
        image: "new/image:2",
        batchSize: 2,
        intervalMillis: 3000,
        startFirst: true
      }
    );

    expect(payload).toEqual({
      inServiceStrategy: {
        batchSize: 2,
        intervalMillis: 3000,
        launchConfig: {
          imageUuid: "docker:new/image:2",
          ports: ["80:80/tcp"],
          environment: { A: "B" }
        },
        secondaryLaunchConfigs: [{ name: "sidecar", imageUuid: "docker:sidecar:1" }],
        startFirst: true
      }
    });
  });

  it("uses default upgrade strategy values", () => {
    expect(
      buildUpgradePayload(
        {
          launchConfig: {
            imageUuid: "docker:old/image:1"
          }
        },
        {}
      )
    ).toEqual({
      inServiceStrategy: {
        batchSize: 1,
        intervalMillis: 2000,
        launchConfig: {
          imageUuid: "docker:old/image:1"
        },
        secondaryLaunchConfigs: [],
        startFirst: false
      }
    });
  });

  it("passes rawStrategy through directly", () => {
    const rawStrategy = { inServiceStrategy: { batchSize: 10 } };
    expect(buildUpgradePayload({ launchConfig: { imageUuid: "docker:a" } }, { rawStrategy })).toBe(rawStrategy);
  });

  it("prefers discoverable action URLs and falls back to action query URLs", () => {
    const path = servicePath("1a35", "1s1");
    expect(actionUrl({ actions: { upgrade: "http://rancher/action/upgrade" } }, "upgrade", path)).toBe(
      "http://rancher/action/upgrade"
    );
    expect(actionUrl({}, "upgrade", path)).toBe("/v2-beta/projects/1a35/services/1s1?action=upgrade");
  });

  it("parses Rancher 1.6 service UI URLs", () => {
    expect(
      parseServiceUiUrl("http://192.168.0.241:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers")
    ).toEqual({
      projectId: "1a536",
      serviceId: "1s2268"
    });
  });

  it("resolves service refs from explicit IDs, UI URLs, and defaults", () => {
    expect(resolveServiceRef({ serviceId: "1s1", projectId: "1a1" }, "1a35")).toEqual({
      projectId: "1a1",
      serviceId: "1s1"
    });
    expect(
      resolveServiceRef(
        { serviceUrl: "http://192.168.0.241:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers" },
        "1a35"
      )
    ).toEqual({
      projectId: "1a536",
      serviceId: "1s2268"
    });
    expect(resolveServiceRef({ serviceId: "1s1" }, "1a35")).toEqual({
      projectId: "1a35",
      serviceId: "1s1"
    });
    expect(() => resolveServiceRef({ serviceId: "1s1" }, undefined)).toThrow("projectId is required");
  });

  it("resolves service refs from configured target aliases", () => {
    const targets = {
      "test-erp": {
        projectId: "1a536",
        stackId: "1st178",
        serviceId: "1s2268",
        description: "Test ERP"
      },
      "url-target": {
        serviceUrl: "http://192.168.0.241:9999/env/1a536/apps/stacks/1st178/services/1s2268/containers"
      }
    };

    expect(resolveServiceRef({ target: "test-erp" }, "1a35", targets)).toEqual({
      projectId: "1a536",
      serviceId: "1s2268"
    });
    expect(resolveServiceRef({ target: "url-target" }, "1a35", targets)).toEqual({
      projectId: "1a536",
      serviceId: "1s2268"
    });
    expect(resolveServiceRef({ target: "test-erp", serviceId: "1s9999" }, "1a35", targets)).toEqual({
      projectId: "1a536",
      serviceId: "1s9999"
    });
  });
});
