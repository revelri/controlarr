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
import type { JellyseerrService } from "./service.js";

// Jellyseerr status codes
const STATUS_NAMES: Record<number, string> = {
  1: "UNKNOWN",
  2: "PENDING",
  3: "PROCESSING",
  4: "PARTIALLY_AVAILABLE",
  5: "AVAILABLE",
};

const REQUEST_STATUS: Record<number, string> = {
  1: "PENDING_APPROVAL",
  2: "APPROVED",
  3: "DECLINED",
  4: "AVAILABLE",
  5: "UNAVAILABLE",
};

function statusName(code: number, map: Record<number, string>): string {
  return map[code] ?? `UNKNOWN(${code})`;
}

export function registerJellyseerrTools(
  server: McpServer,
  svc: JellyseerrService,
  options: Pick<ServerOptions, "readOnly" | "disableDestructive">
): void {
  const reg = (annot: typeof AnnotReadOnly) => shouldRegisterTool(annot, options);

  if (reg(AnnotReadOnly)) {
    server.tool(
      "jellyseerr_system_status",
      "Get Jellyseerr system status: version, update availability.",
      {},
      async () => {
        const status = await svc.systemStatus();
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "jellyseerr_search",
      "Search for movies, TV shows, or people. Returns results from TMDB with availability status. " +
        "Use the id and mediaType from results with jellyseerr_get_media for full details or jellyseerr_request_movie/tv to request.",
      {
        query: z.string().min(1).describe("Search query"),
        page: z.number().int().min(1).default(1).describe("Page number"),
      },
      async ({ query, page }) => {
        const result = await svc.search(query, page);
        const compact = result.results.map((r) => ({
          id: r.id,
          mediaType: r.mediaType,
          title: r.title ?? r.name,
          overview: (r.overview ?? "").slice(0, 150),
          year: (r.releaseDate ?? r.firstAirDate ?? "").slice(0, 4),
          rating: r.voteAverage,
          availability: r.mediaInfo ? statusName(r.mediaInfo.status, STATUS_NAMES) : "NOT_REQUESTED",
        }));
        return {
          content: [{
            type: "text",
            text: `Found ${result.totalResults} results (page ${result.page}/${result.totalPages}):\n\n${JSON.stringify(compact, null, 2)}`,
          }],
        };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "jellyseerr_trending",
      "Get trending movies and TV shows.",
      { page: z.number().int().min(1).default(1).describe("Page number") },
      async ({ page }) => {
        const result = await svc.trending(page);
        const compact = result.results.map((r) => ({
          id: r.id,
          mediaType: r.mediaType,
          title: r.title ?? r.name,
          year: (r.releaseDate ?? r.firstAirDate ?? "").slice(0, 4),
          rating: r.voteAverage,
          availability: r.mediaInfo ? statusName(r.mediaInfo.status, STATUS_NAMES) : "NOT_REQUESTED",
        }));
        return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "jellyseerr_popular",
      "Get popular movies or TV shows.",
      {
        type: z.enum(["movie", "tv"]).describe("Media type"),
        page: z.number().int().min(1).default(1).describe("Page number"),
      },
      async ({ type, page }) => {
        const result = await svc.popular(type, page);
        const compact = result.results.map((r) => ({
          id: r.id,
          title: r.title ?? r.name,
          year: (r.releaseDate ?? r.firstAirDate ?? "").slice(0, 4),
          rating: r.voteAverage,
          availability: r.mediaInfo ? statusName(r.mediaInfo.status, STATUS_NAMES) : "NOT_REQUESTED",
        }));
        return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "jellyseerr_upcoming",
      "Get upcoming movie or TV releases.",
      {
        type: z.enum(["movie", "tv"]).default("movie").describe("Media type"),
        page: z.number().int().min(1).default(1).describe("Page number"),
      },
      async ({ type, page }) => {
        const result = await svc.upcoming(type, page);
        const compact = result.results.map((r) => ({
          id: r.id,
          title: r.title ?? r.name,
          releaseDate: r.releaseDate ?? r.firstAirDate,
          rating: r.voteAverage,
        }));
        return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "jellyseerr_get_media",
      "Get full details for a movie or TV show by TMDB ID. Shows availability, existing requests, genres, cast, etc.",
      {
        type: z.enum(["movie", "tv"]).describe("Media type"),
        tmdbId: z.number().int().describe("TMDB ID from search results"),
      },
      async ({ type, tmdbId }) => {
        const media = await svc.getMedia(type, tmdbId);
        return { content: [{ type: "text", text: JSON.stringify(media, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "jellyseerr_requests",
      "List media requests with optional filtering.",
      {
        take: z.number().int().min(1).max(100).default(20).describe("Number of results"),
        skip: z.number().int().min(0).default(0).describe("Number to skip"),
        filter: z
          .enum(["all", "approved", "available", "pending", "processing", "unavailable", "failed"])
          .optional()
          .describe("Filter by status"),
      },
      async ({ take, skip, filter }) => {
        const result = await svc.requests(take, skip, filter);
        const compact = result.results.map((r) => ({
          id: r.id,
          type: r.type,
          status: statusName(r.status, REQUEST_STATUS),
          tmdbId: r.media.tmdbId,
          requestedBy: r.requestedBy?.displayName,
          createdAt: r.createdAt,
          mediaStatus: statusName(r.media.status, STATUS_NAMES),
        }));
        return {
          content: [{
            type: "text",
            text: `${result.pageInfo.results} total requests:\n\n${JSON.stringify(compact, null, 2)}`,
          }],
        };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "jellyseerr_get_request",
      "Get details for a specific request.",
      { id: z.number().int().describe("Request ID") },
      async ({ id }) => {
        const request = await svc.getRequest(id);
        return { content: [{ type: "text", text: JSON.stringify(request, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "jellyseerr_users",
      "List Jellyseerr users.",
      {
        take: z.number().int().min(1).max(100).default(20).describe("Number of results"),
        skip: z.number().int().min(0).default(0).describe("Skip"),
      },
      async ({ take, skip }) => {
        const result = await svc.users(take, skip);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );
  }

  if (reg(AnnotReadOnly)) {
    server.tool(
      "jellyseerr_issues",
      "List reported issues.",
      {
        take: z.number().int().min(1).max(100).default(20).describe("Number of results"),
        skip: z.number().int().min(0).default(0).describe("Skip"),
      },
      async ({ take, skip }) => {
        const result = await svc.issues(take, skip);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );
  }

  // --- WRITE ---

  if (reg(AnnotWriteCreate)) {
    server.tool(
      "jellyseerr_request_movie",
      "Request a movie to be downloaded. Use jellyseerr_search first to find the TMDB ID.",
      {
        tmdbId: z.number().int().describe("TMDB ID from search results"),
        is4k: z.boolean().default(false).describe("Request 4K version"),
      },
      async ({ tmdbId, is4k }) => {
        const request = await svc.requestMovie(tmdbId, is4k);
        return {
          content: [{
            type: "text",
            text: `Movie requested (request ID: ${request.id}, status: ${statusName(request.status, REQUEST_STATUS)}).`,
          }],
        };
      }
    );
  }

  if (reg(AnnotWriteCreate)) {
    server.tool(
      "jellyseerr_request_tv",
      "Request a TV series. Use jellyseerr_search and jellyseerr_get_media first to find the TMDB ID and available seasons.",
      {
        tmdbId: z.number().int().describe("TMDB ID from search results"),
        seasons: z.union([
          z.array(z.number().int()).min(1),
          z.literal("all"),
        ]).describe("Season numbers to request, or 'all'"),
        is4k: z.boolean().default(false).describe("Request 4K version"),
      },
      async ({ tmdbId, seasons, is4k }) => {
        const request = await svc.requestTv(tmdbId, seasons, is4k);
        return {
          content: [{
            type: "text",
            text: `TV series requested (request ID: ${request.id}, status: ${statusName(request.status, REQUEST_STATUS)}).`,
          }],
        };
      }
    );
  }

  if (reg(AnnotWrite)) {
    server.tool(
      "jellyseerr_approve_request",
      "Approve a pending media request.",
      { id: z.number().int().describe("Request ID") },
      async ({ id }) => {
        const request = await svc.approveRequest(id);
        return {
          content: [{ type: "text", text: `Request ${id} approved.` }],
        };
      }
    );
  }

  if (reg(AnnotWrite)) {
    server.tool(
      "jellyseerr_decline_request",
      "Decline a pending media request.",
      { id: z.number().int().describe("Request ID") },
      async ({ id }) => {
        await svc.declineRequest(id);
        return {
          content: [{ type: "text", text: `Request ${id} declined.` }],
        };
      }
    );
  }

  if (reg(AnnotDestructive)) {
    server.tool(
      "jellyseerr_delete_request",
      "Delete a media request. Requires confirm=true.",
      {
        id: z.number().int().describe("Request ID"),
        confirm: z.boolean().describe("Must be true to confirm deletion"),
      },
      async ({ id, confirm }) => {
        if (!confirm) {
          return {
            content: [{ type: "text", text: `Confirm deletion of request ${id}? Call again with confirm=true.` }],
          };
        }
        await svc.deleteRequest(id);
        return {
          content: [{ type: "text", text: `Request ${id} deleted.` }],
        };
      }
    );
  }

  if (reg(AnnotWriteCreate)) {
    server.tool(
      "jellyseerr_create_issue",
      "Report an issue with a media item (e.g., wrong audio, bad quality, missing subtitles).",
      {
        mediaId: z.number().int().describe("Jellyseerr media ID (from mediaInfo.id in get_media results)"),
        mediaType: z.enum(["movie", "tv"]).describe("Media type"),
        issueType: z.number().int().min(1).max(4).describe("Issue type: 1=video, 2=audio, 3=subtitle, 4=other"),
        message: z.string().min(1).describe("Description of the issue"),
        problemSeason: z.number().int().optional().describe("Season number (TV only)"),
        problemEpisode: z.number().int().optional().describe("Episode number (TV only)"),
      },
      async ({ mediaId, mediaType, issueType, message, problemSeason, problemEpisode }) => {
        const issue = await svc.createIssue(mediaId, mediaType, issueType, message, problemSeason, problemEpisode);
        return {
          content: [{ type: "text", text: `Issue #${issue.id} created.` }],
        };
      }
    );
  }
}
