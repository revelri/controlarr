import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AnnotReadOnly,
  AnnotWrite,
  AnnotWriteCreate,
  AnnotDestructive,
  shouldRegisterTool,
  type ServerOptions,
} from "@controlarr/core";
import type { SonarrService } from "./service.js";

export function registerSonarrTools(
  server: McpServer,
  svc: SonarrService,
  options: Pick<ServerOptions, "readOnly" | "disableDestructive">
): void {
  const reg = (annot: typeof AnnotReadOnly) => shouldRegisterTool(annot, options);

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_system_status",
      "Get Sonarr system status: version, health.",
      {},
      async () => {
        const status = await svc.systemStatus();
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_library",
      "List TV series in the Sonarr library with pagination and optional filters. " +
        "Returns compact results — use sonarr_get_series for full details.",
      {
        page: z.number().int().min(1).default(1).describe("Page number"),
        pageSize: z.number().int().min(1).max(100).default(20).describe("Results per page"),
        monitored: z.boolean().optional().describe("Filter by monitored status"),
        status: z.string().optional().describe("Filter by status (continuing, ended, upcoming, deleted)"),
      },
      async (args) => {
        const result = await svc.library(args);
        const compact = result.items.map((s) => ({
          id: s.id,
          title: s.title,
          year: s.year,
          tvdbId: s.tvdbId,
          monitored: s.monitored,
          status: s.status,
          seasonCount: s.seasonCount,
          episodeCount: s.episodeCount,
          episodeFileCount: s.episodeFileCount,
          network: s.network,
          sizeOnDisk: formatBytes(s.sizeOnDisk),
        }));
        return {
          content: [{ type: "text", text: JSON.stringify({ ...result, items: compact }, null, 2) }],
        };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_get_series",
      "Get full details for a TV series by its Sonarr ID.",
      { id: z.number().int().describe("Sonarr series ID") },
      async ({ id }) => {
        const series = await svc.getSeries(id);
        return { content: [{ type: "text", text: JSON.stringify(series, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_episodes",
      "List all episodes for a series. Use sonarr_library to find the series ID first.",
      { seriesId: z.number().int().describe("Sonarr series ID") },
      async ({ seriesId }) => {
        const episodes = await svc.episodes(seriesId);
        const compact = episodes.map((e) => ({
          id: e.id,
          s: e.seasonNumber,
          e: e.episodeNumber,
          title: e.title,
          airDate: e.airDate,
          hasFile: e.hasFile,
          monitored: e.monitored,
        }));
        return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_get_episode",
      "Get full details for a specific episode by its Sonarr episode ID.",
      { id: z.number().int().describe("Sonarr episode ID") },
      async ({ id }) => {
        const episode = await svc.getEpisode(id);
        return { content: [{ type: "text", text: JSON.stringify(episode, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_search",
      "Search for TV series by title. Returns results from TVDB. " +
        "Use the tvdbId with sonarr_add_series to add a series.",
      { term: z.string().min(1).describe("Search term (series title)") },
      async ({ term }) => {
        const results = await svc.search(term);
        const compact = results.slice(0, 20).map((s) => ({
          title: s.title,
          year: s.year,
          tvdbId: s.tvdbId,
          overview: s.overview?.slice(0, 200),
          network: s.network,
          seriesType: s.seriesType,
          seasonCount: s.seasons?.length ?? 0,
        }));
        return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_calendar",
      "Get upcoming episodes within a date range.",
      {
        start: z.string().describe("Start date (YYYY-MM-DD)"),
        end: z.string().describe("End date (YYYY-MM-DD)"),
      },
      async ({ start, end }) => {
        const entries = await svc.calendar(start, end);
        return { content: [{ type: "text", text: JSON.stringify(entries, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_queue",
      "View the current download queue.",
      {
        page: z.number().int().min(1).default(1).describe("Page number"),
        pageSize: z.number().int().min(1).max(100).default(20).describe("Results per page"),
      },
      async (args) => {
        const result = await svc.queue(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_history",
      "View activity history with pagination.",
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

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_quality_profiles",
      "List available quality profiles. Use the profile ID when adding series.",
      {},
      async () => {
        const profiles = await svc.qualityProfiles();
        return { content: [{ type: "text", text: JSON.stringify(profiles, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "sonarr_root_folders",
      "List configured root folders. Use the path when adding series.",
      {},
      async () => {
        const folders = await svc.rootFolders();
        const compact = folders.map((f) => ({
          id: f.id,
          path: f.path,
          freeSpace: formatBytes(f.freeSpace),
        }));
        return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool("sonarr_tags", "List all tags.", {}, async () => {
      const tags = await svc.tags();
      return { content: [{ type: "text", text: JSON.stringify(tags, null, 2) }] };
    });
  }

  // --- WRITE ---

  if (reg(AnnotWriteCreate)) {
    server.tool(
      "sonarr_add_series",
      "Add a TV series to Sonarr. First use sonarr_search to find the tvdbId, " +
        "sonarr_quality_profiles for the profile ID, and sonarr_root_folders for the path.",
      {
        tvdbId: z.number().int().describe("TVDB ID from sonarr_search"),
        qualityProfileId: z.number().int().describe("Quality profile ID"),
        rootFolderPath: z.string().describe("Root folder path"),
        monitored: z.boolean().default(true).describe("Monitor for downloads"),
        searchForMissingEpisodes: z.boolean().default(true).describe("Immediately search for episodes"),
        seriesType: z.enum(["standard", "daily", "anime"]).default("standard").describe("Series type"),
        seasonFolder: z.boolean().default(true).describe("Use season folders"),
      },
      async (args) => {
        const series = await svc.addSeries(args);
        return {
          content: [{
            type: "text",
            text: `Added "${series.title}" (${series.year}) to Sonarr.\n\n${JSON.stringify(
              { id: series.id, title: series.title, path: series.path, seasons: series.seasonCount },
              null, 2
            )}`,
          }],
        };
      }
    );
  }

  if (reg(AnnotWrite)) {
    server.tool(
      "sonarr_edit_series",
      "Update a series' settings.",
      {
        id: z.number().int().describe("Sonarr series ID"),
        monitored: z.boolean().optional().describe("Set monitored status"),
        qualityProfileId: z.number().int().optional().describe("Change quality profile"),
        seriesType: z.enum(["standard", "daily", "anime"]).optional().describe("Change series type"),
      },
      async ({ id, ...params }) => {
        const series = await svc.editSeries(id, params);
        return {
          content: [{
            type: "text",
            text: `Updated "${series.title}".`,
          }],
        };
      }
    );
  }

  if (reg(AnnotDestructive)) {
    server.tool(
      "sonarr_delete_series",
      "PERMANENTLY remove a series from Sonarr. Requires confirm=true.",
      {
        id: z.number().int().describe("Sonarr series ID"),
        deleteFiles: z.boolean().default(false).describe("Also delete files from disk"),
        confirm: z.boolean().describe("Must be true to confirm deletion"),
      },
      async ({ id, deleteFiles, confirm }) => {
        if (!confirm) {
          const series = await svc.getSeries(id);
          return {
            content: [{
              type: "text",
              text: `Confirm deletion of "${series.title}"?\nFiles will ${deleteFiles ? "BE DELETED" : "be kept"}.\nCall again with confirm=true.`,
            }],
          };
        }
        const series = await svc.getSeries(id);
        await svc.deleteSeries(id, deleteFiles);
        return {
          content: [{ type: "text", text: `Deleted "${series.title}" from Sonarr.` }],
        };
      }
    );
  }

  if (reg(AnnotWrite)) {
    server.tool(
      "sonarr_search_missing",
      "Trigger a search for all missing episodes (monitored series only).",
      {},
      async () => {
        const cmd = await svc.searchMissing();
        return { content: [{ type: "text", text: `Missing episode search started (command ID: ${cmd.id}).` }] };
      }
    );
  }

  if (reg(AnnotWrite)) {
    server.tool(
      "sonarr_episode_search",
      "Trigger a search for specific episodes by their Sonarr episode IDs.",
      {
        episodeIds: z.array(z.number().int()).min(1).describe("Episode IDs to search for"),
      },
      async ({ episodeIds }) => {
        const cmd = await svc.episodeSearch(episodeIds);
        return {
          content: [{ type: "text", text: `Episode search started for ${episodeIds.length} episode(s).` }],
        };
      }
    );
  }

  if (reg(AnnotWrite)) {
    server.tool(
      "sonarr_season_monitor",
      "Toggle monitoring for a specific season.",
      {
        seriesId: z.number().int().describe("Sonarr series ID"),
        seasonNumber: z.number().int().min(0).describe("Season number (0 for specials)"),
        monitored: z.boolean().describe("Whether to monitor this season"),
      },
      async ({ seriesId, seasonNumber, monitored }) => {
        const series = await svc.seasonMonitor(seriesId, seasonNumber, monitored);
        return {
          content: [{
            type: "text",
            text: `Season ${seasonNumber} of "${series.title}" is now ${monitored ? "monitored" : "unmonitored"}.`,
          }],
        };
      }
    );
  }

  if (reg(AnnotWrite)) {
    server.tool(
      "sonarr_rename",
      "Trigger a rename for a series based on naming settings.",
      { seriesId: z.number().int().describe("Sonarr series ID") },
      async ({ seriesId }) => {
        const cmd = await svc.rename(seriesId);
        return { content: [{ type: "text", text: `Rename started (command ID: ${cmd.id}).` }] };
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
