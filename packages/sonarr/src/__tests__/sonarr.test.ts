import { describe, it, expect, beforeAll } from "vitest";
import { ArrClient } from "@controlarr/core";
import { SonarrService } from "../service.js";

describe("SonarrService (integration)", () => {
  let svc: SonarrService;

  beforeAll(() => {
    const url = process.env.SONARR_URL!;
    const key = process.env.SONARR_API_KEY!;
    if (!url || !key) throw new Error("SONARR env vars required");
    svc = new SonarrService(new ArrClient(url, key));
  });

  describe("system", () => {
    it("returns system status", async () => {
      const status = await svc.systemStatus();
      expect(status.appName).toBe("Sonarr");
      expect(status).toHaveProperty("version");
    });
  });

  describe("library", () => {
    it("returns paginated series list", async () => {
      const result = await svc.library({ page: 1, pageSize: 5 });
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(result.totalItems).toBeGreaterThan(0);

      const series = result.items[0];
      expect(series).toHaveProperty("id");
      expect(series).toHaveProperty("title");
      expect(series).toHaveProperty("tvdbId");
    });

    it("filters by monitored status", async () => {
      const monitored = await svc.library({ page: 1, pageSize: 5, monitored: true });
      for (const s of monitored.items) {
        expect(s.monitored).toBe(true);
      }
    });
  });

  describe("getSeries", () => {
    it("returns full series details", async () => {
      const lib = await svc.library({ page: 1, pageSize: 1 });
      const series = await svc.getSeries(lib.items[0].id);
      expect(series).toHaveProperty("title");
      expect(series).toHaveProperty("overview");
      expect(series).toHaveProperty("qualityProfileId");
    });

    it("throws on invalid ID", async () => {
      await expect(svc.getSeries(999999)).rejects.toThrow();
    });
  });

  describe("episodes", () => {
    it("returns episodes for a series", async () => {
      const lib = await svc.library({ page: 1, pageSize: 1 });
      const episodes = await svc.episodes(lib.items[0].id);
      expect(episodes.length).toBeGreaterThan(0);
      expect(episodes[0]).toHaveProperty("episodeNumber");
      expect(episodes[0]).toHaveProperty("seasonNumber");
      expect(episodes[0]).toHaveProperty("title");
    });
  });

  describe("search", () => {
    it("searches for series by term", async () => {
      const results = await svc.search("breaking bad");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("tvdbId");
    });

    it("returns empty for nonsense query", async () => {
      const results = await svc.search("xyznonexistent999zzz");
      expect(results).toHaveLength(0);
    });
  });

  describe("calendar", () => {
    it("returns calendar entries", async () => {
      const entries = await svc.calendar("2020-01-01", "2030-12-31");
      expect(Array.isArray(entries)).toBe(true);
    });
  });

  describe("queue", () => {
    it("returns download queue", async () => {
      const queue = await svc.queue({ page: 1, pageSize: 10 });
      expect(queue).toHaveProperty("items");
      expect(queue).toHaveProperty("totalItems");
    });
  });

  describe("qualityProfiles", () => {
    it("returns quality profiles", async () => {
      const profiles = await svc.qualityProfiles();
      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles[0]).toHaveProperty("id");
      expect(profiles[0]).toHaveProperty("name");
    });
  });

  describe("rootFolders", () => {
    it("returns root folders", async () => {
      const folders = await svc.rootFolders();
      expect(folders.length).toBeGreaterThan(0);
      expect(folders[0]).toHaveProperty("path");
    });
  });

  describe("history", () => {
    it("returns history with pagination", async () => {
      const history = await svc.history({ page: 1, pageSize: 5 });
      expect(history).toHaveProperty("items");
      expect(history).toHaveProperty("totalItems");
    });
  });
});
