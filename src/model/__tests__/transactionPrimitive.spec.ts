import { PostgresDialect } from "@/drivers/postgres/dialect/PostgresDialect";
import type { PostgresConnection, PostgresQueryResponse } from "@/drivers/postgres/connection/PostgresConnection";
import { PostgresTransactionalDriver } from "@/drivers/postgres/PostgresTransactionalDriver";

class RecordingConnection implements PostgresConnection {
  public calls: { sql: string; params: readonly unknown[] }[] = [];
  public failOn: string | null = null;

  connect(): Promise<void> { return Promise.resolve(); }
  disconnect(): Promise<void> { return Promise.resolve(); }
  isConnected(): boolean { return true; }

  query(sql: string, params: readonly unknown[]): Promise<PostgresQueryResponse> {
    this.calls.push({ sql, params });
    if (this.failOn !== null && sql === this.failOn) {
      return Promise.reject(new Error(`forced failure on: ${sql}`));
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  }

  withPinnedClient<R>(fn: (pinned: PostgresConnection) => Promise<R>): Promise<R> {
    return fn(this);
  }
}

describe("PostgresTransactionalDriver — savepoint nesting", () => {
  function makeTxDriver(): { conn: RecordingConnection; driver: PostgresTransactionalDriver } {
    const conn = new RecordingConnection();
    const driver = new PostgresTransactionalDriver(new PostgresDialect(), conn, 0);
    return { conn, driver };
  }

  it("nested withTransaction emits SAVEPOINT/RELEASE on success", async () => {
    const { conn, driver } = makeTxDriver();
    await driver.withTransaction(() => Promise.resolve("ok"));

    expect(conn.calls.map((c) => c.sql)).toEqual([
      "SAVEPOINT sp_1",
      "RELEASE SAVEPOINT sp_1",
    ]);
  });

  it("nested withTransaction emits ROLLBACK TO + RELEASE on throw, and rethrows", async () => {
    const { conn, driver } = makeTxDriver();

    await expect(
      driver.withTransaction(() => { throw new Error("boom"); }),
    ).rejects.toThrow("boom");

    expect(conn.calls.map((c) => c.sql)).toEqual([
      "SAVEPOINT sp_1",
      "ROLLBACK TO SAVEPOINT sp_1",
      "RELEASE SAVEPOINT sp_1",
    ]);
  });

  it("nesting twice emits sp_1 then sp_2", async () => {
    const { conn, driver } = makeTxDriver();
    await driver.withTransaction(async (inner) => {
      await inner.withTransaction(() => Promise.resolve());
    });

    expect(conn.calls.map((c) => c.sql)).toEqual([
      "SAVEPOINT sp_1",
      "SAVEPOINT sp_2",
      "RELEASE SAVEPOINT sp_2",
      "RELEASE SAVEPOINT sp_1",
    ]);
  });

  it("inner rollback does not abort the outer savepoint", async () => {
    const { conn, driver } = makeTxDriver();
    await driver.withTransaction(async (inner) => {
      await expect(
        inner.withTransaction(() => { throw new Error("inner-fail"); }),
      ).rejects.toThrow("inner-fail");
    });

    expect(conn.calls.map((c) => c.sql)).toEqual([
      "SAVEPOINT sp_1",
      "SAVEPOINT sp_2",
      "ROLLBACK TO SAVEPOINT sp_2",
      "RELEASE SAVEPOINT sp_2",
      "RELEASE SAVEPOINT sp_1",
    ]);
  });
});
