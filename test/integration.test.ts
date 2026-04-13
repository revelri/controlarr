import { describe, it, expect, beforeAll } from "vitest";
import { spawn, type ChildProcess } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";

const ROOT = resolve(import.meta.dirname, "..");

interface JsonRpcResponse {
  jsonrpc: string;
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
}

function startServer(
  cmd: string,
  args: string[],
  env: Record<string, string>
): { proc: ChildProcess; send: (msg: object) => void; receive: () => Promise<JsonRpcResponse> } {
  const proc = spawn(cmd, args, {
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const buffer: string[] = [];
  let resolveNext: ((val: JsonRpcResponse) => void) | null = null;

  proc.stdout!.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as JsonRpcResponse;
        // Skip notifications (no id field)
        if (parsed.id === undefined) continue;
        if (resolveNext) {
          const r = resolveNext;
          resolveNext = null;
          r(parsed);
        } else {
          buffer.push(line);
        }
      } catch {
        // ignore non-JSON
      }
    }
  });

  return {
    proc,
    send(msg: object) {
      proc.stdin!.write(JSON.stringify(msg) + "\n");
    },
    receive(): Promise<JsonRpcResponse> {
      if (buffer.length > 0) {
        return Promise.resolve(JSON.parse(buffer.shift()!) as JsonRpcResponse);
      }
      return new Promise((resolve) => {
        resolveNext = resolve;
      });
    },
  };
}

async function initServer(
  cmd: string,
  args: string[],
  env: Record<string, string>
) {
  const server = startServer(cmd, args, env);

  server.send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "integration-test", version: "1.0" },
    },
  });

  const initResponse = await server.receive();
  expect(initResponse.result).toBeTruthy();

  server.send({ jsonrpc: "2.0", method: "notifications/initialized" });

  return server;
}

const ENV = {
  RADARR_URL: process.env.RADARR_URL!,
  RADARR_API_KEY: process.env.RADARR_API_KEY!,
  SONARR_URL: process.env.SONARR_URL!,
  SONARR_API_KEY: process.env.SONARR_API_KEY!,
  PROWLARR_URL: process.env.PROWLARR_URL!,
  PROWLARR_API_KEY: process.env.PROWLARR_API_KEY!,
  BAZARR_URL: process.env.BAZARR_URL!,
  BAZARR_API_KEY: process.env.BAZARR_API_KEY!,
  JELLYSEERR_URL: process.env.JELLYSEERR_URL!,
  JELLYSEERR_API_KEY: process.env.JELLYSEERR_API_KEY!,
};

describe("Unified server integration", { timeout: 30_000 }, () => {
  it("initializes with all 5 services and lists tools", async () => {
    const server = await initServer(
      "node",
      [resolve(ROOT, "packages/server/dist/cli.js")],
      ENV
    );

    server.send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const toolsResponse = await server.receive();

    const tools = (toolsResponse.result as { tools: { name: string }[] }).tools;
    expect(tools.length).toBeGreaterThanOrEqual(70);

    // Verify all services have tools
    const prefixes = new Set(tools.map((t) => t.name.split("_")[0]));
    expect(prefixes).toContain("radarr");
    expect(prefixes).toContain("sonarr");
    expect(prefixes).toContain("prowlarr");
    expect(prefixes).toContain("bazarr");
    expect(prefixes).toContain("jellyseerr");

    server.proc.kill();
  });

  it("calls radarr_system_status tool", async () => {
    const server = await initServer(
      "node",
      [resolve(ROOT, "packages/server/dist/cli.js")],
      ENV
    );

    server.send({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "radarr_system_status", arguments: {} },
    });
    const response = await server.receive();
    const result = response.result as { content: { type: string; text: string }[] };

    expect(result.content[0].type).toBe("text");
    const status = JSON.parse(result.content[0].text);
    expect(status.appName).toBe("Radarr");

    server.proc.kill();
  });

  it("calls sonarr_library with pagination", async () => {
    const server = await initServer(
      "node",
      [resolve(ROOT, "packages/server/dist/cli.js")],
      ENV
    );

    server.send({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "sonarr_library",
        arguments: { page: 1, pageSize: 3 },
      },
    });
    const response = await server.receive();
    const result = response.result as { content: { type: string; text: string }[] };
    const data = JSON.parse(result.content[0].text);

    expect(data.items.length).toBeLessThanOrEqual(3);
    expect(data.totalItems).toBeGreaterThan(0);
    expect(data.items[0]).toHaveProperty("title");

    server.proc.kill();
  });

  it("calls jellyseerr_search tool", async () => {
    const server = await initServer(
      "node",
      [resolve(ROOT, "packages/server/dist/cli.js")],
      ENV
    );

    server.send({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "jellyseerr_search",
        arguments: { query: "inception" },
      },
    });
    const response = await server.receive();
    const result = response.result as { content: { type: string; text: string }[] };

    expect(result.content[0].text.toLowerCase()).toContain("inception");

    server.proc.kill();
  });

  it("calls bazarr_system_status tool", async () => {
    const server = await initServer(
      "node",
      [resolve(ROOT, "packages/server/dist/cli.js")],
      ENV
    );

    server.send({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "bazarr_system_status", arguments: {} },
    });
    const response = await server.receive();
    const result = response.result as { content: { type: string; text: string }[] };
    const status = JSON.parse(result.content[0].text);

    expect(status).toHaveProperty("bazarr_version");

    server.proc.kill();
  });

  it("respects --services flag", async () => {
    const server = await initServer(
      "node",
      [resolve(ROOT, "packages/server/dist/cli.js"), "--services=radarr,sonarr"],
      ENV
    );

    server.send({ jsonrpc: "2.0", id: 7, method: "tools/list", params: {} });
    const toolsResponse = await server.receive();
    const tools = (toolsResponse.result as { tools: { name: string }[] }).tools;

    const prefixes = new Set(tools.map((t) => t.name.split("_")[0]));
    expect(prefixes).toContain("radarr");
    expect(prefixes).toContain("sonarr");
    expect(prefixes).not.toContain("prowlarr");
    expect(prefixes).not.toContain("bazarr");
    expect(prefixes).not.toContain("jellyseerr");

    server.proc.kill();
  });

  it("respects --read-only flag (no destructive tools)", async () => {
    const server = await initServer(
      "node",
      [resolve(ROOT, "packages/server/dist/cli.js"), "--read-only"],
      ENV
    );

    server.send({ jsonrpc: "2.0", id: 8, method: "tools/list", params: {} });
    const toolsResponse = await server.receive();
    const tools = (toolsResponse.result as { tools: { name: string }[] }).tools;

    const writeTools = tools.filter(
      (t) =>
        t.name.includes("add_") ||
        t.name.includes("delete_") ||
        t.name.includes("edit_") ||
        t.name.includes("request_") ||
        t.name.includes("approve_") ||
        t.name.includes("search_missing")
    );
    expect(writeTools).toHaveLength(0);

    server.proc.kill();
  });
});

