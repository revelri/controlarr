export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function paginate<T>(
  items: T[],
  params: PaginationParams,
  totalItems: number
): PaginatedResult<T> {
  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;
  const page = Math.max(params.page ?? 1, 1);

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function paginationQueryParams(params: PaginationParams): {
  page: string;
  pageSize: string;
} {
  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page ?? 1, 1);
  return {
    page: String(page),
    pageSize: String(pageSize),
  };
}
