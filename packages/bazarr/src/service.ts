import { ArrClient, paginate, type PaginatedResult, type PaginationParams } from "@controlarr/core";

export interface BazarrStatus {
  bazarr_version: string;
  sonarr_version: string;
  radarr_version: string;
  operating_system: string;
  python_version: string;
  start_time: number;
}

export interface BazarrSeries {
  title: string;
  sonarrSeriesId: number;
  tvdbId?: number;
  monitored: boolean;
  episodeFileCount: number;
  episodeMissingCount: number;
  seriesType: string;
  overview?: string;
  profileId?: number;
}

export interface BazarrMovie {
  title: string;
  radarrId: number;
  tmdbId?: number;
  monitored: boolean;
  missing_subtitles?: { name: string; code2: string; code3: string }[];
  subtitles?: { name: string; code2: string; code3: string; path: string }[];
  overview?: string;
  profileId?: number;
}

export interface BazarrEpisode {
  title: string;
  sonarrSeriesId: number;
  sonarrEpisodeId: number;
  season: number;
  episode: number;
  monitored: boolean;
  missing_subtitles?: { name: string; code2: string; code3: string }[];
  subtitles?: { name: string; code2: string; code3: string; path: string }[];
}

export interface BazarrHistoryItem {
  action: number;
  description: string;
  language: { name: string; code2: string; code3: string };
  provider: string;
  score: string;
  subs_id: string;
  timestamp: string;
  upgradable: boolean;
}

export interface BazarrProvider {
  name: string;
  status: string;
  retry: string;
}

export interface BazarrLanguage {
  name: string;
  code2: string;
  code3: string;
  enabled: boolean;
}

// Bazarr paginates with offset/length query params
interface BazarrPagedResponse<T> {
  data: T[];
  total: number;
}

export class BazarrService {
  constructor(private readonly client: ArrClient) {}

  async systemStatus(): Promise<BazarrStatus> {
    const result = await this.client.get<{ data: BazarrStatus }>("/api/system/status");
    return result.data;
  }

  async series(params: PaginationParams = {}): Promise<PaginatedResult<BazarrSeries>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);
    const offset = (page - 1) * pageSize;

    const result = await this.client.get<BazarrPagedResponse<BazarrSeries>>("/api/series", {
      start: String(offset),
      length: String(pageSize),
    });

    return paginate(result.data, { page, pageSize }, result.total);
  }

  async movies(params: PaginationParams = {}): Promise<PaginatedResult<BazarrMovie>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);
    const offset = (page - 1) * pageSize;

    const result = await this.client.get<BazarrPagedResponse<BazarrMovie>>("/api/movies", {
      start: String(offset),
      length: String(pageSize),
    });

    return paginate(result.data, { page, pageSize }, result.total);
  }

  async episodes(sonarrSeriesId: number): Promise<BazarrEpisode[]> {
    const result = await this.client.get<{ data: BazarrEpisode[] }>("/api/episodes", {
      "seriesid[]": String(sonarrSeriesId),
    });
    return result.data;
  }

  async wantedSeries(params: PaginationParams = {}): Promise<PaginatedResult<BazarrEpisode>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);
    const offset = (page - 1) * pageSize;

    const result = await this.client.get<BazarrPagedResponse<BazarrEpisode>>("/api/episodes/wanted", {
      start: String(offset),
      length: String(pageSize),
    });

    return paginate(result.data, { page, pageSize }, result.total);
  }

  async wantedMovies(params: PaginationParams = {}): Promise<PaginatedResult<BazarrMovie>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);
    const offset = (page - 1) * pageSize;

    const result = await this.client.get<BazarrPagedResponse<BazarrMovie>>("/api/movies/wanted", {
      start: String(offset),
      length: String(pageSize),
    });

    return paginate(result.data, { page, pageSize }, result.total);
  }

  async searchSubtitles(
    type: "episode" | "movie",
    id: number,
    language: string
  ): Promise<unknown[]> {
    if (type === "episode") {
      return this.client.get("/api/providers/episodes", {
        episodeid: String(id),
        language: language,
      });
    }
    return this.client.get("/api/providers/movies", {
      radarrid: String(id),
      language: language,
    });
  }

  async downloadSubtitle(
    type: "episode" | "movie",
    id: number,
    language: string,
    provider: string,
    subtitle: string
  ): Promise<void> {
    const endpoint = type === "episode" ? "/api/providers/episodes" : "/api/providers/movies";
    const idKey = type === "episode" ? "episodeid" : "radarrid";
    await this.client.post(endpoint, {
      [idKey]: id,
      language,
      provider,
      subtitle,
    });
  }

  async deleteSubtitle(
    type: "episode" | "movie",
    id: number,
    language: string,
    path: string
  ): Promise<void> {
    const endpoint = type === "episode"
      ? `/api/episodes/subtitles?episodeid=${id}&language=${language}&path=${encodeURIComponent(path)}`
      : `/api/movies/subtitles?radarrid=${id}&language=${language}&path=${encodeURIComponent(path)}`;
    await this.client.delete(endpoint);
  }

  async historySeries(params: PaginationParams = {}): Promise<PaginatedResult<BazarrHistoryItem>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);
    const offset = (page - 1) * pageSize;

    const result = await this.client.get<BazarrPagedResponse<BazarrHistoryItem>>("/api/episodes/history", {
      start: String(offset),
      length: String(pageSize),
    });

    return paginate(result.data, { page, pageSize }, result.total);
  }

  async historyMovies(params: PaginationParams = {}): Promise<PaginatedResult<BazarrHistoryItem>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);
    const offset = (page - 1) * pageSize;

    const result = await this.client.get<BazarrPagedResponse<BazarrHistoryItem>>("/api/movies/history", {
      start: String(offset),
      length: String(pageSize),
    });

    return paginate(result.data, { page, pageSize }, result.total);
  }

  async providers(): Promise<BazarrProvider[]> {
    const result = await this.client.get<{ data: BazarrProvider[] }>("/api/providers");
    return result.data;
  }

  async languages(): Promise<BazarrLanguage[]> {
    return this.client.get<BazarrLanguage[]>("/api/system/languages");
  }

  async blacklist(): Promise<unknown[]> {
    const result = await this.client.get<{ data: unknown[] }>("/api/system/backups");
    return result.data;
  }
}
