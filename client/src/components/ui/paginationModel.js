export const DEFAULT_PAGE_SIZE = 10;

export function paginationModel({ page = 1, total = 0, pageSize = DEFAULT_PAGE_SIZE, pages } = {}) {
  const count = Math.max(0, Math.floor(Number(total) || 0));
  const size = Math.max(1, Math.floor(Number(pageSize) || DEFAULT_PAGE_SIZE));
  const last = Math.max(1, Math.floor(Number(pages) || Math.ceil(count / size)));
  const current = Math.max(1, Math.min(last, Math.floor(Number(page) || 1)));
  return { page: current, pages: last, total: count, pageSize: size, from: count ? Math.min(count, (current - 1) * size + 1) : 0, to: Math.min(count, current * size) };
}
