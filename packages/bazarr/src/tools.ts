import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AnnotReadOnly,
  AnnotWrite,
  AnnotDestructive,
  shouldRegisterTool,
  type ServerOptions,
} from "@controlarr/core";
import type { BazarrService } from "./service.js";

export function registerBazarrTools(
  server: McpServer,
  svc: BazarrService,
  options: Pick<ServerOptions, "readOnly" | "disableDestructive">
): void {
  const reg = (annot: typeof AnnotReadOnly) => shouldRegisterTool(annot, options);

  if (reg(AnnotReadOnly)) {
    server.tool(
      "bazarr_system_status",
      "Get Bazarr system status: version, connected services.",
      {},
      async () => {
        const status = await svc.systemStatus();
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "bazarr_series",
      "List TV series with subtitle status and missing count.",
      {
        page: z.number().int().min(1).default(1).describe("Page number"),
        pageSize: z.number().int().min(1).max(100).default(20).describe("Results per page"),
      },
      async (args) => {
        const result = await svc.series(args);
        const compact = result.items.map((s) => ({
          sonarrSeriesId: s.sonarrSeriesId,
          title: s.title,
          monitored: s.monitored,
          episodeFileCount: s.episodeFileCount,
          episodeMissingCount: s.episodeMissingCount,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify({ ...result, items: compact }, null, 2) }],
        };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "bazarr_movies",
      "List movies with subtitle status.",
      {
        page: z.number().int().min(1).default(1).describe("Page number"),
        pageSize: z.number().int().min(1).max(100).default(20).describe("Results per page"),
      },
      async (args) => {
        const result = await svc.movies(args);
        const compact = result.items.map((m) => ({
          radarrId: m.radarrId,
          title: m.title,
          monitored: m.monitored,
          missingSubtitles: m.missing_subtitles?.map((s) => s.name) ?? [],
          subtitleCount: m.subtitles?.length ?? 0,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify({ ...result, items: compact }, null, 2) }],
        };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "bazarr_episodes",
      "List episodes for a series with subtitle info.",
      {
        sonarrSeriesId: z.number().int().describe("Sonarr series ID"),
      },
      async ({ sonarrSeriesId }) => {
        const episodes = await svc.episodes(sonarrSeriesId);
        const compact = episodes.map((e) => ({
          sonarrEpisodeId: e.sonarrEpisodeId,
          s: e.season,
          e: e.episode,
          title: e.title,
          monitored: e.monitored,
          missingSubtitles: e.missing_subtitles?.map((s) => s.name) ?? [],
          subtitleCount: e.subtitles?.length ?? 0,
        }));
        return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "bazarr_wanted_series",
      "List episodes with missing subtitles.",
      {
        page: z.number().int().min(1).default(1).describe("Page number"),
        pageSize: z.number().int().min(1).max(100).default(20).describe("Results per page"),
      },
      async (args) => {
        const result = await svc.wantedSeries(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "bazarr_wanted_movies",
      "List movies with missing subtitles.",
      {
        page: z.number().int().min(1).default(1).describe("Page number"),
        pageSize: z.number().int().min(1).max(100).default(20).describe("Results per page"),
      },
      async (args) => {
        const result = await svc.wantedMovies(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "bazarr_history_series",
      "View subtitle download history for series.",
      {
        page: z.number().int().min(1).default(1).describe("Page number"),
        pageSize: z.number().int().min(1).max(100).default(20).describe("Results per page"),
      },
      async (args) => {
        const result = await svc.historySeries(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "bazarr_history_movies",
      "View subtitle download history for movies.",
      {
        page: z.number().int().min(1).default(1).describe("Page number"),
        pageSize: z.number().int().min(1).max(100).default(20).describe("Results per page"),
      },
      async (args) => {
        const result = await svc.historyMovies(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "bazarr_providers",
      "List configured subtitle providers with their status.",
      {},
      async () => {
        const providers = await svc.providers();
        return { content: [{ type: "text", text: JSON.stringify(providers, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "bazarr_languages",
      "List available languages for subtitles.",
      {},
      async () => {
        const languages = await svc.languages();
        return { content: [{ type: "text", text: JSON.stringify(languages, null, 2) }] };
      }
    );
  }

  // --- WRITE ---

  if (reg(AnnotWrite)) {
    server.tool(
      "bazarr_search_subtitles",
      "Search for subtitles for a specific episode or movie.",
      {
        type: z.enum(["episode", "movie"]).describe("Whether this is for an episode or movie"),
        id: z.number().int().describe("Sonarr episode ID or Radarr movie ID"),
        language: z.string().describe("Language code (e.g., 'en', 'es', 'fr')"),
      },
      async ({ type, id, language }) => {
        const results = await svc.searchSubtitles(type, id, language);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }
    );
  }

  if (reg(AnnotWrite)) {
    server.tool(
      "bazarr_download_subtitle",
      "Download a specific subtitle from search results.",
      {
        type: z.enum(["episode", "movie"]).describe("Episode or movie"),
        id: z.number().int().describe("Sonarr episode ID or Radarr movie ID"),
        language: z.string().describe("Language code"),
        provider: z.string().describe("Provider name from search results"),
        subtitle: z.string().describe("Subtitle ID/reference from search results"),
      },
      async ({ type, id, language, provider, subtitle }) => {
        await svc.downloadSubtitle(type, id, language, provider, subtitle);
        return {
          content: [{ type: "text", text: `Subtitle downloaded for ${type} ${id} (${language}).` }],
        };
      }
    );
  }

  if (reg(AnnotDestructive)) {
    server.tool(
      "bazarr_delete_subtitle",
      "Delete a subtitle file. Requires confirm=true.",
      {
        type: z.enum(["episode", "movie"]).describe("Episode or movie"),
        id: z.number().int().describe("Sonarr episode ID or Radarr movie ID"),
        language: z.string().describe("Language code"),
        path: z.string().describe("Full path to the subtitle file"),
        confirm: z.boolean().describe("Must be true to confirm deletion"),
      },
      async ({ type, id, language, path, confirm }) => {
        if (!confirm) {
          return {
            content: [{
              type: "text" as const,
              text: `Confirm deletion of subtitle at ${path}? Call again with confirm=true.`,
            }],
          };
        }
        await svc.deleteSubtitle(type, id, language, path);
        return {
          content: [{ type: "text", text: `Deleted subtitle at ${path}.` }],
        };
      }
    );
  }
}
