import { ClauseMixin } from "@/query-builder/builder/common/ClauseMixin";
import { SelectQuery } from "@/query-builder/queries/Select";
import { ColumnDescription } from "@/query-builder/queries/common/ColumnDecription";
import pino from "pino";

export class SelectQueryBuilder extends ClauseMixin {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  private tableName: string = "";
  private columns: ColumnDescription[] = [];

  from(table: string): this {
    // Validate table name
    if (!table || typeof table !== "string") {
      this.logger.error({ table }, "SelectQueryBuilder: Invalid table name");
      throw new Error("Table name must be a non-empty string");
    }
    this.tableName = table;
    this.logger.debug({ table }, "SelectQueryBuilder: Set table name");
    return this;
  }

  select(...columns: string[]): this {
    if (columns.length > 0) {
      this.columns.splice(
        this.columns.findIndex((value) => value.name === "*"),
        1
      );
      columns.map((c) => {
        const [name, alias] = c.trim().split(" AS ");
        this.columns.push({ name, alias, table: this.tableName });
      });
      this.logger.debug(
        { columns: this.columns },
        "SelectQueryBuilder: Column list"
      );
    } else {
      this.columns = [{ name: "*" }];
    }
    return this;
  }

  build(): SelectQuery {
    this.logger.debug(
      {
        type: "SELECT",
        table: this.tableName,
        columns: this.columns,
        ...this.buildCommonClauses(),
      },
      "Built SELECT query"
    );

    return {
      type: "SELECT",
      table: this.tableName,
      columns: this.columns,
      ...this.buildCommonClauses(),
    };
  }
}
