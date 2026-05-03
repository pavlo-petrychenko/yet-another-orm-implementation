import type { DataSource } from "@/model/DataSource";
import { ModelError } from "@/model/errors/ModelError";
import type { EntityMetadata, RelationMetadata } from "@/metadata/types";

// One node in the cascade plan: an entity instance that needs to be persisted, plus the
// FK-backfills that must be applied to it from its predecessors right before its INSERT/UPDATE
// is built.
export interface CascadeNode {
  entity: object;
  metadata: EntityMetadata;
  // After source has been persisted, copy source[sourceProperty] into entity[targetProperty].
  // Used for: M2O on entity → source's PK; O2M from source → entity's FK; owning-O2O.
  fkBackfills: Array<{
    targetProperty: string;
    sourceEntity: object;
    sourceProperty: string;
  }>;
}

// A many-to-many link row. Both endpoints must be persisted before the join row can be written.
export interface M2MLinkPlan {
  joinTable: string;
  joinColumn: string;
  inverseJoinColumn: string;
  ownerEntity: object;
  ownerMetadata: EntityMetadata;
  inverseEntity: object;
  inverseMetadata: EntityMetadata;
}

interface InternalNode {
  entity: object;
  metadata: EntityMetadata;
  // ids of nodes that must be persisted *before* this one
  predecessors: Set<number>;
  // ids of nodes that must be persisted *after* this one
  successors: Set<number>;
  fkBackfills: CascadeNode["fkBackfills"];
}

export interface CascadePlan {
  order: CascadeNode[];
  m2mLinks: M2MLinkPlan[];
}

