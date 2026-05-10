import { PostgresDropTableCompiler } from "@/drivers/postgres/dialect/compilers/ddl/PostgresDropTableCompiler";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";
import { createDdlCtx } from "./helpers";

const compiler = new PostgresDropTableCompiler();

describe("PostgresDropTableCompiler", () => {
  it("plain DROP TABLE", () => {
    const { ctx } = createDdlCtx();
    expect(
      compiler.compile(
        {
          type: DdlQueryType.DROP_TABLE,
          table: { name: "users" },
          ifExists: false,
          cascade: false,
        },
        ctx,
      ),
    ).toBe('DROP TABLE "users"');
  });

  it("IF EXISTS + CASCADE", () => {
    const { ctx } = createDdlCtx();
    expect(
      compiler.compile(
        {
          type: DdlQueryType.DROP_TABLE,
          table: { name: "users" },
          ifExists: true,
          cascade: true,
        },
        ctx,
      ),
    ).toBe('DROP TABLE IF EXISTS "users" CASCADE');
  });
});
