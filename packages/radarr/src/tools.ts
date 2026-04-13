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
import type { RadarrService } from "./service.js";

export function registerRadarrTools(
  server: McpServer,
  svc: RadarrService,
  options: Pick<ServerOptions, "readOnly" | "disableDestructive">
): void {
  const reg = (annot: typeof AnnotReadOnly) => shouldRegisterTool(annot, options);

  // --- radarr_system_status ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_system_status",
      "Get Radarr system status: version, health, disk space.",
      {},
      async () => {
        const status = await svc.systemStatus();
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      }
    );
  }

  // --- radarr_library ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_library",
      "List movies in the Radarr library with pagination and optional filters. " +
        "Returns compact results — use radarr_get_movie for full details.",
      {
        page: z.number().int().min(1).default(1).describe("Page number"),
        pageSize: z.number().int().min(1).max(100).default(20).describe("Results per page (max 100)"),
        monitored: z.boolean().optional().describe("Filter by monitored status"),
        status: z.string().optional().describe("Filter by status (released, inCinemas, announced, deleted)"),
      },
      async (args) => {
        const result = await svc.library(args);
        const compact = result.items.map((m) => ({
          id: m.id,
          title: m.title,
          year: m.year,
          tmdbId: m.tmdbId,
          monitored: m.monitored,
          hasFile: m.hasFile,
          status: m.status,
          sizeOnDisk: formatBytes(m.sizeOnDisk),
        }));
        return {
          content: [{
            type: "text",
            text: JSON.stringify(
              { ...result, items: compact },
              null,
              2
            ),
          }],
        };
      }
    );
  }

  // --- radarr_get_movie ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_get_movie",
      "Get full details for a specific movie by its Radarr ID. " +
        "Use radarr_library or radarr_search to find the ID first.",
      {
        id: z.number().int().describe("Radarr movie ID"),
      },
      async ({ id }) => {
        const movie = await svc.getMovie(id);
        return { content: [{ type: "text", text: JSON.stringify(movie, null, 2) }] };
      }
    );
  }

  // --- radarr_search ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_search",
      "Search for movies by title. Returns results from TMDB with TMDB IDs. " +
        "Use the tmdbId from results with radarr_add_movie to add a movie.",
      {
        term: z.string().min(1).describe("Search term (movie title)"),
      },
      async ({ term }) => {
        const results = await svc.search(term);
        const compact = results.slice(0, 20).map((m) => ({
          title: m.title,
          year: m.year,
          tmdbId: m.tmdbId,
          imdbId: m.imdbId,
          overview: m.overview?.slice(0, 200),
          runtime: m.runtime,
          certification: m.certification,
        }));
        return {
          content: [{
            type: "text",
            text: JSON.stringify(compact, null, 2),
          }],
        };
      }
    );
  }

  // --- radarr_calendar ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_calendar",
      "Get upcoming and recent movie releases within a date range.",
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

  // --- radarr_queue ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_queue",
      "View the current download queue with progress information.",
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

  // --- radarr_history ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_history",
      "View activity history (downloads, grabs, renames, etc.) with pagination.",
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

  // --- radarr_quality_profiles ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_quality_profiles",
      "List available quality profiles. Use the profile ID when adding movies.",
      {},
      async () => {
        const profiles = await svc.qualityProfiles();
        return { content: [{ type: "text", text: JSON.stringify(profiles, null, 2) }] };
      }
    );
  }

  // --- radarr_root_folders ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_root_folders",
      "List configured root folders with free space. Use the path when adding movies.",
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

  // --- radarr_tags ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_tags",
      "List all tags.",
      {},
      async () => {
        const tags = await svc.tags();
        return { content: [{ type: "text", text: JSON.stringify(tags, null, 2) }] };
      }
    );
  }

  // --- radarr_exclusions ---
  if (reg(AnnotReadOnly)) {
    server.tool(
      "radarr_exclusions",
      "List import list exclusions.",
      {},
      async () => {
        const exclusions = await svc.exclusions();
        return { content: [{ type: "text", text: JSON.stringify(exclusions, null, 2) }] };
      }
    );
  }

  // --- WRITE OPERATIONS ---

  // --- radarr_add_movie ---
  if (reg(AnnotWriteCreate)) {
    server.tool(
      "radarr_add_movie",
      "Add a movie to the Radarr library. First use radarr_search to find the tmdbId, " +
        "radarr_quality_profiles for the profile ID, and radarr_root_folders for the path.",
      {
        tmdbId: z.number().int().describe("TMDB ID from radarr_search results"),
        qualityProfileId: z.number().int().describe("Quality profile ID from radarr_quality_profiles"),
        rootFolderPath: z.string().describe("Root folder path from radarr_root_folders"),
        monitored: z.boolean().default(true).describe("Whether to monitor for downloads"),
        searchForMovie: z.boolean().default(true).describe("Immediately search for the movie"),
        minimumAvailability: z
          .enum(["announced", "inCinemas", "released", "preDB"])
          .default("released")
          .describe("When the movie is considered available"),
      },
      async (args) => {
        const movie = await svc.addMovie(args);
        return {
          content: [{
            type: "text",
            text: `Added "${movie.title}" (${movie.year}) to Radarr.\n\n${JSON.stringify(
              { id: movie.id, title: movie.title, path: movie.path, monitored: movie.monitored },
              null,
              2
            )}`,
          }],
        };
      }
    );
  }

  // --- radarr_edit_movie ---
  if (reg(AnnotWrite)) {
    server.tool(
      "radarr_edit_movie",
      "Update a movie's settings (monitoring, quality profile, etc.).",
      {
        id: z.number().int().describe("Radarr movie ID"),
        monitored: z.boolean().optional().describe("Set monitored status"),
        qualityProfileId: z.number().int().optional().describe("Change quality profile"),
        minimumAvailability: z
          .enum(["announced", "inCinemas", "released", "preDB"])
          .optional()
          .describe("Change minimum availability"),
      },
      async ({ id, ...params }) => {
        const movie = await svc.editMovie(id, params);
        return {
          content: [{
            type: "text",
            text: `Updated "${movie.title}".\n\n${JSON.stringify(
              { id: movie.id, monitored: movie.monitored, qualityProfileId: movie.qualityProfileId },
              null,
              2
            )}`,
          }],
        };
      }
    );
  }

  // --- radarr_delete_movie ---
  if (reg(AnnotDestructive)) {
    server.tool(
      "radarr_delete_movie",
      "PERMANENTLY remove a movie from Radarr. Requires confirm=true to execute. " +
        "Optionally deletes files from disk.",
      {
        id: z.number().int().describe("Radarr movie ID"),
        deleteFiles: z.boolean().default(false).describe("Also delete movie files from disk"),
        confirm: z
          .boolean()
          .describe("Must be true to confirm deletion. This is irreversible."),
      },
      async ({ id, deleteFiles, confirm }) => {
        if (!confirm) {
          const movie = await svc.getMovie(id);
          return {
            content: [{
              type: "text",
              text: `⚠ Confirm deletion of "${movie.title}" (${movie.year})?\n` +
                `Files will ${deleteFiles ? "BE DELETED" : "be kept"} on disk.\n` +
                `Call again with confirm=true to proceed.`,
            }],
          };
        }
        const movie = await svc.getMovie(id);
        await svc.deleteMovie(id, deleteFiles);
        return {
          content: [{
            type: "text",
            text: `Deleted "${movie.title}" (${movie.year}) from Radarr.` +
              (deleteFiles ? " Files removed from disk." : ""),
          }],
        };
      }
    );
  }

  // --- radarr_search_missing ---
  if (reg(AnnotWrite)) {
    server.tool(
      "radarr_search_missing",
      "Trigger a search for all missing movies (monitored, no file).",
      {},
      async () => {
        const cmd = await svc.searchMissing();
        return {
          content: [{ type: "text", text: `Missing movie search started (command ID: ${cmd.id}).` }],
        };
      }
    );
  }

  // --- radarr_search_movie ---
  if (reg(AnnotWrite)) {
    server.tool(
      "radarr_search_movie",
      "Trigger a search for specific movies by their Radarr IDs.",
      {
        movieIds: z.array(z.number().int()).min(1).describe("Array of Radarr movie IDs to search for"),
      },
      async ({ movieIds }) => {
        const cmd = await svc.searchMovie(movieIds);
        return {
          content: [{ type: "text", text: `Movie search started for ${movieIds.length} movie(s) (command ID: ${cmd.id}).` }],
        };
      }
    );
  }

  // --- radarr_rename ---
  if (reg(AnnotWrite)) {
    server.tool(
      "radarr_rename",
      "Trigger a rename for specific movies based on naming settings.",
      {
        movieIds: z.array(z.number().int()).min(1).describe("Array of Radarr movie IDs to rename"),
      },
      async ({ movieIds }) => {
        const cmd = await svc.rename(movieIds);
        return {
          content: [{ type: "text", text: `Rename started for ${movieIds.length} movie(s) (command ID: ${cmd.id}).` }],
        };
      }
    );
  }

  // --- radarr_add_exclusion ---
  if (reg(AnnotWriteCreate)) {
    server.tool(
      "radarr_add_exclusion",
      "Add a movie to the import exclusion list (prevents auto-import).",
      {
        tmdbId: z.number().int().describe("TMDB ID of the movie to exclude"),
        title: z.string().describe("Movie title"),
        year: z.number().int().describe("Release year"),
      },
      async ({ tmdbId, title, year }) => {
        await svc.addExclusion(tmdbId, title, year);
        return {
          content: [{ type: "text", text: `Added "${title}" (${year}) to import exclusions.` }],
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
