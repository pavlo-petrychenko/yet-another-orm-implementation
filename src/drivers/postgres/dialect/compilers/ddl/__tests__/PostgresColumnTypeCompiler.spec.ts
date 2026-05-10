import { PostgresColumnTypeCompiler } from "@/drivers/postgres/dialect/compilers/ddl/PostgresColumnTypeCompiler";

describe("PostgresColumnTypeCompiler", () => {
  const c = new PostgresColumnTypeCompiler();

  it.each([
    [{ kind: "varchar" as const }, "VARCHAR"],
    [{ kind: "varchar" as const, length: 50 }, "VARCHAR(50)"],
    [{ kind: "text" as const }, "TEXT"],
    [{ kind: "integer" as const }, "INTEGER"],
    [{ kind: "bigint" as const }, "BIGINT"],
    [{ kind: "smallint" as const }, "SMALLINT"],
    [{ kind: "boolean" as const }, "BOOLEAN"],
    [{ kind: "decimal" as const }, "DECIMAL"],
    [{ kind: "decimal" as const, precision: 10 }, "DECIMAL(10)"],
    [{ kind: "decimal" as const, precision: 10, scale: 2 }, "DECIMAL(10,2)"],
    [{ kind: "timestamp" as const }, "TIMESTAMP"],
    [{ kind: "timestamp" as const, withTimezone: true }, "TIMESTAMPTZ"],
    [{ kind: "date" as const }, "DATE"],
    [{ kind: "time" as const }, "TIME"],
    [{ kind: "json" as const }, "JSON"],
    [{ kind: "jsonb" as const }, "JSONB"],
    [{ kind: "uuid" as const }, "UUID"],
    [{ kind: "serial" as const }, "SERIAL"],
    [{ kind: "bigserial" as const }, "BIGSERIAL"],
    [{ kind: "raw" as const, sql: "INET" }, "INET"],
  ])("%j -> %s", (input, expected) => {
    expect(c.compile(input)).toBe(expected);
  });
});
