import { describe, it, expect } from "vitest";
import { paginate, type PaginationParams, type PaginatedResult } from "../pagination.js";

describe("paginate", () => {
  it("returns first page with correct metadata", () => {
    // paginate wraps server-side paginated results with metadata
    // items are already the correct page from the API
    const items = Array.from({ length: 10 }, (_, i) => i);
    const result = paginate(items, { page: 1, pageSize: 10 }, 50);

    expect(result.items).toHaveLength(10);
    expect(result.items[0]).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.totalItems).toBe(50);
    expect(result.totalPages).toBe(5);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  it("returns last page correctly", () => {
    const items = Array.from({ length: 5 }, (_, i) => i + 40);
    const result = paginate(items, { page: 5, pageSize: 10 }, 50);

    expect(result.items).toHaveLength(5);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
    expect(result.totalPages).toBe(5);
  });

  it("clamps page to valid range", () => {
    const result = paginate([], { page: 0, pageSize: 10 }, 50);
    expect(result.page).toBe(1);
  });

  it("defaults pageSize to 20", () => {
    const result = paginate([], {}, 50);
    expect(result.pageSize).toBe(20);
  });

  it("caps pageSize at 100", () => {
    const result = paginate([], { pageSize: 500 }, 50);
    expect(result.pageSize).toBe(100);
  });

  it("handles empty results", () => {
    const result = paginate([], { page: 1, pageSize: 10 }, 0);
    expect(result.items).toHaveLength(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });
});
