export type PaginationQuery = {
  page?: number | string;
  limit?: number | string;
};

export function parsePagination(q: PaginationQuery) {
  const page = Math.max(1, Number(q.page || 1));
  const limit = Math.min(100, Math.max(1, Number(q.limit || 20)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function meta(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages };
}





