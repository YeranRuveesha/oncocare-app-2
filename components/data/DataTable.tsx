import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import TableSearch from "./TableSearch";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty } from "@/components/shell/PageHeader";
import { PAGE_SIZES, parseTableState, runTableQuery, type Cell } from "@/lib/tableQuery";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (r: T) => React.ReactNode;
  /** Give this to make the column sortable. */
  sortValue?: (r: T) => Cell;
  /** Give this to include the column in the search box. */
  searchText?: (r: T) => string;
  className?: string;
}

export interface FilterDef<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  match: (r: T, value: string) => boolean;
}

type SP = Record<string, string | string[] | undefined>;

/**
 * One table used everywhere. It always starts with a "No." column that keeps counting across
 * pages (page 2 with 10 per page starts at 11). Search, filters, sorting and paging live in the
 * URL, so reloading or sharing the link keeps them. Rows are fetched by the page (with the
 * database's row-level security) and searched/sorted/paged here on the server.
 */
export default function DataTable<T>({
  rows, columns, searchParams, basePath, rowKey, filters = [], prefix = "", defaultSort, defaultDir, searchPlaceholder = "Search", empty = "Nothing to show yet.", rowHref, rowClass, extraParams = {},
}: {
  rows: T[];
  columns: Column<T>[];
  searchParams: SP;
  basePath: string;
  rowKey: (r: T) => string;
  filters?: FilterDef<T>[];
  /** Use when a page has two tables, so their URL parameters do not clash. */
  prefix?: string;
  defaultSort?: string;
  defaultDir?: "asc" | "desc";
  searchPlaceholder?: string;
  empty?: string;
  rowHref?: (r: T) => string;
  /** Extra classes for a row (for example to highlight urgent ones). */
  rowClass?: (r: T) => string;
  /** Other URL parameters of the page to keep (for example the active tab). */
  extraParams?: Record<string, string>;
}) {
  const st = parseTableState(searchParams, prefix, filters.map((f) => f.key), { sort: defaultSort, dir: defaultDir });
  const filterFns = Object.fromEntries(filters.map((f) => [f.key, f.match]));
  const res = runTableQuery(rows, columns, st, filterFns);

  const href = (over: Record<string, string | number | null>) => {
    const p = new URLSearchParams(extraParams);
    const cur: Record<string, string | number | null> = { q: st.q || null, sort: st.sort, dir: st.sort ? st.dir : null, size: st.size === 10 ? null : st.size, ...st.filters };
    for (const [k, v] of Object.entries({ ...cur, ...over })) if (v !== null && v !== "" && v !== undefined) p.set(prefix + k, String(v));
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const filtered = Boolean(st.q || Object.keys(st.filters).length);
  const from = res.total ? res.start + 1 : 0;
  const to = res.start + res.rows.length;

  return (
    <div>
      {(columns.some((c) => c.searchText) || filters.length > 0) && (
        <form action={basePath} method="get" role="search" className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border bg-white p-3">
          {Object.entries(extraParams).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          {columns.some((c) => c.searchText) && (
            <div className="min-w-48 flex-1">
              <TableSearch name={prefix + "q"} defaultValue={st.q} placeholder={searchPlaceholder} />
            </div>
          )}
          {filters.map((f) => (
            <NativeSelect key={f.key} name={prefix + f.key} defaultValue={st.filters[f.key] ?? ""} aria-label={f.label} className="w-auto min-w-36">
              <option value="">{f.label}: all</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </NativeSelect>
          ))}
          {columns.some((c) => c.sortValue) && (
            <>
              <NativeSelect name={prefix + "sort"} defaultValue={st.sort ?? ""} aria-label="Sort by" className="w-auto min-w-32">
                <option value="">Sort by…</option>
                {columns.filter((c) => c.sortValue).map((c) => <option key={c.key} value={c.key}>{c.header}</option>)}
              </NativeSelect>
              <NativeSelect name={prefix + "dir"} defaultValue={st.dir} aria-label="Sort direction" className="w-auto">
                <option value="asc">A to Z / low to high</option>
                <option value="desc">Z to A / high to low</option>
              </NativeSelect>
            </>
          )}
          {st.size !== 10 && <input type="hidden" name={prefix + "size"} value={st.size} />}
          <Button type="submit" variant="outline"><Search /> Apply</Button>
          {filtered && <Button asChild variant="ghost"><Link href={href({ q: null, ...Object.fromEntries(filters.map((f) => [f.key, null])), page: null })}>Clear</Link></Button>}
        </form>
      )}

      {res.total === 0 ? (
        <Empty>{filtered ? "No results match your search or filters." : empty}</Empty>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm">
          <ul className="divide-y md:hidden" aria-label="List">
            {res.rows.map((r, i) => (
              <li key={rowKey(r)} className={cn("space-y-1.5 p-3", rowClass?.(r))}>
                <p className="text-xs font-semibold text-muted-foreground">No. {res.start + i + 1}</p>
                {columns.map((c, ci) => (
                  <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                    <span className="shrink-0 text-xs text-muted-foreground">{c.header}</span>
                    <span className="min-w-0 text-right">{rowHref && ci === 0 ? <Link href={rowHref(r)} className="font-medium text-primary hover:underline">{c.cell(r)}</Link> : c.cell(r)}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">No.</TableHead>
                {columns.map((c) => {
                  const active = st.sort === c.key;
                  const nextDir = active && st.dir === "asc" ? "desc" : "asc";
                  return (
                    <TableHead key={c.key} className={c.className} aria-sort={active ? (st.dir === "asc" ? "ascending" : "descending") : undefined}>
                      {c.sortValue ? (
                        <Link href={href({ sort: c.key, dir: nextDir, page: null })} className="inline-flex items-center gap-1 hover:text-ink">
                          {c.header}
                          {active ? (st.dir === "asc" ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />) : <ArrowUpDown className="size-3 opacity-40" aria-hidden="true" />}
                        </Link>
                      ) : c.header}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {res.rows.map((r, i) => (
                <TableRow key={rowKey(r)} className={rowClass?.(r)}>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">{res.start + i + 1}</TableCell>
                  {columns.map((c, ci) => (
                    <TableCell key={c.key} className={c.className}>
                      {rowHref && ci === 0 ? <Link href={rowHref(r)} className="font-medium text-primary hover:underline">{c.cell(r)}</Link> : c.cell(r)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
            <span>Showing {from}–{to} of {res.total}</span>
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              {PAGE_SIZES.map((n) => (
                <Link key={n} href={href({ size: n === 10 ? null : n, page: null })} className={cn("rounded px-1.5 py-0.5", n === st.size ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{n}</Link>
              ))}
            </div>
            <nav className="flex items-center gap-1" aria-label="Pages">
              {res.page > 1 ? <Link href={href({ page: res.page - 1 })} className="grid size-7 place-items-center rounded hover:bg-muted" aria-label="Previous page"><ChevronLeft className="size-4" /></Link> : <span className="grid size-7 place-items-center opacity-30"><ChevronLeft className="size-4" /></span>}
              <span>Page {res.page} of {res.pages}</span>
              {res.page < res.pages ? <Link href={href({ page: res.page + 1 })} className="grid size-7 place-items-center rounded hover:bg-muted" aria-label="Next page"><ChevronRight className="size-4" /></Link> : <span className="grid size-7 place-items-center opacity-30"><ChevronRight className="size-4" /></span>}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
