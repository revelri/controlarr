import { describe, it, expect, beforeAll } from "vitest";
import { ArrClient } from "../client.js";

// Integration tests against live Radarr
const RADARR_URL = process.env.RADARR_URL!;
const RADARR_KEY = process.env.RADARR_API_KEY!;

describe("ArrClient (integration against Radarr)", () => {
  let client: ArrClient;

  beforeAll(() => {
    if (!RADARR_URL || !RADARR_KEY) {
      throw new Error("RADARR_URL and RADARR_API_KEY must be set");
    }
    client = new ArrClient(RADARR_URL, RADARR_KEY);
  });

  it("performs a GET request to system/status", async () => {
    const status = await client.get<{ version: string }>("/api/v3/system/status");
    expect(status).toHaveProperty("version");
    expect(typeof status.version).toBe("string");
  });

  it("adds X-Api-Key header to requests", async () => {
    // If we can get status, the key is working
    const status = await client.get<{ appName: string }>("/api/v3/system/status");
    expect(status.appName).toBe("Radarr");
  });

  it("throws on 401 with bad API key", async () => {
    const badClient = new ArrClient(RADARR_URL, "invalid-key");
    await expect(badClient.get("/api/v3/system/status")).rejects.toThrow(/401|Unauthorized/);
  });

  it("throws on non-existent endpoint", async () => {
    await expect(client.get("/api/v3/nonexistent")).rejects.toThrow(/404|Not Found/);
  });

  it("supports query parameters", async () => {
    // Radarr movie lookup with no results should return empty array
    const results = await client.get<unknown[]>("/api/v3/movie/lookup", {
      term: "xyznonexistent999",
    });
    expect(Array.isArray(results)).toBe(true);
  });

  it("supports POST requests", async () => {
    // Test with command endpoint (rescan movie — harmless)
    const result = await client.post<{ name: string }>("/api/v3/command", {
      name: "RescanMovie",
    });
    expect(result).toHaveProperty("name");
  });
});

describe("ArrClient with query param auth (Bazarr style)", () => {
  const BAZARR_URL = process.env.BAZARR_URL!;
  const BAZARR_KEY = process.env.BAZARR_API_KEY!;

  it("authenticates via query parameter when configured", async () => {
    if (!BAZARR_URL || !BAZARR_KEY) return;

    const client = new ArrClient(BAZARR_URL, BAZARR_KEY, { authStyle: "query" });
    const status = await client.get<{ data: { bazarr_version: string } }>(
      "/api/system/status"
    );
    expect(status.data).toHaveProperty("bazarr_version");
  });
});

describe("ArrClient retry behavior", () => {
  it("retries on connection refused (max 2 retries)", async () => {
    const client = new ArrClient("http://localhost:1", "key", {
      maxRetries: 2,
      retryDelayMs: 50,
    });

    const start = Date.now();
    await expect(client.get("/test")).rejects.toThrow();
    const elapsed = Date.now() - start;
    // Should have retried twice with ~50ms delay each
    expect(elapsed).toBeGreaterThanOrEqual(80);
  });
});
