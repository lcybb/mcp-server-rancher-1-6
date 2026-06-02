import { afterEach, describe, expect, it, vi } from "vitest";
import { RancherApiError, RancherClient } from "../src/rancherClient.js";
import type { RancherConfig } from "../src/config.js";

const config: RancherConfig = {
  baseUrl: "http://rancher.example:9999/root/",
  accessKey: "access",
  secretKey: "secret",
  defaultProjectId: "1a35",
  timeoutMs: 50
};

describe("RancherClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("joins relative API paths with the configured Rancher URL", () => {
    const client = new RancherClient(config);

    expect(client.buildUrl("/v2-beta/projects/1a35/services/1s1")).toBe(
      "http://rancher.example:9999/root/v2-beta/projects/1a35/services/1s1"
    );
    expect(client.buildUrl("v2-beta/projects/1a35")).toBe("http://rancher.example:9999/root/v2-beta/projects/1a35");
    expect(client.buildUrl("/v2-beta/projects/1a35/services/1s1?action=upgrade")).toBe(
      "http://rancher.example:9999/root/v2-beta/projects/1a35/services/1s1?action=upgrade"
    );
    expect(client.buildUrl("http://other/actions?action=upgrade")).toBe("http://other/actions?action=upgrade");
  });

  it("builds a Basic Auth header without logging credentials", () => {
    const client = new RancherClient(config);

    expect(client.authHeader()).toBe("Basic YWNjZXNzOnNlY3JldA==");
  });

  it("sends GET and parses JSON responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "1s1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new RancherClient(config);
    await expect(client.get("/v2-beta/projects/1a35/services/1s1")).resolves.toEqual({ id: "1s1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://rancher.example:9999/root/v2-beta/projects/1a35/services/1s1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Basic YWNjZXNzOnNlY3JldA=="
        })
      })
    );
  });

  it("formats Rancher HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "service not found" }), {
          status: 404,
          statusText: "Not Found"
        })
      )
    );

    const client = new RancherClient(config);
    await expect(client.get("/missing")).rejects.toMatchObject<RancherApiError>({
      name: "RancherApiError",
      status: 404,
      message: "Rancher API error 404 Not Found: service not found"
    });
  });

  it("wraps request timeout errors", async () => {
    const timeout = new DOMException("The operation was aborted due to timeout", "TimeoutError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));

    const client = new RancherClient(config);
    await expect(client.get("/slow")).rejects.toMatchObject({
      name: "RancherApiError",
      message: "Rancher API request timed out after 50ms"
    });
  });
});
