import type { RancherConfig } from "./config.js";

export type RancherResource = Record<string, unknown> & {
  id?: string;
  actions?: Record<string, string>;
};

export class RancherApiError extends Error {
  readonly status?: number;
  readonly statusText?: string;
  readonly body?: unknown;

  constructor(message: string, options: { status?: number; statusText?: string; body?: unknown } = {}) {
    super(message);
    this.name = "RancherApiError";
    this.status = options.status;
    this.statusText = options.statusText;
    this.body = options.body;
  }
}

export class RancherClient {
  private readonly baseUrl: URL;

  constructor(private readonly config: RancherConfig) {
    this.baseUrl = new URL(config.baseUrl);
  }

  buildUrl(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }

    const basePath = this.baseUrl.pathname.replace(/\/+$/, "");
    const relative = new URL(pathOrUrl, "http://rancher.local");
    const joinedPath = `${basePath}${relative.pathname}`.replace(/\/{2,}/g, "/");
    const url = new URL(this.baseUrl.toString());
    url.pathname = joinedPath;
    url.search = relative.search;
    url.hash = relative.hash;
    return url.toString();
  }

  authHeader(): string {
    const token = Buffer.from(`${this.config.accessKey}:${this.config.secretKey}`, "utf8").toString("base64");
    return `Basic ${token}`;
  }

  async get<T = unknown>(pathOrUrl: string): Promise<T> {
    return this.request<T>("GET", pathOrUrl);
  }

  async post<T = unknown>(pathOrUrl: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", pathOrUrl, body);
  }

  async request<T = unknown>(method: "GET" | "POST", pathOrUrl: string, body?: unknown): Promise<T> {
    const response = await fetch(this.buildUrl(pathOrUrl), {
      method,
      headers: {
        Authorization: this.authHeader(),
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs)
    }).catch((error: unknown) => {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new RancherApiError(`Rancher API request timed out after ${this.config.timeoutMs}ms`);
      }
      throw error;
    });

    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      throw new RancherApiError(formatHttpError(response.status, response.statusText, responseBody), {
        status: response.status,
        statusText: response.statusText,
        body: responseBody
      });
    }

    return responseBody as T;
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function formatHttpError(status: number, statusText: string, body: unknown): string {
  const detail =
    typeof body === "object" && body !== null && "message" in body
      ? String((body as { message?: unknown }).message)
      : typeof body === "string"
        ? body
        : JSON.stringify(body);

  return `Rancher API error ${status} ${statusText}${detail ? `: ${detail}` : ""}`;
}
