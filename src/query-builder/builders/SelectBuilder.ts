import pino from "pino";
import {ClauseMixin} from "@/query-builder/builders/internal/ClauseMixin";
import {ColumnDescription} from "@/query-builder/types/common/Column";
import {SelectQuery} from "@/query-builder/types/query/SelectQuery/SelectQuery";
import {QueryType} from "@/query-builder/types/QueryType";
import {RawExpression} from "@/query-builder/types/common/RawExpression";
import {raw as rawExpr} from "@/query-builder/helpers/raw";

export class SelectBuilder extends ClauseMixin {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: {colorize: true},
    },
  });

  private tableName: string = "";
  private columns: ColumnDescription[] = [];
  private isDistinct: boolean = false;
  private tableAlias: string = "";
  private rawColumns: RawExpression[] = [];
  private unions: {query: SelectQuery; all: boolean}[] = [];

  selectRaw(expr: string | RawExpression): this {
    if (typeof expr === "string") {
      this.rawColumns.push(rawExpr(expr));
    } else {
      this.rawColumns.push(expr);
    }
    return this;
  }

  distinct(): this {
    this.isDistinct = true;
    return this;
  }

  from(table: string): this {
    if (!table || typeof table !== "string") {
      this.logger.error({table}, "SelectBuilder: Invalid table name");
      throw new Error("Table name must be a non-empty string");
    }
    const [name, alias] = table.trim().split(/\s+[Aa][Ss]\s+/);
    this.tableName = name;
    this.tableAlias = alias || "";
    this.logger.debug({table: name, alias}, "SelectBuilder: Set table name");
    return this;
  }

  select(...columns: string[]): this {
    if (columns.length > 0) {
      const starIdx = this.columns.findIndex((value) => value.name === "*");
      if (starIdx !== -1) {
        this.columns.splice(starIdx, 1);
      }
      columns.map((c) => {
        const [name, alias] = c.trim().split(/\s+[Aa][Ss]\s+/);
        this.columns.push({name, alias, table: this.tableName});
      });
      this.logger.debug({columns: this.columns}, "SelectBuilder: Column list");
    } else {
      this.columns = [{name: "*"}];
    }
    return this;
  }

  union(query: SelectQuery, all: boolean = false): this {
    this.unions.push({query, all});
    return this;
  }

  unionAll(query: SelectQuery): this {
    return this.union(query, true);
  }

  build(): SelectQuery {
    this.logger.debug(
      {
        type: "SELECT",
        table: this.tableName,
        columns: this.columns,
        ...this.buildCommonClauses(),
      },
      "Built SELECT query",
    );

    return {
      type: QueryType.SELECT,
      table: this.tableName,
      columns: this.columns,
      distinct: this.isDistinct || undefined,
      tableAlias: this.tableAlias || undefined,
      rawColumns: this.rawColumns.length > 0 ? this.rawColumns : undefined,
      unions: this.unions.length > 0 ? this.unions : undefined,
      ...this.buildCommonClauses(),
    };
  }
}
