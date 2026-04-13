export interface ArrClientOptions {
  authStyle?: "header" | "query";
  maxRetries?: number;
  retryDelayMs?: number;
  timeout?: number;
}

export class ArrClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = "ArrClientError";
  }
}

export class ArrClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly authStyle: "header" | "query";
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly timeout: number;

  constructor(baseUrl: string, apiKey: string, options: ArrClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.authStyle = options.authStyle ?? "header";
    this.maxRetries = options.maxRetries ?? 0;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.timeout = options.timeout ?? 30_000;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, params);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, undefined, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, undefined, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, string>,
    body?: unknown
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    if (this.authStyle === "query") {
      url.searchParams.set("apikey", this.apiKey);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.authStyle === "header") {
      headers["X-Api-Key"] = this.apiKey;
    }

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, this.retryDelayMs));
      }

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new ArrClientError(
            `${method} ${path}: ${response.status} ${response.statusText}`,
            response.status,
            text
          );
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          return (await response.json()) as T;
        }

        // Some endpoints return empty 200
        return undefined as T;
      } catch (error) {
        lastError = error as Error;

        // Only retry on connection errors, not HTTP errors
        if (error instanceof ArrClientError) throw error;
        if (attempt === this.maxRetries) break;
      }
    }

    throw lastError ?? new Error("Request failed");
  }
}
