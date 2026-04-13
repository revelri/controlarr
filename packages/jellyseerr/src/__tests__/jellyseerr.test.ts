import { describe, it, expect, beforeAll } from "vitest";
import { ArrClient } from "@controlarr/core";
import { JellyseerrService } from "../service.js";

describe("JellyseerrService (integration)", () => {
  let svc: JellyseerrService;

  beforeAll(() => {
    const url = process.env.JELLYSEERR_URL!;
    const key = process.env.JELLYSEERR_API_KEY!;
    if (!url || !key) throw new Error("JELLYSEERR env vars required");
    svc = new JellyseerrService(new ArrClient(url, key));
  });

  describe("system", () => {
    it("returns system status with version", async () => {
      const status = await svc.systemStatus();
      expect(status).toHaveProperty("version");
    });
  });

  describe("search", () => {
    it("searches for movies by title", async () => {
      const result = await svc.search("inception");
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]).toHaveProperty("id");
      expect(result.results[0]).toHaveProperty("mediaType");
    });

    it("returns empty for nonsense query", async () => {
      const result = await svc.search("xyznonexistent999zzz");
      expect(result.results).toHaveLength(0);
    });
  });

  describe("trending", () => {
    it("returns trending media", async () => {
      const result = await svc.trending();
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe("popular", () => {
    it("returns popular movies", async () => {
      const result = await svc.popular("movie");
      expect(result.results.length).toBeGreaterThan(0);
    });

    it("returns popular TV", async () => {
      const result = await svc.popular("tv");
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe("requests", () => {
    it("returns request list", async () => {
      const result = await svc.requests();
      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("pageInfo");
    });
  });

  describe("getMedia", () => {
    it("returns movie details by TMDB ID", async () => {
      // Inception TMDB ID
      const movie = await svc.getMedia("movie", 27205);
      expect(movie).toHaveProperty("title");
      expect(movie).toHaveProperty("overview");
    });

    it("returns TV details by TMDB ID", async () => {
      // Breaking Bad TMDB ID
      const tv = await svc.getMedia("tv", 1396);
      expect(tv).toHaveProperty("name");
    });
  });

  describe("users", () => {
    it("returns user list", async () => {
      const result = await svc.users();
      expect(result).toHaveProperty("results");
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe("issues", () => {
    it("returns issues list", async () => {
      const result = await svc.issues();
      expect(result).toHaveProperty("results");
    });
  });
});
