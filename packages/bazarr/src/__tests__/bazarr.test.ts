import { describe, it, expect, beforeAll } from "vitest";
import { ArrClient } from "@controlarr/core";
import { BazarrService } from "../service.js";

describe("BazarrService (integration)", () => {
  let svc: BazarrService;

  beforeAll(() => {
    const url = process.env.BAZARR_URL!;
    const key = process.env.BAZARR_API_KEY!;
    if (!url || !key) throw new Error("BAZARR env vars required");
    svc = new BazarrService(new ArrClient(url, key, { authStyle: "query" }));
  });

  describe("system", () => {
    it("returns system status", async () => {
      const status = await svc.systemStatus();
      expect(status).toHaveProperty("bazarr_version");
    });
  });

  describe("series", () => {
    it("returns series list with pagination", async () => {
      const result = await svc.series({ page: 1, pageSize: 5 });
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(result.totalItems).toBeGreaterThan(0);

      const s = result.items[0];
      expect(s).toHaveProperty("title");
      expect(s).toHaveProperty("sonarrSeriesId");
    });
  });

  describe("movies", () => {
    it("returns movies list with pagination", async () => {
      const result = await svc.movies({ page: 1, pageSize: 5 });
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(result.totalItems).toBeGreaterThan(0);

      const m = result.items[0];
      expect(m).toHaveProperty("title");
      expect(m).toHaveProperty("radarrId");
    });
  });

  describe("episodes", () => {
    it("returns episodes for a series", async () => {
      const series = await svc.series({ page: 1, pageSize: 1 });
      const sonarrId = series.items[0].sonarrSeriesId;
      const episodes = await svc.episodes(sonarrId);
      expect(Array.isArray(episodes)).toBe(true);
    });
  });

  describe("wantedSeries", () => {
    it("returns wanted episodes", async () => {
      const result = await svc.wantedSeries({ page: 1, pageSize: 5 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("totalItems");
    });
  });

  describe("wantedMovies", () => {
    it("returns wanted movies", async () => {
      const result = await svc.wantedMovies({ page: 1, pageSize: 5 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("totalItems");
    });
  });

  describe("providers", () => {
    it("returns subtitle providers", async () => {
      const providers = await svc.providers();
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe("languages", () => {
    it("returns language profiles", async () => {
      const languages = await svc.languages();
      expect(Array.isArray(languages)).toBe(true);
    });
  });

  describe("history", () => {
    it("returns subtitle history", async () => {
      const result = await svc.historySeries({ page: 1, pageSize: 5 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("totalItems");
    });
  });
});
