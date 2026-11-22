// Pure helpers for <DataTable />: search, filter, sort and page an array of rows.
// Rows are fetched by the page (with RLS) and then paged here in memory.
export type Dir = "asc" | "desc";
export type Cell = string | number | boolean | Date | null | undefined;

export interface TableState {
  q: string;
  sort: string | null;
  dir: Dir;
  page: number;
  size: number;
  filters: Record<string, string>;
}

export const PAGE_SIZES = [10, 25, 50] as const;

export function parseTableState(sp: Record<string, string | string[] | undefined>, prefix: string, filterKeys: string[], defaults: { sort?: string; dir?: Dir; size?: number } = {}): TableState {
  const get = (k: string) => {
    const v = sp[prefix + k];
    return Array.isArray(v) ? v[0] : v;
  };
  const size = Number(get("size"));
  const page = Number(get("page"));
  const filters: Record<string, string> = {};
  for (const f of filterKeys) {
    const v = get(f);
    if (v) filters[f] = v.slice(0, 80);
  }
  return {
    q: (get("q") ?? "").trim().slice(0, 80),
    sort: get("sort") ?? defaults.sort ?? null,
    dir: (get("dir") as Dir) === "asc" ? "asc" : (get("dir") as Dir) === "desc" ? "desc" : defaults.dir ?? "asc",
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : defaults.size ?? 10,
    filters,
  };
}

const norm = (v: Cell) => (v instanceof Date ? v.getTime() : v == null ? "" : typeof v === "string" ? v.toLowerCase() : v);

export function compareCells(a: Cell, b: Cell): number {
  const x = norm(a), y = norm(b);
  if (x === y) return 0;
  if (x === "") return 1; // empty values always last
  if (y === "") return -1;
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x).localeCompare(String(y), undefined, { numeric: true });
}

export interface QueryColumn<T> {
  key: string;
  sortValue?: (r: T) => Cell;
  searchText?: (r: T) => string;
}

export function runTableQuery<T>(rows: T[], cols: QueryColumn<T>[], st: TableState, filterFns: Record<string, (r: T, value: string) => boolean> = {}) {
  let out = rows;
  for (const [k, v] of Object.entries(st.filters)) if (filterFns[k]) out = out.filter((r) => filterFns[k](r, v));
  if (st.q) {
    const needle = st.q.toLowerCase();
    out = out.filter((r) => cols.some((c) => c.searchText && c.searchText(r).toLowerCase().includes(needle)));
  }
  const sc = cols.find((c) => c.key === st.sort && c.sortValue);
  if (sc?.sortValue) {
    const f = sc.sortValue;
    const sign = st.dir === "desc" ? -1 : 1;
    out = [...out].sort((a, b) => {
      const ax = norm(f(a)), bx = norm(f(b));
      if (ax === "" || bx === "") return compareCells(f(a), f(b)); // empties last regardless of direction
      return sign * compareCells(f(a), f(b));
    });
  }
  const total = out.length;
  const pages = Math.max(1, Math.ceil(total / st.size));
  const page = Math.min(st.page, pages);
  const start = (page - 1) * st.size;
  return { rows: out.slice(start, start + st.size), total, pages, page, start };
}
