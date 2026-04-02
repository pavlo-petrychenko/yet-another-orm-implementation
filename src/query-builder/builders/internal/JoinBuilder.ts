import pino from "pino";
import {JoinClause} from "@/query-builder/types/clause/JoinClause/JoinClause";
import {JoinType} from "@/query-builder/types/clause/JoinClause/typedefs";
import {ClauseType} from "@/query-builder/types/clause/Clause";
import {WhereBuilder} from "@/query-builder/builders/WhereBuilder";

export class JoinBuilder {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: {colorize: true},
    },
  });

  private joins: JoinClause[] = [];

  join(table: string, on: (builder: WhereBuilder) => WhereBuilder): this {
    return this.addJoin(JoinType.INNER, table, on);
  }

  leftJoin(table: string, on: (builder: WhereBuilder) => WhereBuilder): this {
    return this.addJoin(JoinType.LEFT, table, on);
  }

  rightJoin(table: string, on: (builder: WhereBuilder) => WhereBuilder): this {
    return this.addJoin(JoinType.RIGHT, table, on);
  }

  fullJoin(table: string, on: (builder: WhereBuilder) => WhereBuilder): this {
    return this.addJoin(JoinType.FULL, table, on);
  }

  crossJoin(table: string): this {
    if (!table || typeof table !== "string") {
      this.logger.error({table}, "Invalid table name");
      throw new Error("Table name must be a non-empty string");
    }
    const [name, alias] = table.trim().split(/\s+[Aa][Ss]\s+/);
    this.joins.push({type: ClauseType.Join, joinType: JoinType.CROSS, table: name, alias});
    return this;
  }

  private addJoin(type: JoinType, table: string, on: (builder: WhereBuilder) => WhereBuilder): this {
    try {
      if (!table || typeof table !== "string") {
        this.logger.error({table}, "Invalid table name");
        throw new Error("Table name must be a non-empty string");
      }

      if (typeof on !== "function") {
        this.logger.error({on}, "Invalid ON clause callback");
        throw new Error("ON clause must be a function that returns a WhereBuilder");
      }

      const [name, alias] = table.trim().split(/\s+[Aa][Ss]\s+/);

      const builder = on(new WhereBuilder());
      const onCondition = builder.build();

      if (!onCondition || onCondition.conditions.length === 0) {
        this.logger.warn({table: name, type}, "JOIN clause has no ON conditions");
        throw new Error("JOIN must have at least one ON condition");
      }

      this.logger.debug({type, table: name, alias, on: onCondition}, "Adding JOIN clause");

      this.joins.push({
        type: ClauseType.Join,
        joinType: type,
        table: name,
        alias,
        on: onCondition,
      });
      return this;
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error({type, table, error: err.message, stack: err.stack}, "Failed to add JOIN clause");
        throw new Error("Unable to add JOIN clause: " + err.message, {cause: err});
      }
      throw new Error("Unknown error occurred while adding JOIN clause", {cause: err});
    }
  }

  build(): JoinClause[] {
    this.logger.debug({joins: this.joins}, "Built JOIN clause");
    return this.joins;
  }
}
