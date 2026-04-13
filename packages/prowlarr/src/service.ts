import { ArrClient, paginate, type PaginatedResult, type PaginationParams } from "@controlarr/core";

export interface ProwlarrIndexer {
  id: number;
  name: string;
  protocol: string;
  enable: boolean;
  priority: number;
  appProfileId: number;
  fields?: { name: string; value: unknown }[];
  tags?: number[];
  added?: string;
}

export interface ProwlarrSearchResult {
  guid: string;
  indexerId: number;
  indexer: string;
  title: string;
  size: number;
  publishDate: string;
  categories?: { id: number; name: string }[];
  seeders?: number;
  leechers?: number;
  downloadUrl?: string;
  infoUrl?: string;
  protocol: string;
}

export interface ProwlarrStats {
  indexers: {
    indexerId: number;
    indexerName: string;
    averageResponseTime: number;
    numberOfQueries: number;
    numberOfGrabs: number;
    numberOfFailedQueries: number;
    numberOfFailedGrabs: number;
  }[];
}

export interface ProwlarrApp {
  id: number;
  name: string;
  syncLevel: string;
  implementation: string;
  fields?: { name: string; value: unknown }[];
  tags?: number[];
}

export interface ProwlarrHistoryItem {
  id: number;
  indexerId: number;
  date: string;
  eventType: string;
  successful: boolean;
  data?: Record<string, string>;
}

export interface SystemStatus {
  appName: string;
  version: string;
}

export class ProwlarrService {
  constructor(private readonly client: ArrClient) {}

  async systemStatus(): Promise<SystemStatus> {
    return this.client.get<SystemStatus>("/api/v1/system/status");
  }

  async indexers(): Promise<ProwlarrIndexer[]> {
    return this.client.get<ProwlarrIndexer[]>("/api/v1/indexer");
  }

  async getIndexer(id: number): Promise<ProwlarrIndexer> {
    return this.client.get<ProwlarrIndexer>(`/api/v1/indexer/${id}`);
  }

  async search(query: string, indexerIds?: number[], limit: number = 100): Promise<ProwlarrSearchResult[]> {
    const params: Record<string, string> = {
      query,
      limit: String(limit),
      type: "search",
    };
    if (indexerIds?.length) {
      params.indexerIds = indexerIds.join(",");
    }
    return this.client.get<ProwlarrSearchResult[]>("/api/v1/search", params);
  }

  async stats(): Promise<ProwlarrStats> {
    return this.client.get<ProwlarrStats>("/api/v1/indexerstats");
  }

  async apps(): Promise<ProwlarrApp[]> {
    return this.client.get<ProwlarrApp[]>("/api/v1/applications");
  }

  async testIndexer(id: number): Promise<unknown> {
    return this.client.post("/api/v1/indexer/test", { id });
  }

  async testAllIndexers(): Promise<unknown> {
    return this.client.post("/api/v1/indexer/testall");
  }

  async addIndexer(indexer: Partial<ProwlarrIndexer>): Promise<ProwlarrIndexer> {
    return this.client.post<ProwlarrIndexer>("/api/v1/indexer", indexer);
  }

  async editIndexer(id: number, updates: Partial<ProwlarrIndexer>): Promise<ProwlarrIndexer> {
    const current = await this.getIndexer(id);
    return this.client.put<ProwlarrIndexer>(`/api/v1/indexer/${id}`, {
      ...current,
      ...updates,
    });
  }

  async deleteIndexer(id: number): Promise<void> {
    await this.client.delete(`/api/v1/indexer/${id}`);
  }

  async history(params: PaginationParams = {}): Promise<PaginatedResult<ProwlarrHistoryItem>> {
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);

    const result = await this.client.get<{
      page: number;
      pageSize: number;
      totalRecords: number;
      records: ProwlarrHistoryItem[];
    }>("/api/v1/history", {
      page: String(page),
      pageSize: String(pageSize),
    });

    return paginate(result.records, { page, pageSize }, result.totalRecords);
  }
}
