import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AnnotReadOnly,
  AnnotWrite,
  AnnotDestructive,
  shouldRegisterTool,
  type ServerOptions,
} from "@controlarr/core";
import type { ProwlarrService } from "./service.js";

export function registerProwlarrTools(
  server: McpServer,
  svc: ProwlarrService,
  options: Pick<ServerOptions, "readOnly" | "disableDestructive">
): void {
  const reg = (annot: typeof AnnotReadOnly) => shouldRegisterTool(annot, options);

  if (reg(AnnotReadOnly)) {
    server.tool(
      "prowlarr_system_status",
      "Get Prowlarr system status.",
      {},
      async () => {
        const status = await svc.systemStatus();
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "prowlarr_indexers",
      "List all configured indexers with their status and protocol.",
      {},
      async () => {
        const indexers = await svc.indexers();
        const compact = indexers.map((i) => ({
          id: i.id,
          name: i.name,
          protocol: i.protocol,
          enabled: i.enable,
          priority: i.priority,
        }));
        return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "prowlarr_get_indexer",
      "Get full details for a specific indexer.",
      { id: z.number().int().describe("Prowlarr indexer ID") },
      async ({ id }) => {
        const indexer = await svc.getIndexer(id);
        return { content: [{ type: "text", text: JSON.stringify(indexer, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "prowlarr_search",
      "Search across all enabled indexers for releases. Returns torrent/NZB results.",
      {
        query: z.string().min(1).describe("Search query"),
        indexerIds: z.array(z.number().int()).optional().describe("Limit to specific indexer IDs"),
      },
      async ({ query, indexerIds }) => {
        const results = await svc.search(query, indexerIds);
        const compact = results.slice(0, 50).map((r) => ({
          title: r.title,
          indexer: r.indexer,
          size: formatBytes(r.size),
          seeders: r.seeders,
          leechers: r.leechers,
          publishDate: r.publishDate,
          protocol: r.protocol,
          categories: r.categories?.map((c) => c.name),
        }));
        return {
          content: [{
            type: "text",
            text: `Found ${results.length} results (showing ${compact.length}):\n\n${JSON.stringify(compact, null, 2)}`,
          }],
        };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "prowlarr_stats",
      "Get indexer statistics: query counts, grab counts, response times.",
      {},
      async () => {
        const stats = await svc.stats();
        return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "prowlarr_apps",
      "List applications connected to Prowlarr (Radarr, Sonarr, etc.).",
      {},
      async () => {
        const apps = await svc.apps();
        const compact = apps.map((a) => ({
          id: a.id,
          name: a.name,
          syncLevel: a.syncLevel,
          implementation: a.implementation,
        }));
        return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "prowlarr_history",
      "View search and grab history with pagination.",
      {
        page: z.number().int().min(1).default(1).describe("Page number"),
        pageSize: z.number().int().min(1).max(100).default(20).describe("Results per page"),
      },
      async (args) => {
        const result = await svc.history(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );
  }

  // --- WRITE ---

  if (reg(AnnotWrite)) {
    server.tool(
      "prowlarr_test_indexer",
      "Test connectivity for a specific indexer.",
      { id: z.number().int().describe("Indexer ID to test") },
      async ({ id }) => {
        await svc.testIndexer(id);
        return { content: [{ type: "text", text: `Indexer ${id} test completed successfully.` }] };
      }
    );
  }

  if (reg(AnnotWrite)) {
    server.tool(
      "prowlarr_test_all",
      "Test connectivity for all indexers.",
      {},
      async () => {
        await svc.testAllIndexers();
        return { content: [{ type: "text", text: "All indexer tests started." }] };
      }
    );
  }

  if (reg(AnnotWrite)) {
    server.tool(
      "prowlarr_edit_indexer",
      "Update an indexer's settings (enable/disable, priority, etc.).",
      {
        id: z.number().int().describe("Indexer ID"),
        enable: z.boolean().optional().describe("Enable or disable"),
        priority: z.number().int().min(1).max(50).optional().describe("Priority (1=highest)"),
      },
      async ({ id, ...updates }) => {
        const indexer = await svc.editIndexer(id, updates);
        return {
          content: [{
            type: "text",
            text: `Updated indexer "${indexer.name}".`,
          }],
        };
      }
    );
  }

  if (reg(AnnotDestructive)) {
    server.tool(
      "prowlarr_delete_indexer",
      "PERMANENTLY remove an indexer. Requires confirm=true.",
      {
        id: z.number().int().describe("Indexer ID"),
        confirm: z.boolean().describe("Must be true to confirm deletion"),
      },
      async ({ id, confirm }) => {
        if (!confirm) {
          const indexer = await svc.getIndexer(id);
          return {
            content: [{ type: "text", text: `Confirm deletion of indexer "${indexer.name}"? Call again with confirm=true.` }],
          };
        }
        const indexer = await svc.getIndexer(id);
        await svc.deleteIndexer(id);
        return {
          content: [{ type: "text", text: `Deleted indexer "${indexer.name}".` }],
        };
      }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
