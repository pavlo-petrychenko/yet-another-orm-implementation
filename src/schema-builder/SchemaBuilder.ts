import type { Driver } from "@/drivers/common/Driver";
import { AlterTableBuilder } from "@/schema-builder/builders/AlterTableBuilder";
import { TableBuilder } from "@/schema-builder/builders/TableBuilder";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";

export class SchemaBuilder {
  constructor(private readonly driver: Driver) {}

  async createTable(name: string, build: (t: TableBuilder) => void): Promise<void> {
    const tb = new TableBuilder(name);
    build(tb);
    await this.driver.ddl(tb.build());
  }

  async alterTable(name: string, build: (t: AlterTableBuilder) => void): Promise<void> {
    const ab = new AlterTableBuilder(name);
    build(ab);
    const query = ab.build();
    if (query.operations.length === 0) return;
    await this.driver.ddl(query);
  }

  async dropTable(
    name: string,
    opts?: { ifExists?: boolean; cascade?: boolean },
  ): Promise<void> {
    await this.driver.ddl({
      type: DdlQueryType.DROP_TABLE,
      table: { name },
      ifExists: opts?.ifExists ?? false,
      cascade: opts?.cascade ?? false,
    });
  }

  async renameTable(from: string, to: string): Promise<void> {
    await this.driver.ddl({
      type: DdlQueryType.RENAME_TABLE,
      table: { name: from },
      to,
    });
  }

  async hasTable(name: string): Promise<boolean> {
    const result = await this.driver.raw(
      "SELECT 1 FROM information_schema.tables "
        + "WHERE table_name = $1 AND table_schema = current_schema() LIMIT 1",
      [name],
    );
    return result.rowCount > 0;
  }

  async raw(sql: string, params?: readonly unknown[]): Promise<void> {
    await this.driver.raw(sql, params);
  }
}
