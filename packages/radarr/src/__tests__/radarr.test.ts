import { describe, it, expect, beforeAll } from "vitest";
import { ArrClient } from "@controlarr/core";
import { RadarrService } from "../service.js";

describe("RadarrService (integration)", () => {
  let svc: RadarrService;

  beforeAll(() => {
    const url = process.env.RADARR_URL!;
    const key = process.env.RADARR_API_KEY!;
    if (!url || !key) throw new Error("RADARR env vars required");
    svc = new RadarrService(new ArrClient(url, key));
  });

  describe("system", () => {
    it("returns system status with version", async () => {
      const status = await svc.systemStatus();
      expect(status.appName).toBe("Radarr");
      expect(status).toHaveProperty("version");
    });
  });

  describe("library", () => {
    it("returns paginated movie list", async () => {
      const result = await svc.library({ page: 1, pageSize: 5 });
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(result.totalItems).toBeGreaterThan(0);
      expect(result.hasNext).toBe(true);

      const movie = result.items[0];
      expect(movie).toHaveProperty("id");
      expect(movie).toHaveProperty("title");
      expect(movie).toHaveProperty("tmdbId");
    });

    it("filters by monitored status", async () => {
      const monitored = await svc.library({ page: 1, pageSize: 5, monitored: true });
      for (const m of monitored.items) {
        expect(m.monitored).toBe(true);
      }
    });
  });

  describe("getMovie", () => {
    it("returns full movie details by ID", async () => {
      const lib = await svc.library({ page: 1, pageSize: 1 });
      const movie = await svc.getMovie(lib.items[0].id);
      expect(movie).toHaveProperty("title");
      expect(movie).toHaveProperty("overview");
      expect(movie).toHaveProperty("qualityProfileId");
      expect(movie).toHaveProperty("path");
    });

    it("throws on invalid ID", async () => {
      await expect(svc.getMovie(999999)).rejects.toThrow();
    });
  });

  describe("search", () => {
    it("searches for movies by term", async () => {
      const results = await svc.search("inception");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("tmdbId");
    });

    it("returns empty array for nonsense query", async () => {
      const results = await svc.search("xyznonexistent999zzz");
      expect(results).toHaveLength(0);
    });
  });

  describe("calendar", () => {
    it("returns calendar entries for a date range", async () => {
      // Use a wide range to get something
      const start = "2020-01-01";
      const end = "2030-12-31";
      const entries = await svc.calendar(start, end);
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
    it("returns root folders with free space", async () => {
      const folders = await svc.rootFolders();
      expect(folders.length).toBeGreaterThan(0);
      expect(folders[0]).toHaveProperty("path");
      expect(folders[0]).toHaveProperty("freeSpace");
    });
  });

  describe("tags", () => {
    it("returns tags list", async () => {
      const tags = await svc.tags();
      expect(Array.isArray(tags)).toBe(true);
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
