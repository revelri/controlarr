import { ArrClient, paginate, type PaginatedResult, type PaginationParams } from "@controlarr/core";

export interface RadarrMovie {
  id: number;
  title: string;
  originalTitle: string;
  tmdbId: number;
  imdbId?: string;
  year: number;
  monitored: boolean;
  hasFile: boolean;
  sizeOnDisk: number;
  status: string;
  overview?: string;
  runtime: number;
  qualityProfileId: number;
  path: string;
  rootFolderPath?: string;
  added: string;
  ratings?: { imdb?: { value: number }; tmdb?: { value: number } };
  genres?: string[];
  certification?: string;
}

export interface RadarrMovieLookup {
  title: string;
  originalTitle: string;
  tmdbId: number;
  imdbId?: string;
  year: number;
  overview?: string;
  runtime: number;
  ratings?: { imdb?: { value: number }; tmdb?: { value: number } };
  genres?: string[];
  certification?: string;
  images?: { coverType: string; remoteUrl: string }[];
}

export interface RadarrQueueItem {
  id: number;
  movieId: number;
  title: string;
  status: string;
  sizeleft: number;
  size: number;
  timeleft?: string;
  estimatedCompletionTime?: string;
  downloadClient?: string;
  indexer?: string;
  quality: { quality: { name: string } };
}

export interface RadarrHistoryItem {
  id: number;
  movieId: number;
  sourceTitle: string;
  date: string;
  eventType: string;
  quality: { quality: { name: string } };
}

export interface QualityProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
}

export interface RootFolder {
  id: number;
  path: string;
  freeSpace: number;
  unmappedFolders?: { name: string; path: string }[];
}

export interface Tag {
  id: number;
  label: string;
}

export interface SystemStatus {
  appName: string;
  version: string;
  buildTime: string;
  isDebug: boolean;
  isProduction: boolean;
  isAdmin: boolean;
  isLinux: boolean;
  startupPath: string;
  appData: string;
}

export interface LibraryFilters extends PaginationParams {
  monitored?: boolean;
  status?: string;
  qualityProfileId?: number;
}

export interface AddMovieParams {
  tmdbId: number;
  qualityProfileId: number;
  rootFolderPath: string;
  monitored?: boolean;
  searchForMovie?: boolean;
  minimumAvailability?: string;
  tags?: number[];
}

export interface EditMovieParams {
  monitored?: boolean;
  qualityProfileId?: number;
  minimumAvailability?: string;
  tags?: number[];
}

export class RadarrService {
  constructor(private readonly client: ArrClient) {}

  async systemStatus(): Promise<SystemStatus> {
    return this.client.get<SystemStatus>("/api/v3/system/status");
  }

  async library(filters: LibraryFilters = {}): Promise<PaginatedResult<RadarrMovie>> {
    const all = await this.client.get<RadarrMovie[]>("/api/v3/movie");
    let filtered = all;

    if (filters.monitored !== undefined) {
      filtered = filtered.filter((m) => m.monitored === filters.monitored);
    }
    if (filters.status) {
      filtered = filtered.filter((m) => m.status === filters.status);
    }
    if (filters.qualityProfileId) {
      filtered = filtered.filter((m) => m.qualityProfileId === filters.qualityProfileId);
    }

    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const page = Math.max(filters.page ?? 1, 1);
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return paginate(paged, { page, pageSize }, filtered.length);
  }

  async getMovie(id: number): Promise<RadarrMovie> {
    return this.client.get<RadarrMovie>(`/api/v3/movie/${id}`);
  }

  async search(term: string): Promise<RadarrMovieLookup[]> {
    return this.client.get<RadarrMovieLookup[]>("/api/v3/movie/lookup", {
      term,
    });
  }

  async calendar(start: string, end: string): Promise<RadarrMovie[]> {
    return this.client.get<RadarrMovie[]>("/api/v3/calendar", { start, end });
  }

  async queue(params: PaginationParams = {}): Promise<PaginatedResult<RadarrQueueItem>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);

    const result = await this.client.get<{
      page: number;
      pageSize: number;
      totalRecords: number;
      records: RadarrQueueItem[];
    }>("/api/v3/queue", {
      page: String(page),
      pageSize: String(pageSize),
      includeMovie: "true",
    });

    return paginate(result.records, { page, pageSize }, result.totalRecords);
  }

  async history(params: PaginationParams = {}): Promise<PaginatedResult<RadarrHistoryItem>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);

    const result = await this.client.get<{
      page: number;
      pageSize: number;
      totalRecords: number;
      records: RadarrHistoryItem[];
    }>("/api/v3/history", {
      page: String(page),
      pageSize: String(pageSize),
    });

    return paginate(result.records, { page, pageSize }, result.totalRecords);
  }

  async qualityProfiles(): Promise<QualityProfile[]> {
    return this.client.get<QualityProfile[]>("/api/v3/qualityprofile");
  }

  async rootFolders(): Promise<RootFolder[]> {
    return this.client.get<RootFolder[]>("/api/v3/rootfolder");
  }

  async tags(): Promise<Tag[]> {
    return this.client.get<Tag[]>("/api/v3/tag");
  }

  async exclusions(): Promise<{ id: number; tmdbId: number; movieTitle: string; movieYear: number }[]> {
    return this.client.get("/api/v3/importlistexclusion");
  }

  async addMovie(params: AddMovieParams): Promise<RadarrMovie> {
    // First lookup the movie to get required metadata
    const results = await this.client.get<RadarrMovieLookup[]>("/api/v3/movie/lookup/tmdb", {
      tmdbId: String(params.tmdbId),
    });

    if (results.length === 0) {
      throw new Error(`No movie found with TMDB ID ${params.tmdbId}`);
    }

    const movie = results[0];
    return this.client.post<RadarrMovie>("/api/v3/movie", {
      ...movie,
      qualityProfileId: params.qualityProfileId,
      rootFolderPath: params.rootFolderPath,
      monitored: params.monitored ?? true,
      minimumAvailability: params.minimumAvailability ?? "released",
      tags: params.tags ?? [],
      addOptions: {
        searchForMovie: params.searchForMovie ?? true,
      },
    });
  }

  async editMovie(id: number, params: EditMovieParams): Promise<RadarrMovie> {
    const movie = await this.getMovie(id);
    const updated = {
      ...movie,
      ...Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined)
      ),
    };
    return this.client.put<RadarrMovie>(`/api/v3/movie/${id}`, updated);
  }

  async deleteMovie(id: number, deleteFiles: boolean = false): Promise<void> {
    await this.client.delete(`/api/v3/movie/${id}?deleteFiles=${deleteFiles}`);
  }

  async searchMissing(): Promise<{ id: number; name: string }> {
    return this.client.post("/api/v3/command", {
      name: "MissingMoviesSearch",
    });
  }

  async searchMovie(movieIds: number[]): Promise<{ id: number; name: string }> {
    return this.client.post("/api/v3/command", {
      name: "MoviesSearch",
      movieIds,
    });
  }

  async rename(movieIds: number[]): Promise<{ id: number; name: string }> {
    return this.client.post("/api/v3/command", {
      name: "RenameMovie",
      movieIds,
    });
  }

  async addExclusion(tmdbId: number, title: string, year: number): Promise<unknown> {
    return this.client.post("/api/v3/importlistexclusion", {
      tmdbId,
      movieTitle: title,
      movieYear: year,
    });
  }

  async manualImport(
    downloadId: string,
    path: string
  ): Promise<unknown[]> {
    return this.client.get("/api/v3/manualimport", {
      downloadId,
      folder: path,
    });
  }
}
