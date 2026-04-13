import { describe, it, expect, beforeAll } from "vitest";
import { ArrClient } from "@controlarr/core";
import { ProwlarrService } from "../service.js";

describe("ProwlarrService (integration)", () => {
  let svc: ProwlarrService;

  beforeAll(() => {
    const url = process.env.PROWLARR_URL!;
    const key = process.env.PROWLARR_API_KEY!;
    if (!url || !key) throw new Error("PROWLARR env vars required");
    svc = new ProwlarrService(new ArrClient(url, key));
  });

  describe("system", () => {
    it("returns system status", async () => {
      const status = await svc.systemStatus();
      expect(status.appName).toBe("Prowlarr");
      expect(status).toHaveProperty("version");
    });
  });

  describe("indexers", () => {
    it("returns configured indexers", async () => {
      const indexers = await svc.indexers();
      expect(indexers.length).toBeGreaterThan(0);
      expect(indexers[0]).toHaveProperty("id");
      expect(indexers[0]).toHaveProperty("name");
      expect(indexers[0]).toHaveProperty("protocol");
    });
  });

  describe("getIndexer", () => {
    it("returns indexer details", async () => {
      const indexers = await svc.indexers();
      const indexer = await svc.getIndexer(indexers[0].id);
      expect(indexer).toHaveProperty("name");
      expect(indexer).toHaveProperty("fields");
    });

    it("throws on invalid ID", async () => {
      await expect(svc.getIndexer(999999)).rejects.toThrow();
    });
  });

  describe("search", () => {
    it("searches across indexers", { timeout: 60_000 }, async () => {
      const results = await svc.search("linux");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("stats", () => {
    it("returns indexer statistics", async () => {
      const stats = await svc.stats();
      expect(stats).toHaveProperty("indexers");
    });
  });

  describe("apps", () => {
    it("returns connected applications", async () => {
      const apps = await svc.apps();
      expect(Array.isArray(apps)).toBe(true);
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
