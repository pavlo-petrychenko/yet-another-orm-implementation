import type { Dialect } from "@/drivers/common/Dialect";
import type { Driver } from "@/drivers/common/Driver";
import type { QueryResult } from "@/drivers/types/QueryResult";
import type { Query } from "@/query-builder";
import type { CreateTableQuery } from "@/schema-builder/types/CreateTableQuery";
import type { DdlQuery } from "@/schema-builder/types/DdlQuery";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";

import { ensureTrackingTable } from "@/migrations/trackingTable";

class CapturingDriver implements Driver {
  public ddlCalls: DdlQuery[] = [];

  public connect(): Promise<void> { return Promise.resolve(); }
  public disconnect(): Promise<void> { return Promise.resolve(); }
  public isConnected(): boolean { return true; }
  public getDialect(): Dialect { throw new Error("not used"); }
  public query<TRow = Record<string, unknown>>(_q: Query): Promise<QueryResult<TRow>> {
    return Promise.resolve({ rows: [] as TRow[], rowCount: 0 });
  }
  public ddl(query: DdlQuery): Promise<QueryResult> {
    this.ddlCalls.push(query);
    return Promise.resolve({ rows: [], rowCount: 0 });
  }
  public raw<TRow = Record<string, unknown>>(): Promise<QueryResult<TRow>> {
    return Promise.resolve({ rows: [] as TRow[], rowCount: 0 });
  }
  public withTransaction<R>(fn: (tx: Driver) => Promise<R>): Promise<R> {
    return fn(this);
  }
}

describe("ensureTrackingTable", () => {
  it("issues a CREATE TABLE IF NOT EXISTS with the expected columns", async () => {
    const driver = new CapturingDriver();
    await ensureTrackingTable(driver, "yaoi_migrations");

    expect(driver.ddlCalls).toHaveLength(1);
    const q = driver.ddlCalls[0] as CreateTableQuery;
    expect(q.type).toBe(DdlQueryType.CREATE_TABLE);
    expect(q.table.name).toBe("yaoi_migrations");
    expect(q.ifNotExists).toBe(true);

    const colsByName = new Map(q.columns.map((c) => [c.name, c]));
    expect(colsByName.get("id")?.columnType).toEqual({ kind: "serial" });
    expect(colsByName.get("id")?.primary).toBe(true);

    const nameCol = colsByName.get("name");
    expect(nameCol?.columnType).toEqual({ kind: "text" });
    expect(nameCol?.notNull).toBe(true);
    expect(nameCol?.unique).toBe(true);

    const checksumCol = colsByName.get("checksum");
    expect(checksumCol?.columnType).toEqual({ kind: "text" });
    expect(checksumCol?.notNull).toBe(true);

    const appliedAt = colsByName.get("applied_at");
    expect(appliedAt?.columnType).toEqual({ kind: "timestamp", withTimezone: true });
    expect(appliedAt?.notNull).toBe(true);
    expect(appliedAt?.default).toEqual({ kind: "raw", sql: "NOW()" });
  });

  it("respects a custom table name", async () => {
    const driver = new CapturingDriver();
    await ensureTrackingTable(driver, "custom_migrations");
    expect(driver.ddlCalls[0].table.name).toBe("custom_migrations");
  });
});