export function buildCascadePlan(
  root: object,
  rootMetadata: EntityMetadata,
  ds: DataSource,
): CascadePlan {
  const nodes: InternalNode[] = [];
  const idByEntity = new Map<object, number>();
  const m2mLinks: M2MLinkPlan[] = [];

  const ensureNode = (entity: object, metadata: EntityMetadata): number => {
    const existing = idByEntity.get(entity);
    if (existing !== undefined) return existing;
    const id = nodes.length;
    nodes.push({
      entity,
      metadata,
      predecessors: new Set<number>(),
      successors: new Set<number>(),
      fkBackfills: [],
    });
    idByEntity.set(entity, id);
    return id;
  };

  const visit = (entity: object, metadata: EntityMetadata): number => {
    const cached = idByEntity.get(entity);
    if (cached !== undefined) return cached;

    const id = ensureNode(entity, metadata);
    const record = entity as Record<string, unknown>;

    for (const relation of metadata.relations) {
      if (!relation.cascade) continue;
      const value = record[relation.propertyName];
      if (value === undefined || value === null) continue;

      const childTarget = relation.resolveTarget();
      const childMetadata = ds.getMetadata(childTarget);

      switch (relation.kind) {
        case "many-to-one":
        case "one-to-one":
          visitSingleRelation(id, entity, metadata, relation, value, childMetadata);
          break;
        case "one-to-many":
          visitOneToMany(id, entity, metadata, relation, value, childMetadata);
          break;
        case "many-to-many":
          visitManyToMany(id, entity, metadata, relation, value, childMetadata);
          break;
      }
    }

    return id;
  };

  const visitSingleRelation = (
    parentId: number,
    parent: object,
    parentMetadata: EntityMetadata,
    relation: RelationMetadata,
    value: unknown,
    childMetadata: EntityMetadata,
  ): void => {
    if (typeof value !== "object" || value === null) {
      throw new ModelError(
        "CASCADE_INVALID_CHILD",
        `Cascade ${parentMetadata.className}.${relation.propertyName}: expected an object, got ${typeof value}`,
      );
    }
    const child: object = value;

    if (relation.joinColumn) {
      // Owning side: child must be persisted *before* parent so the parent's FK column can be set.
      const childId = visit(child, childMetadata);
      addEdge(nodes, childId, parentId);

      const fkColumnName = relation.joinColumn.columnName;
      const fkProp = findColumnPropertyByColumnName(parentMetadata, fkColumnName);
      const referencedColumnName = relation.joinColumn.referencedColumnName;
      const referencedProp = findColumnPropertyByColumnName(childMetadata, referencedColumnName);

      nodes[parentId].fkBackfills.push({
        targetProperty: fkProp,
        sourceEntity: child,
        sourceProperty: referencedProp,
      });
    } else {
      // Inverse one-to-one: parent owns the PK; child has the FK back to us.
      if (relation.kind !== "one-to-one") {
        throw new ModelError(
          "CASCADE_INVALID_CHILD",
          `Cascade ${parentMetadata.className}.${relation.propertyName}: many-to-one without joinColumn is not supported`,
        );
      }
      const childId = visit(child, childMetadata);
      addEdge(nodes, parentId, childId);
      attachInverseBackfill(parentId, parent, parentMetadata, relation, childMetadata, childId);
    }
  };

  const visitOneToMany = (
    parentId: number,
    parent: object,
    parentMetadata: EntityMetadata,
    relation: RelationMetadata,
    value: unknown,
    childMetadata: EntityMetadata,
  ): void => {
    if (!Array.isArray(value)) {
      throw new ModelError(
        "CASCADE_INVALID_CHILD",
        `Cascade ${parentMetadata.className}.${relation.propertyName}: expected an array, got ${typeof value}`,
      );
    }
    for (const child of value) {
      if (typeof child !== "object" || child === null) {
        throw new ModelError(
          "CASCADE_INVALID_CHILD",
          `Cascade ${parentMetadata.className}.${relation.propertyName}: array contains a non-object element`,
        );
      }
      const childId = visit(child as object, childMetadata);
      addEdge(nodes, parentId, childId);
      attachInverseBackfill(parentId, parent, parentMetadata, relation, childMetadata, childId);
    }
  };

  const attachInverseBackfill = (
    parentId: number,
    parent: object,
    parentMetadata: EntityMetadata,
    parentRelation: RelationMetadata,
    childMetadata: EntityMetadata,
    childId: number,
  ): void => {
    const inverseSide = parentRelation.inverseSide;
    if (inverseSide === undefined) {
      throw new ModelError(
        "INVERSE_SIDE_NOT_FOUND",
        `Cascade ${parentMetadata.className}.${parentRelation.propertyName} requires inverseSide`,
      );
    }
    const inverse = childMetadata.relationsByPropertyName.get(inverseSide);
    if (!inverse?.joinColumn) {
      throw new ModelError(
        "INVERSE_SIDE_NOT_FOUND",
        `Inverse relation ${childMetadata.className}.${inverseSide} must declare a joinColumn`,
      );
    }
    const fkProp = findColumnPropertyByColumnName(childMetadata, inverse.joinColumn.columnName);
    const referencedColumnName = inverse.joinColumn.referencedColumnName;
    const referencedProp = findColumnPropertyByColumnName(parentMetadata, referencedColumnName);
    nodes[childId].fkBackfills.push({
      targetProperty: fkProp,
      sourceEntity: parent,
      sourceProperty: referencedProp,
    });
  };

  const visitManyToMany = (
    parentId: number,
    parent: object,
    parentMetadata: EntityMetadata,
    relation: RelationMetadata,
    value: unknown,
    childMetadata: EntityMetadata,
  ): void => {
    if (!Array.isArray(value)) {
      throw new ModelError(
        "CASCADE_INVALID_CHILD",
        `Cascade ${parentMetadata.className}.${relation.propertyName}: expected an array, got ${typeof value}`,
      );
    }
    if (!relation.joinTable) {
      // Inverse-side M2M without joinTable: the *other* side owns the link table; we still
      // persist the children but the link rows will be authored from the owning side. We do
      // NOT enqueue link rows here.
      for (const child of value) {
        if (typeof child !== "object" || child === null) continue;
        visit(child as object, childMetadata);
      }
      return;
    }
    for (const child of value) {
      if (typeof child !== "object" || child === null) {
        throw new ModelError(
          "CASCADE_INVALID_CHILD",
          `Cascade ${parentMetadata.className}.${relation.propertyName}: array contains a non-object element`,
        );
      }
      visit(child as object, childMetadata);
      m2mLinks.push({
        joinTable: relation.joinTable.tableName,
        joinColumn: relation.joinTable.joinColumnName,
        inverseJoinColumn: relation.joinTable.inverseJoinColumnName,
        ownerEntity: parent,
        ownerMetadata: parentMetadata,
        inverseEntity: child as object,
        inverseMetadata: childMetadata,
      });
    }
    void parentId;
  };

  visit(root, rootMetadata);

  // Kahn's algorithm
  const order: CascadeNode[] = [];
  const ready: number[] = [];
  const remainingPredecessors = nodes.map((n) => n.predecessors.size);

  for (let i = 0; i < nodes.length; i++) {
    if (remainingPredecessors[i] === 0) ready.push(i);
  }

  while (ready.length > 0) {
    const id = ready.shift() as number;
    const node = nodes[id];
    order.push({
      entity: node.entity,
      metadata: node.metadata,
      fkBackfills: node.fkBackfills,
    });
    for (const successor of node.successors) {
      remainingPredecessors[successor]--;
      if (remainingPredecessors[successor] === 0) ready.push(successor);
    }
  }

  if (order.length !== nodes.length) {
    const cyclic = nodes
      .filter((_, i) => remainingPredecessors[i] > 0)
      .map((n) => n.metadata.className);
    throw new ModelError(
      "CASCADE_CYCLE",
      `Cascade graph has a cycle involving: ${[...new Set(cyclic)].join(", ")}`,
    );
  }

  return { order, m2mLinks };
}

function addEdge(nodes: InternalNode[], fromId: number, toId: number): void {
  if (fromId === toId) return;
  nodes[fromId].successors.add(toId);
  nodes[toId].predecessors.add(fromId);
}

function findColumnPropertyByColumnName(metadata: EntityMetadata, columnName: string): string {
  for (const col of metadata.columns) {
    if (col.columnName === columnName) return col.propertyName;
  }
  throw new ModelError(
    "UNKNOWN_COLUMN",
    `${metadata.className} has no column with physical name '${columnName}'`,
  );
}
