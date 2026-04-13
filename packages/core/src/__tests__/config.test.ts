import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseServiceConfig, parseAllConfigs, type ServiceConfig } from "../config.js";

describe("parseServiceConfig", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("parses valid URL and API key from env vars", () => {
    process.env.RADARR_URL = "http://localhost:7878";
    process.env.RADARR_API_KEY = "abc123";

    const config = parseServiceConfig("RADARR");
    expect(config).toEqual({
      url: "http://localhost:7878",
      apiKey: "abc123",
    });
  });

  it("strips trailing slash from URL", () => {
    process.env.RADARR_URL = "http://localhost:7878/";
    process.env.RADARR_API_KEY = "abc123";

    const config = parseServiceConfig("RADARR");
    expect(config!.url).toBe("http://localhost:7878");
  });

  it("returns null when both env vars are missing", () => {
    delete process.env.RADARR_URL;
    delete process.env.RADARR_API_KEY;

    const config = parseServiceConfig("RADARR");
    expect(config).toBeNull();
  });

  it("throws when URL is set but API key is missing", () => {
    process.env.RADARR_URL = "http://localhost:7878";
    delete process.env.RADARR_API_KEY;

    expect(() => parseServiceConfig("RADARR")).toThrow(/RADARR_API_KEY/);
  });

  it("throws when API key is set but URL is missing", () => {
    delete process.env.RADARR_URL;
    process.env.RADARR_API_KEY = "abc123";

    expect(() => parseServiceConfig("RADARR")).toThrow(/RADARR_URL/);
  });

  it("throws on invalid URL", () => {
    process.env.RADARR_URL = "not-a-url";
    process.env.RADARR_API_KEY = "abc123";

    expect(() => parseServiceConfig("RADARR")).toThrow();
  });
});

describe("parseAllConfigs", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("returns only configured services", () => {
    process.env.RADARR_URL = "http://localhost:7878";
    process.env.RADARR_API_KEY = "abc";
    process.env.SONARR_URL = "http://localhost:8989";
    process.env.SONARR_API_KEY = "def";
    delete process.env.PROWLARR_URL;
    delete process.env.PROWLARR_API_KEY;

    const configs = parseAllConfigs();
    expect(configs.radarr).toBeTruthy();
    expect(configs.sonarr).toBeTruthy();
    expect(configs.prowlarr).toBeNull();
  });
});
