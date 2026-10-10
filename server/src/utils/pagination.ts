export interface PaginationInput {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const MAX_LIMIT = 50;

function toPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** Parses untrusted `page`/`limit` query values into safe, bounded integers. */
export function parsePagination(query: { page?: unknown; limit?: unknown }): PaginationInput {
  const page = toPositiveInt(query.page, 1);
  const limit = Math.min(MAX_LIMIT, toPositiveInt(query.limit, 10));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta({ page, limit }: PaginationInput, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

/** Normalises the optional `search` query parameter (trimmed, capped length) or returns undefined. */
export function parseSearch(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, 100);
  return trimmed === '' ? undefined : trimmed;
}
