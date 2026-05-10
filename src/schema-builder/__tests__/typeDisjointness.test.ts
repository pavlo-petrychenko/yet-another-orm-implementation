import type { Driver } from "@/drivers/common/Driver";
import type { Query } from "@/query-builder";
import { QueryType } from "@/query-builder";
import type { CreateTableQuery } from "@/schema-builder/types/CreateTableQuery";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";

// Compile-time only: validates that the DML and DDL pipelines are disjoint.
// Each `@ts-expect-error` will fail tsc if the error disappears.

declare const driver: Driver;
declare const select: Query;
declare const create: CreateTableQuery;

function _compileTimeChecks(): void {
  // @ts-expect-error driver.query rejects DDL queries
  void driver.query(create);
  // @ts-expect-error driver.ddl rejects DML queries
  void driver.ddl(select);

  // sanity: each method accepts its own union
  void driver.query(select);
  void driver.ddl(create);
}

void _compileTimeChecks;
void QueryType;
void DdlQueryType;

describe("DDL ↔ DML type disjointness", () => {
  it("validates at compile time", () => {
    expect(true).toBe(true);
  });
});
