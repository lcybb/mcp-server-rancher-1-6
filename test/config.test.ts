import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("loads Rancher target aliases from RANCHER_TARGETS_JSON", () => {
    const config = loadConfig({
      RANCHER_ACCESS_KEY: "access",
      RANCHER_SECRET_KEY: "secret",
      RANCHER_TARGETS_JSON: JSON.stringify({
          "test-erp": {
            environment: "test",
            projectId: "1a536",
            stackId: "1st178",
            serviceId: "1s2268",
            pipelineId: "pipe-1",
            description: "Test ERP"
          },
          "test-wms": {
          projectId: "1a200",
          description: "Test WMS"
        }
      })
    });

    expect(config.targets).toEqual({
      "test-erp": {
        environment: "test",
        protected: undefined,
        projectId: "1a536",
        stackId: "1st178",
        serviceId: "1s2268",
        serviceUrl: undefined,
        pipelineId: "pipe-1",
        pipelineUrl: undefined,
        description: "Test ERP"
      },
      "test-wms": {
        environment: undefined,
        protected: undefined,
        projectId: "1a200",
        stackId: undefined,
        serviceId: undefined,
        serviceUrl: undefined,
        pipelineId: undefined,
        pipelineUrl: undefined,
        description: "Test WMS"
      }
    });
  });

  it("loads Rancher target aliases from RANCHER_TARGETS_FILE", () => {
    const dir = mkdtempSync(join(tmpdir(), "rancher-targets-"));
    const file = join(dir, "targets.json");
    try {
      writeFileSync(
        file,
        JSON.stringify({
          "test-erp": {
            projectId: "1a536",
            serviceId: "1s2268",
            description: "Test ERP"
          }
        })
      );

      const config = loadConfig({
        RANCHER_ACCESS_KEY: "access",
        RANCHER_SECRET_KEY: "secret",
        RANCHER_TARGETS_FILE: file
      });

      expect(config.targets["test-erp"]).toEqual({
        environment: undefined,
        protected: undefined,
        projectId: "1a536",
        stackId: undefined,
        serviceId: "1s2268",
        serviceUrl: undefined,
        pipelineId: undefined,
        pipelineUrl: undefined,
        description: "Test ERP"
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects invalid target config JSON", () => {
    expect(() =>
      loadConfig({
        RANCHER_ACCESS_KEY: "access",
        RANCHER_SECRET_KEY: "secret",
        RANCHER_TARGETS_JSON: "{"
      })
    ).toThrow("RANCHER_TARGETS_JSON must be valid JSON");
  });

  it("loads production write safety config", () => {
    const config = loadConfig({
      RANCHER_ACCESS_KEY: "access",
      RANCHER_SECRET_KEY: "secret",
      RANCHER_ALLOW_PROD_WRITES: "true",
      RANCHER_PROTECTED_PROJECT_IDS: "1a999, 1a998"
    });

    expect(config.allowProdWrites).toBe(true);
    expect(config.protectedProjectIds).toEqual(["1a999", "1a998"]);
  });
});