describe("Standalone server integration", { timeout: 30_000 }, () => {
  it("radarr standalone server works", async () => {
    const server = await initServer(
      "node",
      [resolve(ROOT, "packages/radarr/dist/cli.js")],
      { RADARR_URL: ENV.RADARR_URL, RADARR_API_KEY: ENV.RADARR_API_KEY }
    );

    server.send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const response = await server.receive();
    const tools = (response.result as { tools: { name: string }[] }).tools;

    expect(tools.length).toBe(18);
    expect(tools.every((t) => t.name.startsWith("radarr_"))).toBe(true);

    server.proc.kill();
  });
});

describe("Jellyfin MCP integration", { timeout: 30_000 }, () => {
  const JELLYFIN_BIN = resolve(ROOT, "bin/jellyfin-mcp");
  const JELLYFIN_ENV = {
    JELLYFIN_URL: process.env.JELLYFIN_URL ?? "http://localhost:8096",
    JELLYFIN_API_KEY: process.env.JELLYFIN_API_KEY ?? "",
  };

  function hasBinary(): boolean {
    return existsSync(JELLYFIN_BIN) && JELLYFIN_ENV.JELLYFIN_API_KEY !== "";
  }

  it("initializes and lists tools", async () => {
    if (!hasBinary()) {
      console.warn("jellyfin-mcp binary not found or no API key, skipping");
      return;
    }

    const server = await initServer(JELLYFIN_BIN, [], JELLYFIN_ENV);

    server.send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const response = await server.receive();
    const tools = (response.result as { tools: { name: string }[] }).tools;

    expect(tools.length).toBeGreaterThan(20);
    expect(tools.some((t) => t.name.startsWith("jellyfin_"))).toBe(true);

    server.proc.kill();
  });

  it("lists tools with jellyfin_ prefix", async () => {
    if (!hasBinary()) {
      console.warn("jellyfin-mcp binary not found or no API key, skipping");
      return;
    }

    const server = await initServer(JELLYFIN_BIN, [], JELLYFIN_ENV);

    server.send({ jsonrpc: "2.0", id: 10, method: "tools/list", params: {} });
    const response = await server.receive();
    const tools = (response.result as { tools: { name: string }[] }).tools;

    // Verify substantial tool count (jellyfin-mcp has 27+ tools)
    expect(tools.length).toBeGreaterThan(20);

    // Verify key toolsets are present
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("jellyfin_search");
    expect(toolNames).toContain("jellyfin_browse");
    expect(toolNames).toContain("jellyfin_libraries");
    expect(toolNames).toContain("jellyfin_system_info");

    server.proc.kill();
  });
});
