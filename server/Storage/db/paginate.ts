import type { PaginationParams, PaginatedResponse } from "../../../shared/schema";

/** Shared pagination helper for database entity query files */
export function paginate<T>(items: T[], pagination?: PaginationParams): PaginatedResponse<T> {
  if (!pagination) {
    return {
      data: items,
      pagination: {
        page: 1,
        limit: items.length || 1,
        total: items.length,
        totalPages: 1,
        hasMore: false,
      },
    };
  }

  const page = pagination.page || 1;
  const limit = pagination.limit || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedItems = items.slice(startIndex, endIndex);
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    data: paginatedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore,
    },
  };
}
