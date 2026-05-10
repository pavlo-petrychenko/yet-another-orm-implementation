import { PostgresRenameTableCompiler } from "@/drivers/postgres/dialect/compilers/ddl/PostgresRenameTableCompiler";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";
import { createDdlCtx } from "./helpers";

const compiler = new PostgresRenameTableCompiler();

describe("PostgresRenameTableCompiler", () => {
  it("emits ALTER TABLE ... RENAME TO ...", () => {
    const { ctx } = createDdlCtx();
    expect(
      compiler.compile(
        {
          type: DdlQueryType.RENAME_TABLE,
          table: { name: "old_name" },
          to: "new_name",
        },
        ctx,
      ),
    ).toBe('ALTER TABLE "old_name" RENAME TO "new_name"');
  });
});
