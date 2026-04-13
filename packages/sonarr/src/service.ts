import { ArrClient, paginate, type PaginatedResult, type PaginationParams } from "@controlarr/core";

export interface SonarrSeries {
  id: number;
  title: string;
  sortTitle: string;
  tvdbId: number;
  imdbId?: string;
  year: number;
  monitored: boolean;
  status: string;
  ended: boolean;
  overview?: string;
  seasonCount: number;
  episodeCount: number;
  episodeFileCount: number;
  sizeOnDisk: number;
  qualityProfileId: number;
  path: string;
  rootFolderPath?: string;
  added: string;
  genres?: string[];
  certification?: string;
  network?: string;
  runtime: number;
  seriesType: string;
  seasons?: { seasonNumber: number; monitored: boolean; statistics?: { episodeCount: number; episodeFileCount: number } }[];
}

export interface SonarrSeriesLookup {
  title: string;
  tvdbId: number;
  imdbId?: string;
  year: number;
  overview?: string;
  runtime: number;
  genres?: string[];
  certification?: string;
  network?: string;
  seriesType: string;
  seasons?: { seasonNumber: number; monitored: boolean }[];
  images?: { coverType: string; remoteUrl: string }[];
}

export interface SonarrEpisode {
  id: number;
  seriesId: number;
  tvdbId: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview?: string;
  airDate?: string;
  airDateUtc?: string;
  hasFile: boolean;
  monitored: boolean;
}

export interface SonarrQueueItem {
  id: number;
  seriesId: number;
  episodeId: number;
  title: string;
  status: string;
  sizeleft: number;
  size: number;
  timeleft?: string;
  estimatedCompletionTime?: string;
  downloadClient?: string;
  quality: { quality: { name: string } };
}

export interface SonarrHistoryItem {
  id: number;
  seriesId: number;
  episodeId: number;
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
}

export interface Tag {
  id: number;
  label: string;
}

export interface SystemStatus {
  appName: string;
  version: string;
  buildTime: string;
}

export interface LibraryFilters extends PaginationParams {
  monitored?: boolean;
  status?: string;
}

export interface AddSeriesParams {
  tvdbId: number;
  qualityProfileId: number;
  rootFolderPath: string;
  monitored?: boolean;
  searchForMissingEpisodes?: boolean;
  seriesType?: string;
  seasonFolder?: boolean;
  tags?: number[];
}

export interface EditSeriesParams {
  monitored?: boolean;
  qualityProfileId?: number;
  seriesType?: string;
  tags?: number[];
}

export class SonarrService {
  constructor(private readonly client: ArrClient) {}

  async systemStatus(): Promise<SystemStatus> {
    return this.client.get<SystemStatus>("/api/v3/system/status");
  }

  async library(filters: LibraryFilters = {}): Promise<PaginatedResult<SonarrSeries>> {
    const all = await this.client.get<SonarrSeries[]>("/api/v3/series");
    let filtered = all;

    if (filters.monitored !== undefined) {
      filtered = filtered.filter((s) => s.monitored === filters.monitored);
    }
    if (filters.status) {
      filtered = filtered.filter((s) => s.status === filters.status);
    }

    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const page = Math.max(filters.page ?? 1, 1);
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return paginate(paged, { page, pageSize }, filtered.length);
  }

  async getSeries(id: number): Promise<SonarrSeries> {
    return this.client.get<SonarrSeries>(`/api/v3/series/${id}`);
  }

  async episodes(seriesId: number): Promise<SonarrEpisode[]> {
    return this.client.get<SonarrEpisode[]>("/api/v3/episode", {
      seriesId: String(seriesId),
    });
  }

  async getEpisode(id: number): Promise<SonarrEpisode> {
    return this.client.get<SonarrEpisode>(`/api/v3/episode/${id}`);
  }

  async search(term: string): Promise<SonarrSeriesLookup[]> {
    return this.client.get<SonarrSeriesLookup[]>("/api/v3/series/lookup", {
      term,
    });
  }

  async calendar(start: string, end: string): Promise<SonarrEpisode[]> {
    return this.client.get<SonarrEpisode[]>("/api/v3/calendar", { start, end });
  }

  async queue(params: PaginationParams = {}): Promise<PaginatedResult<SonarrQueueItem>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);

    const result = await this.client.get<{
      page: number;
      pageSize: number;
      totalRecords: number;
      records: SonarrQueueItem[];
    }>("/api/v3/queue", {
      page: String(page),
      pageSize: String(pageSize),
      includeSeries: "true",
      includeEpisode: "true",
    });

    return paginate(result.records, { page, pageSize }, result.totalRecords);
  }

  async history(params: PaginationParams = {}): Promise<PaginatedResult<SonarrHistoryItem>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);

    const result = await this.client.get<{
      page: number;
      pageSize: number;
      totalRecords: number;
      records: SonarrHistoryItem[];
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

  async addSeries(params: AddSeriesParams): Promise<SonarrSeries> {
    const results = await this.client.get<SonarrSeriesLookup[]>("/api/v3/series/lookup", {
      term: `tvdb:${params.tvdbId}`,
    });

    if (results.length === 0) {
      throw new Error(`No series found with TVDB ID ${params.tvdbId}`);
    }

    const series = results[0];
    return this.client.post<SonarrSeries>("/api/v3/series", {
      ...series,
      qualityProfileId: params.qualityProfileId,
      rootFolderPath: params.rootFolderPath,
      monitored: params.monitored ?? true,
      seriesType: params.seriesType ?? series.seriesType ?? "standard",
      seasonFolder: params.seasonFolder ?? true,
      tags: params.tags ?? [],
      addOptions: {
        searchForMissingEpisodes: params.searchForMissingEpisodes ?? true,
      },
    });
  }

  async editSeries(id: number, params: EditSeriesParams): Promise<SonarrSeries> {
    const series = await this.getSeries(id);
    const updated = {
      ...series,
      ...Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined)
      ),
    };
    return this.client.put<SonarrSeries>(`/api/v3/series/${id}`, updated);
  }

  async deleteSeries(id: number, deleteFiles: boolean = false): Promise<void> {
    await this.client.delete(`/api/v3/series/${id}?deleteFiles=${deleteFiles}`);
  }

  async searchMissing(): Promise<{ id: number; name: string }> {
    return this.client.post("/api/v3/command", {
      name: "MissingEpisodeSearch",
    });
  }

  async episodeSearch(episodeIds: number[]): Promise<{ id: number; name: string }> {
    return this.client.post("/api/v3/command", {
      name: "EpisodeSearch",
      episodeIds,
    });
  }

  async seasonMonitor(seriesId: number, seasonNumber: number, monitored: boolean): Promise<SonarrSeries> {
    const series = await this.getSeries(seriesId);
    const seasons = (series.seasons ?? []).map((s) =>
      s.seasonNumber === seasonNumber ? { ...s, monitored } : s
    );
    return this.client.put<SonarrSeries>(`/api/v3/series/${seriesId}`, {
      ...series,
      seasons,
    });
  }

  async rename(seriesId: number): Promise<{ id: number; name: string }> {
    return this.client.post("/api/v3/command", {
      name: "RenameSeries",
      seriesIds: [seriesId],
    });
  }
}
