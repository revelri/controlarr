import { ArrClient } from "@controlarr/core";

export interface JellyseerrStatus {
  version: string;
  commitTag: string;
  updateAvailable: boolean;
  restartRequired: boolean;
}

export interface JellyseerrSearchResult {
  id: number;
  mediaType: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  originalTitle?: string;
  originalName?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage?: number;
  genreIds?: number[];
  mediaInfo?: {
    id: number;
    status: number;
    status4k: number;
    downloadStatus?: unknown[];
  };
}

export interface PagedResponse<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export interface JellyseerrRequest {
  id: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  type: "movie" | "tv";
  is4k: boolean;
  requestedBy: {
    id: number;
    displayName: string;
    email?: string;
  };
  media: {
    id: number;
    mediaType: string;
    tmdbId: number;
    tvdbId?: number;
    status: number;
    status4k: number;
  };
  seasons?: { id: number; seasonNumber: number; status: number }[];
}

export interface RequestPagedResponse {
  pageInfo: {
    pages: number;
    pageSize: number;
    results: number;
    page: number;
  };
  results: JellyseerrRequest[];
}

export interface JellyseerrUser {
  id: number;
  email?: string;
  displayName: string;
  avatar?: string;
  requestCount: number;
  createdAt: string;
  permissions: number;
}

export interface JellyseerrIssue {
  id: number;
  issueType: number;
  status: number;
  problemSeason: number;
  problemEpisode: number;
  createdAt: string;
  updatedAt: string;
  media: {
    id: number;
    mediaType: string;
    tmdbId: number;
    status: number;
  };
  createdBy: {
    id: number;
    displayName: string;
  };
}

export interface JellyseerrMovieDetails {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  releaseDate: string;
  runtime: number;
  voteAverage: number;
  genres: { id: number; name: string }[];
  posterPath?: string;
  backdropPath?: string;
  mediaInfo?: {
    id: number;
    status: number;
    status4k: number;
    requests?: JellyseerrRequest[];
  };
}

export interface JellyseerrTvDetails {
  id: number;
  name: string;
  originalName: string;
  overview: string;
  firstAirDate: string;
  episodeRunTime: number[];
  voteAverage: number;
  genres: { id: number; name: string }[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
  seasons: { id: number; seasonNumber: number; episodeCount: number; airDate?: string }[];
  posterPath?: string;
  mediaInfo?: {
    id: number;
    status: number;
    status4k: number;
    requests?: JellyseerrRequest[];
  };
}

export class JellyseerrService {
  constructor(private readonly client: ArrClient) {}

  async systemStatus(): Promise<JellyseerrStatus> {
    return this.client.get<JellyseerrStatus>("/api/v1/status");
  }

  async search(query: string, page: number = 1): Promise<PagedResponse<JellyseerrSearchResult>> {
    return this.client.get<PagedResponse<JellyseerrSearchResult>>("/api/v1/search", {
      query,
      page: String(page),
      language: "en",
    });
  }

  async trending(page: number = 1): Promise<PagedResponse<JellyseerrSearchResult>> {
    return this.client.get<PagedResponse<JellyseerrSearchResult>>("/api/v1/discover/trending", {
      page: String(page),
      language: "en",
    });
  }

  async popular(type: "movie" | "tv", page: number = 1): Promise<PagedResponse<JellyseerrSearchResult>> {
    const path = type === "movie" ? "/api/v1/discover/movies" : "/api/v1/discover/tv";
    return this.client.get<PagedResponse<JellyseerrSearchResult>>(path, {
      page: String(page),
      language: "en",
    });
  }

  async upcoming(type: "movie" | "tv" = "movie", page: number = 1): Promise<PagedResponse<JellyseerrSearchResult>> {
    const path = type === "movie" ? "/api/v1/discover/movies/upcoming" : "/api/v1/discover/tv/upcoming";
    return this.client.get<PagedResponse<JellyseerrSearchResult>>(path, {
      page: String(page),
      language: "en",
    });
  }

  async getMedia(type: "movie" | "tv", tmdbId: number): Promise<JellyseerrMovieDetails | JellyseerrTvDetails> {
    return this.client.get(`/api/v1/${type}/${tmdbId}`, { language: "en" });
  }

  async requests(
    take: number = 20,
    skip: number = 0,
    filter?: "all" | "approved" | "available" | "pending" | "processing" | "unavailable" | "failed",
    sort?: "added" | "modified"
  ): Promise<RequestPagedResponse> {
    const params: Record<string, string> = {
      take: String(take),
      skip: String(skip),
    };
    if (filter) params.filter = filter;
    if (sort) params.sort = sort;
    return this.client.get<RequestPagedResponse>("/api/v1/request", params);
  }

  async getRequest(id: number): Promise<JellyseerrRequest> {
    return this.client.get<JellyseerrRequest>(`/api/v1/request/${id}`);
  }

  async requestMovie(tmdbId: number, is4k: boolean = false): Promise<JellyseerrRequest> {
    return this.client.post<JellyseerrRequest>("/api/v1/request", {
      mediaType: "movie",
      mediaId: tmdbId,
      is4k,
    });
  }

  async requestTv(
    tmdbId: number,
    seasons: number[] | "all",
    is4k: boolean = false
  ): Promise<JellyseerrRequest> {
    return this.client.post<JellyseerrRequest>("/api/v1/request", {
      mediaType: "tv",
      mediaId: tmdbId,
      is4k,
      seasons: seasons === "all" ? "all" : seasons,
    });
  }

  async approveRequest(id: number): Promise<JellyseerrRequest> {
    return this.client.post<JellyseerrRequest>(`/api/v1/request/${id}/approve`);
  }

  async declineRequest(id: number): Promise<JellyseerrRequest> {
    return this.client.post<JellyseerrRequest>(`/api/v1/request/${id}/decline`);
  }

  async deleteRequest(id: number): Promise<void> {
    await this.client.delete(`/api/v1/request/${id}`);
  }

  async users(take: number = 20, skip: number = 0): Promise<{ pageInfo: { pages: number; results: number }; results: JellyseerrUser[] }> {
    return this.client.get("/api/v1/user", {
      take: String(take),
      skip: String(skip),
    });
  }

  async issues(take: number = 20, skip: number = 0): Promise<{ pageInfo: { pages: number; results: number }; results: JellyseerrIssue[] }> {
    return this.client.get("/api/v1/issue", {
      take: String(take),
      skip: String(skip),
    });
  }

  async createIssue(
    mediaId: number,
    mediaType: "movie" | "tv",
    issueType: number,
    message: string,
    problemSeason?: number,
    problemEpisode?: number
  ): Promise<JellyseerrIssue> {
    return this.client.post<JellyseerrIssue>("/api/v1/issue", {
      mediaId,
      mediaType,
      issueType,
      message,
      problemSeason: problemSeason ?? 0,
      problemEpisode: problemEpisode ?? 0,
    });
  }
}
