import { describe, expect, it } from "vitest";
import type { RancherConfig } from "../src/config.js";
import { assertWriteAllowed, buildConfirmToken } from "../src/safety.js";

const baseConfig: RancherConfig = {
  baseUrl: "http://rancher.example:9999",
  accessKey: "access",
  secretKey: "secret",
  defaultProjectId: "1a35",
  timeoutMs: 30000,
  targets: {},
  allowProdWrites: false,
  protectedProjectIds: []
};

describe("write safety", () => {
  it("builds production confirmation tokens", () => {
    expect(buildConfirmToken("prod-erp", "1s777")).toBe("PROD prod-erp 1s777");
  });

  it("allows non-protected writes", () => {
    expect(() =>
      assertWriteAllowed(baseConfig, {
        projectId: "1a536",
        resourceId: "1s2268",
        resourceType: "service",
        operation: "upgrade"
      })
    ).not.toThrow();
  });

  it("blocks protected target writes unless the global switch is enabled", () => {
    expect(() =>
      assertWriteAllowed(baseConfig, {
        targetName: "prod-erp",
        target: { environment: "prod", protected: true },
        projectId: "1a999",
        resourceId: "1s777",
        resourceType: "service",
        operation: "upgrade"
      })
    ).toThrow("RANCHER_ALLOW_PROD_WRITES=true");
  });

  it("requires an exact confirmation token for protected writes", () => {
    const config = { ...baseConfig, allowProdWrites: true };

    expect(() =>
      assertWriteAllowed(config, {
        targetName: "prod-erp",
        target: { protected: true },
        projectId: "1a999",
        resourceId: "1s777",
        resourceType: "service",
        operation: "upgrade",
        confirm: "wrong"
      })
    ).toThrow('confirm="PROD prod-erp 1s777"');

    expect(() =>
      assertWriteAllowed(config, {
        targetName: "prod-erp",
        target: { protected: true },
        projectId: "1a999",
        resourceId: "1s777",
        resourceType: "service",
        operation: "upgrade",
        confirm: "PROD prod-erp 1s777"
      })
    ).not.toThrow();
  });

  it("blocks writes for protected project IDs even without target aliases", () => {
    expect(() =>
      assertWriteAllowed(
        { ...baseConfig, protectedProjectIds: ["1a999"] },
        {
          projectId: "1a999",
          resourceId: "1s777",
          resourceType: "service",
          operation: "upgrade"
        }
      )
    ).toThrow('confirm="PROD 1a999 1s777"');
  });
});
