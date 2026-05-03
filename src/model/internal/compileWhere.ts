import type { ConditionBuilder } from "@/query-builder/builders/internal/ConditionBuilder";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";
import type { ComparisonOperator } from "@/query-builder/types/common/ComparisonOperator";
import { LogicalOperator } from "@/query-builder/types/common/LogicalOperator";
import type { ScalarParam } from "@/query-builder/types/common/ScalarParam";
import type { EntityMetadata } from "@/metadata/types";
import { ModelError } from "@/model/errors/ModelError";
import type { Where } from "@/model/types/Where";

const OPERATOR_MAP: Partial<Record<string, ComparisonOperator>> = {
  $eq: "=",
  $ne: "<>",
  $gt: ">",
  $lt: "<",
  $gte: ">=",
  $lte: "<=",
  $in: "IN",
  $nin: "NOT IN",
  $like: "LIKE",
  $ilike: "ILIKE",
};

const LOGICAL_KEYS = new Set(["$and", "$or", "$not"]);

type SlotConnector = LogicalOperator | "first";

function resolveColumn(metadata: EntityMetadata, propertyName: string): ColumnDescription {
  const column = metadata.columnsByPropertyName.get(propertyName);
  if (!column) {
    throw new ModelError(
      "UNKNOWN_PROPERTY",
      `Property "${propertyName}" is not a registered column on ${metadata.className}`,
    );
  }
  return { name: column.columnName, table: metadata.tableName };
}

function isOperatorMap(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || value instanceof Date) {
    return false;
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith("$")) return true;
  }
  return false;
}

function applyComparison(
  builder: ConditionBuilder,
  column: ColumnDescription,
  operator: ComparisonOperator,
  right: ScalarParam | ScalarParam[],
  slot: SlotConnector,
): void {
  if (slot === "first") {
    builder.where(column, operator, right);
  } else if (slot === LogicalOperator.OR) {
    builder.orWhere(column, operator, right);
  } else {
    builder.andWhere(column, operator, right);
  }
}

function applyNullCheck(
  builder: ConditionBuilder,
  column: ColumnDescription,
  isNull: boolean,
  slot: SlotConnector,
): void {
  if (slot === LogicalOperator.OR) {
    if (isNull) builder.orWhereNull(column);
    else builder.orWhereNotNull(column);
    return;
  }
  if (isNull) builder.whereNull(column);
  else builder.whereNotNull(column);
}

function applyFieldCondition(
  builder: ConditionBuilder,
  column: ColumnDescription,
  value: unknown,
  initialSlot: SlotConnector,
): SlotConnector {
  let slot = initialSlot;
  const followUp = initialSlot === LogicalOperator.OR ? LogicalOperator.OR : LogicalOperator.AND;

  if (value === null) {
    applyNullCheck(builder, column, true, slot);
    return followUp;
  }

  if (!isOperatorMap(value)) {
    applyComparison(builder, column, "=", value as ScalarParam, slot);
    return followUp;
  }

  for (const opKey of Object.keys(value)) {
    const opValue = value[opKey];

    if (opKey === "$isNull") {
      applyNullCheck(builder, column, opValue === true, slot);
      slot = followUp;
      continue;
    }

    const operator = OPERATOR_MAP[opKey];
    if (!operator) {
      throw new ModelError(
        "UNKNOWN_PROPERTY",
        `Unknown where operator "${opKey}" on column "${column.name}"`,
      );
    }

    applyComparison(builder, column, operator, opValue as ScalarParam | ScalarParam[], slot);
    slot = followUp;
  }

  return slot;
}

function compileInto<T>(
  where: Where<T>,
  metadata: EntityMetadata,
  builder: ConditionBuilder,
  parentConnector: SlotConnector,
): void {
  const followUp = parentConnector === LogicalOperator.OR ? LogicalOperator.OR : LogicalOperator.AND;
  let slot: SlotConnector = parentConnector;

  for (const propertyName of Object.keys(where)) {
    if (LOGICAL_KEYS.has(propertyName)) continue;

    const value = (where as Record<string, unknown>)[propertyName];
    if (value === undefined) continue;

    const column = resolveColumn(metadata, propertyName);
    slot = applyFieldCondition(builder, column, value, slot);
    slot = followUp;
  }

  const andClauses = (where as { $and?: ReadonlyArray<Where<T>> }).$and;
  if (andClauses) {
    for (const sub of andClauses) {
      const groupConnector = slot === "first" ? LogicalOperator.AND : slot;
      builder.group(groupConnector, (b) => {
        compileInto(sub, metadata, b, "first");
      });
      slot = followUp;
    }
  }

  const orClauses = (where as { $or?: ReadonlyArray<Where<T>> }).$or;
  if (orClauses && orClauses.length > 0) {
    const groupConnector = slot === "first" ? LogicalOperator.AND : slot;
    builder.group(groupConnector, (groupBuilder) => {
      let innerSlot: SlotConnector = "first";
      for (const sub of orClauses) {
        const innerGroupConnector = innerSlot === "first" ? LogicalOperator.AND : LogicalOperator.OR;
        groupBuilder.group(innerGroupConnector, (b) => {
          compileInto(sub, metadata, b, "first");
        });
        innerSlot = LogicalOperator.OR;
      }
    });
    slot = followUp;
  }

  const notClause = (where as { $not?: Where<T> }).$not;
  if (notClause) {
    const groupConnector = slot === "first" ? LogicalOperator.AND_NOT : LogicalOperator.AND_NOT;
    builder.group(groupConnector, (b) => {
      compileInto(notClause, metadata, b, "first");
    });
  }
}

export function compileWhere<T>(
  where: Where<T>,
  metadata: EntityMetadata,
  builder: ConditionBuilder,
): void {
  compileInto(where, metadata, builder, "first");
}
