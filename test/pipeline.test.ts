import { describe, expect, it } from "vitest";
import {
  buildPipelineImageUpdate,
  choosePipelineAction,
  parsePipelineFromGenericObject,
  parsePipelineUiUrl,
  pipelineGenericObjectPath,
  pipelineServerPath,
  replaceImageTag,
  resolvePipelineRef
} from "../src/pipeline.js";

describe("pipeline helpers", () => {
  it("parses Rancher pipeline UI URLs", () => {
    const parsed = parsePipelineUiUrl(
      "http://192.168.0.241:9999/r/projects/1a35/pipeline-ui/#/env/1a35/pipelines/pipelines/e1d42fea-9dc6-4856-9fb6-a5585eda1af1?mode=review"
    );

    expect(parsed).toEqual({
      projectId: "1a35",
      pipelineId: "e1d42fea-9dc6-4856-9fb6-a5585eda1af1"
    });
  });

  it("chooses requested pipeline actions", () => {
    expect(
      choosePipelineAction(
        {
          actions: {
            run: "http://rancher/run",
            rerun: "http://rancher/rerun"
          }
        },
        "rerun"
      )
    ).toEqual({
      actionName: "rerun",
      actionUrl: "http://rancher/rerun",
      availableActions: {
        run: "http://rancher/run",
        rerun: "http://rancher/rerun"
      }
    });
  });

  it("auto-selects pipeline actions in priority order", () => {
    expect(
      choosePipelineAction({
        actions: {
          build: "http://rancher/build",
          start: "http://rancher/start",
          run: "http://rancher/run"
        }
      })
    ).toMatchObject({
      actionName: "run",
      actionUrl: "http://rancher/run"
    });
  });

  it("returns available actions when no executable action is found", () => {
    expect(
      choosePipelineAction({
        actions: {
          inspect: "http://rancher/inspect"
        }
      })
    ).toEqual({
      actionName: undefined,
      actionUrl: undefined,
      availableActions: {
        inspect: "http://rancher/inspect"
      }
    });
  });

  it("resolves pipeline refs from configured target aliases", () => {
    const targets = {
      "test-erp": {
        projectId: "1a536",
        pipelineId: "pipe-1"
      },
      "url-target": {
        pipelineUrl:
          "http://192.168.0.241:9999/r/projects/1a536/pipeline-ui/#/env/1a536/pipelines/pipelines/e1d42fea-9dc6-4856-9fb6-a5585eda1af1?mode=review"
      }
    };

    expect(resolvePipelineRef({ target: "test-erp" }, "1a35", targets)).toEqual({
      projectId: "1a536",
      pipelineId: "pipe-1"
    });
    expect(resolvePipelineRef({ target: "url-target" }, "1a35", targets)).toEqual({
      projectId: "1a536",
      pipelineId: "e1d42fea-9dc6-4856-9fb6-a5585eda1af1"
    });
    expect(() => resolvePipelineRef({ pipelineId: "pipe-1" }, undefined)).toThrow("projectId is required");
  });

  it("builds Rancher genericObject pipeline lookup paths", () => {
    expect(pipelineGenericObjectPath("1a35", "e1d42fea-9dc6-4856-9fb6-a5585eda1af1")).toBe(
      "/v2-beta/projects/1a35/genericobjects?kind=pipeline&key=e1d42fea-9dc6-4856-9fb6-a5585eda1af1"
    );
    expect(pipelineServerPath("1a35", "e1d42fea-9dc6-4856-9fb6-a5585eda1af1")).toBe(
      "/r/projects/1a35/pipeline-server:60080/v1/pipelines/e1d42fea-9dc6-4856-9fb6-a5585eda1af1"
    );
  });

  it("parses pipeline resources embedded in genericObjects", () => {
    const pipeline = parsePipelineFromGenericObject({
      id: "1go60970",
      key: "e1d42fea-9dc6-4856-9fb6-a5585eda1af1",
      name: "erp-pc-front-dev",
      state: "active",
      resourceData: {
        data: JSON.stringify({
          id: "e1d42fea-9dc6-4856-9fb6-a5585eda1af1",
          type: "pipeline",
          links: {
            self: "http://rancher/r/projects/1a35/pipeline-server:60080/v1/pipelines/e1d42fea"
          },
          actions: {
            run: "http://rancher/r/projects/1a35/pipeline-server:60080/v1/pipelines/e1d42fea?action=run"
          },
          name: "erp-front-develop"
        })
      }
    });

    expect(pipeline).toMatchObject({
      id: "e1d42fea-9dc6-4856-9fb6-a5585eda1af1",
      name: "erp-front-develop",
      actions: {
        run: "http://rancher/r/projects/1a35/pipeline-server:60080/v1/pipelines/e1d42fea?action=run"
      },
      genericObject: {
        id: "1go60970",
        key: "e1d42fea-9dc6-4856-9fb6-a5585eda1af1",
        name: "erp-pc-front-dev",
        state: "active"
      }
    });
  });

  it("replaces image tags while preserving registry ports", () => {
    expect(replaceImageTag("192.168.0.242:5000/platform/service-admin-front:1.0.24_vite", "1.0.25_vite")).toBe(
      "192.168.0.242:5000/platform/service-admin-front:1.0.25_vite"
    );
    expect(replaceImageTag("registry.example.com/app/service", "v2")).toBe("registry.example.com/app/service:v2");
  });

  it("builds pipeline image update payloads", () => {
    const update = buildPipelineImageUpdate(
      {
        id: "pipe-1",
        actions: {
          update: "http://rancher/update"
        },
        links: {
          self: "http://rancher/pipeline"
        },
        runCount: 10,
        lastRunStatus: "Success",
        stages: [
          {
            name: "Source Code",
            steps: [{ type: "scm", repository: "http://git/repo.git" }]
          },
          {
            name: "Build",
            steps: [
              {
                type: "build",
                targetImage: "192.168.0.242:5000/platform/service-admin-front:1.0.24_vite"
              }
            ]
          }
        ]
      },
      {
        tag: "1.0.25_vite",
        matchImage: "platform/service-admin-front"
      }
    );

    expect(update.changes).toEqual([
      {
        stageIndex: 1,
        stepIndex: 0,
        stageName: "Build",
        oldTargetImage: "192.168.0.242:5000/platform/service-admin-front:1.0.24_vite",
        newTargetImage: "192.168.0.242:5000/platform/service-admin-front:1.0.25_vite"
      }
    ]);
    expect(update.pipeline).toMatchObject({
      id: "pipe-1",
      stages: [
        {
          name: "Source Code"
        },
        {
          name: "Build",
          steps: [
            {
              targetImage: "192.168.0.242:5000/platform/service-admin-front:1.0.25_vite"
            }
          ]
        }
      ]
    });
    expect(update.pipeline.actions).toBeUndefined();
    expect(update.pipeline.links).toBeUndefined();
    expect(update.pipeline.runCount).toBeUndefined();
  });
});
