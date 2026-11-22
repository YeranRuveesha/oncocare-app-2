import { describe, expect, it } from "vitest";
import { parseTableState, runTableQuery } from "@/lib/tableQuery";

const rows = Array.from({ length: 25 }, (_, i) => ({ n: `Item ${i + 1}`, v: i % 5 === 0 ? null : i }));
const cols = [
  { key: "n", sortValue: (r: (typeof rows)[0]) => r.n, searchText: (r: (typeof rows)[0]) => r.n },
  { key: "v", sortValue: (r: (typeof rows)[0]) => r.v },
];
const st = (sp: Record<string, string>) => parseTableState(sp, "", []);

describe("tableQuery", () => {
  it("pages and keeps counting", () => {
    const p2 = runTableQuery(rows, cols, st({ page: "2" }));
    expect(p2.start).toBe(10);
    expect(p2.rows).toHaveLength(10);
    expect(runTableQuery(rows, cols, st({ page: "9" })).page).toBe(3);
  });
  it("searches", () => expect(runTableQuery(rows, cols, st({ q: "item 2" })).total).toBe(7));
  it("sorts with empty values last in both directions", () => {
    expect(runTableQuery(rows, cols, st({ sort: "v", dir: "asc", size: "50" })).rows.at(-1)?.v).toBeNull();
    expect(runTableQuery(rows, cols, st({ sort: "v", dir: "desc", size: "50" })).rows.at(-1)?.v).toBeNull();
    expect(runTableQuery(rows, cols, st({ sort: "v", dir: "desc" })).rows[0].v).toBe(24);
  });
  it("ignores bad parameters", () => expect(st({ size: "999", page: "-3", sort: "x" }).size).toBe(10));
});
